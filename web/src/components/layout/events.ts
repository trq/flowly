export type SessionLogoutEvent = {
  channel: "session"
  type: "session.logout"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isSessionLogoutEvent(value: unknown): value is SessionLogoutEvent {
  if (!isRecord(value)) return false
  return value.channel === "session" && value.type === "session.logout"
}
