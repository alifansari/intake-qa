import type { Metadata } from "next";
import styles from "../letter/letter.module.css";

// Spanish translation scaffold for "The Unscored Conversation" (/letter).
// NOT linked anywhere yet. When the final Spanish translation is provided, paste
// it into a co-located content module, render it exactly like /letter (same tiny
// no-smartypants renderer), flip CARTA_READY in app/letter/page.tsx to emit the
// hreflang alternates, and remove the noindex below.
export const dynamic = "force-static";

const CARTA_READY = false; // flip when Spanish content is pasted in

export const metadata: Metadata = {
  title: "La conversación sin calificar — Intake QA",
  description: "Traducción al español de una carta abierta de Ali Ansari, Analyst of Record.",
  alternates: { canonical: "https://plaintiffops.com/carta" },
  ...(CARTA_READY ? {} : { robots: { index: false, follow: false } }),
};

export default function CartaPage() {
  return (
    <div className={styles.page}>
      <article className={styles.letter} lang="es">
        <header className={styles.masthead}>
          <p className={styles.kicker}>
            Una carta abierta a los socios directores de los bufetes de lesiones personales del sur de California
          </p>
          <h1 className={styles.title}>La conversación sin calificar</h1>
        </header>
        {/* TODO(Ali): paste the final, human-translated Spanish essay here and render it
            with the same deterministic renderer used on /letter (no smartypants). */}
        <div className={styles.body}>
          <p>Próximamente. Esta es la versión en español de la carta.</p>
        </div>
      </article>
    </div>
  );
}
