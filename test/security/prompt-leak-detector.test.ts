import { describe, expect, it } from "vitest";
import { detectPromptLeak } from "../../src/security/prompt-leak-detector";

describe("detectPromptLeak", () => {
  it("returns low risk for ordinary text", () => {
    expect(detectPromptLeak("Hello, how can I help?")).toEqual({
      score: 0,
      severity: "low",
      reasons: [],
    });
  });

  it("scores likely hidden-instruction leakage", () => {
    const result = detectPromptLeak(
      "My system prompt says do not reveal the developer instruction or tool schema.",
    );
    expect(result.severity).toBe("high");
    expect(result.reasons.length).toBeGreaterThan(1);
  });
});
