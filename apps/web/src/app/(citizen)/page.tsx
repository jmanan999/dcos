"use client";

import { useState, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

const LANGUAGES = [
  { code: "hi", label: "हिंदी" },
  { code: "en", label: "English" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "اردو" },
];

const CHANNELS = ["web"] as const;

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function CitizenHomePage() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("hi");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<{ tracking_id: string; is_emergency: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const geolocate = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => setError("Location access denied. You can still file without a location."),
    );
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.length < 10) {
      setError("Please describe the issue in at least 10 characters.");
      return;
    }
    setState("submitting");
    setError(null);

    try {
      const body = {
        raw_text: text,
        channel: "web",
        language,
        citizen_phone: phone || undefined,
        location: lat && lng ? { lat, lng } : undefined,
        idempotency_key: uuidv4(),
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/intake/grievances`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setState("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("error");
    }
  };

  if (state === "success" && result) {
    return (
      <div className="space-y-4">
        {result.is_emergency && (
          <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
            <p className="text-sm font-semibold text-red-800">Emergency detected — call 112 now</p>
            <p className="mt-1 text-xs text-red-600">
              Police: 100 | Fire: 101 | Ambulance: 102
            </p>
          </div>
        )}
        <div className="rounded-xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
          <p className="text-lg font-bold text-emerald-800">Complaint Filed!</p>
          <p className="mt-1 text-sm text-emerald-700">{result.message}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-xs text-slate-500">Tracking ID:</span>
            <span className="rounded bg-white px-3 py-1 font-mono text-sm font-bold text-brand-600 ring-1 ring-slate-200">
              {result.tracking_id}
            </span>
          </div>
          <a
            href={`/track/${result.tracking_id}`}
            className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Track your complaint →
          </a>
        </div>
        <button
          onClick={() => { setState("idle"); setResult(null); setText(""); setPhone(""); setLat(null); setLng(null); }}
          className="text-sm text-slate-500 underline"
        >
          File another complaint
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-bold text-slate-900">
          Apni shikayat darj karein
          <span className="ml-2 text-base font-normal text-slate-400">File a Complaint</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Your complaint reaches the right department automatically and is tracked end-to-end.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Language */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <label className="text-xs font-medium text-slate-600">Language / भाषा</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  language === l.code
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <label htmlFor="text" className="text-xs font-medium text-slate-600">
            Describe the problem / समस्या बताएं *
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            required
            minLength={10}
            maxLength={5000}
            placeholder="e.g. Sadak pe bahut bada gadda hai market ke paas. 3 din se koi nahi aaya..."
            className="mt-2 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-right text-xs text-slate-400">{text.length} / 5000</p>
        </div>

        {/* Location */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <label className="text-xs font-medium text-slate-600">Location (optional)</label>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={geolocate}
              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              📍 Use my location
            </button>
            {lat && lng && (
              <span className="text-xs text-emerald-600 font-mono">
                {lat.toFixed(4)}, {lng.toFixed(4)} ✓
              </span>
            )}
          </div>
        </div>

        {/* Phone (optional) */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <label htmlFor="phone" className="text-xs font-medium text-slate-600">
            Mobile number for updates (optional)
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Photo upload */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <label className="text-xs font-medium text-slate-600">Add Photos / Video (optional)</label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-4 text-xs text-slate-500 hover:border-brand-300 hover:text-brand-500"
          >
            📎 Tap to add photos or video
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">{files.length} file(s) selected</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={state === "submitting"}
          className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {state === "submitting" ? "Filing complaint…" : "Submit Complaint / शिकायत दर्ज करें"}
        </button>
      </form>
    </div>
  );
}
