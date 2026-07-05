"use client";

import { useEffect, useRef, useState } from "react";

const HEADLINE = "SKILL GALAXY";
const EXIT_MS = 1100;

type WarpStar = { x: number; y: number; z: number; pz: number };

export function OpeningScreen({ onEnter }: { onEnter: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const leavingRef = useRef(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let stars: WarpStar[] = [];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      stars = Array.from({ length: Math.round((W * H) / 2400) }, () => {
        const z = 0.2 + Math.random() * 0.8;
        return { x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z, pz: z };
      });
    };
    resize();
    window.addEventListener("resize", resize);

    let speed = 0.0006; // 平常時はゆっくり吸い込まれる
    let raf = 0;
    const frame = () => {
      // ワープ開始で加速していく
      const target = leavingRef.current ? 0.06 : reducedMotion ? 0.0002 : 0.0006;
      speed += (target - speed) * (leavingRef.current ? 0.06 : 1);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;

      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed;
        if (s.z <= 0.05) {
          s.x = (Math.random() - 0.5) * W;
          s.y = (Math.random() - 0.5) * H;
          s.z = 1;
          s.pz = 1;
        }
        const sx = cx + (s.x / s.z) * 0.9;
        const sy = cy + (s.y / s.z) * 0.9;
        const px = cx + (s.x / s.pz) * 0.9;
        const py = cy + (s.y / s.pz) * 0.9;
        const size = Math.min(2.2, (1 - s.z) * 2.4);
        const alpha = Math.min(1, (1 - s.z) * 1.4);
        if (leavingRef.current) {
          // 光の筋(ハイパースペース)
          ctx.strokeStyle = `rgba(190, 215, 255, ${alpha})`;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(226, 236, 255, ${alpha * 0.85})`;
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const enter = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setTimeout(onEnter, EXIT_MS);
  };

  return (
    <div
      onClick={enter}
      className={`fixed inset-0 z-50 cursor-pointer select-none overflow-hidden bg-black text-slate-100 ${
        leaving ? "sg-open-leave" : ""
      }`}
    >
      <style>{`
        @keyframes sg-star-ignite {
          0% { opacity: 0; transform: scale(0.1); }
          60% { opacity: 1; }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sg-char-rise {
          0% { opacity: 0; filter: blur(18px); transform: translateY(38px) scale(1.06); }
          100% { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
        }
        @keyframes sg-soft-rise {
          0% { opacity: 0; filter: blur(10px); transform: translateY(22px); }
          100% { opacity: 1; filter: blur(0); transform: translateY(0); }
        }
        @keyframes sg-aurora-a {
          0% { transform: translate(-12%, -6%) rotate(0deg) scale(1); }
          50% { transform: translate(10%, 8%) rotate(40deg) scale(1.25); }
          100% { transform: translate(-12%, -6%) rotate(0deg) scale(1); }
        }
        @keyframes sg-aurora-b {
          0% { transform: translate(10%, 6%) rotate(0deg) scale(1.15); }
          50% { transform: translate(-8%, -10%) rotate(-50deg) scale(1); }
          100% { transform: translate(10%, 6%) rotate(0deg) scale(1.15); }
        }
        @keyframes sg-shimmer {
          0% { background-position: -180% 0; }
          100% { background-position: 280% 0; }
        }
        @keyframes sg-open-out {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.6); filter: blur(6px); }
        }
        .sg-open-leave { animation: sg-open-out ${EXIT_MS}ms cubic-bezier(0.55, 0, 0.85, 0.3) forwards; }
        .sg-char { display: inline-block; opacity: 0; animation: sg-char-rise 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .sg-rise { opacity: 0; animation: sg-soft-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .sg-char, .sg-rise { animation-duration: 0.01s; }
          .sg-open-leave { animation-duration: 0.2s; }
        }
      `}</style>

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* オーロラ */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[90vmax] w-[90vmax] -translate-x-1/2 -translate-y-1/2 opacity-35 mix-blend-screen blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side at 35% 40%, rgba(56,189,248,0.5), transparent 65%), radial-gradient(closest-side at 68% 60%, rgba(168,85,247,0.45), transparent 62%)",
          animation: "sg-aurora-a 16s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 opacity-25 mix-blend-screen blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side at 55% 45%, rgba(244,114,182,0.4), transparent 60%), radial-gradient(closest-side at 40% 65%, rgba(99,102,241,0.4), transparent 65%)",
          animation: "sg-aurora-b 21s ease-in-out infinite",
        }}
      />

      {/* 恒星の点火 */}
      <div
        className="pointer-events-none absolute left-1/2 top-[38%] h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "#fff",
          boxShadow:
            "0 0 24px 6px rgba(255,255,255,0.9), 0 0 90px 40px rgba(125,211,252,0.5), 0 0 220px 110px rgba(129,140,248,0.28)",
          animation: "sg-star-ignite 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
        }}
      />

      {/* コピー */}
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <h1
          aria-label={HEADLINE}
          className="font-bold"
          style={{
            fontSize: "clamp(2.4rem, 8.5vw, 6.5rem)",
            letterSpacing: "0.14em",
            lineHeight: 1.05,
            textWrap: "balance",
          }}
        >
          {HEADLINE.split("").map((ch, i) => (
            <span
              key={i}
              aria-hidden
              className="sg-char bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-transparent"
              style={{ animationDelay: `${0.55 + i * 0.055}s` }}
            >
              {ch === " " ? " " : ch}
            </span>
          ))}
        </h1>

        <p
          className="sg-rise mt-8 text-slate-200"
          style={{
            fontSize: "clamp(1.15rem, 3.2vw, 1.9rem)",
            fontWeight: 200,
            letterSpacing: "0.12em",
            animationDelay: "1.5s",
          }}
        >
          スキルは、星になる。
        </p>
        <p
          className="sg-rise mt-2 text-slate-400"
          style={{
            fontSize: "clamp(1rem, 2.6vw, 1.5rem)",
            fontWeight: 200,
            letterSpacing: "0.12em",
            animationDelay: "1.95s",
          }}
        >
          つながりは、銀河になる。
        </p>

        <button
          onClick={enter}
          className="sg-rise group relative mt-12 overflow-hidden rounded-full bg-white px-10 py-3.5 text-sm font-semibold tracking-[0.2em] text-black transition-transform duration-300 hover:scale-105"
          style={{ animationDelay: "2.5s", boxShadow: "0 0 40px rgba(148,197,255,0.35)" }}
        >
          <span className="relative z-10">銀河へ</span>
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(115deg, transparent 30%, rgba(125,211,252,0.7) 48%, rgba(196,181,253,0.7) 52%, transparent 70%)",
              backgroundSize: "220% 100%",
              animation: "sg-shimmer 2.8s ease-in-out 3.2s infinite",
            }}
          />
        </button>

        <p
          className="sg-rise mt-6 text-[11px] tracking-[0.3em] text-slate-600"
          style={{ animationDelay: "3s" }}
        >
          CLICK ANYWHERE
        </p>
      </div>
    </div>
  );
}
