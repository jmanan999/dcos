from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from typing import Annotated

import structlog
from fastapi import (
    APIRouter, File, Form, HTTPException, Query, Request, UploadFile, status,
)

from app.core.config import settings
from app.core.dependencies import DbSession, OptionalUser, RlsDbSession
from sqlalchemy import text
from app.modules.intake.schemas import (
    AttachmentRead,
    GrievanceCreate,
    GrievanceCreateResponse,
    LocationInput,
    StatusEventRead,
    TrackingResponse,
)
from app.modules.intake.service import EMERGENCY_GUIDANCE, IntakeService

log = structlog.get_logger()

router = APIRouter(prefix="/intake", tags=["Intake"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "intake", "status": "ok"}


# ── File a grievance ──────────────────────────────────────────────────────────

@router.post(
    "/grievances",
    response_model=GrievanceCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="File a grievance (web / API channel) — anonymous allowed",
)
async def create_grievance(
    body: GrievanceCreate,
    user: OptionalUser,
    session: DbSession,
) -> GrievanceCreateResponse:
    # Intake is always allowed (any citizen can file); bypass RLS for the write path
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = IntakeService(session)
    return await svc.create_grievance(body, user)


# ── Media upload ──────────────────────────────────────────────────────────────

@router.post(
    "/grievances/{grievance_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload photo / audio / video to a grievance",
)
async def upload_attachment(
    grievance_id: uuid.UUID,
    user: OptionalUser,
    session: RlsDbSession,
    file: UploadFile = File(...),
    is_proof: bool = Form(False),
    proof_type: str | None = Form(None),
) -> AttachmentRead:
    ALLOWED = {
        "image/jpeg", "image/png", "image/webp",
        "audio/ogg", "audio/mpeg",
        "video/mp4",
        "application/pdf",
    }
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=415, detail=f"Unsupported: {file.content_type}")

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")

    from app.core.storage import upload_bytes
    key = f"grievances/{grievance_id}/{uuid.uuid4()}/{file.filename}"
    url = await upload_bytes(key, contents, file.content_type or "application/octet-stream")

    type_map = {
        "image/jpeg": "image", "image/png": "image", "image/webp": "image",
        "audio/ogg": "audio", "audio/mpeg": "audio",
        "video/mp4": "video", "application/pdf": "document",
    }

    # Extract EXIF GPS from images
    exif_lat: float | None = None
    exif_lng: float | None = None
    if file.content_type in ("image/jpeg", "image/png", "image/webp"):
        exif_lat, exif_lng = _extract_exif_gps(contents)

    svc = IntakeService(session)
    att = await svc.add_attachment(
        grievance_id=grievance_id,
        url=url,
        file_type=type_map.get(file.content_type or "", "document"),
        file_size=len(contents),
        exif_lat=exif_lat,
        exif_lng=exif_lng,
        uploaded_by_id=user.user_id if user else None,
        is_proof=is_proof,
        proof_type=proof_type,
    )
    return AttachmentRead.model_validate(att)


# ── Tracking (public — no auth required) ─────────────────────────────────────

@router.get(
    "/track/{tracking_id}",
    response_model=TrackingResponse,
    summary="Track a complaint by tracking ID — public, no auth required",
)
async def track_grievance(
    tracking_id: str,
    session: DbSession,
    user: OptionalUser,
) -> TrackingResponse:
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = IntakeService(session)
    data = await svc.get_tracking(tracking_id)
    if not data:
        raise HTTPException(status_code=404, detail="Tracking ID not found")
    g = data["grievance"]
    return TrackingResponse(
        tracking_id=g.tracking_id,
        status=g.status,
        priority=g.priority,
        category=g.category,
        department_id=g.department_id,
        created_at=g.created_at,
        sla_due_at=g.sla_due_at,
        timeline=[StatusEventRead.model_validate(e) for e in data["timeline"]],
        attachments=[AttachmentRead.model_validate(a) for a in data["attachments"]],
    )


# ── WhatsApp Cloud API webhook ────────────────────────────────────────────────

@router.get("/webhooks/whatsapp", include_in_schema=False)
async def whatsapp_verify(
    hub_mode: str = Query(alias="hub.mode", default=""),
    hub_verify_token: str = Query(alias="hub.verify_token", default=""),
    hub_challenge: str = Query(alias="hub.challenge", default=""),
) -> int:
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Invalid verify token")


