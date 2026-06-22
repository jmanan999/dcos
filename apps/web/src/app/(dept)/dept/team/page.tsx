"use client";

import { Users, ArrowRight, Flame, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  PageHeader,
  Skeleton,
  EmptyState,
  Badge,
  Button,
  cn,
  useToast,
} from "@dcos/ui";
import { useWorkload, useBurnoutScores, type OfficerBurnoutScore } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

const RISK_CONFIG = {
  HIGH: {
    label: "High Risk",
    icon: Flame,
    cls: "text-destructive",
    bg: "bg-destructive/5 border-destructive/30",
  },
  MEDIUM: {
    label: "Watch",
    icon: AlertTriangle,
    cls: "text-warning",
    bg: "bg-warning/5 border-warning/30",
  },
  LOW: {
    label: "OK",
    icon: CheckCircle2,
    cls: "text-success",
    bg: "",
  },
};

function BurnoutBadge({ score }: { score: OfficerBurnoutScore | undefined }) {
  if (!score || score.risk_level === "LOW") return null;
  const cfg = RISK_CONFIG[score.risk_level];
  const Icon = cfg.icon;
  return (
    <span
      title={`Burnout score: ${score.burnout_score.toFixed(0)}/100. ${score.recommended_action ?? ""}`}
      className={`inline-flex items-center gap-1 text-label-caps font-bold px-1.5 py-0.5 border ${cfg.bg} ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export default function TeamWorkload() {
  const { data, isLoading, mutate } = useWorkload();
  const { data: burnout } = useBurnoutScores();
  const { toast } = useToast();

  const burnoutByOfficer = Object.fromEntries(
    (burnout?.officers ?? []).map((o) => [o.officer_id, o])
  );

  const toggleAvailability = async (officerId: string, next: boolean) => {
    try {
      await apiFetch(`/identity/officers/${officerId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: next }),
      });
      toast({ variant: "success", title: next ? "Marked available" : "Marked unavailable" });
      await mutate();
    } catch (e) {
      toast({ variant: "error", title: "Could not update", description: String(e) });
    }
  };

  const totalBreached = data?.reduce((s, o) => s + o.sla_breached, 0) ?? 0;
  const highRisk = burnout?.high_risk_count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Workload"
        description="Who is carrying what — and who is at burnout risk. Rebalance from the Assignment Desk."
        actions={
          <Link href="/dept/queue">
            <Button variant="outline">
              Assignment Desk <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />

      {/* Alert banners */}
      {highRisk > 0 && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-3">
          <Flame className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {highRisk} officer{highRisk !== 1 ? "s" : ""} at HIGH burnout risk
            </p>
            <p className="text-sm text-on-surface mt-0.5">
              {burnout?.top_overloaded_dept
                ? `${burnout.top_overloaded_dept} is the most overloaded department. `
                : ""}
              Redistribute cases now to prevent SLA breaches and false closures.
            </p>
          </div>
        </div>
      )}

      {totalBreached > 0 && (
        <div className="border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span>
            <strong className="text-warning">{totalBreached}</strong> SLA breaches across team.
            Reassign from overloaded officers below.
          </span>
        </div>
      )}

      {/* Burnout legend */}
      {burnout && burnout.total_officers > 0 && (
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="text-label-caps text-on-surface-variant">Burnout Risk:</span>
          <span className="flex items-center gap-1 text-destructive font-bold">
            <Flame className="h-3.5 w-3.5" /> {burnout.high_risk_count} High
          </span>
          <span className="flex items-center gap-1 text-warning font-bold">
            <AlertTriangle className="h-3.5 w-3.5" /> {burnout.medium_risk_count} Watch
          </span>
          <span className="flex items-center gap-1 text-success font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" /> {burnout.total_officers - burnout.high_risk_count - burnout.medium_risk_count} OK
          </span>
          <span className="text-label-caps text-on-surface-variant ml-2">
            Score = caseload 30% + breach rate 40% + CSAT trend 30%
          </span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-80 rounded-none" />
      ) : !data || data.length === 0 ? (
        <div className="border border-outline-variant bg-white p-10">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No officers found"
            description="Your department has no officers, or you lack team-view access."
          />
        </div>
      ) : (
        <div className="border border-outline-variant bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-outline-variant">
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant">Officer</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant">Burnout Risk</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant">Availability</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant text-right">Open</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant text-right">In Progress</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant text-right">Breached</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant text-right">Avg Hrs</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.map((o) => {
                  const bScore = burnoutByOfficer[o.officer_id];
                  const isHigh = bScore?.risk_level === "HIGH";
                  return (
                    <tr
                      key={o.officer_id}
                      className={cn(
                        "hover:bg-surface-container-low transition-colors",
                        isHigh && "bg-destructive/3"
                      )}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-on-surface">
                        {o.officer_name ?? "—"}
                        {bScore?.avg_csat && (
                          <span className="ml-2 text-label-caps text-on-surface-variant">
                            CSAT {bScore.avg_csat.toFixed(1)}/5
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <BurnoutBadge score={bScore} />
                        {bScore && (
                          <span className="ml-1 text-label-caps text-on-surface-variant">
                            {bScore.burnout_score.toFixed(0)}/100
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleAvailability(o.officer_id, !o.is_available)}
                          title="Toggle availability"
                        >
                          <Badge variant={o.is_available ? "success" : "default"} dot>
                            {o.is_available ? "Available" : "Unavailable"}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-on-surface">
                        {o.total_assigned}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-on-surface">
                        {o.in_progress}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right text-sm tabular-nums",
                          o.sla_breached > 0 ? "font-semibold text-destructive" : "text-on-surface-variant"
                        )}
                      >
                        {o.sla_breached}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-on-surface-variant">
                        {o.avg_resolution_hours != null ? `${o.avg_resolution_hours}h` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isHigh && (
                          <Link href="/dept/queue">
                            <button className="flex items-center gap-1 text-label-caps text-primary hover:underline">
                              <RefreshCw className="h-3 w-3" />
                              Rebalance
                            </button>
                          </Link>
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

      {burnout && highRisk > 0 && (
        <div className="bg-surface-container border border-outline-variant p-4">
          <p className="text-label-caps text-on-surface-variant mb-1">How to rebalance</p>
          <p className="text-body-sm text-on-surface-variant">
            Go to <Link href="/dept/queue" className="text-primary hover:underline">Assignment Desk → In Progress tab</Link>,
            select cases from HIGH-risk officers and reassign them to officers with fewer open cases.
            Burnout scores update weekly every Monday.
          </p>
        </div>
      )}
    </div>
  );
}
