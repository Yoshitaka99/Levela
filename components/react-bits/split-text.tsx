"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SplitBy = "chars" | "words";

interface SplitTextProps {
  text: string;
  className?: string;
  /** Split animation granularity. */
  splitType?: SplitBy;
  /** Delay between each element in ms. */
  delay?: number;
  /** Duration of each element's animation in ms. */
  duration?: number;
  /** Start animating when the element scrolls into view. */
  animateOnView?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * React Bits — SplitText
 * Reveals text character-by-character (or word-by-word) with a staggered
 * blur + slide-up transition. Pure CSS transitions, no animation library.
 */
export function SplitText({
  text,
  className,
  splitType = "chars",
  delay = 40,
  duration = 600,
  animateOnView = true,
  as: Tag = "span",
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(!animateOnView);

  const pieces = useMemo(() => {
    if (splitType === "words") return text.split(/(\s+)/);
    return Array.from(text);
  }, [text, splitType]);

  useEffect(() => {
    if (!animateOnView) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animateOnView]);

  const Component = Tag as React.ElementType;

  return (
    <Component
      ref={ref}
      className={cn("inline-block", className)}
      aria-label={text}
    >
      {pieces.map((piece, i) => {
        if (/^\s+$/.test(piece)) return <span key={i}>{piece}</span>;
        return (
          <span
            key={i}
            aria-hidden
            className="inline-block will-change-[transform,opacity,filter]"
            style={{
              opacity: shown ? 1 : 0,
              filter: shown ? "blur(0)" : "blur(8px)",
              transform: shown ? "translateY(0)" : "translateY(0.4em)",
              transition: `opacity ${duration}ms ease, transform ${duration}ms cubic-bezier(0.22,1,0.36,1), filter ${duration}ms ease`,
              transitionDelay: `${i * delay}ms`,
            }}
          >
            {piece}
          </span>
        );
      })}
    </Component>
  );
}
