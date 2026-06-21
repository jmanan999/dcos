"use client";

import Link from "next/link";
import { TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { StatusBadge, SeverityBadge, Skeleton, EmptyState } from "@dcos/ui";
import { useQueue } from "@/lib/hooks";

export default function OfficerDashboard() {
  const { data: queue, isLoading } = useQueue();

  const assigned   = queue?.filter((g) => g.status === "ASSIGNED").length ?? 0;
  const inProgress = queue?.filter((g) => g.status === "IN_PROGRESS").length ?? 0;
  const breached   = queue?.filter((g) => g.is_sla_breached).length ?? 0;
  const recent     = queue?.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-8">

      {/* KPI Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="bg-white border border-outline-variant p-6 flex flex-col gap-2">
          <span className="text-label-caps text-on-surface-variant">Assigned Cases</span>
          <div className="flex items-end justify-between">
            <span className="text-headline-lg text-primary">{assigned}</span>
            <span className="text-label-md text-green-600 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Active
            </span>
          </div>
        </div>

        <div className="bg-white border border-outline-variant p-6 flex flex-col gap-2">
          <span className="text-label-caps text-on-surface-variant">In-Progress</span>
          <div className="flex items-end justify-between">
            <span className="text-headline-lg text-primary">{inProgress}</span>
            <span className="text-label-md text-on-surface-variant">Live Tracking</span>
          </div>
        </div>

        <div className="bg-white border border-outline-variant border-l-4 border-l-[#ba1a1a] p-6 flex flex-col gap-2">
          <span className="text-label-caps text-[#ba1a1a]">SLA Breaches</span>
          <div className="flex items-end justify-between">
            <span className="text-headline-lg text-[#ba1a1a]">{breached}</span>
            <span className="text-label-md text-[#ba1a1a] flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Critical
            </span>
          </div>
        </div>

        <div className="bg-white border border-outline-variant p-6 flex flex-col gap-2">
          <span className="text-label-caps text-on-surface-variant">Total Open</span>
          <div className="flex flex-col gap-2">
            <span className="text-headline-lg text-primary">{queue?.length ?? 0}</span>
            <div className="w-full h-1.5 bg-surface-container-low overflow-hidden">
              <div
                className="h-full bg-primary-container"
                style={{ width: `${Math.min(100, ((queue?.length ?? 0) / 50) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

        {/* Grievance Queue — 2/3 */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-on-surface">Grievance Queue</h2>
            <Link href="/officer/queue">
              <button className="px-4 py-2 bg-surface-container text-primary text-label-md border border-outline-variant hover:bg-surface-container-high transition-colors">
                View All
              </button>
            </Link>
          </div>

          <div className="bg-white border border-outline-variant overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="Queue is clear"
                  description="No grievances assigned to you right now."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-dim border-b border-outline-variant">
                      <th className="p-4 text-label-caps text-on-surface-variant">Tracking ID</th>
                      <th className="p-4 text-label-caps text-on-surface-variant">Issue Type</th>
                      <th className="p-4 text-label-caps text-on-surface-variant">Severity</th>
                      <th className="p-4 text-label-caps text-on-surface-variant">Status</th>
                      <th className="p-4 text-label-caps text-on-surface-variant"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {recent.map((g) => (
                      <tr
                        key={g.id}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => (window.location.href = `/officer/grievance/${g.id}`)}
                      >
                        <td className="p-4 text-body-sm text-primary font-medium font-mono">
                          {g.tracking_id}
                        </td>
                        <td className="p-4 text-body-sm text-on-surface max-w-[180px] truncate">
                          {g.category ?? "Uncategorised"}
                        </td>
                        <td className="p-4">
                          {g.severity != null ? (
                            <SeverityBadge score={g.severity} />
                          ) : (
                            <span className="text-on-surface-variant">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={g.status as never} />
                        </td>
                        <td className="p-4">
                          <ArrowRight className="h-4 w-4 text-on-surface-variant" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Alerts panel — 1/3 */}
        <section className="flex flex-col gap-4">
          <h2 className="text-headline-sm text-on-surface">System Alerts</h2>
          <div className="flex-1 bg-white border border-outline-variant flex flex-col">
            <div className="p-4 border-b border-outline-variant bg-[#ffdad6]/10 flex gap-4">
              <AlertTriangle className="h-5 w-5 text-[#ba1a1a] shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-label-md font-bold text-[#ba1a1a] uppercase">SLA Warning</span>
                <p className="text-body-sm text-on-surface mt-1">
                  {breached} complaint{breached !== 1 ? "s" : ""} have breached their SLA deadline.
                </p>
                <span className="text-label-md text-on-surface-variant mt-2">Live</span>
              </div>
            </div>

            <div className="p-4 border-b border-outline-variant flex gap-4">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-label-md font-bold text-primary uppercase">Queue Status</span>
                <p className="text-body-sm text-on-surface mt-1">
                  {assigned} complaints assigned and awaiting claim.
                </p>
                <span className="text-label-md text-on-surface-variant mt-2">Updated now</span>
              </div>
            </div>

            <div className="flex-1 bg-surface-dim/30 flex items-center justify-center p-8 text-center">
              <p className="text-label-md text-on-surface-variant italic">No additional alerts</p>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
