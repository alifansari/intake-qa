import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { DemoModeProvider } from "@/components/demo-mode";

// Fraunces: editorial serif display (optical sizing on) for headlines.
// Inter: quiet, legible body/UI sans. IBM Plex Mono: tabular figures for every
// dollar amount, stat, and chart axis. Self-hosted via next/font, display:swap,
// preloaded — no layout shift.
const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://intake-qa.vercel.app"),
  title: "Intake QA — Case Acquisition Intelligence for personal injury firms",
  description:
    "Case Acquisition Intelligence reads 100% of your intake calls, detects the signable cases that didn't sign, and reports what your intake produced — in dollars. Book your $500 Leak Audit.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <DemoModeProvider>
          <Nav />
          <main className="flex-1">{children}</main>
        </DemoModeProvider>
      </body>
    </html>
  );
}
