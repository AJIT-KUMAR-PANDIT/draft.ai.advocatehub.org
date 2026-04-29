/**
 * Grammar check via LanguageTool public API — completely free, no API key.
 * https://api.languagetool.org/v2/check
 */

import { NextRequest } from "next/server";

const LT_URL = "https://api.languagetool.org/v2/check";

interface LTMatch {
  message: string;
  shortMessage?: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  context: { text: string; offset: number; length: number };
  rule: { id: string; description: string; issueType: string };
}

type Severity = "error" | "warning" | "info";
type IssueType = "grammar" | "spelling" | "style" | "typographical" | "punctuation";

function mapIssueType(issueType: string): { type: IssueType; severity: Severity } {
  switch (issueType) {
    case "misspelling":   return { type: "spelling",      severity: "error"   };
    case "grammar":       return { type: "grammar",       severity: "error"   };
    case "style":         return { type: "style",         severity: "info"    };
    case "typographical": return { type: "typographical", severity: "warning" };
    case "punctuation":   return { type: "punctuation",   severity: "warning" };
    default:              return { type: "grammar",       severity: "warning" };
  }
}

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text: string };
  if (!text?.trim()) return Response.json([]);

  const body = new URLSearchParams({
    text:     text.slice(0, 20_000), // LT free tier limit
    language: "en-IN",               // Indian English
    enabledOnly: "false",
  });

  let data: { matches: LTMatch[] };
  try {
    const res = await fetch(LT_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body:    body.toString(),
      signal:  req.signal,
    });
    if (!res.ok) {
      console.error("LanguageTool error", res.status);
      return Response.json([]);
    }
    data = await res.json();
  } catch (e: any) {
    if (e?.name === "AbortError") return new Response(null, { status: 499 });
    console.error("LanguageTool fetch failed", e);
    return Response.json([]);
  }

  const issues = (data.matches ?? []).slice(0, 40).map((m, i) => {
    const { type, severity } = mapIssueType(m.rule.issueType);
    // Extract the original problematic text from context
    const original = m.context.text.slice(m.context.offset, m.context.offset + m.length).slice(0, 60);
    const suggestion = m.replacements[0]?.value ?? "";

    return {
      id:         `lt-${i}`,
      type,
      severity,
      original:   original || "(see reason)",
      suggestion: suggestion || m.rule.description,
      reason:     (m.shortMessage || m.message).slice(0, 100),
      offset:     m.offset,
    };
  });

  return Response.json(issues);
}
