/**
 * Demo / fallback provider — no API key required.
 * Streams a simulated word-by-word reply via SSE so the client
 * receives the exact same format as a real provider.
 */

import type { LLMProvider, ChatMessage } from "./types";

export class DemoProvider implements LLMProvider {
  readonly name = "Demo (no LLM configured)";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async stream(messages: ChatMessage[], signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
    const lastUser =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const reply =
      `**advoAI Demo Mode**\n\n` +
      `You asked: *"${lastUser.slice(0, 120)}${lastUser.length > 120 ? "…" : ""}"*\n\n` +
      `To enable a real LLM, add the following to **.env.local** and restart:\n\n` +
      `\`\`\`\nLLM=nvidia\nNVIDIA_API_KEY=nvapi-…\n\`\`\`\n\n` +
      `Supported providers: **nvidia** · *(gemini, openai — coming soon)*`;

    const words   = reply.split(" ");
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const word of words) {
          const chunk = { choices: [{ delta: { content: `${word} ` } }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          await new Promise((r) => setTimeout(r, 20));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
  }
}
