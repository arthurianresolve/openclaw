import { describe, expect, it } from "vitest";
import { profileForModel } from "./defense-profiles.js";

describe("profileForModel", () => {
  it("maps GPT models to openai-like", () => {
    expect(profileForModel("openai/gpt-5").id).toBe("openai-like");
  });

  it("maps Claude models to anthropic-like", () => {
    expect(profileForModel("anthropic/claude-sonnet-4").id).toBe("anthropic-like");
  });

  it("falls back to default", () => {
    expect(profileForModel("unknown/model").id).toBe("default");
  });
});
