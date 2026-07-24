"use client";

import { cn } from "@/lib/utils";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  /** Ordered list of gradient stop colors. */
  colors?: string[];
  /** Animation duration in seconds. */
  speed?: number;
}

/**
 * React Bits — GradientText
 * Animated multi-stop gradient clipped to the text.
 */
export function GradientText({
  children,
  className,
  colors = ["#ffaa40", "#9c40ff", "#ffaa40"],
  speed = 8,
}: GradientTextProps) {
  return (
    <span
      className={cn(
        "rb-gradient-text inline-block bg-clip-text text-transparent",
        className,
      )}
      style={
        {
          backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
          backgroundSize: "300% 100%",
          "--rb-gradient-speed": `${speed}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}
