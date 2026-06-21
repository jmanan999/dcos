"""
Notification dispatcher — idempotent WhatsApp / SMS / web-push sender.

Call dispatch() once; it will:
  1. Check the notifications table for an existing pending/sent record.
  2. If not found, insert a 'pending' row and attempt to send.
  3. Update status to 'sent' or 'failed'.

All external sends are no-ops when the relevant token/key is unset (local dev).
"""

from __future__ import annotations

import uuid
from typing import Literal

import httpx
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

log = structlog.get_logger()

NotificationChannel = Literal["whatsapp", "sms", "push"]


async def dispatch(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    grievance_id: uuid.UUID | None,
    channel: NotificationChannel,
    message: str,
    phone: str | None = None,
) -> str:
    """
    Idempotent notification dispatch. Returns notification status.
    Caller must commit the session after this returns.
    """
    # Idempotency: skip if a sent/pending notification already exists
    existing = await session.execute(
        text("""
            SELECT id, status FROM notifications
            WHERE grievance_id = CAST(:gid AS uuid)
              AND channel = :ch
              AND message = :msg
              AND status IN ('sent', 'pending')
            LIMIT 1
        """),
        {"gid": str(grievance_id) if grievance_id else None, "ch": channel, "msg": message},
    )
    row = existing.fetchone()
    if row:
        return str(row[1])

    notif_id = uuid.uuid4()
    await session.execute(
        text("""
            INSERT INTO notifications (id, user_id, grievance_id, channel, message, status, created_at)
            VALUES (
                CAST(:id AS uuid),
                CAST(:uid AS uuid),
                CAST(:gid AS uuid),
                :ch,
                :msg,
                'pending',
                now()
            )
        """),
        {
            "id": str(notif_id),
            "uid": str(user_id) if user_id else None,
            "gid": str(grievance_id) if grievance_id else None,
            "ch": channel,
            "msg": message,
        },
    )

    status = "failed"
    external_id: str | None = None
    error: str | None = None

    try:
        if channel == "whatsapp" and phone:
            external_id, error = await _send_whatsapp(phone, message)
        elif channel == "sms" and phone:
            external_id, error = await _send_sms(phone, message)
        elif channel == "push" and user_id:
            external_id, error = await _send_push(str(user_id), message)
        else:
            error = "missing phone or unsupported channel"

        status = "sent" if error is None else "failed"
    except Exception as exc:
        error = str(exc)
        log.error("notifications.dispatch.error", channel=channel, error=error)

    # sent_at computed in Python — avoids asyncpg type-inference conflict
    # when :status appears in both SET and a CASE condition (varchar vs text).
    sent_at_expr = "now()" if status == "sent" else "NULL"
    await session.execute(
        text(f"""  # noqa: S608
            UPDATE notifications
            SET status = :status,
                external_id = :ext_id,
                error = :error,
                sent_at = {sent_at_expr}
            WHERE id = CAST(:id AS uuid)
        """),
        {"status": status, "ext_id": external_id, "error": error, "id": str(notif_id)},
    )

    log.info(
        "notifications.dispatch", channel=channel, status=status, grievance_id=str(grievance_id)
    )
    return status


# ── Channel senders ────────────────────────────────────────────────────────────


async def _send_whatsapp(phone: str, message: str) -> tuple[str | None, str | None]:
    """Send a text message via WhatsApp Cloud API."""
    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        log.debug("notifications.whatsapp.skipped", reason="no token (local dev)")
        return "dev-noop", None

    url = (
        f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}"
        f"/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    )
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
        )
    if resp.status_code == 200:
        data = resp.json()
        msg_id = data.get("messages", [{}])[0].get("id")
        return msg_id, None
    return None, f"whatsapp error {resp.status_code}: {resp.text[:200]}"


async def _send_sms(phone: str, message: str) -> tuple[str | None, str | None]:
    """Send SMS via MSG91."""
    if not settings.MSG91_API_KEY:
        log.debug("notifications.sms.skipped", reason="no key (local dev)")
        return "dev-noop", None

    url = "https://api.msg91.com/api/v5/flow/"
    payload = {
        "template_id": settings.MSG91_TEMPLATE_ID_STATUS,
        "short_url": "0",
        "recipients": [{"mobiles": phone, "message": message}],
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={"authkey": settings.MSG91_API_KEY, "Content-Type": "application/json"},
        )
    if resp.status_code == 200:
        return resp.json().get("request_id"), None
    return None, f"sms error {resp.status_code}: {resp.text[:200]}"


async def _send_push(user_id: str, message: str) -> tuple[str | None, str | None]:
    """Web push — stub for now; requires storing push subscriptions."""
    if not settings.VAPID_PRIVATE_KEY:
        log.debug("notifications.push.skipped", reason="no vapid key (local dev)")
        return "dev-noop", None
    # Real implementation: lookup push subscription for user_id, send via pywebpush
    return None, "push not yet wired (needs subscription storage)"


