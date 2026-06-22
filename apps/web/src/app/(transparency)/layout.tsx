"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarketingHeader } from "@/components/shell/marketing-header";
import { Footer } from "@/components/shell/footer";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { cn } from "@dcos/ui";

function TransparencyHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const TABS = [
    { href: "/transparency",             label: t("transparency.overview") },
    { href: "/transparency/wards",       label: "Ward Index" },
    { href: "/transparency/departments", label: t("transparency.departments") },
    { href: "/transparency/contractors", label: "Contractors" },
    { href: "/transparency/map",         label: t("transparency.map") },
  ];

  return (
    <div className="border-b-2 border-[#080808] bg-white">
      <div className="max-w-[1280px] mx-auto px-16">
        <div className="flex flex-col gap-0 pt-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              {/* Amber accent bar */}
              <div className="w-1 h-7 bg-[#E8920A]" />
              <h1 className="text-2xl font-black tracking-tight text-[#080808] font-grotesk">
                {t("transparency.title")}
              </h1>
            </div>
            <p className="ml-4 text-sm text-[#6B7280] leading-relaxed">{t("transparency.subtitle")}</p>
          </div>

          {/* Tab navigation — IC Bold underline style */}
          <nav className="flex gap-0 border-t border-[#E5E7EB]">
            {TABS.map((tab) => {
              const active = pathname === tab.href || (tab.href !== "/transparency" && pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "px-5 py-3 label-caps border-b-2 -mb-px transition-colors",
                    active
                      ? "text-[#080808] border-[#E8920A]"
                      : "text-[#6B7280] border-transparent hover:text-[#080808] hover:border-[#E5E7EB]"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
        <MarketingHeader />
        <main className="flex-1 pt-[60px]">
          <TransparencyHeader />
          <div className="max-w-[1280px] mx-auto px-16 py-10">{children}</div>
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
