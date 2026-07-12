import type { Metadata } from "next";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

// Source Serif 4: an expert-report serif with genuine legal-document gravitas
// (Round 7 visual direction) for headlines and statement excerpts. Inter: quiet,
// legible body/UI sans. IBM Plex Mono: tabular figures for every dollar amount,
// stat, and chart axis. Self-hosted via next/font, display:swap, preloaded.
const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  metadataBase: new URL("https://plaintiffops.com"),
  title: "Intake QA: the independent intake desk for PI firms",
  description:
    "Everyone you pay to handle your intake grades their own work. Intake QA is the independent desk that checks the whole board against what actually got signed, and finds the signable cases that walked. Run your free Leak Audit.",
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
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
