from __future__ import annotations

import hashlib
import hmac
import json
import uuid

import structlog
from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import text

from app.core.config import settings
from app.core.dependencies import DbSession, OptionalUser, RlsDbSession
from app.modules.intake.schemas import (
    AttachmentRead,
    GrievanceCreate,
    GrievanceCreateResponse,
    LocationInput,
    StatusEventRead,
    TrackingResponse,
)
from app.modules.intake.service import IntakeService

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
        "image/jpeg",
        "image/png",
        "image/webp",
        "audio/ogg",
        "audio/mpeg",
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
        "image/jpeg": "image",
        "image/png": "image",
        "image/webp": "image",
        "audio/ogg": "audio",
        "audio/mpeg": "audio",
        "video/mp4": "video",
        "application/pdf": "document",
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
        import io

        from PIL import ExifTags, Image

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
    # Meta signs webhook payloads with the App Secret (not the access token).
    # Skip verification in local dev when no secret is configured.
    if not settings.WHATSAPP_APP_SECRET:
        return
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not sig.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing WhatsApp signature")
    expected = (
        "sha256="
        + hmac.new(settings.WHATSAPP_APP_SECRET.encode(), body, hashlib.sha256).hexdigest()
    )
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=401, detail="Invalid WhatsApp signature")


# ── WhatsApp conversation state (Redis) ──────────────────────────────────────
# State machine per phone number, 10-minute TTL.
# States: awaiting_location | awaiting_photo_or_file | done
#
# Flow:
#   1. User describes complaint → bot asks for location + photo
#   2. User sends location pin → bot acknowledges, asks for photo
#   3. User sends photo OR "DARJ KAREIN"/"FILE"/"SKIP" → file complaint + send tracking ID
#
# Redis key: wa:state:{phone}
# Redis value: JSON {complaint, language, msg_id, lat, lng, media_id, step}

_STATE_TTL = 600  # 10 minutes


async def _get_redis():
    import redis.asyncio as aioredis

    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def _get_state(phone: str) -> dict | None:
    try:
        r = await _get_redis()
        raw = await r.get(f"wa:state:{phone}")
        await r.aclose()
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def _set_state(phone: str, state: dict) -> None:
    try:
        r = await _get_redis()
        await r.set(f"wa:state:{phone}", json.dumps(state), ex=_STATE_TTL)
        await r.aclose()
    except Exception:
        pass


async def _clear_state(phone: str) -> None:
    try:
        r = await _get_redis()
        await r.delete(f"wa:state:{phone}")
        await r.aclose()
    except Exception:
        pass


# ── Messages ──────────────────────────────────────────────────────────────────

_WELCOME_MSG = (
    "🏛️ *JanSetu — Delhi Grievance Portal*\n\n"
    "Namaste! 👋 Main aapki shikayat darj karne mein madad karunga.\n\n"
    "*Apni samasya ka vivaran likhein:*\n"
    "_Udaaharan:_\n"
    '• _"Hamare ward mein sadak pe gadda hai 3 din se"_\n'
    '• _"Bijli nahi hai 6 ghante se, BSES nahi aa raha"_\n'
    '• _"Paani nahi aa raha 2 din se"_\n\n'
    "📋 *Pehle se darj shikayat track karein:*\n"
    "JS-XXXXXXXX-XXXXXXXX likhein\n\n"
    "_Helpline: 1031 | Emergency: 112_"
)

_ASK_LOCATION_MSG = (
    "✅ Shikayat note ho gayi!\n\n"
    "*Ab location share karein:*\n\n"
    "📍 *Step 1 (zaroori):*\n"
    "Attachment 📎 → Location → Share\n\n"
    "📸 *Step 2 (optional):*\n"
    "Samasya ki photo bhejen\n\n"
    "⏭️ *Sirf text se darj karein:*\n"
    "Reply karein: *DARJ KAREIN*\n\n"
    "_10 minute mein reply na karne par yeh request band ho jayegi._"
)

_ASK_PHOTO_MSG = (
    "📍 Location mil gayi! ✅\n\n"
    "📸 *Koi photo ya video hai?* (optional)\n"
    "Samasya ki photo bhejen — officers ko bahut madad milti hai.\n\n"
    "Ya abhi darj karne ke liye likhein: *DARJ KAREIN*"
)

