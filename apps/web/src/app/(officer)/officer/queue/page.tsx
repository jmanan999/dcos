"use client";

import { useEffect, useState, useCallback } from "react";

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  ESCALATED: "bg-red-100 text-red-700",
  ACTION_TAKEN: "bg-purple-100 text-purple-700",
};

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "text-red-600 font-bold",
  HIGH: "text-orange-600 font-semibold",
  MEDIUM: "text-slate-700",
  LOW: "text-slate-400",
};

type QueueItem = {
  id: string;
  tracking_id: string;
  raw_text: string;
  category: string | null;
  severity: number | null;
  status: string;
  priority: string;
  sla_due_at: string | null;
  is_emergency: boolean;
  is_sla_breached: boolean;
  hours_until_breach: number | null;
  created_at: string;
};

function SLABadge({ item }: { item: QueueItem }) {
  if (!item.sla_due_at) return <span className="text-xs text-slate-400">No SLA</span>;
  if (item.is_sla_breached) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">BREACHED</span>;
  }
  const h = item.hours_until_breach ?? 0;
  const color = h < 4 ? "bg-red-50 text-red-600" : h < 24 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600";
  const label = h < 1 ? `${Math.round(h * 60)}m` : `${Math.round(h)}h`;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label} left</span>;
}

export default function OfficerQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [claiming, setClaiming] = useState<string | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const fetchQueue = useCallback(async () => {
    try {
      const token = localStorage.getItem("dcos_token");
      const r = await fetch(`${API}/api/v1/workforce/queue`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.ok) setQueue(await r.json());
    } catch {
      // silently fail — show stale data
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try {
      const token = localStorage.getItem("dcos_token");
      await fetch(`${API}/api/v1/workforce/grievances/${id}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchQueue();
    } finally {
      setClaiming(null);
    }
  };

  const displayed = filter === "ALL" ? queue : queue.filter((g) => g.status === filter);
  const breached = queue.filter((g) => g.is_sla_breached).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Queue</h1>
          <p className="text-xs text-slate-500">{queue.length} grievances · {breached} SLA breached</p>
        </div>
        <button onClick={fetchQueue} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "ASSIGNED", "IN_PROGRESS", "ESCALATED", "ACTION_TAKEN"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${
              filter === s ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Queue list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading queue…</div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl bg-white py-12 text-center ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">No grievances in queue</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((g) => (
            <div
              key={g.id}
              className={`rounded-xl bg-white p-4 ring-1 transition-shadow hover:shadow-sm ${
                g.is_emergency ? "ring-red-300" : "ring-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {g.is_emergency && (
                      <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                        EMERGENCY
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[g.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {g.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs ${PRIORITY_COLOR[g.priority] ?? ""}`}>{g.priority}</span>
                    {g.category && <span className="text-xs text-slate-500">{g.category}</span>}
                    <span className="font-mono text-xs text-slate-400">{g.tracking_id}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-800">{g.raw_text}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <SLABadge item={g} />
                  {g.severity != null && (
                    <span className="text-xs text-slate-400">Severity {g.severity}</span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {g.status === "ASSIGNED" && (
                  <button
                    onClick={() => handleClaim(g.id)}
                    disabled={claiming === g.id}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {claiming === g.id ? "Claiming…" : "Claim"}
                  </button>
                )}
                <a
                  href={`/officer/grievance/${g.id}`}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  Open →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
