import { ImageResponse } from "next/og";

export const runtime = "edge";

// Dynamic OG image: paper canvas, dark ink headline, emerald accent bar.
// Usage: /og?title=Your+headline
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Recover the cases your intake let slip").slice(0, 120);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FBFAF7",
          padding: "72px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 8, background: "#0E7C5A", borderRadius: 999 }} />
          <div style={{ fontSize: 30, fontWeight: 600, color: "#12161C" }}>Intake QA</div>
        </div>
        <div style={{ fontSize: 68, fontWeight: 600, color: "#12161C", lineHeight: 1.05, maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ fontSize: 28, color: "#5B6270" }}>
          Revenue recovery for personal injury firms · Free Leak Audit
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
