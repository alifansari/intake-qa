"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/page";
import type { QueueMessage } from "@/lib/pilot-repository";
import {
  approveMessageAction,
  rejectMessageAction,
  editMessageAction,
} from "./actions";

// The human-in-the-loop review surface. Each drafted text can be Approved,
// Edited (re-validated against the compliance constraints), or Rejected. Nothing
// here transmits — approved messages still pass through the send chokepoint.

function MessageCard({ m, reviewable }: { m: QueueMessage; reviewable: boolean }) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(m.body ?? "");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      setErrors([]);
      try {
        await fn();
      } catch (e) {
        setErrors([e instanceof Error ? e.message : "Something went wrong"]);
      }
    });
  }

  async function saveEdit() {
    setErrors([]);
    const res = await editMessageAction(m.message_id, text);
    if (res && !res.ok) {
      setErrors(res.errors);
      return;
    }
    setEditing(false);
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold text-ink">
              {m.caller_name || "Unknown caller"}{" "}
              <span className="font-sans font-normal text-muted">{m.caller_phone}</span>
            </div>
            {m.flag_reason ? (
              <div className="mt-0.5 text-xs text-muted">{m.flag_reason}</div>
            ) : null}
          </div>
          <Badge>{m.status}</Badge>
        </div>

        {editing ? (
          <div className="mt-3">
            <textarea
              className="w-full rounded-sm border border-line-strong bg-paper p-2 text-sm text-ink"
              rows={4}
              value={text}
              maxLength={320}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-1 text-right text-xs text-muted">{text.length}/320</div>
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{m.body}</p>
        )}

        {errors.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-xs text-red">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : null}

        {reviewable ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button variant="primary" size="sm" disabled={pending} onClick={() => run(saveEdit)}>
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setText(m.body ?? "");
                    setErrors([]);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => approveMessageAction(m.message_id))}
                >
                  Approve
                </Button>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => rejectMessageAction(m.message_id))}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function QueueClient({
  drafted,
  approved,
}: {
  drafted: QueueMessage[];
  approved: QueueMessage[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle aside={<span className="text-xs text-muted">{drafted.length}</span>}>
          Awaiting approval
        </SectionTitle>
        {drafted.length === 0 ? (
          <p className="text-sm text-muted">No drafts awaiting approval right now.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {drafted.map((m) => (
              <MessageCard key={m.message_id} m={m} reviewable />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle aside={<span className="text-xs text-muted">{approved.length}</span>}>
          Approved — queued for the send chokepoint
        </SectionTitle>
        {approved.length === 0 ? (
          <p className="text-sm text-muted">Nothing approved yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {approved.map((m) => (
              <MessageCard key={m.message_id} m={m} reviewable={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
