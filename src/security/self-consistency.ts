export type SelfConsistencyStatus = 'stable' | 'mixed' | 'unstable';

export interface SelfConsistencyResult {
  status: SelfConsistencyStatus;
  canonicalAnswers: string[];
}

function canonicalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function evaluateSelfConsistency(answers: string[]): SelfConsistencyResult {
  const canonicalAnswers = answers.map(canonicalize).filter(Boolean);
  const unique = [...new Set(canonicalAnswers)];
  if (unique.length <= 1) {
    return { status: 'stable', canonicalAnswers: unique };
  }
  if (unique.length === 2 && canonicalAnswers.length >= 3) {
    return { status: 'mixed', canonicalAnswers: unique };
  }
  return { status: 'unstable', canonicalAnswers: unique };
}
