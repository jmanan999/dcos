/** Human SLA countdown + tone, shared across officer/dept/cm surfaces. */
export function slaCountdown(
  due: string | null,
  breached?: boolean
): { label: string; tone: string } {
  if (!due) return { label: "—", tone: "text-muted-foreground" };
  const ms = new Date(due).getTime() - Date.now();
  if (breached || ms < 0) return { label: "Overdue", tone: "text-destructive font-semibold" };
  const hrs = Math.floor(ms / 3.6e6);
  if (hrs < 6) return { label: `${hrs}h left`, tone: "text-warning font-medium" };
  if (hrs < 24) return { label: `${hrs}h left`, tone: "text-foreground" };
  return { label: `${Math.floor(hrs / 24)}d left`, tone: "text-muted-foreground" };
}

/** Days since a timestamp (used for pendency age). */
export function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
