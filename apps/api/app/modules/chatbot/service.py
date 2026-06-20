from __future__ import annotations

import uuid
from difflib import SequenceMatcher

import httpx
import structlog

from app.core.config import settings
from app.modules.chatbot.schemas import ChatRequest, ChatResponse, FAQMatch

log = structlog.get_logger()

# ── Hardcoded FAQs ───────────────────────────────────────────────────────────

FAQ = [
    {
        "id": "file-complaint",
        "question_en": "How do I file a complaint?",
        "question_hi": "शिकायत कैसे दर्ज करें?",
        "answer_en": (
            "To file a complaint, go to the 'File a Complaint' page at /file. "
            "Describe your issue in text (Hindi, English, Punjabi, or Urdu), "
            "attach a photo or video if available, and pin your location on the map. "
            "No login is required — you can file anonymously. You will receive a tracking ID "
            "to follow up on WhatsApp or the web."
        ),
        "answer_hi": (
            "शिकायत दर्ज करने के लिए /file पेज पर जाएं। अपनी समस्या का विवरण "
            "हिंदी, अंग्रेजी, पंजाबी या उर्दू में लिखें, फोटो या वीडियो संलग्न करें, "
            "और मानचित्र पर अपना स्थान चुनें। लॉगिन आवश्यक नहीं है — आप गुमनाम रूप से "
            "शिकायत दर्ज कर सकते हैं। आपको एक ट्रैकिंग आईडी मिलेगी जिससे आप "
            "व्हाट्सएप या वेब पर स्थिति देख सकते हैं।"
        ),
        "navigation_action": "/file",
        "keywords_en": ["file complaint", "register complaint", "new complaint", "lodge complaint", "how to complain"],
        "keywords_hi": ["शिकायत दर्ज", "नई शिकायत", "शिकायत कैसे करें", "शिकायत दर्ज करें"],
    },
    {
        "id": "track-complaint",
        "question_en": "How do I track my complaint?",
        "question_hi": "शिकायत को ट्रैक कैसे करें?",
        "answer_en": (
            "Use your tracking ID on the Track page at /track. "
            "Enter the 8-character alphanumeric ID you received after filing. "
            "You can also get updates via WhatsApp by sending your tracking ID to our number."
        ),
        "answer_hi": (
            "अपनी ट्रैकिंग आईडी का उपयोग /track पेज पर करें। "
            "शिकायत दर्ज करने के बाद आपको मिली 8 अंकों की आईडी दर्ज करें। "
            "आप अपनी ट्रैकिंग आईडी व्हाट्सएप पर भेजकर भी अपडेट प्राप्त कर सकते हैं।"
        ),
        "navigation_action": "/track",
        "keywords_en": ["track complaint", "check status", "tracking id", "follow up", "complaint status"],
        "keywords_hi": ["शिकायत ट्रैक", "स्थिति जांच", "ट्रैकिंग आईडी", "शिकायत की स्थिति"],
    },
    {
        "id": "departments",
        "question_en": "What departments handle what?",
        "question_hi": "कौन सा विभाग क्या संभालता है?",
        "answer_en": (
            "Potholes, garbage, stray animals → MCD\n"
            "Water supply, sewage → DJB\n"
            "Road repair, streetlights, flyovers → PWD\n"
            "Vehicle theft, noise, traffic signals → Delhi Police (DP)\n"
            "Buses → DTC\n"
            "Power outages → BSES / TPDDL\n"
            "Air pollution → DPCC\n"
            "Metro safety → DMRC\n"
            "Medicine availability → HEALTH\n"
            "NDMC areas → NDMC\n\n"
            "See full list at /departments."
        ),
        "answer_hi": (
            "गड्ढे, कचरा, आवारा जानवर → MCD\n"
            "पानी की आपूर्ति, सीवेज → DJB\n"
            "सड़क मरम्मत, स्ट्रीटलाइट, फ्लाईओवर → PWD\n"
            "वाहन चोरी, शोर, ट्रैफिक सिग्नल → दिल्ली पुलिस (DP)\n"
            "बसें → DTC\n"
            "बिजली कटौती → BSES / TPDDL\n"
            "वायु प्रदूषण → DPCC\n"
            "मेट्रो सुरक्षा → DMRC\n"
            "दवा उपलब्धता → HEALTH\n"
            "NDMC क्षेत्र → NDMC\n\n"
            "पूरी सूची /departments पर देखें।"
        ),
        "navigation_action": "/departments",
        "keywords_en": ["departments", "which department", "who handles", "responsibilities", "department list"],
        "keywords_hi": ["विभाग", "कौन सा विभाग", "क्या संभालता है", "विभागों की सूची"],
    },
    {
        "id": "contact-support",
        "question_en": "How to contact support?",
        "question_hi": "सहायता से कैसे संपर्क करें?",
        "answer_en": (
            "For urgent help, dial 112 (emergency) or 1076 (CM Helpline). "
            "For complaint-related queries, use the /track page with your tracking ID. "
            "WhatsApp updates are sent to your registered number automatically."
        ),
        "answer_hi": (
            "आपातकालीन सहायता के लिए 112 डायल करें। "
            "शिकायत से संबंधित प्रश्नों के लिए अपनी ट्रैकिंग आईडी से /track पेज का उपयोग करें। "
            "व्हाट्सएप अपडेट स्वचालित रूप से आपके पंजीकृत नंबर पर भेजे जाते हैं।"
        ),
        "navigation_action": None,
        "keywords_en": ["contact", "support", "helpline", "help", "phone", "call"],
        "keywords_hi": ["संपर्क", "सहायता", "हेल्पलाइन", "मदद", "फोन", "कॉल"],
    },
    {
        "id": "what-is-dcos",
        "question_en": "What is DCOS?",
        "question_hi": "DCOS क्या है?",
        "answer_en": (
            "DCOS (Delhi Citizen Operating System) is a grievance and governance "
            "command center for Delhi NCT. Citizens can file complaints about "
            "civic issues, AI routes them to the right officer, and the CM can "
            "monitor everything in real-time. It handles potholes, water, "
            "electricity, garbage, and more across all 12 departments."
        ),
        "answer_hi": (
            "DCOS (दिल्ली सिटिज़न ऑपरेटिंग सिस्टम) दिल्ली के लिए एक शिकायत और "
            "शासन कमांड सेंटर है। नागरिक नागरिक मुद्दों की शिकायत दर्ज कर सकते हैं, "
            "AI उन्हें सही अधिकारी तक पहुंचाता है, और CM वास्तविक समय में सब कुछ "
            "देख सकते हैं। यह 12 विभागों में गड्ढे, पानी, बिजली, कचरा आदि संभालता है।"
        ),
        "navigation_action": None,
        "keywords_en": ["what is dcos", "dcos", "about dcos", "what is this"],
        "keywords_hi": ["dcos क्या है", "डीसीओएस", "डीसीओएस क्या है"],
    },
    {
        "id": "officer-dashboard",
        "question_en": "How to use the officer dashboard?",
        "question_hi": "अधिकारी डैशबोर्ड का उपयोग कैसे करें?",
        "answer_en": (
            "After logging in, go to /officer. Your queue shows SLA-sorted complaints. "
            "Click 'Claim' to take ownership, upload before/after proof photos, "
            "and mark as resolved. You can add internal notes, request more info, "
            "or hand off to another department."
        ),
        "answer_hi": (
            "लॉगिन करने के बाद /officer पर जाएं। आपकी कतार SLA-क्रमबद्ध शिकायतें दिखाती है। "
            "'Claim' पर क्लिक करके जिम्मेदारी लें, पहले/बाद के प्रूफ फोटो अपलोड करें, "
            "और हल होने पर चिह्नित करें। आप आंतरिक नोट्स जोड़ सकते हैं, अधिक जानकारी "
            "मांग सकते हैं, या दूसरे विभाग को स्थानांतरित कर सकते हैं।"
        ),
        "navigation_action": "/officer",
        "keywords_en": ["officer dashboard", "officer console", "claim complaint", "resolve complaint", "officer guide"],
        "keywords_hi": ["अधिकारी डैशबोर्ड", "शिकायत लें", "शिकायत हल करें", "अधिकारी गाइड"],
    },
    {
        "id": "cm-analytics",
        "question_en": "How to view analytics as CM?",
        "question_hi": "CM के रूप में एनालिटिक्स कैसे देखें?",
        "answer_en": (
            "Log in as CM and visit /cm. You'll see live KPI tiles, "
            "a department leaderboard, ward-level GIS heatmap, "
            "14-day trend charts, and an AI copilot for natural language queries. "
            "Use /cm/analytics for detailed scorecards and CSV exports. "
            "The executive brief at /cm gives you an auto-generated morning report."
        ),
        "answer_hi": (
            "CM के रूप में लॉगिन करें और /cm पर जाएं। आप लाइव KPI टाइल्स, "
            "विभाग लीडरबोर्ड, वार्ड-स्तरीय GIS हीटमैप, 14-दिन का रुझान चार्ट, "
            "और प्राकृतिक भाषा क्वेरी के लिए AI सहायक देखेंगे। "
            "विस्तृत स्कोरकार्ड और CSV एक्सपोर्ट के लिए /cm/analytics का उपयोग करें।"
        ),
        "navigation_action": "/cm",
        "keywords_en": ["cm dashboard", "cm analytics", "executive brief", "cm view", "command center"],
        "keywords_hi": ["सीएम डैशबोर्ड", "सीएम एनालिटिक्स", "कमांड सेंटर", "सीएम व्यू"],
    },
]


