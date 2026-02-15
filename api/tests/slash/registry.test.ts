import { describe, test, expect, beforeEach } from "bun:test";
import { register, resolve, list } from "../../src/slash/registry";

// The registry uses a module-level Map, so we register fresh commands per test
// using unique names to avoid cross-test pollution.

describe("command registry", () => {
  test("register and resolve a command", () => {
    const handler = () => "ok";
    register({ name: "test-resolve", description: "A test command", handler });

    const def = resolve("test-resolve");
    expect(def).toBeDefined();
    expect(def!.name).toBe("test-resolve");
    expect(def!.description).toBe("A test command");
    expect(def!.handler("")).toBe("ok");
  });

  test("resolve returns undefined for unknown command", () => {
    expect(resolve("nonexistent")).toBeUndefined();
  });

  test("list returns name and description without handler", () => {
    register({
      name: "test-list",
      description: "Listed command",
      handler: () => "ok",
    });

    const items = list();
    const found = items.find((c) => c.name === "test-list");
    expect(found).toEqual({ name: "test-list", description: "Listed command" });
    expect(found).not.toHaveProperty("handler");
  });

  test("registering same name overwrites previous definition", () => {
    register({
      name: "test-overwrite",
      description: "v1",
      handler: () => "v1",
    });
    register({
      name: "test-overwrite",
      description: "v2",
      handler: () => "v2",
    });

    const def = resolve("test-overwrite");
    expect(def!.description).toBe("v2");
    expect(def!.handler("")).toBe("v2");
  });
});
