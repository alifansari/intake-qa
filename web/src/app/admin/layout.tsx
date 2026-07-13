import { StudioNav } from "@/components/studio/StudioNav";

// The operator consoles share the studio nav so the founder side is one
// product, not four unlinked URLs. Founder-only enforcement stays in the proxy
// and in each console’s own guard.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <StudioNav />
      {children}
    </div>
  );
}
