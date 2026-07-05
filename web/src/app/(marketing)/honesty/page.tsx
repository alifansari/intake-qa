import type { Metadata } from "next";
import Link from "next/link";
import { ScoreBandChart } from "@/components/marketing/ScoreBandChart";
import { DecayCurve } from "@/components/marketing/DecayCurve";

export const metadata: Metadata = {
  title: "Honesty page — our real accuracy numbers | Intake QA",
  description:
    "Our calibrated flag precision and recall, dated and with n disclosed, plus the full list of calls we missed.",
  alternates: { canonical: "/honesty" },
};

const MATRIX = [
  ["Correct flags (true positives)", 231, "text-accent"],
  ["False alarms (false positives)", 69, "text-alert"],
  ["Missed catches (false negatives)", 108, "text-alert"],
  ["Correct passes (true negatives)", 592, "text-ink"],
] as const;

const MISSES = [
  ["Missed catch", "Rear-end, commercial policy — model under-scored signability", "$42,000"],
  ["Missed catch", "Dog bite, homeowner liability — caller downplayed injuries", "$18,500"],
  ["False alarm", "Property-damage-only — flagged signable, wasn't", "$0"],
  ["Missed catch", "Slip-and-fall, grocery — ambiguous liability language", "$26,000"],
  ["False alarm", "Prior representation — flagged, already had a lawyer", "$0"],
] as const;

export default function HonestyPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">Honesty</p>
      <h1 className="mt-3 max-w-[24ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Our model&apos;s report card — including the parts we failed.
      </h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-hairline bg-surface p-6">
          <p className="tnum font-display text-4xl font-semibold text-ink">77%</p>
          <p className="mt-1 text-sm font-medium text-ink">Flag precision</p>
          <p className="mt-1 text-sm text-ink-muted">When we flag a signable case that walked, we&apos;re right this often.</p>
        </div>
        <div className="rounded-card border border-hairline bg-surface p-6">
          <p className="tnum font-display text-4xl font-semibold text-ink">68%</p>
          <p className="mt-1 text-sm font-medium text-ink">Recall</p>
          <p className="mt-1 text-sm text-ink-muted">Of the signable cases that truly walked, the share we caught.</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-faint">
        As of the July 2026 calibration run · <span className="tnum">n=1,000</span> resolved calls
        (the confusion matrix below).
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">Confusion matrix</h2>
        <div className="mt-4 overflow-x-auto rounded-card border border-hairline">
          <table className="w-full min-w-[420px] text-sm">
            <tbody>
              {MATRIX.map(([label, n, tone]) => (
                <tr key={label} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 text-ink">{label}</td>
                  <td className={`tnum px-4 py-3 text-right font-semibold ${tone}`}>{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">Our misses — with dollar amounts</h2>
        <p className="mt-2 max-w-[68ch] text-ink-muted">The cases our model got wrong. We show them because trusting an AI with your revenue requires seeing where it&apos;s wrong.</p>
        <div className="mt-4 overflow-x-auto rounded-card border border-hairline">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-left">What happened</th>
                <th className="px-4 py-2.5 text-right">Fee at stake</th>
              </tr>
            </thead>
            <tbody>
              {MISSES.map(([type, desc, amt], i) => (
                <tr key={i} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3"><span className={type === "Missed catch" ? "text-alert" : "text-amber"}>{type}</span></td>
                  <td className="px-4 py-3 text-ink-muted">{desc}</td>
                  <td className="tnum px-4 py-3 text-right font-semibold text-ink">{amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Does the score predict reality?</h2>
          <ScoreBandChart />
        </div>
        <div>
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Why speed matters</h2>
          <DecayCurve />
        </div>
      </section>

      <p className="mt-12 max-w-[70ch] text-lg text-ink-muted">
        We show you this because trusting an AI with your revenue requires seeing where it&apos;s
        wrong. If a vendor won&apos;t show you their error rate, ask why.
      </p>
      <div className="mt-6">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run your free Intake Quality Audit
        </Link>
      </div>
    </div>
  );
}
