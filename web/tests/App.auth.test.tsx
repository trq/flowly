import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

type ShooIdentityClaims = {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  pairwise_sub: string;
  sub: string;
};

const signIn = vi.fn();
const clearIdentity = vi.fn();

let mockLoading = false;
let mockIdentity: {
  userId: string | null;
  token?: string;
  expiresIn?: number;
  receivedAt?: number;
} = {
  userId: "ps_web_user_1",
  token: "token",
};
let mockClaims: ShooIdentityClaims | null = null;

class FakeEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();
}

vi.mock("@shoojs/react", () => ({
  useShooAuth: () => ({
    identity: mockIdentity,
    claims: mockClaims,
    loading: mockLoading,
    signIn,
    clearIdentity,
  }),
}));

vi.mock("@/components/layout/Header", () => ({
  default: () => <div>Header</div>,
}));

vi.mock("@/components/layout/MainContent", () => ({
  default: () => <div>Main content</div>,
}));

import App from "@/App";

describe("App auth behavior", () => {
  beforeEach(() => {
    signIn.mockReset();
    clearIdentity.mockReset();
    mockLoading = false;
    mockIdentity = {
      userId: "ps_web_user_1",
      token: "token",
    };
    mockClaims = {
      aud: "test-aud",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 60,
      iss: "https://shoo.dev",
      jti: "jti",
      pairwise_sub: "ps_web_user_1",
      sub: "sub",
    };
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  test("clears identity when token claims are expired", async () => {
    mockClaims = {
      aud: "test-aud",
      exp: Math.floor(Date.now() / 1000) - 60,
      iat: Math.floor(Date.now() / 1000) - 3600,
      iss: "https://shoo.dev",
      jti: "jti",
      pairwise_sub: "ps_web_user_1",
      sub: "sub",
    };

    render(<App />);

    await waitFor(() => {
      expect(clearIdentity).toHaveBeenCalledTimes(1);
    });
  });

  test("does not clear identity when token claims are still valid", async () => {
    render(<App />);

    await waitFor(() => {
      expect(clearIdentity).not.toHaveBeenCalled();
    });
  });
});
