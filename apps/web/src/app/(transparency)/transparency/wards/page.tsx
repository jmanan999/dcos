"use client";

import { useState, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, AlertTriangle, Award, ChevronUp, ChevronDown, User } from "lucide-react";
import { Skeleton } from "@dcos/ui";
import { useWardIndex, useWardReps, type WardIntelligence } from "@/lib/hooks";

const GRADE_CONFIG = {
  A: { label: "A — Excellent",  bg: "bg-success/10",     text: "text-success",     border: "border-success/30" },
  B: { label: "B — Good",       bg: "bg-primary/8",      text: "text-primary",     border: "border-primary/20" },
  C: { label: "C — Average",    bg: "bg-warning/8",      text: "text-warning",     border: "border-warning/20" },
  D: { label: "D — Poor",       bg: "bg-orange-50",      text: "text-orange-600",  border: "border-orange-200" },
  F: { label: "F — Critical",   bg: "bg-destructive/8",  text: "text-destructive", border: "border-destructive/20" },
};

const PARTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  AAP:         { bg: "bg-[#0070c0]/10", text: "text-[#0070c0]", border: "border-[#0070c0]/30" },
  BJP:         { bg: "bg-orange-50",    text: "text-orange-700", border: "border-orange-200" },
  INC:         { bg: "bg-green-50",     text: "text-green-700",  border: "border-green-200" },
  Independent: { bg: "bg-surface-container", text: "text-on-surface-variant", border: "border-outline-variant" },
};

