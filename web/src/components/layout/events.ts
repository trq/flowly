type SessionLogoutEvent = {
  channel: "session"
  type: "session.logout"
}

export type CommandInfo = {
  name: string
  description: string
}

type CommandsSnapshotEvent = {
  channel: "commands"
  type: "commands.snapshot"
  payload: { commands: CommandInfo[] }
}

type OnboardingSnapshotEvent = {
  channel: "onboarding"
  type: "onboarding.snapshot"
  payload: {
    sessionId: string
    userId: string
    status: "active" | "completed" | "cancelled" | "expired"
    currentStep: string
    draft: Record<string, unknown>
    uiSpec?: unknown
  }
}

type OnboardingStartedEvent = {
  channel: "onboarding"
  type: "onboarding.started"
  payload: {
    sessionId: string
    userId: string
    status: "active"
    currentStep: string
    draft: Record<string, unknown>
    uiSpec?: unknown
  }
}

type OnboardingCompletedEvent = {
  channel: "onboarding"
  type: "onboarding.completed"
  payload: {
    sessionId: string
    userId: string
    status: "completed"
    currentStep: string
  }
}

type OnboardingCancelledEvent = {
  channel: "onboarding"
  type: "onboarding.cancelled"
  payload: {
    sessionId: string
    userId: string
    status: "cancelled"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isSessionLogoutEvent(value: unknown): value is SessionLogoutEvent {
  if (!isRecord(value)) return false
  return value.channel === "session" && value.type === "session.logout"
}

export function isCommandsSnapshotEvent(value: unknown): value is CommandsSnapshotEvent {
  if (!isRecord(value)) return false
  if (value.channel !== "commands" || value.type !== "commands.snapshot") return false
  if (!isRecord(value.payload)) return false
  return Array.isArray(value.payload.commands)
}

function isOnboardingEventType(type: unknown): type is OnboardingSnapshotEvent["type"] | OnboardingStartedEvent["type"] | OnboardingCompletedEvent["type"] | OnboardingCancelledEvent["type"] {
  return (
    type === "onboarding.snapshot" ||
    type === "onboarding.started" ||
    type === "onboarding.completed" ||
    type === "onboarding.cancelled"
  )
}

function hasOnboardingSessionPayload(value: unknown): value is { payload: { sessionId: string; userId: string; status: string } } {
  if (!isRecord(value)) return false
  if (!isRecord(value.payload)) return false
  return (
    typeof value.payload.sessionId === "string" &&
    typeof value.payload.userId === "string" &&
    typeof value.payload.status === "string"
  )
}

export function isOnboardingSnapshotEvent(value: unknown): value is OnboardingSnapshotEvent {
  if (!isRecord(value)) return false
  if (value.channel !== "onboarding" || value.type !== "onboarding.snapshot") return false
  return hasOnboardingSessionPayload(value)
}

export function isOnboardingStartedEvent(value: unknown): value is OnboardingStartedEvent {
  if (!isRecord(value)) return false
  if (value.channel !== "onboarding" || value.type !== "onboarding.started") return false
  return hasOnboardingSessionPayload(value)
}

export function isOnboardingCompletedEvent(value: unknown): value is OnboardingCompletedEvent {
  if (!isRecord(value)) return false
  if (value.channel !== "onboarding" || value.type !== "onboarding.completed") return false
  return hasOnboardingSessionPayload(value)
}

export function isOnboardingCancelledEvent(value: unknown): value is OnboardingCancelledEvent {
  if (!isRecord(value)) return false
  if (value.channel !== "onboarding" || value.type !== "onboarding.cancelled") return false
  return hasOnboardingSessionPayload(value)
}

export function isAnyOnboardingEvent(
  value: unknown,
): value is
  | OnboardingSnapshotEvent
  | OnboardingStartedEvent
  | OnboardingCompletedEvent
  | OnboardingCancelledEvent {
  if (!isRecord(value)) return false
  if (value.channel !== "onboarding") return false
  if (!isOnboardingEventType(value.type)) return false
  return hasOnboardingSessionPayload(value)
}
