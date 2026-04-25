import type { ReplyPayload } from "../auto-reply/types.js";
import type { OpenClawConfig } from "../config/config.js";
import { detectPromptLeak } from "./prompt-leak-detector.js";
import { redactReplyPayload } from "./reply-redaction.js";
import type { RuntimeReplyGuardContext } from "./runtime-reply-guard-context.js";

export interface RuntimeReplyGuardInput {
  payload: ReplyPayload;
  phase: "tool" | "block" | "final";
  context: RuntimeReplyGuardContext;
  cfg: OpenClawConfig;
}

export interface RuntimeReplyGuardDecision {
  action: "allow" | "audit" | "block";
  payload: ReplyPayload | null;
  reasons: string[];
  leakScore: number;
  sensitivePrompt: boolean;
  profileId: string;
}

function isQuotedOrExampleText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith(">") || trimmed.includes("```") || /^example:/i.test(trimmed);
}

export function guardRuntimeReply(input: RuntimeReplyGuardInput): RuntimeReplyGuardDecision {
  const text = input.payload.text?.trim() ?? "";
  if (!text || input.payload.mediaUrl || input.payload.mediaUrls?.length) {
    return {
      action: "allow",
      payload: input.payload,
      reasons: [],
      leakScore: 0,
      sensitivePrompt: input.context.sensitivePrompt,
      profileId: input.context.profile.id,
    };
  }

  const configured = input.cfg.security?.replyGuard;
  const mode = configured?.enabled === false ? "off" : (configured?.mode ?? "audit");
  const threshold = configured?.defaultLeakThreshold ?? input.context.profile.leakThreshold;
  const detection = detectPromptLeak(text);
  const adjustedScore = isQuotedOrExampleText(text)
    ? Math.max(0, detection.score - 0.2)
    : detection.score;

  if (mode === "off" || adjustedScore < threshold) {
    return {
      action: "allow",
      payload: input.payload,
      reasons: detection.reasons,
      leakScore: adjustedScore,
      sensitivePrompt: input.context.sensitivePrompt,
      profileId: input.context.profile.id,
    };
  }

  if (mode === "audit" || input.phase === "block") {
    return {
      action: "audit",
      payload: input.payload,
      reasons: detection.reasons,
      leakScore: adjustedScore,
      sensitivePrompt: input.context.sensitivePrompt,
      profileId: input.context.profile.id,
    };
  }

  const highRiskAction = configured?.highRiskAction ?? "redact";
  return {
    action: "block",
    payload: highRiskAction === "redact" ? redactReplyPayload(input.payload) : null,
    reasons: detection.reasons,
    leakScore: adjustedScore,
    sensitivePrompt: input.context.sensitivePrompt,
    profileId: input.context.profile.id,
  };
}
