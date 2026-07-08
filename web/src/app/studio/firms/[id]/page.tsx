import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { getFirm, listRecordingsForFirm } from "@/lib/studio/data";

export const dynamic = "force-dynamic";

// A firm's Studio page: its recordings (each links to its analysis). Founder-only.
export default async function FirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isStudioConfigured()) return notFound();
  const { id } = await params;
  const { supabase } = await requireFounderPage();
  const firm = await getFirm(supabase, id);
  if (!firm) return notFound();
  const recordings = await listRecordingsForFirm(supabase, id);

  return (
    <PageShell>
      <PageHeader kicker="Spot Check Studio · Firm" title={firm.name}>
        <Link href="/studio" className="text-xs text-accent underline hover:text-accent-hover">
          All firms
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="py-5">
          <div className="grid grid-cols-1 gap-2 text-sm text-ink sm:grid-cols-3">
            <div>
              <div className="eyebrow">Phone</div>
              <div>{firm.phone ?? "—"}</div>
            </div>
            <div>
              <div className="eyebrow">Website</div>
              <div>{firm.website ?? "—"}</div>
            </div>
            <div>
              <div className="eyebrow">Address</div>
              <div>{firm.address ?? "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="eyebrow mb-3">Recordings</h2>
        {recordings.length === 0 ? (
          <p className="text-sm text-muted">
            No recordings yet. Upload one from the{" "}
            <Link href="/studio" className="text-accent underline">
              Studio home
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line bg-paper">
            {recordings.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-ink">{r.original_filename}</div>
                  <div className="text-xs text-faint">
                    {r.transcribed_at ? "Analyzed" : "Processing / uploaded"}
                  </div>
                </div>
                <Link
                  href={`/studio/recordings/${r.id}`}
                  className="text-xs text-accent underline hover:text-accent-hover"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
