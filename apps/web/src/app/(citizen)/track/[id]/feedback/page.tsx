"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, CheckCircle2 } from "lucide-react";
import { Button, Card, CardContent, Textarea, Label, Alert, cn, useToast } from "@dcos/ui";
import { apiFetch } from "@/lib/api";

const STARS = [1, 2, 3, 4, 5];
const STAR_LABELS: Record<number, string> = {
  1: "Very dissatisfied",
  2: "Dissatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very satisfied",
};

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      toast({ variant: "error", title: "Could not submit", description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="text-xl font-bold text-foreground">Thank you for your feedback</h1>
            <p className="text-sm text-muted-foreground">
              {rating && rating >= 3
                ? "Your complaint has been marked as closed."
                : "Your complaint has been reopened for further action."}
            </p>
            <Link href="/">
              <Button>Back to home</Button>
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Rate the resolution</h1>
        <p className="text-sm text-muted-foreground">
          How satisfied are you with how <span className="font-mono font-medium text-foreground">{id}</span> was resolved?
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 py-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {STARS.map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(null)}
                  aria-label={`${s} star`}
                >
                  <Star
                    className={cn(
                      "h-9 w-9 transition-transform hover:scale-110",
                      s <= display ? "fill-warning text-warning" : "text-muted"
                    )}
                  />
                </button>
              ))}
            </div>
            {display > 0 && <p className="text-sm text-muted-foreground">{STAR_LABELS[display]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Additional comments (optional)</Label>
            <Textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="What could have been done better?"
            />
          </div>

          {rating !== null && rating <= 2 && (
            <Alert variant="warning">
              A rating of {rating}/5 will automatically reopen your complaint for further review.
            </Alert>
          )}

          <Button className="w-full" onClick={submit} loading={loading} disabled={!rating}>
            Submit feedback
          </Button>
          <Link href={`/track/${id}`} className="block text-center text-xs text-muted-foreground underline">
            Back to tracking
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
