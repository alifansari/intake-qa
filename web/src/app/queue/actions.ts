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
