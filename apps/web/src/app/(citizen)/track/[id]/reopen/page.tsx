"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button, Card, CardContent, Textarea, Label, Alert, useToast } from "@dcos/ui";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

export default function ReopenPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 5) return;
    setLoading(true);
    try {
      await apiFetch(`/citizen/reopen/${id}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setDone(true);
    } catch (e) {
      toast({ variant: "error", title: t("reopen.submit"), description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center bg-warning/10 text-warning">
              <RotateCcw className="h-8 w-8" />
            </span>
            <h1 className="text-xl font-bold text-foreground">{t("reopen.done_heading")}</h1>
            <p className="text-sm text-muted-foreground">{t("reopen.done_sub")}</p>
            <Link href={`/track/${id}`}>
              <Button className="w-full min-h-[52px]">{t("track.timeline")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("reopen.heading")}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{id}</span>{" "}
          {t("reopen.sub")}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="reason" required>{t("reopen.reason_label")}</Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              placeholder={t("reopen.placeholder")}
            />
            <p className="text-right text-2xs text-muted-foreground">{reason.length} / 1000</p>
          </div>

          <Alert variant="warning">{t("reopen.warning")}</Alert>

          <Button
            className="w-full min-h-[52px]"
            variant="destructive"
            onClick={submit}
            loading={loading}
            disabled={reason.trim().length < 5}
          >
            {t("reopen.submit")}
          </Button>
          <Link
            href={`/track/${id}`}
            className="block text-center text-sm text-muted-foreground underline py-2"
          >
            {t("reopen.cancel")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
