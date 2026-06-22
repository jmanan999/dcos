"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Download, Sparkles } from "lucide-react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  Alert,
} from "@dcos/ui";
import { apiFetch } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const EXPORTS = [
  { label: "Grievances — last 30 days", href: `${API}/api/v1/reporting/export/grievances?days=30` },
  { label: "Grievances — last 90 days", href: `${API}/api/v1/reporting/export/grievances?days=90` },
  { label: "Department scorecard", href: `${API}/api/v1/reporting/export/dept-scorecard` },
  { label: "Ward statistics", href: `${API}/api/v1/reporting/export/ward-stats` },
];

interface Brief {
  date: string;
  headline: string;
  sections: { title: string; body: string }[];
}

export default function CMReports() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Brief>("/analytics/executive-brief");
      setBrief(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Exports" description="Executive briefs and one-click data exports." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Executive brief */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Executive Brief
            </CardTitle>
            <Button size="sm" onClick={generate} loading={loading}>
              Generate
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-none" />
                ))}
              </div>
            ) : brief ? (
              <div className="space-y-4">
                <Alert variant="info">{brief.headline}</Alert>
                {brief.sections.map((s) => (
                  <div key={s.title}>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Generate today&apos;s auto brief with counts, deltas, and top backlog.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-success" /> Data Exports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {EXPORTS.map((e) => (
              <a
                key={e.label}
                href={e.href}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between rounded-none border border-border px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <span className="text-sm font-medium text-foreground">{e.label}</span>
                <Download className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
