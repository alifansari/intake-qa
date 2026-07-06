import { ImageResponse } from "next/og";

// Shared, text-first OG/Twitter card for /letter. Off-white ground, off-black ink,
// large centered serif title within the safe center, a thin rule, and the signed
// attribution with the IQ mark. No photo. Uses the system serif stack (Georgia,
// serif) to match the existing /og route and avoid a build-time font fetch;
// ImageResponse falls back to a legible serif everywhere.
export const alt = "The Unscored Conversation — an open letter by Ali Ansari, Analyst of Record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function renderLetterOG() {
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
          background: "#faf8f3",
          color: "#1a1a1a",
          fontFamily: "Georgia, serif",
          padding: "60px 120px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#6b665c",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          An open letter to Southern California PI managing partners
        </div>
        <div style={{ fontSize: 88, lineHeight: 1.05, marginTop: 34, maxWidth: 960 }}>
          The Unscored Conversation
        </div>
        <div style={{ width: 90, height: 2, background: "#1a1a1a", margin: "40px 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, color: "#33302a" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 999,
              border: "2px solid #1a1a1a",
              fontSize: 22,
            }}
          >
            IQ
          </div>
          <div>Ali Ansari, Analyst of Record</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
