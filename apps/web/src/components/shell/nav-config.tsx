import {
  LayoutDashboard,
  Map,
  Flame,
  Building2,
  LineChart,
  FileText,
  ListChecks,
  Users,
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

export const CM_NAV: NavSection[] = [
  {
    items: [
      { href: "/cm", label: "Overview", icon: LayoutDashboard },
      { href: "/cm/map", label: "GIS Heatmap", icon: Map },
      { href: "/cm/hotspots", label: "Hotspots", icon: Flame },
      { href: "/cm/departments", label: "Departments", icon: Building2 },
      { href: "/cm/analytics", label: "Analytics & AI", icon: LineChart },
      { href: "/cm/reports", label: "Reports", icon: FileText },
    ],
  },
];

export const OFFICER_NAV: NavSection[] = [
  {
    items: [
      { href: "/officer", label: "Dashboard", icon: LayoutDashboard },
      { href: "/officer/queue", label: "My Queue", icon: ListChecks },
      { href: "/officer/team", label: "Team", icon: Users },
    ],
  },
];
