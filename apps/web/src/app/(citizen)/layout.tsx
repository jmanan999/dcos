import { MarketingHeader } from "@/components/shell/marketing-header";
import { Footer } from "@/components/shell/footer";
import { LanguageProvider } from "@/lib/i18n";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col bg-[#F8FAF9]">
        <MarketingHeader />
        <main className="flex-1 pt-[60px]">
          <div className="max-w-[1280px] mx-auto px-16 py-10">{children}</div>
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
