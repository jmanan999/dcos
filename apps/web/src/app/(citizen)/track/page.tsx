"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@dcos/ui";

export default function TrackLookupPage() {
  const [id, setId] = useState("");
  const router = useRouter();

  const go = () => {
    if (id.trim()) router.push(`/track/${id.trim().toUpperCase()}`);
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Track your complaint</h1>
        <p className="text-sm text-muted-foreground">
          Enter your tracking ID to see live status and timeline.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="tid" required>
              Tracking ID
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="tid"
                value={id}
                onChange={(e) => setId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && go()}
                placeholder="DCOS-20260620-XXXXXXXX"
                className="pl-9 font-mono"
              />
            </div>
          </div>
          <Button className="w-full" onClick={go} disabled={!id.trim()}>
            Track <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Lost your ID? It was sent to you via SMS/WhatsApp when you filed.
      </p>
    </div>
  );
}
