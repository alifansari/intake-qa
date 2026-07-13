// Consolidated front door. The single-call "/demo" uploader was superseded by
// the free Leak Audit at "/audit", which takes a batch of up to 10 calls and
// returns one shareable report — the same underlying demo pipeline, a stronger
// first taste. One front door, not two. Any old /demo link lands on the audit.
// (The /api/demo/* endpoints stay — /audit runs on them.)
import { redirect } from "next/navigation";

export default function DemoPage() {
  redirect("/audit");
}