_FILED_MSG = (
    "🏛️ *JanSetu — Delhi Grievance Portal*\n\n"
    "✅ Aapki shikayat safaltapoorvak darj ho gayi!\n\n"
    "📋 *Tracking ID:* {tracking_id}\n\n"
    "🔍 *Status track karein:*\n"
    "https://dcos-ecru.vercel.app/track/{tracking_id}\n\n"
    "📌 *Aage kya hoga:*\n"
    "• AI aapki shikayat ko sahi vibhag ko bhejega\n"
    "• Adhikari isko claim karenge\n"
    "• Samadhaan par photo proof required hoga\n"
    "• Har update par WhatsApp message milega\n\n"
    "_Shikayat: {complaint_preview}_"
)

_EMERGENCY_PREFIX = (
    "🚨 *AAPATTI — EMERGENCY*\nAbhi *112* call karein — Police / Fire / Ambulance\n\n"
)

_STATUS_MSG = (
    "🔍 *Shikayat ki status jaanch*\n\n"
    "Apna Tracking ID likhein:\n"
    "_JS-20260620-XXXXXXXX_\n\n"
    "Ya seedha check karein:\n"
    "https://dcos-ecru.vercel.app/track"
)

# ── Intent classification ─────────────────────────────────────────────────────

_INTENT_PROMPT = """You are a smart filter for JanSetu, Delhi's civic grievance WhatsApp bot.

Classify the message into ONE of:
- "complaint" — user describing a civic problem (pothole, water, electricity, garbage, noise, pollution, construction, encroachment, stray animals, etc.)
- "status_check" — asking about a complaint already filed (status, track, JS-, complaint ID, "meri shikayat")
- "greeting_or_test" — hi/hello/namaste/test/just a name/random words/not a complaint

Rules:
- "Hello World", "Hi", "Test", just a name, "Jain Gamdu", random words → greeting_or_test
- Actual civic problem description (even short like "bijli nahi") → complaint
- Questions about complaints → status_check
- When unsure → greeting_or_test (never file junk)

Respond ONLY with JSON: {"intent": "complaint"|"status_check"|"greeting_or_test", "language": "hi"|"en"}"""


async def _classify_intent(text: str) -> dict:
    try:
        import json as _json

        import httpx as _httpx

        if not settings.GROQ_API_KEY:
            return {
                "intent": "complaint" if len(text) > 25 else "greeting_or_test",
                "language": "hi",
            }

        async with _httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{settings.GROQ_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": _INTENT_PROMPT},
                        {"role": "user", "content": f"Message: {text[:500]}"},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.0,
                    "max_tokens": 60,
                },
            )
        return _json.loads(r.json()["choices"][0]["message"]["content"])
    except Exception as exc:
        log.warning("whatsapp.intent.failed", error=str(exc))
        return {"intent": "greeting_or_test", "language": "hi"}


# ── Send helper ───────────────────────────────────────────────────────────────


async def _reply(to: str, text: str) -> None:
    if not (settings.WHATSAPP_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID):
        return
    try:
        import httpx as _httpx

        async with _httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}"
                f"/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages",
                headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
                json={
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "text",
                    "text": {"body": text},
                },
            )
    except Exception as exc:
        log.warning("whatsapp.reply.failed", error=str(exc), to=to)


# ── File complaint helper ─────────────────────────────────────────────────────


async def _file_complaint(phone: str, state: dict, svc: IntakeService, from_num: str) -> None:
    raw_text = state["complaint"]
    language = state.get("language", "hi")
    msg_id = state.get("msg_id", "unknown")
    lat = state.get("lat")
    lng = state.get("lng")
    media_id = state.get("media_id")

    loc = LocationInput(lat=lat, lng=lng) if lat and lng else None
    meta = {
        "whatsapp_message_id": msg_id,
        "from": from_num,
        "type": "text",
        "gathered_location": lat is not None,
        "gathered_media": media_id is not None,
    }
    if media_id:
        meta["media_id"] = media_id

    body = GrievanceCreate(
        raw_text=raw_text,
        channel="whatsapp",
        language=language,
        citizen_phone=phone,
        idempotency_key=f"wa-{msg_id}",
        channel_meta=meta,
        location=loc,
    )
    result = await svc.create_grievance(body, actor=None)
    await _clear_state(from_num)

    reply = _FILED_MSG.format(
        tracking_id=result.tracking_id,
        complaint_preview=raw_text[:80] + ("…" if len(raw_text) > 80 else ""),
    )
    if result.is_emergency:
        reply = _EMERGENCY_PREFIX + reply

    await _reply(from_num, reply)
    log.info(
        "whatsapp.filed", tracking_id=result.tracking_id, phone=phone, has_location=lat is not None
    )


