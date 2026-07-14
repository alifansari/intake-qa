// Consolidated. The manifesto's argument (the acquisition cost is already spent;
// everyone grades their own homework; close the loop) now lives on the home page
// (the hero + the independence section) and in the signed essay at /letter, which
// is the durable long-form version. This redirect folds the standalone page into
// /letter and preserves any inbound link. Remove once nothing references it.
import { redirect } from "next/navigation";

export default function ManifestoRedirect() {
  redirect("/letter");
}
