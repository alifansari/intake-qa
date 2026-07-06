// Marketing shell with its own nav / footer / sticky CTA on the paper canvas.
// Nested inside the root layout (fonts + providers); the product Nav stands down
// on these routes (see components/nav.tsx + lib/marketing-routes.ts).

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "@/components/marketing/Footer";
import { StickyCTA } from "@/components/marketing/StickyCTA";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingNav />
      <main>{children}</main>
      <Footer />
      <StickyCTA />
    </div>
  );
}
