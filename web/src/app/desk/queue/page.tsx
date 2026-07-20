import { redirect } from "next/navigation";

// The "missed cases" money view moved to /desk/what-slipped (B-021, 2026-07-20).
// This route stays as a permanent-feeling redirect so old "Missed cases" links
// (and the consolidated tab redirects that still point at /desk/queue) land on
// the retrospective view, never 404. The live day-to-day surface is /desk.
export default function QueueRedirect() {
  redirect("/desk/what-slipped");
}
