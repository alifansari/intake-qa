// Accessible FAQ using native <details> (keyboard-operable, zero JS) plus
// FAQPage JSON-LD for rich results. Server component.

export type QA = { q: string; a: string };

export function FAQAccordion({ items }: { items: QA[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
  return (
    <div className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
      {items.map((it, i) => (
        <details key={i} className="group px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-medium text-ink marker:content-none">
            {it.q}
            <span className="flex-none text-accent transition-transform group-open:rotate-45" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </summary>
          <p className="pb-5 text-ink-muted">{it.a}</p>
        </details>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
