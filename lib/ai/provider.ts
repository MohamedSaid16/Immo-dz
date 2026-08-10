import { OpenAiPropertyMarketingProvider } from "./providers/openai";
import type { PropertyMarketingProvider } from "./contracts";

export type AiConfiguration = {
  enabled: boolean;
  provider: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  dailyLimit: number;
};

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function getAiConfiguration(): AiConfiguration {
  return {
    enabled: process.env.AI_ENABLED === "true",
    provider: process.env.AI_PROVIDER?.trim().toLowerCase() ?? "",
    apiKey: process.env.AI_API_KEY?.trim() ?? "",
    model: process.env.AI_MODEL?.trim() || "gpt-5.4-mini-2026-03-17",
    timeoutMs: boundedInteger(process.env.AI_REQUEST_TIMEOUT_MS, 15_000, 1_000, 30_000),
    dailyLimit: boundedInteger(process.env.AI_DAILY_GENERATION_LIMIT, 20, 1, 100),
  };
}

export function getPropertyMarketingProvider(
  configuration: AiConfiguration,
): PropertyMarketingProvider | null {
  if (!configuration.enabled || !configuration.apiKey) return null;

  if (configuration.provider === "openai") {
    return new OpenAiPropertyMarketingProvider({
      apiKey: configuration.apiKey,
      model: configuration.model,
      timeoutMs: configuration.timeoutMs,
    });
  }

  return null;
}
