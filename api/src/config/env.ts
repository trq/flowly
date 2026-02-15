const OPENROUTER_PROVIDER = "openrouter" as const;

export type LlmProvider = typeof OPENROUTER_PROVIDER;

type Env = {
  PORT: number;
  LLM_PROVIDER: LlmProvider;
  LLM_MODEL: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_BASE_URL?: string;
  CORS_ORIGIN: string;
  MONGO_URI: string;
  SHOO_BASE_URL: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getPort(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }

  return parsed;
}

function getProvider(raw: string | undefined): LlmProvider {
  if (!raw || raw === OPENROUTER_PROVIDER) {
    return OPENROUTER_PROVIDER;
  }

  throw new Error(
    `Unsupported LLM_PROVIDER: ${raw}. Supported values: ${OPENROUTER_PROVIDER}`,
  );
}

export const env: Env = {
  PORT: getPort(process.env.PORT, 3001),
  LLM_PROVIDER: getProvider(process.env.LLM_PROVIDER),
  LLM_MODEL: process.env.LLM_MODEL ?? "anthropic/claude-sonnet-4.5",
  OPENROUTER_API_KEY: getRequiredEnv("OPENROUTER_API_KEY"),
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  MONGO_URI:
    process.env.MONGO_URI ?? "mongodb://localhost:27017/flowly",
  SHOO_BASE_URL: process.env.SHOO_BASE_URL ?? "https://shoo.dev",
};
