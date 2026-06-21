"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Hourglass,
  ArrowUpCircle,
  Repeat,
  Users2,
  ShieldAlert,
  ArrowRight,
  ScanLine,
} from "lucide-react";
import { PageHeader, Skeleton, Badge, cn } from "@dcos/ui";
import {
  useKpis,
  usePendency,
  useEscalationPyramid,
  useRootCause,
  useAuditSample,
  useLeaderboard,
} from "@/lib/hooks";

export default function ControlRoom() {
  const { data: kpis } = useKpis();

  return (
    <div className="space-y-8">
      <PageHeader
        title="State Grievance Control Room"
        description="One screen for the whole state — where cases rot, who is sitting on them, and which promises are being kept."
      />

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border divide-x divide-border bg-card">
        {[
          { label: "Open grievances", value: kpis?.total_open, accent: "" },
          { label: "Breaching SLA", value: kpis?.sla_breaches_active, accent: "text-destructive" },
          { label: "Filed today", value: kpis?.filed_today, accent: "" },
          { label: "Resolved today", value: kpis?.resolved_today, accent: "text-success" },
        ].map((k) => (
          <div key={k.label} className="px-5 py-5">
            <p className="label-caps text-muted-foreground">{k.label}</p>
            <p className={cn("mt-2 text-4xl font-bold tabular-nums leading-none", k.accent || "text-foreground")}>
              {k.value ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <PendencyPyramid />

      <div className="grid gap-8 lg:grid-cols-2">
        <EscalationPyramidPanel />
        <RootCausePanel />
      </div>

      <ClaimVsTruth />
      <QualityAudit />
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHead({ icon: Icon, title, sub }: { icon: typeof Hourglass; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <Icon className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

// ── Pendency pyramid (state-wide aging) ───────────────────────────────────────

function PendencyPyramid() {
  const { data, isLoading } = usePendency();
  const max = Math.max(1, ...(data?.buckets.map((b) => b.count) ?? [1]));

  return (
    <section>
      <SectionHead
        icon={Hourglass}
        title="Pendency by age"
        sub="The metric the public judges. Long bands are cases the system is forgetting."
      />
      {isLoading ? (
        <Skeleton className="h-44 rounded-none" />
      ) : (
        <div className="border border-border bg-card divide-y divide-border">
          {data?.buckets.map((b, i) => {
            const danger = i >= 2;
            return (
              <div key={b.label} className="flex items-center gap-4 px-5 py-3">
                <div className="w-24 shrink-0 label-caps text-muted-foreground">{b.label}</div>
                <div className="flex-1 h-7 bg-muted/50 relative overflow-hidden">
                  <div
                    className={cn("h-full", danger ? "bg-destructive/80" : "bg-primary/80")}
                    style={{ width: `${(b.count / max) * 100}%` }}
                  />
                </div>
                <div className="w-32 shrink-0 text-right">
                  <span className="text-lg font-bold tabular-nums text-foreground">{b.count}</span>
                  {b.breached > 0 && (
                    <span className="ml-2 label-caps text-destructive">{b.breached} late</span>
                  )}
                </div>
              </div>
            );
          })}
          {data && (
            <div className="px-5 py-2.5 bg-surface-dim/40 text-xs text-muted-foreground">
              {data.total_open} open · oldest pending {data.oldest_days ?? 0} days
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Escalation pyramid ────────────────────────────────────────────────────────

function EscalationPyramidPanel() {
  const { data, isLoading } = useEscalationPyramid();
  const max = Math.max(1, ...(data?.levels.map((l) => l.count) ?? [1]));

  return (
    <section>
      <SectionHead
        icon={ArrowUpCircle}
        title="Escalation pyramid"
        sub="Who is sitting on what. A heavy top means seniors are the bottleneck."
      />
      {isLoading ? (
        <Skeleton className="h-56 rounded-none" />
      ) : (
        <div className="border border-border bg-card divide-y divide-border">
          {data?.levels
            .slice()
            .reverse()
            .map((l) => (
              <div key={l.level} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-28 shrink-0">
                  <p className="text-sm font-medium text-foreground">{l.label}</p>
                  <p className="label-caps text-muted-foreground">Level {l.level}</p>
                </div>
                <div className="flex-1 h-6 bg-muted/50 relative overflow-hidden">
                  <div
                    className={cn("h-full", l.level >= 2 ? "bg-destructive/70" : "bg-primary/60")}
                    style={{ width: `${(l.count / max) * 100}%` }}
                  />
                </div>
                <div className="w-16 shrink-0 text-right">
                  <span className="text-base font-bold tabular-nums text-foreground">{l.count}</span>
                </div>
              </div>
            ))}
          {data && (
            <div className="px-5 py-2.5 bg-surface-dim/40 text-xs text-muted-foreground">
              {data.total_escalated} cases above field level
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Root-cause panel ──────────────────────────────────────────────────────────

function RootCausePanel() {
  const { data, isLoading } = useRootCause();

  return (
    <section>
      <SectionHead
        icon={ScanLine}
        title="Root cause"
        sub="Stop firefighting symptoms. Fix the source — clusters, categories, staffing."
      />
      {isLoading ? (
        <Skeleton className="h-56 rounded-none" />
      ) : (
        <div className="border border-border bg-card divide-y divide-border">
          {/* Repeat clusters */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="label-caps text-muted-foreground">Repeat clusters — one fix clears many</p>
            </div>
            {data?.repeat_clusters.length ? (
              <ul className="space-y-1.5">
                {data.repeat_clusters.slice(0, 4).map((c) => (
                  <li key={c.cluster_id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">
                      {c.category ?? "Mixed"}{c.ward_name ? ` · ${c.ward_name}` : ""}
                    </span>
                    <Badge variant={c.open_count > 0 ? "error" : "default"}>
                      {c.count}× ({c.open_count} open)
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No significant repeat clusters.</p>
            )}
          </div>

          {/* Category breaches */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="label-caps text-muted-foreground">Worst categories by breach rate</p>
            </div>
            <ul className="space-y-1.5">
              {data?.category_breaches.slice(0, 4).map((c) => (
                <li key={c.category} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{c.category}</span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      c.breach_rate >= 50 ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {c.breach_rate}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Staffing gaps */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="label-caps text-muted-foreground">Understaffed departments (load / officer)</p>
            </div>
            <ul className="space-y-1.5">
              {data?.staffing_gaps.slice(0, 4).map((s) => (
                <li key={s.department} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{s.department}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.open_load} / {s.available_officers || 0}
                    {s.load_per_officer != null && (
                      <span
                        className={cn(
                          "ml-2 font-medium",
                          s.load_per_officer > 20 ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {s.load_per_officer}×
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Claim vs Truth ────────────────────────────────────────────────────────────

function ClaimVsTruth() {
  const { data, isLoading } = useLeaderboard();

  return (
    <section>
      <SectionHead
        icon={ShieldAlert}
        title="Claim vs Truth"
        sub="The SLA each department promises, next to the time it actually takes. The gap is the story."
      />
      {isLoading ? (
        <Skeleton className="h-72 rounded-none" />
      ) : (
        <div className="border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border">
                  <th className="px-4 py-3 label-caps text-muted-foreground">Department</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">SLA promise</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">Actual avg</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.map((d) => {
                  const target = d.sla_target_hours;
                  const actual = d.avg_resolution_hours;
                  const overdue = target != null && actual != null && actual > target;
                  return (
                    <tr key={d.department} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{d.department}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                        {target != null ? `${target}h` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        <span className={overdue ? "font-semibold text-destructive" : "text-foreground"}>
                          {actual != null ? `${actual}h` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {target == null || actual == null ? (
                          <span className="text-xs text-muted-foreground">No data</span>
                        ) : overdue ? (
                          <Badge variant="error" dot>
                            {Math.round((actual / target - 1) * 100)}% over
                          </Badge>
                        ) : (
                          <Badge variant="success" dot>On promise</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ── 5% Quality Audit ──────────────────────────────────────────────────────────

function QualityAudit() {
  const { data, isLoading } = useAuditSample(20);
  const router = useRouter();

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <SectionHead
          icon={ScanLine}
          title="Quality audit"
          sub="A random sample of closed cases, re-checked for proof. Flags closures that may be fake."
        />
        <Link
          href="/cm/reports"
          className="label-caps text-primary hover:underline flex items-center gap-1 mb-1"
        >
          Reports <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 rounded-none" />
      ) : (
        <div className="border border-border bg-card overflow-hidden">
          {data && data.flagged_count > 0 && (
            <div className="px-4 py-2.5 bg-destructive/5 border-b border-destructive/20 text-sm">
              <span className="font-semibold text-destructive">{data.flagged_count}</span>{" "}
              <span className="text-foreground">
                of {data.sample_size} sampled closures are missing proof — audit these officers.
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border">
                  <th className="px-4 py-3 label-caps text-muted-foreground">Tracking ID</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground">Department</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">Resolved in</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-center">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.rows.map((r) => (
                  <tr
                    key={r.grievance_id}
                    onClick={() => router.push(`/officer/grievance/${r.grievance_id}`)}
                    className={cn(
                      "transition-colors cursor-pointer",
                      r.flagged ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/40"
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{r.tracking_id}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{r.department ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                      {r.resolution_hours != null ? `${r.resolution_hours}h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.proof_complete ? (
                        <Badge variant="success" dot>Complete</Badge>
                      ) : (
                        <Badge variant="error" dot>
                          {!r.has_before_proof && !r.has_after_proof
                            ? "None"
                            : !r.has_after_proof
                              ? "No after"
                              : "No before"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
