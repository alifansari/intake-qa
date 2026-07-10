import type { Metadata } from "next";
import { IntakeChat } from "./chat";

export const metadata: Metadata = {
  title: "Intake Agent Demo — Plaintiff Ops",
  description:
    "A demonstration of a compliant, consent-first intake chat agent for personal-injury firms.",
  robots: { index: false }, // internal demo — not for search engines
};

// The standalone chat-capture demo (Phase 2). PUBLIC page, but NOT wired to
// any firm's live site: it demonstrates what a compliant intake agent looks
// like — consent-first, one question at a time, gather-and-schedule only —
// and displays the terminal bucket + the canonical record it produced.
// Persistence is write-only into intake_leads so an abandoned session is
// still a captured lead; nothing is booked, alerted, or sent anywhere.
export default function IntakeDemoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="eyebrow">Plaintiff Ops · Demonstration</div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Compliant intake agent — live demo
          </h1>
        </div>
      </div>
      <p className="mb-6 max-w-[60ch] text-sm text-muted">
        This is a demonstration, not a law firm intake. It shows the pattern: disclosure and
        consent before anything else, one question at a time, contact captured early, and a
        structured record with a routing decision at the end. The agent gathers and schedules
        only — it never evaluates a claim or gives advice.
      </p>
      <IntakeChat />
      <p className="mt-8 text-xs text-faint">
        Part of Intake QA, the independent recovery desk.{" "}
        <a href="/demo" className="underline hover:text-ink">See a call get scored</a> ·{" "}
        <a href="/audit" className="underline hover:text-ink">Get your free Leak Audit</a> ·{" "}
        <a href="/" className="underline hover:text-ink">Home</a>
      </p>
    </div>
  );
}
