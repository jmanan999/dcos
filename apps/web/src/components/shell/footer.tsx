"use client";

import Link from "next/link";
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
    <footer className="border-t border-border">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold select-none">
                JS
              </span>
              <div className="leading-none">
                <p className="text-sm font-bold text-foreground">JanSetu</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Delhi Grievance Portal
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.title}
              </p>
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

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 sm:flex-row sm:items-center">
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
