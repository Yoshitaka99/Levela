"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /** RGBA/any CSS color for the spotlight glow. */
  spotlightColor?: string;
}

/**
 * React Bits — SpotlightCard
 * A card that reveals a radial glow following the cursor.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(156, 64, 255, 0.25)",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--rb-mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--rb-mouse-y", `${e.clientY - rect.top}px`);
    el.style.setProperty("--rb-spot-opacity", "1");
  };

  const handleLeave = () => {
    ref.current?.style.setProperty("--rb-spot-opacity", "0");
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6",
        className,
      )}
      style={{ "--rb-spot-opacity": 0 } as React.CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: "var(--rb-spot-opacity)",
          background: `radial-gradient(circle 240px at var(--rb-mouse-x) var(--rb-mouse-y), ${spotlightColor}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
