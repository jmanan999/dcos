"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function Footer() {
  const { t } = useLanguage();

  const COLS = [
    {
      title: t("footer.citizens"),
      links: [
        { href: "/file", label: t("nav.file") },
        { href: "/track", label: t("nav.track") },
        { href: "/login", label: t("nav.signin") },
      ],
    },
    {
      title: t("footer.transparency"),
      links: [
        { href: "/transparency", label: "Public Dashboard" },
        { href: "/transparency/departments", label: "Department Performance" },
        { href: "/transparency/map", label: "Ward Map" },
      ],
    },
    {
      title: t("footer.government"),
      links: [
        { href: "/login", label: t("footer.officer_login") },
        { href: "/login", label: t("footer.command") },
      ],
    },
  ];

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
              {t("footer.description")}
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-foreground">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
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
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("footer.helpline")} · DPDP Act 2023 compliant
          </p>
        </div>
      </div>
    </footer>
  );
}
