"use client";

import { useEffect, useRef } from "react";
import type { Skill } from "./types";
import { FALLBACK_COLOR } from "./types";

type SimNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  name: string;
  category: string;
  level: number;
  phase: number;
};

type Star = {
  x: number;
  y: number;
  size: number;
  layer: number; // 0=遠景 1=中景 2=近景
  phase: number;
};

type Nebula = {
  x: number;
  y: number;
  radius: number;
  color: string;
  drift: number;
};

export type FocusRequest = { id: string; nonce: number } | null;

type Props = {
  skills: Skill[];
  links: Array<[string, string]>;
  categoryColors: Record<string, string>;
  selectedId: string | null;
  dimmedIds: Set<string> | null;
  focusRequest: FocusRequest;
  onSelect: (id: string | null) => void;
};

const REPULSION = 2600;
const SPRING_K = 0.02;
const CENTER_G = 0.0012;
const CLUSTER_G = 0.0035;
const DAMPING = 0.88;
const MAX_SPEED = 5;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.6;

const NEBULA_COLORS = ["#5b21b6", "#1d4ed8", "#0e7490", "#9d174d"];

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function GalaxyCanvas({
  skills,
  links,
  categoryColors,
  selectedId,
  dimmedIds,
  focusRequest,
  onSelect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<Map<string, SimNode>>(new Map());
  const linksRef = useRef<Array<[string, string]>>([]);
  const cameraRef = useRef({ x: 0, y: 0, scale: 0.85 });
  const focusTargetRef = useRef<{ x: number; y: number; scale: number } | null>(null);
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const hoverIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const dimmedRef = useRef<Set<string> | null>(null);
  const onSelectRef = useRef(onSelect);
  const dragRef = useRef<{
    mode: "node" | "pan";
    nodeId: string | null;
    lastX: number;
    lastY: number;
    moved: number;
  } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistRef = useRef<number | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
    selectedIdRef.current = selectedId;
    dimmedRef.current = dimmedIds;
  }, [onSelect, selectedId, dimmedIds]);

  // スキルの増減・変更をシミュレーションノードへ反映する
  useEffect(() => {
    const nodes = nodesRef.current;
    const alive = new Set(skills.map((s) => s.id));
    for (const id of Array.from(nodes.keys())) {
      if (!alive.has(id)) nodes.delete(id);
    }
    for (const skill of skills) {
      let node = nodes.get(skill.id);
      if (!node) {
        // 既にあるリンク先の近くに生まれると馴染みやすい
        const anchor = skill.links.map((l) => nodes.get(l)).find(Boolean);
        const angle = Math.random() * Math.PI * 2;
        const dist = anchor ? 60 + Math.random() * 60 : 150 + Math.random() * 250;
        node = {
          id: skill.id,
          x: (anchor?.x ?? 0) + Math.cos(angle) * dist,
          y: (anchor?.y ?? 0) + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          r: 0,
          color: FALLBACK_COLOR,
          name: "",
          category: "",
          level: 1,
          phase: Math.random() * Math.PI * 2,
        };
        nodes.set(skill.id, node);
      }
      node.r = 9 + skill.level * 4;
      node.color = categoryColors[skill.category] ?? FALLBACK_COLOR;
      node.name = skill.name;
      node.category = skill.category;
      node.level = skill.level;
    }
    linksRef.current = links.filter(([a, b]) => nodes.has(a) && nodes.has(b));
  }, [skills, links, categoryColors]);

  // 検索結果やリストからの選択でカメラを対象へ寄せる
  useEffect(() => {
    if (!focusRequest) return;
    const node = nodesRef.current.get(focusRequest.id);
    if (!node) return;
    focusTargetRef.current = {
      x: node.x,
      y: node.y,
      scale: Math.max(cameraRef.current.scale, 1.1),
    };
  }, [focusRequest]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const regenerateSky = (w: number, h: number) => {
      const stars: Star[] = [];
      const count = Math.round((w * h) / 3200);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.4 + Math.random() * 1.4,
          layer: Math.floor(Math.random() * 3),
          phase: Math.random() * Math.PI * 2,
        });
      }
      starsRef.current = stars;
      nebulaeRef.current = NEBULA_COLORS.map((color, i) => ({
        x: (0.15 + 0.7 * Math.random()) * w,
        y: (0.15 + 0.7 * Math.random()) * h,
        radius: Math.max(w, h) * (0.3 + Math.random() * 0.25),
        color,
        drift: 0.5 + i * 0.35,
      }));
    };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      regenerateSky(rect.width, rect.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    const screenToWorld = (sx: number, sy: number) => {
      const { w, h } = sizeRef.current;
      const cam = cameraRef.current;
      return {
        x: (sx - w / 2) / cam.scale + cam.x,
        y: (sy - h / 2) / cam.scale + cam.y,
      };
    };

    const hitTest = (sx: number, sy: number): SimNode | null => {
      const { x, y } = screenToWorld(sx, sy);
      let best: SimNode | null = null;
      let bestDist = Infinity;
      for (const node of nodesRef.current.values()) {
        const d = Math.hypot(node.x - x, node.y - y);
        if (d < node.r + 6 && d < bestDist) {
          best = node;
          bestDist = d;
        }
      }
      return best;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const cam = cameraRef.current;
      const { w, h } = sizeRef.current;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale * Math.exp(-e.deltaY * 0.0012)));
      const wx = (sx - w / 2) / cam.scale + cam.x;
      const wy = (sy - h / 2) / cam.scale + cam.y;
      cam.scale = next;
      cam.x = wx - (sx - w / 2) / next;
      cam.y = wy - (sy - h / 2) / next;
      focusTargetRef.current = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      canvas.setPointerCapture(e.pointerId);
      pointersRef.current.set(e.pointerId, { x: sx, y: sy });
      if (pointersRef.current.size === 2) {
        const [a, b] = Array.from(pointersRef.current.values());
        pinchDistRef.current = Math.hypot(a.x - b.x, a.y - b.y);
        dragRef.current = null;
        return;
      }
      const node = hitTest(sx, sy);
      dragRef.current = {
        mode: node ? "node" : "pan",
        nodeId: node?.id ?? null,
        lastX: sx,
        lastY: sy,
        moved: 0,
      };
      focusTargetRef.current = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const cam = cameraRef.current;

      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: sx, y: sy });
      }
      if (pointersRef.current.size === 2 && pinchDistRef.current !== null) {
        const [a, b] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > 0 && pinchDistRef.current > 0) {
          cam.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale * (dist / pinchDistRef.current)));
        }
        pinchDistRef.current = dist;
        return;
      }

      const drag = dragRef.current;
      if (!drag) {
        const node = hitTest(sx, sy);
        hoverIdRef.current = node?.id ?? null;
        canvas.style.cursor = node ? "pointer" : "grab";
        return;
      }
      const dx = sx - drag.lastX;
      const dy = sy - drag.lastY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.lastX = sx;
      drag.lastY = sy;
      if (drag.mode === "node" && drag.nodeId) {
        const node = nodesRef.current.get(drag.nodeId);
        if (node) {
          const world = screenToWorld(sx, sy);
          node.x = world.x;
          node.y = world.y;
          node.vx = 0;
          node.vy = 0;
        }
        canvas.style.cursor = "grabbing";
      } else {
        cam.x -= dx / cam.scale;
        cam.y -= dy / cam.scale;
        canvas.style.cursor = "grabbing";
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) pinchDistRef.current = null;
      const drag = dragRef.current;
      dragRef.current = null;
      canvas.style.cursor = "grab";
      if (!drag || drag.moved > 6) return;
      if (drag.mode === "node" && drag.nodeId) {
        onSelectRef.current(drag.nodeId);
      } else {
        onSelectRef.current(null);
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";

    let raf = 0;
    let last = performance.now();

    const step = (dtScale: number, time: number) => {
      const nodes = Array.from(nodesRef.current.values());
      const nodeMap = nodesRef.current;

      // カテゴリ(星系)ごとの重心を計算して緩やかに引き寄せる
      const centroids = new Map<string, { x: number; y: number; n: number }>();
      for (const node of nodes) {
        const c = centroids.get(node.category) ?? { x: 0, y: 0, n: 0 };
        c.x += node.x;
        c.y += node.y;
        c.n += 1;
        centroids.set(node.category, c);
      }

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d2 = 1;
          }
          const d = Math.sqrt(d2);
          const force = (REPULSION * ((a.r + b.r) / 40)) / d2;
          const fx = (dx / d) * force * dtScale;
          const fy = (dy / d) * force * dtScale;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      for (const [ia, ib] of linksRef.current) {
        const a = nodeMap.get(ia);
        const b = nodeMap.get(ib);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(Math.hypot(dx, dy), 1);
        const rest = 110 + a.r + b.r;
        const force = SPRING_K * (d - rest) * dtScale;
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      for (const node of nodes) {
        node.vx -= node.x * CENTER_G * dtScale;
        node.vy -= node.y * CENTER_G * dtScale;
        const c = centroids.get(node.category);
        if (c && c.n > 1) {
          node.vx += (c.x / c.n - node.x) * CLUSTER_G * dtScale;
          node.vy += (c.y / c.n - node.y) * CLUSTER_G * dtScale;
        }
        // 惑星らしい微小な揺らぎ
        node.vx += Math.cos(time * 0.4 + node.phase) * 0.012;
        node.vy += Math.sin(time * 0.3 + node.phase) * 0.012;

        node.vx *= DAMPING;
        node.vy *= DAMPING;
        const speed = Math.hypot(node.vx, node.vy);
        if (speed > MAX_SPEED) {
          node.vx = (node.vx / speed) * MAX_SPEED;
          node.vy = (node.vy / speed) * MAX_SPEED;
        }
        node.x += node.vx * dtScale;
        node.y += node.vy * dtScale;
      }
    };

    const draw = (time: number) => {
      const { w, h } = sizeRef.current;
      const cam = cameraRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // --- 宇宙の背景 ---
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#04040f");
      bg.addColorStop(0.5, "#070718");
      bg.addColorStop(1, "#0a0a20");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (const nebula of nebulaeRef.current) {
        const px = ((nebula.x - cam.x * cam.scale * 0.06 + Math.sin(time * 0.05 * nebula.drift) * 40) % (w + nebula.radius * 2) + w + nebula.radius * 2) % (w + nebula.radius * 2) - nebula.radius;
        const py = nebula.y - cam.y * cam.scale * 0.06 + Math.cos(time * 0.04 * nebula.drift) * 30;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, nebula.radius);
        grad.addColorStop(0, hexToRgba(nebula.color, 0.14));
        grad.addColorStop(0.6, hexToRgba(nebula.color, 0.05));
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(px - nebula.radius, py - nebula.radius, nebula.radius * 2, nebula.radius * 2);
      }

      for (const star of starsRef.current) {
        const parallax = [0.04, 0.1, 0.2][star.layer];
        const sx = ((star.x - cam.x * cam.scale * parallax) % w + w) % w;
        const sy = ((star.y - cam.y * cam.scale * parallax) % h + h) % h;
        const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * (0.8 + star.layer * 0.5) + star.phase));
        ctx.globalAlpha = twinkle * (0.35 + star.layer * 0.25);
        ctx.fillStyle = star.layer === 2 ? "#e0f2fe" : "#ffffff";
        ctx.beginPath();
        ctx.arc(sx, sy, star.size * (0.7 + star.layer * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- ワールド座標へ ---
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(cam.scale, cam.scale);
      ctx.translate(-cam.x, -cam.y);

      const nodeMap = nodesRef.current;
      const hoverId = hoverIdRef.current;
      const activeId = selectedIdRef.current ?? hoverId;
      const dimmed = dimmedRef.current;

      const neighborIds = new Set<string>();
      if (activeId) {
        neighborIds.add(activeId);
        for (const [a, b] of linksRef.current) {
          if (a === activeId) neighborIds.add(b);
          if (b === activeId) neighborIds.add(a);
        }
      }

      // リンク(軌道線)
      for (const [ia, ib] of linksRef.current) {
        const a = nodeMap.get(ia);
        const b = nodeMap.get(ib);
        if (!a || !b) continue;
        const touchesActive = activeId !== null && (ia === activeId || ib === activeId);
        const isDimmed = dimmed !== null && (dimmed.has(ia) || dimmed.has(ib));
        let alpha = touchesActive ? 0.65 : 0.16;
        if (isDimmed && !touchesActive) alpha = 0.04;
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, hexToRgba(a.color, alpha));
        grad.addColorStop(1, hexToRgba(b.color, alpha));
        ctx.strokeStyle = grad;
        ctx.lineWidth = touchesActive ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        if (touchesActive) {
          // 選択中のリンク上を流れる光の粒
          const t = (time * 0.35 + (ia.charCodeAt(0) % 7) * 0.13) % 1;
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 惑星(小さい順に描いて大きい惑星を手前に)
      const sorted = Array.from(nodeMap.values()).sort((a, b) => a.r - b.r);
      for (const node of sorted) {
        const isActive = node.id === activeId;
        const isNeighbor = neighborIds.has(node.id);
        const isDimmed = dimmed !== null && dimmed.has(node.id) && !isActive;
        const fade = isDimmed ? 0.16 : activeId && !isNeighbor ? 0.35 : 1;

        // 大気のグロー
        const glow = ctx.createRadialGradient(node.x, node.y, node.r * 0.4, node.x, node.y, node.r * 2.6);
        glow.addColorStop(0, hexToRgba(node.color, 0.5 * fade));
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 2.6, 0, Math.PI * 2);
        ctx.fill();

        // 惑星本体
        const body = ctx.createRadialGradient(
          node.x - node.r * 0.35,
          node.y - node.r * 0.4,
          node.r * 0.15,
          node.x,
          node.y,
          node.r,
        );
        body.addColorStop(0, hexToRgba("#ffffff", 0.95 * fade));
        body.addColorStop(0.25, hexToRgba(node.color, 0.98 * fade));
        body.addColorStop(1, hexToRgba("#050510", 0.9));
        ctx.globalAlpha = fade;
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();

        // レベル4以上には土星のような環
        if (node.level >= 4) {
          ctx.strokeStyle = hexToRgba(node.color, 0.55 * fade);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(node.x, node.y, node.r * 1.7, node.r * 0.55, -0.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // 選択中: 脈打つリングと周回する衛星
        if (node.id === selectedIdRef.current) {
          const pulse = node.r + 10 + Math.sin(time * 2.4) * 3;
          ctx.strokeStyle = hexToRgba("#ffffff", 0.7);
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulse, time * 0.4, time * 0.4 + Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          const moonAngle = time * 1.4;
          const mx = node.x + Math.cos(moonAngle) * (pulse + 6);
          const my = node.y + Math.sin(moonAngle) * (pulse + 6);
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath();
          ctx.arc(mx, my, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (node.id === hoverId) {
          ctx.strokeStyle = hexToRgba(node.color, 0.8);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r + 7, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();

      // --- ラベルはスクリーン座標で描く(ズームしても読める) ---
      const labelBase = Math.min(1, Math.max(0, (cam.scale - 0.42) / 0.3));
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const node of sorted) {
        const isActive = node.id === activeId;
        const isDimmed = dimmed !== null && dimmed.has(node.id) && !isActive;
        const alpha = isActive ? 1 : isDimmed ? 0.1 : labelBase * 0.8;
        if (alpha <= 0.02) continue;
        const sx = (node.x - cam.x) * cam.scale + w / 2;
        const sy = (node.y - cam.y) * cam.scale + h / 2;
        if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
        ctx.font = isActive ? "600 13px system-ui, sans-serif" : "500 11px system-ui, sans-serif";
        ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 4;
        ctx.fillText(node.name, sx, sy + node.r * cam.scale + 8);
        ctx.shadowBlur = 0;
      }
    };

    const frame = (now: number) => {
      const dtScale = Math.min((now - last) / 16.7, 3);
      last = now;
      const time = now / 1000;

      const focus = focusTargetRef.current;
      if (focus) {
        const cam = cameraRef.current;
        const node = nodesRef.current.get(selectedIdRef.current ?? "");
        if (node) {
          focus.x = node.x;
          focus.y = node.y;
        }
        cam.x += (focus.x - cam.x) * 0.08;
        cam.y += (focus.y - cam.y) * 0.08;
        cam.scale += (focus.scale - cam.scale) * 0.08;
        if (Math.hypot(focus.x - cam.x, focus.y - cam.y) < 2 && Math.abs(focus.scale - cam.scale) < 0.01) {
          focusTargetRef.current = null;
        }
      }

      step(dtScale, time);
      draw(time);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
