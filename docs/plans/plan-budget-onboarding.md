# Plan: Budget Onboarding (Chat + `/new budget`)

## Context

`Budget` is the primary domain concept. A user can own many budgets (typically one), and each budget must have at least one pay cycle.

Initial onboarding scope:

- collect budget name
- collect pay cycle cadence: `weekly | fortnightly | monthly`
- collect pay cycle day `N`
- create budget + initial pay cycle

Future onboarding scope (same flow, later steps):

- pools
- categories

## Product Requirements

1. Users can start onboarding from:
   - slash command: `/new budget`
   - natural language: "let's create a new budget"
2. The assistant should prompt for name + pay cycle config.
3. The prompt should be presented as simple UI inside chat.
4. `/new budget` should behave like a chat intent entrypoint (same outcome as natural language).

## Decisions Locked

- Budget onboarding is orchestrated by a dedicated AI SDK `ToolLoopAgent`.
- The onboarding UI in chat is generated as `json-render` specs by the onboarding agent.
- SSE events remain the canonical source of state for onboarding and budget data. Chat UI specs are presentational.

## Constraints From Current Code

- Slash commands are intercepted before LLM in `/Users/trq/flowly/api/src/http/chat/commands.ts`.
- Command parser supports one command token, then args:
  - `/new budget` parses as `command="new"`, `args="budget"`
- `POST /chat` currently calls `streamText` with no tools or agent routing in `/Users/trq/flowly/api/src/http/chat/controller.ts`.
- Frontend conversation renders text only today in `/Users/trq/flowly/web/src/components/layout/Conversation.tsx`.
- Budgets and onboarding persistence do not exist yet.

## Proposal Summary

Add a server-owned onboarding state machine and make both entrypoints (`/new budget`, natural language) converge into a dedicated onboarding agent.

- `BudgetOnboardingAgent` (`ToolLoopAgent`) owns conversational onboarding behavior.
- Agent tools call backend onboarding services; services own validation and DB writes.
- Agent returns `json-render` onboarding UI specs in chat stream data parts.
- SSE events remain the state source of truth for onboarding and domain updates.
- Slash command `/new budget` routes into the same onboarding agent path.

This gives a deterministic domain flow while keeping chat-first UX.

## Onboarding Agent Design

`BudgetOnboardingAgent` should be configured with:

- focused onboarding instructions (budget basics now, pools/categories later)
- onboarding tools only (no unrelated tools)
- loop controls to avoid runaway steps (`stopWhen`, and explicit completion tools)
- typed UI streaming parts for `json-render` specs

Suggested runtime routing:

1. If slash command `/new budget` is invoked, route directly to `BudgetOnboardingAgent`.
2. If user has an active onboarding session, route subsequent onboarding turns to `BudgetOnboardingAgent`.
3. Otherwise use normal chat model path.

This keeps onboarding behavior predictable without forcing all chat turns through the onboarding agent.

## Domain Model (MVP)

`userId` in these docs means the authenticated Shoo subject (`pairwise_sub` / `sub`). It must be treated as an opaque string.

### `budgets` collection

```ts
type BudgetDoc = {
  _id: string; // UUID
  userId: string; // Auth subject from Shoo (pairwise_sub/sub, e.g. "ps_...")
  name: string;
  createdAt: string; // ISO
};
```

### `payCycles` collection

```ts
type PayCycleCadence = "weekly" | "fortnightly" | "monthly";

type PayCycleDoc = {
  _id: string; // UUID
  userId: string; // Auth subject from Shoo (pairwise_sub/sub)
  budgetId: string; // UUID
  cadence: PayCycleCadence;
  day: number; // interpretation depends on cadence
  timezone: string; // IANA tz, e.g. "America/New_York"
  createdAt: string; // ISO
};
```

### `onboardingSessions` collection

