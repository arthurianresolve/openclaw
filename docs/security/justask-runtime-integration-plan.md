# JustAsk-inspired Runtime Integration Plan for OpenClaw

## Goal

Wire the prerelease defensive modules into OpenClaw runtime flows with minimal token overhead, low latency impact, and strong operational stability.

The integration target is **central reply dispatch**, not per-channel duplication.

## Guiding constraints

1. **One central hook** in shared auto-reply runtime.
2. **Local-first analysis** on the hot path.
3. **No extra model calls by default**.
4. **Audit-first rollout** before enforcement.
5. **Bounded escalation** only for high-risk sensitive cases.
6. **No channel-specific reimplementation** unless a channel already has a custom reasoning lane.

## Recommended integration point

### Primary hook

The best central hook is inside:
- `src/auto-reply/reply/dispatch-from-config.ts`

Why this is the right place:
- it already sees the final `ReplyPayload` stream for tool, block, and final replies
- it is shared across core reply delivery paths
- it already applies TTS, routing, and dispatch policy decisions
- it lets us intercept once before user-visible delivery

### Secondary helper boundary

Use `src/auto-reply/reply/reply-dispatcher.ts` only for optional payload normalization support, not for policy logic.

Why not put the policy there:
- `reply-dispatcher.ts` should stay transport-focused
- security policy there would be harder to debug and test
- it would couple normalization and enforcement too tightly

## Concrete file-by-file plan

### 1. Add a runtime guard orchestrator

Create:
- `src/security/runtime-reply-guard.ts`
- `src/security/runtime-reply-guard.test.ts`

Purpose:
- central orchestration layer over the existing modules:
  - `prompt-leak-detector.ts`
  - `defense-profiles.ts`
  - `sensitive-self-report.ts`
  - `self-consistency.ts`

Suggested API:

```ts
export interface RuntimeReplyGuardInput {
  modelId?: string;
  userText?: string;
  payload: ReplyPayload;
  phase: 'tool' | 'block' | 'final';
}

export interface RuntimeReplyGuardDecision {
  action: 'allow' | 'audit' | 'block';
  payload: ReplyPayload | null;
  reasons: string[];
  leakScore: number;
  sensitivePrompt: boolean;
  profileId: string;
}
```

Behavior:
- ignore payloads with no text
- ignore media-only payloads
- ignore reasoning payloads unless explicitly enabled later
- classify sensitivity from inbound user text once
- score outgoing text once
- return a simple decision

### 2. Add request-scope classification cache

Create:
- `src/security/runtime-reply-guard-context.ts`
- `src/security/runtime-reply-guard-context.test.ts`

Purpose:
- store per-dispatch cheap analysis so tool/block/final replies do not repeat identical work

Suggested cached fields:
- `sensitivePrompt`
- `modelProfile`
- optional rolling block text summary length only, not full duplicate copies

Operational rule:
- cache only inside one dispatch turn
- do not persist across sessions

## 3. Add config surface

Create:
- `src/config/security-reply-guard.ts`
- `src/config/security-reply-guard.test.ts`

Then thread into existing config schema generation.

Minimal config shape:

```ts
security?: {
  replyGuard?: {
    enabled?: boolean;
    mode?: 'off' | 'audit' | 'enforce';
    highRiskAction?: 'block' | 'redact';
    defaultLeakThreshold?: number;
    allowToolSummaries?: boolean;
    maxVerificationCallsPerTurn?: number;
  }
}
```

Keep this small at first.

Do **not** add many knobs yet.

### 4. Wire the guard into dispatch-from-config

Modify:
- `src/auto-reply/reply/dispatch-from-config.ts`

Exact hook points:

#### A. Before tool-result delivery
Inside `onToolResult`, after TTS conversion but before routing/dispatch:
- call runtime guard
- allow media-only payloads straight through
- if blocked, either drop or replace text with safe fallback

#### B. Before block delivery
Inside `onBlockReply`, before `sendPayloadAsync` / `dispatcher.sendBlockReply`:
- call runtime guard on each block payload
- keep it cheap and deterministic
- avoid expensive follow-up per block

Important stability rule:
- block-phase enforcement should usually be `audit` only at first
- otherwise partial-response UX can get jagged

#### C. Before final reply delivery
In the final replies loop, before `sendFinalPayload(reply)`:
- run the same guard
- this is the safest place for enforce-mode block/redact decisions

### 5. Keep expensive verification off the hot path by default

Do **not** wire direct cross-verification into normal dispatch initially.

Instead:
- add an optional escalation hook inside `runtime-reply-guard.ts`
- only trigger when all are true:
  - config mode is `enforce`
  - inbound prompt is sensitive
  - leak score crosses high threshold
  - phase is `final`
  - per-turn verification budget has not been used

