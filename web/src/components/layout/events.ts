export type SessionLogoutEvent = {
  channel: "session"
  type: "session.logout"
}

export type CommandInfo = {
  name: string
  description: string
}

export type CommandsSnapshotEvent = {
  channel: "commands"
  type: "commands.snapshot"
  payload: { commands: CommandInfo[] }
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
