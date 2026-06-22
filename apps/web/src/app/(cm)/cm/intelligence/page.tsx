"use client";

import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Minus, PieChart, Save } from "lucide-react";
import { Skeleton } from "@dcos/ui";
import { useBudgetOutcomes, useBudgetAllocations, useDepartments, type BudgetOutcomeRow } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

const FISCAL_YEARS = ["2024-25", "2023-24", "2022-23"];
const PERIODS = ["Annual", "Q1", "Q2", "Q3", "Q4"];

const GRADE_CONFIG: Record<string, { label: string; cls: string; desc: string }> = {
  A: { label: "A", cls: "bg-success/10 text-success border-success/30", desc: ">20% fewer complaints" },
  B: { label: "B", cls: "bg-primary/10 text-primary border-primary/20", desc: "10–20% fewer" },
  C: { label: "C", cls: "bg-warning/10 text-warning border-warning/20", desc: "0–10% fewer" },
  D: { label: "D", cls: "bg-orange-50 text-orange-600 border-orange-200", desc: "0–10% more" },
  F: { label: "F", cls: "bg-destructive/10 text-destructive border-destructive/20", desc: ">10% more complaints" },
  NA: { label: "N/A", cls: "bg-surface-container text-on-surface-variant border-outline-variant", desc: "No data" },
};

