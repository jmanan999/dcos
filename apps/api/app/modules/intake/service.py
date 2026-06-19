"""
Intake service — omnichannel grievance creation pipeline.

Flow:
  validate → emergency check → idempotency → reverse-geocode
  → create grievance → status event → outbox emit
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import TokenClaims
from app.modules.intake.models import Attachment, Grievance, GrievanceStatus, StatusEvent
from app.modules.intake.repository import GrievanceRepository
from app.modules.intake.schemas import GrievanceCreate, GrievanceCreateResponse
from app.modules.platform.repository import AuditRepository, OutboxRepository

log = structlog.get_logger()

# ── Emergency keywords (Hindi + English) ─────────────────────────────────────
_EMERGENCY_RE = re.compile(
    r"\b(fire|aag lagi|flood|baarish|barish|accident|hadsa|murder|hatya|"
    r"rape|balaatkaar|kidnap|abduction|bomb|blast|suicid|khukhshi|"
    r"collapse|dhans|gas leak|gas rissav|drowning|doob|shoot|firing)\b",
    re.IGNORECASE,
)

EMERGENCY_GUIDANCE = (
    "This appears to be a life-safety emergency. "
    "Please call immediately: Police 100 | Fire 101 | Ambulance 102 | Emergency 112. "
    "Your complaint has also been flagged for priority attention."
)


def _is_emergency(raw_text: str) -> bool:
    return bool(_EMERGENCY_RE.search(raw_text))


def _make_tracking_id() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = str(uuid.uuid4()).replace("-", "")[:8].upper()
    return f"DCOS-{today}-{suffix}"


class IntakeService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session
        self._repo = GrievanceRepository(session)
        self._outbox = OutboxRepository(session)
        self._audit = AuditRepository(session)

    # ── Main entry point ──────────────────────────────────────────────────────

    async def create_grievance(
        self,
        body: GrievanceCreate,
        actor: TokenClaims | None,
    ) -> GrievanceCreateResponse:
        # 1. Idempotency check
        existing = await self._check_idempotency(body.idempotency_key)
        if existing:
            log.info("intake.idempotent_replay", tracking_id=existing.tracking_id)
            return GrievanceCreateResponse(
                grievance_id=existing.id,
                tracking_id=existing.tracking_id,
                status=existing.status,
                is_emergency=existing.is_emergency,
                message="Duplicate request — returning existing grievance",
            )

        # 2. Emergency check
        emergency = _is_emergency(body.raw_text)

        # 3. Reverse-geocode lat/lng → ward
        ward_id: uuid.UUID | None = None
        if body.location:
            ward_id = await self._reverse_geocode(body.location.lat, body.location.lng)

        # 4. Citizen identity — upsert user row so the FK exists
        citizen_id: uuid.UUID | None = None
        is_anonymous = True
        if actor and actor.role == "citizen":
            citizen_id = uuid.UUID(actor.user_id)
            is_anonymous = False
            await self._s.execute(
                text("""
                    INSERT INTO users (id, role, name, language_pref)
                    VALUES (:id, 'citizen', :name, :lang)
                    ON CONFLICT (id) DO NOTHING
                """),
                {"id": str(citizen_id), "name": actor.name, "lang": "hi"},
            )

        # 5. Tracking ID (UUID-based — globally unique, no race conditions)
        tracking_id = _make_tracking_id()

        # 6. Create the grievance row
        grievance = Grievance(
            tracking_id=tracking_id,
            citizen_id=citizen_id,
            citizen_phone=body.citizen_phone,
            channel=body.channel,
            raw_text=body.raw_text,
            language=body.language,
            status=GrievanceStatus.RECEIVED.value,
            priority="HIGH" if emergency else "MEDIUM",
            ward_id=ward_id,
            latitude=body.location.lat if body.location else None,
            longitude=body.location.lng if body.location else None,
            is_emergency=emergency,
            is_anonymous=is_anonymous,
            channel_meta=body.channel_meta,
        )
        self._s.add(grievance)
        await self._s.flush()

        # 7. First status event
        self._s.add(StatusEvent(
            grievance_id=grievance.id,
            from_status=None,
            to_status=GrievanceStatus.RECEIVED.value,
            actor_id=str(citizen_id) if citizen_id else "anonymous",
            actor_role=actor.role if actor else "citizen",
        ))

        # 8. Idempotency key (24-hour window)
        await self._s.execute(
            text("""
                INSERT INTO idempotency_keys (key, response_status, response_body, expires_at)
                VALUES (:key, 201, :body, now() + interval '24 hours')
                ON CONFLICT DO NOTHING
            """),
            {"key": body.idempotency_key, "body": tracking_id},
        )

        # 9. Outbox event → AI worker picks this up in Epic 5
        await self._outbox.emit(
            event_type="grievance.created",
            aggregate_type="grievance",
            aggregate_id=str(grievance.id),
            payload={
                "grievance_id": str(grievance.id),
                "tracking_id": tracking_id,
                "channel": body.channel,
                "language": body.language,
                "is_emergency": emergency,
                "ward_id": str(ward_id) if ward_id else None,
            },
        )

        # 10. Audit
        await self._audit.log(
            action="grievance.created",
            resource_type="grievance",
            resource_id=str(grievance.id),
            actor_id=str(citizen_id) if citizen_id else None,
            actor_role=actor.role if actor else "citizen",
        )

        log.info(
            "intake.created",
            tracking_id=tracking_id,
            channel=body.channel,
            emergency=emergency,
        )

        return GrievanceCreateResponse(
            grievance_id=grievance.id,
            tracking_id=tracking_id,
            status=GrievanceStatus.RECEIVED.value,
            is_emergency=emergency,
            emergency_guidance=EMERGENCY_GUIDANCE if emergency else None,
            message=(
                "Emergency flagged — call 112 now. Complaint also logged."
                if emergency
                else f"Filed successfully. Track at /track/{tracking_id}"
            ),
        )

    # ── Tracking ──────────────────────────────────────────────────────────────

    async def get_tracking(self, tracking_id: str) -> dict | None:
        grievance = await self._repo.get_by_tracking_id(tracking_id)
        if not grievance:
            return None
        timeline = await self._repo.get_status_timeline(grievance.id)
        att = await self._s.execute(
            select(Attachment)
            .where(Attachment.grievance_id == grievance.id)
            .order_by(Attachment.created_at)
        )
        return {
            "grievance": grievance,
            "timeline": list(timeline),
            "attachments": list(att.scalars().all()),
        }

    # ── Media attachment ──────────────────────────────────────────────────────

    async def add_attachment(
        self,
        grievance_id: uuid.UUID,
        url: str,
        file_type: str,
        file_size: int | None = None,
        exif_lat: float | None = None,
        exif_lng: float | None = None,
        uploaded_by_id: str | None = None,
        is_proof: bool = False,
        proof_type: str | None = None,
    ) -> Attachment:
        att = Attachment(
            grievance_id=grievance_id,
            url=url,
            file_type=file_type,
            file_size=file_size,
            exif_lat=exif_lat,
            exif_lng=exif_lng,
            is_proof=is_proof,
            proof_type=proof_type,
            uploaded_by_id=uploaded_by_id,
        )
        self._s.add(att)
        await self._s.flush()
        return att

    # ── Internals ─────────────────────────────────────────────────────────────

    async def _check_idempotency(self, key: str) -> Grievance | None:
        row = (await self._s.execute(
            text("SELECT response_body FROM idempotency_keys WHERE key = :key AND (expires_at IS NULL OR expires_at > now())"),
            {"key": key},
        )).fetchone()
        if not row:
            return None
        return await self._repo.get_by_tracking_id(row[0])

    async def _reverse_geocode(self, lat: float, lng: float) -> uuid.UUID | None:
        """PostGIS containment check → nearest centroid fallback."""
        # Ward polygons (geometry column) — if populated
        row = (await self._s.execute(
            text("""
                SELECT id FROM wards
                WHERE geometry IS NOT NULL
                  AND ST_Within(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), geometry::geometry)
                LIMIT 1
            """),
            {"lat": lat, "lng": lng},
        )).fetchone()
        if row:
            return uuid.UUID(str(row[0]))

        # Fallback: nearest ward by centroid distance (always populated)
        row2 = (await self._s.execute(
            text("""
                SELECT id FROM wards
                WHERE centroid_lat IS NOT NULL
                ORDER BY SQRT(POWER(centroid_lat - :lat, 2) + POWER(centroid_lng - :lng, 2))
                LIMIT 1
            """),
            {"lat": lat, "lng": lng},
        )).fetchone()
        return uuid.UUID(str(row2[0])) if row2 else None

