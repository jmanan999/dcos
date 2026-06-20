"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button, Card, CardContent, Textarea, Label, Alert, useToast } from "@dcos/ui";
import { apiFetch } from "@/lib/api";

export default function ReopenPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
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
      toast({ variant: "error", title: "Could not reopen", description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
              <RotateCcw className="h-7 w-7" />
            </span>
            <h1 className="text-xl font-bold text-foreground">Complaint reopened</h1>
            <p className="text-sm text-muted-foreground">
              It has been reopened and will be reassigned to an officer.
            </p>
            <Link href={`/track/${id}`}>
              <Button>Track your complaint</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reopen complaint</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{id}</span> was marked resolved,
          but you believe the issue persists.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="reason" required>
              Why is the issue not resolved?
            </Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              placeholder="e.g. The pothole was only partially filled and the problem remains."
            />
            <p className="text-right text-2xs text-muted-foreground">{reason.length} / 1000</p>
          </div>

          <Alert variant="warning">
            Reopening assigns the complaint back to an officer. Misuse may delay future complaints.
          </Alert>

          <Button
            className="w-full"
            variant="destructive"
            onClick={submit}
            loading={loading}
            disabled={reason.trim().length < 5}
          >
            Reopen complaint
          </Button>
          <Link href={`/track/${id}`} className="block text-center text-xs text-muted-foreground underline">
            Cancel
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
