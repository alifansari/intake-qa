import type { Metadata } from "next";
import Link from "next/link";
import styles from "./insights.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Insights — Plaintiff Ops",
  description:
    "Field notes on the four minutes of personal-injury intake that decide a case, from someone who took the calls.",
  alternates: { canonical: "https://plaintiffops.com/insights" },
};

const ARTICLES = [
  {
    slug: "self-blame-is-a-discount-not-a-decline",
    title: "Self-Blame Is a Discount, Not a Decline",
    deck: "The winnable case that gets away is not screened out. The caller talks herself out of it, and no one can tell how often that verdict was wrong.",
    date: "July 14, 2026",
  },
];

export default function InsightsIndex() {
  return (
    <div>
      <article className={styles.article} lang="en">
        <p className={styles.eyebrow}>Field notes from the intake desk</p>
        <h1 className={styles.title}>Insights</h1>
        <p className={styles.deck}>
          On the four minutes of intake that decide a case, from someone who took the
          calls.
        </p>
        <hr className={styles.divider} />
        <ul className={styles.index}>
          {ARTICLES.map((a) => (
            <li key={a.slug} className={styles.indexItem}>
              <Link href={`/insights/${a.slug}`} className={styles.indexLink}>
                <span className={styles.indexTitle}>{a.title}</span>
              </Link>
              <p className={styles.indexDeck}>{a.deck}</p>
              <p className={styles.dateline}>{a.date}</p>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
