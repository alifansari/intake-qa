// Typed re-export of the deterministic shop content/math (implemented in
// shops-content.mjs so the node --test runner imports it with zero build step).
// Import from here in TS. The .mjs file is the single source of truth.
import * as impl from "./shops-content.mjs";

export interface ShopChannelDef {
  key: string;
  label: string;
  // "call" channels show ring count in the editor; "web" channels don’t.
  kind: string;
}
export interface ShopGradeDef {
  key: string;
  label: string;
}
export interface ShopSummary {
  shopped: number;
  graded: number;
  captured: number;
  fumbled: number;
  lost: number;
  notCaptured: number;
}
export interface ShopChannelFacts {
  channel: string;
  grade?: string | null;
  ring_count?: number | null;
  response_latency_seconds?: number | null;
  answered_by?: string | null;
  notes?: string | null;
  is_seed?: boolean;
}
export interface BenchmarkRank {
  rank: number;
  cohortSize: number;
  isSeed: boolean;
  label: string;
}
export interface ShopDisclosures {
  scope: string;
  methodology: string;
  independence: string;
  flatFee: string;
  limitation: string;
  benchmark?: string;
}

export const SHOP_CHANNELS: ShopChannelDef[] = impl.SHOP_CHANNELS;
export const SHOP_GRADES: ShopGradeDef[] = impl.SHOP_GRADES;
export const ANSWERED_BY: ShopGradeDef[] = impl.ANSWERED_BY;
export const MIN_BENCHMARK_COHORT: number = impl.MIN_BENCHMARK_COHORT;
export const SHOP_PROTOCOL_TEXT: string = impl.SHOP_PROTOCOL_TEXT;
export const SHOP_PROTOCOL_TEXT_VERSION: string = impl.SHOP_PROTOCOL_TEXT_VERSION;

export const isShopChannelKey: (k: string) => boolean = impl.isShopChannelKey;
export const isShopGradeKey: (k: string) => boolean = impl.isShopGradeKey;
export const channelLabel: (key: string) => string = impl.channelLabel;
export const computeShopSummary: (channels: ShopChannelFacts[]) => ShopSummary =
  impl.computeShopSummary;
export const computeBenchmarkRank: (
  firmChannel: ShopChannelFacts,
  peerRows: ShopChannelFacts[],
) => BenchmarkRank | null = impl.computeBenchmarkRank;
export const ordinal: (n: number) => string = impl.ordinal;
export const shopDisclosures: (input?: {
  channelsShopped?: number;
  benchmarkShown?: boolean;
  benchmarkIsSeed?: boolean;
}) => ShopDisclosures = impl.shopDisclosures;
export const generateShopRefCode: (now?: Date) => string = impl.generateShopRefCode;
export const pickWorstChannel: (channels: ShopChannelFacts[]) => ShopChannelFacts | null =
  impl.pickWorstChannel;
export const formatLatency: (seconds: number) => string = impl.formatLatency;
export const draftShopNarrative: (
  channels: ShopChannelFacts[],
) => { narrative_failure: string; narrative_fix: string } | null = impl.draftShopNarrative;
