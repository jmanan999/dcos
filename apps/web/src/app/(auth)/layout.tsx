import Link from "next/link";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { LanguageProvider } from "@/lib/i18n";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-grid opacity-[0.07]" />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold">DCOS Delhi</p>
            <p className="text-2xs uppercase tracking-wider text-sidebar-muted">
              Citizen Operating System
            </p>
          </div>
        </Link>

        <div className="relative space-y-6">
          <h2 className="max-w-md text-3xl font-bold leading-tight text-balance">
            One platform for every civic grievance in Delhi.
          </h2>
          <ul className="space-y-3 text-sm text-sidebar-foreground">
            {[
              "File in your language — Hindi, English, Punjabi or Urdu",
              "AI routes your complaint to the right department in seconds",
              "Track every step with SLA-backed accountability",
              "Officers resolve with geo-verified proof of work",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-accent" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-2xs text-sidebar-muted">
          © {new Date().getFullYear()} Government of NCT of Delhi
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
    </LanguageProvider>
  );
}