```ts
type OnboardingStep =
  | "budget" // name + cadence + day + timezone
  | "pools" // future
  | "categories" // future
  | "done";

type OnboardingStatus = "active" | "completed" | "cancelled" | "expired";

type BudgetOnboardingSessionDoc = {
  _id: string; // UUID
  userId: string; // Auth subject from Shoo (pairwise_sub/sub)
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  draft: {
    name?: string;
    cadence?: "weekly" | "fortnightly" | "monthly";
    day?: number;
    timezone?: string;
  };
  createdAt: string; // ISO
  updatedAt: string; // ISO
  expiresAt: string; // ISO
};
```

## Onboarding State Machine

MVP transition set:

1. `start` -> create/reuse active session -> `budget`
2. `submitBudgetBasics` (valid input) ->
   - create budget
   - create pay cycle
   - mark session `completed`, `currentStep="pools"` (or `"done"` if you want to close now)
3. `cancel` -> `cancelled`

Forward-compatible steps:

- `pools` and `categories` are additional transitions on the same session record.

## Pay Cycle Rules (Need Decision Before Build)

Two valid interpretations for `day`:

1. Recommended: strict low-risk rules
   - `weekly`: `1..7` (day-of-week)
   - `fortnightly`: `1..7` + anchor by first occurrence after budget creation date
   - `monthly`: `1..28` only (always valid across months)
2. Flexible: allow `monthly` `1..31` with month-end rollover policy
   - requires explicit "short month" behavior (clamp vs skip vs spill)

Recommendation: ship with option 1 for MVP, then expand.

## Entry Points

### Natural language entry

- User asks to create a budget.
- Chat runtime routes to `BudgetOnboardingAgent` (intent-based or active-session-based).
- Agent calls `startBudgetOnboarding` tool.
- Tool opens/resumes onboarding session and emits onboarding events.
- Agent also emits a `json-render` onboarding form spec in chat stream data.

### Slash entry (`/new budget`)

Implement `new` command in registry:

- `/new budget` routes into `BudgetOnboardingAgent` with a synthetic onboarding-start prompt
- agent returns onboarding confirmation + `json-render` onboarding form spec
- no separate component-specific slash-only flow

## Agent + Tooling Plan (API)

Create a dedicated onboarding agent module and tools:

1. `startBudgetOnboarding`
   - input: optional partial fields
   - output: session summary (`sessionId`, `currentStep`, `draft`)
2. `submitBudgetOnboardingBasics`
   - input: `sessionId`, `name`, `cadence`, `day`, `timezone`
   - validates and commits budget + pay cycle
3. `cancelBudgetOnboarding` (optional in MVP, recommended)

Tool handlers should call a shared onboarding service, not raw DB writes.
Agent responses should include typed data parts for onboarding UI specs.

## Event Contract Additions

Add new channel `onboarding` and budget channel `budgets`.

### New event types

- `onboarding.snapshot`
- `onboarding.started`
- `onboarding.updated`
- `onboarding.completed`
- `onboarding.cancelled`
- `budgets.created`
- `pay-cycles.created` (optional; can be merged into `budgets.created` payload)

### Source-of-truth rule

- `onboarding.*`, `budgets.*`, and `pay-cycles.*` events are canonical state updates.
- `json-render` specs streamed by the agent are UI projections, not persisted state.

Envelope stays unchanged:

```json
{ "id": "...", "channel": "...", "type": "...", "payload": {}, "sentAt": "..." }
```

### Startup snapshot behavior

On `GET /events` initial connect, emit current active onboarding session snapshot (if any), same as existing `commands.snapshot` pattern.

## Frontend Plan

### Rendering

Render onboarding UI from agent-provided `json-render` specs:

- parse typed onboarding UI parts from chat stream messages
- render specs via `@json-render/react` in conversation
- keep UI state synchronized with SSE onboarding events

### Submission transport

Use structured onboarding actions through `POST /chat`:

- form submission emits structured action payload (sessionId + fields)
- agent/tool path handles validation + persistence
- avoid depending on fragile prompt-text serialization for form submissions

## Backend Files (Planned)

