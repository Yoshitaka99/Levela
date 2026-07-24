"use client";

import { cn } from "@/lib/utils";

interface StarBorderProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /** Border glow color. */
  color?: string;
  /** Orbit duration in seconds. */
  speed?: number;
  className?: string;
}

/**
 * React Bits — StarBorder
 * A pill button with two glints orbiting its border.
 */
export function StarBorder({
  children,
  color = "#9c40ff",
  speed = 5,
  className,
  ...props
}: StarBorderProps) {
  return (
    <button
      {...props}
      className={cn(
        "relative inline-flex overflow-hidden rounded-full p-[1.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        className,
      )}
      style={{ "--rb-star-speed": `${speed}s` } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="rb-star-orbit absolute bottom-[-11px] right-[-11px] h-1/2 w-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 12%)`,
        }}
      />
      <span
        aria-hidden
        className="rb-star-orbit-2 absolute left-[-11px] top-[-11px] h-1/2 w-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 12%)`,
        }}
      />
      <span className="relative z-10 inline-flex items-center justify-center rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-medium text-white">
        {children}
      </span>
    </button>
  );
}
