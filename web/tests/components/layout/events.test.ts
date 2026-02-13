import { describe, test, expect } from "vitest";
import {
  isSessionLogoutEvent,
  isCommandsSnapshotEvent,
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
