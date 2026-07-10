"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StudioFirm } from "@/lib/studio/data";

// Start a new mystery-shop audit: pick the firm, create the draft, land in the
// editor. Firms are created on the Studio home (upload flow) — this reuses them.
export function NewShop({ firms }: { firms: StudioFirm[] }) {
  const router = useRouter();
  const [firmId, setFirmId] = React.useState(firms[0]?.id ?? "");
  const [creating, setCreating] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function create() {
    if (!firmId) return;
    setCreating(true);
    setMsg(null);
    try {
      const r = await fetch("/api/studio/shops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firm_id: firmId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Could not create the shop.");
      router.push(`/studio/shops/${data.shop.id}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not create the shop.");
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-5">
        <h2 className="eyebrow mb-3">New mystery-shop audit</h2>
        {firms.length === 0 ? (
          <p className="text-sm text-muted">
            Add a firm on the Studio home first, then start a shop for it here.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-ink">
              Firm
              <select
                value={firmId}
                onChange={(e) => setFirmId(e.target.value)}
                className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              >
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="primary" onClick={create} disabled={creating || !firmId}>
              {creating ? "Creating…" : "Start shop"}
            </Button>
            {msg ? <span className="text-xs text-red">{msg}</span> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
