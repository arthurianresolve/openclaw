export type PromptLeakSeverity = 'low' | 'medium' | 'high';

export interface PromptLeakDetection {
  score: number;
  severity: PromptLeakSeverity;
  reasons: string[];
}

const LEAK_PATTERNS: Array<{ pattern: RegExp; reason: string; weight: number }> = [
  { pattern: /\bsystem prompt\b/i, reason: 'mentions system prompt', weight: 0.35 },
  { pattern: /\bdeveloper (instruction|message|prompt)\b/i, reason: 'mentions developer instruction', weight: 0.3 },
  { pattern: /\bhidden (instruction|prompt|policy|tool)\b/i, reason: 'mentions hidden instruction or policy', weight: 0.25 },
  { pattern: /\btool schema\b/i, reason: 'mentions tool schema', weight: 0.25 },
  { pattern: /\byou are chatgpt\b/i, reason: 'reveals hidden role framing', weight: 0.2 },
  { pattern: /\bdo not reveal\b/i, reason: 'quotes hidden non-disclosure wording', weight: 0.2 },
];

function severityForScore(score: number): PromptLeakSeverity {
  if (score >= 0.7) {
    return 'high';
  }
  if (score >= 0.35) {
    return 'medium';
  }
  return 'low';
}

export function detectPromptLeak(text: string): PromptLeakDetection {
  const normalized = text.trim();
  if (!normalized) {
    return { score: 0, severity: 'low', reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];
  for (const entry of LEAK_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      score += entry.weight;
      reasons.push(entry.reason);
    }
  }

  const clamped = Math.min(1, Number(score.toFixed(3)));
  return {
    score: clamped,
    severity: severityForScore(clamped),
    reasons,
  };
}
