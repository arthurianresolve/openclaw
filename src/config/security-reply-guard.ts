import { z } from "zod";

export const SecurityReplyGuardSchema = z
  .object({
    enabled: z.boolean().optional(),
    mode: z.enum(["off", "audit", "enforce"]).optional(),
    highRiskAction: z.enum(["block", "redact"]).optional(),
    defaultLeakThreshold: z.number().min(0).max(1).optional(),
    allowToolSummaries: z.boolean().optional(),
    maxVerificationCallsPerTurn: z.number().int().min(0).max(1).optional(),
  })
  .strict()
  .optional();
