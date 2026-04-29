/**
 * NVIDIA NIM provider — Mistral Medium 3.5 (128k context)
 *
 * Required env vars:
 *   LLM=nvidia
 *   NVIDIA_API_KEY=nvapi-…
 *
 * Docs: https://integrate.api.nvidia.com
 */

import type { LLMProvider, ChatMessage } from "./types";

const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL   = "mistralai/mistral-medium-3.5-128b";

export class NvidiaProvider implements LLMProvider {
  readonly name = "NVIDIA NIM · Mistral Medium 3.5";

  private readonly apiKey: string;
  private readonly model: string;

  constructor(options?: { model?: string }) {
    const key = process.env.NVIDIA_API_KEY;
    if (!key) throw new Error("NVIDIA_API_KEY is not set in environment.");
    this.apiKey = key;
    this.model  = options?.model ?? DEFAULT_MODEL;
  }

  async stream(messages: ChatMessage[], signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(NVIDIA_ENDPOINT, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: this.model,
        reasoning_effort: "high",
        messages,
        max_tokens: 16384,
        temperature: 0.70,
        top_p: 1.00,
        stream: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`NVIDIA API ${response.status}: ${text}`);
    }

    if (!response.body) throw new Error("NVIDIA API returned no stream body.");
    return response.body;
  }
}
