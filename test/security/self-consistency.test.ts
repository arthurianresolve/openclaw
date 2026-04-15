import { describe, expect, it } from "vitest";
import { evaluateSelfConsistency } from "../../src/security/self-consistency";

describe("evaluateSelfConsistency", () => {
  it("marks identical answers stable", () => {
    expect(evaluateSelfConsistency(["Same answer", "same answer"]).status).toBe("stable");
  });

  it("marks divergent answers unstable", () => {
    expect(evaluateSelfConsistency(["one", "two", "three"]).status).toBe("unstable");
  });
});
