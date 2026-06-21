"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export function Footer() {
  const { t } = useLanguage();

  const COLS = [
    {
      title: "Quick Links",
      links: [
        { href: "/file",         label: t("nav.file") },
        { href: "/track",        label: t("nav.track") },
        { href: "/login",        label: t("nav.signin") },
        { href: "/transparency", label: "Public Data" },
      ],
    },
    {
      title: "Transparency",
      links: [
        { href: "/transparency",             label: "Live Dashboard" },
        { href: "/transparency/departments", label: "Department Performance" },
        { href: "/transparency/map",         label: "Ward Map" },
      ],
    },
    {
      title: "Government Access",
      links: [
        { href: "/login", label: t("footer.officer_login") },
        { href: "/login", label: t("footer.command") },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="text-sm font-bold text-foreground">JanSetu Delhi</p>
            <p className="label-caps text-muted-foreground mt-1">Grievance Portal</p>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="label-caps text-foreground">{col.title}</p>
              <ul className="mt-4 space-y-2">
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

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 sm:flex-row sm:items-center">
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
