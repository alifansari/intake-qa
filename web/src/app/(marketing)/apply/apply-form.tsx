"use client";
import * as React from "react";
import Link from "next/link";

// The beta application form. Posts to the existing /api/beta/apply (ICP
// qualification + NDA flow + waitlist). Kept deliberately small: five fields,
// plain words, one button.
const inputClass =
  "w-full rounded-base border border-hairline bg-canvas p-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none";

const PRACTICE_AREAS = [
  { value: "personal_injury", label: "Personal injury" },
  { value: "employment", label: "Employment" },
  { value: "family", label: "Family" },
  { value: "criminal", label: "Criminal defense" },
  { value: "other", label: "Other" },
];

const STATES = ["CA", "AZ", "NV", "OR", "WA", "TX", "FL", "NY", "Other"];

export function ApplyForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [firm, setFirm] = React.useState("");
  const [practice, setPractice] = React.useState("personal_injury");
  const [state, setState] = React.useState("CA");
  const [volume, setVolume] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);
  // True only when the API confirms the NDA actually went out by email.
  // When the send is simulated (pilot mode), the founder emails it manually —
  // the success copy must not claim an email that hasn't arrived.
  const [ndaSent, setNdaSent] = React.useState(false);
  // "nda_pending" (qualified, NDA next) vs "waitlisted". The NDA timeline only
  // renders for qualified applicants — waitlisted firms get no NDA.
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/beta/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          firm_name: firm.trim(),
          practice_area: practice,
          state,
          ...(volume.trim() !== "" ? { monthly_call_volume: Number(volume) } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(
          Array.isArray(data.details)
            ? "Please check the highlighted fields and try again."
            : (data.error ?? "Something went wrong — email ali@plaintiffops.com and we'll sort it."),
        );
      }
      setNdaSent(Boolean(data.ndaSent));
      setStatus(typeof data.status === "string" ? data.status : null);
      setDone(data.next ?? "Application received. We'll follow up by email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-card border border-hairline bg-surface p-7">
        <p className="font-display text-xl font-semibold text-ink">You&apos;re in the queue.</p>
        <p className="mt-2 text-ink-muted">{done}</p>
        {status === "nda_pending" ? (
          <>
        <ol className="mt-5 flex flex-col gap-3 border-t border-hairline pt-5">
          {[
            ndaSent
              ? ["Today", "The mutual NDA arrives by email. Nothing connects until it's signed."]
              : [
                  "Within one business day",
                  "We email your mutual NDA. Nothing connects until it's signed.",
                ],
            ["After you sign", "Your sign-in and desk arrive the same day, with a 15-minute setup call to connect your calls. Your team changes nothing about how they answer the phone."],
            ["Within days of calls flowing", "Missed cases start appearing on your desk — likely signable callers who walked — ready for your team to call back."],
          ].map(([when, what]) => (
            <li key={when} className="flex gap-3 text-sm">
              <span className="w-40 flex-none font-semibold text-ink">{when}</span>
              <span className="text-ink-muted">{what}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm text-faint">
          In a hurry? Reply to the NDA email{ndaSent ? "" : " when it arrives"} with two or three
          times that work and your setup call gets locked in the same day.
        </p>
          </>
        ) : null}
        <p className="mt-2 text-sm text-faint">
          While you wait: run the free Leak Audit on 10 of your calls —{" "}
          <Link href="/audit" className="font-medium text-accent hover:text-accent-hover">
            start it here
          </Link>
          . You keep the report either way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Your name
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Jordan Alvarez" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Work email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="jordan@yourfirm.com" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Firm name
        <input required value={firm} onChange={(e) => setFirm(e.target.value)} className={inputClass} placeholder="Alvarez Injury Law" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-1">
          Practice area
          <select value={practice} onChange={(e) => setPractice(e.target.value)} className={inputClass}>
            {PRACTICE_AREAS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-1">
          State
          <select value={state} onChange={(e) => setState(e.target.value)} className={inputClass}>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-1">
          Calls per month <span className="font-normal text-faint">(optional)</span>
          <input type="number" min={0} value={volume} onChange={(e) => setVolume(e.target.value)} className={inputClass} placeholder="150" />
        </label>
      </div>
      {error ? <p className="text-sm text-red">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex justify-center rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Sending…" : "Apply for the beta"}
      </button>
      <p className="text-xs text-faint">
        Free during the beta. At launch the fee is flat monthly, never a share of any recovery.
        Applying costs nothing and commits you to nothing.
      </p>
    </form>
  );
}
