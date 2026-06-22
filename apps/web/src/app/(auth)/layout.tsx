import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LanguageProvider } from "@/lib/i18n";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Brand panel — IC Bold: black bg, amber accent, giant type */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#080808] p-14 text-white lg:flex border-r-2 border-[#1f1f1f]">
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-ic-grid opacity-[0.4]" />

          <Link href="/" className="relative flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-[#E8920A] text-[#080808] text-[11px] font-black font-grotesk select-none">
              JS
            </span>
            <div className="leading-none">
              <p className="text-sm font-black text-white font-grotesk tracking-tight">JanSetu</p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-grotesk">Delhi Grievance Portal</p>
            </div>
          </Link>

          <div className="relative space-y-8">
            {/* Big amber number */}
            <div className="font-grotesk font-black text-[#E8920A] leading-none tracking-[-0.03em]"
                 style={{ fontSize: "clamp(64px, 8vw, 96px)" }}>
              45<span className="text-white/20 font-black" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>s</span>
            </div>
            <h2 className="max-w-md font-grotesk font-black text-white leading-tight text-2xl tracking-tight">
              JanSetu &mdash; People&apos;s Bridge to the Government of Delhi.
            </h2>
            <ul className="space-y-3 text-sm text-white/50">
              {[
                "File in your language — Hindi, English, Punjabi or Urdu",
                "AI routes your complaint to the right department in seconds",
                "Track every step with SLA-backed accountability",
                "Officers resolve with geo-verified proof of work",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#E8920A]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-[11px] text-white/20 font-grotesk tracking-wide">
            © {new Date().getFullYear()} Government of NCT of Delhi
          </p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center bg-[#FAFAFA] px-6 py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>

      </div>
    </LanguageProvider>
  );
}
