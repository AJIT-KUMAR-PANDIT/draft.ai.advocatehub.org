"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Bot, User, FileText, MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";
import AI_Prompt from "@/components/kokonutui/ai-prompt";
import DraftAdvoAILogo from "@/components/ui/draft-adhai-logo";
import { cn } from "@/lib/utils";
import { textToDocx, isLegalDocument, extractDocTitle } from "@/lib/text-to-docx";

const DocPanel = dynamic(() => import("@/components/ui/doc-panel"), { ssr: false });

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  hasDoc?: boolean;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const LEGAL_SYSTEM_MSG = {
  role: "system" as const,
  content: `You are advoAI, an expert Indian legal assistant and document drafter.
When asked to draft legal documents (agreements, contracts, deeds, petitions, applications, affidavits, writ petitions, etc.):
- Use professional legal formatting with clear headings (##), clause numbers, and defined parties
- Include WHEREAS recitals, definitions, operative clauses, and execution block
- Format party names and key terms in **bold**
- Use proper legal language appropriate for Indian courts
When answering legal questions, be precise and cite relevant IPC/CPC/CrPC sections if applicable.`,
};

async function streamChat(
  messages: { role: string; content: string }[],
  signal: AbortSignal,
  onToken: (t: string) => void,
  onDone: () => void,
  onError: (m: string) => void
) {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (e: any) {
    if (e?.name !== "AbortError") onError(e?.message ?? "Network error");
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    onError(err.error);
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) { onError("No stream"); return; }
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const p = line.slice(5).trim();
        if (p === "[DONE]") { onDone(); return; }
        try { const t = JSON.parse(p)?.choices?.[0]?.delta?.content ?? ""; if (t) onToken(t); } catch {}
      }
    }
  } catch (e: any) { if (e?.name !== "AbortError") onError(e?.message); }
  onDone();
}