def status_change_message(
    tracking_id: str,
    new_status: str,
    language: str = "en",
    *,
    officer_name: str | None = None,
    department: str | None = None,
    sla_due_at: str | None = None,
    category: str | None = None,
) -> str:
    """
    Rich, context-aware status notification messages.
    Includes officer name, department, SLA deadline, and action prompts.
    Both English and Hindi — JanSetu brand voice.
    """
    officer = officer_name or "an officer"
    dept = f" ({department})" if department else ""
    sla = f" Expected resolution: {sla_due_at}." if sla_due_at else " SLA: 72 hours."
    cat = f" [{category}]" if category else ""
    track_url = f"https://dcos-ecru.vercel.app/track/{tracking_id}"

    officer_hi = officer_name or "एक अधिकारी"
    dept_hi = f" ({department})" if department else ""
    sla_hi = f" अपेक्षित समाधान: {sla_due_at}।" if sla_due_at else " समयसीमा: 72 घंटे।"

    templates: dict[str, dict[str, str]] = {
        "en": {
            "RECEIVED": (
                f"✅ JanSetu: Your complaint {tracking_id}{cat} has been received. "
                f"We will categorise and assign it within 2 hours. Track: {track_url}"
            ),
            "CLASSIFIED": (
                f"🔍 JanSetu: Complaint {tracking_id} has been reviewed and categorised by AI. "
                f"Being routed to the right department now. Track: {track_url}"
            ),
            "ASSIGNED": (
                f"👮 JanSetu: Complaint {tracking_id} assigned to {officer}{dept}.{sla}"
                f" You will be notified when work starts. Track: {track_url}"
            ),
            "IN_PROGRESS": (
                f"🔧 JanSetu: Officer {officer}{dept} has started field work on your complaint {tracking_id}. "
                f"Track live status: {track_url}"
            ),
            "ACTION_TAKEN": (
                f"✔️ JanSetu: Field work completed on complaint {tracking_id}. "
                f"Officer is uploading proof and preparing resolution note. "
                f"You will receive a confirmation shortly. Track: {track_url}"
            ),
            "RESOLVED": (
                f"🎉 JanSetu: Complaint {tracking_id} has been marked RESOLVED.\n\n"
                f"Was the issue actually fixed? Please confirm:\n"
                f"✅ YES → {track_url}/feedback\n"
                f"❌ NO → {track_url}/reopen\n\n"
                f"If we don't hear from you in 7 days, the case will auto-close."
            ),
            "ESCALATED": (
                f"⚠️ JanSetu: Your complaint {tracking_id} has been escalated to a senior officer "
                f"because the resolution deadline was missed. "
                f"A supervisor will now handle this case. Track: {track_url}"
            ),
            "CLOSED": (
                f"📋 JanSetu: Complaint {tracking_id} is now closed. "
                f"Thank you for helping improve Delhi's civic services. "
                f"Rate your experience: {track_url}"
            ),
            "REOPENED": (
                f"🔄 JanSetu: Complaint {tracking_id} has been reopened and re-assigned "
                f"based on your feedback. We apologise for the inconvenience. "
                f"A new officer will handle this. Track: {track_url}"
            ),
        },
        "hi": {
            "RECEIVED": (
                f"✅ जनसेतु: आपकी शिकायत {tracking_id}{cat} प्राप्त हो गई। "
                f"2 घंटे में वर्गीकरण होगा। ट्रैक करें: {track_url}"
            ),
            "CLASSIFIED": (
                f"🔍 जनसेतु: शिकायत {tracking_id} की AI समीक्षा हो गई। "
                f"सही विभाग को भेजी जा रही है। ट्रैक करें: {track_url}"
            ),
            "ASSIGNED": (
                f"👮 जनसेतु: शिकायत {tracking_id} को {officer_hi}{dept_hi} को सौंपा गया।{sla_hi}"
                f" कार्य शुरू होने पर सूचना मिलेगी। ट्रैक करें: {track_url}"
            ),
            "IN_PROGRESS": (
                f"🔧 जनसेतु: अधिकारी {officer_hi}{dept_hi} ने आपकी शिकायत {tracking_id} पर "
                f"फील्ड कार्य शुरू कर दिया है। ट्रैक करें: {track_url}"
            ),
            "ACTION_TAKEN": (
                f"✔️ जनसेतु: शिकायत {tracking_id} पर फील्ड कार्य पूरा हो गया। "
                f"समाधान की पुष्टि जल्द होगी। ट्रैक करें: {track_url}"
            ),
            "RESOLVED": (
                f"🎉 जनसेतु: शिकायत {tracking_id} हल हो गई!\n\n"
                f"क्या समस्या सच में ठीक हो गई?\n"
                f"✅ हाँ → {track_url}/feedback\n"
                f"❌ नहीं → {track_url}/reopen\n\n"
                f"7 दिन में जवाब न दें तो केस अपने आप बंद हो जाएगा।"
            ),
            "ESCALATED": (
                f"⚠️ जनसेतु: शिकायत {tracking_id} की समयसीमा पार होने पर "
                f"वरिष्ठ अधिकारी को भेजा गया है। ट्रैक करें: {track_url}"
            ),
            "CLOSED": (
                f"📋 जनसेतु: शिकायत {tracking_id} बंद हो गई। दिल्ली की सेवाओं में "
                f"सुधार के लिए आपका योगदान महत्वपूर्ण है। ट्रैक करें: {track_url}"
            ),
            "REOPENED": (
                f"🔄 जनसेतु: आपकी प्रतिक्रिया पर शिकायत {tracking_id} पुनः खोली गई। "
                f"नए अधिकारी को सौंपी जाएगी। ट्रैक करें: {track_url}"
            ),
        },
    }

    lang_map = templates.get(language, templates["en"])
    message = lang_map.get(
        new_status,
        f"JanSetu: Your complaint {tracking_id} status updated to {new_status}. Track: {track_url}",
    )
    return message
