import { isSensitiveSelfReportPrompt } from "./sensitive-self-report.js";
import { profileForModel, type DefenseProfile } from "./defense-profiles.js";

export interface RuntimeReplyGuardContext {
  sensitivePrompt: boolean;
  profile: DefenseProfile;
  verificationCallsUsed: number;
}

export function createRuntimeReplyGuardContext(params: {
  userText?: string;
  modelId?: string;
}): RuntimeReplyGuardContext {
  return {
    sensitivePrompt: isSensitiveSelfReportPrompt(params.userText ?? ""),
    profile: profileForModel(params.modelId ?? ""),
    verificationCallsUsed: 0,
  };
}
