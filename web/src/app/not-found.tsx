import Link from "next/link";
import { CTA_PRIMARY } from "@/lib/site-constants";

export const metadata = { title: "Page not found | Intake QA" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink text-balance">
        That page walked. This one, we can’t get back, but your signable cases, we can.
      </h1>
      <p className="mt-3 text-ink-muted">Head to the audit.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/audit"
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {CTA_PRIMARY}
        </Link>
        <Link
          href="/"
          className="rounded-pill border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:border-accent"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
