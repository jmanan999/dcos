"use client";

import Link from "next/link";
import { Globe, ShieldCheck, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function Footer() {
  const { t } = useLanguage();

  const COLS = [
    {
      title: t("footer.quick_links"),
      links: [
        { href: "/file",         label: t("footer.services_dir") },
        { href: "/track",        label: t("footer.tracking_portal") },
        { href: "/transparency", label: t("footer.transparency_lab") },
        { href: "/login",        label: t("footer.official_access") },
      ],
    },
    {
      title: t("footer.legals"),
      links: [
        { href: "/privacy", label: t("footer.privacy") },
        { href: "/privacy", label: t("footer.terms") },
        { href: "/privacy", label: t("footer.compliance") },
        { href: "/privacy", label: t("footer.accessibility") },
      ],
    },
    {
      title: t("footer.contact"),
      links: [],
      info: [
        "Support: 1800-DELHI-JS",
        "info@jansetu.delhi.gov.in",
        "Secretariat, New Delhi",
      ],
    },
  ];

  return (
    <footer className="bg-surface border-t border-outline-variant py-16">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="text-sm font-bold text-on-surface">JanSetu Delhi</p>
            <p className="label-caps text-on-surface-variant mt-1">{t("footer.description")}</p>
            <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
              {t("footer.brand_desc")}
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="label-caps text-on-surface mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-on-surface-variant transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                {col.info?.map((line) => (
                  <li key={line} className="text-sm text-on-surface-variant">{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-outline-variant pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-on-surface-variant">
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div className="flex gap-5">
            <Globe className="h-4 w-4 text-on-surface-variant hover:text-primary transition-colors cursor-pointer" aria-hidden="true" />
            <ShieldCheck className="h-4 w-4 text-on-surface-variant hover:text-primary transition-colors cursor-pointer" aria-hidden="true" />
            <BadgeCheck className="h-4 w-4 text-on-surface-variant hover:text-primary transition-colors cursor-pointer" aria-hidden="true" />
          </div>
        </div>
      </div>
    </footer>
  );
}