Create later, not in phase 1:
- `src/security/runtime-reply-verifier.ts`
- `src/security/runtime-reply-verifier.test.ts`

This keeps token usage bounded and predictable.

## 6. Add diagnostics, not noisy logs

Create:
- `src/security/runtime-reply-guard-events.ts`

Purpose:
- emit one structured event per guarded reply decision

Suggested event fields:
- session key
- channel
- phase
- model id
- profile id
- leak score
- reasons
- action
- sensitive prompt flag
- verification used: yes/no

Operational rule:
- no raw payload dump by default
- include short matched reason strings, not full sensitive text copies

This keeps observability useful without creating a privacy or log-volume mess.

## 7. Redaction strategy

Add helper:
- `src/security/reply-redaction.ts`
- `src/security/reply-redaction.test.ts`

Behavior:
- replace blocked text with a short safe fallback, for example:
  - “I can’t provide hidden system or internal instruction details.”
- preserve reply metadata when possible:
  - `replyToId`
  - `replyToCurrent`
  - media fields if explicitly allowed

Why separate file:
- easier policy tuning
- easier tests
- avoids embedding fallback text everywhere

## 8. Phase-specific enforcement behavior

### Phase 1, recommended first shipping slice

Files:
- `runtime-reply-guard.ts`
- `runtime-reply-guard-context.ts`
- config surface
- dispatch wiring in `dispatch-from-config.ts`
- tests

Behavior:
- local scoring only
- audit mode default
- no extra model calls
- no block-path hard blocking
- final-path only can optionally redact in explicit enforce mode

### Phase 2

Add:
- verifier module with hard budget of 1 extra model call per turn

Behavior:
- final replies only
- only for sensitive prompt classes and high leak scores
- hard timeout, for example 1500 to 2500 ms
- if verifier fails, fall back to local decision, do not stall delivery

### Phase 3

Add:
- profile tuning
- selective enforcement by model family
- optional administrative audit dashboards

## Exact runtime flow after integration

### Hot path, cheap default
1. inbound message reaches `dispatchReplyFromConfig`
2. classify inbound sensitivity once
3. resolve model family profile once
4. each outgoing payload with text gets a local leak score
5. decision:
   - low risk -> allow
   - medium risk -> allow + audit event
   - high risk -> in audit mode, allow + audit; in enforce mode, redact/block final reply

### Escalation path, rare
Only on final reply:
1. sensitive inbound request
2. high leak score
3. profile permits escalation
4. verification budget available
5. run one extra verifier pass
6. if verifier confirms risk, enforce
7. if verifier times out or fails, fall back to local decision and log once

## Concrete test plan

### Unit tests

Add:
- `src/security/runtime-reply-guard.test.ts`
- `src/security/runtime-reply-guard-context.test.ts`
- `src/security/reply-redaction.test.ts`

Cases:
- benign text passes
- obvious prompt leak gets high score
- media-only payload bypasses
- sensitive prompt + risky final reply returns audit or block depending on mode
- block replies remain allowed in audit mode

### Integration tests

Add:
- `src/auto-reply/reply/dispatch-from-config.reply-guard.test.ts`

Cases:
- tool reply with benign text is delivered
- final reply with prompt leakage is redacted in enforce mode
- block streaming remains stable and does not deadlock
- routed replies still honor guard before route-reply
- TTS-only payload still works when final text is absent

### Non-goals for first integration
- per-channel bespoke guard logic
- multiple verifier passes
- full transcript self-consistency on every turn
- storing full sensitive outputs in logs

## Critique of this improved integration plan

Remaining risks:
1. Regex-based leak detection can still false-positive on quoted docs or educational content.
2. Block-level auditing may produce lots of events on long replies.
3. Even a single verifier pass can be too expensive for some channels if enabled too broadly.

## Improvements to address those risks

1. **Quoted-content suppression**
- add a cheap heuristic in `runtime-reply-guard.ts` to lower severity for obvious quotations, code fences, or docs examples

2. **Event coalescing**
- emit per-turn summary events for block replies instead of one event per block when possible

3. **Strict verifier budget**
- one extra call max per turn
- final replies only
- timeout and fail-open to local audit or fail-safe to redaction based on config

## Recommended first implementation order

1. `src/security/runtime-reply-guard.ts`
2. `src/security/runtime-reply-guard-context.ts`
3. `src/security/reply-redaction.ts`
4. config wiring for `security.replyGuard`
5. `dispatch-from-config.ts` integration
6. unit tests
7. one integration test file

## Why this plan is token-efficient and stable

- most turns pay only for local string checks
- no second model pass on normal traffic
- one central hook avoids duplication
- audit-first rollout minimizes user-facing regressions
- verifier path is bounded, timed, and optional
- transport and channel code remain mostly unchanged
