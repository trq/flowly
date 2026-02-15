import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import type {
  BudgetOnboardingCadence,
  BudgetOnboardingSubmitData,
} from "@flowly/contracts/onboarding";
import {
  runBudgetOnboardingAgentStart,
  type BudgetOnboardingAgentStartResult,
} from "../../agents/budget-onboarding-agent";
import { findActiveSessionByUserId } from "../../onboarding/store";
import { submitInitialBudgetOnboarding } from "../../onboarding/service";
import { buildBudgetOnboardingFormSpec } from "../../onboarding/ui-spec";

type ParsedSlash = {
  command: string;
  args: string;
} | null;

type RouteBudgetOnboardingInput = {
  headers: Record<string, string>;
  messages: UIMessage[];
  lastMessageText: string;
  parsedSlash: ParsedSlash;
  userId: string | null;
  runStartWithAgent?: (input: {
    userId: string;
    prompt: string;
  }) => Promise<BudgetOnboardingAgentStartResult>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCadence(value: unknown): value is BudgetOnboardingCadence {
  return (
    value === "weekly" ||
    value === "fortnightly" ||
    value === "monthly"
  );
}

function readSubmitAction(
  message: UIMessage | undefined,
): BudgetOnboardingSubmitData | null {
  if (!message || message.role !== "user") {
    return null;
  }

  const part = message.parts.find(
    (item) => item.type === "data-budget-onboarding-submit",
  );
  if (!part || !("data" in part)) return null;

  const data = part.data;
  if (!isRecord(data)) return null;

  if (
    typeof data.sessionId !== "string" ||
    typeof data.name !== "string" ||
    !isCadence(data.cadence) ||
    typeof data.day !== "number" ||
    !Number.isFinite(data.day) ||
    typeof data.timezone !== "string"
  ) {
    return null;
  }

  return {
    sessionId: data.sessionId,
    name: data.name,
    cadence: data.cadence,
    day: data.day,
    timezone: data.timezone,
  };
}

export function isBudgetOnboardingStartIntent(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  const hasBudget = /\bbudget\b/.test(normalized);
  const hasStartVerb =
    /\b(new|create|start|setup|set up|make|begin)\b/.test(normalized);

  return hasBudget && hasStartVerb;
}

function streamAssistantMessage(
  headers: Record<string, string>,
  text: string,
  dataPart?: {
    sessionId: string;
    spec: ReturnType<typeof buildBudgetOnboardingFormSpec>;
  },
): Response {
  return createUIMessageStreamResponse({
    headers,
    stream: createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: "text-start", id: "onboarding" });
        writer.write({
          type: "text-delta",
          id: "onboarding",
          delta: text,
        });
        writer.write({ type: "text-end", id: "onboarding" });

        if (dataPart) {
          writer.write({
            type: "data-budget-onboarding-form",
            id: dataPart.sessionId,
            data: {
              sessionId: dataPart.sessionId,
              spec: dataPart.spec,
            },
          });
        }
      },
    }),
  });
}

function isNewBudgetSlash(parsedSlash: ParsedSlash): boolean {
  return (
    parsedSlash?.command === "new" &&
    parsedSlash.args.trim().toLowerCase() === "budget"
  );
}

export async function routeBudgetOnboardingIfApplicable(
  input: RouteBudgetOnboardingInput,
): Promise<Response | null> {
  const submitAction = readSubmitAction(input.messages[input.messages.length - 1]);
  if (submitAction) {
    if (!input.userId) {
      return streamAssistantMessage(
        input.headers,
        "Unable to submit budget onboarding: missing user context.",
      );
    }

    try {
      await submitInitialBudgetOnboarding({
        userId: input.userId,
        sessionId: submitAction.sessionId,
        name: submitAction.name,
        cadence: submitAction.cadence,
        day: submitAction.day,
        timezone: submitAction.timezone,
      });

      return streamAssistantMessage(
        input.headers,
        "Budget created. Next we can set up pools and categories.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit budget onboarding.";
      const spec = buildBudgetOnboardingFormSpec({
        sessionId: submitAction.sessionId,
        draft: {
          name: submitAction.name,
          cadence: submitAction.cadence,
          day: submitAction.day,
          timezone: submitAction.timezone,
        },
      });

      return streamAssistantMessage(
        input.headers,
        `Couldn't create the budget yet: ${message}`,
        {
          sessionId: submitAction.sessionId,
          spec,
        },
      );
    }
  }

  const slashStart = isNewBudgetSlash(input.parsedSlash);
  if (input.parsedSlash && !slashStart) {
    return null;
  }

  const naturalStart = isBudgetOnboardingStartIntent(input.lastMessageText);
  const hasActiveSession =
    !slashStart &&
    !naturalStart &&
    !!input.userId &&
    (await findActiveSessionByUserId(input.userId)) !== null;

  if (!slashStart && !naturalStart && !hasActiveSession) {
    return null;
  }

  if (!input.userId) {
    return streamAssistantMessage(
      input.headers,
      "Unable to start budget onboarding: missing user context.",
    );
  }

  const prompt = slashStart
    ? "Start budget onboarding."
    : input.lastMessageText.trim() || "Continue budget onboarding.";

  try {
    const started = await (input.runStartWithAgent ??
      runBudgetOnboardingAgentStart)({
      userId: input.userId,
      prompt,
    });

    return streamAssistantMessage(input.headers, started.text, {
      sessionId: started.sessionId,
      spec: started.spec,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start budget onboarding.";
    return streamAssistantMessage(
      input.headers,
      `Couldn't start budget onboarding yet: ${message}`,
    );
  }
}
