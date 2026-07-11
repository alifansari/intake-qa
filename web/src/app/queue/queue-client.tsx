"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/page";
import type { QueueMessage } from "@/lib/pilot-repository";
import { draftSla } from "../../../messaging/sla.mjs";
import {
  approveMessageAction,
  rejectMessageAction,
  editMessageAction,
  approveManyAction,
  rejectManyAction,
} from "./actions";

// The human-in-the-loop review surface. Each drafted text can be Approved,
// Edited (re-validated against the compliance constraints), or Rejected —
// individually, in a keyboard-driven flow, or in a batch. Nothing here
// transmits: approved messages still pass through the send chokepoint.
//
// Labor fixes over the v1 queue:
//   * Batch approve / reject of selected drafts.
//   * Keyboard shortcuts: j/k move, x select, a approve, r reject, e edit.
//   * A stale-draft (SLA) badge so overdue reviews surface.
//   * An edit view that shows the ORIGINAL text alongside the rewrite.

function MessageCard({
  m,
  reviewable,
  focused,
  selected,
  onToggleSelect,
  editing,
  onStartEdit,
  onStopEdit,
  now,
}: {
  m: QueueMessage;
  reviewable: boolean;
  focused?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  editing?: boolean;
  onStartEdit?: () => void;
  onStopEdit?: () => void;
  now?: number;
}) {
  const [text, setText] = React.useState(m.body ?? "");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);

  // Bring the keyboard-focused card into view.
  React.useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  React.useEffect(() => {
    if (editing) setText(m.body ?? "");
  }, [editing, m.body]);

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
    onStopEdit?.();
  }

  const sla = now != null ? draftSla(m.created_at, new Date(now)) : null;

  return (
    <div ref={ref} className={focused ? "rounded-sm outline outline-2 outline-navy" : ""}>
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {reviewable ? (
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(selected)}
                onChange={onToggleSelect}
                aria-label="Select message for batch action"
              />
            ) : null}
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold text-ink">
                {m.caller_name || "Unknown caller"}{" "}
                <span className="font-sans font-normal text-muted">{m.caller_phone}</span>
              </div>
              {m.flag_reason ? (
                <div className="mt-0.5 text-xs text-muted">{m.flag_reason}</div>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {reviewable && sla ? (
              sla.stale ? (
                <span className="rounded-sm bg-amber-tint px-1.5 py-0.5 text-xs font-semibold text-amber">
                  waiting {sla.label} — overdue
                </span>
              ) : (
                <span className="text-xs text-muted">waiting {sla.label}</span>
              )
            ) : null}
            <Badge>{m.status}</Badge>
          </div>
        </div>

        {editing ? (
          <div className="mt-3">
            <div className="mb-2 rounded-sm border border-line bg-canvas p-2 text-xs text-muted">
              <span className="font-semibold uppercase tracking-wide">Original</span>
              <p className="mt-1 whitespace-pre-wrap text-ink/70 line-through">{m.body}</p>
            </div>
            <textarea
              className="w-full rounded-sm border border-line-strong bg-paper p-2 text-sm text-ink"
              rows={4}
              value={text}
              maxLength={320}
              autoFocus
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
                    onStopEdit?.();
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
                <Button variant="outline" size="sm" disabled={pending} onClick={onStartEdit}>
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
    </div>
  );
}

export function QueueClient({
  drafted,
  approved,
}: {
  drafted: QueueMessage[];
  approved: QueueMessage[];
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [focusIdx, setFocusIdx] = React.useState(0);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [batchPending, startBatch] = React.useTransition();
  // SLA is time-relative; compute `now` only after mount to avoid a
  // server/client hydration mismatch, then tick it every minute.
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Keep selection + focus valid as the drafted list changes.
  const draftedIds = React.useMemo(() => drafted.map((m) => m.message_id), [drafted]);
  React.useEffect(() => {
    setSelected((prev) => new Set([...prev].filter((id) => draftedIds.includes(id))));
    setFocusIdx((i) => Math.min(i, Math.max(0, drafted.length - 1)));
  }, [draftedIds, drafted.length]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Keyboard shortcuts on the drafted list. Disabled while editing or when a
  // form field is focused, so typing a draft never triggers an action.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const cur = drafted[focusIdx];
      switch (e.key) {
        case "j":
          setFocusIdx((i) => Math.min(drafted.length - 1, i + 1));
          break;
        case "k":
          setFocusIdx((i) => Math.max(0, i - 1));
          break;
        case "x":
          if (cur) toggleSelect(cur.message_id);
          break;
        case "a":
          if (cur) startBatch(() => approveMessageAction(cur.message_id));
          break;
        case "r":
          if (cur) startBatch(() => rejectMessageAction(cur.message_id));
          break;
        case "e":
          if (cur) setEditingId(cur.message_id);
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drafted, focusIdx, editingId]);

  const selectedIds = React.useMemo(
    () => draftedIds.filter((id) => selected.has(id)),
    [draftedIds, selected]
  );

  function approveSelected() {
    if (!selectedIds.length) return;
    startBatch(async () => {
      await approveManyAction(selectedIds);
      setSelected(new Set());
    });
  }
  function rejectSelected() {
    if (!selectedIds.length) return;
    startBatch(async () => {
      await rejectManyAction(selectedIds);
      setSelected(new Set());
    });
  }
  function selectAll() {
    setSelected(new Set(draftedIds));
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle aside={<span className="text-xs text-muted">{drafted.length}</span>}>
          Awaiting approval
        </SectionTitle>

        {drafted.length === 0 ? (
          <p className="text-sm text-muted">No drafts awaiting approval right now.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-line bg-canvas px-3 py-2">
              <span className="text-xs text-muted">
                {selectedIds.length} selected
              </span>
              <Button
                variant="primary"
                size="sm"
                disabled={batchPending || selectedIds.length === 0}
                onClick={approveSelected}
              >
                Approve selected
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={batchPending || selectedIds.length === 0}
                onClick={rejectSelected}
              >
                Reject selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={batchPending || drafted.length === 0}
                onClick={selectAll}
              >
                Select all
              </Button>
              {selectedIds.length > 0 ? (
                <Button variant="ghost" size="sm" disabled={batchPending} onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              ) : null}
              <span className="ml-auto text-xs text-muted">
                Keys: <kbd>j</kbd>/<kbd>k</kbd> move · <kbd>x</kbd> select · <kbd>a</kbd> approve ·{" "}
                <kbd>r</kbd> reject · <kbd>e</kbd> edit
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {drafted.map((m, i) => (
                <MessageCard
                  key={m.message_id}
                  m={m}
                  reviewable
                  focused={i === focusIdx}
                  selected={selected.has(m.message_id)}
                  onToggleSelect={() => toggleSelect(m.message_id)}
                  editing={editingId === m.message_id}
                  onStartEdit={() => setEditingId(m.message_id)}
                  onStopEdit={() => setEditingId(null)}
                  now={now ?? undefined}
                />
              ))}
            </div>
          </>
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
