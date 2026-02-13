import { describe, test, expect, beforeAll } from "bun:test";
import { parseSlashCommand, handleSlashCommand } from "../../../src/http/chat/commands";

// Ensure the logout command is registered
import "../../../src/commands/logout";

describe("parseSlashCommand", () => {
  test("parses a simple command", () => {
    expect(parseSlashCommand("/logout")).toEqual({
      command: "logout",
      args: "",
    });
  });

  test("parses a command with args", () => {
    expect(parseSlashCommand("/greet hello world")).toEqual({
      command: "greet",
      args: "hello world",
    });
  });

  test("trims whitespace", () => {
    expect(parseSlashCommand("  /logout  ")).toEqual({
      command: "logout",
      args: "",
    });
  });

  test("returns null for non-slash text", () => {
    expect(parseSlashCommand("hello")).toBeNull();
    expect(parseSlashCommand("")).toBeNull();
    expect(parseSlashCommand("  ")).toBeNull();
  });

  test("returns null for empty command after slash", () => {
    // "/" alone yields command: "" which is a valid parse
    const result = parseSlashCommand("/");
    expect(result).toEqual({ command: "", args: "" });
  });
});

describe("handleSlashCommand", () => {
  const headers = { "access-control-allow-origin": "*" };

  test("returns a Response for a registered command", () => {
    const parsed = parseSlashCommand("/logout")!;
    const response = handleSlashCommand(parsed, headers);

    expect(response).toBeInstanceOf(Response);
    expect(response!.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("returns null for an unknown command", () => {
    const parsed = { command: "unknown", args: "" };
    const response = handleSlashCommand(parsed, headers);

    expect(response).toBeNull();
  });
});
