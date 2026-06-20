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

    log.info("notifications.dispatch", channel=channel, status=status, grievance_id=str(grievance_id))
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


def status_change_message(tracking_id: str, new_status: str, language: str = "en") -> str:
    """Generate a short status update notification message."""
    labels: dict[str, dict[str, str]] = {
        "en": {
            "CLASSIFIED": "Your complaint {tid} has been reviewed and categorised.",
            "ASSIGNED": "Your complaint {tid} has been assigned to an officer.",
            "IN_PROGRESS": "An officer is working on your complaint {tid}.",
            "ACTION_TAKEN": "Action has been taken on complaint {tid}. Awaiting resolution.",
            "RESOLVED": "Complaint {tid} has been marked resolved. Please confirm or reopen via: /track/{tid}",
            "ESCALATED": "Your complaint {tid} has been escalated due to SLA breach.",
            "CLOSED": "Complaint {tid} is now closed. Thank you for using DCOS.",
            "REOPENED": "Complaint {tid} has been reopened and reassigned.",
        },
        "hi": {
            "CLASSIFIED": "आपकी शिकायत {tid} की समीक्षा की गई है।",
            "ASSIGNED": "आपकी शिकायत {tid} एक अधिकारी को सौंप दी गई है।",
            "IN_PROGRESS": "आपकी शिकायत {tid} पर कार्य जारी है।",
            "ACTION_TAKEN": "शिकायत {tid} पर कार्रवाई की गई है।",
            "RESOLVED": "शिकायत {tid} हल हो गई है। कृपया पुष्टि करें: /track/{tid}",
            "ESCALATED": "शिकायत {tid} को वरिष्ठ अधिकारी को भेजा गया है।",
            "CLOSED": "शिकायत {tid} बंद कर दी गई है। धन्यवाद।",
            "REOPENED": "शिकायत {tid} पुनः खोली गई है।",
        },
    }
    lang_map = labels.get(language, labels["en"])
    template = lang_map.get(new_status, "Your complaint {tid} status has been updated to " + new_status + ".")
    return template.format(tid=tracking_id)
