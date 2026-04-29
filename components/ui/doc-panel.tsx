"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import "@superdoc-dev/react/style.css";
import {
  FileText, CheckCircle2, AlertTriangle, Info,
  RefreshCw, ChevronDown, ChevronUp, Package,
  MapPin, Phone, User, Hash, Truck, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────
export interface GrammarIssue {
  id: string;
  type: "grammar" | "spelling" | "style" | "typographical" | "punctuation";
  severity: "error" | "warning" | "info";
  original: string;
  suggestion: string;
  reason: string;
  offset: number;
}

export interface DocPanelProps {
  docFile: File | null;
  docText?: string;
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
  error:   { icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50",    border: "border-red-200"   },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-50", border: "border-yellow-200" },
  info:    { icon: Info,          color: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-200"  },
};

const TYPE_BADGE: Record<string, string> = {
  grammar:       "bg-red-100 text-red-700",
  spelling:      "bg-orange-100 text-orange-700",
  style:         "bg-blue-100 text-blue-700",
  typographical: "bg-yellow-100 text-yellow-700",
  punctuation:   "bg-zinc-100 text-zinc-600",
};

// ── Grammar issue card ─────────────────────────────────────────
function IssueCard({ issue, onAccept }: { issue: GrammarIssue; onAccept: (i: GrammarIssue) => void }) {
  const [open, setOpen] = useState(false);
  const cfg  = SEVERITY[issue.severity];
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-xl border p-3 text-xs", cfg.bg, cfg.border)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", TYPE_BADGE[issue.type] ?? "bg-zinc-100 text-zinc-600")}>
              {issue.type}
            </span>
          </div>
          <p className="text-zinc-700 font-medium truncate">"{issue.original}"</p>
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-zinc-400 mt-0.5 text-left">
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span className="line-clamp-1">{issue.reason}</span>
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
                ✓ Accept
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Order Hard Copy form ───────────────────────────────────────
function OrderHardCopy({ docName }: { docName: string }) {
  const [form, setForm] = useState({
    name: "", address: "", city: "", pin: "", phone: "", copies: "1", speed: "standard",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleOrder = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200)); // simulate API
    setSubmitting(false);
    setSubmitted(true);
  };

  const INPUT = "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all";

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCheck className="h-7 w-7 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-800">Order Placed!</p>
          <p className="text-xs text-zinc-500 mt-1">
            {form.copies} copy of <span className="font-medium">{docName}</span> will be delivered to {form.city}.
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            {form.speed === "express" ? "Estimated: 2–3 business days" : "Estimated: 7–10 business days"}
          </p>
        </div>
        <button
          onClick={() => { setSubmitted(false); setForm({ name: "", address: "", city: "", pin: "", phone: "", copies: "1", speed: "standard" }); }}
          className="text-xs text-violet-600 hover:text-violet-700 font-medium underline"
        >
          Place another order
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3">
      <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 text-xs text-violet-700">
        <p className="font-semibold mb-0.5">📦 Hard Copy Delivery</p>
        <p className="text-violet-500">Order a printed, court-ready copy of this document delivered to your address.</p>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
          <User className="h-3 w-3 text-violet-500" /> Full Name
        </label>
        <input className={INPUT} placeholder="Client name" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      {/* Address */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
          <MapPin className="h-3 w-3 text-violet-500" /> Delivery Address
        </label>
        <textarea className={cn(INPUT, "resize-none")} rows={3} placeholder="House/Flat, Street, Area…" value={form.address} onChange={(e) => set("address", e.target.value)} />
      </div>

      {/* City + PIN in one row */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">City</label>
          <input className={INPUT} placeholder="New Delhi" value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div className="w-24 space-y-1">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">PIN</label>
          <input className={INPUT} placeholder="110001" maxLength={6} value={form.pin} onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
          <Phone className="h-3 w-3 text-violet-500" /> Phone
        </label>
        <input className={INPUT} placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>

      {/* Copies */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
            <Hash className="h-3 w-3 text-violet-500" /> Copies
          </label>
          <select className={INPUT} value={form.copies} onChange={(e) => set("copies", e.target.value)}>
            {["1","2","3","4","5","10"].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
            <Truck className="h-3 w-3 text-violet-500" /> Delivery
          </label>
          <select className={INPUT} value={form.speed} onChange={(e) => set("speed", e.target.value)}>
            <option value="standard">Standard (7–10d)</option>
            <option value="express">Express (2–3d)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleOrder}
        disabled={submitting || !form.name || !form.address || !form.phone}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold py-2.5 transition-colors mt-auto"
      >
        {submitting
          ? <><div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Placing order…</>
          : <><Package className="h-3.5 w-3.5" /> Place Order</>}
      </button>
    </div>
  );
}

// ── Main DocPanel ──────────────────────────────────────────────
export default function DocPanel({ docFile, docText = "", onRegenerate }: DocPanelProps) {
  const [issues,     setIssues]   = useState<GrammarIssue[]>([]);
  const [checking,   setChecking] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"grammar" | "order">("grammar");
  const abortRef = useRef<AbortController | null>(null);

  // ── LanguageTool free grammar check ───────────────────────────
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

  useEffect(() => {
    if (docText) {
      const t = setTimeout(runGrammarCheck, 900);
      return () => clearTimeout(t);
    }
  }, [docText, runGrammarCheck]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const acceptIssue = (issue: GrammarIssue) =>
    setIssues((prev) => prev.filter((i) => i.id !== issue.id));

  const severityCounts = {
    error:   issues.filter((i) => i.severity === "error").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info:    issues.filter((i) => i.severity === "info").length,
  };

  return (
    <div className="flex flex-col sm:flex-row h-full overflow-hidden">
      {/* ── Editor ── */}
      <div className="flex-1 flex flex-col overflow-hidden border-b sm:border-b-0 sm:border-r border-zinc-100 min-h-[300px] sm:min-h-0">
        {/* Mini toolbar — no download */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 bg-white shrink-0">
          <FileText className="h-4 w-4 text-violet-500 shrink-0" />
          <span className="text-xs font-semibold text-zinc-600 truncate">
            {docFile?.name ?? "Document editor"}
          </span>
        </div>

        <div className="flex-1 overflow-auto bg-zinc-50">
          {!docFile ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400 p-8">
              <FileText className="h-12 w-12 text-zinc-200" />
              <p className="text-sm text-center">
                Ask AI to draft any legal document<br />
                and it will appear here automatically.
              </p>
              <p className="text-xs text-zinc-300">
                Try: "Draft a rental agreement between X and Y"
              </p>
            </div>
          ) : (
            <SuperDocEditor
              document={docFile}
              documentMode="suggesting"
              role="editor"
              user={{ name: "advoAI User", email: "user@advoai.in" }}
            />
          )}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div className="w-full sm:w-[260px] shrink-0 flex flex-col bg-white overflow-hidden border-t sm:border-t-0 sm:border-l border-zinc-100">
        {/* Tabs */}
        <div className="flex border-b border-zinc-100 shrink-0">
          {([
            { id: "grammar", icon: CheckCircle2, label: "Grammar" },
            { id: "order",   icon: Package,      label: "Hard Copy" },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setSidebarTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                sidebarTab === id
                  ? "border-b-2 border-violet-600 text-violet-700"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Grammar panel ── */}
        {sidebarTab === "grammar" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-50">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold flex-wrap">
                {severityCounts.error   > 0 && <span className="bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">{severityCounts.error} errors</span>}
                {severityCounts.warning > 0 && <span className="bg-yellow-100 text-yellow-700 rounded-full px-1.5 py-0.5">{severityCounts.warning} warn</span>}
                {severityCounts.info    > 0 && <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">{severityCounts.info} info</span>}
                {issues.length === 0 && !checking && !docText && <span className="text-zinc-300">No doc loaded</span>}
                {issues.length === 0 && !checking && docText  && <span className="text-zinc-400">✓ No issues</span>}
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
                <div className="flex items-center gap-2 py-6 justify-center text-xs text-zinc-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-500" />
                  Checking via LanguageTool…
                </div>
              )}
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} onAccept={acceptIssue} />
              ))}
            </div>
          </div>
        )}

        {/* ── Order Hard Copy panel ── */}
        {sidebarTab === "order" && (
          <OrderHardCopy docName={docFile?.name ?? "document"} />
        )}
      </div>
    </div>
  );
}
