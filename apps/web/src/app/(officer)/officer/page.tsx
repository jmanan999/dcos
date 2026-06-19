"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = { assigned: number; in_progress: number; sla_breached: number; resolved_today: number };

export default function OfficerDashboard() {
  const [stats, setStats] = useState<Stats>({ assigned: 0, in_progress: 0, sla_breached: 0, resolved_today: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const token = localStorage.getItem("dcos_token");
    fetch(`${API}/api/v1/workforce/queue`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((queue: { status: string; is_sla_breached: boolean }[]) => {
        setStats({
          assigned: queue.filter((g) => g.status === "ASSIGNED").length,
          in_progress: queue.filter((g) => g.status === "IN_PROGRESS").length,
          sla_breached: queue.filter((g) => g.is_sla_breached).length,
          resolved_today: 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tiles = [
    { label: "Assigned to me", value: stats.assigned, color: "text-blue-600", href: "/officer/queue" },
    { label: "In Progress", value: stats.in_progress, color: "text-amber-600", href: "/officer/queue" },
    { label: "SLA Breached", value: stats.sla_breached, color: "text-red-600", href: "/officer/queue" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-4">
        {tiles.map(({ label, value, color, href }) => (
          <Link key={label} href={href}
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-shadow">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${loading ? "text-slate-300" : color}`}>
              {loading ? "—" : value}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/officer/queue"
          className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-xl">📋</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">My Queue</p>
            <p className="text-xs text-slate-500">View & claim complaints</p>
          </div>
        </Link>
        <Link href="/officer/admin"
          className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl">👥</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Team Workload</p>
            <p className="text-xs text-slate-500">Dept overview & reassign</p>
          </div>
        </Link>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Token: <code className="font-mono">{typeof window !== "undefined" ? localStorage.getItem("dcos_token")?.slice(0, 20) + "…" : "—"}</code>
      </p>
    </div>
  );
}
