"use client";

import { useState } from "react";
import { ArrowUpCircle, Forward, MessageCircleQuestion } from "lucide-react";
import {
  Button,
  Select,
  Textarea,
  Label,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  useToast,
} from "@dcos/ui";
import { apiFetch } from "@/lib/api";
import { useDepartments } from "@/lib/hooks";

/**
 * The three operational actions that beat Sampark — wired to live backend
 * endpoints that previously had no UI: escalate, dept handoff, request-info.
 */
export function GrievanceActions({
  grievanceId,
  status,
  onDone,
}: {
  grievanceId: string;
  status: string;
  onDone: () => void | Promise<unknown>;
}) {
  const terminal = ["RESOLVED", "VERIFIED", "CLOSED", "REJECTED_SPAM"];
  if (terminal.includes(status)) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <EscalateDialog grievanceId={grievanceId} onDone={onDone} />
      <HandoffDialog grievanceId={grievanceId} onDone={onDone} />
      <RequestInfoDialog grievanceId={grievanceId} onDone={onDone} />
    </div>
  );
}

// ── Escalate ──────────────────────────────────────────────────────────────────

function EscalateDialog({ grievanceId, onDone }: { grievanceId: string; onDone: () => void | Promise<unknown> }) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await apiFetch<{ escalation_level: number; to_role: string }>(
        `/workforce/grievances/${grievanceId}/escalate`,
        { method: "POST", body: JSON.stringify({ reason }) }
      );
      toast({
        variant: "success",
        title: "Escalated",
        description: `Now at level ${res.escalation_level} → ${res.to_role.replace(/_/g, " ")}`,
      });
      setOpen(false);
      setReason("");
      await onDone();
    } catch (e) {
      toast({ variant: "error", title: "Could not escalate", description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/40 text-destructive">
          <ArrowUpCircle className="h-4 w-4" /> Escalate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate to senior</DialogTitle>
          <DialogDescription>
            Moves this case up the ladder (officer → dept admin → district → CM cell) and
            notifies the next tier. Use when you cannot resolve within SLA.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="esc-reason" required>Reason</Label>
          <Textarea
            id="esc-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. No material available locally; needs district-level procurement."
          />
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={submit} loading={busy} disabled={reason.trim().length < 5}>
            Escalate now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dept handoff ──────────────────────────────────────────────────────────────

function HandoffDialog({ grievanceId, onDone }: { grievanceId: string; onDone: () => void | Promise<unknown> }) {
  const { toast } = useToast();
  const { data: depts } = useDepartments();
  const [deptId, setDeptId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await apiFetch(`/workforce/grievances/${grievanceId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note, is_handoff: true, handoff_dept_id: deptId }),
      });
      toast({ variant: "success", title: "Handed off", description: "Re-routed to the selected department." });
      setOpen(false);
      setNote("");
      setDeptId("");
      await onDone();
    } catch (e) {
      toast({ variant: "error", title: "Could not hand off", description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Forward className="h-4 w-4" /> Hand off
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hand off to another department</DialogTitle>
          <DialogDescription>
            Wrong department? Re-route this case (keeping its full history). It returns to the
            assignment desk of the new department.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label required>Department</Label>
            <Select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">Select department…</option>
              {depts?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ho-note" required>Reason</Label>
            <Textarea
              id="ho-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. This is a DJB water issue, not an MCD sanitation matter."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={submit} loading={busy} disabled={!deptId || note.trim().length < 5}>
            Hand off
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Request info from citizen ─────────────────────────────────────────────────

function RequestInfoDialog({ grievanceId, onDone }: { grievanceId: string; onDone: () => void | Promise<unknown> }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await apiFetch(`/workforce/grievances/${grievanceId}/request-info`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      toast({ variant: "success", title: "Request sent", description: "The citizen will get a WhatsApp/SMS prompt." });
      setOpen(false);
      setMessage("");
      await onDone();
    } catch (e) {
      toast({ variant: "error", title: "Could not send", description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageCircleQuestion className="h-4 w-4" /> Request info
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request more information</DialogTitle>
          <DialogDescription>
            Send the citizen a prompt for the detail you need (a clearer photo, exact landmark,
            preferred visit time). Delivered on their filing channel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="ri-msg" required>Message to citizen</Label>
          <Textarea
            id="ri-msg"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Please share a photo showing the exact location and the nearest house number."
          />
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={submit} loading={busy} disabled={message.trim().length < 10}>
            Send request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
