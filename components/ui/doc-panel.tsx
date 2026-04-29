"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import "@superdoc-dev/react/style.css";
import {
  FileText, Sparkles, CheckCircle2, AlertTriangle,
  Info, RefreshCw, Download, Wand2, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────
export interface GrammarIssue {
  id: string;
  type: "grammar" | "spelling" | "style" | "legal-style";
  severity: "error" | "warning" | "info";
  original: string;
  suggestion: string;
  reason: string;
}

export interface DocPanelProps {
  /** The .docx File to open in SuperDoc */
  docFile: File | null;
  /** Plain-text content (for grammar checking) */
  docText?: string;
  /** AI-generated suggestion to apply (from chat) */
  pendingSuggestion?: { id: string; text: string; section: string } | null;
  onSuggestionApplied?: () => void;
  /** Regenerate doc callback (called when user applies AI edit) */
  onRegenerate?: (instruction: string) => void;
}

// ── SuperDoc (client-only) ─────────────────────────────────────
const SuperDocEditor = dynamic(
  () => import("@superdoc-dev/react").then((m) => m.SuperDocEditor),
  { ssr: false, loading: () => <LoadingEditor /> }
);

function LoadingEditor() {
  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="h-8 w-8 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
        <p className="text-xs">Loading editor…</p>
      </div>
    </div>
  );
}

