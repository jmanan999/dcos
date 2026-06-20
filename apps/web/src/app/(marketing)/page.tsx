"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Search,
  Sparkles,
  MapPin,
  ShieldCheck,
  Languages,
  Camera,
  BellRing,
  BarChart3,
  Building2,
} from "lucide-react";
import { Button } from "@dcos/ui";
import { LiveStats } from "@/components/marketing/live-stats";
import { useLanguage } from "@/lib/i18n";

export default function LandingPage() {
  const { t } = useLanguage();

  const STEPS = [
    { icon: FileText, title: t("hero.step1_title"), body: t("hero.step1_body") },
    { icon: Sparkles, title: t("hero.step2_title"), body: t("hero.step2_body") },
    { icon: BellRing, title: t("hero.step3_title"), body: t("hero.step3_body") },
  ];

  const FEATURES = [
    { icon: Languages, title: "Multilingual intake", body: "File the way you speak — four languages, voice and text." },
    { icon: Camera, title: "Photo & voice", body: "Attach evidence; we auto-extract location and context." },
    { icon: MapPin, title: "Ward-level routing", body: "PostGIS pinpoints your ward and the responsible body." },
    { icon: ShieldCheck, title: "SLA accountability", body: "Every complaint is on a clock with automatic escalation." },
    { icon: BarChart3, title: "Public transparency", body: "Anonymized, live dashboards anyone can inspect." },
    { icon: Building2, title: "12 departments", body: "MCD, DJB, PWD, BSES, Delhi Police, DTC and more." },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-dots opacity-60" />
        <div className="container relative grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {t("hero.badge")}
            </span>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              {t("hero.title1")}{" "}
              <span className="text-primary">{t("hero.title2")}</span>
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">{t("hero.subtitle")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/file">
                <Button size="lg">
                  {t("nav.file")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/track">
                <Button size="lg" variant="outline">
                  <Search className="h-4 w-4" /> {t("nav.track")}
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("hero.emergency")} <span className="font-semibold text-foreground">112</span> ·{" "}
              {t("hero.helpline")} <span className="font-semibold text-foreground">1031</span>
            </p>
          </div>

          {/* Hero card visual */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">DCOS-20260620-4C22</p>
                    <p className="text-2xs text-muted-foreground">Pothole · Lajpat Nagar</p>
                  </div>
                </div>
                <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                  {t("status.ASSIGNED")}
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { key: "status.RECEIVED" as const, done: true },
                  { key: null, label: "AI categorised → PWD", done: true },
                  { key: "status.ASSIGNED" as const, done: true },
                  { key: "status.IN_PROGRESS" as const, done: false },
                  { key: null, label: "Resolved with proof", done: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-2xs font-bold ${
                        s.done
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`text-sm ${s.done ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {s.key ? t(s.key) : s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-4 -top-4 -z-10 h-full w-full rounded-2xl bg-primary/10" />
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="container -mt-8 pb-16">
        <LiveStats />
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/40 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{t("hero.how_title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("hero.how_subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative rounded-xl border border-border bg-card p-6 shadow-sm">
                  <span className="absolute right-5 top-5 text-4xl font-bold text-muted/60">{i + 1}</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Built for citizens and the state alike
            </h2>
            <p className="mt-3 text-muted-foreground">
              Industry-grade governance infrastructure, designed to be simple for everyone.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-2xl bg-sidebar px-8 py-14 text-center">
          <div className="absolute inset-0 bg-grid opacity-[0.07]" />
          <div className="relative mx-auto max-w-xl space-y-5">
            <h2 className="text-3xl font-bold tracking-tight text-white">{t("hero.cta_title")}</h2>
            <p className="text-sidebar-foreground">{t("hero.cta_sub")}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/file">
                <Button size="lg">
                  {t("nav.file")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/transparency">
                <Button size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  {t("hero.public_dashboard")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
