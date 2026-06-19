"use client";

import { useEffect, useState } from "react";

type Officer = {
  officer_id: string;
  officer_name: string | null;
  department_id: string;
  total_assigned: number;
  in_progress: number;
  sla_breached: number;
  avg_resolution_hours: number | null;
  is_available: boolean;
};

export default function OfficerAdminPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    const token = localStorage.getItem("dcos_token");
    fetch(`${API}/api/v1/workforce/workload`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.json() : [])
      .then(setOfficers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Team Workload</h1>
        <p className="text-xs text-slate-500">Department officer summary — sorted by SLA risk</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
      ) : officers.length === 0 ? (
        <div className="rounded-xl bg-white py-12 text-center ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">No officers found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Officer", "Status", "Assigned", "In Progress", "SLA Breached", "Avg Resolution"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {officers.map((o) => (
                <tr key={o.officer_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{o.officer_name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      o.is_available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {o.is_available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.total_assigned}</td>
                  <td className="px-4 py-3 text-slate-700">{o.in_progress}</td>
                  <td className="px-4 py-3">
                    <span className={o.sla_breached > 0 ? "font-bold text-red-600" : "text-slate-400"}>
                      {o.sla_breached}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {o.avg_resolution_hours != null ? `${o.avg_resolution_hours}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
