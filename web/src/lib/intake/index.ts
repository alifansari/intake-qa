// Typed re-exports of the intake tree/engine/routing (implemented in .mjs so
// node --test runs them with zero build step — the repo's dual pattern). The
// chat UI and API routes import from here.
import * as tree from "./tree.mjs";
import * as engine from "./engine.mjs";
import * as routing from "./routing.mjs";
import * as guardrails from "./guardrails.mjs";

export interface IntakeEvent {
  seq: number;
  kind: string;
  payload: Record<string, unknown>;
  at: string;
}

export interface IntakeRecord {
  channel: string;
  matter_type: string;
  bucket: string | null;
  status: "in_progress" | "abandoned" | "complete";
  confidence: number | null;
  contact: { first_name?: string; phone?: string };
  incident: Record<string, unknown>;
  path_data: Record<string, unknown> & { photos?: Array<{ filename: string; path: string | null }> };
  routing: Record<string, unknown>;
  provenance: Record<string, unknown>;
  review: { verified: boolean };
  consent_version: string | null;
  consent_at: string | null;
  events: IntakeEvent[];
}

export interface TreeNodeOption {
  key: string;
  label: string;
  next: string | ((r: IntakeRecord) => string);
}

export interface TreeNode {
  kind: "choice" | "text" | "phone" | "date" | "upload" | "terminal";
  prompt?: string | ((r: IntakeRecord) => string);
  field?: string;
  options?: TreeNodeOption[];
  next?: string | ((r: IntakeRecord) => string);
  force?: { bucket: string; reason: string };
}

export interface RoutingResult {
  bucket: string;
  confidence: number;
  reasons: string[];
  next_action: string;
  sol: { status: string; deadline: string | null };
}

export const TREE_VERSION: string = tree.TREE_VERSION;
export const START_NODE: string = tree.START_NODE;
export const getNode: (id: string) => TreeNode | null = tree.getNode as never;
export const validateTree: () => string[] = tree.validateTree;

export const startConversation: (
  sessionId: string,
  now?: Date,
) => { record: IntakeRecord; nodeId: string } = engine.startConversation as never;
export const answerNode: (
  record: IntakeRecord,
  nodeId: string,
  answer: unknown,
  now?: Date,
) => { record: IntakeRecord; nodeId: string; done: boolean; invalid?: boolean } =
  engine.answerNode as never;
export const promptFor: (nodeId: string, record: IntakeRecord) => string | null =
  engine.promptFor as never;
export const applyInterpretation: (
  record: IntakeRecord,
  interp: unknown,
  now?: Date,
) => IntakeRecord = engine.applyInterpretation as never;

export const routeLead: (record: IntakeRecord, force?: unknown) => RoutingResult =
  routing.routeLead as never;
export const terminalMessage: (record: IntakeRecord) => string = routing.terminalMessage as never;
export const NEXT_ACTIONS: Record<string, string> = routing.NEXT_ACTIONS;

export const AI_DISCLOSURE_TEXT: string = guardrails.AI_DISCLOSURE_TEXT;
export const AI_DISCLOSURE_VERSION: string = guardrails.AI_DISCLOSURE_VERSION;
export const CASE_VALUE_DEFLECTION: string = guardrails.CASE_VALUE_DEFLECTION;
export const LEGAL_ADVICE_DEFLECTION: string = guardrails.LEGAL_ADVICE_DEFLECTION;
export const FEE_DEFLECTION: string = guardrails.FEE_DEFLECTION;
export const INTERPRET_SYSTEM_RULES: string = guardrails.INTERPRET_SYSTEM_RULES;
