"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import { Skeleton, Badge } from "@dcos/ui";
import { useContracts, type ContractRead } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-primary/10 text-primary" },
  completed: { label: "Completed", cls: "bg-success/10 text-success" },
  terminated: { label: "Terminated", cls: "bg-destructive/10 text-destructive" },
};

const RISK_CONFIG = {
  green: { icon: CheckCircle2, cls: "text-success", label: "Good" },
  yellow: { icon: TrendingUp, cls: "text-warning", label: "Watch" },
  red: { icon: AlertTriangle, cls: "text-destructive", label: "Flagged" },
};

function formatLakh(n: number) {
  return `₹${n.toFixed(1)}L`;
}

function SpikeIndicator({ spike }: { spike: number | null }) {
  if (spike === null) return <span className="text-on-surface-variant">—</span>;
  const cls = spike > 150 ? "text-destructive" : spike > 75 ? "text-warning" : "text-success";
  const Icon = spike > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 font-mono ${cls}`}>
      <Icon className="h-3 w-3" />
      {spike > 0 ? "+" : ""}{spike.toFixed(1)}%
    </span>
  );
}

function ContractRow({ c, onCorrelate }: { c: ContractRead; onCorrelate: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const spike = c.performance?.spike_pct ?? null;
  const flagged = c.performance?.is_flagged ?? false;
  const cfg = RISK_CONFIG[flagged ? "red" : spike !== null && spike > 75 ? "yellow" : "green"];
  const Icon = cfg.icon;

  return (
    <>
      <tr
        className="border-b border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="p-4 w-8">
          {expanded
            ? <ChevronDown className="h-4 w-4 text-on-surface-variant" />
            : <ChevronRight className="h-4 w-4 text-on-surface-variant" />}
        </td>
        <td className="p-4">
          <p className="text-sm font-semibold text-on-surface">{c.contractor_name}</p>
          {c.gst_number && (
            <p className="text-label-caps text-on-surface-variant">GST: {c.gst_number}</p>
          )}
        </td>
        <td className="p-4 text-body-sm text-on-surface">{c.department_name ?? "—"}</td>
        <td className="p-4 text-body-sm text-on-surface capitalize">{c.contract_type}</td>
        <td className="p-4 font-mono text-sm text-on-surface">{formatLakh(c.value_lakh)}</td>
        <td className="p-4 text-body-sm text-on-surface-variant">
          {c.start_date} {c.end_date ? `→ ${c.end_date}` : "→ ongoing"}
        </td>
        <td className="p-4">
          <span className={`text-label-caps font-bold px-2 py-0.5 rounded ${STATUS_LABEL[c.status]?.cls ?? ""}`}>
            {STATUS_LABEL[c.status]?.label ?? c.status}
          </span>
        </td>
        <td className="p-4">
          <SpikeIndicator spike={spike} />
        </td>
        <td className="p-4">
          <span className={`flex items-center gap-1 text-label-caps font-bold ${cfg.cls}`}>
            <Icon className="h-4 w-4" />
            {cfg.label}
          </span>
        </td>
        <td className="p-4" onClick={(e) => e.stopPropagation()}>
          {c.status === "completed" && (
            <button
              onClick={() => onCorrelate(c.id)}
              className="text-label-caps text-primary hover:underline"
            >
              Run Analysis
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-dim/30 border-b border-outline-variant">
          <td colSpan={10} className="px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-label-caps text-on-surface-variant">Tender ID</p>
                <p className="font-mono">{c.tender_id ?? "—"}</p>
              </div>
              <div>
                <p className="text-label-caps text-on-surface-variant">Wards Covered</p>
                <p>{c.ward_ids.length > 0 ? `${c.ward_ids.length} wards` : "All"}</p>
              </div>
              {c.performance && (
                <>
                  <div>
                    <p className="text-label-caps text-on-surface-variant">Baseline Rate</p>
                    <p className="font-mono">{c.performance.baseline_weekly_rate?.toFixed(2) ?? "—"} /week</p>
                  </div>
                  <div>
                    <p className="text-label-caps text-on-surface-variant">Post-Work Rate</p>
                    <p className="font-mono">{c.performance.post_work_weekly_rate?.toFixed(2) ?? "—"} /week</p>
                  </div>
                  <div>
                    <p className="text-label-caps text-on-surface-variant">Economic Waste</p>
                    <p className="font-mono text-destructive">
                      {c.performance.economic_waste_lakh
                        ? formatLakh(c.performance.economic_waste_lakh)
                        : "—"}
                    </p>
                  </div>
                </>
              )}
              {c.notes && (
                <div className="col-span-2">
                  <p className="text-label-caps text-on-surface-variant">Notes</p>
                  <p>{c.notes}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ContractorsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: contracts, isLoading, mutate } = useContracts(
    statusFilter !== "all" ? statusFilter : undefined
  );
  const [correlating, setCorrelating] = useState<string | null>(null);

  const handleCorrelate = async (id: string) => {
    setCorrelating(id);
    try {
      await apiFetch(`/contracts/${id}/correlate`, { method: "POST" });
      await mutate();
    } catch {
      // silently fail; user can retry
    } finally {
      setCorrelating(null);
    }
  };

  const flaggedCount = contracts?.filter((c) => c.performance?.is_flagged).length ?? 0;
  const totalValue = contracts?.reduce((s, c) => s + c.value_lakh, 0) ?? 0;
  const completed = contracts?.filter((c) => c.status === "completed").length ?? 0;

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md text-on-surface">Contractor Accountability</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Every government contract linked to its post-work complaint impact
          </p>
        </div>
        <Link href="/cm/contractors/new">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-label-md hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Add Contract
          </button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        <div className="bg-white border border-outline-variant p-5">
          <p className="text-label-caps text-on-surface-variant">Total Contracts</p>
          <p className="text-headline-lg text-primary mt-1">{contracts?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-outline-variant p-5">
          <p className="text-label-caps text-on-surface-variant">Total Value</p>
          <p className="text-headline-lg text-on-surface mt-1">{formatLakh(totalValue)}</p>
        </div>
        <div className="bg-white border border-outline-variant p-5">
          <p className="text-label-caps text-on-surface-variant">Completed</p>
          <p className="text-headline-lg text-success mt-1">{completed}</p>
        </div>
        <div className={`border p-5 ${flaggedCount > 0 ? "bg-destructive/5 border-destructive/30" : "bg-white border-outline-variant"}`}>
          <p className={`text-label-caps ${flaggedCount > 0 ? "text-destructive" : "text-on-surface-variant"}`}>
            Flagged Contractors
          </p>
          <p className={`text-headline-lg mt-1 ${flaggedCount > 0 ? "text-destructive" : "text-on-surface"}`}>
            {flaggedCount}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant">
        {["all", "active", "completed", "terminated"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-label-md border-b-2 transition-colors capitalize ${
              statusFilter === s
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-outline-variant overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !contracts || contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Briefcase className="h-8 w-8 text-on-surface-variant" />
            <p className="text-body-sm text-on-surface-variant">No contracts found.</p>
            <Link href="/cm/contractors/new">
              <button className="mt-2 px-4 py-2 border border-primary text-primary text-label-md hover:bg-primary/5">
                Add your first contract
              </button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim border-b border-outline-variant">
                <th className="p-4 w-8"></th>
                <th className="p-4 text-label-caps text-on-surface-variant">Contractor</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Department</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Type</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Value</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Period</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Status</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Complaint Spike</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Risk</th>
                <th className="p-4 text-label-caps text-on-surface-variant"></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <ContractRow
                  key={c.id}
                  c={c}
                  onCorrelate={correlating === c.id ? () => {} : handleCorrelate}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Public scorecard link */}
      <div className="flex items-center justify-between p-4 bg-surface-container border border-outline-variant">
        <div>
          <p className="text-label-md font-semibold text-on-surface">Public Contractor Scorecard</p>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Visible to all citizens at /transparency/contractors
          </p>
        </div>
        <Link href="/transparency/contractors" target="_blank">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-label-md text-on-surface hover:bg-surface-container-high">
            <Download className="h-4 w-4" />
            View Public Page
          </button>
        </Link>
      </div>
    </div>
  );
}
