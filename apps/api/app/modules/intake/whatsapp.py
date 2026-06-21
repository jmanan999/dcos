"""
JanSetu — WhatsApp Cloud API integration.

Industry-grade conversational intake with:
  • Language selection first (हिंदी / English)
  • Main menu with interactive buttons & lists
  • Guided multi-step complaint filing
  • Location + photo collection
  • Complaint status tracking
  • Personal report ("My Complaints")
  • Redis state machine (10-min TTL per user)
  • Full bilingual support
"""

from __future__ import annotations

import json

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

log = structlog.get_logger()

# ── State TTL ─────────────────────────────────────────────────────────────────

STATE_TTL = 600  # 10 minutes

# ── Bilingual messages ────────────────────────────────────────────────────────

T: dict[str, dict[str, str]] = {
    "welcome_body": {
        "hi": "🏛️ *JanSetu — दिल्ली शिकायत पोर्टल* में आपका स्वागत है!\n\nदिल्ली सरकार का आधिकारिक शिकायत समाधान मंच।\n\n*अपनी भाषा चुनें:*",
        "en": "🏛️ Welcome to *JanSetu — Delhi Grievance Portal*!\n\nOfficial civic grievance platform of the Delhi Government.\n\n*Choose your language:*",
    },
    "main_menu_body": {
        "hi": "नमस्ते! 👋 आज मैं आपकी कैसे मदद कर सकता हूं?\n\nनीचे से विकल्प चुनें:",
        "en": "Hello! 👋 How can I help you today?\n\nChoose an option below:",
    },
    "main_menu_button": {"hi": "मेनू देखें", "en": "View Menu"},
    "opt_file": {"hi": "📋 शिकायत दर्ज करें", "en": "📋 File a Complaint"},
    "opt_file_desc": {"hi": "नई नागरिक समस्या दर्ज करें", "en": "Report a new civic issue"},
    "opt_track": {"hi": "🔍 शिकायत ट्रैक करें", "en": "🔍 Track Complaint"},
    "opt_track_desc": {"hi": "Tracking ID से स्थिति जांचें", "en": "Check status by tracking ID"},
    "opt_report": {"hi": "📊 मेरी शिकायतें", "en": "📊 My Complaints"},
    "opt_report_desc": {"hi": "अपनी सभी शिकायतें देखें", "en": "View all your complaints"},
    "opt_about": {"hi": "JanSetu के बारे में", "en": "About JanSetu"},
    "opt_about_desc": {"hi": "क्या है और कैसे काम करता है", "en": "What it is and how it works"},
    "ask_desc_header": {"hi": "शिकायत दर्ज करें", "en": "File a Complaint"},
    "ask_desc_body": {
        "hi": "अपनी *नागरिक समस्या का विवरण* लिखें:\n\n_उदाहरण:_\n• सड़क पर गड्ढा है 3 दिन से\n• बिजली 6 घंटे से नहीं है\n• पानी नहीं आ रहा\n• कूड़ा नहीं उठाया गया\n\n_जितना विस्तृत होगा, उतना जल्दी समाधान होगा।_",
        "en": "Describe your *civic issue* in detail:\n\n_Examples:_\n• Pothole on road near market for 3 days\n• No electricity for 6 hours, BSES not responding\n• No water supply for 2 days\n• Garbage not collected since Tuesday\n\n_More detail = faster resolution._",
    },
    "ask_location_header": {"hi": "स्थान साझा करें", "en": "Share Location"},
    "ask_location_body": {
        "hi": "✅ *शिकायत नोट हो गई!*\n\n📍 *अब स्थान साझा करें (ज़रूरी):*\nAttachment 📎 → Location → Share\n\n_अधिकारी को सटीक स्थान मिलने से जल्दी समाधान होता है।_",
        "en": "✅ *Complaint noted!*\n\n📍 *Now share your location (required):*\nTap Attachment 📎 → Location → Share\n\n_Accurate location = faster officer dispatch._",
    },
    "btn_skip_location": {"hi": "स्थान छोड़ें", "en": "Skip Location"},
    "btn_skip_photo": {"hi": "फ़ोटो छोड़ें", "en": "Skip Photo"},
    "btn_file_now": {"hi": "अभी दर्ज करें", "en": "File Now"},
    "btn_back_menu": {"hi": "मेनू पर वापस", "en": "Back to Menu"},
    "ask_photo_header": {"hi": "फ़ोटो भेजें", "en": "Send Photo"},
    "ask_photo_body": {
        "hi": "📍 *स्थान मिल गया!* ✅\n\n📸 *समस्या की फ़ोटो या वीडियो भेजें* (optional)\n\nफ़ोटो से अधिकारी को समस्या की गंभीरता समझने में मदद मिलती है।",
        "en": "📍 *Location received!* ✅\n\n📸 *Send a photo or video of the issue* (optional)\n\nPhoto evidence speeds up resolution significantly.",
    },
    "filing_header": {"hi": "शिकायत दर्ज हो रही है...", "en": "Filing complaint..."},
    "filed_header": {"hi": "शिकायत दर्ज हो गई ✅", "en": "Complaint Filed ✅"},
    "filed_body": {
        "hi": "🏛️ *JanSetu — दिल्ली शिकायत पोर्टल*\n\nआपकी शिकायत सफलतापूर्वक दर्ज हो गई है!\n\n📋 *Tracking ID:* `{tracking_id}`\n\n🔍 *स्थिति जांचें:*\nhttps://dcos-ecru.vercel.app/track/{tracking_id}\n\n📌 *आगे क्या होगा:*\n• AI आपकी शिकायत को सही विभाग को भेजेगा\n• अधिकारी इसे claim करेंगे\n• Proof photo के साथ समाधान होगा\n• हर update पर WhatsApp message मिलेगा\n\n_शिकायत:_ {complaint_preview}",
        "en": "🏛️ *JanSetu — Delhi Grievance Portal*\n\nYour complaint has been successfully filed!\n\n📋 *Tracking ID:* `{tracking_id}`\n\n🔍 *Track status:*\nhttps://dcos-ecru.vercel.app/track/{tracking_id}\n\n📌 *What happens next:*\n• AI routes your complaint to the right dept\n• An officer will claim and act on it\n• Resolution requires before/after photo proof\n• You'll get WhatsApp updates at every step\n\n_Complaint:_ {complaint_preview}",
    },
    "emergency_prefix": {
        "hi": "🚨 *आपातकाल — EMERGENCY*\nतुरंत *112* पर कॉल करें\n\n",
        "en": "🚨 *EMERGENCY DETECTED*\nCall *112* immediately\n\n",
    },
    "ask_tracking_id": {
        "hi": "🔍 *शिकायत ट्रैक करें*\n\nअपना Tracking ID type करें:\n_JS-20260620-XXXXXXXX_\n\nYa seedha check karein:\nhttps://dcos-ecru.vercel.app/track",
        "en": "🔍 *Track Your Complaint*\n\nType your Tracking ID:\n_JS-20260620-XXXXXXXX_\n\nOr check directly:\nhttps://dcos-ecru.vercel.app/track",
    },
    "not_found": {
        "hi": "❌ Tracking ID नहीं मिला।\n\nSahi format: *JS-20260620-XXXXXXXX*",
        "en": "❌ Tracking ID not found.\n\nCorrect format: *JS-20260620-XXXXXXXX*",
    },
    "report_header": {"hi": "📊 आपकी शिकायतें", "en": "📊 Your Complaints"},
    "report_none": {
        "hi": "आपने अभी तक कोई शिकायत दर्ज नहीं की है।\n\n*शिकायत दर्ज करने के लिए* मेनू में 📋 चुनें।",
        "en": "You haven't filed any complaints yet.\n\n*To file a complaint*, choose 📋 from the menu.",
    },
    "about_text": {
        "hi": "🏛️ *JanSetu (जनसेतु)*\nदिल्ली सरकार का नागरिक शिकायत पोर्टल\n\n*JanSetu क्या है?*\nजनसेतु = जन (लोग) + सेतु (पुल)\nयह नागरिकों और सरकार के बीच एक पुल है।\n\n*कैसे काम करता है:*\n1️⃣ आप शिकायत दर्ज करें\n2️⃣ AI सही विभाग को भेजे\n3️⃣ अधिकारी action लें\n4️⃣ आपको updates मिलें\n\n*12 विभाग:*\nMCD, DJB, PWD, Delhi Police, DTC, BSES, DPCC, NDMC, DMRC, Health और अन्य\n\n📞 Helpline: 1031\n🚨 Emergency: 112\n🌐 https://dcos-ecru.vercel.app",
        "en": "🏛️ *JanSetu (People's Bridge)*\nDelhi Government's Civic Grievance Portal\n\n*What is JanSetu?*\nJanSetu = Jan (People) + Setu (Bridge)\nA bridge between citizens and the government.\n\n*How it works:*\n1️⃣ You file a complaint\n2️⃣ AI routes it to the right dept\n3️⃣ Officer takes action\n4️⃣ You get updates\n\n*12 Departments:*\nMCD, DJB, PWD, Delhi Police, DTC, BSES, DPCC, NDMC, DMRC, Health & more\n\n📞 Helpline: 1031\n🚨 Emergency: 112\n🌐 https://dcos-ecru.vercel.app",
    },
    "status_label": {
        "RECEIVED": {"hi": "⏳ प्राप्त", "en": "⏳ Received"},
        "CLASSIFIED": {"hi": "🤖 वर्गीकृत", "en": "🤖 Classified"},
        "ASSIGNED": {"hi": "👮 सौंपा गया", "en": "👮 Assigned"},
        "IN_PROGRESS": {"hi": "🔧 काम जारी", "en": "🔧 In Progress"},
        "ACTION_TAKEN": {"hi": "✅ कार्रवाई", "en": "✅ Action Taken"},
        "RESOLVED": {"hi": "✅ हल हुई", "en": "✅ Resolved"},
        "VERIFIED": {"hi": "✅ सत्यापित", "en": "✅ Verified"},
        "CLOSED": {"hi": "🔒 बंद", "en": "🔒 Closed"},
        "REOPENED": {"hi": "🔄 पुनः खुली", "en": "🔄 Reopened"},
        "ESCALATED": {"hi": "🔺 उच्च स्तर", "en": "🔺 Escalated"},
        "REJECTED_SPAM": {"hi": "❌ अस्वीकृत", "en": "❌ Rejected"},
    },
}


