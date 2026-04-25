import type { ReplyPayload } from "../auto-reply/types.js";

const DEFAULT_REDACTION_TEXT = "I can’t provide hidden system or internal instruction details.";

export function redactReplyPayload(
  payload: ReplyPayload,
  text: string = DEFAULT_REDACTION_TEXT,
): ReplyPayload {
  return {
    ...payload,
    text,
    isError: payload.isError,
  };
}
