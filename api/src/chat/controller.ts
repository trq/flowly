import { streamText } from "ai";
import { env } from "../config/env";
import { getChatModel } from "../llm/model";

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

export function handleChatGet(request: Request): Response {
  const url = new URL(request.url);
  const userMessage = url.searchParams.get("message")?.trim();

  if (!userMessage) {
    return json(400, {
      error: "Missing required query parameter: message",
    });
  }

  const result = streamText({
    model: getChatModel(),
    messages: [{ role: "user", content: userMessage }],
  });

  return result.toTextStreamResponse({
    headers: {
      "access-control-allow-origin": env.CORS_ORIGIN,
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
