import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public Transparency Dashboard — DCOS Delhi",
};

export default function PublicTransparencyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Delhi Transparency Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Anonymized, real-time view of civic grievances across Delhi.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-6">
        {["Complaints Filed", "Resolved", "Avg. Resolution Time"].map((label) => (
          <div key={label} className="rounded-xl bg-white p-5 shadow ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">—</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex h-72 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
        <p className="text-sm text-slate-400">Public hotspot map — built in Epic 8</p>
      </div>
    </div>
  );
}