- `/Users/trq/flowly/api/src/agents/budget-onboarding-agent.ts` (new)
- `/Users/trq/flowly/api/src/http/chat/agent-router.ts` (new)
- `/Users/trq/flowly/api/src/slash/commands/new.ts` (new)
- `/Users/trq/flowly/api/src/slash/index.ts` (edit)
- `/Users/trq/flowly/api/src/http/chat/controller.ts` (edit; add agent + tools + structured actions)
- `/Users/trq/flowly/api/src/http/chat/commands.ts` (edit; allow slash-to-agent routing result)
- `/Users/trq/flowly/api/src/http/events/controller.ts` (edit; onboarding snapshot)
- `/Users/trq/flowly/api/src/budgets/store.ts` (new)
- `/Users/trq/flowly/api/src/onboarding/store.ts` (new)
- `/Users/trq/flowly/api/src/onboarding/service.ts` (new)
- `/Users/trq/flowly/api/src/onboarding/validation.ts` (new)

## Frontend Files (Planned)

- `/Users/trq/flowly/web/src/components/layout/events.ts` (edit; onboarding guards/types)
- `/Users/trq/flowly/web/src/components/layout/Conversation.tsx` (edit; render onboarding json specs + state sync)
- `/Users/trq/flowly/web/src/components/onboarding/registry.ts` (new; onboarding json-render component catalog)
- `/Users/trq/flowly/web/src/components/onboarding/OnboardingRenderer.tsx` (new)

## Tests

TDD policy for this epic:

- Start with red tests for each behavior slice before implementation.
- Only add implementation code after the relevant tests fail for the expected reason.
- Keep each slice tight: red -> green -> refactor, then move to the next slice.

### API

- slash parsing: `/new budget` path
- onboarding service transitions
- cadence/day validation rules
- budget + pay cycle persistence invariants
- event publication (`onboarding.*`, `budgets.created`)

### Web

- event type guards for onboarding events
- onboarding json-render rendering from agent stream parts
- form interaction and structured submit behavior
- SSE state reconciliation with rendered onboarding UI

## Delivery Phases

### Phase 0: TDD baseline (red tests first)

- add failing API tests for:
  - `/new budget` slash routing to onboarding agent
  - onboarding service transitions (`start`, `submitBudgetBasics`, `cancel`)
  - pay cycle validation rules (weekly/fortnightly/monthly day ranges)
  - `onboarding.*` and `budgets.created` event publication
- add failing web tests for:
  - onboarding `json-render` spec rendering in conversation
  - structured onboarding submit action payload
  - SSE reconciliation behavior for onboarding state
- verify tests fail for expected missing behavior before any feature implementation

### Phase 1: Budget basics onboarding (ship)

- implement only what is required to pass Phase 0 tests:
  - start/resume onboarding
  - collect name + pay cycle in chat-embedded `json-render` onboarding UI
  - create budget + pay cycle
  - emit events and update conversation

### Phase 2: Extend onboarding to pools/categories

- add `pools` and `categories` steps to same session model
- add new tool handlers + onboarding UI specs
- keep `/new budget` behavior unchanged

## Open Questions

1. Monthly `day` rule: `1..28` only for MVP, or `1..31` with rollover semantics?
2. Should one user have at most one active onboarding session at a time? (recommended: yes)
3. What timezone source should be canonical?
   - browser timezone sent by client
   - user profile default (future)
4. If user already has a budget, should onboarding create another budget or ask to confirm first?

## Acceptance Criteria (Phase 1)

1. Typing `/new budget` starts budget onboarding.
2. Asking "let's create a new budget" starts the same onboarding flow.
3. User can submit name + cadence + day in a chat-embedded onboarding form rendered from agent-provided `json-render` spec.
4. Backend creates exactly one budget and one pay cycle from valid input.
5. Frontend updates from SSE events only (no polling).
6. Reconnect restores active onboarding state via snapshot/replay model.
7. Onboarding UI is delivered as agent-generated `json-render` specs and rendered in chat.