function MessageBubble({ msg, onViewDoc }: { msg: Message; onViewDoc?: () => void }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className={cn("flex gap-2.5 sm:gap-3 max-w-2xl mx-auto w-full px-3 sm:px-4", isUser && "flex-row-reverse")}
    >
      <div className={cn("shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center",
        isUser ? "bg-violet-600" : "bg-zinc-100 border border-zinc-200")}>
        {isUser ? <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" /> : <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" />}
      </div>
      <div className={cn(
        "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap",
        isUser ? "bg-violet-600 text-white rounded-tr-sm" : "bg-zinc-100 text-zinc-800 rounded-tl-sm border border-zinc-200"
      )}>
        {msg.content || <span className="opacity-40 italic">…</span>}
        {msg.hasDoc && onViewDoc && (
          <button onClick={onViewDoc}
            className="mt-2.5 flex items-center gap-2 rounded-xl bg-white border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-colors shadow-sm">
            <FileText className="h-4 w-4 text-violet-500" />
            Open in Document Editor →
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex gap-2.5 sm:gap-3 max-w-2xl mx-auto w-full px-3 sm:px-4">
      <div className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center bg-zinc-100 border border-zinc-200">
        <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" />
      </div>
      <div className="bg-zinc-100 border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0,1,2].map((i) => (
          <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-400"
            animate={{ y: [0,-4,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function ChatPage() {
  const params = useParams();
  const id = params.id as string;

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [model,     setModel]     = useState("Claude 4.5 Sonnet");

  const [activeExtension, setActiveExtension] = useState<string | null>(null);
  const [docFile,   setDocFile]   = useState<File | null>(null);
  const [docText,   setDocText]   = useState("");
  const [docTitle,  setDocTitle]  = useState("Legal Document");

  // Mobile: "chat" | "doc"
  const [mobileView, setMobileView] = useState<"chat" | "doc">("chat");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const abortRef    = useRef<AbortController | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const persist = useCallback((msgs: Message[], mdl: string) => {
    try {
      const all = JSON.parse(localStorage.getItem("advo-chats") || "{}");
      all[id] = { ...all[id], messages: msgs, model: mdl, title: msgs.find((m) => m.role === "user")?.content?.slice(0, 60) };
      localStorage.setItem("advo-chats", JSON.stringify(all));
    } catch {}
  }, [id]);

  const openInEditor = useCallback(async (text: string) => {
    const title = extractDocTitle(text);
    setDocTitle(title);
    setDocText(text);
    try {
      const file = await textToDocx(text, title);
      setDocFile(file);
      setActiveExtension("skills");
    } catch (e) { console.error("textToDocx failed", e); }
  }, []);

  const triggerReply = useCallback((baseMessages: Message[], mdl: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const assistantId = `asst-${uid()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", ts: Date.now() }]);
    setStreaming(true);

    const apiMessages = [LEGAL_SYSTEM_MSG, ...baseMessages.map(({ role, content }) => ({ role, content }))];
    const lastUserMsg = [...baseMessages].reverse().find((m) => m.role === "user")?.content ?? "";
    let fullText = "";

    streamChat(apiMessages, ctrl.signal,
      (token) => {
        fullText += token;
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + token } : m));
      },
      async () => {
        setStreaming(false);
        const isDoc = isLegalDocument(fullText, lastUserMsg);
        setMessages((prev) => {
          const updated = prev.map((m) => m.id === assistantId ? { ...m, hasDoc: isDoc } : m);
          persist(updated, mdl);
          return updated;
        });
        if (isDoc) await openInEditor(fullText);
      },
      (err) => {
        setStreaming(false);
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${err}` } : m));
      }
    );
  }, [persist, openInEditor]);

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("advo-chats") || "{}");
      if (!all[id]) return;
      const savedMsgs: Message[] = all[id].messages ?? [];
      setMessages(savedMsgs);
      setModel(all[id].model ?? "Claude 4.5 Sonnet");
      const hasReply = savedMsgs.some((m) => m.role === "assistant");
      if (!hasReply && savedMsgs.length > 0) setTimeout(() => triggerReply(savedMsgs, all[id].model), 50);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = (value: string, mdl: string) => {
    if (!value.trim() || streaming) return;
    setModel(mdl);
    const userMsg: Message = { id: `user-${uid()}`, role: "user", content: value, ts: Date.now() };
    const next = [...messagesRef.current, userMsg];
    setMessages(next);
    triggerReply(next, mdl);
  };

  const hasDocPanel = activeExtension === "skills";

  // Auto-switch to doc view on mobile when doc appears
  useEffect(() => {
    if (docFile) setMobileView("doc");
  }, [docFile]);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* ── Mobile tab bar (shown only on small screens when doc is available) ── */}
      {hasDocPanel && (
        <div className="flex md:hidden border-b border-zinc-100 shrink-0 bg-white">
          {([
            { id: "chat", icon: MessageSquare, label: "Chat" },
            { id: "doc",  icon: FileText,      label: "Document" },
          ] as const).map(({ id: tabId, icon: Icon, label }) => (
            <button key={tabId} onClick={() => setMobileView(tabId)}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                mobileView === tabId ? "border-b-2 border-violet-600 text-violet-700" : "text-zinc-400")}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main split area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Chat column ── */}
        <div className={cn(
          "flex flex-col overflow-hidden transition-all duration-300",
          // Desktop: side-by-side
          hasDocPanel ? "hidden md:flex md:w-[42%] md:border-r md:border-zinc-100" : "flex flex-1",
          // Mobile: show based on tab
          hasDocPanel && mobileView === "chat" && "flex w-full md:flex md:w-[42%]",
          hasDocPanel && mobileView === "doc"  && "hidden md:flex md:w-[42%]",
        )}>
          {/* Top bar */}
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-100 shrink-0">
            <DraftAdvoAILogo size="sm" showIndicator={false} />
            <span className="text-xs text-zinc-400 ml-auto truncate max-w-[120px] sm:max-w-none">{model}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 sm:py-6 space-y-3 sm:space-y-4 pb-[190px]">
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400 text-sm px-6 text-center">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-200" />
                <p className="text-xs sm:text-sm">Ask me to draft any legal document — agreements, petitions, contracts, affidavits — and it will open in the editor automatically.</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg}
                  onViewDoc={msg.hasDoc ? () => { setActiveExtension("skills"); setMobileView("doc"); } : undefined} />
              ))}
            </AnimatePresence>
            <AnimatePresence>
              {streaming && messages.at(-1)?.role !== "assistant" && <TypingIndicator key="typing" />}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Input bar — left-aligned on desktop split, full-width on mobile */}
          <div className={cn(
            "fixed bottom-0 flex justify-center pb-3 pt-8 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none",
            // Covers only the chat column on desktop
            hasDocPanel ? "left-0 right-0 md:right-[58%]" : "left-0 right-0",
            // On mobile doc view, hide the input
            hasDocPanel && mobileView === "doc" && "hidden md:flex",
          )}>
            <div className="pointer-events-auto w-full flex justify-center px-2 sm:px-4">
              <AI_Prompt
                onSubmit={handleSubmit}
                placeholder={streaming ? "Drafting document…" : "Draft an agreement, petition, contract…"}
                headerText="Legal AI"
                headerAction="advoAI"
                activeExtension={activeExtension}
                onExtensionSelect={(ext) => {
                  setActiveExtension(ext);
                  if (!ext) { setDocFile(null); setDocText(""); setMobileView("chat"); }
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Document panel ── */}
        <AnimatePresence>
          {hasDocPanel && (
            <motion.div
              key="doc-panel"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className={cn(
                "flex flex-col overflow-hidden",
                // Desktop: right column
                "md:flex-1",
                // Mobile: full screen when doc tab active
                mobileView === "doc" ? "flex w-full" : "hidden md:flex",
              )}
            >
              {/* Panel header */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-100 shrink-0 bg-white">
                <FileText className="h-4 w-4 text-violet-500 shrink-0" />
                <span className="text-xs font-semibold text-zinc-700 truncate">{docTitle}</span>
                <button onClick={() => { setActiveExtension(null); setDocFile(null); setDocText(""); setMobileView("chat"); }}
                  className="ml-auto text-xs text-zinc-400 hover:text-zinc-700 transition-colors shrink-0">
                  ✕ Close
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <DocPanel
                  docFile={docFile}
                  docText={docText}
                  onRegenerate={async (instruction) => {
                    const msg: Message = { id: `user-${uid()}`, role: "user", content: `Revise: ${instruction}`, ts: Date.now() };
                    const next = [...messagesRef.current, msg];
                    setMessages(next);
                    setMobileView("chat");
                    triggerReply(next, model);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
