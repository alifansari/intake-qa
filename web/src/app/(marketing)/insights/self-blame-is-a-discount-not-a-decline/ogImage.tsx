import { ImageResponse } from "next/og";

// Shared, text-first OG/Twitter card for the cornerstone essay. Warm paper ground,
// near-black ink, an uppercase kicker, the serif title, a short emerald rule, and
// the byline with the IQ mark. No photo, no build-time font fetch (system serif
// stack), so the card is fast and dependency-free.
export const alt =
  "Self-Blame Is a Discount, Not a Decline — field notes on personal-injury intake by Ali Ansari";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function renderInsightOG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbfaf7",
          color: "#12161c",
          fontFamily: "Georgia, serif",
          padding: "60px 110px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#5b6270",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          Field notes from the intake desk
        </div>
        <div style={{ fontSize: 78, lineHeight: 1.06, marginTop: 30, maxWidth: 1000 }}>
          Self-Blame Is a Discount, Not a Decline
        </div>
        <div style={{ width: 96, height: 3, background: "#0e7c5a", margin: "38px 0" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 30,
            color: "#33302a",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 999,
              border: "2px solid #0e7c5a",
              color: "#0e7c5a",
              fontSize: 22,
            }}
          >
            IQ
          </div>
          <div>Ali Ansari · Plaintiff Ops</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
