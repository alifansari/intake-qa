"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pilotRepo } from "@/lib/pilot-repository";
import { getCurrentUser } from "@/lib/supabase/server";
import { validateDraft } from "../../../messaging/draft.mjs";

// Server actions for the in-app approval queue. Each verifies a signed-in user
// (the human in "human approves every text"), performs the review action through
// the PilotRepository seam, then revalidates the queue. Actual SENDING is NOT
// here — it stays behind the compliance chokepoint (messaging/send.mjs).

const Id = z.string().min(1);

async function requireUserEmail(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.email ?? user.id;
}

export async function approveMessageAction(messageId: string) {
  const id = Id.parse(messageId);
  const approvedBy = await requireUserEmail();
  await pilotRepo.approveMessage(id, approvedBy);
  revalidatePath("/queue");
}

export async function rejectMessageAction(messageId: string) {
  const id = Id.parse(messageId);
  await requireUserEmail();
  await pilotRepo.rejectMessage(id);
  revalidatePath("/queue");
}

export async function editMessageAction(messageId: string, body: string) {
  const id = Id.parse(messageId);
  await requireUserEmail();
  const text = String(body ?? "").trim();
  // Re-validate the edited text against the same compliance constraints the
  // drafter enforces (length, banned phrasing, opt-out present, etc.).
  const errors = validateDraft(text, { firstMessage: false });
  if (errors.length) {
    return { ok: false as const, errors };
  }
  await pilotRepo.editDraftMessage(id, text);
  revalidatePath("/queue");
  return { ok: true as const, errors: [] as string[] };
}

const Ids = z.array(z.string().min(1)).min(1);

// Batch approve — the labor fix. Still one human decision per message under the
// hood (each is individually approved and stamped with the reviewer), but the
// reviewer acts on many at once. Nothing sends here; approved messages remain
// behind the send chokepoint (messaging/send.mjs).
export async function approveManyAction(messageIds: string[]) {
  const ids = Ids.parse(messageIds);
  const approvedBy = await requireUserEmail();
  let approved = 0;
  for (const id of ids) {
    await pilotRepo.approveMessage(id, approvedBy);
    approved += 1;
  }
  revalidatePath("/queue");
  return { ok: true as const, approved };
}

export async function rejectManyAction(messageIds: string[]) {
  const ids = Ids.parse(messageIds);
  await requireUserEmail();
  let rejected = 0;
  for (const id of ids) {
    await pilotRepo.rejectMessage(id);
    rejected += 1;
  }
  revalidatePath("/queue");
  return { ok: true as const, rejected };
}
