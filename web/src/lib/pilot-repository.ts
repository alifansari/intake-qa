import "server-only";
import { z } from "zod";
import { getSupabaseServer } from "./supabase/server";

// ---------------------------------------------------------------------------
// PilotRepository — the data-access seam for the in-app approval queue (the
// human-in-the-loop control surface, CLAUDE.md v1 scope #4). Kept separate from
// the reconciliation Repository so the dashboards are untouched. The UI and
// server actions depend ONLY on this interface, never on Supabase directly.
//
// Today’s adapter is SupabasePilotRepository. It degrades gracefully when
// Supabase is not configured (returns empty lists / no-ops) so the deployed app
// never breaks before a project exists — the queue simply shows a "connect
// Supabase" empty state.
//
// NOTE: this seam covers REVIEW actions only (list / approve / edit / reject).
// Actual transmission stays behind the single send chokepoint (messaging/
// send.mjs) — no code path may send around it.
// ---------------------------------------------------------------------------

export const QueueMessage = z.object({
  message_id: z.string(),
  body: z.string().nullable(),
  status: z.string(),
  approved_by: z.string().nullable(),
  created_at: z.string(),
  conversation_id: z.string(),
  conversation_status: z.string(),
  caller_phone: z.string().nullable(),
  caller_name: z.string().nullable(),
  flag_reason: z.string().nullable(),
});
export type QueueMessage = z.infer<typeof QueueMessage>;

export interface PilotRepository {
  /** True when a Supabase project is wired up (else the queue is inert). */
  isReady(): boolean;
  /** Outbound messages awaiting human approval (status 'drafted'). */
  listDraftedMessages(): Promise<QueueMessage[]>;
  /** Approved-but-not-yet-sent messages (send happens via the chokepoint). */
  listApprovedMessages(): Promise<QueueMessage[]>;
  /** Approve a drafted message (drafted -> approved). */
  approveMessage(messageId: string, approvedBy: string): Promise<void>;
  /** Reject a drafted message (kept out of the sender). */
  rejectMessage(messageId: string): Promise<void>;
  /** Rewrite a drafted message body (stays drafted; re-reviewed). */
  editDraftMessage(messageId: string, body: string): Promise<void>;
}

class SupabasePilotRepository implements PilotRepository {
  isReady(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  private async listByStatus(status: string): Promise<QueueMessage[]> {
    const supabase = await getSupabaseServer();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("queue_messages")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("[SupabasePilotRepository] list failed:", error.message);
      return [];
    }
    const out: QueueMessage[] = [];
    for (const row of data ?? []) {
      const parsed = QueueMessage.safeParse(row);
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  }

  listDraftedMessages(): Promise<QueueMessage[]> {
    return this.listByStatus("drafted");
  }

  listApprovedMessages(): Promise<QueueMessage[]> {
    return this.listByStatus("approved");
  }

  async approveMessage(messageId: string, approvedBy: string): Promise<void> {
    const supabase = await getSupabaseServer();
    if (!supabase) return;
    const { error } = await supabase
      .from("messages")
      .update({ status: "approved", approved_by: approvedBy })
      .eq("id", messageId)
      .eq("status", "drafted"); // only a drafted message may be approved
    if (error) throw new Error(error.message);
  }

  async rejectMessage(messageId: string): Promise<void> {
    const supabase = await getSupabaseServer();
    if (!supabase) return;
    const { error } = await supabase
      .from("messages")
      .update({ status: "rejected" })
      .eq("id", messageId)
      .eq("status", "drafted");
    if (error) throw new Error(error.message);
  }

  async editDraftMessage(messageId: string, body: string): Promise<void> {
    const supabase = await getSupabaseServer();
    if (!supabase) return;
    const { error } = await supabase
      .from("messages")
      .update({ body })
      .eq("id", messageId)
      .eq("status", "drafted"); // can only edit while still drafted
    if (error) throw new Error(error.message);
  }
}

// Single shared instance for the app.
export const pilotRepo: PilotRepository = new SupabasePilotRepository();
