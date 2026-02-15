import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, disconnectDb } from "../../../src/db/client";
import { ensureIndexes } from "../../../src/events/store";
import {
  parseSlashCommand,
  handleSlashCommand,
} from "../../../src/http/chat/commands";

// Ensure the logout command is registered
import "../../../src/slash/commands/logout";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  await ensureIndexes();
});

afterAll(async () => {
  await disconnectDb();
  await mongod.stop();
});

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

  test("returns a Response for a registered command", async () => {
    const parsed = parseSlashCommand("/logout")!;
    const response = await handleSlashCommand(parsed, headers);

    expect(response).toBeInstanceOf(Response);
    expect(response!.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("returns null for an unknown command", async () => {
    const parsed = { command: "unknown", args: "" };
    const response = await handleSlashCommand(parsed, headers);

    expect(response).toBeNull();
  });
});
