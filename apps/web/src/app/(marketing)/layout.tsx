import { MarketingHeader } from "@/components/shell/marketing-header";
import { Footer } from "@/components/shell/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
