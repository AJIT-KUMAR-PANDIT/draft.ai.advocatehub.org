import { NextRequest } from "next/server";
import { getLLMProvider } from "@/lib/llm";
import type { ChatMessage } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: ChatMessage[] };

  const provider = getLLMProvider();

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await provider.stream(messages, req.signal);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return new Response(null, { status: 499 }); // client closed
    }
    return new Response(
      JSON.stringify({ error: err?.message ?? "Provider error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      "X-LLM-Provider": provider.name,
    },
  });
}
