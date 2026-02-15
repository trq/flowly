import { getDb } from "../db/client";
import type { PayCycleCadence } from "../budgets/store";

export type OnboardingStep =
  | "budgetBasics"
  | "pools"
  | "categories"
  | "done";

export type OnboardingStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "expired";

export type BudgetOnboardingSessionDoc = {
  _id: string;
  userId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  draft: {
    name?: string;
    cadence?: PayCycleCadence;
    day?: number;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export async function findActiveSessionByUserId(
  userId: string,
): Promise<BudgetOnboardingSessionDoc | null> {
  return getDb()
    .collection<BudgetOnboardingSessionDoc>("onboardingSessions")
    .findOne({ userId, status: "active" });
}

export async function findSessionById(
  sessionId: string,
): Promise<BudgetOnboardingSessionDoc | null> {
  return getDb()
    .collection<BudgetOnboardingSessionDoc>("onboardingSessions")
    .findOne({ _id: sessionId });
}

export async function insertSession(
  session: BudgetOnboardingSessionDoc,
): Promise<void> {
  await getDb()
    .collection<BudgetOnboardingSessionDoc>("onboardingSessions")
    .insertOne(session);
}

export async function updateSession(
  sessionId: string,
  userId: string,
  update: Partial<
    Pick<BudgetOnboardingSessionDoc, "status" | "currentStep" | "draft">
  >,
): Promise<BudgetOnboardingSessionDoc | null> {
  const result = await getDb()
    .collection<BudgetOnboardingSessionDoc>("onboardingSessions")
    .findOneAndUpdate(
      { _id: sessionId, userId },
      {
        $set: {
          ...update,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );

  return result ?? null;
}

export async function ensureIndexes(): Promise<void> {
  const sessions = getDb().collection<BudgetOnboardingSessionDoc>(
    "onboardingSessions",
  );

  await sessions.createIndex({ userId: 1, updatedAt: -1 });
  await sessions.createIndex(
    { userId: 1, status: 1 },
    {
      unique: true,
      partialFilterExpression: { status: "active" },
      name: "one_active_onboarding_session_per_user",
    },
  );
}
