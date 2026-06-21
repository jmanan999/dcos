"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Zap, ArrowUpCircle, Forward } from "lucide-react";
import {
  PageHeader,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  cn,
  useToast,
} from "@dcos/ui";
import { useDeptQueue, type DeptQueueItem } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { slaCountdown } from "@/lib/sla";

type Tab = "unassigned" | "assigned" | "breaching";

const UNASSIGNED = ["RECEIVED", "CLASSIFIED"];

export default function AssignmentDesk() {
  const { data: queue, isLoading, mutate } = useDeptQueue();
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("unassigned");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const all = queue ?? [];
    if (tab === "unassigned") return all.filter((g) => UNASSIGNED.includes(g.status));
    if (tab === "breaching") return all.filter((g) => g.is_sla_breached);
    return all.filter(
      (g) => !UNASSIGNED.includes(g.status) && !["CLOSED", "REJECTED_SPAM"].includes(g.status)
    );
  }, [queue, tab]);

  const counts = {
    unassigned: (queue ?? []).filter((g) => UNASSIGNED.includes(g.status)).length,
    assigned: (queue ?? []).filter(
      (g) => !UNASSIGNED.includes(g.status) && !["CLOSED", "REJECTED_SPAM"].includes(g.status)
    ).length,
    breaching: (queue ?? []).filter((g) => g.is_sla_breached).length,
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const assignOne = async (id: string) => {
    await apiFetch(`/routing/assign/${id}`, { method: "POST" });
  };

  const bulkAssign = async () => {
    setBusy(true);
    const ids = [...selected];
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await assignOne(id);
        ok++;
      } catch {
        fail++;
      }
    }
    toast({
      variant: fail ? "warning" : "success",
      title: `Assigned ${ok} case${ok !== 1 ? "s" : ""}`,
      description: fail ? `${fail} could not be auto-assigned (no available officer).` : undefined,
    });
    setSelected(new Set());
    await mutate();
    setBusy(false);
  };

  const single = async (id: string, fn: () => Promise<unknown>, label: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ variant: "success", title: label });
      await mutate();
    } catch (e) {
      toast({ variant: "error", title: "Action failed", description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignment Desk"
        description="Route incoming grievances to officers, rebalance breaching cases, and escalate what your team can't clear."
      />

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(
          [
            ["unassigned", "Unassigned", counts.unassigned],
            ["assigned", "Assigned", counts.assigned],
            ["breaching", "Breaching SLA", counts.breaching],
          ] as [Tab, string, number][]
        ).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setSelected(new Set());
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px",
              tab === key
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                key === "breaching" && count > 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {tab === "unassigned" && selected.size > 0 && (
        <div className="flex items-center justify-between border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm text-foreground">
            {selected.size} selected
          </span>
          <Button size="sm" onClick={bulkAssign} loading={busy}>
            <Zap className="h-4 w-4" /> Auto-assign selected
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96 rounded-none" />
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-card p-10">
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Nothing here"
            description={
              tab === "unassigned"
                ? "Every incoming grievance has been routed."
                : tab === "breaching"
                  ? "No cases are past SLA right now."
                  : "No active assignments."
            }
          />
        </div>
      ) : (
        <div className="border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border">
                  {tab === "unassigned" && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={(e) =>
                          setSelected(e.target.checked ? new Set(filtered.map((g) => g.id)) : new Set())
                        }
                        className="h-4 w-4 rounded-none border-input"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 label-caps text-muted-foreground">Tracking ID</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground">Issue</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">SLA</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((g) => (
                  <Row
                    key={g.id}
                    g={g}
                    tab={tab}
                    selected={selected.has(g.id)}
                    onToggle={() => toggle(g.id)}
                    onOpen={() => router.push(`/officer/grievance/${g.id}`)}
                    onAssign={() => single(g.id, () => assignOne(g.id), "Assigned")}
                    onReassign={() =>
                      single(
                        g.id,
                        () =>
                          apiFetch(
                            `/routing/reassign/${g.id}?reason=${encodeURIComponent("Rebalanced by nodal officer")}`,
                            { method: "POST" }
                          ),
                        "Reassigned"
                      )
                    }
                    onEscalate={() =>
                      single(
                        g.id,
                        () =>
                          apiFetch(`/workforce/grievances/${g.id}/escalate`, {
                            method: "POST",
                            body: JSON.stringify({ reason: "Escalated from assignment desk" }),
                          }),
                        "Escalated"
                      )
                    }
                    busy={busy}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  g,
  tab,
  selected,
  onToggle,
  onOpen,
  onAssign,
  onReassign,
  onEscalate,
  busy,
}: {
  g: DeptQueueItem;
  tab: Tab;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onAssign: () => void;
  onReassign: () => void;
  onEscalate: () => void;
  busy: boolean;
}) {
  const sla = slaCountdown(g.sla_due_at, g.is_sla_breached);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <tr className="hover:bg-muted/40 transition-colors">
      {tab === "unassigned" && (
        <td className="px-4 py-3" onClick={stop}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="h-4 w-4 rounded-none border-input"
          />
        </td>
      )}
      <td onClick={onOpen} className="px-4 py-3 font-mono text-xs font-medium text-primary cursor-pointer">
        {g.tracking_id}
      </td>
      <td onClick={onOpen} className="px-4 py-3 text-sm text-foreground max-w-[260px] truncate cursor-pointer">
        {g.category ?? "Uncategorised"}
        <span className="text-muted-foreground"> · {g.raw_text}</span>
      </td>
      <td className="px-4 py-3">
        <Badge variant={g.priority === "CRITICAL" || g.priority === "HIGH" ? "error" : "default"}>
          {g.priority}
        </Badge>
      </td>
      <td className={cn("px-4 py-3 text-right text-xs", sla.tone)}>{sla.label}</td>
      <td className="px-4 py-3 text-right" onClick={stop}>
        <div className="flex justify-end gap-1.5">
          {tab === "unassigned" ? (
            <Button size="sm" variant="outline" onClick={onAssign} disabled={busy}>
              <Zap className="h-3.5 w-3.5" /> Assign
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={onReassign} disabled={busy} title="Reassign">
                <Forward className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onEscalate}
                disabled={busy}
                title="Escalate"
                className="text-destructive"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
