import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { env } from "../../config/env";
import { getChatModel } from "../../llm/model";
import { handleSlashCommand, parseSlashCommand } from "./commands";
import { resolveRequestIdentity } from "../../auth/identity";
import { maybeRouteToBudgetOnboarding } from "./agent-router";
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
  const identity = await resolveRequestIdentity(request);
  const onboardingResponse = await maybeRouteToBudgetOnboarding({
    headers: streamHeaders,
    messages: body.messages,
    lastMessageText,
    parsedSlash: parsed,
    userId: identity.userId,
  });
  if (onboardingResponse) return onboardingResponse;

  if (parsed) {
    const commandResponse = await handleSlashCommand(parsed, streamHeaders, {
      userId: identity.userId,
    });
    if (commandResponse) return commandResponse;
  }

  const result = streamText({
    model: getChatModel(),
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse({ headers: streamHeaders });
}
