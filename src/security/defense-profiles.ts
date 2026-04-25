export type DefenseProfileId = 'openai-like' | 'anthropic-like' | 'gemini-like' | 'open-weight' | 'default';

export interface DefenseProfile {
  id: DefenseProfileId;
  leakThreshold: number;
  requireCrossVerification: boolean;
  requireSelfConsistency: boolean;
}

const DEFENSE_PROFILES: Record<DefenseProfileId, DefenseProfile> = {
  'openai-like': { id: 'openai-like', leakThreshold: 0.35, requireCrossVerification: true, requireSelfConsistency: true },
  'anthropic-like': { id: 'anthropic-like', leakThreshold: 0.3, requireCrossVerification: true, requireSelfConsistency: true },
  'gemini-like': { id: 'gemini-like', leakThreshold: 0.4, requireCrossVerification: true, requireSelfConsistency: false },
  'open-weight': { id: 'open-weight', leakThreshold: 0.55, requireCrossVerification: false, requireSelfConsistency: false },
  default: { id: 'default', leakThreshold: 0.45, requireCrossVerification: false, requireSelfConsistency: false },
};

export function profileForModel(modelId: string): DefenseProfile {
  const id = modelId.toLowerCase();
  if (id.includes('gpt') || id.includes('openai')) {
    return DEFENSE_PROFILES['openai-like'];
  }
  if (id.includes('claude') || id.includes('anthropic')) {
    return DEFENSE_PROFILES['anthropic-like'];
  }
  if (id.includes('gemini') || id.includes('google')) {
    return DEFENSE_PROFILES['gemini-like'];
  }
  if (id.includes('llama') || id.includes('mistral') || id.includes('qwen')) {
    return DEFENSE_PROFILES['open-weight'];
  }
  return DEFENSE_PROFILES.default;
}
