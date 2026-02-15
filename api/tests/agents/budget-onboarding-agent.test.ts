import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MockLanguageModelV3 } from "ai/test";
import { connectDb, disconnectDb } from "../../src/db/client";
import { getEventsSince } from "../../src/events/bus";
import { ensureIndexes as ensureEventIndexes } from "../../src/events/store";
import { ensureIndexes as ensureOnboardingIndexes } from "../../src/onboarding/store";
import { runBudgetOnboardingAgentStart } from "../../src/agents/budget-onboarding-agent";

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
});
