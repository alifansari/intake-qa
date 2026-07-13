import { redirect } from "next/navigation";

// ONE sign-in for everyone. The studio’s separate magic-link-only login created
// two doors to the same house with different behavior; /login handles password
// AND magic link, and the proxy routes the founder on to /studio via ?next=.
// This stub only survives so old bookmarks and emailed links keep working.
export default async function StudioLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams({ next: params.next ?? "/studio" });
  if (params.error) q.set("error", params.error);
  redirect(`/login?${q.toString()}`);
}