// ── Severity config ────────────────────────────────────────────
const SEVERITY = {
  error:   { icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700"   },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700" },
  info:    { icon: Info,          color: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700"  },
};

const TYPE_BADGE: Record<string, string> = {
  grammar:     "bg-red-100 text-red-700",
  spelling:    "bg-orange-100 text-orange-700",
  style:       "bg-blue-100 text-blue-700",
  "legal-style": "bg-violet-100 text-violet-700",
};

// ── Grammar issue card ─────────────────────────────────────────
function IssueCard({ issue, onAccept }: { issue: GrammarIssue; onAccept: (i: GrammarIssue) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY[issue.severity];
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-xl border p-3 text-xs", cfg.bg, cfg.border)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", TYPE_BADGE[issue.type])}>
              {issue.type}
            </span>
          </div>
          <p className="text-zinc-700 font-medium truncate">"{issue.original}"</p>
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-zinc-400 mt-0.5">
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {issue.reason}
          </button>
          {open && (
            <div className="mt-2 space-y-1.5">
              <div className="bg-white rounded-lg border border-zinc-200 px-2.5 py-1.5">
                <p className="text-[10px] text-zinc-400 mb-0.5">Suggestion</p>
                <p className="text-zinc-800 font-medium">"{issue.suggestion}"</p>
              </div>
              <button
                onClick={() => onAccept(issue)}
                className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-semibold py-1 transition-colors"
              >
                ✓ Accept suggestion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main DocPanel ──────────────────────────────────────────────
export default function DocPanel({
  docFile,
  docText = "",
  pendingSuggestion,
  onSuggestionApplied,
  onRegenerate,
}: DocPanelProps) {
  const [issues,     setIssues]     = useState<GrammarIssue[]>([]);
  const [checking,   setChecking]   = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"grammar" | "ai">("grammar");
  const [instruction, setInstruction] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Grammar check ────────────────────────────────────────────
  const runGrammarCheck = useCallback(async () => {
    if (!docText.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setChecking(true);
    setIssues([]);
    try {
      const res = await fetch("/api/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: docText }),
        signal: ctrl.signal,
      });
      if (res.ok) setIssues(await res.json());
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    }
    setChecking(false);
  }, [docText]);

  // Auto-run grammar check when doc text changes
  useEffect(() => {
    if (docText) {
      const t = setTimeout(runGrammarCheck, 800);
      return () => clearTimeout(t);
    }
  }, [docText, runGrammarCheck]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const acceptIssue = (issue: GrammarIssue) => {
    setIssues((prev) => prev.filter((i) => i.id !== issue.id));
    // Real acceptance would patch the docx; for now just remove from list
  };

  const severityCounts = {
    error:   issues.filter((i) => i.severity === "error").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info:    issues.filter((i) => i.severity === "info").length,
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Editor column ── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-100">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 bg-white shrink-0">
          <FileText className="h-4 w-4 text-violet-500" />
          <span className="text-xs font-semibold text-zinc-600 truncate">
            {docFile?.name ?? "No document"}
          </span>
          {docFile && (
            <a
              href={URL.createObjectURL(docFile)}
              download={docFile.name}
              className="ml-auto flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 border border-violet-200 rounded-lg px-2 py-1 hover:bg-violet-50 transition-colors"
            >
              <Download className="h-3 w-3" /> Download
            </a>
          )}
        </div>

        {/* SuperDoc */}
        <div className="flex-1 overflow-auto bg-zinc-50">
          {!docFile ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400 p-8">
              <FileText className="h-12 w-12 text-zinc-200" />
              <p className="text-sm text-center">
                Select <span className="font-semibold text-violet-600">Skills</span> extension and generate a document,<br />
                or ask AI to create one in the chat.
              </p>
            </div>
          ) : (
            <SuperDocEditor
              document={docFile}
              documentMode="suggesting"
              role="editor"
              user={{ name: "advoAI User", email: "user@advoai.in" }}
              onReady={() => setEditorReady(true)}
            />
          )}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div className="w-[280px] shrink-0 flex flex-col bg-white overflow-hidden">
        {/* Sidebar tabs */}
        <div className="flex border-b border-zinc-100 shrink-0">
          {(["grammar", "ai"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                sidebarTab === tab
                  ? "border-b-2 border-violet-600 text-violet-700"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              {tab === "grammar" ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Grammar</>
              ) : (
                <><Wand2 className="h-3.5 w-3.5" /> AI Edit</>
              )}
            </button>
          ))}
        </div>

        {/* ── Grammar panel ── */}
        {sidebarTab === "grammar" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-50">
              <div className="flex items-center gap-2 text-[10px] font-semibold">
                {severityCounts.error > 0   && <span className="bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">{severityCounts.error} errors</span>}
                {severityCounts.warning > 0 && <span className="bg-yellow-100 text-yellow-700 rounded-full px-1.5 py-0.5">{severityCounts.warning} warnings</span>}
                {severityCounts.info > 0    && <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">{severityCounts.info} info</span>}
                {issues.length === 0 && !checking && <span className="text-zinc-400">No issues</span>}
              </div>
              <button
                onClick={runGrammarCheck}
                disabled={checking || !docText}
                className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-700 disabled:opacity-40"
              >
                <RefreshCw className={cn("h-3 w-3", checking && "animate-spin")} />
                {checking ? "Checking…" : "Re-check"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {checking && (
                <div className="flex items-center gap-2 py-4 justify-center text-xs text-zinc-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-500" />
                  Running grammar & legal-style check…
                </div>
              )}
              {!checking && issues.length === 0 && docText && (
                <div className="py-6 text-center text-xs text-zinc-400">
                  ✓ No grammar issues found
                </div>
              )}
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} onAccept={acceptIssue} />
              ))}
            </div>
          </div>
        )}

        {/* ── AI Edit panel ── */}
        {sidebarTab === "ai" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Pending suggestion from chat */}
            {pendingSuggestion && (
              <div className="m-2 rounded-xl bg-violet-50 border border-violet-200 p-3 text-xs">
                <p className="font-semibold text-violet-700 mb-1">AI Suggestion — {pendingSuggestion.section}</p>
                <p className="text-zinc-700 line-clamp-4 whitespace-pre-wrap">{pendingSuggestion.text}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={onSuggestionApplied}
                    className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-semibold py-1.5 transition-colors"
                  >
                    ✓ Apply to document
                  </button>
                  <button
                    onClick={onSuggestionApplied}
                    className="rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-500 text-[10px] px-2 py-1.5 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                Ask AI to edit the document
              </p>
              <div className="space-y-1.5 mb-4">
                {[
                  "Improve the professional summary",
                  "Make the tone more formal",
                  "Expand the experience section",
                  "Add legal citations where relevant",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInstruction(prompt)}
                    className="w-full text-left rounded-lg border border-zinc-100 bg-zinc-50 hover:bg-violet-50 hover:border-violet-200 px-2.5 py-2 text-xs text-zinc-600 hover:text-violet-700 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Instruction input */}
            <div className="p-2 border-t border-zinc-100 shrink-0">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Tell AI what to change…"
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none transition-all"
              />
              <button
                disabled={!instruction.trim() || !docFile}
                onClick={() => { onRegenerate?.(instruction); setInstruction(""); }}
                className="mt-1.5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold py-2 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Apply AI Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