function GradeBadge({ grade }: { grade: string }) {
  const cfg = GRADE_CONFIG[grade] ?? GRADE_CONFIG.NA;
  return (
    <span
      title={cfg.desc}
      className={`inline-flex h-8 w-8 items-center justify-center border text-sm font-black ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function ChangeCell({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-on-surface-variant">—</span>;
  const cls = pct < 0 ? "text-success" : pct === 0 ? "text-on-surface-variant" : "text-destructive";
  const Icon = pct < 0 ? TrendingDown : pct > 0 ? TrendingUp : Minus;
  return (
    <span className={`flex items-center gap-1 font-mono font-bold ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function OutcomeRow({ row }: { row: BudgetOutcomeRow }) {
  return (
    <tr className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
      <td className="p-4 text-body-sm text-on-surface font-medium">{row.department}</td>
      <td className="p-4 font-mono text-sm text-on-surface">
        {row.budget_allocated_crore != null ? `₹${row.budget_allocated_crore.toFixed(1)}Cr` : "—"}
      </td>
      <td className="p-4 font-mono text-sm text-on-surface-variant">{row.complaints_before}</td>
      <td className="p-4 font-mono text-sm text-on-surface-variant">{row.complaints_after}</td>
      <td className="p-4"><ChangeCell pct={row.change_pct} /></td>
      <td className="p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-label-caps text-on-surface-variant">Before: {
            row.economic_drag_before_lakh != null ? `₹${row.economic_drag_before_lakh.toFixed(1)}L/day` : "—"
          }</span>
          <span className="text-label-caps text-on-surface-variant">After: {
            row.economic_drag_after_lakh != null ? `₹${row.economic_drag_after_lakh.toFixed(1)}L/day` : "—"
          }</span>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <GradeBadge grade={row.roi_grade} />
          <span className="text-label-caps text-on-surface-variant hidden md:block">
            {GRADE_CONFIG[row.roi_grade]?.desc ?? ""}
          </span>
        </div>
      </td>
    </tr>
  );
}

function AddAllocationModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: depts } = useDepartments();
  const [form, setForm] = useState({
    department_id: "",
    fiscal_year: "2024-25",
    period: "Annual",
    amount_crore: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.department_id || !form.amount_crore) { setError("Fill required fields."); return; }
    setSaving(true);
    try {
      await apiFetch("/contracts/budget/allocations", {
        method: "POST",
        body: JSON.stringify({
          department_id: form.department_id,
          fiscal_year: form.fiscal_year,
          period: form.period,
          amount_crore: parseFloat(form.amount_crore),
          notes: form.notes || null,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const INPUT = "w-full border border-outline-variant bg-white px-3 py-2 text-body-sm focus:outline-none focus:border-primary";
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-outline-variant w-full max-w-md flex flex-col gap-4 p-6">
        <h2 className="text-headline-sm text-on-surface">Add Budget Allocation</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-label-caps text-on-surface-variant mb-1 block">Department *</label>
            <select className={INPUT} value={form.department_id} onChange={set("department_id")}>
              <option value="">Select…</option>
              {depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label-caps text-on-surface-variant mb-1 block">Fiscal Year *</label>
              <select className={INPUT} value={form.fiscal_year} onChange={set("fiscal_year")}>
                {FISCAL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label-caps text-on-surface-variant mb-1 block">Period *</label>
              <select className={INPUT} value={form.period} onChange={set("period")}>
                {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant mb-1 block">Amount (₹ Crore) *</label>
            <input className={INPUT} type="number" step="0.01" min="0" placeholder="e.g. 150.00" value={form.amount_crore} onChange={set("amount_crore")} />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant mb-1 block">Notes</label>
            <input className={INPUT} placeholder="Optional context…" value={form.notes} onChange={set("notes")} />
          </div>
        </div>
        {error && <p className="text-body-sm text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary text-label-md hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-outline-variant text-label-md text-on-surface-variant hover:bg-surface-container">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetIntelligencePage() {
  const [fy, setFy] = useState("2024-25");
  const [period, setPeriod] = useState("Annual");
  const [showModal, setShowModal] = useState(false);
  const { data: outcomes, isLoading, mutate } = useBudgetOutcomes(fy, period);
  const { data: allocations } = useBudgetAllocations(fy);

  const totalAllocated = allocations?.reduce((s, a) => s + a.amount_crore, 0) ?? 0;
  const aCount = outcomes?.rows.filter((r) => r.roi_grade === "A" || r.roi_grade === "B").length ?? 0;
  const fCount = outcomes?.rows.filter((r) => r.roi_grade === "F").length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {showModal && (
        <AddAllocationModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); mutate(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-headline-md text-on-surface">Budget Intelligence</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Did government spending actually reduce citizen complaints?
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary text-label-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Budget Allocation
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 p-4 bg-surface-container border border-outline-variant flex-wrap">
        <PieChart className="h-4 w-4 text-on-surface-variant" />
        <span className="text-label-caps text-on-surface-variant">Fiscal Year</span>
        <select
          className="border border-outline-variant bg-white px-3 py-1.5 text-body-sm focus:outline-none focus:border-primary"
          value={fy}
          onChange={(e) => setFy(e.target.value)}
        >
          {FISCAL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-label-caps text-on-surface-variant ml-2">Period</span>
        <select
          className="border border-outline-variant bg-white px-3 py-1.5 text-body-sm focus:outline-none focus:border-primary"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        <div className="bg-white border border-outline-variant p-5">
          <p className="text-label-caps text-on-surface-variant">Budget Allocated</p>
          <p className="text-headline-lg text-primary mt-1">₹{totalAllocated.toFixed(0)}Cr</p>
        </div>
        <div className="bg-white border border-outline-variant p-5">
          <p className="text-label-caps text-on-surface-variant">Departments Tracked</p>
          <p className="text-headline-lg text-on-surface mt-1">{outcomes?.rows.length ?? 0}</p>
        </div>
        <div className="bg-white border border-success/30 bg-success/5 p-5">
          <p className="text-label-caps text-success">Good ROI (A/B Grade)</p>
          <p className="text-headline-lg text-success mt-1">{aCount}</p>
        </div>
        <div className={`border p-5 ${fCount > 0 ? "bg-destructive/5 border-destructive/30" : "bg-white border-outline-variant"}`}>
          <p className={`text-label-caps ${fCount > 0 ? "text-destructive" : "text-on-surface-variant"}`}>
            Poor ROI (F Grade)
          </p>
          <p className={`text-headline-lg mt-1 ${fCount > 0 ? "text-destructive" : "text-on-surface"}`}>{fCount}</p>
        </div>
      </div>

      {/* Avg change banner */}
      {outcomes?.avg_complaint_change_pct !== undefined && outcomes.avg_complaint_change_pct !== null && (
        <div className={`flex items-center gap-3 p-4 border ${outcomes.avg_complaint_change_pct < 0 ? "bg-success/5 border-success/30" : "bg-warning/5 border-warning/30"}`}>
          {outcomes.avg_complaint_change_pct < 0
            ? <TrendingDown className="h-5 w-5 text-success" />
            : <TrendingUp className="h-5 w-5 text-warning" />}
          <p className="text-body-sm text-on-surface">
            <strong>Overall {fy} impact: </strong>
            Complaints changed by{" "}
            <strong className={outcomes.avg_complaint_change_pct < 0 ? "text-success" : "text-destructive"}>
              {outcomes.avg_complaint_change_pct > 0 ? "+" : ""}{outcomes.avg_complaint_change_pct.toFixed(1)}%
            </strong>{" "}
            on average across all departments receiving budget allocations.
            {outcomes.avg_complaint_change_pct > 5 && " Reallocation recommended — see red-flagged departments below."}
          </p>
        </div>
      )}

      {/* Grade key */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-label-caps text-on-surface-variant">ROI Grade:</span>
        {Object.entries(GRADE_CONFIG).filter(([k]) => k !== "NA").map(([grade, cfg]) => (
          <span key={grade} className={`text-label-caps px-2 py-0.5 border ${cfg.cls}`}>
            {grade} — {cfg.desc}
          </span>
        ))}
      </div>

      {/* Main table */}
      <div className="bg-white border border-outline-variant overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !outcomes?.rows.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <PieChart className="h-8 w-8 text-on-surface-variant" />
            <p className="text-body-sm text-on-surface-variant">
              No budget allocations for {fy} {period}. Add one using the button above.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim border-b border-outline-variant">
                <th className="p-4 text-label-caps text-on-surface-variant">Department</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Budget</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Complaints Before</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Complaints After</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Change</th>
                <th className="p-4 text-label-caps text-on-surface-variant">Economic Drag</th>
                <th className="p-4 text-label-caps text-on-surface-variant">ROI Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {outcomes.rows.map((row) => (
                <OutcomeRow key={row.department_id} row={row} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
