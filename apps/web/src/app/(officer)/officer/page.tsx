"use client";

import Link from "next/link";
import { ListChecks, Clock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import {
  PageHeader,
  StatCard,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  SeverityBadge,
  Skeleton,
  EmptyState,
} from "@dcos/ui";
import { useQueue } from "@/lib/hooks";
import { useAuth } from "@/lib/auth/provider";

export default function OfficerDashboard() {
  const { user } = useAuth();
  const { data: queue, isLoading } = useQueue();

  const assigned = queue?.filter((g) => g.status === "ASSIGNED").length ?? 0;
  const inProgress = queue?.filter((g) => g.status === "IN_PROGRESS").length ?? 0;
  const breached = queue?.filter((g) => g.is_sla_breached).length ?? 0;
  const recent = queue?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Your assigned grievances and SLA health at a glance."
        actions={
          <Link href="/officer/queue">
            <Button>
              <ListChecks className="h-4 w-4" /> Open queue
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned to me" value={assigned} icon={<ListChecks className="h-4 w-4" />} accent="primary" />
        <StatCard label="In progress" value={inProgress} icon={<Clock className="h-4 w-4" />} accent="warning" />
        <StatCard label="SLA breached" value={breached} icon={<AlertTriangle className="h-4 w-4" />} accent="danger" />
        <StatCard label="Total open" value={queue?.length ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} accent="info" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent in your queue</CardTitle>
          <Link href="/officer/queue" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Queue is clear"
              description="No grievances assigned to you right now."
            />
          ) : (
            <div className="space-y-2">
              {recent.map((g) => (
                <Link key={g.id} href={`/officer/grievance/${g.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">{g.tracking_id}</span>
                        {g.severity != null && <SeverityBadge score={g.severity} />}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{g.raw_text}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={g.status as never} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
