import type { Metadata } from "next";

export const metadata: Metadata = { title: "CM Command Center" };

export default function CMOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Delhi at a Glance</h1>
        <p className="text-sm text-slate-400">Live grievance intelligence for Delhi NCT</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Filed Today", color: "text-blue-400" },
          { label: "Open", color: "text-amber-400" },
          { label: "Resolved Today", color: "text-emerald-400" },
          { label: "SLA Breaches", color: "text-red-400" },
        ].map(({ label, color }) => (
          <div key={label} className="rounded-xl bg-slate-800 p-4 ring-1 ring-white/10">
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>—</p>
          </div>
        ))}
      </div>

      {/* GIS heatmap placeholder */}
      <div className="flex h-96 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-white/10">
        <p className="text-sm text-slate-500">GIS heatmap (MapLibre) — built in Epic 9</p>
      </div>

      <p className="text-xs text-slate-600">
        Real-time KPIs via Supabase Realtime + department leaderboard — built in Epic 9
      </p>
    </div>
  );
}
