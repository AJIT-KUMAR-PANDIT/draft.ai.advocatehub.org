"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Bot, User } from "lucide-react";
import AI_Prompt from "@/components/kokonutui/ai-prompt";
import DraftAdvoAILogo from "@/components/ui/draft-adhai-logo";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

/** Collision-safe ID — timestamp + random suffix */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ── SSE stream reader ──────────────────────────────────────────
async function streamChat(
  messages: { role: string; content: string }[],
  signal: AbortSignal,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
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
    if (e?.name === "AbortError") return; // user navigated away
    onError(e?.message ?? "Network error");
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    onError(err.error ?? "API error");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { onError("No stream body"); return; }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(payload);
          const token: string = parsed?.choices?.[0]?.delta?.content ?? "";
          if (token) onToken(token);
        } catch {}
      }
    }
  } catch (e: any) {
    if (e?.name !== "AbortError") onError(e?.message ?? "Stream error");
  }
  onDone();
}

// ── Message bubble ─────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn("flex gap-3 max-w-3xl mx-auto w-full px-4", isUser && "flex-row-reverse")}
    >
      <div className={cn(
        "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
        isUser ? "bg-violet-600" : "bg-zinc-100 border border-zinc-200"
      )}>
        {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-violet-600" />}
      </div>
      <div className={cn(
        "rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap",
        isUser
          ? "bg-violet-600 text-white rounded-tr-sm"
          : "bg-zinc-100 text-zinc-800 rounded-tl-sm border border-zinc-200"
      )}>
        {msg.content || <span className="opacity-40 italic">…</span>}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex gap-3 max-w-3xl mx-auto w-full px-4"
    >
      <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-zinc-100 border border-zinc-200">
        <Bot className="h-4 w-4 text-violet-600" />
      </div>
      <div className="bg-zinc-100 border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-400"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function ChatPage() {
  const params  = useParams();
  const id      = params.id as string;

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [model,     setModel]     = useState("Claude 4.5 Sonnet");
  const bottomRef    = useRef<HTMLDivElement>(null);
  // Keep a ref so callbacks always see fresh messages without needing them as deps
  const messagesRef  = useRef<Message[]>([]);
  const abortRef     = useRef<AbortController | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Auto-scroll ──────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // ── Abort stream on unmount / navigation ─────────────────────
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Persist ──────────────────────────────────────────────────
  const persist = useCallback((msgs: Message[], mdl: string) => {
    try {
      const all = JSON.parse(localStorage.getItem("advo-chats") || "{}");
      const title = msgs.find((m) => m.role === "user")?.content?.slice(0, 60) ?? "Chat";
      all[id] = { ...all[id], messages: msgs, model: mdl, title };
      localStorage.setItem("advo-chats", JSON.stringify(all));
    } catch {}
  }, [id]);

  // ── Stream assistant reply ────────────────────────────────────
  const triggerReply = useCallback((baseMessages: Message[], mdl: string) => {
    // Cancel any ongoing stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId  = `asst-${uid()}`;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", ts: Date.now() };

    // Append the assistant placeholder in one atomic update
    setMessages((prev) => [...prev, assistantMsg]);
    setStreaming(true);

    const apiMessages = baseMessages.map(({ role, content }) => ({ role, content }));

    streamChat(
      apiMessages,
      controller.signal,
      // onToken
      (token) => setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: m.content + token } : m)
      ),
      // onDone
      () => {
        setStreaming(false);
        setMessages((prev) => { persist(prev, mdl); return prev; });
      },
      // onError
      (err) => {
        setStreaming(false);
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${err}` } : m)
        );
      }
    );
  }, [persist]);

  // ── Load session on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("advo-chats") || "{}");
      if (!all[id]) return;
      const savedMsgs: Message[] = all[id].messages ?? [];
      const savedModel: string   = all[id].model ?? "Claude 4.5 Sonnet";
      setMessages(savedMsgs);
      setModel(savedModel);

      const hasReply = savedMsgs.some((m) => m.role === "assistant");
      if (!hasReply && savedMsgs.length > 0) {
        // Trigger after state settles
        setTimeout(() => triggerReply(savedMsgs, savedModel), 50);
      }
    } catch {}
  // triggerReply is stable (useCallback); id never changes within a mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Handle user send ──────────────────────────────────────────
  const handleSubmit = (value: string, mdl: string) => {
    if (!value.trim() || streaming) return;
    setModel(mdl);

    const userMsg: Message = { id: `user-${uid()}`, role: "user", content: value, ts: Date.now() };
    // Read current messages from ref — no stale closure risk
    const next = [...messagesRef.current, userMsg];
    setMessages(next);
    triggerReply(next, mdl);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 shrink-0">
        <DraftAdvoAILogo size="sm" showIndicator={false} />
        <span className="text-xs text-zinc-400 ml-auto">{model}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-4 pb-[180px]">
        {messages.length === 0 && !streaming && (
          <div className="flex items-center justify-center h-full text-sm text-zinc-400">
            Starting conversation…
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        </AnimatePresence>
        <AnimatePresence>
          {streaming && messages.at(-1)?.role !== "assistant" && (
            <TypingIndicator key="typing" />
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-3 pt-10 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
          <AI_Prompt
            onSubmit={handleSubmit}
            placeholder={streaming ? "Waiting for response…" : "Ask a follow-up…"}
            headerText="Legal AI"
            headerAction="advoAI"
          />
        </div>
      </div>
    </div>
  );
}
