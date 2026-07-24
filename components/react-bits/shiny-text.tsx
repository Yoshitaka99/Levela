"use client";

import { cn } from "@/lib/utils";

interface ShinyTextProps {
  text: string;
  className?: string;
  /** Sweep duration in seconds. */
  speed?: number;
  disabled?: boolean;
}

/**
 * React Bits — ShinyText
 * A muted label with a light streak that sweeps across on a loop.
 */
export function ShinyText({
  text,
  className,
  speed = 4,
  disabled = false,
}: ShinyTextProps) {
  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent",
        !disabled && "rb-shiny",
        className,
      )}
      style={
        {
          "--rb-shiny-speed": `${speed}s`,
          backgroundImage:
            "linear-gradient(120deg, rgba(255,255,255,0.35) 40%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.35) 60%)",
          backgroundSize: "200% 100%",
        } as React.CSSProperties
      }
    >
      {text}
    </span>
  );
}
