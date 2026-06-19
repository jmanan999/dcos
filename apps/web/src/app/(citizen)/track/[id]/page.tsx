import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Track Complaint" };

type Props = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  CLASSIFIED: "Categorised",
  ASSIGNED: "Assigned to Officer",
  IN_PROGRESS: "In Progress",
  ACTION_TAKEN: "Action Taken",
  RESOLVED: "Resolved",
  VERIFIED: "Verified",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  ESCALATED: "Escalated",
  REJECTED_SPAM: "Not accepted",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-slate-100 text-slate-600",
  CLASSIFIED: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  ACTION_TAKEN: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-emerald-100 text-emerald-700",
  ESCALATED: "bg-red-100 text-red-700",
  REOPENED: "bg-red-100 text-red-700",
  REJECTED_SPAM: "bg-slate-100 text-slate-500",
};

async function fetchTracking(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/v1/intake/track/${id}`, {
      next: { revalidate: 30 }, // refresh every 30s
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  const data = await fetchTracking(id);

  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium text-red-600">Complaint not found</p>
        <p className="mt-1 text-xs text-slate-500">
          Tracking ID <span className="font-mono">{id}</span> does not exist. Check the ID and try again.
        </p>
        <Link href="/" className="mt-4 inline-block text-xs text-brand-500 underline">
          ← File a new complaint
        </Link>
      </div>
    );
  }

  const currentLabel = STATUS_LABELS[data.status] ?? data.status;
  const currentColor = STATUS_COLORS[data.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500">Tracking ID</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-slate-900">{data.tracking_id}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${currentColor}`}>
            {currentLabel}
          </span>
        </div>

        {data.category && (
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-medium">Category:</span> {data.category}
          </p>
        )}
        {data.sla_due_at && (
          <p className="mt-1 text-xs text-slate-500">
            SLA due:{" "}
            {new Date(data.sla_due_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">Status Timeline</h2>
        <ol className="mt-4 space-y-4">
          {(data.timeline as { to_status: string; ts: string; note?: string; actor_role?: string }[]).map((event, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${i === data.timeline.length - 1 ? "bg-brand-500" : "bg-slate-300"}`} />
                {i < data.timeline.length - 1 && (
                  <div className="mt-1 h-full w-0.5 bg-slate-100" />
                )}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-slate-900">
                  {STATUS_LABELS[event.to_status] ?? event.to_status}
                </p>
                {event.note && <p className="mt-0.5 text-xs text-slate-500">{event.note}</p>}
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(event.ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  {event.actor_role && ` · by ${event.actor_role}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      {data.status === "RESOLVED" && (
        <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-sm font-medium text-amber-800">Is your complaint resolved?</p>
          <div className="mt-3 flex gap-3">
            <Link
              href={`/track/${id}/feedback`}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white"
            >
              Yes, mark as closed
            </Link>
            <Link
              href={`/track/${id}/reopen`}
              className="rounded-lg bg-red-100 px-4 py-2 text-xs font-semibold text-red-700"
            >
              No, reopen
            </Link>
          </div>
        </div>
      )}

      <Link href="/" className="block text-center text-xs text-slate-400 underline">
        ← File another complaint
      </Link>
    </div>
  );
}
