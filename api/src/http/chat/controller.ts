import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { env } from "../../config/env";
import { getChatModel } from "../../llm/model";
import { handleSlashCommand, parseSlashCommand } from "./commands";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": env.CORS_ORIGIN,
      "cache-control": "no-store",
    },
  });
}

type ChatRequestBody = {
  messages?: UIMessage[];
};

function readUserId(request: Request): string | null {
  const value = request.headers.get("x-flowly-user-id");
  if (!value) return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function handleChatPost(request: Request): Promise<Response> {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return json(400, {
      error: "Invalid JSON body",
    });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, {
      error: "Missing required body field: messages",
    });
  }

  const lastMessage = body.messages[body.messages.length - 1];
  const lastMessageText =
    lastMessage?.role === "user"
      ? lastMessage.parts?.find((p) => p.type === "text")?.text ?? ""
      : "";

  const streamHeaders = {
    "access-control-allow-origin": env.CORS_ORIGIN,
    "cache-control": "no-store",
    "x-accel-buffering": "no",
  };

  const parsed = parseSlashCommand(lastMessageText);
  if (parsed) {
    const commandResponse = await handleSlashCommand(parsed, streamHeaders, {
      userId: readUserId(request),
    });
    if (commandResponse) return commandResponse;
  }

  const result = streamText({
    model: getChatModel(),
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse({ headers: streamHeaders });
}
