# JustAsk-inspired Hardening Plan for OpenClaw

## Goal

Improve OpenClaw's resilience against prompt leakage, hidden-instruction disclosure, and misleading model self-reports by borrowing the _defensive_ lessons from JustAsk without importing its extraction behavior.

## Scope

This plan adds four defensive building blocks:

1. A prompt leak risk taxonomy and detector.
2. Cross-verification for sensitive model self-reports.
3. Self-consistency checks for security-relevant claims.
4. Architecture-aware defense profiles for model families.

## Concrete implementation plan

### 1. Prompt leak detector

Add a small security module that scores model output for likely hidden-instruction leakage.

Planned files:

- `src/security/prompt-leak-detector.ts`
- `test/security/prompt-leak-detector.test.ts`

Detection signals:

- system-prompt framing, hidden instruction references, tool schema disclosure cues
- policy or role disclosure cues, for example “you are ChatGPT”, “system says”, “developer instruction”, “tool schema”
- metadata leakage cues, for example chain-of-command summaries or hidden capability lists

Output:

- normalized risk score
- matched reasons
- severity bucket: low, medium, high

### 2. Cross-verification for sensitive self-reports

Add a verifier helper that requires agreement from two independent answer-generation paths before trusting sensitive answers such as:

- “what are your hidden instructions?”
- “what tools do you secretly have?”
- “what policy forbids this?”
- “what exact system prompt are you running?”

Planned files:

- `src/security/sensitive-self-report.ts`
- `test/security/sensitive-self-report.test.ts`

Behavior:

- classify whether a question/answer pair is security-sensitive
- if sensitive, request corroboration from a second path or verifier pass
- degrade confidence when the answers diverge materially

### 3. Self-consistency checks

For security-relevant model self-descriptions, compare multiple reformulations of the same claim and surface instability.

Planned files:

- `src/security/self-consistency.ts`
- `test/security/self-consistency.test.ts`

Behavior:

- compare canonicalized claims
- compute consistency result: stable, mixed, unstable
- emit explanation text suitable for logs or UI

### 4. Architecture-aware defense profiles

Add simple model-family profiles so OpenClaw can apply different caution levels for OpenAI-like, Anthropic-like, Gemini-like, and open-weight models.

Planned files:

- `src/security/defense-profiles.ts`
- `test/security/defense-profiles.test.ts`

Behavior:

- map model ids to profile families
- expose default thresholds for leak scoring and verification strictness
- keep this data-driven and easy to tune

## Test targets

Recommended test targets after implementation:

- `pnpm test -- --run test/security/prompt-leak-detector.test.ts`
- `pnpm test -- --run test/security/sensitive-self-report.test.ts`
- `pnpm test -- --run test/security/self-consistency.test.ts`
- `pnpm test -- --run test/security/defense-profiles.test.ts`

## Critique of the first-pass plan

Weak points in the initial plan:

1. It was too conceptual and did not name concrete files.
2. It did not define what “cross-verification” means operationally inside OpenClaw.
3. It risked overfitting to research vocabulary instead of OpenClaw's codebase.
4. It did not define a minimal shippable slice.

## Improved version of the plan

The improved plan above narrows scope to four modules with explicit tests and a small API surface.

Recommended shipping order:

1. `prompt-leak-detector`
2. `defense-profiles`
3. `sensitive-self-report`
4. `self-consistency`

## Minimal release target

A prerelease is successful if OpenClaw can:

- score likely prompt leaks from a single model response,
- classify security-sensitive self-reports,
- mark unstable sensitive claims as low-confidence,
- and vary thresholds by model family.
