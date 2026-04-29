"use client";

import { useState, useEffect, useRef } from "react";
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

// ── Simulated AI reply ─────────────────────────────────────────
function simulateReply(userMsg: string): string {
  return `Thank you for your query: **"${userMsg.slice(0, 80)}${userMsg.length > 80 ? "…" : ""}"**\n\nI'm currently in demo mode. In production I'll draft legal documents, analyse case law, and generate court filings based on your instructions. Stay tuned!`;
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
      {/* Avatar */}
      <div className={cn(
        "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
        isUser ? "bg-violet-600" : "bg-zinc-100 border border-zinc-200"
      )}>
        {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-violet-600" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        "rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%]",
        isUser
          ? "bg-violet-600 text-white rounded-tr-sm"
          : "bg-zinc-100 text-zinc-800 rounded-tl-sm border border-zinc-200"
      )}>
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
        ))}
      </div>
    </motion.div>
  );
}

// ── Typing indicator ───────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3 max-w-3xl mx-auto w-full px-4"
    >
      <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-zinc-100 border border-zinc-200">
        <Bot className="h-4 w-4 text-violet-600" />
      </div>
      <div className="bg-zinc-100 border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-zinc-400"
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
  const params = useParams();
  const id = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [model, setModel] = useState("Claude 4.5 Sonnet");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load existing session from localStorage
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("advo-chats") || "{}");
      if (all[id]) {
        setMessages(all[id].messages || []);
        setModel(all[id].model || "Claude 4.5 Sonnet");
        // Simulate an AI reply to the first user message if no assistant message yet
        const hasReply = (all[id].messages || []).some((m: Message) => m.role === "assistant");
        if (!hasReply && all[id].messages?.length > 0) {
          const firstUserMsg = all[id].messages[0].content;
          setTimeout(() => {
            const reply: Message = {
              id: "ai-init",
              role: "assistant",
              content: simulateReply(firstUserMsg),
              ts: Date.now(),
            };
            setMessages((prev) => {
              const updated = [...prev, reply];
              saveMessages(id, updated, all[id].model, all[id].title);
              return updated;
            });
          }, 1200);
        }
      }
    } catch {}
  }, [id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const saveMessages = (chatId: string, msgs: Message[], mdl: string, title: string) => {
    try {
      const all = JSON.parse(localStorage.getItem("advo-chats") || "{}");
      all[chatId] = { ...all[chatId], messages: msgs, model: mdl, title };
      localStorage.setItem("advo-chats", JSON.stringify(all));
    } catch {}
  };

  const handleSubmit = (value: string, mdl: string) => {
    if (!value.trim() || isThinking) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: value, ts: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsThinking(true);

    // Simulate AI reply after a delay
    setTimeout(() => {
      const reply: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: simulateReply(value),
        ts: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, reply];
        saveMessages(id, next, mdl, value.slice(0, 60));
        return next;
      });
      setIsThinking(false);
    }, 1400 + Math.random() * 600);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 shrink-0">
        <DraftAdvoAILogo size="sm" showIndicator={false} />
        <span className="text-xs text-zinc-400 ml-auto">{model}</span>
      </div>

      {/* ── Messages scroll area ── */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 pb-[180px]">
        {messages.length === 0 && !isThinking && (
          <div className="flex items-center justify-center h-full text-sm text-zinc-400">
            Starting conversation…
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {isThinking && <TypingIndicator key="typing" />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Fixed input bar ── */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-3 pt-10 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
          <AI_Prompt
            onSubmit={handleSubmit}
            placeholder={isThinking ? "Waiting for response…" : "Ask a follow-up question…"}
            headerText="Legal AI"
            headerAction="advoAI"
          />
        </div>
      </div>
    </div>
  );
}
