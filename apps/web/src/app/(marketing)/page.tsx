"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, Database, Map, BarChart3 } from "lucide-react";
import { Button } from "@dcos/ui";
import { useLanguage } from "@/lib/i18n";
import { usePublicStats } from "@/lib/hooks";

export default function LandingPage() {
  const { t } = useLanguage();
  const { data } = usePublicStats();

  const resolveRate =
    data && data.total_filed > 0
      ? Math.round((data.total_resolved / data.total_filed) * 100)
      : null;

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-institutional-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background" />
        <div className="container relative py-24 lg:py-36">
          <div className="max-w-3xl space-y-8">
            <p className="label-caps text-primary">{t("hero.badge")}</p>
            <h1 className="text-5xl font-bold leading-[1.06] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-7xl text-balance">
              {t("hero.title1")}{" "}
              <span className="text-primary">{t("hero.title2")}</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/file">
                <Button size="lg">{t("nav.file")} <ArrowRight className="h-3.5 w-3.5" /></Button>
              </Link>
              <Link href="/track">
                <Button size="lg" variant="outline">{t("nav.track")}</Button>
              </Link>
              <Link href="/transparency">
                <Button size="lg" variant="ghost" className="text-muted-foreground">{t("hero.public_dashboard")}</Button>
              </Link>
            </div>
            <p className="label-caps text-muted-foreground border-l-2 border-border pl-3">
              {t("hero.emergency")} <span className="text-foreground">112</span>
              {" · "}
              {t("hero.helpline")} <span className="text-foreground">1031</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Live metrics — shared borders, no gap ─────────────────────────── */}
      <section className="border-b border-border">
        <div className="container">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4 border-border">
            {[
              {
                label: "Total complaints filed",
                value: data?.total_filed?.toLocaleString("en-IN") ?? "—",
                trend: "+12% this month",
              },
              {
                label: "On-time resolution",
                value: resolveRate != null ? `${resolveRate}%` : "—",
                trend: "Target: 90%",
              },
              {
                label: "Avg. resolution time",
                value: data?.avg_resolution_hours != null
                  ? `${Math.round(data.avg_resolution_hours)}h`
                  : "—",
                trend: "End to end",
              },
              {
                label: "Departments tracked",
                value: String(data?.by_department?.length ?? 12),
                trend: "Full coverage",
              },
            ].map((m, i) => (
              <div
                key={i}
                className="group px-8 py-10 transition-colors hover:bg-secondary/30"
              >
                <p className="label-caps text-muted-foreground group-hover:text-primary transition-colors">
                  {m.label}
                </p>
                <p className="mt-4 text-5xl font-bold text-foreground tabular-nums tracking-tight">
                  {m.value}
                </p>
                <div className="mt-3 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <p className="label-caps text-primary">{m.trend}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Protocol — editorial steps ────────────────────────────────── */}
      <section className="border-b border-border py-24 lg:py-32">
        <div className="container">
          <div className="mb-16 max-w-xl">
            <p className="label-caps text-primary mb-3">The Protocol</p>
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
              {t("hero.how_title")}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {t("hero.how_subtitle")}
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-3 border border-border divide-y md:divide-y-0 md:divide-x divide-border">
            {[
              { n: "01", title: t("hero.step1_title"), body: t("hero.step1_body") },
              { n: "02", title: t("hero.step2_title"), body: t("hero.step2_body") },
              { n: "03", title: t("hero.step3_title"), body: t("hero.step3_body") },
            ].map((s) => (
              <div key={s.n} className="group p-10 bg-card hover:bg-muted/20 transition-colors">
                <p className="text-5xl font-bold text-secondary group-hover:text-primary transition-colors">
                  {s.n}
                </p>
                <h3 className="mt-8 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                <div className="mt-8 flex items-center gap-2">
                  <span className="h-[2px] w-6 bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities — definition table ───────────────────────────────── */}
      <section className="border-b border-border py-24 lg:py-32 bg-card">
        <div className="container">
          <div className="mb-16 max-w-xl">
            <p className="label-caps text-primary mb-3">System Capabilities</p>
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
              Built for citizens and the state alike.
            </h2>
          </div>

          <div className="border border-border divide-y divide-border">
            {[
              { label: "Multilingual intake", desc: "File in Hindi, English, Punjabi, or Urdu — voice or text. AI translates and routes to the correct department." },
              { label: "Ward-level routing", desc: "PostGIS pinpoints your exact ward and routes to the responsible officer. Wrong department: zero tolerance." },
              { label: "SLA accountability", desc: "Every complaint starts a 48-hour clock. Automatic escalation to senior officers on breach. Closure requires photographic proof." },
              { label: "Public transparency", desc: "Anonymised, live dashboards anyone can audit. Resolution rates by ward, department, and category." },
              { label: "WhatsApp-native", desc: "File and track without a browser. Works on any phone with WhatsApp — no app download, no registration." },
              { label: "AI classification", desc: "Groq Llama 70B reads every complaint in 1.4 seconds. Routes to the right department with 95% accuracy." },
            ].map((f) => (
              <div
                key={f.label}
                className="group grid grid-cols-1 gap-2 px-8 py-6 transition-colors hover:bg-muted/20 md:grid-cols-[240px_1fr] md:gap-8 md:items-baseline"
              >
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {f.label}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Transparency — map + links ────────────────────────────────────── */}
      <section className="border-b border-border py-24 lg:py-32">
        <div className="container">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Map placeholder — bordered institutional */}
            <div className="relative border border-border bg-secondary/30 aspect-square max-h-[420px]">
              <div className="absolute inset-0 bg-institutional-grid opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Map className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="label-caps text-muted-foreground">Delhi Ward Map</p>
                  <p className="text-sm text-muted-foreground">272 wards · Live data</p>
                </div>
              </div>
              {/* Overlay card */}
              <div className="absolute top-6 right-6 border border-border bg-card p-5 w-44">
                <p className="label-caps text-primary mb-3">Ward Analytics</p>
                <div className="space-y-3">
                  {["SAFDARJANG ENC.", "OKHLA", "LAJPAT NAGAR"].map((ward) => (
                    <div key={ward} className="flex justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="text-xs text-muted-foreground truncate">{ward}</span>
                      <span className="text-xs font-bold text-foreground ml-2">Live</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — content */}
            <div className="space-y-8">
              <div>
                <p className="label-caps text-primary mb-3">Institutional Integrity</p>
                <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
                  Radical transparency through public data.
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Every number is real. Every complaint is on record. JanSetu provides
                  granular access to performance data across every ward in Delhi.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { href: "/transparency", icon: Database, label: "Open Data Portal" },
                  { href: "/transparency/map", icon: Map, label: "Interactive Ward Map" },
                  { href: "/transparency/departments", icon: BarChart3, label: "Department Performance" },
                ].map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center justify-between border border-border bg-card p-5 transition-colors hover:border-primary group"
                    >
                      <div className="flex items-center gap-4">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-base font-semibold text-foreground">{l.label}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-primary py-24">
        <div className="container text-center">
          <h2 className="text-4xl font-bold tracking-[-0.02em] text-primary-foreground sm:text-5xl text-balance">
            {t("hero.cta_title")}
          </h2>
          <p className="mt-4 text-primary-foreground/70 max-w-lg mx-auto">
            {t("hero.cta_sub")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/file">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-secondary font-bold"
              >
                {t("nav.file")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/track">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-primary-foreground bg-transparent hover:bg-white/10"
              >
                {t("nav.track")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
