"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Star,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  StarOff,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DraftAdvoAILogo from "@/components/ui/draft-adhai-logo";

// ── Types ─────────────────────────────────────────────────────
export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  starred: boolean;
}

// ── Demo data ─────────────────────────────────────────────────
const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "1",
    title: "Bail application draft",
    preview: "Draft a bail application for...",
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    starred: true,
  },
  {
    id: "2",
    title: "IPC Section 302 analysis",
    preview: "Explain the nuances of...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    starred: true,
  },
  {
    id: "3",
    title: "Writ petition outline",
    preview: "Create a high court writ...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    starred: false,
  },
  {
    id: "4",
    title: "Contract clause review",
    preview: "Review the indemnity clause...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25),
    starred: false,
  },
  {
    id: "5",
    title: "Consumer forum complaint",
    preview: "File a complaint under...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 27),
    starred: false,
  },
  {
    id: "6",
    title: "Divorce petition summary",
    preview: "Draft a mutual consent...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    starred: false,
  },
  {
    id: "7",
    title: "GST notice reply",
    preview: "Reply to a show-cause notice...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
    starred: false,
  },
];

// ── Helpers ────────────────────────────────────────────────────
function groupByTime(sessions: ChatSession[]) {
  const now = Date.now();
  const groups: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };
  sessions.forEach((s) => {
    const diff = now - s.timestamp.getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) groups["Today"].push(s);
    else if (hours < 48) groups["Yesterday"].push(s);
    else if (hours < 24 * 7) groups["Last 7 days"].push(s);
    else groups["Older"].push(s);
  });
  return groups;
}

