import { redirect } from "next/navigation";

// The queue merged INTO the one-screen desk home. This route stays as a
// permanent-feeling redirect so old links (and the consolidated tab redirects
// that still point at /desk/queue) never 404.
export default function QueueRedirect() {
  redirect("/desk");
}
