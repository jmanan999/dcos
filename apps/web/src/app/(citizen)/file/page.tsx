"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import {
  MessageSquare,
  MapPin,
  UserRound,
  Check,
  ArrowRight,
  ArrowLeft,
  Camera,
  Locate,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Alert,
  cn,
  useToast,
} from "@dcos/ui";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import VoiceRecorder from "@/components/intake/voice-recorder";

const LANGUAGES = [
  { code: "hi", label: "हिंदी" },
  { code: "en", label: "English" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "اردو" },
];

// Steps are translated inline where used

interface CitizenRight {
  category: string;
  sla_days: number;
  legal_basis: string;
  department: string;
  escalation_after_days: number;
  penalty_info: string;
}

interface Result {
  tracking_id: string;
  is_emergency: boolean;
  emergency_guidance?: string | null;
  message: string;
  citizen_right?: CitizenRight | null;
  cluster_size?: number;
}

export default function FilePage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const STEPS = [
    { icon: MessageSquare, label: t("file.step_describe") },
    { icon: MapPin, label: t("file.step_location") },
    { icon: UserRound, label: t("file.step_review") },
  ];

  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("hi");
  const [phone, setPhone] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [dpdpConsent, setDpdpConsent] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const geolocate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        toast({ variant: "success", title: t("file.location_label") });
      },
      () => toast({ variant: "warning", title: t("file.location_denied") })
    );
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const data = await apiFetch<Result>("/intake/grievances", {
        method: "POST",
        body: JSON.stringify({
          raw_text: text,
          channel: "web",
          language,
          citizen_phone: anonymous ? undefined : phone || undefined,
          latitude: lat ?? undefined,
          longitude: lng ?? undefined,
          idempotency_key: uuidv4(),
        }),
      });
      // Remember on this device for /my-complaints
      try {
        const key = "dcos_my_complaints";
        const prev: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
        localStorage.setItem(key, JSON.stringify([data.tracking_id, ...prev].slice(0, 50)));
      } catch {
        /* ignore */
      }
      setResult(data);
    } catch (e) {
      toast({ variant: "error", title: t("file.error_filing"), description: String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    const right = result.citizen_right;
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {result.is_emergency && (
          <Alert variant="error" title={t("file.emergency_title")} icon={<AlertTriangle className="h-4 w-4" />}>
            Police 100 · Fire 101 · Ambulance 102. {result.emergency_guidance}
          </Alert>
        )}
        <Card>
          <CardContent className="space-y-5 py-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center bg-success/10 border-2 border-success/30 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl font-black text-foreground font-grotesk">{t("file.success_title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
            </div>
            <div className="mx-auto flex items-center gap-2 border border-border bg-muted/40 px-4 py-2.5">
              <span className="font-mono text-sm font-bold text-accent">{result.tracking_id}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.tracking_id);
                  toast({ variant: "success", title: t("file.copied") });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-center gap-3">
              <Link href={`/track/${result.tracking_id}`}>
                <Button>{t("file.track_btn")} <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null); setStep(0); setText("");
                  setPhone(""); setLat(null); setLng(null); setFiles([]);
                  setDpdpConsent(false);
                }}
              >
                {t("file.file_another")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Cluster Alert — you're not alone ── */}
        {result.cluster_size != null && result.cluster_size >= 4 && (
          <div className="border border-warning/40 bg-warning/5 p-3 flex items-start gap-2.5">
            <div className="h-2 w-2 bg-warning mt-1.5 shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                You are 1 of {result.cluster_size + 1} citizens reporting this issue
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This cluster has been automatically escalated as a priority case to the department.
              </p>
            </div>
          </div>
        )}

        {/* ── Citizen Rights Card — what the law guarantees you ── */}
        {right && (
          <div className="border border-accent/30 bg-accent/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-accent" />
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                आपके कानूनी अधिकार · Your Legal Rights
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border bg-card p-3">
                <p className="text-2xs text-muted-foreground uppercase tracking-wide">SLA Deadline</p>
                <p className="text-2xl font-black text-primary mt-0.5">{right.sla_days}d</p>
                <p className="text-xs text-muted-foreground">{right.department} must resolve</p>
              </div>
              <div className="border border-border bg-card p-3">
                <p className="text-2xs text-muted-foreground uppercase tracking-wide">Can Escalate After</p>
                <p className="text-2xl font-black text-warning mt-0.5">Day {right.escalation_after_days}</p>
                <p className="text-xs text-muted-foreground">First Appellate Authority</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-l-2 border-accent/30 pl-2">
              {right.legal_basis}
            </p>
            <p className="text-xs text-muted-foreground">{right.penalty_info}</p>
          </div>
        )}
      </div>
    );
  }

  const canNext =
    step === 0 ? text.trim().length >= 10 :
    step === 2 ? dpdpConsent :
    true;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground font-grotesk">{t("file.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("file.subtitle")}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center border-2 transition-colors",
                    done && "border-foreground bg-foreground text-background",
                    active && "border-accent bg-accent/10 text-accent",
                    !done && !active && "border-border bg-card text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={cn("text-2xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("mx-2 h-0.5 flex-1", done ? "bg-foreground" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-5 py-6">
          {/* Step 1 — Describe */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <Label>{t("file.lang_select")}</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={cn(
                        "min-h-[44px] rounded px-4 py-2 text-sm font-medium transition-colors",
                        language === l.code
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <VoiceRecorder onTranscription={(t) => setText(t)} language={language} />
              <div className="space-y-2">
                <Label htmlFor="desc" required>{t("file.desc_label")}</Label>
                <Textarea
                  id="desc" rows={6} value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={5000} placeholder={t("file.desc_placeholder")}
                />
                <p className="text-right text-2xs text-muted-foreground">{text.length} / 5000</p>
              </div>
            </div>
          )}

          {/* Step 2 — Location & media */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <Label>{t("file.location_label")}</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={geolocate}>
                    <Locate className="h-4 w-4" /> {t("file.use_location")}
                  </Button>
                  {lat && lng && (
                    <span className="font-mono text-xs text-success">
                      {lat.toFixed(4)}, {lng.toFixed(4)} ✓
                    </span>
                  )}
                </div>
                <div className="flex h-40 items-center justify-center rounded-none border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  {lat && lng ? `📍 ${t("file.location_pinned")}` : t("file.map_placeholder")}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("file.photo_label")}</Label>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Camera className="h-5 w-5" /> {t("file.photo_tap")}
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*"
                  className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                {files.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("file.files_selected").replace("{n}", String(files.length))}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Review & contact */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-none border border-border bg-muted/30 p-4">
                <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{t("file.your_complaint")}</p>
                <p className="mt-1.5 text-sm text-foreground line-clamp-4">{text}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-2xs text-muted-foreground">
                  <span className="rounded bg-muted px-2 py-0.5 text-foreground">
                    {LANGUAGES.find((l) => l.code === language)?.label}
                  </span>
                  {lat && lng && <span className="rounded bg-muted px-2 py-0.5 text-foreground">📍 Located</span>}
                  {files.length > 0 && <span className="rounded bg-muted px-2 py-0.5 text-foreground">{files.length} file(s)</span>}
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
                <span className="text-foreground">{t("file.anonymous")}</span>
              </label>

              {!anonymous && (
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("file.phone_label")}</Label>
                  <Input id="phone" type="tel" inputMode="numeric"
                    placeholder={t("file.phone_placeholder")}
                    value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <p className="text-2xs text-muted-foreground">{t("file.phone_hint")}</p>
                </div>
              )}

              {/* DPDP Act 2023 consent — legal requirement */}
              <div className="border border-border bg-muted/20 p-3 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dpdpConsent}
                    onChange={(e) => setDpdpConsent(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-ring shrink-0"
                    required
                  />
                  <span className="text-xs text-foreground leading-relaxed">
                    I consent to sharing my phone number and location with the relevant government
                    department solely for complaint resolution. Data is handled under the{" "}
                    <Link href="/privacy" className="text-primary underline">
                      Digital Personal Data Protection Act 2023
                    </Link>.
                  </span>
                </label>
                <p className="text-2xs text-muted-foreground pl-6">
                  Your data is deleted after 1 year of case closure. You can request deletion anytime.
                </p>
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4" /> {t("file.back")}
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                {t("file.continue")} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} loading={submitting}>
                {submitting ? t("file.submitting") : t("file.submit")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
