"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, CheckCircle2 } from "lucide-react";
import { Button, Card, CardContent, Textarea, Label, Alert, cn, useToast } from "@dcos/ui";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

const STARS = [1, 2, 3, 4, 5];

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const STAR_LABELS: Record<number, string> = {
    1: t("feedback.star_1"),
    2: t("feedback.star_2"),
    3: t("feedback.star_3"),
    4: t("feedback.star_4"),
    5: t("feedback.star_5"),
  };

  const submit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      await apiFetch(`/citizen/feedback/${id}`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      setDone(true);
    } catch (e) {
      toast({ variant: "error", title: t("feedback.submit"), description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h1 className="text-xl font-black text-foreground font-grotesk">{t("feedback.done_title")}</h1>
            <p className="text-sm text-muted-foreground">
              {rating && rating >= 3 ? t("feedback.closed_msg") : t("feedback.reopened_msg2")}
            </p>
            <Link href="/">
              <Button className="min-h-[48px] w-full">{t("feedback.back_home")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const display = hover ?? rating ?? 0;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground font-grotesk">{t("feedback.rate_title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("feedback.rate_question")}
        </p>
        <p className="font-mono text-sm font-medium text-foreground">{id}</p>
      </div>

      <Card>
        <CardContent className="space-y-5 py-6">
          {/* Stars — 48px touch targets */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {STARS.map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(null)}
                  className="flex h-12 w-12 items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  aria-label={`${s} — ${STAR_LABELS[s]}`}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      s <= display ? "fill-warning text-warning" : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
            </div>
            {display > 0 && (
              <p className="text-sm font-medium text-foreground">{STAR_LABELS[display]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">{t("feedback.comments_label")}</Label>
            <Textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder={t("feedback.comments_ph")}
            />
          </div>

          {rating !== null && rating <= 2 && (
            <Alert variant="warning">
              {rating}/5 {t("feedback.low_warning_2")}
            </Alert>
          )}

          <Button
            className="w-full min-h-[52px]"
            onClick={submit}
            loading={loading}
            disabled={!rating}
          >
            {t("feedback.submit")}
          </Button>
          <Link
            href={`/track/${id}`}
            className="block text-center text-sm text-muted-foreground underline py-2"
          >
            {t("feedback.back")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
