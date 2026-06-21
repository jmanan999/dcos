"use client";

import { useState } from "react";
import { TriangleAlert, Check } from "lucide-react";
import {
  PageHeader,
  Button,
  Select,
  Label,
  Badge,
  Skeleton,
  EmptyState,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  useToast,
} from "@dcos/ui";
import { useDeptQueue, useDepartments, type DeptQueueItem } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

// Canonical civic taxonomy (mirrors the AI service's CATEGORY_DEPT_MAP).
const CATEGORIES = [
  "Pothole / Road Damage",
  "Garbage Not Collected",
  "Stray Animal Menace",
  "Illegal Construction",
  "Waterlogging / Flooding",
  "Park Not Maintained",
  "No Water Supply",
  "Low Water Pressure",
  "Sewage Overflow",
  "Pipe Leakage / Burst",
  "Road Repair Required",
  "Flyover / Bridge Damage",
  "Streetlight Not Working",
  "Vehicle Theft",
  "Noise Pollution",
  "Traffic Signal Fault",
  "Power Outage",
  "Low Voltage",
  "Industrial Air Pollution",
  "Metro Safety Concern",
  "Medicine Not Available",
];

export default function TriagePage() {
  const { data: queue, isLoading, mutate } = useDeptQueue();

  // Cases most likely to need human review: uncategorised, or freshly routed.
  const needsReview =
    queue?.filter(
      (g) => !g.category || ["RECEIVED", "CLASSIFIED"].includes(g.status)
    ) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Triage & Categorisation"
        description="Correct the AI where it misread intent. Every fix improves routing for the next thousand complaints."
      />

      {isLoading ? (
        <Skeleton className="h-80 rounded-none" />
      ) : needsReview.length === 0 ? (
        <div className="border border-border bg-card p-10">
          <EmptyState
            icon={<Check className="h-6 w-6" />}
            title="Nothing to triage"
            description="Every incoming grievance is categorised and routed."
          />
        </div>
      ) : (
        <div className="border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border">
                  <th className="px-4 py-3 label-caps text-muted-foreground">Tracking ID</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground">Complaint</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground">AI Category</th>
                  <th className="px-4 py-3 label-caps text-muted-foreground text-right">Fix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {needsReview.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                      {g.tracking_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-[360px] truncate">
                      {g.raw_text}
                    </td>
                    <td className="px-4 py-3">
                      {g.category ? (
                        <span className="text-sm text-foreground">{g.category}</span>
                      ) : (
                        <Badge variant="warning" dot>Uncategorised</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CorrectDialog g={g} onDone={mutate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CorrectDialog({ g, onDone }: { g: DeptQueueItem; onDone: () => Promise<unknown> }) {
  const { toast } = useToast();
  const { data: depts } = useDepartments();
  const [category, setCategory] = useState(g.category ?? "");
  const [deptCode, setDeptCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await apiFetch("/ai/feedback", {
        method: "POST",
        body: JSON.stringify({
          grievance_id: g.id,
          corrected_category: category,
          corrected_department_code: deptCode || undefined,
        }),
      });
      toast({ variant: "success", title: "Correction saved", description: "Routing updated and logged for AI training." });
      setOpen(false);
      await onDone();
    } catch (e) {
      toast({ variant: "error", title: "Could not save", description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <TriangleAlert className="h-3.5 w-3.5" /> Correct
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct categorisation</DialogTitle>
          <DialogDescription>
            Set the right category and department. The case re-routes and the correction trains
            the classifier.
          </DialogDescription>
        </DialogHeader>
        <div className="border border-border bg-muted/30 p-3 my-2">
          <p className="text-sm text-foreground line-clamp-3">{g.raw_text}</p>
        </div>
        <div className="space-y-3 py-1">
          <div className="space-y-2">
            <Label required>Correct category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Route to department (optional)</Label>
            <Select value={deptCode} onChange={(e) => setDeptCode(e.target.value)}>
              <option value="">Keep current department</option>
              {depts?.filter((d) => d.short_code).map((d) => (
                <option key={d.id} value={d.short_code ?? ""}>{d.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={submit} loading={busy} disabled={!category}>
            Save correction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
