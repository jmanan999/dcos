import Link from "next/link";
import type { Metadata } from "next";
import { StatusBadge, Card, CardContent, Button, EmptyState } from "@dcos/ui";
import { SearchX, Clock } from "lucide-react";

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

type Timeline = { to_status: string; ts: string; note?: string; actor_role?: string }[];

async function fetchTracking(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/v1/intake/track/${id}`, { next: { revalidate: 30 } });
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
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title="Complaint not found"
          description={`Tracking ID ${id} does not exist. Check the ID and try again.`}
          action={
            <Link href="/track">
              <Button variant="outline">Try another ID</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const timeline = (data.timeline ?? []) as Timeline;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tracking ID</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-foreground">{data.tracking_id}</p>
            </div>
            <StatusBadge status={data.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
            {data.category && (
              <div>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">Category</p>
                <p className="mt-0.5 font-medium text-foreground">{data.category}</p>
              </div>
            )}
            {data.priority && (
              <div>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">Priority</p>
                <p className="mt-0.5 font-medium text-foreground">{data.priority}</p>
              </div>
            )}
            {data.sla_due_at && (
              <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                SLA due{" "}
                {new Date(data.sla_due_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="py-5">
          <h2 className="text-sm font-semibold text-foreground">Status timeline</h2>
          <ol className="mt-5 space-y-0">
            {timeline.map((event, i) => {
              const isLast = i === timeline.length - 1;
              return (
                <li key={i} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ring-4 ring-card ${isLast ? "bg-primary" : "bg-primary/40"}`}
                    />
                    {!isLast && <span className="my-0.5 w-px flex-1 bg-border" />}
                  </div>
                  <div className={isLast ? "pb-1" : "pb-6"}>
                    <p className="text-sm font-medium text-foreground">
                      {STATUS_LABELS[event.to_status] ?? event.to_status}
                    </p>
                    {event.note && <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>}
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {new Date(event.ts).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {event.actor_role && ` · ${event.actor_role}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Resolution actions */}
      {data.status === "RESOLVED" && (
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-foreground">Is your complaint resolved?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Confirm to close it, or reopen if the issue persists.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href={`/track/${id}/feedback`}>
                <Button variant="success">Yes, rate & close</Button>
              </Link>
              <Link href={`/track/${id}/reopen`}>
                <Button variant="outline">No, reopen</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link href="/file" className="text-sm text-muted-foreground underline hover:text-foreground">
          File another complaint
        </Link>
      </div>
    </div>
  );
}
