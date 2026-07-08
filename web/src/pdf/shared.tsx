/* eslint-disable jsx-a11y/alt-text */
// Shared react-pdf primitives + styles for the recovery-desk documents.
//
// FONTS — real bundled OFL TrueType families, registered from LOCAL .ttf files
// (never fetched: offline/CSP-safe). react-pdf's Font.register accepts ONLY
// .ttf/.otf (not woff/woff2), so we source the actual .ttf shipped by the
// @expo-google-fonts/* packages:
//   Source Serif 4  (serif) — document headings, attestation, cover memo
//   IBM Plex Sans   (sans)  — body copy, tables, UI, badges
//   JetBrains Mono  (mono)  — deposition-style transcript excerpts
// EVERY weight referenced by the templates is registered from a real local file
// (serif/sans: 400 + 700; mono: 400 + 700). Registering a family without a
// referenced weight — or an async/unreachable src — is the cause of the
// "permanent loading" hang, so we avoid both: all used weights, all local.

import React from "react";
import path from "path";
import { createRequire } from "module";
import { Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { ANALYST } from "../lib/analyst.mjs";

// Resolve a bundled .ttf to an ABSOLUTE local path. We resolve each package's
// package.json (a real, statically-resolvable module) and join the relative ttf
// path onto its directory — webpack won't try to inline a runtime-built path, and
// the result is a plain local file react-pdf reads synchronously (no network).
const req = createRequire(import.meta.url);
// Resolve each package root from a fully-literal specifier (so the bundler can
// mark it external rather than trying to statically resolve a computed path),
// then join the relative .ttf. `resolvePkg` is indirected through a variable so
// Turbopack/webpack don't attempt to inline the .ttf as a module asset.
const resolve = req.resolve.bind(req) as (id: string) => string;
function ttf(pkgJsonPath: string, rel: string): string {
  return path.join(path.dirname(resolve(pkgJsonPath)), rel);
}

export const FONTS = {
  serif: "Source Serif 4",
  sans: "IBM Plex Sans",
  mono: "JetBrains Mono",
} as const;

Font.register({
  family: FONTS.serif,
  fonts: [
    { src: ttf("@expo-google-fonts/source-serif-4/package.json", "400Regular/SourceSerif4_400Regular.ttf"), fontWeight: 400 },
    { src: ttf("@expo-google-fonts/source-serif-4/package.json", "700Bold/SourceSerif4_700Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({
  family: FONTS.sans,
  fonts: [
    { src: ttf("@expo-google-fonts/ibm-plex-sans/package.json", "400Regular/IBMPlexSans_400Regular.ttf"), fontWeight: 400 },
    { src: ttf("@expo-google-fonts/ibm-plex-sans/package.json", "700Bold/IBMPlexSans_700Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({
  family: FONTS.mono,
  fonts: [
    { src: ttf("@expo-google-fonts/jetbrains-mono/package.json", "400Regular/JetBrainsMono_400Regular.ttf"), fontWeight: 400 },
    { src: ttf("@expo-google-fonts/jetbrains-mono/package.json", "700Bold/JetBrainsMono_700Bold.ttf"), fontWeight: 700 },
  ],
});

// react-pdf's default hyphenation splits words at odd points; disable it so words
// stay intact (a common react-pdf requirement with custom fonts).
Font.registerHyphenationCallback((word) => [word]);

const C = {
  ink: "#12161C",
  muted: "#5B6270",
  faint: "#8A909C",
  rule: "#C9CDD4",
  ruleStrong: "#12161C",
  navy: "#1B2A4A",
  red: "#9A1B1B",
  amber: "#8A5A00",
  green: "#0E7C5A",
  band: "#F1F3F6",
};

export const S = StyleSheet.create({
  page: { paddingTop: 54, paddingBottom: 64, paddingHorizontal: 54, fontFamily: FONTS.sans, fontSize: 9.5, color: C.ink, lineHeight: 1.4 },
  serif: { fontFamily: FONTS.serif },
  h1: { fontFamily: FONTS.serif, fontSize: 22, color: C.ink },
  h2: { fontFamily: FONTS.serif, fontSize: 13, color: C.ink, marginBottom: 6 },
  eyebrow: { fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 1 },
  metaLine: { fontSize: 9, color: C.muted, marginTop: 1 },
  p: { fontSize: 9.5, color: C.ink, marginBottom: 6 },
  muted: { color: C.muted },
  faint: { color: C.faint, fontSize: 8 },
  section: { marginTop: 18 },
  ruleThin: { borderTopWidth: 0.6, borderTopColor: C.rule, marginTop: 4, marginBottom: 4 },
  ruleAboveTotal: { borderTopWidth: 0.8, borderTopColor: C.ruleStrong, marginTop: 3 },
  row: { flexDirection: "row" },
  cellNum: { textAlign: "right", fontFeatureSettings: "tnum" },
  footer: { position: "absolute", bottom: 28, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.faint, borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 6 },
  tableHead: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: C.ruleStrong, paddingBottom: 3, marginBottom: 3 },
  th: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  trow: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: C.rule, paddingVertical: 4 },
  badge: { fontSize: 7.5, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, alignSelf: "flex-start" },
  attest: { marginTop: 20, borderTopWidth: 0.6, borderTopColor: C.rule, paddingTop: 10, fontSize: 8.5, color: C.muted, lineHeight: 1.45 },
});

export const COLORS = C;

// Every page carries the fixed footer (left brand / center doc id / right page #).
export function DocPage({ docId, children }: { docId: string; children: React.ReactNode }) {
  return (
    <Page size="LETTER" style={S.page}>
      {children}
      <View style={S.footer} fixed>
        <Text>Intake QA · Independent Recovery Desk</Text>
        <Text>{docId}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  );
}

// Reference-range presentation borrowed from lab reports.
export function BenchmarkBand({
  label,
  value,
  bandLow,
  bandHigh,
  verdict,
  unit = "%",
}: {
  label: string;
  value: number | null;
  bandLow: number;
  bandHigh: number;
  verdict: string;
  unit?: string;
}) {
  const shown = value == null ? "n/a" : `${value}${unit}`;
  const inRange = value != null && value >= bandLow && value <= bandHigh;
  return (
    <View style={{ ...S.trow, alignItems: "center" }}>
      <Text style={{ width: "38%" }}>{label}</Text>
      <Text style={{ width: "16%", ...S.cellNum, color: inRange ? C.ink : C.amber }}>{shown}</Text>
      <Text style={{ width: "28%", color: C.muted }}>
        {value == null ? "not yet measured" : `Healthy range: ${bandLow}${unit} to ${bandHigh}${unit}`}
      </Text>
      <Text style={{ width: "18%", color: C.muted }}>{verdict}</Text>
    </View>
  );
}

export function AttestationBlock({ text, analystName, issuedDate }: { text: string; analystName: string; issuedDate: string }) {
  return (
    <View style={S.attest} wrap={false}>
      {text.split("\n").map((line, i) => (
        <Text key={i} style={{ marginBottom: i === 0 ? 6 : 4, fontFamily: i === 0 ? FONTS.serif : FONTS.sans, fontSize: i === 0 ? 11 : 8.5, color: i === 0 ? C.ink : C.muted }}>
          {line}
        </Text>
      ))}
      <Text style={{ marginTop: 18 }}>_______________________________</Text>
      <Text style={{ marginTop: 2, color: C.ink }}>{analystName}</Text>
      <Text style={{ color: C.muted }}>{ANALYST.title}, Intake QA</Text>
      <Text style={{ color: C.muted }}>{issuedDate}</Text>
    </View>
  );
}
