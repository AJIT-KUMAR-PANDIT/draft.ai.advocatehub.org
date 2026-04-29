"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { motion } from "motion/react";
import clsx from "clsx";

interface NavItem {
  id: string;
  name: string;
}

const DEFAULT_ITEMS: NavItem[] = [
  { id: "home", name: "Home" },
  { id: "works", name: "Works" },
  { id: "blog", name: "Blog" },
  { id: "about", name: "About" },
];

export default function MorphicTabs({
  items = DEFAULT_ITEMS,
}: {
  items?: NavItem[];
}) {
  const [active, setActive] = useState(items[0].id);
  const [indicator, setIndicator] = useState({ width: 0, left: 0 });

  const refs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = refs.current.get(active);
    const container = containerRef.current;

    if (el && container) {
      const rect = el.getBoundingClientRect();
      const parentRect = container.getBoundingClientRect();

      setIndicator({
        width: rect.width,
        left: rect.left - parentRect.left,
      });
    }
  }, [active]);

  return (
    <div className="flex justify-center mt-10">
      <div
        ref={containerRef}
        className="relative flex gap-1 p-1 rounded-xl glass border backdrop-blur-lg"
      >
        {/* 🔥 Sliding background */}
        <motion.div
          animate={{
            width: indicator.width,
            x: indicator.left,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
          className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500"
        />

        {items.map((item) => {
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              ref={(el) => {
                if (el) refs.current.set(item.id, el);
              }}
              onClick={() => setActive(item.id)}
              className={clsx(
                "relative z-10 px-4 py-2 text-sm rounded-xl transition-all duration-300",
                isActive
                  ? "text-white font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}