function PartyBadge({ party }: { party: string }) {
  const cfg = PARTY_COLORS[party] ?? PARTY_COLORS.Independent;
  return (
    <span className={`text-label-caps px-1.5 py-0.5 border font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {party}
    </span>
  );
}

function WPIBadge({ grade }: { grade: string }) {
  const cfg = GRADE_CONFIG[grade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.F;
  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center border text-sm font-black ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {grade}
    </span>
  );
}

function formatInr(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

type SortKey = "wpi_rank" | "wpi" | "resolution_rate" | "economic_drag_daily_inr" | "open_complaints";

export default function WardIndexPage() {
  const { data, isLoading } = useWardIndex();
  const { data: reps } = useWardReps();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [partyFilter, setPartyFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("wpi_rank");
  const [sortAsc, setSortAsc] = useState(true);

  // Build ward_name → rep lookup
  const repByWard = useMemo(() => {
    const map: Record<string, { name: string; party: string; constituency: string | null }> = {};
    reps?.forEach((r) => {
      if (r.ward_name) map[r.ward_name] = { name: r.representative_name, party: r.party, constituency: r.constituency };
    });
    return map;
  }, [reps]);

  const wards = useMemo(() => {
    if (!data?.wards) return [];
    let list = data.wards;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (w) => w.ward_name.toLowerCase().includes(q) ||
               (w.district_name ?? "").toLowerCase().includes(q) ||
               (repByWard[w.ward_name]?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (gradeFilter !== "ALL") list = list.filter((w) => w.wpi_grade === gradeFilter);
    if (partyFilter !== "ALL") list = list.filter((w) => repByWard[w.ward_name]?.party === partyFilter);
    list = [...list].sort((a, b) => {
      const va = a[sortKey] as number;
      const vb = b[sortKey] as number;
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [data, search, gradeFilter, partyFilter, sortKey, sortAsc, repByWard]);

  // Party WPI averages for the political comparison line
  const partyStats = useMemo(() => {
    if (!data?.wards || !reps?.length) return null;
    const partySums: Record<string, { sum: number; count: number }> = {};
    data.wards.forEach((w) => {
      const party = repByWard[w.ward_name]?.party ?? "Unknown";
      if (!partySums[party]) partySums[party] = { sum: 0, count: 0 };
      partySums[party].sum += w.wpi;
      partySums[party].count += 1;
    });
    return Object.entries(partySums)
      .filter(([p]) => p !== "Unknown")
      .map(([party, s]) => ({ party, avg: Math.round(s.sum / s.count), count: s.count }))
      .sort((a, b) => b.avg - a.avg);
  }, [data, reps, repByWard]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === "wpi_rank"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? null :
    sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;

  return (
    <div className="space-y-0">

      {/* Hero header */}
      <div className="border-b border-outline-variant bg-primary px-6 py-8 sm:px-margin-desktop">
        <div className="max-w-container-max mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-caps text-white/60 mb-2">Delhi Governance Intelligence · Public</p>
              <h1 className="text-3xl font-black font-grotesk text-white tracking-tight">
                Ward Productivity Index
              </h1>
              <p className="text-white/70 mt-2 max-w-xl">
                Every Delhi ward ranked 0–100 by governance quality, linked to its elected councillor.
                <strong className="text-white"> No spin. Just data.</strong>
              </p>
            </div>
            {data && (
              <div className="hidden sm:grid grid-cols-2 gap-3 text-center shrink-0">
                <div className="border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-2xl font-bold text-white">{data.city_avg_wpi}</p>
                  <p className="label-caps text-white/60">City Avg WPI</p>
                </div>
                <div className="border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-2xl font-bold text-white">{data.wards_in_crisis}</p>
                  <p className="label-caps text-white/60">In Crisis</p>
                </div>
                <div className="border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-2xl font-bold text-white">{data.total_wards_ranked}</p>
                  <p className="label-caps text-white/60">Wards Ranked</p>
                </div>
                <div className="border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-lg font-bold text-white">
                    {data.total_economic_drag_daily > 0 ? formatInr(data.total_economic_drag_daily) : "—"}
                  </p>
                  <p className="label-caps text-white/60">Daily Drag</p>
                </div>
              </div>
            )}
          </div>

          {/* Grade distribution */}
          {data && (
            <div className="mt-6 grid grid-cols-5 gap-1">
              {(["A","B","C","D","F"] as const).map((g) => {
                const count = data.wards.filter((w) => w.wpi_grade === g).length;
                const pct = Math.round(count / data.total_wards_ranked * 100);
                const cfg = GRADE_CONFIG[g];
                return (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(gradeFilter === g ? "ALL" : g)}
                    className={`border py-2 text-center transition-all ${gradeFilter === g ? `${cfg.bg} ${cfg.border} ${cfg.text}` : "border-white/20 bg-white/10 text-white/70 hover:bg-white/20"}`}
                  >
                    <p className="text-xl font-black">{count}</p>
                    <p className="label-caps opacity-80">Grade {g}</p>
                    <p className="label-caps opacity-60">{pct}%</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top/Bottom spotlight */}
      {data && (
        <div className="border-b border-outline-variant bg-white px-6 py-4 sm:px-margin-desktop">
          <div className="max-w-container-max mx-auto grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Award className="h-3.5 w-3.5 text-success" />
                <p className="label-caps text-success">Top Performers</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.top_5.map((w) => (
                  <span key={w} className="border border-success/30 bg-success/5 px-2.5 py-1 text-xs font-medium text-success">{w}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <p className="label-caps text-destructive">Needs Immediate Intervention</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.bottom_5.map((w) => (
                  <span key={w} className="border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-xs font-medium text-destructive">{w}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Party WPI comparison — the accountability signal */}
      {partyStats && partyStats.length > 0 && (
        <div className="border-b border-outline-variant bg-surface-container px-6 py-4 sm:px-margin-desktop">
          <div className="max-w-container-max mx-auto">
            <p className="label-caps text-on-surface-variant mb-3">
              Average WPI by Party — governance performance by political affiliation
            </p>
            <div className="flex flex-wrap gap-4">
              {partyStats.map((ps) => {
                const cfg = PARTY_COLORS[ps.party] ?? PARTY_COLORS.Independent;
                return (
                  <button
                    key={ps.party}
                    onClick={() => setPartyFilter(partyFilter === ps.party ? "ALL" : ps.party)}
                    className={`flex items-center gap-2 border px-3 py-2 transition-colors ${
                      partyFilter === ps.party
                        ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                        : "border-outline-variant bg-white text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className="text-xl font-black">{ps.avg}</span>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${partyFilter === ps.party ? cfg.text : "text-on-surface"}`}>{ps.party}</p>
                      <p className="label-caps text-on-surface-variant">{ps.count} wards</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="border-b border-outline-variant bg-white px-6 py-3 sm:px-margin-desktop sticky top-14 z-20">
        <div className="max-w-container-max mx-auto flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ward, district, or councillor…"
              className="w-full h-9 border border-outline-variant bg-white pl-9 pr-3 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1">
            {["ALL", "A", "B", "C", "D", "F"].map((g) => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-3 py-1.5 label-caps transition-all ${gradeFilter === g ? "bg-primary text-white" : "border border-outline-variant text-on-surface-variant hover:text-on-surface"}`}
              >
                {g}
              </button>
            ))}
          </div>
          <p className="label-caps text-on-surface-variant shrink-0">{wards.length} wards</p>
        </div>
      </div>

      {/* Ward table */}
      <div className="px-6 sm:px-margin-desktop py-4">
        <div className="max-w-container-max mx-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <div className="border border-outline-variant overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-dim border-b border-outline-variant">
                      <th className="px-4 py-3 label-caps text-on-surface-variant cursor-pointer hover:text-primary" onClick={() => toggleSort("wpi_rank")}>
                        Rank <SortIcon k="wpi_rank" />
                      </th>
                      <th className="px-4 py-3 label-caps text-on-surface-variant">Ward</th>
                      <th className="px-4 py-3 label-caps text-on-surface-variant">Councillor</th>
                      <th className="px-4 py-3 label-caps text-on-surface-variant cursor-pointer hover:text-primary" onClick={() => toggleSort("wpi")}>
                        WPI <SortIcon k="wpi" />
                      </th>
                      <th className="px-4 py-3 label-caps text-on-surface-variant cursor-pointer hover:text-primary hidden sm:table-cell" onClick={() => toggleSort("resolution_rate")}>
                        Resolution <SortIcon k="resolution_rate" />
                      </th>
                      <th className="px-4 py-3 label-caps text-on-surface-variant hidden md:table-cell">SLA %</th>
                      <th className="px-4 py-3 label-caps text-on-surface-variant cursor-pointer hover:text-primary hidden md:table-cell" onClick={() => toggleSort("open_complaints")}>
                        Open <SortIcon k="open_complaints" />
                      </th>
                      <th className="px-4 py-3 label-caps text-on-surface-variant cursor-pointer hover:text-primary hidden lg:table-cell" onClick={() => toggleSort("economic_drag_daily_inr")}>
                        Daily Drag <SortIcon k="economic_drag_daily_inr" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {wards.map((w) => (
                      <WardRow
                        key={w.ward_name}
                        ward={w}
                        rep={repByWard[w.ward_name] ?? null}
                      />
                    ))}
                    {wards.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-on-surface-variant">
                          No wards match your filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-on-surface-variant text-center">
            WPI = Resolution Rate (35%) + SLA Compliance (25%) + Response Speed (20%) + Citizen Confidence (20%).
            Councillor data: Delhi MCD elections, December 2022. Term ends 2027.
          </p>
        </div>
      </div>
    </div>
  );
}

function WardRow({
  ward: w,
  rep,
}: {
  ward: WardIntelligence;
  rep: { name: string; party: string; constituency: string | null } | null;
}) {
  const improving = w.wpi_change_30d > 0;
  const declining = w.wpi_change_30d < 0;

  return (
    <tr className="hover:bg-surface-dim/30 transition-colors">
      <td className="px-4 py-3 text-on-surface-variant text-sm font-mono tabular-nums">#{w.wpi_rank}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-on-surface">{w.ward_name}</p>
        {w.district_name && <p className="label-caps text-on-surface-variant">{w.district_name}</p>}
      </td>
      <td className="px-4 py-3">
        {rep ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-on-surface-variant shrink-0" />
              <span className="text-sm text-on-surface truncate max-w-[120px]">{rep.name}</span>
            </div>
            <PartyBadge party={rep.party} />
          </div>
        ) : (
          <span className="text-on-surface-variant text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <WPIBadge grade={w.wpi_grade} />
          <div>
            <p className="text-sm font-bold tabular-nums">{w.wpi}</p>
            <div className="w-16 h-1 bg-surface-container mt-0.5">
              <div
                className={w.wpi >= 65 ? "h-full bg-success" : w.wpi >= 50 ? "h-full bg-primary" : w.wpi >= 35 ? "h-full bg-warning" : "h-full bg-destructive"}
                style={{ width: `${w.wpi}%` }}
              />
            </div>
          </div>
          {improving && <TrendingUp className="h-3.5 w-3.5 text-success" />}
          {declining && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={`text-sm font-semibold tabular-nums ${w.resolution_rate >= 70 ? "text-success" : w.resolution_rate >= 40 ? "text-warning" : "text-destructive"}`}>
          {w.resolution_rate.toFixed(0)}%
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className={`text-sm tabular-nums ${w.sla_compliance_rate >= 70 ? "text-success" : w.sla_compliance_rate >= 40 ? "text-warning" : "text-destructive"}`}>
          {w.sla_compliance_rate.toFixed(0)}%
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className={`text-sm font-medium tabular-nums ${w.open_complaints >= 20 ? "text-destructive" : w.open_complaints >= 10 ? "text-warning" : "text-on-surface"}`}>
          {w.open_complaints}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-sm text-destructive font-medium tabular-nums">
          {w.economic_drag_daily_inr > 0 ? formatInr(w.economic_drag_daily_inr) : "—"}
        </span>
      </td>
    </tr>
  );
}
