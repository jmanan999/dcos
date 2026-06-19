"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received", CLASSIFIED: "Classified", ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress", ACTION_TAKEN: "Action Taken",
  RESOLVED: "Resolved", VERIFIED: "Verified", CLOSED: "Closed",
  ESCALATED: "Escalated", REOPENED: "Reopened", REJECTED_SPAM: "Rejected",
};

type Grievance = {
  id: string; tracking_id: string; raw_text: string; category: string | null;
  subcategory: string | null; severity: number | null; status: string;
  priority: string; latitude: number | null; longitude: number | null;
  sla_due_at: string | null; is_emergency: boolean; created_at: string;
};

type Note = { id: string; officer_id: string; note: string; is_handoff: boolean; created_at: string };
type ProofResult = { is_valid: boolean; has_before: boolean; has_after: boolean; reasons: string[] };

export default function GrievanceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [proof, setProof] = useState<ProofResult | null>(null);
  const [noteText, setNoteText] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [actionTab, setActionTab] = useState<"notes" | "resolve" | "proof">("notes");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token = () => typeof window !== "undefined" ? localStorage.getItem("dcos_token") ?? "" : "";
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  const load = async () => {
    const [gRes, nRes, pRes] = await Promise.all([
      fetch(`${API}/api/v1/intake/track/${id}`),
      fetch(`${API}/api/v1/workforce/grievances/${id}/notes`, { headers: headers() }),
      fetch(`${API}/api/v1/workforce/grievances/${id}/proof`, { headers: headers() }),
    ]);
    if (gRes.ok) {
      const data = await gRes.json();
      setGrievance({ ...data, id: data.tracking_id ? id : id });
    }
    if (nRes.ok) setNotes(await nRes.json());
    if (pRes.ok) setProof(await pRes.json());
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (id) load(); }, [id]);

  const flash = (text: string, type: "ok" | "err") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleClaim = async () => {
    setBusy(true);
    const r = await fetch(`${API}/api/v1/workforce/grievances/${id}/claim`, {
      method: "POST", headers: headers(),
    });
    setBusy(false);
    if (r.ok) { flash("Claimed — status is now IN_PROGRESS", "ok"); load(); }
    else flash((await r.json()).detail ?? "Error", "err");
  };

  const handleActionTaken = async () => {
    setBusy(true);
    const r = await fetch(`${API}/api/v1/workforce/grievances/${id}/action-taken`, {
      method: "POST", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Work completed on site" }),
    });
    setBusy(false);
    if (r.ok) { flash("Marked as Action Taken", "ok"); load(); }
    else flash((await r.json()).detail ?? "Error", "err");
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setBusy(true);
    const r = await fetch(`${API}/api/v1/workforce/grievances/${id}/notes`, {
      method: "POST", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    });
    setBusy(false);
    if (r.ok) { setNoteText(""); flash("Note added", "ok"); load(); }
    else flash((await r.json()).detail ?? "Error", "err");
  };

  const handleResolve = async () => {
    if (!resolveNote.trim()) return;
    setBusy(true);
    const r = await fetch(`${API}/api/v1/workforce/grievances/${id}/resolve`, {
      method: "POST", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ resolution_note: resolveNote }),
    });
    setBusy(false);
    if (r.ok) { flash("Resolved!", "ok"); load(); }
    else flash((await r.json()).detail ?? "Closure blocked", "err");
  };

  const uploadProof = async (file: File, proofType: "before" | "after") => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("is_proof", "true");
    fd.append("proof_type", proofType);
    const r = await fetch(`${API}/api/v1/intake/grievances/${id}/attachments`, {
      method: "POST", headers: headers(), body: fd,
    });
    setUploading(false);
    if (r.ok) { flash(`${proofType} photo uploaded`, "ok"); load(); }
    else flash("Upload failed", "err");
  };

  if (!grievance) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>;
  }

  const canClaim = grievance.status === "ASSIGNED";
  const canActionTaken = grievance.status === "IN_PROGRESS";
  const canResolve = grievance.status === "IN_PROGRESS" || grievance.status === "ACTION_TAKEN";

  return (
    <div className="space-y-4">
      {/* Flash */}
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
          msg.type === "ok" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-slate-500">{grievance.tracking_id ?? id}</p>
            <h1 className="mt-0.5 text-lg font-bold text-slate-900">
              {grievance.category ?? "Uncategorized"}
              {grievance.subcategory && <span className="ml-2 text-sm font-normal text-slate-500">· {grievance.subcategory}</span>}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {STATUS_LABELS[grievance.status] ?? grievance.status}
            </span>
            {grievance.sla_due_at && (
              <span className={`text-xs ${new Date(grievance.sla_due_at) < new Date() ? "text-red-600 font-bold" : "text-slate-500"}`}>
                SLA {new Date(grievance.sla_due_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </div>
        </div>

        {grievance.is_emergency && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
            EMERGENCY — Please call 112 if life safety risk
          </div>
        )}

        <p className="mt-3 text-sm leading-relaxed text-slate-700">{grievance.raw_text}</p>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Priority: <strong className="text-slate-800">{grievance.priority}</strong></span>
          {grievance.severity != null && <span>Severity: <strong>{grievance.severity}/100</strong></span>}
          {grievance.latitude && <span>📍 {grievance.latitude.toFixed(4)}, {grievance.longitude?.toFixed(4)}</span>}
          <span>Filed: {new Date(grievance.created_at).toLocaleString("en-IN", { dateStyle: "medium" })}</span>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {canClaim && (
            <button onClick={handleClaim} disabled={busy}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
              Claim Complaint
            </button>
          )}
          {canActionTaken && (
            <button onClick={handleActionTaken} disabled={busy}
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50">
              Mark Action Taken
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex border-b border-slate-100">
          {(["notes", "proof", "resolve"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActionTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize ${
                actionTab === tab
                  ? "border-b-2 border-brand-500 text-brand-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "proof" ? `Proof ${proof?.has_before && proof?.has_after ? "✓" : "⚠"}` : tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Notes tab */}
          {actionTab === "notes" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-slate-50 p-3">
                    {n.is_handoff && (
                      <span className="mb-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        Department Handoff
                      </span>
                    )}
                    <p className="text-sm text-slate-800">{n.note}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-sm text-slate-400">No notes yet</p>}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add an internal note…"
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-slate-200 p-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <button onClick={handleAddNote} disabled={busy || !noteText.trim()}
                  className="self-end rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Proof tab */}
          {actionTab === "proof" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {(["before", "after"] as const).map((pt) => {
                  const has = pt === "before" ? proof?.has_before : proof?.has_after;
                  return (
                    <div key={pt} className={`rounded-xl border-2 p-4 text-center ${has ? "border-emerald-300 bg-emerald-50" : "border-dashed border-slate-300"}`}>
                      <p className="text-xs font-semibold uppercase text-slate-500">{pt} photo</p>
                      {has ? (
                        <p className="mt-2 text-xs text-emerald-700">✓ Uploaded</p>
                      ) : (
                        <>
                          <p className="mt-1 text-xs text-slate-400">Required for closure</p>
                          <button
                            onClick={() => (pt === "before" ? beforeRef : afterRef).current?.click()}
                            disabled={uploading}
                            className="mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          >
                            {uploading ? "Uploading…" : "Upload photo"}
                          </button>
                          <input ref={pt === "before" ? beforeRef : afterRef} type="file"
                            accept="image/*" className="hidden"
                            onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0], pt)} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {proof?.reasons.length ? (
                <ul className="space-y-1">
                  {proof.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-red-600">• {r}</li>
                  ))}
                </ul>
              ) : proof?.is_valid ? (
                <p className="text-xs text-emerald-600">✓ Proof valid — you may resolve</p>
              ) : null}
            </div>
          )}

          {/* Resolve tab */}
          {actionTab === "resolve" && (
            <div className="space-y-4">
              {!proof?.is_valid && (
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
                  Upload before + after proof photos first (see Proof tab).
                </div>
              )}
              {canResolve ? (
                <>
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="Describe the resolution — what was done, materials used, date/time of completion…"
                    rows={4}
                    className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    onClick={handleResolve}
                    disabled={busy || !resolveNote.trim() || !proof?.is_valid}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {proof?.is_valid ? "Mark as Resolved" : "Upload proof to resolve"}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Grievance must be IN_PROGRESS or ACTION_TAKEN to resolve.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