// ── SessionItem ────────────────────────────────────────────────
function SessionItem({
  session,
  active,
  onClick,
  onStar,
  onDelete,
  collapsed,
}: {
  session: ChatSession;
  active: boolean;
  onClick: () => void;
  onStar: () => void;
  onDelete: () => void;
  collapsed: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer",
        "transition-all duration-150 select-none",
        active
          ? "bg-violet-100 text-violet-700"
          : "hover:bg-black/5 text-zinc-600 hover:text-zinc-900"
      )}
      onClick={onClick}
      title={collapsed ? session.title : undefined}
    >
      <MessageSquare
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          active ? "text-violet-500" : "text-zinc-400"
        )}
      />
      {!collapsed && (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{session.title}</p>
          </div>
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 shrink-0"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onStar(); }}
                  className="rounded-md p-1 hover:bg-violet-100 transition-colors"
                  title={session.starred ? "Unstar" : "Star"}
                >
                  {session.starred ? (
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                  ) : (
                    <StarOff className="h-3 w-3 text-zinc-400 hover:text-yellow-500" />
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="rounded-md p-1 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3 text-zinc-400 hover:text-red-500" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      {active && (
        <motion.span
          layoutId="active-bar"
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-violet-500"
        />
      )}
    </motion.li>
  );
}

// ── Sidebar Panel (shared between mobile & desktop) ───────────
function SidebarPanel({
  collapsed,
  setCollapsed,
  isMobile,
  onClose,
  sessions,
  setSessions,
  activeId,
  setActiveId,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isMobile: boolean;
  onClose?: () => void;
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeId: string;
  setActiveId: (id: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<"history" | "starred">("history");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const base = activeTab === "starred" ? sessions.filter((s) => s.starred) : sessions;
    if (!query.trim()) return base;
    return base.filter(
      (s) =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.preview.toLowerCase().includes(query.toLowerCase())
    );
  }, [sessions, query, activeTab]);

  const groups = useMemo(
    () => (activeTab === "history" ? groupByTime(filtered) : null),
    [activeTab, filtered]
  );

  const toggleStar = (id: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, starred: !s.starred } : s)));
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId("");
  };

  const navigateToChat = (chatId: string) => {
    setActiveId(chatId);
    router.push(`/ai/c/${chatId}`);
    if (isMobile) onClose?.();
  };

  const newChat = () => {
    router.push("/ai");
    setActiveId("");
    if (isMobile) onClose?.();
  };

  const effectiveCollapsed = isMobile ? false : collapsed;

  return (
    <div className="h-full flex flex-col" style={{ background: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center py-4 px-3 gap-2 border-b border-zinc-200",
          effectiveCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!effectiveCollapsed && <DraftAdvoAILogo size="sm" showIndicator={false} />}
        {/* Desktop collapse toggle */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-1.5 hover:bg-black/8 text-zinc-500 hover:text-zinc-900 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-black/8 text-zinc-500 hover:text-zinc-900 transition-colors ml-auto"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── New Chat ── */}
      <div className={cn("px-2 pt-3 pb-2", effectiveCollapsed && "flex justify-center")}>
        <button
          onClick={newChat}
          title="New chat"
          className={cn(
            "flex items-center gap-2 rounded-xl transition-all duration-150",
            "bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-xs font-semibold shadow-sm",
            effectiveCollapsed ? "p-2" : "w-full px-3 py-2"
          )}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!effectiveCollapsed && <span>New chat</span>}
        </button>
      </div>

      {/* ── Search ── */}
      {!effectiveCollapsed && (
        <div className="px-2 pb-2">
          <div className="flex items-center gap-2 rounded-xl bg-white border border-zinc-300 px-3 py-1.5 shadow-sm">
            <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-xs text-zinc-700 placeholder:text-zinc-400 outline-none"
            />
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      {!effectiveCollapsed && (
        <div className="flex mx-2 mb-2 rounded-xl bg-zinc-200 p-1 gap-1">
          {(["history", "starred"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-150",
                activeTab === tab
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {tab === "history" ? <Clock className="h-3 w-3" /> : <Star className="h-3 w-3" />}
              {tab === "history" ? "History" : "Starred"}
            </button>
          ))}
        </div>
      )}

      {/* ── Session List ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {activeTab === "history" && groups ? (
          Object.entries(groups).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label} className="mb-3">
                {!effectiveCollapsed && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-2.5 mb-1">
                    {label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  <AnimatePresence initial={false}>
                    {items.map((s) => (
                      <SessionItem
                        key={s.id}
                        session={s}
                        active={activeId === s.id}
                        collapsed={effectiveCollapsed}
                        onClick={() => navigateToChat(s.id)}
                        onStar={() => toggleStar(s.id)}
                        onDelete={() => deleteSession(s.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            )
          )
        ) : (
          <ul className="space-y-0.5">
            <AnimatePresence initial={false}>
              {filtered.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={activeId === s.id}
                  collapsed={effectiveCollapsed}
                  onClick={() => navigateToChat(s.id)}
                  onStar={() => toggleStar(s.id)}
                  onDelete={() => deleteSession(s.id)}
                />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && !effectiveCollapsed && (
              <li className="px-3 py-8 text-center text-xs text-zinc-400">
                No starred chats yet.
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── Footer ── */}
      {!effectiveCollapsed && (
        <div className="border-t border-zinc-200 px-3 py-3">
          <p className="text-[10px] text-zinc-400 text-center">Draft@advoAI · Legal AI</p>
        </div>
      )}
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────
export default function AISidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [activeId, setActiveId] = useState<string>("");
  const pathname = usePathname();

  // Sync sessions from localStorage (chats created via the AI page)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("advo-chats") || "{}");
      const fromStorage: ChatSession[] = Object.entries(stored).map(([id, data]: [string, any]) => ({
        id,
        title: data.title || "Untitled chat",
        preview: data.messages?.[0]?.content?.slice(0, 60) || "",
        timestamp: new Date(data.createdAt || Date.now()),
        starred: false,
      }));
      if (fromStorage.length > 0) {
        setSessions((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = fromStorage.filter((s) => !existingIds.has(s.id));
          return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
        });
      }
    } catch {}
  }, [pathname]); // re-sync on every navigation

  // Sync active chat from URL
  useEffect(() => {
    const match = pathname?.match(/\/ai\/c\/(.+)/);
    if (match) setActiveId(match[1]);
    else if (pathname === "/ai") setActiveId("");
  }, [pathname]);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);


  return (
    <>
      {/* ════════════════════════════════════════════
          MOBILE: floating toggle button (always visible)
          + overlay drawer
         ════════════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Floating hamburger — top-left, always on screen */}
        <button
          id="mobile-sidebar-toggle"
          onClick={() => setMobileOpen(true)}
          className={cn(
            "fixed top-3 left-3 z-50 flex items-center justify-center",
            "h-9 w-9 rounded-xl shadow-md border border-zinc-200",
            "bg-white/90 backdrop-blur-sm text-zinc-700 hover:text-violet-600",
            "transition-all duration-150",
            mobileOpen && "opacity-0 pointer-events-none"
          )}
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Backdrop */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="fixed top-0 left-0 z-50 h-full w-[260px] border-r border-zinc-200 shadow-2xl overflow-hidden"
            >
              <SidebarPanel
                collapsed={false}
                setCollapsed={() => {}}
                isMobile
                onClose={() => setMobileOpen(false)}
                sessions={sessions}
                setSessions={setSessions}
                activeId={activeId}
                setActiveId={setActiveId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ════════════════════════════════════════════
          DESKTOP: pinned collapsible sidebar
         ════════════════════════════════════════════ */}
      <motion.aside
        animate={{ width: collapsed ? 60 : 260 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="hidden md:flex flex-col h-screen shrink-0 overflow-hidden border-r border-zinc-200 relative z-40"
        style={{ background: "#e9e9e9" }}
      >
        <SidebarPanel
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isMobile={false}
          sessions={sessions}
          setSessions={setSessions}
          activeId={activeId}
          setActiveId={setActiveId}
        />
      </motion.aside>
    </>
  );
}
