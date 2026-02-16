import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MockLanguageModelV3 } from "ai/test";
import { connectDb, disconnectDb, getDb } from "../../src/db/client";
import { getEventsSince } from "../../src/events/bus";
import { ensureIndexes as ensureEventIndexes } from "../../src/events/store";
import { ensureIndexes as ensureOnboardingIndexes } from "../../src/onboarding/store";
import { startBudgetOnboarding } from "../../src/onboarding/service";
import {
  runBudgetOnboardingAgentStart,
  runBudgetOnboardingAgentSubmit,
} from "../../src/agents/budget-onboarding-agent";

function usage() {
  return {
    inputTokens: {
      total: 1,
      noCache: 1,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: 1,
      text: 0,
      reasoning: undefined,
    },
  } as const;
}

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  await ensureEventIndexes();
  await ensureOnboardingIndexes();
});

afterAll(async () => {
  await disconnectDb();
  await mongod.stop();
});

describe("budget onboarding agent", () => {
  test("runBudgetOnboardingAgentStart starts onboarding via tool loop and returns form spec", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "startBudgetOnboarding",
            input: "{}",
          },
        ],
        finishReason: { unified: "tool-calls", raw: "tool-calls" },
        usage: usage(),
        warnings: [],
      }),
    });

    const userId = "ps_agent_start_1";
    const result = await runBudgetOnboardingAgentStart({
      model,
      prompt: "Let's create a new budget",
      userId,
    });

    expect(result.sessionId).toBeString();
    expect(result.spec.root).toBe("budget-onboarding-form");
    expect(result.spec.elements["budget-onboarding-form"]?.type).toBe(
      "BudgetOnboardingForm",
    );

    const started = (await getEventsSince(0)).find(
      (event) =>
        event.channel === "onboarding" &&
        event.type === "onboarding.started" &&
        (event.payload as { userId?: string }).userId === userId,
    );

    expect(started).toBeDefined();
  });

  test("runBudgetOnboardingAgentSubmit submits onboarding via tool loop and persists records", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [
          {
            type: "tool-call",
            toolCallId: "call-2",
            toolName: "submitBudgetOnboardingBasics",
            input: "{}",
          },
        ],
        finishReason: { unified: "tool-calls", raw: "tool-calls" },
        usage: usage(),
        warnings: [],
      }),
    });

    const userId = "ps_agent_submit_1";
    const started = await startBudgetOnboarding({ userId });

    const result = await runBudgetOnboardingAgentSubmit({
      model,
      prompt: "Submit budget onboarding basics.",
      userId,
      submit: {
        sessionId: started.sessionId,
        name: "Budget 2026",
        cadence: "monthly",
        day: 15,
        timezone: "America/New_York",
      },
    });

    expect(result.status).toBe("completed");
    expect(result.text).toContain("Budget created");

    const budget = await getDb()
      .collection<{ _id: string; userId: string; name: string }>("budgets")
      .findOne({ userId, name: "Budget 2026" });
    expect(budget).toBeDefined();

    const payCycle = await getDb()
      .collection<{ _id: string; budgetId: string; userId: string }>("payCycles")
      .findOne({ userId, budgetId: budget!._id });
    expect(payCycle).toBeDefined();

    const events = (await getEventsSince(0)).filter(
      (event) => (event.payload as { userId?: string }).userId === userId,
    );
    expect(events.some((event) => event.type === "budgets.created")).toBe(true);
    expect(events.some((event) => event.type === "onboarding.completed")).toBe(
      true,
    );
  });

  test("runBudgetOnboardingAgentSubmit returns invalid result with form spec when submit fails validation", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [
          {
            type: "tool-call",
            toolCallId: "call-3",
            toolName: "submitBudgetOnboardingBasics",
            input: "{}",
          },
        ],
        finishReason: { unified: "tool-calls", raw: "tool-calls" },
        usage: usage(),
        warnings: [],
      }),
    });

    const userId = "ps_agent_submit_2";
    const started = await startBudgetOnboarding({ userId });

    const result = await runBudgetOnboardingAgentSubmit({
      model,
      prompt: "Submit budget onboarding basics.",
      userId,
      submit: {
        sessionId: started.sessionId,
        name: "Budget 2026",
        cadence: "monthly",
        day: 31,
        timezone: "America/New_York",
      },
    });

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.sessionId).toBe(started.sessionId);
      expect(result.spec.root).toBe("budget-onboarding-form");
      expect(result.text).toContain("Monthly pay cycle day must be between 1 and 28.");
    }
  });
});