def t(key: str, lang: str, **kwargs) -> str:
    msg = T.get(key, {}).get(lang, T.get(key, {}).get("en", key))
    if kwargs:
        msg = msg.format(**kwargs)
    return msg


# ── Redis state helpers ───────────────────────────────────────────────────────


async def _redis():
    import redis.asyncio as r

    return r.from_url(settings.REDIS_URL, decode_responses=True)


async def get_state(phone: str) -> dict:
    try:
        r = await _redis()
        raw = await r.get(f"wa:state:{phone}")
        await r.aclose()
        return json.loads(raw) if raw else {}
    except Exception:
        return {}


async def set_state(phone: str, state: dict) -> None:
    try:
        r = await _redis()
        await r.set(f"wa:state:{phone}", json.dumps(state), ex=STATE_TTL)
        await r.aclose()
    except Exception:
        pass


async def clear_state(phone: str) -> None:
    try:
        r = await _redis()
        await r.delete(f"wa:state:{phone}")
        await r.aclose()
    except Exception:
        pass


# ── WhatsApp API senders ──────────────────────────────────────────────────────


async def _api(payload: dict) -> None:
    """Send any WhatsApp message. Swallows errors."""
    if not (settings.WHATSAPP_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID):
        return
    try:
        import httpx

        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.post(
                f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}"
                f"/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages",
                headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
                json=payload,
            )
            if r.status_code not in (200, 201):
                log.warning("whatsapp.api.error", status=r.status_code, body=r.text[:200])
    except Exception as exc:
        log.warning("whatsapp.api.failed", error=str(exc))


