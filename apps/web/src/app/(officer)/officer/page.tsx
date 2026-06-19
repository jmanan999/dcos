import type { Metadata } from "next";

export const metadata: Metadata = { title: "Officer Dashboard" };

export default function OfficerDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Officer Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {["Assigned", "In Progress", "SLA Breached"].map((label) => (
          <div
            key={label}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">—</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500">Full officer console — built in Epic 7</p>
    </div>
  );
}
