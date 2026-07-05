// The find-it-free guarantee seal. Gold is used ONLY here.

export function GuaranteeBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-4 rounded-card border border-gold/40 bg-gold-tint/60 p-5 ${className}`}
    >
      <div
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-2 border-gold text-gold"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 17l.9-5.4L4.2 7.7l5.4-.8z" />
        </svg>
      </div>
      <div>
        <p className="font-display text-base font-semibold text-ink">Find-it-free guarantee</p>
        <p className="mt-1 text-sm text-ink-muted">
          If your Leak Audit doesn&apos;t identify at least{" "}
          <span className="tnum font-semibold text-ink">$25,000</span> in recoverable signable fees,
          the audit costs you nothing — and there&apos;s no pitch.
        </p>
      </div>
    </div>
  );
}