async def send_text(to: str, text: str) -> None:
    await _api({"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}})


async def send_buttons(
    to: str,
    body: str,
    buttons: list[tuple[str, str]],  # [(id, title), ...]
    header: str | None = None,
    footer: str | None = None,
) -> None:
    """Interactive button message — max 3 buttons, title max 20 chars."""
    interactive: dict = {
        "type": "button",
        "body": {"text": body},
        "action": {
            "buttons": [
                {"type": "reply", "reply": {"id": bid, "title": title[:20]}}
                for bid, title in buttons[:3]
            ]
        },
    }
    if header:
        interactive["header"] = {"type": "text", "text": header}
    if footer:
        interactive["footer"] = {"text": footer}
    await _api(
        {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
        }
    )


async def send_list(
    to: str,
    body: str,
    sections: list[dict],  # [{"title": str, "rows": [{"id", "title", "description"}]}]
    button_text: str = "Choose",
    header: str | None = None,
    footer: str | None = None,
) -> None:
    """Interactive list message — max 10 rows across all sections."""
    interactive: dict = {
        "type": "list",
        "body": {"text": body},
        "action": {"button": button_text[:20], "sections": sections},
    }
    if header:
        interactive["header"] = {"type": "text", "text": header}
    if footer:
        interactive["footer"] = {"text": footer}
    await _api(
        {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
        }
    )


# ── Screen builders ───────────────────────────────────────────────────────────


async def show_language_select(to: str) -> None:
    await send_buttons(
        to=to,
        body=t("welcome_body", "en"),
        buttons=[("lang_hi", "हिंदी"), ("lang_en", "English")],
        footer="JanSetu • Delhi Government",
    )


async def show_main_menu(to: str, lang: str) -> None:
    await send_list(
        to=to,
        header="🏛️ JanSetu",
        body=t("main_menu_body", lang),
        button_text=t("main_menu_button", lang),
        sections=[
            {
                "title": "📋 " + ("सेवाएं" if lang == "hi" else "Services"),
                "rows": [
                    {
                        "id": "menu_file",
                        "title": t("opt_file", lang)[:24],
                        "description": t("opt_file_desc", lang)[:72],
                    },
                    {
                        "id": "menu_track",
                        "title": t("opt_track", lang)[:24],
                        "description": t("opt_track_desc", lang)[:72],
                    },
                    {
                        "id": "menu_report",
                        "title": t("opt_report", lang)[:24],
                        "description": t("opt_report_desc", lang)[:72],
                    },
                    {
                        "id": "menu_about",
                        "title": t("opt_about", lang)[:24],
                        "description": t("opt_about_desc", lang)[:72],
                    },
                ],
            }
        ],
        footer="Helpline: 1031 | Emergency: 112",
    )


async def show_ask_description(to: str, lang: str) -> None:
    await send_buttons(
        to=to,
        header=t("ask_desc_header", lang),
        body=t("ask_desc_body", lang),
        buttons=[("back_menu", t("btn_back_menu", lang)[:20])],
        footer="Helpline: 1031 | Emergency: 112",
    )


async def show_ask_location(to: str, lang: str) -> None:
    await send_buttons(
        to=to,
        header=t("ask_location_header", lang),
        body=t("ask_location_body", lang),
        buttons=[
            ("skip_location", t("btn_skip_location", lang)[:20]),
            ("back_menu", t("btn_back_menu", lang)[:20]),
        ],
        footer="Attachment 📎 → Location → Share",
    )


async def show_ask_photo(to: str, lang: str) -> None:
    await send_buttons(
        to=to,
        header=t("ask_photo_header", lang),
        body=t("ask_photo_body", lang),
        buttons=[
            ("skip_photo", t("btn_skip_photo", lang)[:20]),
            ("back_menu", t("btn_back_menu", lang)[:20]),
        ],
    )


async def show_filed(
    to: str, lang: str, tracking_id: str, complaint: str, is_emergency: bool
) -> None:
    body = t(
        "filed_body",
        lang,
        tracking_id=tracking_id,
        complaint_preview=complaint[:80] + ("…" if len(complaint) > 80 else ""),
    )
    if is_emergency:
        body = t("emergency_prefix", lang) + body
    await send_buttons(
        to=to,
        header=t("filed_header", lang),
        body=body,
        buttons=[
            ("track_now", "🔍 " + ("ट्रैक करें" if lang == "hi" else "Track Now")),
            ("menu_file", "📋 " + ("नई शिकायत" if lang == "hi" else "New Complaint")),
        ],
        footer=f"ID: {tracking_id}",
    )


async def show_track_ask(to: str, lang: str) -> None:
    await send_buttons(
        to=to,
        body=t("ask_tracking_id", lang),
        buttons=[("back_menu", t("btn_back_menu", lang)[:20])],
    )


async def show_report(to: str, lang: str, rows: list[dict]) -> None:
    if not rows:
        await send_buttons(
            to=to,
            header=t("report_header", lang),
            body=t("report_none", lang),
            buttons=[("menu_file", t("opt_file", lang)[:20])],
        )
        return

    header_txt = t("report_header", lang) + f" ({len(rows)})"
    lines = []
    for i, row in enumerate(rows[:8], 1):
        status_key = row.get("status", "RECEIVED")
        status_label = T.get("status_label", {}).get(status_key, {}).get(lang, status_key)
        complaint_preview = (row.get("raw_text") or "")[:50]
        lines.append(
            f"{i}. *{row['tracking_id']}* {status_label}\n"
            f"   {complaint_preview}{'…' if len(complaint_preview) == 50 else ''}"
        )

    body = "\n\n".join(lines)
    body += "\n\n🔍 https://dcos-ecru.vercel.app/track"

    await send_buttons(
        to=to,
        header=header_txt,
        body=body,
        buttons=[
            ("menu_file", t("opt_file", lang)[:20]),
            ("back_menu", t("btn_back_menu", lang)[:20]),
        ],
    )


# ── Complaint filing ──────────────────────────────────────────────────────────


async def file_complaint(phone: str, state: dict, to: str, db: AsyncSession) -> None:
    from app.modules.intake.schemas import GrievanceCreate, LocationInput
    from app.modules.intake.service import IntakeService

    lang = state.get("lang", "hi")
    complaint = state.get("complaint", "")
    lat = state.get("lat")
    lng = state.get("lng")
    media_id = state.get("media_id")
    msg_id = state.get("msg_id", "unknown")

    loc = LocationInput(lat=lat, lng=lng) if lat and lng else None
    meta = {
        "whatsapp_message_id": msg_id,
        "from": to,
        "type": "text",
        "has_location": lat is not None,
        "has_media": media_id is not None,
    }
    if media_id:
        meta["media_id"] = media_id

    body = GrievanceCreate(
        raw_text=complaint,
        channel="whatsapp",
        language=lang,
        citizen_phone=phone,
        idempotency_key=f"wa-{msg_id}",
        channel_meta=meta,
        location=loc,
    )

    svc = IntakeService(db)
    result = await svc.create_grievance(body, actor=None)
    await clear_state(to)

    await show_filed(to, lang, result.tracking_id, complaint, result.is_emergency)
    log.info("whatsapp.filed", tracking_id=result.tracking_id, has_location=lat is not None)


# ── Intent classification ─────────────────────────────────────────────────────


_INTENT_PROMPT = """Classify a WhatsApp message for JanSetu, Delhi's civic grievance bot.

Intent options:
- "complaint" — civic problem (pothole, water, electricity, garbage, noise, pollution, stray animals, etc.)
- "status_check" — asking about a filed complaint (track, status, JS-, complaint ID, "meri shikayat")
- "greeting" — hi/hello/namaste/test/just a name/random words

Rules:
- Short messages (under 10 chars) that aren't clear complaints → greeting
- Actual problem description → complaint
- References to tracking or past complaints → status_check
- When uncertain → greeting (never file junk)

Respond ONLY with JSON: {"intent": "complaint"|"status_check"|"greeting", "language": "hi"|"en"}"""


async def classify_intent(text: str) -> dict:
    try:
        import json as _j

        import httpx

        if not settings.GROQ_API_KEY:
            return {"intent": "complaint" if len(text) > 20 else "greeting", "language": "hi"}

        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{settings.GROQ_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": _INTENT_PROMPT},
                        {"role": "user", "content": f"Message: {text[:400]}"},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.0,
                    "max_tokens": 60,
                },
            )
        return _j.loads(r.json()["choices"][0]["message"]["content"])
    except Exception as exc:
        log.warning("whatsapp.intent.failed", error=str(exc))
        return {"intent": "greeting", "language": "hi"}


# ── Tracking lookup ───────────────────────────────────────────────────────────


async def lookup_complaint(tracking_id: str, db: AsyncSession) -> dict | None:
    from sqlalchemy import text as sql_text

    result = await db.execute(
        sql_text("""
            SELECT g.tracking_id, g.status, g.category, g.raw_text,
                   g.created_at, g.sla_due_at, d.name AS department
            FROM grievances g
            LEFT JOIN departments d ON d.id = g.department_id
            WHERE g.tracking_id = :tid
        """),
        {"tid": tracking_id.upper()},
    )
    row = result.fetchone()
    if not row:
        return None
    return {
        "tracking_id": row[0],
        "status": row[1],
        "category": row[2],
        "raw_text": row[3],
        "created_at": row[4],
        "sla_due_at": row[5],
        "department": row[6],
    }


async def show_complaint_status(to: str, lang: str, data: dict) -> None:
    status_key = data.get("status", "RECEIVED")
    status_label = T.get("status_label", {}).get(status_key, {}).get(lang, status_key)
    dept = data.get("department") or ("अज्ञात" if lang == "hi" else "Unknown")
    created = data.get("created_at")
    date_str = created.strftime("%d %b %Y") if created else "—"
    complaint_preview = (data.get("raw_text") or "")[:80]

    body = (
        f"📋 *{data['tracking_id']}*\n\n"
        f"*{'स्थिति' if lang == 'hi' else 'Status'}:* {status_label}\n"
        f"*{'विभाग' if lang == 'hi' else 'Department'}:* {dept}\n"
        f"*{'श्रेणी' if lang == 'hi' else 'Category'}:* {data.get('category') or ('अज्ञात' if lang == 'hi' else 'Pending')}\n"
        f"*{'तारीख' if lang == 'hi' else 'Filed on'}:* {date_str}\n\n"
        f"_{complaint_preview}{'…' if len(complaint_preview) == 80 else ''}_\n\n"
        f"🔗 https://dcos-ecru.vercel.app/track/{data['tracking_id']}"
    )

    await send_buttons(
        to=to,
        header="🔍 " + ("शिकायत स्थिति" if lang == "hi" else "Complaint Status"),
        body=body,
        buttons=[
            ("track_another", "🔍 " + ("दूसरा ट्रैक" if lang == "hi" else "Track Another")),
            ("back_menu", t("btn_back_menu", lang)[:20]),
        ],
    )


async def get_user_complaints(phone: str, db: AsyncSession) -> list[dict]:
    from sqlalchemy import text as sql_text

    result = await db.execute(
        sql_text("""
            SELECT tracking_id, status, raw_text, created_at
            FROM grievances
            WHERE citizen_phone = :phone AND channel = 'whatsapp'
            ORDER BY created_at DESC
            LIMIT 8
        """),
        {"phone": phone},
    )
    return [
        {"tracking_id": r[0], "status": r[1], "raw_text": r[2], "created_at": r[3]}
        for r in result.fetchall()
    ]


# ── Main message handler ──────────────────────────────────────────────────────


async def handle_message(msg: dict, db: AsyncSession) -> None:
    """
    Entry point for every incoming WhatsApp message.
    Handles both regular messages and interactive replies (button clicks / list selections).
    """
    msg_type = msg.get("type", "")
    from_num = msg.get("from", "")
    msg_id = msg.get("id", "")
    phone = f"+{from_num}" if not from_num.startswith("+") else from_num

    # ── Extract content based on type ────────────────────────────────────────
    text = ""
    button_id = ""
    lat = lng = None
    media_id = None

    if msg_type == "text":
        text = msg.get("text", {}).get("body", "").strip()
    elif msg_type == "interactive":
        itype = msg.get("interactive", {}).get("type", "")
        if itype == "button_reply":
            button_id = msg.get("interactive", {}).get("button_reply", {}).get("id", "")
            text = msg.get("interactive", {}).get("button_reply", {}).get("title", "")
        elif itype == "list_reply":
            button_id = msg.get("interactive", {}).get("list_reply", {}).get("id", "")
            text = msg.get("interactive", {}).get("list_reply", {}).get("title", "")
    elif msg_type == "location":
        coords = msg.get("location", {})
        lat = coords.get("latitude")
        lng = coords.get("longitude")
    elif msg_type in ("image", "video", "audio", "document"):
        media_id = msg.get(msg_type, {}).get("id", "")
        text = msg.get(msg_type, {}).get("caption", "").strip()
    else:
        # Ignore stickers, reactions, system messages, etc.
        return

    if not (text or button_id or lat or media_id):
        return

    state = await get_state(from_num)
    lang = state.get("lang", "")  # empty = language not yet selected
    step = state.get("step", "")

    log.info(
        "whatsapp.msg",
        type=msg_type,
        button=button_id,
        step=step,
        lang=lang,
        text=(text[:40] if text else ""),
        from_num=from_num,
    )

    # ── BUTTON/LIST INTERACTIONS ──────────────────────────────────────────────

    # Language selection
    if button_id in ("lang_hi", "lang_en"):
        chosen = "hi" if button_id == "lang_hi" else "en"
        await set_state(from_num, {"lang": chosen, "step": "main_menu"})
        await show_main_menu(from_num, chosen)
        return

    # Main menu selections
    if button_id == "menu_file":
        await set_state(from_num, {"lang": lang or "hi", "step": "filing_description"})
        await show_ask_description(from_num, lang or "hi")
        return

    if button_id == "menu_track" or button_id == "track_another":
        await set_state(from_num, {"lang": lang or "hi", "step": "tracking"})
        await show_track_ask(from_num, lang or "hi")
        return

    if button_id == "menu_report":
        rows = await get_user_complaints(phone, db)
        await show_report(from_num, lang or "hi", rows)
        return

    if button_id == "menu_about":
        await send_text(from_num, t("about_text", lang or "hi"))
        await show_main_menu(from_num, lang or "hi")
        return

    if button_id in ("back_menu", "track_now"):
        await set_state(from_num, {"lang": lang or "hi", "step": "main_menu"})
        await show_main_menu(from_num, lang or "hi")
        return

    if button_id == "skip_location":
        # Skip location — go to photo step
        await set_state(from_num, {**state, "step": "filing_photo"})
        await show_ask_photo(from_num, lang or "hi")
        return

    if button_id == "skip_photo":
        # Skip photo — file immediately
        await file_complaint(phone, state, from_num, db)
        return

    # ── STATE-BASED FLOW ──────────────────────────────────────────────────────

    # No language selected yet → show language selection
    if not lang:
        await show_language_select(from_num)
        return

    # ── FILING FLOW ──────────────────────────────────────────────────────────

    if step == "filing_description":
        if not text or len(text) < 5:
            await show_ask_description(from_num, lang)
            return
        # Classify to confirm it's actually a complaint
        classification = await classify_intent(text)
        if classification.get("intent") == "greeting":
            await show_main_menu(from_num, lang)
            return
        detected_lang = classification.get("language", lang)
        await set_state(
            from_num,
            {
                "lang": detected_lang,
                "step": "filing_location",
                "complaint": text,
                "msg_id": msg_id,
            },
        )
        await show_ask_location(from_num, detected_lang)
        return

    if step == "filing_location":
        if lat and lng:
            await set_state(from_num, {**state, "lat": lat, "lng": lng, "step": "filing_photo"})
            await show_ask_photo(from_num, lang)
        elif media_id:
            await set_state(from_num, {**state, "media_id": media_id})
            await file_complaint(phone, {**state, "media_id": media_id}, from_num, db)
        elif text:
            # Re-classify — maybe they're describing more
            classification = await classify_intent(text)
            if classification.get("intent") == "complaint":
                # New complaint overrides
                await set_state(
                    from_num,
                    {
                        "lang": lang,
                        "step": "filing_location",
                        "complaint": text,
                        "msg_id": msg_id,
                    },
                )
                await show_ask_location(from_num, lang)
            else:
                await show_ask_location(from_num, lang)
        return

    if step == "filing_photo":
        if media_id:
            await set_state(from_num, {**state, "media_id": media_id})
            await file_complaint(phone, {**state, "media_id": media_id}, from_num, db)
        elif lat and lng:
            await set_state(from_num, {**state, "lat": lat, "lng": lng})
            await file_complaint(phone, {**state, "lat": lat, "lng": lng}, from_num, db)
        else:
            # Any text or timeout skip → file what we have
            await file_complaint(phone, state, from_num, db)
        return

    # ── TRACKING FLOW ─────────────────────────────────────────────────────────

    if step == "tracking":
        if not text:
            await show_track_ask(from_num, lang)
            return
        # Extract tracking ID pattern
        import re

        tid_match = re.search(r"JS-\d{8}-[A-F0-9]{8}", text.upper())
        if not tid_match:
            # Try bare text as tracking ID
            candidate = text.strip().upper()
            if not candidate.startswith("JS-"):
                await send_text(
                    from_num,
                    "❌ "
                    + (
                        "सही format: JS-20260620-XXXXXXXX"
                        if lang == "hi"
                        else "Correct format: JS-20260620-XXXXXXXX"
                    ),
                )
                return
            tid = candidate
        else:
            tid = tid_match.group()

        data = await lookup_complaint(tid, db)
        if not data:
            await send_text(from_num, t("not_found", lang))
            return
        await show_complaint_status(from_num, lang, data)
        await set_state(from_num, {**state, "step": "tracking"})
        return

    # ── FALLBACK — no step set but has language ───────────────────────────────

    # Check if it's a tracking ID
    if text:
        import re

        if re.match(r"JS-\d{8}-[A-F0-9]{8}", text.upper()):
            data = await lookup_complaint(text.strip().upper(), db)
            if data:
                await show_complaint_status(from_num, lang, data)
                return

        # Classify intent
        classification = await classify_intent(text)
        intent = classification.get("intent", "greeting")
        detected_lang = classification.get("language", lang)

        if intent == "complaint":
            await set_state(
                from_num,
                {
                    "lang": detected_lang,
                    "step": "filing_location",
                    "complaint": text,
                    "msg_id": msg_id,
                },
            )
            await show_ask_location(from_num, detected_lang)
            return
        elif intent == "status_check":
            await set_state(from_num, {"lang": lang, "step": "tracking"})
            await show_track_ask(from_num, lang)
            return

    # Default: show main menu
    await show_main_menu(from_num, lang)
