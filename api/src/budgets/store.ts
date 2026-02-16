import { getDb } from "../db/client";

export type PayCycleCadence = "weekly" | "fortnightly" | "monthly";

export type BudgetDoc = {
  _id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type PayCycleDoc = {
  _id: string;
  userId: string;
  budgetId: string;
  cadence: PayCycleCadence;
  day: number;
  timezone: string;
  createdAt: string;
};

export async function insertBudget(doc: BudgetDoc): Promise<void> {
  await getDb().collection<BudgetDoc>("budgets").insertOne(doc);
}

export async function insertPayCycle(doc: PayCycleDoc): Promise<void> {
  await getDb().collection<PayCycleDoc>("payCycles").insertOne(doc);
}

export async function ensureIndexes(): Promise<void> {
  const budgets = getDb().collection<BudgetDoc>("budgets");
  await budgets.createIndex({ userId: 1, createdAt: -1 });

  const payCycles = getDb().collection<PayCycleDoc>("payCycles");
  await payCycles.createIndex({ budgetId: 1, createdAt: -1 });
  await payCycles.createIndex({ userId: 1, budgetId: 1 });
}