class ChatbotService:
    def __init__(self) -> None:
        pass

    async def answer(self, request: ChatRequest) -> ChatResponse:
        msg = request.message.strip().lower()
        lang = request.language

        faq_match = self._match_faq(msg, lang)

        if faq_match and faq_match.matched:
            reply = faq_match.answer_hi if lang == "hi" else faq_match.answer_en
            return ChatResponse(
                reply=reply or "",
                language=lang,
                is_faq=True,
                faq=faq_match,
                suggested_actions=[faq_match.navigation_action] if faq_match.navigation_action else [],
                conversation_id=request.conversation_id or str(uuid.uuid4()),
            )

        reply = await self._llm_answer(request.message, lang)

        return ChatResponse(
            reply=reply,
            language=lang,
            is_faq=False,
            conversation_id=request.conversation_id or str(uuid.uuid4()),
        )

    def _match_faq(self, message: str, language: str) -> FAQMatch:
        best_score = 0.0
        best_faq = None

        for faq in FAQ:
            keywords = faq["keywords_hi"] if language == "hi" else faq["keywords_en"]
            for kw in keywords:
                score = SequenceMatcher(None, message, kw.lower()).ratio()
                if score > best_score:
                    best_score = score
                    best_faq = faq

                if kw in message:
                    best_score = max(best_score, 0.8)
                    best_faq = faq

        if best_score >= 0.6 and best_faq:
            return FAQMatch(
                matched=True,
                question_en=best_faq["question_en"],
                question_hi=best_faq["question_hi"],
                answer_en=best_faq["answer_en"],
                answer_hi=best_faq["answer_hi"],
                navigation_action=best_faq.get("navigation_action"),
            )

        return FAQMatch(matched=False)

    async def _llm_answer(self, message: str, language: str) -> str:
        if not self._has_ai_key():
            fallback_en = "I'm a DCOS assistant. Please try asking about how to file a complaint, track one, or navigate the dashboard."
            fallback_hi = "मैं DCOS सहायक हूं। कृपया शिकायत दर्ज करने, ट्रैक करने या डैशबोर्ड का उपयोग करने के बारे में पूछें।"
            return fallback_hi if language == "hi" else fallback_en

        system_prompt = (
            "You are a helpful civic assistant for DCOS (Delhi Citizen Operating System). "
            "Answer concisely in the user's language. "
            "You can help with: filing complaints, tracking complaints, department info, "
            "navigating the website, understanding grievance statuses, and general Delhi civic info. "
            "Keep answers under 3-4 sentences. Be friendly and practical."
        )

        prompt = f"Language: {language}\nUser: {message[:1500]}"

        try:
            if settings.AI_PROVIDER == "groq":
                return await self._openai_compat(
                    prompt, system_prompt,
                    base_url=settings.GROQ_BASE_URL,
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL,
                )
            if settings.AI_PROVIDER == "openrouter":
                return await self._openai_compat(
                    prompt, system_prompt,
                    base_url=settings.OPENROUTER_BASE_URL,
                    api_key=settings.OPENROUTER_API_KEY,
                    model=settings.OPENROUTER_MODEL,
                )
            return await self._gemini_answer(prompt, system_prompt)
        except Exception as exc:
            log.error("chatbot.llm_failed", error=str(exc))
            return "I'm sorry, I'm having trouble connecting. Please try again later." if language == "en" else "क्षमा करें, कनेक्शन में समस्या है। कृपया बाद में पुनः प्रयास करें।"

    def _has_ai_key(self) -> bool:
        if settings.AI_PROVIDER == "groq":
            return bool(settings.GROQ_API_KEY)
        if settings.AI_PROVIDER == "openrouter":
            return bool(settings.OPENROUTER_API_KEY)
        return bool(settings.GEMINI_API_KEY)

    async def _openai_compat(
        self, prompt: str, system_prompt: str, *, base_url: str, api_key: str, model: str
    ) -> str:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 300,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
        body = resp.json()
        if resp.status_code != 200:
            raise RuntimeError(f"LLM HTTP {resp.status_code}: {body}")
        choices = body.get("choices")
        if not choices:
            raise RuntimeError(f"LLM returned no choices: {body}")
        return choices[0]["message"]["content"]

    async def _gemini_answer(self, prompt: str, system_prompt: str) -> str:
        import asyncio

        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            settings.GEMINI_MODEL_DEFAULT,
            system_instruction=system_prompt,
        )

        def _call() -> str:
            resp = model.generate_content(prompt)
            return resp.text

        return await asyncio.get_event_loop().run_in_executor(None, _call)
