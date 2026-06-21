"use client";

import { Users, ArrowRight } from "lucide-react";
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
import { useWorkload } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

export default function TeamWorkload() {
  const { data, isLoading, mutate } = useWorkload();
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Workload"
        description="Who is carrying what — and who is drowning. Rebalance from the Assignment Desk."
        actions={
          <Link href="/dept/queue">
            <Button variant="outline">
              Assignment Desk <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />

      {totalBreached > 0 && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm">
          <span className="font-semibold text-destructive">{totalBreached}</span>{" "}
          <span className="text-foreground">
            SLA breaches are spread across the team. Reassign from overloaded officers below.
          </span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-80 rounded-none" />
      ) : !data || data.length === 0 ? (
        <div className="border border-border bg-card p-10">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No officers found"
            description="Your department has no officers, or you lack team-view access."
          />
        </div>
      ) : (
        <div className="border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border">
                  <th className="px-4 py-3 label-caps text-muted-foreground">Officer</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground">Availability</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">Open</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">In Progress</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">Breached</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">Avg Hrs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((o) => (
                  <tr key={o.officer_id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {o.officer_name ?? "—"}
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
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                      {o.total_assigned}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                      {o.in_progress}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right text-sm tabular-nums",
                        o.sla_breached > 0 ? "font-semibold text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {o.sla_breached}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                      {o.avg_resolution_hours != null ? `${o.avg_resolution_hours}h` : "—"}
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
