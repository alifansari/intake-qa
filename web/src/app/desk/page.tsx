// /desk — the live default. As of 2026-07-20 (B-021, retired-scorer positioning)
// the day-to-day face of the desk is the LIVE triage queue, not the retrospective
// "what slipped" money view (which moved to /desk/what-slipped). Landing here sends
// the firm to the surface they work call-to-call; the Cockpit (in-call screen) and
// What slipped (the rear-view) are one click away in the header.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DeskIndex() {
  redirect("/desk/triage");
}
