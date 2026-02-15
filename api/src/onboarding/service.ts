import { publish } from "../events/bus";
import {
  insertBudget,
  insertPayCycle,
  type PayCycleCadence,
} from "../budgets/store";
import {
  findActiveSessionByUserId,
  findSessionById,
  insertSession,
  updateSession,
  type BudgetOnboardingSessionDoc,
} from "./store";
import {
  validateBudgetName,
  validatePayCycleDay,
  validateTimezone,
} from "./validation";
import { buildBudgetOnboardingFormSpec } from "./ui-spec";

type StartBudgetOnboardingInput = {
  userId: string;
};

type SubmitBudgetOnboardingBasicsInput = {
  userId: string;
  sessionId: string;
  name: string;
  cadence: PayCycleCadence;
  day: number;
  timezone: string;
};

type CancelBudgetOnboardingInput = {
  userId: string;
  sessionId: string;
};

type StartBudgetOnboardingResult = {
  sessionId: string;
  status: BudgetOnboardingSessionDoc["status"];
  currentStep: BudgetOnboardingSessionDoc["currentStep"];
  draft: BudgetOnboardingSessionDoc["draft"];
};

type SubmitBudgetOnboardingBasicsResult = {
  sessionId: string;
  budgetId: string;
  payCycleId: string;
  status: "completed";
};

type CancelBudgetOnboardingResult = {
  sessionId: string;
  status: "cancelled";
};

function assertUserId(userId: string): void {
  if (!userId.trim()) {
    throw new Error("User id is required.");
  }
}

export async function startBudgetOnboarding(
  input: StartBudgetOnboardingInput,
): Promise<StartBudgetOnboardingResult> {
  assertUserId(input.userId);

  const existing = await findActiveSessionByUserId(input.userId);
  if (existing) {
    return {
      sessionId: existing._id,
      status: existing.status,
      currentStep: existing.currentStep,
      draft: existing.draft,
    };
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString();

  const session: BudgetOnboardingSessionDoc = {
    _id: crypto.randomUUID(),
    userId: input.userId,
    status: "active",
    currentStep: "budget",
    draft: {},
    createdAt,
    updatedAt: createdAt,
    expiresAt,
  };

  await insertSession(session);

  await publish({
    id: crypto.randomUUID(),
    channel: "onboarding",
    type: "onboarding.started",
    payload: {
      sessionId: session._id,
      userId: session.userId,
      currentStep: session.currentStep,
      status: session.status,
      draft: session.draft,
      uiSpec: buildBudgetOnboardingFormSpec({
        sessionId: session._id,
        draft: session.draft,
      }),
    },
    sentAt: new Date().toISOString(),
  });

  return {
    sessionId: session._id,
    status: session.status,
    currentStep: session.currentStep,
    draft: session.draft,
  };
}

export async function submitBudgetOnboardingBasics(
  input: SubmitBudgetOnboardingBasicsInput,
): Promise<SubmitBudgetOnboardingBasicsResult> {
  assertUserId(input.userId);
  validateBudgetName(input.name);
  validateTimezone(input.timezone);
  validatePayCycleDay(input.cadence, input.day);

  const session = await findSessionById(input.sessionId);
  if (!session || session.userId !== input.userId) {
    throw new Error("Onboarding session not found.");
  }
  if (session.status !== "active") {
    throw new Error("Onboarding session is not active.");
  }

  const createdAt = new Date().toISOString();
  const budgetId = crypto.randomUUID();
  const payCycleId = crypto.randomUUID();

  await insertBudget({
    _id: budgetId,
    userId: input.userId,
    name: input.name.trim(),
    createdAt,
  });

  await insertPayCycle({
    _id: payCycleId,
    userId: input.userId,
    budgetId,
    cadence: input.cadence,
    day: input.day,
    timezone: input.timezone.trim(),
    createdAt,
  });

  const updated = await updateSession(input.sessionId, input.userId, {
    status: "completed",
    currentStep: "pools",
    draft: {
      name: input.name.trim(),
      cadence: input.cadence,
      day: input.day,
      timezone: input.timezone.trim(),
    },
  });

  if (!updated) {
    throw new Error("Failed to update onboarding session.");
  }

  await publish({
    id: crypto.randomUUID(),
    channel: "budgets",
    type: "budgets.created",
    payload: {
      budgetId,
      userId: input.userId,
      name: input.name.trim(),
      payCycle: {
        payCycleId,
        cadence: input.cadence,
        day: input.day,
        timezone: input.timezone.trim(),
      },
    },
    sentAt: new Date().toISOString(),
  });

  await publish({
    id: crypto.randomUUID(),
    channel: "onboarding",
    type: "onboarding.completed",
    payload: {
      sessionId: input.sessionId,
      userId: input.userId,
      currentStep: updated.currentStep,
      status: updated.status,
    },
    sentAt: new Date().toISOString(),
  });

  return {
    sessionId: input.sessionId,
    budgetId,
    payCycleId,
    status: "completed",
  };
}

export async function cancelBudgetOnboarding(
  input: CancelBudgetOnboardingInput,
): Promise<CancelBudgetOnboardingResult> {
  assertUserId(input.userId);

  const session = await findSessionById(input.sessionId);
  if (!session || session.userId !== input.userId) {
    throw new Error("Onboarding session not found.");
  }
  if (session.status !== "active") {
    throw new Error("Onboarding session is not active.");
  }

  const updated = await updateSession(input.sessionId, input.userId, {
    status: "cancelled",
  });

  if (!updated) {
    throw new Error("Failed to cancel onboarding session.");
  }

  await publish({
    id: crypto.randomUUID(),
    channel: "onboarding",
    type: "onboarding.cancelled",
    payload: {
      sessionId: input.sessionId,
      userId: input.userId,
      status: "cancelled",
    },
    sentAt: new Date().toISOString(),
  });

  return {
    sessionId: input.sessionId,
    status: "cancelled",
  };
}
