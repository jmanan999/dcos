import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

export default function CMAnalyticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <p className="text-sm text-slate-400">
        Trends, hotspots, department scorecards, NL query copilot — built in Epic 9
      </p>
    </div>
  );
}
