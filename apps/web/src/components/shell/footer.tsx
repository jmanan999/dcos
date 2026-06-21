"use client";

import Link from "next/link";
import { Globe, ShieldCheck, BadgeCheck } from "lucide-react";

export function Footer() {
  const COLS = [
    {
      title: "Quick Links",
      links: [
        { href: "/file",         label: "Services Directory" },
        { href: "/track",        label: "Tracking Portal" },
        { href: "/transparency", label: "Transparency Lab" },
        { href: "/login",        label: "Official Access" },
      ],
    },
    {
      title: "Legals",
      links: [
        { href: "/privacy",      label: "Privacy Policy" },
        { href: "/privacy",      label: "Terms of Service" },
        { href: "/privacy",      label: "Compliance" },
        { href: "/privacy",      label: "Accessibility" },
      ],
    },
    {
      title: "Contact",
      links: [],
      info: [
        "Support: 1800-DELHI-JS",
        "info@jansetu.delhi.gov.in",
        "Secretariat, New Delhi",
      ],
    },
  ];

  return (
    <footer className="bg-surface border-t border-outline-variant py-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-20">
          {/* Brand */}
          <div className="col-span-1">
            <span className="text-label-caps font-bold block mb-6 text-on-surface">
              JanSetu Delhi
            </span>
            <p className="text-body-sm text-on-surface-variant max-w-xs">
              An institutional initiative by the Delhi Administration to modernise grievance
              redressal through technology and transparency.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <span className="text-label-caps text-on-surface mb-6 block">{col.title}</span>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                {col.info?.map((line) => (
                  <li key={line} className="text-body-sm text-on-surface-variant">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-body-sm text-on-surface-variant">
            © {new Date().getFullYear()} JanSetu Delhi. Institutional Governance Portal.
          </span>
          <div className="flex gap-6">
            <Globe className="h-5 w-5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
            <ShieldCheck className="h-5 w-5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
            <BadgeCheck className="h-5 w-5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </footer>
  );
}
