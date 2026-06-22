"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  FileText,
} from "lucide-react";
import { Skeleton } from "@dcos/ui";
import { useDepartments, useBudgetAllocations, type SimulationResult } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

const GRADE_CONFIG: Record<string, { cls: string; desc: string }> = {
  A: { cls: "bg-success/10 text-success border-success/30", desc: "Exceptional ROI (>500%)" },
  B: { cls: "bg-primary/10 text-primary border-primary/20", desc: "Strong ROI (200–500%)" },
  C: { cls: "bg-warning/10 text-warning border-warning/20", desc: "Moderate ROI (50–200%)" },
  D: { cls: "bg-orange-50 text-orange-600 border-orange-200", desc: "Marginal ROI (0–50%)" },
  F: { cls: "bg-destructive/10 text-destructive border-destructive/20", desc: "Negative ROI" },
};

function GradeBadge({ grade }: { grade: string }) {
  const cfg = GRADE_CONFIG[grade] ?? GRADE_CONFIG.F;
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center border text-lg font-black ${cfg.cls}`}
      title={cfg.desc}
    >
      {grade}
    </span>
  );
}

function ChangeCell({ pct }: { pct: number }) {
  const cls = pct < 0 ? "text-success" : pct > 0 ? "text-destructive" : "text-on-surface-variant";
  const Icon = pct < 0 ? TrendingDown : pct > 0 ? TrendingUp : Minus;
  return (
    <span className={`flex items-center gap-1 font-mono font-bold ${cls}`}>
      <Icon className="h-4 w-4" />
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

export default function SimulatePage() {
  const { data: departments } = useDepartments();
  const { data: allocations } = useBudgetAllocations("2024-25");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [horizon, setHorizon] = useState(90);

  // Budget sliders: dept_id → proposed crore
  const [proposed, setProposed] = useState<Record<string, number>>({});

  // Seed sliders from budget allocations
  useEffect(() => {
    if (!departments || !allocations) return;
    const init: Record<string, number> = {};
    departments.forEach((d) => {
      const alloc = allocations.find((a) => a.department_id === d.id);
      init[d.id] = alloc?.amount_crore ?? 10;
    });
    setProposed(init);
  }, [departments, allocations]);

  const getCurrent = (deptId: string) => {
    const alloc = allocations?.find((a) => a.department_id === deptId);
    return alloc?.amount_crore ?? 10;
  };

  const totalCurrent = departments?.reduce((s, d) => s + getCurrent(d.id), 0) ?? 0;
  const totalProposed = Object.values(proposed).reduce((s, v) => s + v, 0);
  const totalShift = Math.abs(totalProposed - totalCurrent);

  const runSimulation = async () => {
    if (!departments) return;
    setRunning(true);
    try {
      const depts = departments.map((d) => ({
        dept_id: d.id,
        dept_name: d.name,
        current_crore: getCurrent(d.id),
        proposed_crore: proposed[d.id] ?? getCurrent(d.id),
      }));
      const res = await apiFetch<SimulationResult>("/analytics/simulate", {
        method: "POST",
        body: JSON.stringify({ departments: depts, horizon_days: horizon }),
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const generateBrief = () => {
    if (!result) return;
    const lines = [
      `POLICY SIMULATION BRIEF — ${new Date().toLocaleDateString("en-IN")}`,
      `Horizon: ${result.horizon_days} days | Budget shift: ₹${result.total_budget_shift_crore.toFixed(1)} Cr`,
      ``,
      `PROJECTED IMPACT`,
      `Average complaint change: ${result.projected_complaint_change_pct > 0 ? "+" : ""}${result.projected_complaint_change_pct.toFixed(1)}%`,
      `Net economic benefit: ₹${result.net_economic_benefit_lakh.toFixed(1)}L`,
      `ROI: ${result.roi_pct.toFixed(0)}% (Grade ${result.roi_grade})`,
      `Confidence: ${result.confidence.toUpperCase()}`,
      ``,
      `BEST CASE: ₹${result.best_case_benefit_lakh.toFixed(1)}L | WORST CASE: ₹${result.worst_case_benefit_lakh.toFixed(1)}L`,
      ``,
      `BY DEPARTMENT`,
      ...result.by_department.map(
        (d) =>
          `  ${d.dept_name}: ₹${d.current_crore.toFixed(1)}Cr → ₹${d.proposed_crore.toFixed(1)}Cr` +
          ` (${d.projected_complaint_change_pct > 0 ? "+" : ""}${d.projected_complaint_change_pct.toFixed(1)}% complaints)`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `policy-simulation-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-headline-md text-on-surface">Policy Simulator</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Model budget reallocation — see the projected impact on complaint volume and economic drag before committing
          </p>
        </div>
        {result && (
          <button
            onClick={generateBrief}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-label-md text-on-surface hover:bg-surface-container"
          >
            <FileText className="h-4 w-4" />
            Export CS Brief
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Sliders panel */}
        <div className="bg-white border border-outline-variant p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-3">
            <Sliders className="h-4 w-4 text-primary" />
            <h2 className="text-label-caps text-on-surface-variant">Proposed Budget Allocation</h2>
          </div>

          {/* Horizon */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <label className="text-label-caps text-on-surface-variant">Projection Horizon</label>
              <span className="text-label-caps text-primary font-bold">{horizon} days</span>
            </div>
            <input
              type="range"
              min={30} max={180} step={30}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-label-caps text-on-surface-variant">
              <span>30d</span><span>90d</span><span>180d</span>
            </div>
          </div>

          <div className="text-label-caps text-on-surface-variant border-t border-outline-variant pt-3">
            Adjust per-department budget (₹ Crore)
          </div>

          {!departments ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {departments.map((d) => {
                const current = getCurrent(d.id);
                const prop = proposed[d.id] ?? current;
                const diff = prop - current;
                return (
                  <div key={d.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-on-surface truncate max-w-[200px]">
                        {d.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-label-caps text-on-surface-variant">
                          was ₹{current.toFixed(0)}Cr
                        </span>
                        <span className={`text-sm font-bold font-mono ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-on-surface-variant"}`}>
                          ₹{prop.toFixed(0)}Cr
                          {diff !== 0 && ` (${diff > 0 ? "+" : ""}${diff.toFixed(0)})`}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0} max={Math.max(current * 3, 50)} step={1}
                      value={prop}
                      onChange={(e) =>
                        setProposed((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))
                      }
                      className="w-full accent-primary"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-outline-variant pt-3 flex items-center justify-between">
            <div>
              <p className="text-label-caps text-on-surface-variant">Total budget shift</p>
              <p className="text-headline-sm text-on-surface">₹{totalShift.toFixed(1)}Cr</p>
            </div>
            <button
              onClick={runSimulation}
              disabled={running || !departments}
              className="px-6 py-2.5 bg-primary text-on-primary text-label-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {running ? "Running…" : "Run Simulation"}
            </button>
          </div>
        </div>

        {/* Results panel */}
        <div className="bg-white border border-outline-variant p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-label-caps text-on-surface-variant">Projected Outcome</h2>
          </div>

          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center gap-3">
              <TrendingUp className="h-10 w-10 text-on-surface-variant" />
              <p className="text-body-sm text-on-surface-variant max-w-xs">
                Adjust the sliders and click <strong>Run Simulation</strong> to model the impact of your proposed budget reallocation.
              </p>
            </div>
          ) : (
            <>
              {/* Headline metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container p-4">
                  <p className="text-label-caps text-on-surface-variant">Net Benefit</p>
                  <p className={`text-2xl font-black mt-1 ${result.net_economic_benefit_lakh > 0 ? "text-success" : "text-destructive"}`}>
                    ₹{result.net_economic_benefit_lakh.toFixed(1)}L
                  </p>
                  <p className="text-label-caps text-on-surface-variant">over {result.horizon_days} days</p>
                </div>
                <div className="bg-surface-container p-4 flex items-center gap-3">
                  <GradeBadge grade={result.roi_grade} />
                  <div>
                    <p className="text-label-caps text-on-surface-variant">ROI Grade</p>
                    <p className="text-2xl font-black text-on-surface">{result.roi_pct.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="bg-surface-container p-4">
                  <p className="text-label-caps text-on-surface-variant">Avg Complaint Δ</p>
                  <ChangeCell pct={result.projected_complaint_change_pct} />
                </div>
                <div className="bg-surface-container p-4">
                  <p className="text-label-caps text-on-surface-variant">Confidence</p>
                  <p className={`text-sm font-bold mt-1 ${result.confidence === "medium" ? "text-warning" : "text-on-surface-variant"}`}>
                    {result.confidence.toUpperCase()}
                    {result.confidence === "low" && " — add budget data"}
                  </p>
                </div>
              </div>

              {/* Range */}
              <div className="flex items-center justify-between border border-outline-variant px-4 py-3">
                <div className="text-center">
                  <p className="text-label-caps text-success">Best Case</p>
                  <p className="text-lg font-bold text-success">₹{result.best_case_benefit_lakh.toFixed(1)}L</p>
                </div>
                <div className="h-8 w-px bg-outline-variant" />
                <div className="text-center">
                  <p className="text-label-caps text-on-surface-variant">Most Likely</p>
                  <p className="text-lg font-bold text-on-surface">₹{result.net_economic_benefit_lakh.toFixed(1)}L</p>
                </div>
                <div className="h-8 w-px bg-outline-variant" />
                <div className="text-center">
                  <p className="text-label-caps text-destructive">Worst Case</p>
                  <p className="text-lg font-bold text-destructive">₹{result.worst_case_benefit_lakh.toFixed(1)}L</p>
                </div>
              </div>

              {/* Per-dept breakdown */}
              <div>
                <p className="text-label-caps text-on-surface-variant mb-2">Department Breakdown</p>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {result.by_department
                    .sort((a, b) => a.projected_complaint_change_pct - b.projected_complaint_change_pct)
                    .map((d) => (
                      <div key={d.dept_name} className="flex items-center justify-between text-sm border border-outline-variant/50 px-3 py-2">
                        <span className="text-on-surface truncate max-w-[180px]">{d.dept_name}</span>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-on-surface-variant font-mono text-xs">
                            ₹{d.current_crore.toFixed(0)} → ₹{d.proposed_crore.toFixed(0)}Cr
                          </span>
                          <ChangeCell pct={d.projected_complaint_change_pct} />
                          <span className={`text-label-caps ${d.confidence === "medium" ? "text-success" : "text-on-surface-variant"}`}>
                            {d.confidence}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {result.roi_grade === "F" && (
                <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 p-3">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-body-sm text-destructive">
                    This reallocation is projected to <strong>increase</strong> complaints and economic drag.
                    Consider increasing budgets for high-volume departments instead.
                  </p>
                </div>
              )}

              {result.roi_grade === "A" && (
                <div className="flex items-start gap-2 bg-success/5 border border-success/30 p-3">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <p className="text-body-sm text-success">
                    Strong projected ROI. Export the Chief Secretary brief and submit for approval.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant p-4">
        <p className="text-label-caps text-on-surface-variant mb-1">Model methodology</p>
        <p className="text-body-sm text-on-surface-variant">
          Budget-complaint elasticity: estimated at -0.8 (10% budget increase → 8% complaint reduction) per NIPFP urban governance research.
          Departments with historical budget allocation data in this system use actual elasticity.
          Confidence is &ldquo;medium&rdquo; when actual data is used, &ldquo;low&rdquo; when using the default.
          Best/worst case reflects ±50% variance on the projected benefit.
        </p>
      </div>
    </div>
  );
}
