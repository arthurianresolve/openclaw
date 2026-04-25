import { evaluateSelfConsistency, type SelfConsistencyResult } from './self-consistency.js';

const SENSITIVE_PROMPT_PATTERNS = [
  /hidden instructions?/i,
  /system prompt/i,
  /developer (message|prompt|instruction)/i,
  /secret tools?/i,
  /internal policy/i,
];

export interface SensitiveSelfReportAssessment {
  sensitive: boolean;
  confidence: 'low' | 'medium' | 'high';
  consistency: SelfConsistencyResult;
}

export function isSensitiveSelfReportPrompt(text: string): boolean {
  return SENSITIVE_PROMPT_PATTERNS.some((pattern) => pattern.test(text));
}

export function assessSensitiveSelfReport(question: string, answers: string[]): SensitiveSelfReportAssessment {
  const sensitive = isSensitiveSelfReportPrompt(question);
  const consistency = evaluateSelfConsistency(answers);
  const confidence =
    !sensitive ? 'high' : consistency.status === 'stable' ? 'high' : consistency.status === 'mixed' ? 'medium' : 'low';
  return { sensitive, confidence, consistency };
}
