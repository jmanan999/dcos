"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, SearchX } from "lucide-react";
import { StatusBadge, Card, CardContent, Button, EmptyState, Skeleton } from "@dcos/ui";
import { useLanguage } from "@/lib/i18n";

type Timeline = { to_status: string; ts: string; note?: string; actor_role?: string }[];
type TrackData = {
  tracking_id: string;
  status: string;
  priority: string;
  category: string | null;
  sla_due_at: string | null;
  timeline: Timeline;
};

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/intake/track/${id}`, { next: { revalidate: 30 } } as RequestInit)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t("track.not_found_title")}
          description={`${t("track.id_label")} ${id} — ${t("track.not_found_desc")}`}
          action={
            <Link href="/track">
              <Button variant="outline">{t("track.try_another")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const timeline = data.timeline ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("track.id_label")}</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-foreground">{data.tracking_id}</p>
            </div>
            <StatusBadge status={data.status as never} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
            {data.category && (
              <div>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">{t("track.category")}</p>
                <p className="mt-0.5 font-medium text-foreground">{data.category}</p>
              </div>
            )}
            {data.priority && (
              <div>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">{t("track.priority")}</p>
                <p className="mt-0.5 font-medium text-foreground">{data.priority}</p>
              </div>
            )}
            {data.sla_due_at && (
              <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {t("track.sla")}{" "}
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
          <h2 className="text-sm font-semibold text-foreground">{t("track.timeline")}</h2>
          <ol className="mt-5 space-y-0">
            {timeline.map((event, i) => {
              const isLast = i === timeline.length - 1;
              const statusKey = `status.${event.to_status}` as Parameters<typeof t>[0];
              return (
                <li key={i} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span className={`h-2.5 w-2.5 rounded-full ring-4 ring-card ${isLast ? "bg-primary" : "bg-primary/40"}`} />
                    {!isLast && <span className="my-0.5 w-px flex-1 bg-border" />}
                  </div>
                  <div className={isLast ? "pb-1" : "pb-6"}>
                    <p className="text-sm font-medium text-foreground">{t(statusKey)}</p>
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
            <p className="text-sm font-medium text-foreground">{t("track.resolved_q")}</p>
            <div className="mt-4 flex gap-3">
              <Link href={`/track/${id}/feedback`}>
                <Button variant="success">{t("track.yes_close")}</Button>
              </Link>
              <Link href={`/track/${id}/reopen`}>
                <Button variant="outline">{t("track.no_reopen")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link href="/file" className="text-sm text-muted-foreground underline hover:text-foreground">
          {t("track.file_another")}
        </Link>
      </div>
    </div>
  );
}
