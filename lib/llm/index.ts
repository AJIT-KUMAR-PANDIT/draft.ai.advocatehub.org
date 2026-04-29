/**
 * LLM Registry — single entry point for all providers.
 *
 * Usage (server-side only):
 *   import { getLLMProvider } from "@/lib/llm";
 *   const provider = getLLMProvider();
 *   const stream   = await provider.stream(messages);
 *
 * To add a new provider:
 *   1. Create  lib/llm/gemini.ts  (implements LLMProvider)
 *   2. Import it here
 *   3. Add a case in the switch below
 *   4. Set  LLM=gemini  in .env.local
 */

import { NvidiaProvider } from "./nvidia";
import { DemoProvider   } from "./demo";
import type { LLMProvider, ChatMessage } from "./types";

// Re-export types so callers only need one import
export type { LLMProvider, ChatMessage };

/** Map of env-var values → provider factories */
const PROVIDERS: Record<string, () => LLMProvider> = {
  nvidia: () => new NvidiaProvider(),
  // gemini:  () => new GeminiProvider(),    ← add when ready
  // openai:  () => new OpenAIProvider(),    ← add when ready
  // claude:  () => new ClaudeProvider(),    ← add when ready
};

/**
 * Returns the active LLM provider based on `process.env.LLM`.
 * Falls back to DemoProvider when the env var is unset or unrecognised.
 */
export function getLLMProvider(): LLMProvider {
  const key = (process.env.LLM ?? "").toLowerCase().trim();

  const factory = PROVIDERS[key];
  if (!factory) {
    if (key && key !== "") {
      console.warn(`[llm] Unknown provider "${key}" — falling back to demo.`);
    }
    return new DemoProvider();
  }

  try {
    return factory();
  } catch (err: any) {
    console.error(`[llm] Failed to initialise provider "${key}":`, err?.message);
    return new DemoProvider();
  }
}

/** Convenience: list all registered provider names */
export function listProviders(): string[] {
  return Object.keys(PROVIDERS);
}
