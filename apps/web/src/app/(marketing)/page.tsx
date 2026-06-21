"use client";

import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  CheckCircle,
  Timer,
  Building2,
  Database,
  Map,
  BarChart3,
  MessageCircle,
  Mic,
  Globe,
} from "lucide-react";
import { usePublicStats } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";

export default function LandingPage() {
  const { data } = usePublicStats();
  const { t } = useLanguage();

  const resolveRate =
    data && data.total_filed > 0
      ? ((data.total_resolved / data.total_filed) * 100).toFixed(1)
      : null;

  const avgDays =
    data?.avg_resolution_hours != null
      ? (data.avg_resolution_hours / 24).toFixed(1)
      : null;

  return (
    <main className="pt-[56px]">

      {/* ── HERO — mobile-first, action above fold on every device ─────────── */}
      <section className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-white md:min-h-0 md:h-auto">
        {/* Red Fort background — fades out more aggressively on mobile */}
        <div className="absolute inset-0 z-0">
          <div
            className="h-full w-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Red_Fort_in_New_Delhi_03-2016.jpg/1920px-Red_Fort_in_New_Delhi_03-2016.jpg')`,
            }}
          />
          <div className="absolute inset-0 bg-white/70 md:bg-white/55" />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(250,248,255,0.1) 0%, rgba(250,248,255,0.95) 60%, rgba(250,248,255,1) 100%)",
            }}
          />
        </div>

        {/* Content — centred on mobile, left-aligned on desktop */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-12 text-center md:max-w-container-max md:mx-auto md:w-full md:items-start md:px-margin-desktop md:text-left md:py-24">

          {/* Badge */}
          <div className="mb-5 flex items-center gap-2 rounded-full bg-primary/8 px-4 py-1.5 border border-primary/20">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-wide">
              {t("landing.metrics_label")}
            </span>
          </div>

          {/* Headline — big and clear */}
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-on-surface sm:text-5xl md:text-headline-xl max-w-2xl">
            {t("landing.headline")}
          </h1>

          <p className="mt-4 max-w-lg text-base text-on-surface-variant md:text-body-lg">
            {t("landing.subheadline")}
          </p>

          {/* Primary CTAs — min 52px tall, full-width on mobile */}
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:w-auto">
            <Link href="/file" className="w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 bg-primary text-white px-8 py-4 min-h-[52px] text-label-caps font-bold hover:bg-primary-container transition-all sm:w-auto">
                {t("landing.submit_btn")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/track" className="w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 border border-outline-variant text-on-surface px-8 py-4 min-h-[52px] text-label-caps hover:bg-surface-dim transition-all sm:w-auto">
                {t("nav.track")}
              </button>
            </Link>
          </div>

          {/* Channel chips — icon + text so even illiterate users understand */}
          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            {[
              { icon: MessageCircle, label: "WhatsApp" },
              { icon: Globe,         label: "Web" },
              { icon: Mic,           label: "Voice" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-white/80 px-3 py-1.5 text-xs font-medium text-on-surface-variant"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-white/80 px-3 py-1.5 text-xs font-medium text-on-surface-variant">
              हिं · EN · ਪੰਜਾਬੀ · اردو
            </span>
          </div>
        </div>

        {/* Mobile scroll hint */}
        <div className="relative z-10 flex justify-center pb-6 md:hidden">
          <div className="h-5 w-5 border-b-2 border-r-2 border-primary/40 rotate-45 animate-bounce" />
        </div>
      </section>

      {/* ── Live Metrics — shared borders, numbers are big and honest ──────── */}
      <section className="border-y border-outline-variant bg-surface">
        <div className="max-w-container-max mx-auto px-4 sm:px-margin-desktop">
          <div className="flex flex-col gap-1 px-0 pb-6 pt-8 sm:pb-0 sm:pt-0 sm:flex-row sm:items-end sm:justify-between border-b border-outline-variant">
            <div className="pt-6 hidden sm:block">
              <span className="text-label-caps text-primary mb-1 block">{t("landing.metrics_label")}</span>
              <h2 className="text-headline-lg text-on-surface">{t("landing.metrics_title")}</h2>
            </div>
            <span className="text-body-sm text-on-surface-variant pb-4 hidden sm:block">{t("landing.metrics_updated")}</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-outline-variant sm:grid-cols-4 sm:divide-y-0">
            {[
              { label: t("landing.stat_total"),      value: data?.total_filed?.toLocaleString("en-IN") ?? "—",  trend: t("landing.trend_lastmonth"), icon: TrendingUp },
              { label: t("landing.stat_resolution"), value: resolveRate ? `${resolveRate}%` : "—",              trend: t("landing.trend_target"),    icon: CheckCircle },
              { label: t("landing.stat_avg_days"),   value: avgDays ?? "—",                                     trend: t("landing.trend_efficiency"), icon: Timer },
              { label: t("landing.stat_depts"),      value: String(data?.by_department?.length ?? 12),          trend: t("landing.trend_coverage"),  icon: Building2 },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="p-5 sm:p-8 bg-white hover:bg-surface-dim transition-colors group">
                  <span className="text-label-caps text-on-surface-variant mb-3 block group-hover:text-primary transition-colors">
                    {m.label}
                  </span>
                  <div className="text-3xl font-bold text-on-surface tabular-nums sm:text-headline-xl">{m.value}</div>
                  <div className="mt-3 flex items-center gap-1 text-primary text-label-md">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {m.trend}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── The Protocol — numbered, icon-assisted (literacy-friendly) ──────── */}
      <section className="py-16 sm:py-32 bg-white">
        <div className="max-w-container-max mx-auto px-5 sm:px-margin-desktop">
          <div className="max-w-xl mb-12 sm:mb-20">
            <span className="text-label-caps text-primary mb-2 block">{t("landing.protocol_label")}</span>
            <h2 className="text-2xl font-bold sm:text-headline-lg text-on-surface mb-4">{t("landing.protocol_title")}</h2>
            <p className="text-body-md text-on-surface-variant">{t("landing.protocol_desc")}</p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-gutter">
            {[
              { n: "01", title: t("landing.step1_title"), body: t("landing.step1_body") },
              { n: "02", title: t("landing.step2_title"), body: t("landing.step2_body") },
              { n: "03", title: t("landing.step3_title"), body: t("landing.step3_body") },
            ].map((s) => (
              <div key={s.n} className="relative group">
                <div className="text-5xl sm:text-headline-xl text-surface-dim font-bold mb-6 group-hover:text-primary transition-colors">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold sm:text-headline-sm text-on-surface mb-3">{s.title}</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">{s.body}</p>
                <div className="mt-6 h-[1px] bg-outline-variant w-full relative">
                  <div className="absolute top-[-4px] left-0 w-2 h-2 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Transparency — map panel ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-32 bg-surface">
        <div className="max-w-container-max mx-auto px-5 sm:px-margin-desktop">
          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16 sm:items-center">
            {/* Left — Delhi ward map */}
            <div className="w-full sm:w-1/2">
              <div className="relative border border-outline-variant bg-surface-dim p-3 sm:p-4 aspect-[4/3] sm:aspect-square overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDgpA2GFiKc8HXDn1blhtcRVbelVJ_NiSOh6cfUkqdHFpWf753Ec1MzyzosOuopl0z-3JspdssJBZxlPZLAHbWdfKQ3DTEZCB3OOwiW4WvMeSdv9fc3vwOd5SvU9OfdG7U9CTYJ3vlbs2i528uR03fmLp_y5z5T0xVtdWh61vi5NPB8Ey-T4dculOK2azo0GLqgjUfkjcNP1kjOXVeK_mLXOUAQzWfU8hLSwufnhYDrfQ7wdfhuPgmWwG58pejCq5f5x2G_fAG9HntC')`,
                  }}
                />
                {/* Overlay analytics card */}
                <div className="absolute top-4 right-4 sm:top-8 sm:right-8 bg-white border border-outline-variant p-4 sm:p-6 w-40 sm:max-w-xs shadow-sm">
                  <span className="text-label-caps text-primary block mb-2">{t("landing.ward_analytics")}</span>
                  <div className="space-y-3">
                    {[
                      { name: "Safdarjang Enc.", rate: "98%" },
                      { name: "Lajpat Nagar",   rate: "82%" },
                    ].map((w) => (
                      <div key={w.name} className="flex justify-between border-b border-outline-variant pb-2">
                        <span className="text-xs text-on-surface-variant truncate mr-2">{w.name}</span>
                        <span className="text-xs font-bold text-on-surface shrink-0">{w.rate}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/transparency/map">
                    <button className="mt-4 w-full py-2 text-label-caps border border-primary text-primary hover:bg-primary hover:text-white transition-all text-xs">
                      {t("landing.expand_map")}
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right — content */}
            <div className="w-full sm:w-1/2">
              <span className="text-label-caps text-primary mb-2 block">{t("landing.transparency_label")}</span>
              <h2 className="text-2xl font-bold sm:text-headline-lg text-on-surface mb-5">{t("landing.transparency_title")}</h2>
              <p className="text-base sm:text-body-lg text-on-surface-variant mb-8">{t("landing.transparency_desc")}</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { href: "/transparency",            icon: Database, label: t("landing.open_data") },
                  { href: "/transparency/map",         icon: Map,      label: t("landing.ward_map") },
                  { href: "/transparency/departments", icon: BarChart3, label: t("landing.audit") },
                ].map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center justify-between p-4 sm:p-6 border border-outline-variant bg-white hover:border-primary transition-all group"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm font-semibold sm:text-headline-sm text-on-surface">{l.label}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — full width navy, left-aligned on desktop, centred on mobile ── */}
      <section className="py-16 sm:py-24 bg-primary">
        <div className="max-w-container-max mx-auto px-5 sm:px-margin-desktop text-center sm:text-left">
          <h2 className="text-2xl font-bold sm:text-headline-xl text-white mb-4 max-w-2xl mx-auto sm:mx-0">
            {t("landing.cta_title")}
          </h2>
          <p className="text-white/70 mb-8 max-w-lg mx-auto sm:mx-0">
            {t("landing.subheadline")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-center sm:items-start">
            <Link href="/file" className="w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 bg-white text-primary px-8 py-4 min-h-[52px] text-label-caps font-bold hover:bg-surface-dim transition-all sm:w-auto">
                {t("landing.submit_grievance")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/track" className="w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 border border-white text-white px-8 py-4 min-h-[52px] text-label-caps hover:bg-white/10 transition-all sm:w-auto">
                {t("landing.track_status")}
              </button>
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
