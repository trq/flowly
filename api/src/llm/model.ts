import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { env, type LlmProvider } from "../config/env";

type ChatModelResolver = (modelId: string) => LanguageModel;

const chatModelResolvers: Record<LlmProvider, ChatModelResolver> = {
  openrouter: (modelId: string) => {
    const provider = createOpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: env.OPENROUTER_BASE_URL,
      compatibility: "strict",
    });

    return provider.chat(modelId);
  },
};

export function getChatModel(): LanguageModel {
  return chatModelResolvers[env.LLM_PROVIDER](env.LLM_MODEL);
}
