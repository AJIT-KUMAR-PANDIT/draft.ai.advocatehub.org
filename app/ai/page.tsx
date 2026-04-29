"use client";

import { useRouter } from "next/navigation";
import DraftAdvoAILogo from "@/components/ui/draft-adhai-logo";
import AI_Prompt from "@/components/kokonutui/ai-prompt";

export default function AI() {
  const router = useRouter();

  const handleSubmit = (value: string, model: string) => {
    if (!value.trim()) return;
    const id = Date.now().toString(36);
    try {
      const existing = JSON.parse(localStorage.getItem("advo-chats") || "{}");
      existing[id] = {
        title: value.slice(0, 60),
        model,
        messages: [{ id: "m1", role: "user", content: value, ts: Date.now() }],
        createdAt: Date.now(),
      };
      localStorage.setItem("advo-chats", JSON.stringify(existing));
    } catch {}
    router.push(`/ai/c/${id}`);
  };

  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-6">
      <DraftAdvoAILogo size="xl" />
      <p className="text-sm text-zinc-400">Your AI-powered legal drafting assistant</p>
      <AI_Prompt onSubmit={handleSubmit} />
    </div>
  );
}