"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Alert,
} from "@dcos/ui";
import { apiFetch } from "@/lib/api";

interface NLResult {
  question: string;
  sql: string;
  results: Record<string, unknown>[];
  error: string | null;
}

const SUGGESTIONS = [
  "Which wards have the most unresolved complaints?",
  "Top 5 departments by SLA breaches this month",
  "Average resolution time by category",
  "How many complaints were filed today?",
];

export default function CMAnalytics() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<NLResult | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (q?: string) => {
    const query = q ?? question;
    if (!query.trim()) return;
    setQuestion(query);
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch<NLResult>("/analytics/nl-query", {
        method: "POST",
        body: JSON.stringify({ question: query }),
      });
      setResult(data);
    } catch (e) {
      setResult({ question: query, sql: "", results: [], error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & AI Copilot"
        description="Ask questions in plain English — the AI writes SQL and runs it on the read model."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Ask the data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder='e.g. "Which wards have the most unresolved complaints?"'
            />
            <Button onClick={() => ask()} loading={loading} disabled={!question.trim()}>
              <Send className="h-4 w-4" /> Ask
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          {result && (
            <div className="space-y-3 pt-2">
              {result.error ? (
                <Alert variant="error">{result.error}</Alert>
              ) : (
                <>
                  {result.sql && (
                    <details className="rounded-none border border-border bg-muted/30 p-3">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                        Generated SQL
                      </summary>
                      <pre className="mt-2 overflow-x-auto text-2xs text-foreground scrollbar-thin">{result.sql}</pre>
                    </details>
                  )}
                  {result.results.length > 0 ? (
                    <div className="overflow-x-auto rounded-none border border-border scrollbar-thin">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            {Object.keys(result.results[0]).map((col) => (
                              <th key={col} className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {result.results.slice(0, 20).map((row, i) => (
                            <tr key={i}>
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="px-3 py-2 text-foreground">
                                  {String(v ?? "—")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.results.length > 20 && (
                        <p className="bg-muted/30 px-3 py-2 text-center text-2xs text-muted-foreground">
                          Showing 20 of {result.results.length} rows
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No results returned.</p>
                  )}
                </>
              )}
            </div>
          )}

          {!result && !loading && (
            <Badge variant="info" dot>
              Powered by Groq · Llama 3.3 70B
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
