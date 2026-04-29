"use client";

import { cn } from "@/lib/utils";

interface DraftAdhAILogoProps {
  /** "sm" | "md" | "lg" | "xl" — controls overall scale */
  size?: "sm" | "md" | "lg" | "xl";
  /** Extra classes for the root element */
  className?: string;
  /** Whether to show the animated dot/cursor indicator */
  showIndicator?: boolean;
}

const sizeMap = {
  sm: { text: "text-lg",  icon: 22, gap: "gap-1.5" },
  md: { text: "text-2xl", icon: 28, gap: "gap-2"   },
  lg: { text: "text-4xl", icon: 38, gap: "gap-3"   },
  xl: { text: "text-6xl", icon: 54, gap: "gap-4"   },
};

export default function DraftAdvoAILogo({
  size = "md",
  className,
  showIndicator = true,
}: DraftAdhAILogoProps) {
  const s = sizeMap[size];

  return (
    <div
      aria-label="Draft@advoAI logo"
      className={cn("inline-flex items-center select-none", s.gap, className)}
    >
      {/* ── Glyph Mark ─────────────────────────────────────── */}
      <div
        className="draft-logo-mark relative shrink-0"
        style={{ width: s.icon, height: s.icon }}
      >
        {/* Spinning outer ring */}
        <span
          aria-hidden
          className="draft-logo-ring absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #7c3aed, #a855f7, #c4b5fd, #7c3aed)",
          }}
        />
        {/* Dark inner face */}
        <span
          className="absolute inset-[2px] rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0d001a 60%, #1e0040)" }}
        >
          {/* "D" letterform */}
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/5 h-3/5"
          >
            <path
              d="M3 2.5h4.5C10.538 2.5 13 4.962 13 8s-2.462 5.5-5.5 5.5H3V2.5z"
              stroke="url(#d-grad)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              fill="none"
            />
            <defs>
              <linearGradient
                id="d-grad"
                x1="3"
                y1="2.5"
                x2="13"
                y2="13.5"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#a855f7" />
                <stop offset="1" stopColor="#e9d5ff" />
              </linearGradient>
            </defs>
          </svg>
        </span>
      </div>

      {/* ── Word-mark ────────────────────────────────────────── */}
      <span
        className={cn("tracking-tight leading-none", s.text)}
        style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
      >
        {/* "Draft" — light weight, vivid violet */}
        <span
          style={{
            fontWeight: 300,
            color: "transparent",
            backgroundImage:
              "linear-gradient(90deg, #7c3aed 0%, #9333ea 50%, #a855f7 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
          }}
        >
          Draft
        </span>

        {/* "@" — bold accent */}
        <span
          style={{
            fontWeight: 800,
            color: "transparent",
            backgroundImage: "linear-gradient(135deg, #a855f7 0%, #6d28d9 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            margin: "0 0.02em",
          }}
        >
          @
        </span>

        {/* "advo" — medium, dark purple readable on light bg */}
        <span
          style={{
            fontWeight: 500,
            color: "#6d28d9",
          }}
        >
          advo
        </span>

        {/* "AI" — extra-bold, shimmer, vivid */}
        <span
          className="draft-logo-ai"
          style={{
            fontWeight: 800,
            color: "transparent",
            backgroundImage:
              "linear-gradient(90deg, #7c3aed 0%, #a855f7 40%, #6d28d9 70%, #7c3aed 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            backgroundSize: "200% auto",
            filter: "drop-shadow(0 0 6px rgba(124,58,237,0.45))",
          }}
        >
          AI
        </span>
      </span>

      {/* ── Active indicator dot ──────────────────────────── */}
      {showIndicator && (
        <span
          aria-hidden
          className="draft-logo-dot shrink-0 rounded-full"
          style={{
            width: s.icon * 0.22,
            height: s.icon * 0.22,
            background:
              "radial-gradient(circle, #a855f7 0%, #7c3aed 60%, transparent 100%)",
            boxShadow: "0 0 6px 2px rgba(124,58,237,0.5)",
          }}
        />
      )}

      {/* ── Scoped keyframes ─────────────────────────────── */}
      <style>{`
        /* Spinning ring */
        .draft-logo-mark .draft-logo-ring {
          animation: draft-ring-spin 4s linear infinite;
        }
        @keyframes draft-ring-spin {
          to { transform: rotate(360deg); }
        }

        /* "AI" shimmer */
        .draft-logo-ai {
          animation: draft-shimmer 2.8s linear infinite;
        }
        @keyframes draft-shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        /* Dot pulse */
        .draft-logo-dot {
          animation: draft-dot-pulse 2.4s ease-in-out infinite;
        }
        @keyframes draft-dot-pulse {
          0%, 100% { opacity: 1;   transform: scale(1);   }
          50%       { opacity: 0.4; transform: scale(0.65); }
        }
      `}</style>
    </div>
  );
}
