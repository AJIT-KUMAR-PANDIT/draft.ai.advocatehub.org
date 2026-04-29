import { NextRequest } from "next/server";
import { getLLMProvider } from "@/lib/llm";

const SYSTEM_PROMPT = `You are an expert legal document grammar and style checker.
Analyse the provided text and return a JSON array of issues.
Each issue must have exactly these fields:
{
  "id": string (unique, e.g. "g1"),
  "type": "grammar" | "spelling" | "style" | "legal-style",
  "severity": "error" | "warning" | "info",
  "original": "the exact problematic text snippet (max 60 chars)",
  "suggestion": "the corrected version",
  "reason": "brief plain-English explanation (max 80 chars)"
}
Return ONLY valid JSON array. No markdown, no explanation outside the array.
If no issues are found return [].`;

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text: string };
  if (!text?.trim()) {
    return Response.json([]);
  }

  const provider = getLLMProvider();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user"   as const, content: `Check this document:\n\n${text.slice(0, 6000)}` },
  ];

  // Collect full response (grammar check doesn't need streaming)
  let full = "";
  const stream = await provider.stream(messages, req.signal);
  const reader  = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") break;
      try {
        const token = JSON.parse(payload)?.choices?.[0]?.delta?.content ?? "";
        full += token;
      } catch {}
    }
  }

  // Extract JSON from response (LLM may wrap in ```json ... ```)
  const match = full.match(/\[[\s\S]*\]/);
  try {
    const issues = JSON.parse(match?.[0] ?? "[]");
    return Response.json(issues);
  } catch {
    return Response.json([]);
  }
}
