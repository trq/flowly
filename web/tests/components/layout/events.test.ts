import { describe, test, expect } from "vitest";
import {
  isSessionLogoutEvent,
  isCommandsSnapshotEvent,
  isOnboardingSnapshotEvent,
  isOnboardingStartedEvent,
  isOnboardingCompletedEvent,
  isOnboardingCancelledEvent,
  isAnyOnboardingEvent,
} from "@/components/layout/events";

describe("isSessionLogoutEvent", () => {
  test("returns true for a valid session logout event", () => {
    expect(
      isSessionLogoutEvent({ channel: "session", type: "session.logout" })
    ).toBe(true);
  });

  test("returns false for wrong channel", () => {
    expect(
      isSessionLogoutEvent({ channel: "other", type: "session.logout" })
    ).toBe(false);
  });

  test("returns false for wrong type", () => {
    expect(
      isSessionLogoutEvent({ channel: "session", type: "session.other" })
    ).toBe(false);
  });

  test("returns false for null", () => {
    expect(isSessionLogoutEvent(null)).toBe(false);
  });

  test("returns false for non-object", () => {
    expect(isSessionLogoutEvent("string")).toBe(false);
    expect(isSessionLogoutEvent(42)).toBe(false);
  });
});

describe("isCommandsSnapshotEvent", () => {
  test("returns true for a valid commands snapshot event", () => {
    expect(
      isCommandsSnapshotEvent({
        channel: "commands",
        type: "commands.snapshot",
        payload: {
          commands: [{ name: "logout", description: "Sign out" }],
        },
      })
    ).toBe(true);
  });

  test("returns true for empty commands array", () => {
    expect(
      isCommandsSnapshotEvent({
        channel: "commands",
        type: "commands.snapshot",
        payload: { commands: [] },
      })
    ).toBe(true);
  });

  test("returns false for wrong channel", () => {
    expect(
      isCommandsSnapshotEvent({
        channel: "other",
        type: "commands.snapshot",
        payload: { commands: [] },
      })
    ).toBe(false);
  });

  test("returns false for missing payload", () => {
    expect(
      isCommandsSnapshotEvent({
        channel: "commands",
        type: "commands.snapshot",
      })
    ).toBe(false);
  });

  test("returns false when commands is not an array", () => {
    expect(
      isCommandsSnapshotEvent({
        channel: "commands",
        type: "commands.snapshot",
        payload: { commands: "not-array" },
      })
    ).toBe(false);
  });

  test("returns false for null", () => {
    expect(isCommandsSnapshotEvent(null)).toBe(false);
  });
});

describe("onboarding event guards", () => {
  const basePayload = {
    sessionId: "session-1",
    status: "active",
    userId: "ps_user_1",
  };

  test("recognizes onboarding snapshot event", () => {
    const event = {
      channel: "onboarding",
      type: "onboarding.snapshot",
      payload: { ...basePayload },
    };

    expect(isOnboardingSnapshotEvent(event)).toBe(true);
    expect(isAnyOnboardingEvent(event)).toBe(true);
  });

  test("recognizes onboarding started event", () => {
    const event = {
      channel: "onboarding",
      type: "onboarding.started",
      payload: { ...basePayload },
    };

    expect(isOnboardingStartedEvent(event)).toBe(true);
    expect(isAnyOnboardingEvent(event)).toBe(true);
  });

  test("recognizes onboarding completed event", () => {
    const event = {
      channel: "onboarding",
      type: "onboarding.completed",
      payload: { ...basePayload, status: "completed" },
    };

    expect(isOnboardingCompletedEvent(event)).toBe(true);
    expect(isAnyOnboardingEvent(event)).toBe(true);
  });

  test("recognizes onboarding cancelled event", () => {
    const event = {
      channel: "onboarding",
      type: "onboarding.cancelled",
      payload: { ...basePayload, status: "cancelled" },
    };

    expect(isOnboardingCancelledEvent(event)).toBe(true);
    expect(isAnyOnboardingEvent(event)).toBe(true);
  });

  test("returns false for onboarding event with missing payload", () => {
    expect(
      isAnyOnboardingEvent({
        channel: "onboarding",
        type: "onboarding.started",
      }),
    ).toBe(false);
  });
});
