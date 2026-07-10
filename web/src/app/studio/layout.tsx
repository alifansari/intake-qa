import { StudioNav } from "@/components/studio/StudioNav";

// Shared chrome for every founder studio screen. Authorization is NOT decided
// here — the proxy (FOUNDER_EMAIL allowlist), every server action/route, and
// RLS all enforce it; this layout only provides navigation.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <StudioNav />
      {children}
    </div>
  );
}
