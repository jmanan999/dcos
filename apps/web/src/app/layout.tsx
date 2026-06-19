import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DCOS — Delhi Citizen Operating System",
    template: "%s | DCOS Delhi",
  },
  description:
    "File, track, and resolve civic grievances for Delhi. " +
    "Aapki shikayat, sarkar tak pahunche.",
  keywords: ["Delhi", "grievance", "civic", "shikayat", "sarkar"],
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1a4fa3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