# ── Main message handler ──────────────────────────────────────────────────────


async def _ingest_wa_message(msg: dict, svc: IntakeService) -> None:
    msg_id: str = msg.get("id", "")
    from_num: str = msg.get("from", "")
    msg_type: str = msg.get("type", "")
    phone = f"+{from_num}" if not from_num.startswith("+") else from_num

    # Skip system/template/reaction messages
    if msg_type not in ("text", "image", "audio", "video", "document", "location"):
        return

    # Extract content
    text = ""
    media_id = None
    lat = lng = None

    if msg_type == "text":
        text = msg.get("text", {}).get("body", "").strip()
    elif msg_type in ("image", "audio", "video", "document"):
        text = msg.get(msg_type, {}).get("caption", "").strip()
        media_id = msg.get(msg_type, {}).get("id", "")
    elif msg_type == "location":
        coords = msg.get("location", {})
        lat = coords.get("latitude")
        lng = coords.get("longitude")
        text = "_location_"

    if not text and not lat:
        return

    # ── Check existing conversation state ─────────────────────────────────────
    state = await _get_state(from_num)

    if state:
        step = state.get("step")

        # User sends FILE/SKIP/DARJ → file immediately regardless of step
        file_keywords = {
            "darj karein",
            "darj karo",
            "file",
            "skip",
            "darj",
            "haan",
            "yes",
            "ok",
            "okay",
        }
        if text.lower() in file_keywords:
            await _file_complaint(phone, state, svc, from_num)
            return

        if step == "awaiting_location":
            if lat and lng:
                # Got location — update state, ask for photo
                state["lat"] = lat
                state["lng"] = lng
                state["step"] = "awaiting_photo"
                await _set_state(from_num, state)
                await _reply(from_num, _ASK_PHOTO_MSG)
            elif msg_type in ("image", "video") and media_id:
                # Sent photo without location — accept it, file
                state["media_id"] = media_id
                await _file_complaint(phone, state, svc, from_num)
            elif text and text != "_location_":
                # Typed something — maybe they want to file a new complaint?
                # Check if it's actually a different complaint
                classification = await _classify_intent(text)
                if classification.get("intent") == "complaint":
                    # New complaint — reset and start fresh
                    await _clear_state(from_num)
                    state = {
                        "complaint": text,
                        "language": classification.get("language", "hi"),
                        "msg_id": msg_id,
                        "step": "awaiting_location",
                    }
                    await _set_state(from_num, state)
                    await _reply(from_num, _ASK_LOCATION_MSG)
                else:
                    # Remind them what we need
                    await _reply(from_num, _ASK_LOCATION_MSG)
            return

        if step == "awaiting_photo":
            if msg_type in ("image", "video", "audio") and media_id:
                state["media_id"] = media_id
            if lat and lng:
                state["lat"] = lat
                state["lng"] = lng
            # Either got media/location or just any response — file it
            await _file_complaint(phone, state, svc, from_num)
            return

    # ── No active conversation — classify fresh message ───────────────────────
    if msg_type == "location":
        # Standalone location without a complaint context
        await _reply(from_num, _WELCOME_MSG)
        return

    if not text or len(text) < 3:
        return

    classification = await _classify_intent(text)
    intent = classification.get("intent", "greeting_or_test")
    language = classification.get("language", "hi")

    log.info("whatsapp.intent", intent=intent, lang=language, msg_id=msg_id, preview=text[:60])

    if intent == "greeting_or_test":
        await _reply(from_num, _WELCOME_MSG)
        return

    if intent == "status_check":
        await _reply(from_num, _STATUS_MSG)
        return

    # intent == "complaint" → start guided flow
    if msg_type in ("image", "video") and media_id:
        # Sent complaint + photo together — already have media, just need location
        state = {
            "complaint": text or f"[{msg_type.upper()}] complaint via WhatsApp",
            "language": language,
            "msg_id": msg_id,
            "media_id": media_id,
            "step": "awaiting_location",
        }
        await _set_state(from_num, state)
        await _reply(
            from_num,
            "📸 Photo mil gayi! ✅\n\n"
            "📍 *Ab location share karein:*\n"
            "Attachment 📎 → Location → Share\n\n"
            "Ya *DARJ KAREIN* likhein sirf description ke saath.",
        )
    else:
        # Just text — ask for location and photo
        state = {
            "complaint": text,
            "language": language,
            "msg_id": msg_id,
            "step": "awaiting_location",
        }
        await _set_state(from_num, state)
        await _reply(from_num, _ASK_LOCATION_MSG)
