import {
  LayoutDashboard,
  Map,
  Flame,
  Building2,
  FileText,
  ListChecks,
  Users,
  Inbox,
  Hourglass,
  TriangleAlert,
  ShieldCheck,
  Briefcase,
  PieChart,
  TrendingUp,
  Bell,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// ── Tier 1 — Field Officer ("My Work") ─────────────────────────────────────────
export const OFFICER_NAV: NavSection[] = [
  {
    items: [
      { href: "/officer", label: "Dashboard", icon: LayoutDashboard },
      { href: "/officer/queue", label: "My Queue", icon: ListChecks },
      { href: "/officer/team", label: "Team", icon: Users },
    ],
  },
];

// ── Tier 2 — Nodal / Department Workbench ──────────────────────────────────────
export const DEPT_NAV: NavSection[] = [
  {
    items: [
      { href: "/dept", label: "Pendency Monitor", icon: Hourglass },
      { href: "/dept/queue", label: "Assignment Desk", icon: Inbox },
      { href: "/dept/team", label: "Team Workload", icon: Users },
      { href: "/dept/triage", label: "Triage & Categorisation", icon: TriangleAlert },
    ],
  },
];

// ── Tier 3 — CM Cell — State Grievance Control Room ─────────────────────────────
export const CM_NAV: NavSection[] = [
  {
    items: [
      { href: "/cm", label: "Control Room", icon: ShieldCheck },
      { href: "/cm/map", label: "Ward Heatmap", icon: Map },
      { href: "/cm/hotspots", label: "Hotspots", icon: Flame },
      { href: "/cm/departments", label: "Departments", icon: Building2 },
      { href: "/cm/contractors", label: "Contractors", icon: Briefcase },
      { href: "/cm/intelligence", label: "Budget Intelligence", icon: PieChart },
      { href: "/cm/simulate", label: "Policy Simulator", icon: TrendingUp },
      { href: "/cm/predict", label: "Predict & Alert", icon: Bell },
      { href: "/cm/analytics", label: "AI Chief Secretary", icon: LayoutDashboard },
      { href: "/cm/reports", label: "Reports", icon: FileText },
    ],
  },
];
