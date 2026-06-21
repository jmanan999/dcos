"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  MessageSquareText,
  MapPin,
  TrendingUp,
  Smartphone,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { Button } from "@dcos/ui";
import { LiveStats } from "@/components/marketing/live-stats";
import { useLanguage } from "@/lib/i18n";
import { usePublicStats } from "@/lib/hooks";

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container grid gap-0 lg:grid-cols-[1fr_400px] lg:gap-16 lg:items-start">
          {/* Left column */}
          <div className="py-16 lg:py-24 space-y-8">
            {/* System badge */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Government of Delhi · JanSetu Platform
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-7xl">
              {t("hero.title1")}{" "}
              <span className="text-primary">{t("hero.title2")}</span>
            </h1>

            {/* Subheadline — short, declarative */}
            <p className="max-w-[520px] text-xl leading-relaxed text-muted-foreground">
              {t("hero.subtitle")}
            </p>

            {/* Primary actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/file">
                <Button size="lg" className="h-12 px-6 text-base font-semibold">
                  {t("nav.file")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/track">
                <Button size="lg" variant="outline" className="h-12 px-6 text-base">
                  {t("nav.track")}
                </Button>
              </Link>
            </div>

            {/* Channels */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4" />
                WhatsApp
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                Web portal
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquareText className="h-4 w-4" />
                Hindi · English · ਪੰਜਾਬੀ · اردو
              </span>
            </div>

            {/* Emergency */}
            <p className="text-sm text-muted-foreground border-l-2 border-border pl-3">
              {t("hero.emergency")}{" "}
              <span className="font-semibold text-foreground">112</span>
              {" · "}
              {t("hero.helpline")}{" "}
              <span className="font-semibold text-foreground">1031</span>
            </p>
          </div>

          {/* Right column — live metrics panel */}
          <div className="hidden lg:block border-l border-border py-24 pl-16">
            <LiveStatsPanel />
          </div>
        </div>
      </section>

      {/* ── Live stats bar ────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <LiveStats />
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-border">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
            {/* Section label */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("hero.how_title")}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
                From phone to resolution in 72 hours.
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("hero.how_subtitle")}
              </p>
            </div>

            {/* Steps — editorial numbered list */}
            <div className="divide-y divide-border">
              {[
                {
                  n: "01",
                  title: t("hero.step1_title"),
                  body: t("hero.step1_body"),
                  icon: MessageSquareText,
                },
                {
                  n: "02",
                  title: t("hero.step2_title"),
                  body: t("hero.step2_body"),
                  icon: TrendingUp,
                },
                {
                  n: "03",
                  title: t("hero.step3_title"),
                  body: t("hero.step3_body"),
                  icon: ShieldCheck,
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.n}
                    className="grid grid-cols-[48px_1fr] gap-6 py-8 first:pt-0 last:pb-0"
                  >
                    <span className="text-2xl font-bold tabular-nums text-muted/60 select-none">
                      {s.n}
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{s.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── What makes it different — Linear feature table ─────────────────── */}
      <section className="py-20 border-b border-border">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
            {/* Section label */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Capabilities
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
                Built for citizens and the state alike.
              </h2>
            </div>

            {/* Feature table */}
            <div className="divide-y divide-border">
              {[
                {
                  icon: Globe,
                  label: "Multilingual intake",
                  desc: "File in Hindi, English, Punjabi, or Urdu — voice or text. AI translates and routes.",
                },
                {
                  icon: MapPin,
                  label: "Ward-level routing",
                  desc: "PostGIS pinpoints your ward and the responsible department. No wrong department.",
                },
                {
                  icon: ShieldCheck,
                  label: "SLA accountability",
                  desc: "Every complaint starts a clock. Automatic escalation at 48h. Officers can't close without proof.",
                },
                {
                  icon: TrendingUp,
                  label: "Public transparency",
                  desc: "Anonymised, live dashboards anyone can inspect. Resolution rates by ward and department.",
                },
                {
                  icon: Smartphone,
                  label: "WhatsApp-native",
                  desc: "File and track without a browser. Works on any phone with WhatsApp — no app download.",
                },
                {
                  icon: MessageSquareText,
                  label: "AI classification",
                  desc: "Groq Llama 70B reads every complaint in 1.4s. Routes to the right department with 95% accuracy.",
                },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="grid grid-cols-[200px_1fr] gap-8 py-6 first:pt-0 last:pb-0 items-baseline"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-semibold text-foreground">{f.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Transparency strip ────────────────────────────────────────────── */}
      <section className="py-20 border-b border-border">
        <div className="container">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Open government
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Every number is real. Every complaint is on record.
              </h2>
              <p className="text-muted-foreground text-sm max-w-md">
                No hidden data. Live complaint counts, department performance, and ward-level heatmaps — public by default.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/transparency">
                <Button variant="outline" className="gap-2">
                  Public dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/transparency/map">
                <Button variant="outline" className="gap-2">
                  Delhi heatmap <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-lg bg-primary px-8 py-14 md:px-14">
            <div className="max-w-2xl space-y-5">
              <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                {t("hero.cta_title")}
              </h2>
              <p className="text-primary-foreground/70 text-lg leading-relaxed">
                {t("hero.cta_sub")}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/file">
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 font-semibold h-12 px-6"
                  >
                    {t("nav.file")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/transparency">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-primary-foreground bg-transparent hover:bg-white/10 h-12 px-6"
                  >
                    {t("hero.public_dashboard")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Inline stats panel for hero right column ─────────────────────────────────
function LiveStatsPanel() {
  const { data } = usePublicStats();

  const resolveRate =
    data && data.total_filed > 0
      ? Math.round((data.total_resolved / data.total_filed) * 100)
      : null;

  const stats = [
    {
      value: data?.total_filed?.toLocaleString("en-IN") ?? "—",
      label: "Complaints filed",
      sub: "all time",
    },
    {
      value: resolveRate != null ? `${resolveRate}%` : "—",
      label: "Resolved on time",
      sub: "within SLA",
    },
    {
      value: data?.avg_resolution_hours != null
        ? `${Math.round(data.avg_resolution_hours)}h`
        : "—",
      label: "Avg resolution",
      sub: "end to end",
    },
    {
      value: String(data?.by_department?.length ?? 12),
      label: "Departments",
      sub: "MCD · DJB · PWD and more",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Live data
        </div>
        <p className="text-sm font-semibold text-foreground">Delhi Grievance System</p>
      </div>
      <div className="space-y-6">
        {stats.map((s) => (
          <div key={s.label} className="space-y-0.5">
            <p className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {s.value}
            </p>
            <p className="text-sm font-medium text-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
