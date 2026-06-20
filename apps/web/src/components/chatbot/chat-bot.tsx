"use client";

import { useCallback, useRef, useState } from "react";
import { MessageCircle, X, Send, ArrowRight } from "lucide-react";
import { Button } from "@dcos/ui";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

/* ── FAQ data (mirrors the API FAQs for instant client-side matching) ──── */

interface FAQ {
  question_en: string;
  question_hi: string;
  answer_en: string;
  answer_hi: string;
  navigation_action: string | null;
  keywords_en: string[];
  keywords_hi: string[];
}

const FAQS: FAQ[] = [
  {
    question_en: "How do I file a complaint?",
    question_hi: "शिकायत कैसे दर्ज करें?",
    answer_en:
      "To file a complaint, go to the 'File a Complaint' page at /file. Describe your issue in text (Hindi, English, Punjabi, or Urdu), attach a photo or video if available, and pin your location on the map. No login is required. You will receive a tracking ID to follow up on WhatsApp or the web.",
    answer_hi:
      "शिकायत दर्ज करने के लिए /file पेज पर जाएं। अपनी समस्या का विवरण हिंदी, अंग्रेजी, पंजाबी या उर्दू में लिखें, फोटो या वीडियो संलग्न करें, और मानचित्र पर अपना स्थान चुनें। लॉगिन आवश्यक नहीं है। आपको एक ट्रैकिंग आईडी मिलेगी।",
    navigation_action: "/file",
    keywords_en: ["file complaint", "register complaint", "new complaint", "lodge complaint", "how to complain"],
    keywords_hi: ["शिकायत दर्ज", "नई शिकायत", "शिकायत कैसे करें", "शिकायत दर्ज करें"],
  },
  {
    question_en: "How do I track my complaint?",
    question_hi: "शिकायत को ट्रैक कैसे करें?",
    answer_en:
      "Use your tracking ID on the Track page at /track. Enter the 8-character alphanumeric ID you received after filing. You can also get updates via WhatsApp by sending your tracking ID.",
    answer_hi:
      "अपनी ट्रैकिंग आईडी का उपयोग /track पेज पर करें। शिकायत दर्ज करने के बाद आपको मिली 8 अंकों की आईडी दर्ज करें। आप अपनी ट्रैकिंग आईडी व्हाट्सएप पर भेजकर भी अपडेट प्राप्त कर सकते हैं।",
    navigation_action: "/track",
    keywords_en: ["track complaint", "check status", "tracking id", "follow up", "complaint status"],
    keywords_hi: ["शिकायत ट्रैक", "स्थिति जांच", "ट्रैकिंग आईडी", "शिकायत की स्थिति"],
  },
  {
    question_en: "What departments handle what?",
    question_hi: "कौन सा विभाग क्या संभालता है?",
    answer_en:
      "Potholes, garbage, stray animals → MCD. Water supply, sewage → DJB. Road repair, streetlights, flyovers → PWD. Vehicle theft, noise, traffic signals → Delhi Police (DP). Buses → DTC. Power outages → BSES / TPDDL. Air pollution → DPCC. Metro safety → DMRC. Medicine → HEALTH. See full list at /departments.",
    answer_hi:
      "गड्ढे, कचरा, आवारा जानवर → MCD. पानी की आपूर्ति, सीवेज → DJB. सड़क मरम्मत, स्ट्रीटलाइट, फ्लाईओवर → PWD. वाहन चोरी, शोर, ट्रैफिक सिग्नल → दिल्ली पुलिस (DP). बसें → DTC. बिजली कटौती → BSES / TPDDL. वायु प्रदूषण → DPCC. मेट्रो सुरक्षा → DMRC. दवा → HEALTH. पूरी सूची /departments पर देखें।",
    navigation_action: "/departments",
    keywords_en: ["departments", "which department", "who handles", "responsibilities", "department list"],
    keywords_hi: ["विभाग", "कौन सा विभाग", "क्या संभालता है", "विभागों की सूची"],
  },
  {
    question_en: "How to contact support?",
    question_hi: "सहायता से कैसे संपर्क करें?",
    answer_en:
      "For urgent help, dial 112 (emergency) or 1076 (CM Helpline). For complaint-related queries, use the /track page with your tracking ID. WhatsApp updates are sent to your registered number automatically.",
    answer_hi:
      "आपातकालीन सहायता के लिए 112 डायल करें। शिकायत से संबंधित प्रश्नों के लिए अपनी ट्रैकिंग आईडी से /track पेज का उपयोग करें। व्हाट्सएप अपडेट स्वचालित रूप से भेजे जाते हैं।",
    navigation_action: null,
    keywords_en: ["contact", "support", "helpline", "help", "phone", "call"],
    keywords_hi: ["संपर्क", "सहायता", "हेल्पलाइन", "मदद", "फोन", "कॉल"],
  },
  {
    question_en: "What is DCOS?",
    question_hi: "DCOS क्या है?",
    answer_en:
      "DCOS (Delhi Citizen Operating System) is a grievance and governance command center for Delhi NCT. Citizens file complaints about civic issues, AI routes them to the right officer, and the CM monitors everything in real-time across 12 departments.",
    answer_hi:
      "DCOS (दिल्ली सिटिज़न ऑपरेटिंग सिस्टम) दिल्ली के लिए एक शिकायत और शासन कमांड सेंटर है। नागरिक शिकायत दर्ज करते हैं, AI सही अधिकारी तक पहुंचाता है, और CM 12 विभागों में रियल-टाइम में सब कुछ देख सकते हैं।",
    navigation_action: null,
    keywords_en: ["what is dcos", "dcos", "about dcos", "what is this"],
    keywords_hi: ["dcos क्या है", "डीसीओएस", "डीसीओएस क्या है"],
  },
  {
    question_en: "How to use the officer dashboard?",
    question_hi: "अधिकारी डैशबोर्ड का उपयोग कैसे करें?",
    answer_en:
      "After logging in, go to /officer. Your queue shows SLA-sorted complaints. Click 'Claim' to take ownership, upload before/after proof photos, and mark as resolved. You can add notes, request more info, or hand off to another department.",
    answer_hi:
      "लॉगिन करने के बाद /officer पर जाएं। आपकी कतार SLA-क्रमबद्ध शिकायतें दिखाती है। 'Claim' पर क्लिक करें, पहले/बाद के प्रूफ फोटो अपलोड करें, और हल होने पर चिह्नित करें। नोट्स जोड़ सकते हैं या दूसरे विभाग को स्थानांतरित कर सकते हैं।",
    navigation_action: "/officer",
    keywords_en: ["officer dashboard", "officer console", "claim complaint", "resolve complaint", "officer guide"],
    keywords_hi: ["अधिकारी डैशबोर्ड", "शिकायत लें", "शिकायत हल करें", "अधिकारी गाइड"],
  },
  {
    question_en: "How to view analytics as CM?",
    question_hi: "CM के रूप में एनालिटिक्स कैसे देखें?",
    answer_en:
      "Log in as CM and visit /cm. You'll see live KPI tiles, a department leaderboard, ward-level GIS heatmap, 14-day trend charts, and an AI copilot. Use /cm/analytics for detailed scorecards and CSV exports.",
    answer_hi:
      "CM के रूप में लॉगिन करें और /cm पर जाएं। लाइव KPI टाइल्स, विभाग लीडरबोर्ड, वार्ड-स्तरीय GIS हीटमैप, 14-दिन का रुझान चार्ट, और AI सहायक देखें। विस्तृत स्कोरकार्ड के लिए /cm/analytics का उपयोग करें।",
    navigation_action: "/cm",
    keywords_en: ["cm dashboard", "cm analytics", "executive brief", "cm view", "command center"],
    keywords_hi: ["सीएम डैशबोर्ड", "सीएम एनालिटिक्स", "कमांड सेंटर", "सीएम व्यू"],
  },
];

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Message {
  role: "user" | "bot";
  text: string;
  navigation_action: string | null;
  is_faq: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

/** Check if `text` contains any keyword (English or Hindi). Returns first FAQ match. */
function matchFaq(text: string): Message | null {
  const lower = text.toLowerCase();

  for (const faq of FAQS) {
    const allKeywords = [...faq.keywords_en, ...faq.keywords_hi];
    for (const kw of allKeywords) {
      if (lower.includes(kw)) {
        /* Pick answer language based on which keyword set matched */
        const isHindi = faq.keywords_hi.includes(kw);
        return {
          role: "bot",
          text: isHindi ? faq.answer_hi : faq.answer_en,
          navigation_action: faq.navigation_action,
          is_faq: true,
        };
      }
    }
  }
  return null;
}

/* ── Quick actions ──────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label_en: "📋 File a Complaint", label_hi: "📋 शिकायत दर्ज करें", en: "file complaint", hi: "शिकायत दर्ज" },
  { label_en: "🔍 Track Complaint", label_hi: "🔍 शिकायत ट्रैक करें", en: "track complaint", hi: "शिकायत ट्रैक" },
  { label_en: "🏛️ Departments List", label_hi: "🏛️ विभागों की सूची", en: "departments", hi: "विभाग" },
  { label_en: "📞 Contact Support", label_hi: "📞 सहायता से संपर्क", en: "contact support", hi: "संपर्क" },
];

const WELCOME_EN = "Hi! 👋 I'm the DCOS assistant. Ask me how to file or track a complaint, or pick a quick option below.";
const WELCOME_HI = "नमस्ते! 👋 मैं DCOS सहायक हूं। शिकायत दर्ज करने या ट्रैक करने के बारे में पूछें, या नीचे कोई विकल्प चुनें।";

/* ── API response type ──────────────────────────────────────────────────── */

interface ApiChatResponse {
  reply: string;
  language: string;
  is_faq: boolean;
  faq: { navigation_action: string | null } | null;
  conversation_id: string | null;
  suggested_actions: string[];
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: lang === "hi" ? WELCOME_HI : WELCOME_EN, navigation_action: null, is_faq: false },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed, navigation_action: null, is_faq: false }]);
      setInput("");
      setLoading(true);

      /* Try client-side FAQ match first — instant, no API needed */
      const faqHit = matchFaq(trimmed);
      if (faqHit) {
        setMessages((prev) => [...prev, faqHit]);
        setLoading(false);
        scrollToBottom();
        return;
      }

      /* No FAQ match → call API for AI-powered answer */
      try {
        const res = await apiFetch<ApiChatResponse>("/chatbot/ask", {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            language: lang,
            conversation_id: conversationId ?? undefined,
          }),
        });

        setConversationId(res.conversation_id ?? null);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: res.reply,
            navigation_action: res.faq?.navigation_action ?? null,
            is_faq: res.is_faq,
          },
        ]);
      } catch (err) {
        console.error("Chatbot API call failed:", err);
        const fallback =
          lang === "hi"
            ? "क्षमा करें, मैं अभी AI से कनेक्ट नहीं कर पा रहा। कृपया बाद में पुनः प्रयास करें या ऊपर दिए गए त्वरित विकल्पों का उपयोग करें।"
            : "Sorry, I can't connect to the AI right now. Please try again later or use the quick options above.";
        setMessages((prev) => [...prev, { role: "bot", text: fallback, navigation_action: null, is_faq: false }]);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [lang, loading, conversationId, scrollToBottom],
  );

  const quickAction = (a: (typeof QUICK_ACTIONS)[number]) => {
    sendMessage(lang === "hi" ? a.hi : a.en);
  };

  const toggleLang = () => {
    const next = lang === "hi" ? "en" : "hi";
    setLang(next);
    if (messages.length === 1) {
      setMessages([{ role: "bot", text: next === "hi" ? WELCOME_HI : WELCOME_EN, navigation_action: null, is_faq: false }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ── Floating button ──────────────────────────────────────────────────── */

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-primary-glow transition-transform hover:scale-105 active:scale-95"
        aria-label="Open chat"
      >
        <MessageCircle className="size-6" />
      </button>
    );
  }

  /* ── Chat panel ───────────────────────────────────────────────────────── */

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[380px] flex-col rounded-2xl border border-border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5" />
          <span className="text-sm font-semibold">DCOS Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLang}
            className="rounded-md px-2 py-0.5 text-xs font-medium uppercase hover:bg-primary-foreground/10"
          >
            {lang === "hi" ? "EN" : "हि"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 hover:bg-primary-foreground/10"
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ maxHeight: 420 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.text}
              {msg.role === "bot" && msg.navigation_action && (
                <Link
                  href={msg.navigation_action}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => setOpen(false)}
                >
                  {lang === "hi" ? "यहां जाएं →" : "Go there →"}
                </Link>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions (before first user message) */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3">
          {QUICK_ACTIONS.map((a, i) => (
            <button
              key={i}
              onClick={() => quickAction(a)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {lang === "hi" ? a.label_hi : a.label_en}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === "hi" ? "अपना संदेश लिखें..." : "Type your message..."}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
