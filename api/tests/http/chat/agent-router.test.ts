import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, disconnectDb, getDb } from "../../../src/db/client";
import {
  getEventsSince,
  type AppEvent,
} from "../../../src/events/bus";
import { ensureIndexes as ensureEventIndexes } from "../../../src/events/store";
import { ensureIndexes as ensureBudgetIndexes } from "../../../src/budgets/store";
import { ensureIndexes as ensureOnboardingIndexes } from "../../../src/onboarding/store";
import { startBudgetOnboarding } from "../../../src/onboarding/service";
import {
  isBudgetOnboardingStartIntent,
  routeBudgetOnboardingIfApplicable,
} from "../../../src/http/chat/agent-router";

const decoder = new TextDecoder();

type UiStreamChunk = {
  type: string;
  [key: string]: unknown;
};

async function collectUiChunks(
  response: Response,
  minCount: number,
): Promise<UiStreamChunk[]> {
  const chunks: UiStreamChunk[] = [];
  const body = response.body;
  if (!body) return chunks;

  const reader = body.getReader();
  let buffer = "";

  try {
    while (chunks.length < minCount) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value);
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        const dataLine = frame
          .split("\n")
          .find((line) => line.startsWith("data: "));
        if (!dataLine) continue;

        chunks.push(
          JSON.parse(dataLine.slice("data: ".length)) as UiStreamChunk,
        );

        if (chunks.length >= minCount) break;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancellation errors.
    }
  }

  return chunks;
}

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  await ensureEventIndexes();
  await ensureBudgetIndexes();
  await ensureOnboardingIndexes();
});

afterAll(async () => {
  await disconnectDb();
  await mongod.stop();
});

describe("budget onboarding agent router", () => {
  test("detects natural-language budget onboarding intent", () => {
    expect(isBudgetOnboardingStartIntent("Let's create a new budget")).toBe(
      true,
    );
    expect(isBudgetOnboardingStartIntent("How much did I spend last week?")).toBe(
      false,
    );
  });

  test("routes /new budget into onboarding and returns onboarding form data part", async () => {
    const userId = "ps_router_new_budget";
    const response = await routeBudgetOnboardingIfApplicable({
      headers: { "access-control-allow-origin": "*" },
      lastMessageText: "/new budget",
      messages: [
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: "/new budget" }],
        },
      ],
      parsedSlash: { args: "budget", command: "new" },
      userId,
    });

    expect(response).toBeInstanceOf(Response);
    const chunks = await collectUiChunks(response!, 4);

    const formChunk = chunks.find(
      (chunk) => chunk.type === "data-budget-onboarding-form",
    );
    expect(formChunk).toBeDefined();

    const events = await getEventsSince(0);
    const started = events.find(
      (event) =>
        event.type === "onboarding.started" &&
        (event.payload as { userId?: string }).userId === userId,
    );

    expect(started).toBeDefined();
  });

  test("accepts a structured onboarding submit action and persists budget + pay cycle", async () => {
    const userId = "ps_router_submit_budget";
    const started = await startBudgetOnboarding({ userId });

    const response = await routeBudgetOnboardingIfApplicable({
      headers: { "access-control-allow-origin": "*" },
      lastMessageText: "",
      messages: [
        {
          id: "m1",
          role: "user",
          parts: [
            {
              data: {
                cadence: "monthly",
                day: 15,
                name: "Budget 2026",
                sessionId: started.sessionId,
                timezone: "America/New_York",
              },
              type: "data-budget-onboarding-submit",
            },
          ],
        },
      ],
      parsedSlash: null,
      userId,
    });

    expect(response).toBeInstanceOf(Response);
    await collectUiChunks(response!, 3);

    const budget = await getDb()
      .collection<{ _id: string; userId: string; name: string }>("budgets")
      .findOne({ userId, name: "Budget 2026" });
    expect(budget).toBeDefined();

    const payCycle = await getDb()
      .collection<{ _id: string; budgetId: string; userId: string }>("payCycles")
      .findOne({ userId, budgetId: budget!._id });
    expect(payCycle).toBeDefined();

    const events = (await getEventsSince(0)).filter(
      (event: AppEvent) => (event.payload as { userId?: string }).userId === userId,
    );
    expect(events.some((event) => event.type === "budgets.created")).toBe(true);
    expect(events.some((event) => event.type === "onboarding.completed")).toBe(
      true,
    );
  });

  test("does not hijack non-onboarding slash commands while onboarding is active", async () => {
    const userId = "ps_router_slash_passthrough";
    await startBudgetOnboarding({ userId });

    const response = await routeBudgetOnboardingIfApplicable({
      headers: { "access-control-allow-origin": "*" },
      lastMessageText: "/logout",
      messages: [
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: "/logout" }],
        },
      ],
      parsedSlash: { command: "logout", args: "" },
      userId,
    });

    expect(response).toBeNull();
  });
});
