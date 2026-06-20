"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, ArrowRight, Plus } from "lucide-react";
import { Button, Card, CardContent, StatusBadge, EmptyState, Skeleton } from "@dcos/ui";

interface Tracked {
  tracking_id: string;
  status: string;
  category: string | null;
  created_at: string;
}

export default function MyComplaintsPage() {
  const [items, setItems] = useState<Tracked[] | null>(null);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem("dcos_my_complaints") ?? "[]");
    } catch {
      ids = [];
    }
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    Promise.all(
      ids.map((id) =>
        fetch(`${api}/api/v1/intake/track/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setItems(results.filter(Boolean) as Tracked[]);
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My complaints</h1>
          <p className="text-sm text-muted-foreground">Complaints you&apos;ve filed from this device.</p>
        </div>
        <Link href="/file">
          <Button>
            <Plus className="h-4 w-4" /> New
          </Button>
        </Link>
      </div>

      {items === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="No complaints yet"
          description="When you file a complaint, it'll show up here for quick tracking."
          action={
            <Link href="/file">
              <Button>File a complaint</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Link key={it.tracking_id} href={`/track/${it.tracking_id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-foreground">{it.tracking_id}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {it.category ?? "Awaiting categorisation"} ·{" "}
                      {new Date(it.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={it.status as never} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
