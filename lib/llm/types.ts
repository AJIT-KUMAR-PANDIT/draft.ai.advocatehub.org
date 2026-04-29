/**
 * Shared types for all LLM providers.
 * Every provider implements LLMProvider and returns a ReadableStream (SSE).
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMProvider {
  /** Human-readable name shown in logs / UI */
  readonly name: string;
  /**
   * Stream a chat completion.
   * Returns a ReadableStream that emits SSE lines:
   *   `data: {"choices":[{"delta":{"content":"…"}}]}\n\n`
   *   `data: [DONE]\n\n`
   */
  stream(messages: ChatMessage[], signal?: AbortSignal): Promise<ReadableStream<Uint8Array>>;
}
