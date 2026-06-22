"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useDepartments } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

const CONTRACT_TYPES = [
  { value: "road", label: "Road / Pavement" },
  { value: "drainage", label: "Drainage / Sewage" },
  { value: "electrical", label: "Electrical / Streetlights" },
  { value: "water", label: "Water Supply" },
  { value: "sanitation", label: "Sanitation / Garbage" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active (work in progress)" },
  { value: "completed", label: "Completed" },
  { value: "terminated", label: "Terminated" },
];

function Field({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-label-caps text-on-surface-variant">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = "w-full border border-outline-variant bg-white px-3 py-2.5 text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors";
const SELECT = `${INPUT} appearance-none`;

export default function NewContractPage() {
  const router = useRouter();
  const { data: departments } = useDepartments();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    contractor_name: "",
    gst_number: "",
    department_id: "",
    contract_type: "road",
    value_lakh: "",
    tender_id: "",
    start_date: "",
    end_date: "",
    status: "active",
    notes: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.contractor_name.trim() || !form.department_id || !form.start_date || !form.value_lakh) {
      setError("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/contracts", {
        method: "POST",
        body: JSON.stringify({
          contractor_name: form.contractor_name.trim(),
          gst_number: form.gst_number || null,
          department_id: form.department_id,
          ward_ids: [],
          contract_type: form.contract_type,
          value_lakh: parseFloat(form.value_lakh),
          tender_id: form.tender_id || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          status: form.status,
          notes: form.notes || null,
        }),
      });
      router.push("/cm/contractors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contract");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/cm/contractors">
          <button className="p-2 border border-outline-variant hover:bg-surface-container transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-headline-sm text-on-surface">Add Contract</h1>
          <p className="text-body-sm text-on-surface-variant">
            Enter the contract details to start tracking accountability
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-white border border-outline-variant p-6 flex flex-col gap-5">
          <h2 className="text-label-caps text-on-surface-variant border-b border-outline-variant pb-3">
            Contractor Details
          </h2>

          <Field label="Contractor Name" required>
            <input
              className={INPUT}
              placeholder="e.g. Vijay Construction Pvt. Ltd."
              value={form.contractor_name}
              onChange={set("contractor_name")}
            />
          </Field>

          <Field label="GST Number">
            <input
              className={INPUT}
              placeholder="e.g. 07AABCV1234A1Z5"
              value={form.gst_number}
              onChange={set("gst_number")}
            />
          </Field>

          <Field label="Tender / Contract Reference ID">
            <input
              className={INPUT}
              placeholder="e.g. MCD/EE/2024/1234"
              value={form.tender_id}
              onChange={set("tender_id")}
            />
          </Field>
        </div>

        <div className="bg-white border border-outline-variant p-6 flex flex-col gap-5">
          <h2 className="text-label-caps text-on-surface-variant border-b border-outline-variant pb-3">
            Contract Scope
          </h2>

          <Field label="Department" required>
            <select className={SELECT} value={form.department_id} onChange={set("department_id")}>
              <option value="">Select department…</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Work Type" required>
              <select className={SELECT} value={form.contract_type} onChange={set("contract_type")}>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Contract Value (₹ Lakh)" required>
              <input
                className={INPUT}
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 42.50"
                value={form.value_lakh}
                onChange={set("value_lakh")}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" required>
              <input className={INPUT} type="date" value={form.start_date} onChange={set("start_date")} />
            </Field>
            <Field label="End Date">
              <input className={INPUT} type="date" value={form.end_date} onChange={set("end_date")} />
            </Field>
          </div>

          <Field label="Status" required>
            <select className={SELECT} value={form.status} onChange={set("status")}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="bg-white border border-outline-variant p-6 flex flex-col gap-5">
          <h2 className="text-label-caps text-on-surface-variant border-b border-outline-variant pb-3">
            Additional Information
          </h2>
          <Field label="Notes">
            <textarea
              className={`${INPUT} resize-none h-20`}
              placeholder="Any additional context about this contract…"
              value={form.notes}
              onChange={set("notes")}
            />
          </Field>
        </div>

        {error && (
          <div className="bg-destructive/5 border border-destructive/30 px-4 py-3 text-body-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary text-label-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Contract"}
          </button>
          <Link href="/cm/contractors">
            <button type="button" className="px-4 py-2.5 border border-outline-variant text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">
              Cancel
            </button>
          </Link>
        </div>

        <div className="bg-surface-container border border-outline-variant p-4">
          <p className="text-label-caps text-on-surface-variant mb-1">How correlation works</p>
          <p className="text-body-sm text-on-surface-variant">
            Once marked <strong>Completed</strong>, run Analysis to compare complaint rates in the
            covered wards 90 days before vs 180 days after the contract end date. A spike &gt;150%
            flags the contractor for review.
          </p>
        </div>
      </form>
    </div>
  );
}
