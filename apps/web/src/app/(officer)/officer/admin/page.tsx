import type { Metadata } from "next";

export const metadata: Metadata = { title: "Officer Management" };

export default function OfficerAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Officer Management</h1>
        <p className="text-sm text-slate-500">
          Manage officers in your department — enable/disable, set capacity, review workload.
        </p>
      </div>

      {/* Officer list — wired to /api/v1/identity/officers in Epic 7 */}
      <div className="rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Department Officers</h2>
          <button
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
            disabled
          >
            + Add Officer
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {/* Placeholder rows — real data from /identity/officers in Epic 7 */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Officer {i}</p>
                  <p className="text-xs text-slate-500">Junior Engineer</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Available
                </span>
                <span className="text-xs text-slate-500">12 / 50 cases</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Live officer list, availability toggle, and case capacity — connected in Epic 7.
        Endpoint: <code className="font-mono">GET /api/v1/identity/officers</code>
      </p>
    </div>
  );
}
