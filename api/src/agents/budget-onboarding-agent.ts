import {
  ToolLoopAgent,
  hasToolCall,
  jsonSchema,
  stepCountIs,
  tool,
  type LanguageModel,
} from "ai";
import type { BudgetOnboardingSubmitData } from "@flowly/contracts/onboarding";
import { getChatModel } from "../llm/model";
import {
  startBudgetOnboarding,
  submitInitialBudgetOnboarding,
} from "../onboarding/service";
import { buildBudgetOnboardingFormSpec } from "../onboarding/ui-spec";

const START_TOOL_NAME = "startBudgetOnboarding";
const SUBMIT_TOOL_NAME = "submitBudgetOnboardingBasics";

type BudgetOnboardingAgentSpec = ReturnType<
  typeof buildBudgetOnboardingFormSpec
>;

export type BudgetOnboardingAgentStartResult = {
  sessionId: string;
  spec: BudgetOnboardingAgentSpec;
  text: string;
};

export type BudgetOnboardingAgentSubmitResult =
  | {
      status: "completed";
      text: string;
    }
  | {
      status: "invalid";
      sessionId: string;
      spec: BudgetOnboardingAgentSpec;
      text: string;
    };

type RunBudgetOnboardingAgentStartInput = {
  userId: string;
  prompt: string;
  model?: LanguageModel;
};

type RunBudgetOnboardingAgentSubmitInput = {
  userId: string;
  prompt: string;
  submit: BudgetOnboardingSubmitData;
  model?: LanguageModel;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBudgetOnboardingAgentStartResult(
  value: unknown,
): value is BudgetOnboardingAgentStartResult {
  if (!isRecord(value)) return false;
  if (typeof value.sessionId !== "string") return false;
  if (typeof value.text !== "string") return false;
  if (!isRecord(value.spec)) return false;
  if (typeof value.spec.root !== "string") return false;
  if (!isRecord(value.spec.elements)) return false;
  return true;
}

function isBudgetOnboardingAgentSubmitResult(
  value: unknown,
): value is BudgetOnboardingAgentSubmitResult {
  if (!isRecord(value)) return false;
  if (typeof value.text !== "string") return false;
  if (value.status === "completed") return true;
  if (value.status !== "invalid") return false;
  if (typeof value.sessionId !== "string") return false;
  if (!isRecord(value.spec)) return false;
  if (typeof value.spec.root !== "string") return false;
  if (!isRecord(value.spec.elements)) return false;
  return true;
}

function createBudgetOnboardingStartAgent(input: {
  model: LanguageModel;
  userId: string;
}) {
  const startTool = tool({
    description:
      "Start or resume budget onboarding and return a json-render onboarding form spec.",
    inputSchema: jsonSchema({
      type: "object",
      additionalProperties: false,
      properties: {},
    }),
    execute: async () => {
      const started = await startBudgetOnboarding({
        userId: input.userId,
      });

      return {
        sessionId: started.sessionId,
        spec: buildBudgetOnboardingFormSpec({
          sessionId: started.sessionId,
          draft: started.draft,
        }),
        text: "Starting budget onboarding. Let's set up your budget.",
      } satisfies BudgetOnboardingAgentStartResult;
    },
  });

  return new ToolLoopAgent({
    model: input.model,
    instructions:
      "You are BudgetOnboardingAgent. Call startBudgetOnboarding to open or resume onboarding for this user.",
    tools: {
      [START_TOOL_NAME]: startTool,
    },
    toolChoice: {
      type: "tool",
      toolName: START_TOOL_NAME,
    },
    stopWhen: [hasToolCall(START_TOOL_NAME), stepCountIs(2)],
  });
}

function createBudgetOnboardingSubmitAgent(input: {
  model: LanguageModel;
  userId: string;
  submit: BudgetOnboardingSubmitData;
}) {
  const submitTool = tool({
    description:
      "Submit budget onboarding basics and either complete onboarding or return a corrected form spec.",
    inputSchema: jsonSchema({
      type: "object",
      additionalProperties: false,
      properties: {},
    }),
    execute: async () => {
      try {
        await submitInitialBudgetOnboarding({
          userId: input.userId,
          sessionId: input.submit.sessionId,
          name: input.submit.name,
          cadence: input.submit.cadence,
          day: input.submit.day,
          timezone: input.submit.timezone,
        });

        return {
          status: "completed",
          text: "Budget created. Next we can set up pools and categories.",
        } satisfies BudgetOnboardingAgentSubmitResult;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to submit budget onboarding.";

        return {
          status: "invalid",
          sessionId: input.submit.sessionId,
          spec: buildBudgetOnboardingFormSpec({
            sessionId: input.submit.sessionId,
            draft: {
              name: input.submit.name,
              cadence: input.submit.cadence,
              day: input.submit.day,
              timezone: input.submit.timezone,
            },
          }),
          text: `Couldn't create the budget yet: ${message}`,
        } satisfies BudgetOnboardingAgentSubmitResult;
      }
    },
  });

  return new ToolLoopAgent({
    model: input.model,
    instructions:
      "You are BudgetOnboardingAgent. Call submitBudgetOnboardingBasics to submit onboarding basics for this user.",
    tools: {
      [SUBMIT_TOOL_NAME]: submitTool,
    },
    toolChoice: {
      type: "tool",
      toolName: SUBMIT_TOOL_NAME,
    },
    stopWhen: [hasToolCall(SUBMIT_TOOL_NAME), stepCountIs(2)],
  });
}

export async function runBudgetOnboardingAgentStart(
  input: RunBudgetOnboardingAgentStartInput,
): Promise<BudgetOnboardingAgentStartResult> {
  const agent = createBudgetOnboardingStartAgent({
    model: input.model ?? getChatModel(),
    userId: input.userId,
  });

  const result = await agent.generate({
    prompt: input.prompt,
  });

  const startToolResult = result.steps
    .flatMap((step) => step.toolResults)
    .find(
      (toolResult) =>
        toolResult.type === "tool-result" &&
        toolResult.toolName === START_TOOL_NAME,
    );

  if (
    !startToolResult ||
    !isBudgetOnboardingAgentStartResult(startToolResult.output)
  ) {
    throw new Error(
      "Budget onboarding agent did not return a valid onboarding form spec.",
    );
  }

  return startToolResult.output;
}

export async function runBudgetOnboardingAgentSubmit(
  input: RunBudgetOnboardingAgentSubmitInput,
): Promise<BudgetOnboardingAgentSubmitResult> {
  const agent = createBudgetOnboardingSubmitAgent({
    model: input.model ?? getChatModel(),
    userId: input.userId,
    submit: input.submit,
  });

  const result = await agent.generate({
    prompt: input.prompt,
  });

  const submitToolResult = result.steps
    .flatMap((step) => step.toolResults)
    .find(
      (toolResult) =>
        toolResult.type === "tool-result" &&
        toolResult.toolName === SUBMIT_TOOL_NAME,
    );

  if (
    !submitToolResult ||
    !isBudgetOnboardingAgentSubmitResult(submitToolResult.output)
  ) {
    throw new Error(
      "Budget onboarding agent did not return a valid submit result.",
    );
  }

  return submitToolResult.output;
}
