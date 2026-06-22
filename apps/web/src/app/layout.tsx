import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { ChatBot } from "@/components/chatbot/chat-bot";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "JanSetu — Delhi Grievance Portal",
    template: "%s · JanSetu",
  },
  description:
    "JanSetu — File, track, and resolve civic grievances for Delhi. " +
    "Aapki shikayat, sarkar tak pahunche.",
  keywords: ["JanSetu", "Delhi", "grievance", "civic", "shikayat", "sarkar", "jansetu", "जनसेतु"],
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#E8920A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          {children}
          <ChatBot />
        </Providers>
      </body>
    </html>
  );
}
