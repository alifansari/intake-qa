// /honesty was renamed to /accuracy (the track-record framing). This redirect
// preserves every existing inbound link and bookmark. Update links to point at
// /accuracy directly; this stub can be removed once nothing references /honesty.
import { redirect } from "next/navigation";

export default function HonestyRedirect() {
  redirect("/accuracy");
}
