import { handleChatGet } from "./chat/controller";
import { env } from "./config/env";

function notFound(): Response {
  return new Response(
    JSON.stringify({
      error: "Not found",
    }),
    {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": env.CORS_ORIGIN,
      },
    },
  );
}

function methodNotAllowed(allowed: string): Response {
  return new Response(
    JSON.stringify({
      error: "Method not allowed",
    }),
    {
      status: 405,
      headers: {
        "content-type": "application/json; charset=utf-8",
        allow: allowed,
        "access-control-allow-origin": env.CORS_ORIGIN,
      },
    },
  );
}

function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": env.CORS_ORIGIN,
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}

Bun.serve({
  port: env.PORT,
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/chat") {
      if (request.method === "OPTIONS") {
        return corsPreflight();
      }

      if (request.method !== "GET") {
        return methodNotAllowed("GET, OPTIONS");
      }

      return handleChatGet(request);
    }

    return notFound();
  },
});

console.log(
  `Flowly API listening on http://localhost:${env.PORT} (provider=${env.LLM_PROVIDER}, model=${env.LLM_MODEL})`,
);
