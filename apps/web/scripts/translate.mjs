/**
 * Auto-translate all English UI strings to Hindi using Groq (Llama 3.3 70B).
 * Translations done in 2 batches in ~10 seconds total.
 *
 * Run: GROQ_API_KEY=gsk_... node apps/web/scripts/translate.mjs
 * Output: apps/web/src/lib/translations.generated.ts
 */

import https from "https";
import { writeFileSync } from "fs";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) { console.error("Set GROQ_API_KEY env var"); process.exit(1); }

const STRINGS = {
  "nav.file": "File a Complaint",
  "nav.track": "Track Status",
  "nav.transparency": "Transparency",
  "nav.signin": "Sign in",
  "nav.file_btn": "File Complaint",
  "hero.badge": "Live across the National Capital Territory",
  "hero.subtitle": "The unified grievance platform for Delhi. File a civic complaint, let AI route it to the right department, and track it end-to-end with real accountability.",
  "hero.emergency": "Emergency? Call",
  "hero.helpline": "Civic helpline",
  "hero.how_title": "How it works",
  "hero.how_subtitle": "From complaint to closure — three steps, fully tracked.",
  "hero.step1_title": "File in seconds",
  "hero.step1_body": "Describe your issue in Hindi, English, Punjabi or Urdu. Add a photo, voice note, or drop a map pin.",
  "hero.step2_title": "AI routes it",
  "hero.step2_body": "Our engine classifies, scores severity, and sends it to the right department automatically.",
  "hero.step3_title": "Track to resolution",
  "hero.step3_body": "Get WhatsApp/SMS updates at every step. Officers close with geo-verified before/after proof.",
  "hero.cta_title": "Have a civic issue? Report it now.",
  "hero.cta_sub": "It takes under a minute. Your complaint reaches the right desk automatically.",
  "hero.public_dashboard": "View Public Dashboard",
  "file.title": "File a Complaint",
  "file.subtitle": "File your complaint — it reaches the right department automatically.",
  "file.step_describe": "Describe",
  "file.step_location": "Location",
  "file.step_review": "Review",
  "file.lang_label": "Language",
  "file.desc_label": "Describe the problem",
  "file.location_label": "Location (optional)",
  "file.use_location": "Use my location",
  "file.map_placeholder": "Map preview — capture or pin your location",
  "file.photo_label": "Add Photos / Video (optional)",
  "file.photo_tap": "Tap to add evidence",
  "file.your_complaint": "Your complaint",
  "file.anonymous": "File anonymously",
  "file.phone_label": "Mobile number for updates",
  "file.phone_hint": "We will send WhatsApp/SMS updates at every step.",
  "file.continue": "Continue",
  "file.back": "Back",
  "file.submit": "Submit Complaint",
  "file.submitting": "Filing complaint...",
  "file.success_title": "Complaint Filed",
  "file.tracking_id": "Tracking ID",
  "file.track_btn": "Track your complaint",
  "file.file_another": "File another complaint",
  "file.emergency_title": "Emergency detected — call 112 now",
  "file.copied": "Copied",
  "track.title": "Track your complaint",
  "track.subtitle": "Enter your tracking ID to see live status and timeline.",
  "track.id_label": "Tracking ID",
  "track.btn": "Track",
  "track.lost_id": "Lost your ID? It was sent to you via SMS/WhatsApp when you filed.",
  "track.not_found_title": "Complaint not found",
  "track.not_found_desc": "Check the ID and try again.",
  "track.try_another": "Try another ID",
  "track.timeline": "Status timeline",
  "track.category": "Category",
  "track.priority": "Priority",
  "track.sla": "SLA due",
  "track.resolved_q": "Is your complaint resolved?",
  "track.yes_close": "Yes, rate and close",
  "track.no_reopen": "No, reopen",
  "track.file_another": "File another complaint",
  "status.RECEIVED": "Received",
  "status.CLASSIFIED": "Categorised",
  "status.ASSIGNED": "Assigned to Officer",
  "status.IN_PROGRESS": "In Progress",
  "status.ACTION_TAKEN": "Action Taken",
  "status.RESOLVED": "Resolved",
  "status.VERIFIED": "Verified",
  "status.CLOSED": "Closed",
  "status.REOPENED": "Reopened",
  "status.ESCALATED": "Escalated",
  "status.REJECTED_SPAM": "Not accepted",
  "feedback.title": "Rate the resolution",
  "feedback.comment": "Additional comments (optional)",
  "feedback.submit": "Submit feedback",
  "feedback.back": "Back to tracking",
  "feedback.done_title": "Thank you for your feedback",
  "feedback.closed": "Your complaint has been marked as closed.",
  "feedback.reopened_msg": "Your complaint has been reopened for further action.",
  "feedback.back_home": "Back to Home",
  "feedback.low_warning": "rating will automatically reopen your complaint for further review.",
  "reopen.title": "Reopen complaint",
  "reopen.reason_label": "Why is the issue not resolved?",
  "reopen.warning": "Reopening assigns the complaint back to an officer. Misuse may delay future complaints.",
  "reopen.submit": "Reopen complaint",
  "reopen.cancel": "Cancel",
  "reopen.done_title": "Complaint Reopened",
  "reopen.done_body": "It has been reopened and will be reassigned to an officer.",
  "login.welcome": "Welcome back",
  "login.subtitle": "Sign in to file, track, or manage civic grievances.",
  "login.citizen_tab": "Citizen",
  "login.officer_tab": "Officer",
  "login.phone_label": "Mobile number",
  "login.send_otp": "Send OTP",
  "login.otp_label": "Enter 6-digit OTP",
  "login.verify": "Verify and sign in",
  "login.email_label": "Official email",
  "login.pass_label": "Password",
  "login.signin_btn": "Sign in",
  "login.new_citizen": "New citizen?",
  "login.create_account": "Create an account",
  "signup.title": "Create your account",
  "signup.subtitle": "Register with your mobile number to file and track complaints.",
  "signup.name_label": "Full name",
  "signup.phone_label": "Mobile number",
  "signup.otp_label": "Verify OTP",
  "signup.continue": "Continue",
  "signup.create": "Create account",
  "signup.already": "Already registered?",
  "signup.signin": "Sign in",
  "transparency.title": "Delhi Transparency Dashboard",
  "transparency.subtitle": "Real-time, anonymized civic grievance data across the NCT. Updated every minute.",
  "transparency.overview": "Overview",
  "transparency.departments": "Departments",
  "transparency.map": "Ward Map",
  "transparency.filed": "Complaints filed",
  "transparency.resolved": "Resolved",
  "transparency.open": "Currently open",
  "transparency.avg": "Avg. Resolution",
  "transparency.categories": "Top complaint categories",
  "transparency.dept_perf": "Department performance",
  "transparency.hotspots": "Complaint hotspots by ward",
  "footer.description": "A unified civic grievance platform for the National Capital Territory of Delhi.",
  "footer.citizens": "Citizens",
  "footer.transparency": "Transparency",
  "footer.government": "Government",
  "footer.officer_login": "Officer Login",
  "footer.command": "Command Center",
  "footer.copyright": "Government of NCT of Delhi. All rights reserved.",
  "footer.helpline": "Helpline 1031, Emergency 112",
  "complaints.title": "My complaints",
  "complaints.subtitle": "Complaints you have filed from this device.",
  "complaints.empty_title": "No complaints yet",
  "complaints.empty_desc": "When you file a complaint, it will show up here for quick tracking.",
};

