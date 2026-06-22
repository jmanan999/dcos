"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, ArrowRight, Plus } from "lucide-react";
import { Button, Card, CardContent, StatusBadge, EmptyState, Skeleton } from "@dcos/ui";
import { useLanguage } from "@/lib/i18n";

interface Tracked {
  tracking_id: string;
  status: string;
  category: string | null;
  created_at: string;
}

export default function MyComplaintsPage() {
  const { t } = useLanguage();
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
        <div className="space-y-0.5">
          <h1 className="text-2xl font-black tracking-tight text-foreground font-grotesk">{t("my.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("my.subtitle")}</p>
        </div>
        <Link href="/file">
          <Button className="min-h-[44px]">
            <Plus className="h-4 w-4" /> {t("my.new")}
          </Button>
        </Link>
      </div>

      {items === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title={t("my.empty_title")}
          description={t("my.empty_desc")}
          action={
            <Link href="/file">
              <Button className="min-h-[48px]">{t("file.title")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Link key={it.tracking_id} href={`/track/${it.tracking_id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-foreground">{it.tracking_id}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {it.category ?? t("my.awaiting")}
                      {" · "}
                      {new Date(it.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
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
