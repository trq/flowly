import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, disconnectDb, getDb } from "../../src/db/client";
import { ensureIndexes as ensureEventIndexes } from "../../src/events/store";
import {
  startBudgetOnboarding,
  submitBudgetOnboardingBasics,
  cancelBudgetOnboarding,
} from "../../src/onboarding/service";
import {
  ensureIndexes as ensureOnboardingIndexes,
  type BudgetOnboardingSessionDoc,
} from "../../src/onboarding/store";
import {
  ensureIndexes as ensureBudgetIndexes,
  type BudgetDoc,
  type PayCycleDoc,
} from "../../src/budgets/store";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  await ensureEventIndexes();
  await ensureOnboardingIndexes();
  await ensureBudgetIndexes();
});

afterAll(async () => {
  await disconnectDb();
  await mongod.stop();
});

describe("budget onboarding service", () => {
  test("startBudgetOnboarding creates and reuses one active session per user", async () => {
    const userId = "ps_tdd_user_1";

    const first = await startBudgetOnboarding({ userId });
    const second = await startBudgetOnboarding({ userId });

    expect(first.sessionId).toBeString();
    expect(second.sessionId).toBe(first.sessionId);
    expect(first.currentStep).toBe("budget");
    expect(first.status).toBe("active");
  });

  test("submitBudgetOnboardingBasics validates day rules", async () => {
    const userId = "ps_tdd_user_2";
    const started = await startBudgetOnboarding({ userId });

    await expect(
      submitBudgetOnboardingBasics({
        userId,
        sessionId: started.sessionId,
        name: "Budget 2026",
        cadence: "monthly",
        day: 29,
        timezone: "America/New_York",
      }),
    ).rejects.toThrow();
  });

  test("submitBudgetOnboardingBasics creates budget + pay cycle and completes session", async () => {
    const userId = "ps_tdd_user_3";
    const started = await startBudgetOnboarding({ userId });

    const result = await submitBudgetOnboardingBasics({
      userId,
      sessionId: started.sessionId,
      name: "Budget 2026",
      cadence: "monthly",
      day: 15,
      timezone: "America/New_York",
    });

    expect(result.budgetId).toBeString();
    expect(result.payCycleId).toBeString();
    expect(result.status).toBe("completed");

    const budget = await getDb()
      .collection<BudgetDoc>("budgets")
      .findOne({ _id: result.budgetId });
    expect(budget).toBeDefined();
    expect(budget!.userId).toBe(userId);
    expect(budget!.name).toBe("Budget 2026");

    const payCycle = await getDb()
      .collection<PayCycleDoc>("payCycles")
      .findOne({ _id: result.payCycleId });
    expect(payCycle).toBeDefined();
    expect(payCycle!.budgetId).toBe(result.budgetId);
    expect(payCycle!.cadence).toBe("monthly");
    expect(payCycle!.day).toBe(15);
    expect(payCycle!.timezone).toBe("America/New_York");

    const session = await getDb()
      .collection<BudgetOnboardingSessionDoc>("onboardingSessions")
      .findOne({ _id: started.sessionId });
    expect(session).toBeDefined();
    expect(session!.status).toBe("completed");
  });

  test("cancelBudgetOnboarding marks session as cancelled", async () => {
    const userId = "ps_tdd_user_4";
    const started = await startBudgetOnboarding({ userId });

    const cancelled = await cancelBudgetOnboarding({
      userId,
      sessionId: started.sessionId,
    });

    expect(cancelled.status).toBe("cancelled");
  });
});
