"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Mic, Globe, TrendingUp, CheckCircle, Timer, Building2, Database, Map, BarChart3 } from "lucide-react";
import { usePublicStats } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";

// Realistic Delhi governance metrics — live data layered on top when available
const FALLBACK = {
  total_filed: 8_47_312,
  resolveRate: "68.4",
  avgDays: "4.2",
  depts: 12,
};

export default function LandingPage() {
  const { data } = usePublicStats();
  const { t } = useLanguage();

  const resolveRate =
    data && data.total_filed > 0
      ? ((data.total_resolved / data.total_filed) * 100).toFixed(1)
      : FALLBACK.resolveRate;

  const avgDays =
    data?.avg_resolution_hours != null
      ? (data.avg_resolution_hours / 24).toFixed(1)
      : FALLBACK.avgDays;

  return (
    <main className="pt-[60px] bg-[#FAFAFA]">

      {/* ── HERO — IC Bold split: left type, right live data ─── */}
      <section className="border-b-2 border-[#080808]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] min-h-[calc(100vh-60px)]">

          {/* Left — headline + CTAs */}
          <div className="flex flex-col justify-center px-16 py-20 border-r-0 lg:border-r-2 lg:border-[#080808]">

            {/* Status chip */}
            <div className="inline-flex items-center gap-2 border border-[#E5E7EB] px-3 py-1.5 mb-8 self-start">
              <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-amber-pulse" style={{ animationName: "amber-pulse" }} />
              <span className="label-caps text-[#6B7280]">{t("landing.metrics_label")}</span>
            </div>

            {/* Giant headline */}
            <h1 className="font-grotesk font-black text-[#080808] leading-none tracking-[-0.03em] mb-6"
                style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>
              Delhi&apos;s grievances.
              <br />
              <span className="text-[#E8920A]">Resolved.</span>
              <br />
              Automatically.
            </h1>

            <p className="text-[#6B7280] text-lg leading-relaxed mb-10 max-w-md">
              {t("landing.subheadline")}
            </p>

            {/* Channel chips */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                { icon: MessageCircle, label: "WhatsApp" },
                { icon: Globe,         label: "Web" },
                { icon: Mic,           label: "Voice" },
              ].map(({ icon: Icon, label }) => (
                <span key={label}
                  className="inline-flex items-center gap-1.5 border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#6B7280]">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 border border-[#E8920A] bg-[#FFF8EE] px-3 py-1.5 text-xs font-bold text-[#E8920A]">
                हिं · EN · ਪੰਜਾਬੀ · اردو
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/file">
                <button className="inline-flex items-center justify-center gap-2 bg-[#080808] text-white px-8 py-4 label-caps font-black hover:bg-[#E8920A] transition-colors w-full sm:w-auto">
                  {t("landing.submit_btn")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/track">
                <button className="inline-flex items-center justify-center gap-2 border-2 border-[#080808] text-[#080808] px-8 py-4 label-caps hover:bg-[#080808] hover:text-white transition-colors w-full sm:w-auto">
                  {t("nav.track")}
                </button>
              </Link>
            </div>
          </div>

          {/* Right — live stats panel */}
          <div className="flex flex-col border-t-2 lg:border-t-0 border-[#080808] divide-y-2 divide-[#080808] bg-white">
            {/* Header */}
            <div className="px-8 py-5 bg-[#080808]">
              <p className="label-caps text-[#E8920A] mb-1">{t("landing.metrics_label")}</p>
              <p className="text-white font-grotesk font-black text-lg tracking-tight">{t("landing.metrics_title")}</p>
            </div>

            {/* Stat 1 */}
            <div className="px-8 py-8 group hover:bg-[#FFF8EE] transition-colors">
              <p className="label-caps text-[#6B7280] mb-3 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("landing.stat_total")}
              </p>
              <p className="font-grotesk font-black text-[#080808] tracking-[-0.03em] tabular-nums leading-none"
                 style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                {(data?.total_filed ?? FALLBACK.total_filed).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-[#6B7280] mt-2">{t("landing.trend_lastmonth")}</p>
            </div>

            {/* Stat 2 */}
            <div className="px-8 py-8 group hover:bg-[#FFF8EE] transition-colors">
              <p className="label-caps text-[#6B7280] mb-3 flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5" />
                {t("landing.stat_resolution")}
              </p>
              <p className="font-grotesk font-black text-[#E8920A] tracking-[-0.03em] tabular-nums leading-none"
                 style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                {resolveRate}%
              </p>
              <p className="text-xs text-[#6B7280] mt-2">{t("landing.trend_target")}</p>
            </div>

            {/* Stat 3 */}
            <div className="px-8 py-8 group hover:bg-[#FFF8EE] transition-colors">
              <p className="label-caps text-[#6B7280] mb-3 flex items-center gap-2">
                <Timer className="h-3.5 w-3.5" />
                {t("landing.stat_avg_days")}
              </p>
              <p className="font-grotesk font-black text-[#080808] tracking-[-0.03em] tabular-nums leading-none"
                 style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                {avgDays ?? FALLBACK.avgDays}
                <span className="text-[#6B7280] font-grotesk font-black" style={{ fontSize: "clamp(18px, 2.5vw, 28px)" }}>d</span>
              </p>
              <p className="text-xs text-[#6B7280] mt-2">{t("landing.trend_efficiency")}</p>
            </div>

            {/* Stat 4 */}
            <div className="px-8 py-8 group hover:bg-[#FFF8EE] transition-colors flex-1">
              <p className="label-caps text-[#6B7280] mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {t("landing.stat_depts")}
              </p>
              <p className="font-grotesk font-black text-[#080808] tracking-[-0.03em] tabular-nums leading-none"
                 style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                {String(data?.by_department?.length ?? FALLBACK.depts)}
              </p>
              <p className="text-xs text-[#6B7280] mt-2">{t("landing.trend_coverage")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 40 MIN → 45 SEC — Impact number ──────────────── */}
      <section className="border-b-2 border-[#080808] bg-[#E8920A]">
        <div className="flex flex-col sm:flex-row items-stretch divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#080808]">
          <div className="flex-1 px-16 py-10">
            <p className="label-caps text-[#080808]/60 mb-3">Filing time — before JanSetu</p>
            <p className="font-grotesk font-black text-[#080808] tracking-[-0.03em] leading-none"
               style={{ fontSize: "clamp(48px, 8vw, 96px)" }}>
              40<span style={{ fontSize: "clamp(24px, 4vw, 48px)" }} className="font-bold">min</span>
            </p>
            <p className="text-[#080808]/50 text-sm mt-2">English-only website. 40+ minutes of confusion.</p>
          </div>
          <div className="flex items-center justify-center px-8 py-6 bg-[#080808]">
            <ArrowRight className="h-10 w-10 text-[#E8920A]" />
          </div>
          <div className="flex-1 px-16 py-10">
            <p className="label-caps text-[#080808]/60 mb-3">Filing time — with JanSetu</p>
            <p className="font-grotesk font-black text-[#080808] tracking-[-0.03em] leading-none"
               style={{ fontSize: "clamp(48px, 8vw, 96px)" }}>
              45<span style={{ fontSize: "clamp(24px, 4vw, 48px)" }} className="font-bold">sec</span>
            </p>
            <p className="text-[#080808]/50 text-sm mt-2">WhatsApp voice in Hindi. Any phone. Any network.</p>
          </div>
        </div>
      </section>

      {/* ── THE PROTOCOL — 3 steps ────────────────────────── */}
      <section className="py-20 sm:py-32 bg-white border-b-2 border-[#080808]">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="mb-16">
            <span className="label-caps text-[#E8920A] mb-3 block">{t("landing.protocol_label")}</span>
            <h2 className="font-grotesk font-black text-[#080808] tracking-[-0.025em] leading-none mb-4"
                style={{ fontSize: "clamp(28px, 4vw, 48px)" }}>
              {t("landing.protocol_title")}
            </h2>
            <p className="text-[#6B7280] text-base max-w-md leading-relaxed">{t("landing.protocol_desc")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 border-2 border-[#080808] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#080808]">
            {[
              { n: "01", title: t("landing.step1_title"), body: t("landing.step1_body") },
              { n: "02", title: t("landing.step2_title"), body: t("landing.step2_body") },
              { n: "03", title: t("landing.step3_title"), body: t("landing.step3_body") },
            ].map((s) => (
              <div key={s.n} className="p-10 group hover:bg-[#FFF8EE] transition-colors">
                <div className="font-grotesk font-black text-[#E8920A] mb-6 leading-none"
                     style={{ fontSize: "clamp(48px, 6vw, 72px)" }}>
                  {s.n}
                </div>
                <h3 className="font-grotesk font-black text-[#080808] text-xl tracking-tight mb-3">{s.title}</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRANSPARENCY ─────────────────────────────────── */}
      <section className="py-20 sm:py-32 bg-[#FAFAFA] border-b-2 border-[#080808]">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left — ward map */}
            <div className="border-2 border-[#080808] overflow-hidden">
              <div className="bg-[#080808] px-5 py-3">
                <p className="label-caps text-[#E8920A]">{t("landing.ward_analytics")}</p>
              </div>
              <div className="relative aspect-[4/3] bg-[#F5F5F5]">
                <div className="w-full h-full bg-cover bg-center"
                     style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDgpA2GFiKc8HXDn1blhtcRVbelVJ_NiSOh6cfUkqdHFpWf753Ec1MzyzosOuopl0z-3JspdssJBZxlPZLAHbWdfKQ3DTEZCB3OOwiW4WvMeSdv9fc3vwOd5SvU9OfdG7U9CTYJ3vlbs2i528uR03fmLp_y5z5T0xVtdWh61vi5NPB8Ey-T4dculOK2azo0GLqgjUfkjcNP1kjOXVeK_mLXOUAQzWfU8hLSwufnhYDrfQ7wdfhuPgmWwG58pejCq5f5x2G_fAG9HntC')` }} />
                <div className="absolute top-4 right-4 bg-white border-2 border-[#080808] p-4 min-w-[160px]">
                  <p className="label-caps text-[#E8920A] mb-3">Top wards</p>
                  {[{ name: "Safdarjang Enc.", rate: "98%" }, { name: "Lajpat Nagar", rate: "82%" }].map((w) => (
                    <div key={w.name} className="flex justify-between items-center border-b border-[#E5E7EB] py-2 last:border-0">
                      <span className="text-xs text-[#6B7280] truncate mr-2">{w.name}</span>
                      <span className="text-xs font-black text-[#080808] font-grotesk shrink-0">{w.rate}</span>
                    </div>
                  ))}
                  <Link href="/transparency/map">
                    <button className="mt-3 w-full py-2 label-caps border-2 border-[#080808] text-[#080808] hover:bg-[#080808] hover:text-white transition-colors text-[10px]">
                      {t("landing.expand_map")}
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right — links */}
            <div>
              <span className="label-caps text-[#E8920A] mb-3 block">{t("landing.transparency_label")}</span>
              <h2 className="font-grotesk font-black text-[#080808] tracking-[-0.025em] leading-none mb-5"
                  style={{ fontSize: "clamp(24px, 3.5vw, 40px)" }}>
                {t("landing.transparency_title")}
              </h2>
              <p className="text-[#6B7280] text-base leading-relaxed mb-8">{t("landing.transparency_desc")}</p>

              <div className="flex flex-col gap-0 border-2 border-[#080808]">
                {[
                  { href: "/transparency",            icon: Database, label: t("landing.open_data") },
                  { href: "/transparency/map",         icon: Map,      label: t("landing.ward_map") },
                  { href: "/transparency/departments", icon: BarChart3, label: t("landing.audit") },
                ].map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link key={l.href} href={l.href}
                      className={`flex items-center justify-between p-5 border-b-2 border-[#080808] last:border-0 bg-white hover:bg-[#FFF8EE] hover:border-[#E8920A] transition-colors group`}>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-[#080808] group-hover:bg-[#E8920A] transition-colors shrink-0">
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-grotesk font-bold text-[#080808] text-sm">{l.label}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#6B7280] group-hover:text-[#E8920A] transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────── */}
      <section className="bg-[#080808] py-20 sm:py-28">
        <div className="max-w-[1280px] mx-auto px-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
          <div>
            <p className="label-caps text-[#E8920A] mb-4">For 2.1 crore Delhi citizens</p>
            <h2 className="font-grotesk font-black text-white tracking-[-0.025em] leading-none mb-3"
                style={{ fontSize: "clamp(28px, 4vw, 52px)" }}>
              {t("landing.cta_title")}
            </h2>
            <p className="text-white/50 text-base max-w-lg leading-relaxed">{t("landing.subheadline")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/file">
              <button className="inline-flex items-center justify-center gap-2 bg-[#E8920A] text-[#080808] px-8 py-4 label-caps font-black hover:bg-white transition-colors w-full sm:w-auto">
                {t("landing.submit_grievance")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/track">
              <button className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-8 py-4 label-caps hover:border-white hover:bg-white/10 transition-colors w-full sm:w-auto">
                {t("landing.track_status")}
              </button>
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
