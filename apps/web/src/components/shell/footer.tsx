import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const COLS = [
  {
    title: "Citizens",
    links: [
      { href: "/file", label: "File a Complaint" },
      { href: "/track", label: "Track Status" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Transparency",
    links: [
      { href: "/transparency", label: "Public Dashboard" },
      { href: "/transparency/departments", label: "Department Performance" },
      { href: "/transparency/map", label: "Ward Map" },
    ],
  },
  {
    title: "Government",
    links: [
      { href: "/login", label: "Officer Login" },
      { href: "/login", label: "Command Center" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-foreground">DCOS Delhi</p>
                <p className="text-2xs uppercase tracking-wider text-muted-foreground">
                  Citizen Operating System
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              A unified civic grievance platform for the National Capital Territory of Delhi.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-foreground">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Government of NCT of Delhi. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Helpline 1031 · Emergency 112 · DPDP Act 2023 compliant
          </p>
        </div>
      </div>
    </footer>
  );
}
