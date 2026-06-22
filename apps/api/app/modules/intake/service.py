"""
Intake service — omnichannel grievance creation pipeline.

Flow:
  validate → emergency check → idempotency → reverse-geocode
  → create grievance → status event → outbox emit
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import TokenClaims
from app.modules.intake.models import Attachment, Grievance, GrievanceStatus, StatusEvent
from app.modules.intake.repository import GrievanceRepository
from app.modules.intake.schemas import CitizenRight, GrievanceCreate, GrievanceCreateResponse
from app.modules.platform.repository import AuditRepository, OutboxRepository

log = structlog.get_logger()

# ── Citizen Rights Lookup Table ───────────────────────────────────────────────
# Source: Delhi Right to Public Services Act 2011 + MCD/DJB/PWD service norms
# Penalty: Delhi imposes ₹10/day max ₹200 (weakest in India — political reform needed)
_CITIZEN_RIGHTS: dict[str, CitizenRight] = {
    "Pothole / Road Damage": CitizenRight(
        category="Pothole / Road Damage",
        sla_days=7,
        legal_basis="Delhi Right to Public Services Act 2011 — PWD Service Standard",
        department="Public Works Department (PWD) / MCD",
        escalation_after_days=8,
        penalty_info="Officer liable to ₹10/day fine under Delhi RTPS Act 2011.",
    ),
    "Road Repair Required": CitizenRight(
        category="Road Repair Required",
        sla_days=7,
        legal_basis="Delhi Right to Public Services Act 2011 — PWD Service Standard",
        department="Public Works Department (PWD)",
        escalation_after_days=8,
        penalty_info="Officer liable to ₹10/day fine under Delhi RTPS Act 2011.",
    ),
    "No Water Supply": CitizenRight(
        category="No Water Supply",
        sla_days=2,
        legal_basis="DJB Water Supply Standard — Delhi Right to Public Services Act 2011",
        department="Delhi Jal Board (DJB)",
        escalation_after_days=3,
        penalty_info="DJB must restore supply within 48 hours. File RTI if unresolved.",
    ),
    "Sewage Overflow": CitizenRight(
        category="Sewage Overflow",
        sla_days=1,
        legal_basis="Delhi Health Code — Public Health Emergency Standard",
        department="Delhi Jal Board (DJB) / MCD",
        escalation_after_days=2,
        penalty_info="Health emergency — 24-hour resolution required. Escalate to DM if delayed.",
    ),
    "Power Outage": CitizenRight(
        category="Power Outage",
        sla_days=1,
        legal_basis="Delhi Electricity Regulatory Commission (DERC) Supply Code 2017",
        department="BSES Yamuna / BSES Rajdhani / Tata Power Delhi",
        escalation_after_days=1,
        penalty_info="Discom must restore within 4-8 hours. File complaint with DERC at derc.gov.in.",
    ),
    "Garbage Not Collected": CitizenRight(
        category="Garbage Not Collected",
        sla_days=1,
        legal_basis="Solid Waste Management Rules 2016 — MCD Service Standard",
        department="Municipal Corporation of Delhi (MCD)",
        escalation_after_days=2,
        penalty_info="Daily collection is mandatory. Persistent failure: approach MCD Ward Committee.",
    ),
    "Streetlight Not Working": CitizenRight(
        category="Streetlight Not Working",
        sla_days=3,
        legal_basis="MCD Street Lighting Standard — Delhi Right to Public Services Act 2011",
        department="Municipal Corporation of Delhi (MCD)",
        escalation_after_days=4,
        penalty_info="MCD must repair within 72 hours under service charter.",
    ),
    "Illegal Construction": CitizenRight(
        category="Illegal Construction",
        sla_days=7,
        legal_basis="Delhi Municipal Corporation Act 1957 — Building Regulation",
        department="Municipal Corporation of Delhi (MCD) — Building Department",
        escalation_after_days=8,
        penalty_info="MCD enforcement unit must act within 7 days. File RTI for action taken report.",
    ),
    "Traffic Signal Fault": CitizenRight(
        category="Traffic Signal Fault",
        sla_days=1,
        legal_basis="Delhi Traffic Police Service Standard",
        department="Delhi Traffic Police",
        escalation_after_days=1,
        penalty_info="Safety emergency — report also to Delhi Police Control Room: 112.",
    ),
    "Medicine Not Available": CitizenRight(
        category="Medicine Not Available",
        sla_days=1,
        legal_basis="Delhi Healthcare Service Delivery Standard — GNCT Health Dept",
        department="GNCT Department of Health & Family Welfare",
        escalation_after_days=1,
        penalty_info="Essential medicines must be available. Contact CMO directly if unresolved.",
    ),
}

_DEFAULT_CITIZEN_RIGHT = CitizenRight(
    category="General Civic Issue",
    sla_days=7,
    legal_basis="Delhi Right to Public Services Act 2011",
    department="Concerned Government Department",
    escalation_after_days=8,
    penalty_info="Under Delhi RTPS Act 2011, you can escalate to First Appellate Authority after deadline.",
)

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
    today = datetime.now(UTC).strftime("%Y%m%d")
    suffix = str(uuid.uuid4()).replace("-", "")[:8].upper()
    return f"JS-{today}-{suffix}"


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
        self._s.add(
            StatusEvent(
                grievance_id=grievance.id,
                from_status=None,
                to_status=GrievanceStatus.RECEIVED.value,
                actor_id=str(citizen_id) if citizen_id else "anonymous",
                actor_role=actor.role if actor else "citizen",
            )
        )

        # 7b. Cluster detection — count open complaints in same ward × category
        cluster_size = 0
        if grievance.ward_id and body.raw_text:
            cluster_row = (
                await self._s.execute(
                    text("""
                        SELECT COUNT(*) FROM grievances
                        WHERE ward_id = :wid
                          AND status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                          AND id != :gid
                          AND (
                              cluster_id = (
                                  SELECT cluster_id FROM grievances WHERE id = :gid
                              )
                              OR (
                                  cluster_id IS NULL
                                  AND category IS NOT NULL
                                  AND category = (SELECT category FROM grievances WHERE id = :gid)
                              )
                          )
                    """),
                    {"wid": str(grievance.ward_id), "gid": str(grievance.id)},
                )
            ).scalar()
            cluster_size = int(cluster_row or 0)

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

        # Best-effort rights lookup before AI classification
        # Keyword matching against raw text for immediate response
        detected_right: CitizenRight | None = None
        raw_lower = body.raw_text.lower()
        for key, right in _CITIZEN_RIGHTS.items():
            keywords = key.lower().split("/")
            if any(kw.strip() in raw_lower for kw in keywords):
                detected_right = right
                break
        if not detected_right:
            detected_right = _DEFAULT_CITIZEN_RIGHT

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
            citizen_right=detected_right,
            cluster_size=cluster_size,
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
        file_hash: str | None = None,
    ) -> Attachment:
        # E2.5 — reject duplicate proof photos (same MD5 reused from another case)
        if is_proof and file_hash:
            dup = (
                await self._s.execute(
                    text("""
                        SELECT g.tracking_id
                        FROM attachments a
                        JOIN grievances g ON g.id = a.grievance_id
                        WHERE a.file_hash = :h AND a.is_proof = true
                          AND a.grievance_id != :gid
                        LIMIT 1
                    """),
                    {"h": file_hash, "gid": str(grievance_id)},
                )
            ).fetchone()
            if dup:
                raise ValueError(
                    f"This exact image was already used as proof on complaint {dup[0]}. "
                    "Each proof photo must be taken fresh at the site."
                )

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
            file_hash=file_hash,
        )
        self._s.add(att)
        await self._s.flush()
        return att

    # ── Internals ─────────────────────────────────────────────────────────────

    async def _check_idempotency(self, key: str) -> Grievance | None:
        row = (
            await self._s.execute(
                text(
                    "SELECT response_body FROM idempotency_keys WHERE key = :key AND (expires_at IS NULL OR expires_at > now())"
                ),
                {"key": key},
            )
        ).fetchone()
        if not row:
            return None
        return await self._repo.get_by_tracking_id(row[0])

    async def _reverse_geocode(self, lat: float, lng: float) -> uuid.UUID | None:
        """PostGIS containment check → nearest centroid fallback."""
        # Ward polygons (geometry column) — if populated
        row = (
            await self._s.execute(
                text("""
                SELECT id FROM wards
                WHERE geometry IS NOT NULL
                  AND ST_Within(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), geometry::geometry)
                LIMIT 1
            """),
                {"lat": lat, "lng": lng},
            )
        ).fetchone()
        if row:
            return uuid.UUID(str(row[0]))

        # Fallback: nearest ward by centroid distance (always populated)
        row2 = (
            await self._s.execute(
                text("""
                SELECT id FROM wards
                WHERE centroid_lat IS NOT NULL
                ORDER BY SQRT(POWER(centroid_lat - :lat, 2) + POWER(centroid_lng - :lng, 2))
                LIMIT 1
            """),
                {"lat": lat, "lng": lng},
            )
        ).fetchone()
        return uuid.UUID(str(row2[0])) if row2 else None
