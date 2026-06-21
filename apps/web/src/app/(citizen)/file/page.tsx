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

interface Result {
  tracking_id: string;
  is_emergency: boolean;
  emergency_guidance?: string | null;
  message: string;
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
      () => toast({ variant: "warning", title: "Location denied", description: t("file.location_label") })
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
      toast({ variant: "error", title: "Could not file", description: String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {result.is_emergency && (
          <Alert variant="error" title={t("file.emergency_title")} icon={<AlertTriangle className="h-4 w-4" />}>
            Police 100 · Fire 101 · Ambulance 102. {result.emergency_guidance}
          </Alert>
        )}
        <Card>
          <CardContent className="space-y-5 py-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("file.success_title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
            </div>
            <div className="mx-auto flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
              <span className="font-mono text-sm font-bold text-primary">{result.tracking_id}</span>
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
                  setResult(null);
                  setStep(0);
                  setText("");
                  setPhone("");
                  setLat(null);
                  setLng(null);
                  setFiles([]);
                }}
              >
                {t("file.file_another")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canNext = step === 0 ? text.trim().length >= 10 : true;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("file.title")}</h1>
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
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary bg-primary/10 text-primary",
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
                <div className={cn("mx-2 h-0.5 flex-1 rounded-full", done ? "bg-primary" : "bg-border")} />
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
                <Label>Language</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={cn(
                        "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
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
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  {lat && lng ? "📍 Location pinned" : t("file.map_placeholder")}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("file.photo_label")}</Label>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Camera className="h-5 w-5" /> {t("file.photo_tap")}
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*"
                  className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                {files.length > 0 && (
                  <p className="text-xs text-muted-foreground">{files.length} file(s) selected</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Review & contact */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
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
