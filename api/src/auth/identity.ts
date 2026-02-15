import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env";

type RequestIdentity = {
  userId: string | null;
};

type ResolveRequestIdentityOptions = {
  allowQueryToken?: boolean;
};

let shooJwks:
  | ReturnType<typeof createRemoteJWKSet>
  | undefined;

function getShooJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (shooJwks) return shooJwks;

  const baseUrl = env.SHOO_BASE_URL.replace(/\/$/, "");
  shooJwks = createRemoteJWKSet(
    new URL(`${baseUrl}/.well-known/jwks.json`),
  );

  return shooJwks;
}

function readTestUserIdOverride(request: Request): string | null {
  if (process.env.NODE_ENV !== "test") {
    return null;
  }

  const value = request.headers.get("x-flowly-user-id");
  if (!value) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value) return null;

  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  if (!match) return null;

  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

function readQueryToken(request: Request): string | null {
  const token = new URL(request.url).searchParams.get("access_token");
  if (!token) return null;

  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getUserIdFromVerifiedPayload(payload: {
  pairwise_sub?: unknown;
  sub?: unknown;
}): string | null {
  if (typeof payload.pairwise_sub === "string") {
    return payload.pairwise_sub;
  }
  if (typeof payload.sub === "string") {
    return payload.sub;
  }
  return null;
}

export async function resolveRequestIdentity(
  request: Request,
  options: ResolveRequestIdentityOptions = {},
): Promise<RequestIdentity> {
  const testOverride = readTestUserIdOverride(request);
  if (testOverride) {
    return { userId: testOverride };
  }

  const token =
    readBearerToken(request) ??
    (options.allowQueryToken ? readQueryToken(request) : null);
  if (!token) {
    return { userId: null };
  }

  try {
    const { payload } = await jwtVerify(token, getShooJwks());
    return { userId: getUserIdFromVerifiedPayload(payload) };
  } catch {
    return { userId: null };
  }
}
