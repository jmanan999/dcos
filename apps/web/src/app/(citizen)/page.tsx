import type { Metadata } from "next";

export const metadata: Metadata = { title: "File a Complaint" };

export default function CitizenHomePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">
          Apni shikayat darj karein
          <span className="ml-2 text-lg font-normal text-slate-500">File a Complaint</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Your complaint reaches the right department automatically — track it every step of the way.
        </p>
      </div>

      {/* Intake form — Epic 4 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-center text-sm text-slate-500">
          Complaint intake form — built in Epic 4
        </p>
      </div>
    </div>
  );
}
