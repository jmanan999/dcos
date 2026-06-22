"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Download,
  Search,
  Briefcase,
} from "lucide-react";
import { Skeleton } from "@dcos/ui";
import { useContractorScorecard, type ContractorScorecardRow } from "@/lib/hooks";

const RISK_CONFIG = {
  red: {
    label: "High Risk",
    icon: AlertTriangle,
    bg: "bg-destructive/5",
    border: "border-destructive/30",
    text: "text-destructive",
    badge: "bg-destructive/10 text-destructive",
  },
  yellow: {
    label: "Watch",
    icon: TrendingUp,
    bg: "bg-warning/5",
    border: "border-warning/30",
    text: "text-warning",
    badge: "bg-warning/10 text-warning",
  },
  green: {
    label: "Good",
    icon: CheckCircle2,
    bg: "bg-white",
    border: "border-outline-variant",
    text: "text-success",
    badge: "bg-success/10 text-success",
  },
};

function downloadCSV(rows: ContractorScorecardRow[]) {
  const headers = [
    "Contractor Name", "GST", "Total Contracts", "Total Value (₹L)",
    "Avg Spike %", "Max Spike %", "Flagged Contracts", "Est. Waste (₹L)", "Risk",
  ];
  const lines = rows.map((r) => [
    `"${r.contractor_name}"`,
    r.gst_number ?? "",
    r.total_contracts,
    r.total_value_lakh.toFixed(2),
    r.avg_spike_pct?.toFixed(1) ?? "",
    r.max_spike_pct?.toFixed(1) ?? "",
    r.flagged_contracts,
    r.total_economic_waste_lakh.toFixed(2),
    r.risk_level.toUpperCase(),
  ].join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `delhi-contractor-scorecard-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SpikeCell({ spike }: { spike: number | null }) {
  if (spike === null) return <span className="text-on-surface-variant text-sm">Not yet evaluated</span>;
  const up = spike > 0;
  const cls = spike > 150 ? "text-destructive" : spike > 75 ? "text-warning" : "text-success";
  return (
    <span className={`flex items-center gap-1 font-mono font-bold ${cls}`}>
      {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      {up ? "+" : ""}{spike.toFixed(1)}%
    </span>
  );
}

function ContractorCard({ row }: { row: ContractorScorecardRow }) {
  const [open, setOpen] = useState(false);
  const cfg = RISK_CONFIG[row.risk_level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.green;
  const Icon = cfg.icon;

  return (
    <div className={`border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        <div className="mt-0.5">
          {open ? <ChevronDown className="h-4 w-4 text-on-surface-variant" /> : <ChevronRight className="h-4 w-4 text-on-surface-variant" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-body-sm font-semibold text-on-surface">{row.contractor_name}</h3>
            {row.gst_number && (
              <span className="text-label-caps text-on-surface-variant">GST: {row.gst_number}</span>
            )}
            <span className={`text-label-caps px-2 py-0.5 font-bold ${cfg.badge}`}>
              <Icon className="h-3 w-3 inline mr-1" />
              {cfg.label}
            </span>
            {row.flagged_contracts > 0 && (
              <span className="text-label-caps text-destructive font-bold">
                {row.flagged_contracts} flagged project{row.flagged_contracts !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="mt-2 flex gap-6 flex-wrap">
            <div>
              <p className="text-label-caps text-on-surface-variant">Projects</p>
              <p className="text-sm font-bold text-on-surface">{row.total_contracts}</p>
            </div>
            <div>
              <p className="text-label-caps text-on-surface-variant">Total Value</p>
              <p className="text-sm font-bold text-on-surface">₹{row.total_value_lakh.toFixed(1)}L</p>
            </div>
            <div>
              <p className="text-label-caps text-on-surface-variant">Avg Complaint Spike</p>
              <SpikeCell spike={row.avg_spike_pct ?? null} />
            </div>
            {row.total_economic_waste_lakh > 0 && (
              <div>
                <p className="text-label-caps text-on-surface-variant">Est. Waste</p>
                <p className="text-sm font-bold text-destructive">₹{row.total_economic_waste_lakh.toFixed(1)}L</p>
              </div>
            )}
          </div>
        </div>
      </button>

      {open && row.projects.length > 0 && (
        <div className="border-t border-outline-variant/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-dim">
                  <th className="px-4 py-2.5 text-label-caps text-on-surface-variant">Department</th>
                  <th className="px-4 py-2.5 text-label-caps text-on-surface-variant">Type</th>
                  <th className="px-4 py-2.5 text-label-caps text-on-surface-variant">Value</th>
                  <th className="px-4 py-2.5 text-label-caps text-on-surface-variant">Period</th>
                  <th className="px-4 py-2.5 text-label-caps text-on-surface-variant">Spike</th>
                  <th className="px-4 py-2.5 text-label-caps text-on-surface-variant">Waste Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {row.projects.map((p) => (
                  <tr key={p.contract_id} className={p.is_flagged ? "bg-destructive/3" : ""}>
                    <td className="px-4 py-2.5 text-on-surface">{p.department}</td>
                    <td className="px-4 py-2.5 capitalize text-on-surface-variant">{p.contract_type}</td>
                    <td className="px-4 py-2.5 font-mono text-on-surface">₹{p.value_lakh.toFixed(1)}L</td>
                    <td className="px-4 py-2.5 text-on-surface-variant text-xs">
                      {p.start_date}{p.end_date ? ` → ${p.end_date}` : ""}
                    </td>
                    <td className="px-4 py-2.5"><SpikeCell spike={p.spike_pct} /></td>
                    <td className="px-4 py-2.5 font-mono text-destructive">
                      {p.economic_waste_lakh != null ? `₹${p.economic_waste_lakh.toFixed(1)}L` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContractorsScorecardPage() {
  const { data, isLoading } = useContractorScorecard();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "red" | "yellow" | "green">("all");

  const filtered = useMemo(() => {
    if (!data?.contractors) return [];
    let list = data.contractors;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.contractor_name.toLowerCase().includes(q) || (c.gst_number ?? "").toLowerCase().includes(q)
      );
    }
    if (riskFilter !== "all") list = list.filter((c) => c.risk_level === riskFilter);
    return list;
  }, [data, search, riskFilter]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-headline-md text-on-surface">Delhi Contractor Scorecard</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Public accountability record — every Delhi government contractor ranked by post-work complaint impact
            </p>
          </div>
          {data && (
            <button
              onClick={() => downloadCSV(data.contractors)}
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-label-md text-on-surface hover:bg-surface-container transition-colors"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          )}
        </div>

        {/* Summary stats */}
        {data && (
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="bg-surface-container border border-outline-variant p-4">
              <p className="text-label-caps text-on-surface-variant">Contractors Tracked</p>
              <p className="text-headline-sm text-on-surface">{data.total_contractors}</p>
            </div>
            <div className={`border p-4 ${data.flagged_contractors > 0 ? "bg-destructive/5 border-destructive/30" : "bg-surface-container border-outline-variant"}`}>
              <p className={`text-label-caps ${data.flagged_contractors > 0 ? "text-destructive" : "text-on-surface-variant"}`}>
                Flagged (Spike &gt;150%)
              </p>
              <p className={`text-headline-sm ${data.flagged_contractors > 0 ? "text-destructive" : "text-on-surface"}`}>
                {data.flagged_contractors}
              </p>
            </div>
            <div className="bg-surface-container border border-outline-variant p-4">
              <p className="text-label-caps text-on-surface-variant">Est. Total Waste</p>
              <p className="text-headline-sm text-on-surface">₹{data.total_estimated_waste_lakh.toFixed(1)}L</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <input
            className="w-full border border-outline-variant bg-white pl-9 pr-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
            placeholder="Search contractor or GST…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 border border-outline-variant bg-white p-1">
          {(["all", "red", "yellow", "green"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 text-label-caps transition-colors ${
                riskFilter === r
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {r === "all" ? "All" : r === "red" ? "High Risk" : r === "yellow" ? "Watch" : "Good"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-outline-variant bg-white">
          <Briefcase className="h-8 w-8 text-on-surface-variant" />
          <p className="text-body-sm text-on-surface-variant">
            {data?.total_contractors === 0
              ? "No contract data available yet. Administrators can add contracts at /cm/contractors."
              : "No contractors match your filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <ContractorCard key={row.contractor_name} row={row} />
          ))}
        </div>
      )}

      <p className="text-label-caps text-on-surface-variant text-center">
        Data updated weekly · Spike % = complaints after work completion vs baseline ·
        &gt;150% spike flags contractor for review
      </p>
    </div>
  );
}
