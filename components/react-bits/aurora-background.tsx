"use client";

import { cn } from "@/lib/utils";

interface AuroraBackgroundProps {
  className?: string;
  /** Gradient stop colors for the aurora ribbons. */
  colors?: [string, string, string];
  /** Overall opacity of the effect. */
  amplitude?: number;
}

/**
 * React Bits — Aurora (CSS variant)
 * Soft, slowly drifting aurora ribbons rendered as blurred conic/linear
 * gradients. Dependency-free alternative to the WebGL original.
 */
export function AuroraBackground({
  className,
  colors = ["#3A29FF", "#FF94B4", "#FF3232"],
  amplitude = 0.55,
}: AuroraBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      style={{ opacity: amplitude }}
    >
      <div
        className="rb-aurora absolute left-1/2 top-[-40%] h-[80%] w-[140%] -translate-x-1/2 blur-3xl"
        style={{
          background: `conic-gradient(from 120deg at 50% 50%, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]})`,
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, #000 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, #000 40%, transparent 75%)",
        }}
      />
    </div>
  );
}
