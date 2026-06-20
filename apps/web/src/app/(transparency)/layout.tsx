"use client";

import Link from "next/link";
import { MarketingHeader } from "@/components/shell/marketing-header";
import { Footer } from "@/components/shell/footer";
import { LanguageProvider, useLanguage } from "@/lib/i18n";

function TransparencyHeader() {
  const { t } = useLanguage();
  const TABS = [
    { href: "/transparency", label: t("transparency.overview") },
    { href: "/transparency/departments", label: t("transparency.departments") },
    { href: "/transparency/map", label: t("transparency.map") },
  ];
  return (
    <div className="border-b border-border bg-card/40">
      <div className="container flex flex-col gap-3 py-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("transparency.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("transparency.subtitle")}</p>
        </div>
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col">
        <MarketingHeader />
        <main className="flex-1">
          <TransparencyHeader />
          <div className="container py-8">{children}</div>
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
