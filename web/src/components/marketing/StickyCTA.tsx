"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CTA_PRIMARY, CTA_SECONDARY, CTA_SECONDARY_HREF } from "@/lib/site-constants";

// Persistent primary CTA, appears after 600px of scroll on mobile + desktop.
// No animation beyond a fade; respects reduced-motion via the global CSS rule.
export function StickyCTA() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`no-print fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 transition-opacity ${
        shown ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!shown}
    >
      <div className="flex items-center gap-2 rounded-pill border border-hairline bg-canvas/95 p-1.5 shadow-card backdrop-blur-sm">
        <Link
          href="/audit"
          tabIndex={shown ? 0 : -1}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {CTA_PRIMARY}
        </Link>
        <Link
          href={CTA_SECONDARY_HREF}
          tabIndex={shown ? 0 : -1}
          className="hidden px-4 py-3 text-sm font-medium text-ink-muted hover:text-ink sm:inline"
        >
          {CTA_SECONDARY}
        </Link>
      </div>
    </div>
  );
}
