import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DECK, BODY, FOOTER_NOTE } from "./content";
import styles from "../insights.module.css";

// Static cornerstone essay. No client JS, no third-party requests. Inherits the
// marketing shell (nav / footer) from app/(marketing)/layout.tsx.
export const dynamic = "force-static";

const TITLE = "Self-Blame Is a Discount, Not a Decline";
const PUB_DATE = "July 14, 2026";
const PUB_ISO = "2026-07-14";
const URL = "https://plaintiffops.com/insights/self-blame-is-a-discount-not-a-decline";

export const metadata: Metadata = {
  title: `${TITLE} — Plaintiff Ops`,
  description: DECK,
  authors: [{ name: "Ali Ansari" }],
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DECK,
    url: URL,
    authors: ["Ali Ansari"],
    publishedTime: PUB_ISO,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DECK },
};

// --- Tiny deterministic markdown subset renderer -------------------------------
// Handles ONLY: blank-line paragraphs, "## " headings, "- " list items, *italic*.
// Converts straight quotes/apostrophes to curly so the page matches site type.
function smart(s: string): string {
  return s
    .replace(/"([^"]*)"/g, "“$1”")
    .replace(/(\w)'(\w)/g, "$1’$2")
    .replace(/(\w)'/g, "$1’")
    .replace(/'/g, "’");
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  return smart(text)
    .split("*")
    .map((seg, i) =>
      i % 2 === 1 ? (
        <em key={`${keyBase}-${i}`}>{seg}</em>
      ) : (
        <span key={`${keyBase}-${i}`}>{seg}</span>
      ),
    );
}

function renderBody(md: string): ReactNode[] {
  return md
    .trim()
    .split(/\n\n+/)
    .map((block, i) => {
      if (block === "---") return <hr key={i} className={styles.divider} />;
      if (block.startsWith("## ")) {
        return (
          <h2 key={i} className={styles.h2}>
            {renderInline(block.slice(3), `h${i}`)}
          </h2>
        );
      }
      const lines = block.split("\n");
      if (lines.every((l) => l.startsWith("- "))) {
        return (
          <ul key={i} className={styles.list}>
            {lines.map((l, j) => (
              <li key={j}>{renderInline(l.slice(2), `l${i}-${j}`)}</li>
            ))}
          </ul>
        );
      }
      return (
        <p key={i} className={styles.p}>
          {renderInline(block, `p${i}`)}
        </p>
      );
    });
}

export default function InsightArticle() {
  return (
    <div>
      <article className={styles.article} lang="en">
        <p className={styles.eyebrow}>Field notes from the intake desk</p>
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.deck}>{DECK}</p>
        <p className={styles.dateline}>Ali Ansari · {PUB_DATE}</p>
        <hr className={styles.divider} />
        <div className={styles.body}>{renderBody(BODY)}</div>
        <p className={styles.footerNote}>{FOOTER_NOTE}</p>
      </article>
    </div>
  );
}