@router.post("/webhooks/whatsapp", include_in_schema=False)
async def whatsapp_webhook(
    request: Request,
    session: DbSession,
    user: OptionalUser,
) -> dict[str, str]:
    if not settings.FEATURE_WHATSAPP_INTAKE:
        raise HTTPException(status_code=404, detail="WhatsApp intake not enabled")

    raw = await request.body()
    _verify_signature(request, raw)
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))

    payload = json.loads(raw)
    svc = IntakeService(session)
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            for msg in change.get("value", {}).get("messages", []):
                await _ingest_wa_message(msg, svc)
    return {"status": "ok"}


def _extract_exif_gps(data: bytes) -> tuple[float | None, float | None]:
    """Extract GPS lat/lng from JPEG/PNG EXIF data. Returns (None, None) if absent."""
    try:
        from PIL import Image, ExifTags
        import io
        img = Image.open(io.BytesIO(data))
        exif = img._getexif()  # type: ignore[attr-defined]
        if not exif:
            return None, None
        gps_tag = next((k for k, v in ExifTags.TAGS.items() if v == "GPSInfo"), None)
        if not gps_tag or gps_tag not in exif:
            return None, None
        gps = exif[gps_tag]
        # GPSInfo keys: 1=LatRef, 2=Lat, 3=LonRef, 4=Lon
        def _dms(vals):  # type: ignore[no-untyped-def]
            d, m, s = [float(v) for v in vals]
            return d + m / 60 + s / 3600
        lat = _dms(gps.get(2, [0, 0, 0]))
        lng = _dms(gps.get(4, [0, 0, 0]))
        if gps.get(1, "N") == "S":
            lat = -lat
        if gps.get(3, "E") == "W":
            lng = -lng
        return round(lat, 6), round(lng, 6)
    except Exception:
        return None, None


def _verify_signature(request: Request, body: bytes) -> None:
    if not settings.WHATSAPP_TOKEN:
        return  # No-op in local dev without credentials
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not sig.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing WhatsApp signature")
    expected = "sha256=" + hmac.new(
        settings.WHATSAPP_TOKEN.encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=401, detail="Invalid WhatsApp signature")


async def _ingest_wa_message(msg: dict, svc: IntakeService) -> None:
    msg_id: str = msg.get("id", "")
    from_num: str = msg.get("from", "")
    msg_type: str = msg.get("type", "")
    raw_text: str | None = None
    loc: LocationInput | None = None
    meta: dict = {"whatsapp_message_id": msg_id, "from": from_num, "type": msg_type}

    if msg_type == "text":
        raw_text = msg.get("text", {}).get("body", "")
    elif msg_type in ("image", "audio", "video", "document"):
        raw_text = msg.get(msg_type, {}).get("caption") or f"[{msg_type.upper()}] via WhatsApp"
        meta["media_id"] = msg.get(msg_type, {}).get("id", "")
    elif msg_type == "location":
        coords = msg.get("location", {})
        raw_text = "Complaint about this location (sent via WhatsApp)"
        loc = LocationInput(lat=coords.get("latitude", 0), lng=coords.get("longitude", 0))

    if not raw_text or len(raw_text) < 5:
        return

    phone = f"+{from_num}" if not from_num.startswith("+") else from_num
    body = GrievanceCreate(
        raw_text=raw_text,
        channel="whatsapp",
        language="hi",
        citizen_phone=phone,
        idempotency_key=f"wa-{msg_id}",
        channel_meta=meta,
        location=loc,
    )
    result = await svc.create_grievance(body, actor=None)

    # Reply to citizen with tracking ID
    if settings.WHATSAPP_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID:
        import httpx
        reply = (
            f"Namaste! Aapki shikayat darj ho gayi hai.\n"
            f"Tracking ID: *{result.tracking_id}*\n\n"
            f"Track: /track/{result.tracking_id}"
        )
        if result.is_emergency:
            reply = "🚨 EMERGENCY: Please call 112 NOW.\n\n" + reply
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}"
                    f"/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages",
                    headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
                    json={
                        "messaging_product": "whatsapp",
                        "to": from_num,
                        "type": "text",
                        "text": {"body": reply},
                    },
                )
        except Exception as exc:
            log.warning("whatsapp.reply.failed", error=str(exc), to=from_num)
