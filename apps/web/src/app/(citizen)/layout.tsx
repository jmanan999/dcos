import { MarketingHeader } from "@/components/shell/marketing-header";
import { Footer } from "@/components/shell/footer";
import { LanguageProvider } from "@/lib/i18n";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col">
        <MarketingHeader />
        <main className="flex-1">
          <div className="container py-8 lg:py-10">{children}</div>
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
