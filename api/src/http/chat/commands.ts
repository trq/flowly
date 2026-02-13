import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { publish } from "../../events/bus";

type SlashCommand = {
  command: string;
  args: string;
};

type CommandResult = {
  text: string;
};

export function parseSlashCommand(text: string): SlashCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { command: trimmed.slice(1), args: "" };
  }

  return {
    command: trimmed.slice(1, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function handleSlashCommand(
  parsed: SlashCommand,
  headers: Record<string, string>,
): Response | null {
  let result: CommandResult | null = null;

  switch (parsed.command) {
    case "logout": {
      publish({
        id: `evt_session_logout_${Date.now()}`,
        channel: "session",
        type: "session.logout",
        payload: {},
        sentAt: new Date().toISOString(),
      });
      result = { text: "Signing out…" };
      break;
    }
  }

  if (!result) return null;

  const { text } = result;

  return createUIMessageStreamResponse({
    headers,
    stream: createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: "text-start", id: "cmd" });
        writer.write({ type: "text-delta", id: "cmd", delta: text });
        writer.write({ type: "text-end", id: "cmd" });
      },
    }),
  });
}
