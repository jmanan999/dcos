"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, CheckCircle, Timer, Building2, Database, Map, BarChart3 } from "lucide-react";
import { usePublicStats } from "@/lib/hooks";

export default function LandingPage() {
  const { data } = usePublicStats();

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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative h-[819px] flex items-center overflow-hidden bg-white">
        {/* Background photo — Signature Bridge / Delhi architecture */}
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Red_Fort_in_New_Delhi_03-2016.jpg/1920px-Red_Fort_in_New_Delhi_03-2016.jpg')`,
            }}
          />
          {/* White overlay + fade-to-white gradient at bottom */}
          {/* Slight cool tint to balance Red Fort's warm sandstone + fade to white at bottom */}
          <div className="absolute inset-0 bg-white/55" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(250,248,255,0) 30%, rgba(250,248,255,1) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-container-max mx-auto px-margin-desktop w-full">
          <div className="max-w-2xl">
            <h1 className="text-headline-xl text-on-surface mb-6 leading-tight">
              Your grievance, addressed with institutional precision.
            </h1>
            <p className="text-body-lg text-on-surface-variant mb-8 max-w-lg">
              A centralised platform for the citizens of Delhi to resolve administrative
              issues through a transparent, high-fidelity routing system.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/file">
                <button className="bg-primary text-white px-8 py-4 text-label-caps hover:bg-primary-container transition-all">
                  Submit New Grievance
                </button>
              </Link>
              <Link href="/transparency">
                <button className="border border-outline-variant text-on-surface px-8 py-4 text-label-caps hover:bg-surface-dim transition-all">
                  View Public Registry
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Metrics ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-surface border-y border-outline-variant">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-label-caps text-primary mb-2 block">Real-time Performance</span>
              <h2 className="text-headline-lg text-on-surface">Live Governance Metrics</h2>
            </div>
            <div className="text-right">
              <span className="text-body-sm text-on-surface-variant">
                Last updated: Today, live
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-outline-variant divide-x divide-outline-variant">
            {[
              {
                label: "Total Complaints",
                value: data?.total_filed?.toLocaleString("en-IN") ?? "—",
                icon: <TrendingUp className="h-4 w-4 mr-1" />,
                trend: "+12% from last month",
              },
              {
                label: "On-time Resolution",
                value: resolveRate ? `${resolveRate}%` : "—",
                icon: <CheckCircle className="h-4 w-4 mr-1" />,
                trend: "Target: 90%",
              },
              {
                label: "Avg. Time (Days)",
                value: avgDays ?? "—",
                icon: <Timer className="h-4 w-4 mr-1" />,
                trend: "System efficiency optimised",
              },
              {
                label: "Depts Tracked",
                value: String(data?.by_department?.length ?? 12),
                icon: <Building2 className="h-4 w-4 mr-1" />,
                trend: "Full municipal coverage",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="p-8 bg-white hover:bg-surface-dim transition-colors group"
              >
                <span className="text-label-caps text-on-surface-variant mb-4 block group-hover:text-primary transition-colors">
                  {m.label}
                </span>
                <div className="text-headline-xl text-on-surface tabular-nums">{m.value}</div>
                <div className="mt-4 flex items-center text-primary text-label-md">
                  {m.icon}
                  {m.trend}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Protocol ──────────────────────────────────────────────────── */}
      <section className="py-32 bg-white">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="max-w-xl mb-20">
            <span className="text-label-caps text-primary mb-2 block">The Protocol</span>
            <h2 className="text-headline-lg text-on-surface mb-6">
              A structural workflow for citizen feedback.
            </h2>
            <p className="text-body-md text-on-surface-variant">
              JanSetu employs a tri-phasic verification system to ensure every grievance is
              correctly categorised, prioritised, and solved by the relevant jurisdictional
              authority.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {[
              {
                n: "01",
                title: "Intake & Verification",
                body: "System logs the complaint via secure identity tokens. Automated AI scans for validity and urgency markers to prevent system congestion.",
              },
              {
                n: "02",
                title: "Jurisdictional Routing",
                body: "Direct transmission to the verified departmental officer. The grievance enters the Active Queue with a fixed resolution deadline based on policy.",
              },
              {
                n: "03",
                title: "Final Resolution",
                body: "Officers submit photographic and documentary evidence of resolution. Citizens provide final audit approval before the case is closed.",
              },
            ].map((s) => (
              <div key={s.n} className="relative group">
                <div className="text-headline-xl text-surface-dim mb-8 group-hover:text-primary transition-colors">
                  {s.n}
                </div>
                <h3 className="text-headline-sm text-on-surface mb-4">{s.title}</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">{s.body}</p>
                <div className="mt-8 h-[1px] bg-outline-variant w-full relative">
                  <div className="absolute top-[-4px] left-0 w-2 h-2 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Transparency ──────────────────────────────────────────────────── */}
      <section className="py-32 bg-surface">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            {/* Left — map panel */}
            <div className="w-full md:w-1/2">
              <div
                className="aspect-square border border-outline-variant bg-surface-dim p-4 relative"
              >
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDgpA2GFiKc8HXDn1blhtcRVbelVJ_NiSOh6cfUkqdHFpWf753Ec1MzyzosOuopl0z-3JspdssJBZxlPZLAHbWdfKQ3DTEZCB3OOwiW4WvMeSdv9fc3vwOd5SvU9OfdG7U9CTYJ3vlbs2i528uR03fmLp_y5z5T0xVtdWh61vi5NPB8Ey-T4dculOK2azo0GLqgjUfkjcNP1kjOXVeK_mLXOUAQzWfU8hLSwufnhYDrfQ7wdfhuPgmWwG58pejCq5f5x2G_fAG9HntC')`,
                  }}
                />
                {/* Overlay analytics card */}
                <div className="absolute top-8 right-8 bg-white border border-outline-variant p-6 max-w-xs">
                  <span className="text-label-caps text-primary block mb-2">Ward Analytics</span>
                  <div className="space-y-4">
                    {[
                      { name: "Safdarjang Enc.", rate: "98%" },
                      { name: "Lajpat Nagar", rate: "82%" },
                    ].map((w) => (
                      <div key={w.name} className="flex justify-between border-b border-outline-variant pb-2">
                        <span className="text-body-sm text-on-surface-variant">{w.name}</span>
                        <span className="text-body-sm text-on-surface font-bold">{w.rate} Res.</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/transparency/map">
                    <button className="mt-6 w-full py-2 text-label-caps border border-primary text-primary hover:bg-primary hover:text-white transition-all">
                      Expand Map
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right — content */}
            <div className="w-full md:w-1/2">
              <span className="text-label-caps text-primary mb-2 block">Institutional Integrity</span>
              <h2 className="text-headline-lg text-on-surface mb-8">
                Radical transparency through public data.
              </h2>
              <p className="text-body-lg text-on-surface-variant mb-10">
                We believe that governance is most effective when it is observable. JanSetu
                provides granular access to performance data across every ward in Delhi.
              </p>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { href: "/transparency",             icon: Database, label: "Open Data Portal" },
                  { href: "/transparency/map",          icon: Map,      label: "Interactive Ward Map" },
                  { href: "/transparency/departments",  icon: BarChart3, label: "Annual Performance Audit" },
                ].map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center justify-between p-6 border border-outline-variant bg-white hover:border-primary transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-headline-sm text-on-surface">{l.label}</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-on-surface-variant" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-primary text-white">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center">
          <h2 className="text-headline-xl text-white mb-8">
            Efficient governance starts with citizen participation.
          </h2>
          <div className="flex flex-col md:flex-row justify-center gap-6">
            <Link href="/file">
              <button className="bg-white text-primary px-10 py-5 text-label-caps hover:bg-surface-dim transition-all">
                Submit a Grievance
              </button>
            </Link>
            <Link href="/track">
              <button className="border border-white text-white px-10 py-5 text-label-caps hover:bg-white/10 transition-all">
                Track Existing Status
              </button>
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
