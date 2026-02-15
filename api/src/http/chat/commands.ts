import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { resolve } from "../../slash";
import type { SlashCommandContext } from "../../slash/registry";

type SlashCommand = {
  command: string;
  args: string;
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

export async function handleSlashCommand(
  parsed: SlashCommand,
  headers: Record<string, string>,
  context: SlashCommandContext = {},
): Promise<Response | null> {
  const definition = resolve(parsed.command);
  if (!definition) return null;

  const text = await definition.handler(parsed.args, context);

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
