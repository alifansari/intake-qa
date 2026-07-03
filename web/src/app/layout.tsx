import type { Metadata } from "next";
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { DemoModeProvider } from "@/components/demo-mode";

// Editorial serif for display headings; a quiet grotesque for body/UI; a mono
// for tabular figures. This trio reads like a financial statement, not a SaaS app.
const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Outcome Reconciliation — Intake QA",
  description:
    "Did the score predict reality? Flag precision, recovered fees, and calibration for personal-injury intake calls.",
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
