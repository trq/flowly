import {
  ToolLoopAgent,
  hasToolCall,
  jsonSchema,
  stepCountIs,
  tool,
  type LanguageModel,
} from "ai";
import { getChatModel } from "../llm/model";
import { startBudgetOnboarding } from "../onboarding/service";
import { buildBudgetOnboardingFormSpec } from "../onboarding/ui-spec";

const START_TOOL_NAME = "startBudgetOnboarding";

type BudgetOnboardingAgentSpec = ReturnType<
  typeof buildBudgetOnboardingFormSpec
>;

export type BudgetOnboardingAgentStartResult = {
  sessionId: string;
  spec: BudgetOnboardingAgentSpec;
  text: string;
};

type RunBudgetOnboardingAgentStartInput = {
  userId: string;
  prompt: string;
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
