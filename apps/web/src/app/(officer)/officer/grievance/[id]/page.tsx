"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, MapPin, Clock, Upload, CheckCircle2, Hand } from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Textarea,
  StatusBadge,
  SeverityBadge,
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  cn,
  useToast,
} from "@dcos/ui";
import { apiFetch } from "@/lib/api";
import { GrievanceActions } from "@/components/officer/grievance-actions";

type Grievance = {
  tracking_id: string;
  raw_text: string;
  category: string | null;
  subcategory: string | null;
  severity: number | null;
  status: string;
  priority: string;
  latitude: number | null;
  longitude: number | null;
  sla_due_at: string | null;
  is_emergency: boolean;
  created_at: string;
};

type Note = { id: string; note: string; is_handoff: boolean; created_at: string };
type ProofResult = { is_valid: boolean; has_before: boolean; has_after: boolean; reasons: string[] };
type ChecklistStep = {
  id: string;
  step_order: number;
  step_label: string;
  step_label_hi: string | null;
  requires_photo: boolean;
  completed: boolean;
  completed_note: string | null;
};
type ChecklistStatus = {
  category: string;
  steps: ChecklistStep[];
  total: number;
  completed: number;
  all_complete: boolean;
};
type FullCase = {
  tracking_id: string;
  previous_departments: string[];
  timeline: { from_status: string | null; to_status: string; actor_role: string | null; note: string | null; ts: string }[];
  attachments: { url: string; file_type: string; is_proof: boolean; proof_type: string | null; created_at: string }[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function GrievanceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { toast } = useToast();

  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [proof, setProof] = useState<ProofResult | null>(null);
  const [checklist, setChecklist] = useState<ChecklistStatus | null>(null);
  const [fullCase, setFullCase] = useState<FullCase | null>(null);
  const [noteText, setNoteText] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("dcos_token") ?? "" : "");

  const load = useCallback(async () => {
    try {
      const g = await fetch(`${API}/api/v1/intake/track/${id}`).then((r) => (r.ok ? r.json() : null));
      if (g) setGrievance(g);
      const [n, p, cl, fc] = await Promise.all([
        apiFetch<Note[]>(`/workforce/grievances/${id}/notes`).catch(() => []),
        apiFetch<ProofResult>(`/workforce/grievances/${id}/proof`).catch(() => null),
        apiFetch<ChecklistStatus | null>(`/workforce/grievances/${id}/checklist`).catch(() => null),
        apiFetch<FullCase>(`/workforce/grievances/${id}/full-case`).catch(() => null),
      ]);
      setNotes(n);
      setProof(p);
      setChecklist(cl);
      setFullCase(fc);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const action = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ variant: "success", title: success });
      await load();
    } catch (e) {
      toast({ variant: "error", title: "Action failed", description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  const claim = () =>
    action(() => apiFetch(`/workforce/grievances/${id}/claim`, { method: "POST" }), "Claimed — now In Progress");

  const markActionTaken = () =>
    action(
      () =>
        apiFetch(`/workforce/grievances/${id}/action-taken`, {
          method: "POST",
          body: JSON.stringify({ note: "Work completed on site" }),
        }),
      "Marked as Action Taken"
    );

  const addNote = () =>
    action(async () => {
      await apiFetch(`/workforce/grievances/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: noteText }),
      });
      setNoteText("");
    }, "Note added");

  const toggleChecklistItem = (checklistId: string) =>
    action(
      () =>
        apiFetch(`/workforce/grievances/${id}/checklist`, {
          method: "POST",
          body: JSON.stringify({ checklist_id: checklistId }),
        }),
      "Checklist updated"
    );

  const resolve = () =>
    action(async () => {
      await apiFetch(`/workforce/grievances/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution_note: resolveNote }),
      });
      setResolveNote("");
    }, "Resolved");

  const uploadProof = async (file: File, proofType: "before" | "after") => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("is_proof", "true");
    fd.append("proof_type", proofType);
    try {
      const r = await fetch(`${API}/api/v1/intake/grievances/${id}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      if (!r.ok) throw new Error(await r.text());
      toast({ variant: "success", title: `${proofType} photo uploaded` });
      await load();
    } catch (e) {
      toast({ variant: "error", title: "Upload failed", description: String(e) });
    } finally {
      setUploading(false);
    }
  };

  if (!grievance) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40 rounded-none" />
        <Skeleton className="h-64 rounded-none" />
      </div>
    );
  }

  const canClaim = grievance.status === "ASSIGNED";
  const canActionTaken = grievance.status === "IN_PROGRESS";
  const canResolve = ["IN_PROGRESS", "ACTION_TAKEN"].includes(grievance.status);
  const overdue = grievance.sla_due_at && new Date(grievance.sla_due_at) < new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">{grievance.tracking_id}</p>
              <h1 className="mt-0.5 text-xl font-black text-foreground font-grotesk">
                {grievance.category ?? "Uncategorised"}
                {grievance.subcategory && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    · {grievance.subcategory}
                  </span>
                )}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={grievance.status as never} />
              {grievance.severity != null && <SeverityBadge score={grievance.severity} />}
            </div>
          </div>

          {grievance.is_emergency && (
            <Alert variant="error" className="mt-4" icon={<AlertTriangle className="h-4 w-4" />}>
              Emergency flagged — call 112 if there is a life-safety risk.
            </Alert>
          )}

          <p className="mt-4 text-sm leading-relaxed text-foreground">{grievance.raw_text}</p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span>Priority: <strong className="text-foreground">{grievance.priority}</strong></span>
            {grievance.latitude && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {grievance.latitude.toFixed(4)},{" "}
                {grievance.longitude?.toFixed(4)}
              </span>
            )}
            {grievance.sla_due_at && (
              <span className={cn("inline-flex items-center gap-1", overdue && "font-semibold text-destructive")}>
                <Clock className="h-3.5 w-3.5" /> SLA{" "}
                {new Date(grievance.sla_due_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
            <span>Filed {new Date(grievance.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {canClaim && (
              <Button onClick={claim} loading={busy}>
                <Hand className="h-4 w-4" /> Claim complaint
              </Button>
            )}
            {canActionTaken && (
              <Button variant="secondary" onClick={markActionTaken} loading={busy}>
                Mark action taken
              </Button>
            )}
            {/* Operational actions — escalate / hand off / request info */}
            <GrievanceActions grievanceId={id} status={grievance.status} onDone={load} />
          </div>
        </CardContent>
      </Card>

      {/* Action tabs */}
      <Card>
        <CardContent className="py-5">
          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="proof">
                Proof {proof?.has_before && proof?.has_after ? "✓" : ""}
              </TabsTrigger>
              <TabsTrigger value="resolve">Resolve</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Notes */}
            <TabsContent value="notes">
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="rounded-none border border-border bg-muted/30 p-3">
                      {n.is_handoff && (
                        <span className="mb-1.5 inline-block rounded bg-warning/10 px-2 py-0.5 text-2xs font-medium text-warning">
                          Department handoff
                        </span>
                      )}
                      <p className="text-sm text-foreground">{n.note}</p>
                      <p className="mt-1 text-2xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  ))
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    placeholder="Add an internal note…"
                    className="min-h-0"
                  />
                  <Button variant="secondary" className="self-end" onClick={addNote} disabled={busy || !noteText.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Proof */}
            <TabsContent value="proof">
              <div className="space-y-4">
                {/* E2.4 — Quality checklist (blocks resolution until complete) */}
                {checklist && (
                  <div className="border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Quality Checklist — {checklist.category}
                      </p>
                      <span className={cn(
                        "text-2xs font-bold px-2 py-0.5 rounded",
                        checklist.all_complete ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      )}>
                        {checklist.completed}/{checklist.total} done
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {checklist.steps.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => !s.completed && toggleChecklistItem(s.id)}
                          disabled={busy || s.completed}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded border px-3 py-2 text-left transition-colors",
                            s.completed
                              ? "border-success/30 bg-success/5 cursor-default"
                              : "border-border bg-card hover:border-primary"
                          )}
                        >
                          <span className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-2xs",
                            s.completed ? "border-success bg-success text-white" : "border-muted-foreground/40"
                          )}>
                            {s.completed ? "✓" : s.step_order}
                          </span>
                          <span className={cn("text-sm", s.completed ? "text-muted-foreground line-through" : "text-foreground")}>
                            {s.step_label}
                            {s.requires_photo && <span className="ml-1.5 text-2xs text-primary">📷</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                    {!checklist.all_complete && (
                      <p className="mt-2 text-2xs text-warning">
                        ⚠ All steps must be completed before this complaint can be resolved.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {(["before", "after"] as const).map((pt) => {
                    const has = pt === "before" ? proof?.has_before : proof?.has_after;
                    const ref = pt === "before" ? beforeRef : afterRef;
                    return (
                      <div
                        key={pt}
                        className={cn(
                          "rounded-none border-2 p-4 text-center transition-colors",
                          has ? "border-success/40 bg-success/5" : "border-dashed border-border"
                        )}
                      >
                        <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {pt} photo
                        </p>
                        {has ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                          </p>
                        ) : (
                          <>
                            <p className="mt-1 text-2xs text-muted-foreground">Required for closure</p>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-3"
                              onClick={() => ref.current?.click()}
                              loading={uploading}
                            >
                              <Upload className="h-3.5 w-3.5" /> Upload
                            </Button>
                            <input
                              ref={ref}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0], pt)}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {proof?.reasons.length ? (
                  <Alert variant="warning">
                    <ul className="space-y-0.5">
                      {proof.reasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </Alert>
                ) : proof?.is_valid ? (
                  <Alert variant="success">Proof valid — you may resolve this complaint.</Alert>
                ) : null}
              </div>
            </TabsContent>

            {/* Resolve */}
            <TabsContent value="resolve">
              <div className="space-y-4">
                {!proof?.is_valid && (
                  <Alert variant="warning">
                    Upload before + after proof photos first (see the Proof tab).
                  </Alert>
                )}
                {checklist && !checklist.all_complete && (
                  <Alert variant="warning">
                    Complete the quality checklist ({checklist.completed}/{checklist.total}) in the Proof tab first.
                  </Alert>
                )}
                {canResolve ? (
                  <>
                    <Textarea
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      rows={4}
                      placeholder="Describe the resolution — what was done, materials used, date/time of completion…"
                    />
                    <Button
                      variant="success"
                      className="w-full"
                      onClick={resolve}
                      loading={busy}
                      disabled={!resolveNote.trim() || !proof?.is_valid || (checklist != null && !checklist.all_complete)}
                    >
                      {proof?.is_valid ? "Mark as resolved" : "Upload proof to resolve"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Grievance must be In Progress or Action Taken to resolve.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* E2.3 — Full History */}
            <TabsContent value="history">
              <div className="space-y-4">
                {fullCase?.previous_departments && fullCase.previous_departments.length > 0 && (
                  <div className="border border-warning/30 bg-warning/5 p-3">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-warning mb-1">
                      Handoff Trail
                    </p>
                    <p className="text-sm text-foreground">
                      Previously routed through: {fullCase.previous_departments.join(" → ")}
                    </p>
                  </div>
                )}
                {fullCase?.timeline && fullCase.timeline.length > 0 ? (
                  <ol className="space-y-0">
                    {fullCase.timeline.map((event, i) => {
                      const isLast = i === fullCase.timeline.length - 1;
                      return (
                        <li key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "h-2.5 w-2.5 rounded-full ring-4 ring-card",
                              isLast ? "bg-primary" : "bg-primary/40"
                            )} />
                            {!isLast && <span className="my-0.5 w-px flex-1 bg-border" />}
                          </div>
                          <div className={isLast ? "pb-1" : "pb-5"}>
                            <p className="text-sm font-medium text-foreground">
                              {event.from_status ? `${event.from_status} → ` : ""}{event.to_status}
                            </p>
                            {event.note && <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>}
                            <p className="mt-0.5 text-2xs text-muted-foreground">
                              {new Date(event.ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                              {event.actor_role && ` · ${event.actor_role}`}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No history events yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
