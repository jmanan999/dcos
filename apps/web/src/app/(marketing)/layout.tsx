import { MarketingHeader } from "@/components/shell/marketing-header";
import { Footer } from "@/components/shell/footer";
import { LanguageProvider } from "@/lib/i18n";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col bg-[#F8FAF9]">
        <MarketingHeader />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
