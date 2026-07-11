// The digest link's landing page. Deliberately PUBLIC (the whole point is
// no-login) — authority is the signed token, which names one flag, one firm,
// one status, and expires. GET only *shows* the confirmation; the status is
// written exclusively by the POST server action below, so email-client link
// prefetchers can never mark a case by scanning the inbox.
import { redirect } from "next/navigation";
import { verifyDigestToken } from "../../../../messaging/digest-links.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm — Intake QA", robots: { index: false } };

// Must match the desk's LeakCard labels so one caller doesn't have three names
// across the digest → confirm → desk flow.
const STATUS_LABEL: Record<string, string> = {
  reached_out: "Left a message",
  back_in_touch: "Spoke to them",
};

const ERROR_COPY: Record<string, string> = {
  expired:
    "This link has expired (they last 14 days). Your desk always has the live list.",
  bad_signature: "This link isn't valid. Your desk always has the live list.",
  malformed: "This link isn't valid. Your desk always has the live list.",
  not_configured: "One-click links aren't enabled yet. Your desk has the live list.",
};

async function confirmAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const check = verifyDigestToken(token);
  if ("error" in check) redirect(`/digest/confirm?token=${encodeURIComponent(token)}`);
  const store = await import("../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) redirect("/desk/queue");
  const db = await store.openPipelineDb();
  let outcome = "done";
  try {
    // Firm scoping enforced inside setFlagStatus, before any write — the
    // token's firm must own the flag. guardTerminal: a stale link tapped days
    // after the team already resolved the case must not regress it.
    const res = await store.setFlagStatus(db, {
      flag_id: check.flagId,
      status: check.status,
      updated_by: "email-digest-link",
      firm_id: check.firmId,
      guardTerminal: true,
    });
    if (res && res.alreadyResolved) outcome = "already";
    else if (!res || res.forbidden || res.ok === false) outcome = "failed";
  } finally {
    await store.closePipelineDb(db);
  }
  redirect(`/digest/confirm?token=${encodeURIComponent(token)}&r=${outcome}`);
}

export default async function DigestConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; r?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const result = params.r ?? null;
  const check = verifyDigestToken(token) as {
    error?: string;
    firmId?: string;
    flagId?: string;
    status?: string;
  };
  const invalid = Boolean(check.error);
  const status = check.status ?? "";

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <p className="eyebrow">Intake QA · Missed cases</p>
      {invalid ? (
        <>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            This link doesn&apos;t work anymore
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            {ERROR_COPY[check.error ?? "malformed"] ?? ERROR_COPY.malformed}
          </p>
        </>
      ) : result === "already" ? (
        <>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Already handled ✓
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Your team already moved this caller further along on the desk, so we left it as-is.
            Nothing to do here.
          </p>
        </>
      ) : result === "failed" ? (
        <>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Couldn&apos;t save that
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Something went wrong marking this caller. Your desk always has the live list — open it
            and mark it there.
          </p>
        </>
      ) : result === "done" ? (
        <>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Marked: {STATUS_LABEL[status] ?? status} ✓
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Saved to your desk. That caller leaves tomorrow&apos;s digest — you&apos;re done here.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Mark this caller &ldquo;{STATUS_LABEL[status] ?? status}&rdquo;?
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            One tap and it&apos;s recorded on your desk — no sign-in needed. If you meant a
            different caller, just close this page; nothing is saved until you press the button.
          </p>
          <form action={confirmAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Yes — {STATUS_LABEL[status] ?? status}
            </button>
          </form>
        </>
      )}
      <p className="mt-8 text-xs text-faint">
        The live list is always on{" "}
        <a href="/desk/queue" className="underline hover:text-ink">
          your desk
        </a>
        .
      </p>
    </div>
  );
}
