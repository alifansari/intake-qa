import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ESSAY_BODY, DECK } from "./content";
import styles from "./letter.module.css";

// A permanent, legally-reviewed signed document. Static, no client JS, no
// analytics, no third-party requests. The internal site nav stands down on
// /letter (see components/nav.tsx) so the page renders as a clean document.
export const dynamic = "force-static";

const PUBLICATION_DATE = "July 6, 2026"; // set once; used in dateline, attestation, version, OG
const PUBLICATION_ISO = "2026-07-06";

// The Spanish translation at /carta is scaffolded but not yet published. Flip this
// (and paste content into app/carta) to emit hreflang alternates + link it.
const CARTA_READY = false;

export const metadata: Metadata = {
  title: "The Unscored Conversation — An open letter to Northern California PI managing partners",
  description:
    "A signed open letter on the four minutes of intake that decide a case, and a free 30-day founding-cohort Leak Audit for the first five Northern California PI firms.",
  authors: [{ name: "Ali Ansari" }],
  alternates: {
    canonical: "https://plaintiffops.com/letter",
    ...(CARTA_READY
      ? { languages: { en: "https://plaintiffops.com/letter", es: "https://plaintiffops.com/carta" } }
      : {}),
  },
  openGraph: {
    type: "article",
    title: "The Unscored Conversation",
    description: DECK,
    url: "https://plaintiffops.com/letter",
    authors: ["Ali Ansari"],
    publishedTime: PUBLICATION_ISO,
  },
  twitter: { card: "summary_large_image", title: "The Unscored Conversation", description: DECK },
};

// --- Tiny, deterministic markdown subset renderer -------------------------------
// Handles ONLY what the final essay uses: blank-line-separated paragraphs, "## "
// headings, and *italic* spans. No remark, no smartypants, no quote/dash transform,
// so every em dash and curly quote passes through byte-for-byte.
function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split("*").map((seg, i) =>
    i % 2 === 1 ? <em key={`${keyBase}-${i}`}>{seg}</em> : <span key={`${keyBase}-${i}`}>{seg}</span>,
  );
}

function renderBody(md: string): ReactNode[] {
  return md
    .trim()
    .split(/\n\n+/)
    .map((block, i) => {
      if (block.startsWith("## ")) {
        return <h2 key={i}>{renderInline(block.slice(3), `h${i}`)}</h2>;
      }
      return <p key={i}>{renderInline(block, `p${i}`)}</p>;
    });
}

export default function LetterPage() {
  return (
    <div className={styles.page}>
      <article className={styles.letter} lang="en">
        <header className={styles.masthead}>
          <p className={styles.kicker}>
            An open letter to the managing partners of Northern California&rsquo;s personal-injury firms
          </p>
          <h1 className={styles.title}>The Unscored Conversation</h1>
          <p className={styles.deck}>{DECK}</p>
          <hr className={styles.rule} />
          <p className={styles.dateline}>Sacramento, California · {PUBLICATION_DATE}</p>
          <p className={styles.salutation}>To the managing partner reading this at the end of a long day,</p>
        </header>

        <div className={styles.body}>{renderBody(ESSAY_BODY)}</div>

        <footer className={styles.attestation}>
          {/* TODO(Ali): replace with a purpose-drawn STYLIZED public mark at
              /public/letter-signature.svg. It must be a distinct public mark, NOT a
              scan of a binding legal/banking signature. A placeholder ships today. */}
          <img className={styles.sigMark} src="/letter-signature.svg" alt="Signature of Ali Ansari" />
          <p className={styles.attName}>Ali Ansari</p>
          <p className={styles.attLine}>Analyst of Record</p>
          <p className={styles.attLine}>Plaintiff Ops LLC · Sacramento, California</p>
          <p className={styles.attLine}>{PUBLICATION_DATE}</p>

          <p className={styles.attMeta}>
            I publish my own error rate at <a href="/honesty">/honesty</a>.
          </p>

          <p className={styles.attMeta}>
            When you are ready to be measured, start your firm&rsquo;s free Leak Audit at{" "}
            <a href="/audit">/audit</a>.
          </p>

          <div className={styles.monogramRow}>
            <span className={styles.monogram} aria-hidden="true">
              IQ
            </span>
            <span className={styles.version}>Version 1.1 · updated {PUBLICATION_DATE}</span>
          </div>
        </footer>

        <aside className={styles.colophon}>
          <p>
            Changelog. 1.1: the invitation changed from a flat-fee audit to a free founding-cohort
            pilot for the first five firms. The post-pilot fee remains flat and outcome-decoupled.
          </p>
          <p>
            Set in Source Serif 4, a contemporary text face in the tradition of book and
            legal-document types chosen for long-form reading, not screens. The text is
            human-authored and signed.
          </p>
          <p>
            No cookies. No third-party trackers. You can verify this in your browser&rsquo;s network
            tab. Plain text: <a href="/letter.txt">/letter.txt</a>.
          </p>
        </aside>
      </article>
    </div>
  );
}
