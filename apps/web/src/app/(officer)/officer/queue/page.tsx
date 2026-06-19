import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Queue" };

export default function OfficerQueuePage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">My Queue</h1>
      <p className="mt-2 text-sm text-slate-500">
        Assigned grievances with SLA countdowns — built in Epic 7
      </p>
    </div>
  );
}
