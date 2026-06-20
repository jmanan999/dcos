import Link from "next/link";
import { MarketingHeader } from "@/components/shell/marketing-header";
import { Footer } from "@/components/shell/footer";

const TABS = [
  { href: "/transparency", label: "Overview" },
  { href: "/transparency/departments", label: "Departments" },
  { href: "/transparency/map", label: "Ward Map" },
];

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-card/40">
          <div className="container flex flex-col gap-3 py-7">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Delhi Transparency Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time, anonymized civic grievance data across the NCT. Updated every minute.
              </p>
            </div>
            <nav className="flex gap-1">
              {TABS.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="container py-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