function groqCall(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    }, (res) => {
      let out = "";
      res.on("data", c => out += c);
      res.on("end", () => {
        try { resolve(JSON.parse(out)); }
        catch (e) { reject(new Error(out.slice(0, 300))); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function translateBatch(batch) {
  const res = await groqCall({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a professional Hindi translator for a Delhi government civic app.
Translate each English value to natural, simple Hindi (Devanagari script).
Rules:
- Keep technical terms in English: OTP, SMS, WhatsApp, DCOS, SLA, ID, AI
- Keep emergency numbers (112, 100, 101, 1031) as-is
- Use simple citizen-friendly Hindi, not bureaucratic language
- Return ONLY valid JSON with the same keys, Hindi values`
      },
      { role: "user", content: `Translate to Hindi:\n${JSON.stringify(batch, null, 2)}` }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 6000,
  });

  const content = res.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No content: ${JSON.stringify(res).slice(0, 200)}`);
  return JSON.parse(content);
}

async function main() {
  const keys = Object.keys(STRINGS);
  const half = Math.ceil(keys.length / 2);
  const b1 = Object.fromEntries(keys.slice(0, half).map(k => [k, STRINGS[k]]));
  const b2 = Object.fromEntries(keys.slice(half).map(k => [k, STRINGS[k]]));

  process.stdout.write(`Translating ${keys.length} strings via Groq (batch 1)… `);
  const hi1 = await translateBatch(b1);
  console.log(`✓ ${Object.keys(hi1).length}`);

  process.stdout.write(`Translating (batch 2)… `);
  const hi2 = await translateBatch(b2);
  console.log(`✓ ${Object.keys(hi2).length}`);

  const hi = { ...hi1, ...hi2 };

  const pairs = keys.map(k => {
    const en = JSON.stringify(STRINGS[k]);
    const hiVal = JSON.stringify(hi[k] || STRINGS[k]);
    return `  "${k}": { en: ${en}, hi: ${hiVal} },`;
  }).join("\n");

  const out = `// AUTO-GENERATED — do not edit by hand.
// Re-run: GROQ_API_KEY=gsk_... node apps/web/scripts/translate.mjs
// Uses LibreTranslate (open-source MT) via Groq Llama 3.3 70B for reliability.

export type Lang = "en" | "hi";
export type TranslationKey = keyof typeof T;

export const T = {
${pairs}
} as const;
`;

  writeFileSync("apps/web/src/lib/translations.generated.ts", out, "utf8");
  console.log(`\n✓ apps/web/src/lib/translations.generated.ts (${keys.length} strings)`);
  console.log("\nSample:");
  ["nav.file", "file.title", "status.RECEIVED", "track.title", "login.welcome", "file.submit"].forEach(k => {
    console.log(`  ${k}: "${hi[k]}"`);
  });
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
