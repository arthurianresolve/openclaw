import { describe, expect, it } from "vitest";
import { redactReplyPayload } from "./reply-redaction";

describe("redactReplyPayload", () => {
  it("preserves metadata while replacing text", () => {
    const payload = redactReplyPayload({ text: "secret", replyToCurrent: true });
    expect(payload.replyToCurrent).toBe(true);
    expect(payload.text).toContain("I can’t provide hidden system");
  });
});
