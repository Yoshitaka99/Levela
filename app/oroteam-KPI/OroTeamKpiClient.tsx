"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Flame,
  Gauge,
  Lock,
  LockOpen,
  RefreshCw,
  Save,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { OroTeamKpiData, OroTeamMemberKpi } from "../api/oroteam-kpi/route";

const seatRateOptions = [60, 65, 70, 75];
type GoalDraft = OroTeamKpiData["editableGoals"];
type GoalMember = GoalDraft["members"][number];

const nf = new Intl.NumberFormat("ja-JP");

function formatNumber(value: number) {
  return nf.format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function signed(value: number) {
  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numberFromInput(value: string, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function plannedSeats(member: GoalMember, seatRate: number) {
  return Math.round(member.targetAppointments * (seatRate / 100));
}

function expectedClosed(member: GoalMember, seatRate: number) {
  return Math.round(plannedSeats(member, seatRate) * (member.minCloseRate / 100));
}

function withBalancedRates(draft: GoalDraft, seatRate: number, protectedName?: string): GoalDraft {
  const targetClosed = draft.teamTargets.closed;
  const fixedMembers = draft.members.filter((member) => member.lockedCloseRate || member.name === protectedName);
  const adjustableMembers = draft.members.filter((member) => !member.lockedCloseRate && member.name !== protectedName);
  const fixedExpected = fixedMembers.reduce((sum, member) => sum + plannedSeats(member, seatRate) * (member.minCloseRate / 100), 0);
  const adjustableSeats = adjustableMembers.reduce((sum, member) => sum + plannedSeats(member, seatRate), 0);

  if (!adjustableMembers.length || adjustableSeats <= 0) return draft;

  const nextRate = Math.round(clamp(((targetClosed - fixedExpected) / adjustableSeats) * 100, 0, 100));
  return {
    ...draft,
    members: draft.members.map((member) =>
      member.lockedCloseRate || member.name === protectedName
        ? member
        : {
            ...member,
            minCloseRate: nextRate,
          },
    ),
  };
}

function goalPreview(draft: GoalDraft, seatRate: number) {
  const targetAppointments = draft.members.reduce((sum, member) => sum + member.targetAppointments, 0);
  const projectedSeated = draft.members.reduce((sum, member) => sum + plannedSeats(member, seatRate), 0);
  const projectedClosed = draft.members.reduce((sum, member) => sum + expectedClosed(member, seatRate), 0);
  const overallRate = projectedSeated ? (projectedClosed / projectedSeated) * 100 : 0;

  return {
    targetAppointments,
    projectedSeated,
    projectedClosed,
    overallRate,
    closedGap: projectedClosed - draft.teamTargets.closed,
  };
}

function withMemberPlanTotals(draft: GoalDraft, seatRate: number): GoalDraft {
  const preview = goalPreview(draft, seatRate);
  return {
    ...draft,
    teamTargets: {
      ...draft.teamTargets,
      appointments: preview.targetAppointments,
      seated: preview.projectedSeated,
      closeRate: preview.projectedSeated ? Math.round((draft.teamTargets.closed / preview.projectedSeated) * 100) : draft.teamTargets.closeRate,
    },
  };
}

function statusLabel(member: OroTeamMemberKpi) {
  if (member.remainingClosed <= 0) return { label: "達成圏", className: "border-emerald-300/40 bg-emerald-400/10 text-emerald-100" };
  if (member.currentCloseRate && member.currentCloseRate < member.minCloseRate) {
    return { label: "要改善", className: "border-red-300/45 bg-red-500/15 text-red-100" };
  }
  if (member.remainingClosed >= 10) return { label: "不足大", className: "border-orange-300/45 bg-orange-400/15 text-orange-100" };
  return { label: "追撃", className: "border-amber-300/45 bg-amber-300/15 text-amber-100" };
}

function PanelTitle({ step, title, note }: { step: string; title: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-400 text-xs font-black text-black">
          {step}
        </span>
        <h3 className="text-lg font-black text-white">{title}</h3>
      </div>
      {note ? <p className="text-sm leading-5 text-white/48">{note}</p> : null}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone = "orange",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "orange" | "red" | "amber" | "cyan";
}) {
  const toneClass = {
    orange: "border-orange-300/30 bg-orange-500/10 text-orange-100",
    red: "border-red-300/35 bg-red-500/12 text-red-100",
    amber: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    cyan: "border-cyan-300/25 bg-cyan-400/8 text-cyan-100",
  }[tone];

  return (
    <section className={`rounded-2xl border p-4 shadow-xl shadow-black/25 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase text-white/48">{label}</p>
        <div className="text-white/70">{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-black text-white sm:text-4xl">{value}</p>
      <p className="mt-2 text-sm leading-5 text-white/58">{sub}</p>
    </section>
  );
}

function StatPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const toneClass = {
    neutral: "border-white/10 bg-white/[0.04] text-white",
    good: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
    warn: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    bad: "border-red-300/30 bg-red-500/12 text-red-100",
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-bold text-white/45">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function NumberInput({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-xl border border-orange-300/18 bg-[#160b07] p-3">
      <span className="block text-[11px] font-black uppercase text-orange-100/58">{label}</span>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-orange-300/28 bg-black/48 px-3 focus-within:border-orange-200">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 min-w-0 flex-1 bg-transparent text-2xl font-black text-white outline-none"
        />
        {suffix ? <span className="text-sm font-black text-orange-100/78">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SelectBox({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-xl border border-cyan-300/14 bg-[#071415] p-3">
      <span className="block text-[11px] font-black uppercase text-cyan-100/58">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-cyan-300/24 bg-black/45 px-3 text-base font-black text-white outline-none focus:border-cyan-100"
      >
        {children}
      </select>
    </label>
  );
}

function CanvasHeatBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let animationId = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.offsetWidth * ratio);
      canvas.height = Math.floor(canvas.offsetHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      context.clearRect(0, 0, width, height);

      const gradient = context.createRadialGradient(width * 0.5, -80, 10, width * 0.5, 40, width * 0.75);
      gradient.addColorStop(0, "rgba(255, 88, 28, 0.22)");
      gradient.addColorStop(0.42, "rgba(225, 29, 72, 0.12)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.lineWidth = 1;
      for (let index = 0; index < 16; index += 1) {
        const y = 36 + index * 28;
        const wave = Math.sin(frame * 0.018 + index * 0.7) * 18;
        const alpha = 0.05 + index * 0.003;
        context.strokeStyle = `rgba(255, 168, 72, ${alpha})`;
        context.beginPath();
        context.moveTo(-40, y + wave);
        context.bezierCurveTo(width * 0.25, y - 46 - wave, width * 0.72, y + 54 + wave, width + 40, y - wave);
        context.stroke();
      }

      for (let index = 0; index < 48; index += 1) {
        const x = ((index * 97 + frame * 0.45) % (width + 120)) - 60;
        const y = (index * 53 + Math.sin(frame * 0.02 + index) * 26) % Math.max(height, 1);
        const radius = 1.2 + (index % 4) * 0.55;
        context.fillStyle = `rgba(255, ${120 + (index % 5) * 20}, 48, ${0.08 + (index % 6) * 0.018})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }

      frame += 1;
      if (!reducedMotion) animationId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] w-full opacity-90" aria-hidden="true" />;
}

function RateStepper({
  member,
  onRateChange,
  compact = false,
}: {
  member: GoalMember;
  onRateChange: (value: string) => void;
  compact?: boolean;
}) {
  const changeRateBy = (delta: number) => onRateChange(String(clamp(member.minCloseRate + delta, 0, 100)));
  const buttonClass = compact ? "h-8 rounded-lg text-base" : "h-10 rounded-lg text-lg";
  const inputClass = compact ? "h-8 text-base" : "h-10 text-lg";

  return (
    <div className={`grid ${compact ? "grid-cols-[30px_66px_30px]" : "grid-cols-[34px_72px_34px]"} gap-1.5`}>
      <button
        type="button"
        onClick={() => changeRateBy(-1)}
        className={`${buttonClass} border border-white/10 bg-white/[0.05] font-black text-white/80`}
        aria-label={`${member.name}の成約率を下げる`}
      >
        -
      </button>
      <div className={`flex ${inputClass} items-center rounded-lg border border-orange-300/24 bg-black/42 px-1.5 focus-within:border-orange-200`}>
        <input
          type="number"
          min={0}
          max={100}
          value={member.minCloseRate}
          onChange={(event) => onRateChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-center font-black text-white outline-none"
        />
        <span className="text-xs font-black text-orange-100/70">%</span>
      </div>
      <button
        type="button"
        onClick={() => changeRateBy(1)}
        className={`${buttonClass} border border-white/10 bg-white/[0.05] font-black text-white/80`}
        aria-label={`${member.name}の成約率を上げる`}
      >
        +
      </button>
    </div>
  );
}

function MemberGoalCard({
  member,
  seatRate,
  onAppointmentChange,
  onRateChange,
  onToggleLock,
}: {
  member: GoalMember;
  seatRate: number;
  onAppointmentChange: (value: string) => void;
  onRateChange: (value: string) => void;
  onToggleLock: () => void;
}) {
  const plannedSeatCount = plannedSeats(member, seatRate);
  const expectedClosedCount = expectedClosed(member, seatRate);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#100806] px-3 py-2.5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-lg font-black text-white">{member.name}</h3>
        <button
          type="button"
          onClick={onToggleLock}
          className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-black ${
            member.lockedCloseRate
              ? "border-amber-300/45 bg-amber-300/16 text-amber-100"
              : "border-white/12 bg-white/[0.05] text-white/68"
          }`}
        >
          {member.lockedCloseRate ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
          {member.lockedCloseRate ? "固定中" : "自動"}
        </button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[96px_148px_86px_86px] sm:items-end lg:grid-cols-[96px_148px_86px_86px]">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black text-orange-100/55">配分アポ</span>
          <input
            type="number"
            min={0}
            value={member.targetAppointments}
            onChange={(event) => onAppointmentChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-orange-300/24 bg-black/42 px-3 text-lg font-black text-white outline-none focus:border-orange-200"
          />
        </label>

        <div>
          <span className="mb-1 block text-[10px] font-black text-orange-100/55">成約率</span>
          <RateStepper member={member} onRateChange={onRateChange} />
        </div>

        <div className="rounded-xl border border-cyan-300/16 bg-cyan-400/6 px-2.5 py-2">
          <p className="text-[10px] font-black text-cyan-100/55">予測着座</p>
          <p className="mt-0.5 text-base font-black text-white">{formatNumber(plannedSeatCount)}</p>
        </div>
        <div className="rounded-xl border border-cyan-300/16 bg-cyan-400/6 px-2.5 py-2">
          <p className="text-[10px] font-black text-cyan-100/55">必要成約</p>
          <p className="mt-0.5 text-base font-black text-white">{formatNumber(expectedClosedCount)}</p>
        </div>
      </div>
    </article>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-cyan-300/14 bg-cyan-400/6 px-2.5 py-2">
      <p className="truncate text-[10px] font-black text-cyan-100/55">{label}</p>
      <p className="mt-0.5 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function DesktopMemberGoalGrid({
  members,
  seatRate,
  onAppointmentChange,
  onRateChange,
  onToggleLock,
}: {
  members: GoalMember[];
  seatRate: number;
  onAppointmentChange: (name: string, value: string) => void;
  onRateChange: (name: string, value: string) => void;
  onToggleLock: (name: string) => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {members.map((member) => {
        const plannedSeatCount = plannedSeats(member, seatRate);
        const expectedClosedCount = expectedClosed(member, seatRate);
        return (
          <article
            key={member.name}
            className="rounded-2xl border border-white/10 bg-[#0d0705]/82 p-3 shadow-lg shadow-black/18 transition hover:border-orange-300/24 hover:bg-orange-400/[0.045]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate text-xl font-black text-white">{member.name}</h3>
              <button
                type="button"
                onClick={() => onToggleLock(member.name)}
                className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-black ${
                  member.lockedCloseRate
                    ? "border-amber-300/45 bg-amber-300/16 text-amber-100"
                    : "border-white/12 bg-white/[0.05] text-white/68"
                }`}
              >
                {member.lockedCloseRate ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                {member.lockedCloseRate ? "固定" : "自動"}
              </button>
            </div>

            <div className="grid grid-cols-[110px_minmax(180px,1fr)_96px_96px] items-end gap-3">
              <label className="block min-w-0">
                <span className="mb-1 block text-[10px] font-black text-orange-100/55">配分アポ</span>
                <input
                  type="number"
                  min={0}
                  value={member.targetAppointments}
                  onChange={(event) => onAppointmentChange(member.name, event.target.value)}
                  className="h-10 w-full rounded-lg border border-orange-300/22 bg-black/42 px-3 text-lg font-black text-white outline-none focus:border-orange-200"
                />
              </label>

              <div className="min-w-0">
                <span className="mb-1 block text-[10px] font-black text-orange-100/55">成約率</span>
                <RateStepper member={member} onRateChange={(value) => onRateChange(member.name, value)} compact />
              </div>

              <CompactMetric label="予測着座" value={formatNumber(plannedSeatCount)} />
              <CompactMetric label="必要成約" value={formatNumber(expectedClosedCount)} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MemberResultCard({ member, maxRemaining }: { member: OroTeamMemberKpi; maxRemaining: number }) {
  const state = statusLabel(member);
  const width = maxRemaining > 0 ? Math.min(100, Math.max(0, (member.remainingClosed / maxRemaining) * 100)) : 0;

  return (
    <article className="rounded-2xl border border-white/10 bg-[#130d0b]/90 p-3 shadow-xl shadow-black/25">
      <div className="grid gap-3 lg:grid-cols-[190px_1fr] lg:items-center">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${state.className}`}>{state.label}</span>
          <h2 className="mt-2 truncate text-xl font-black text-white">{member.name}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatPill label="予約/配分" value={`${formatNumber(member.currentAppointments)} / ${formatNumber(member.targetAppointments)}`} />
          <StatPill label="着座/予測" value={`${formatNumber(member.actualSeated)} / ${formatNumber(member.projectedSeated)}`} />
          <StatPill label="成約/必要" value={`${formatNumber(member.actualClosed)} / ${formatNumber(member.requiredClosed)}`} />
          <StatPill label="残り/率" value={`${formatNumber(member.remainingClosed)} / ${formatPercent(member.currentCloseRate)}`} tone={member.remainingClosed > 0 ? "warn" : "good"} />
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-300" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-white/55">
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1">今日 {formatNumber(member.pace.today)}</span>
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1">今週 {formatNumber(member.pace.thisWeek)}</span>
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1">月末 {formatNumber(member.pace.month)}</span>
      </div>
    </article>
  );
}

export function OroTeamKpiClient({ initialData }: { initialData: OroTeamKpiData }) {
  const [data, setData] = useState(initialData);
  const [month, setMonth] = useState(initialData.selectedMonth);
  const [seatRate, setSeatRate] = useState(initialData.seatRate);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(initialData.editableGoals);
  const [goalDirty, setGoalDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [lastError, setLastError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLastError("");
      try {
        const params = new URLSearchParams({ month, seatRate: String(seatRate), t: String(Date.now()) });
        const response = await fetch(`/api/oroteam-kpi?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextData = (await response.json()) as OroTeamKpiData;
        if (!cancelled) {
          setData(nextData);
          if (!goalDirty) setGoalDraft(nextData.editableGoals);
        }
      } catch (error) {
        if (!cancelled) setLastError(error instanceof Error ? error.message : "更新に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [month, seatRate, goalDirty]);

  const preview = useMemo(() => goalPreview(goalDraft, seatRate), [goalDraft, seatRate]);
  const maxRemaining = useMemo(() => Math.max(1, ...data.members.map((member) => member.remainingClosed)), [data.members]);
  const sortedMembers = useMemo(
    () => [...data.members].sort((a, b) => b.remainingClosed - a.remainingClosed || b.requiredClosed - a.requiredClosed),
    [data.members],
  );
  const targetProgress = Math.min(100, data.totals.targetAchievementRate);
  const planTone = preview.closedGap >= 0 ? "good" : preview.closedGap >= -3 ? "warn" : "bad";

  const updateTeamGoal = (key: keyof GoalDraft["teamTargets"], value: string) => {
    const numeric = numberFromInput(value);
    setGoalDirty(true);
    setSaveMessage("");
    setGoalDraft((current) => {
      const nextTargets = { ...current.teamTargets, [key]: numeric };
      if (key === "closed" && nextTargets.seated > 0) {
        nextTargets.closeRate = Math.round((numeric / nextTargets.seated) * 100);
      }
      if (key === "closeRate") {
        nextTargets.closed = Math.round(nextTargets.seated * (numeric / 100));
      }
      return withBalancedRates({ ...current, teamTargets: nextTargets }, seatRate);
    });
  };

  const updateMemberAppointment = (name: string, value: string) => {
    const numeric = numberFromInput(value);
    setGoalDirty(true);
    setSaveMessage("");
    setGoalDraft((current) =>
      withBalancedRates(
        withMemberPlanTotals(
          {
            ...current,
            members: current.members.map((member) => (member.name === name ? { ...member, targetAppointments: numeric } : member)),
          },
          seatRate,
        ),
        seatRate,
      ),
    );
  };

  const updateMemberRate = (name: string, value: string) => {
    const numeric = clamp(Math.round(numberFromInput(value)), 0, 100);
    setGoalDirty(true);
    setSaveMessage("");
    setGoalDraft((current) =>
      withBalancedRates(
        {
          ...current,
          members: current.members.map((member) => (member.name === name ? { ...member, minCloseRate: numeric } : member)),
        },
        seatRate,
        name,
      ),
    );
  };

  const toggleMemberLock = (name: string) => {
    setGoalDirty(true);
    setSaveMessage("");
    setGoalDraft((current) =>
      withBalancedRates(
        {
          ...current,
          members: current.members.map((member) =>
            member.name === name ? { ...member, lockedCloseRate: !member.lockedCloseRate } : member,
          ),
        },
        seatRate,
      ),
    );
  };

  const updateSeatRate = (value: string) => {
    const nextSeatRate = Number(value);
    setGoalDirty(true);
    setSaveMessage("");
    setSeatRate(nextSeatRate);
    setGoalDraft((current) => withBalancedRates(withMemberPlanTotals(current, nextSeatRate), nextSeatRate));
  };

  const saveGoals = async () => {
    setSavingGoals(true);
    setSaveMessage("");
    setLastError("");
    try {
      const response = await fetch("/api/oroteam-kpi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...goalDraft, month }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { data?: OroTeamKpiData };
      if (payload.data) {
        setData(payload.data);
        setGoalDraft(payload.data.editableGoals);
      }
      setGoalDirty(false);
      setSaveMessage("保存しました");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSavingGoals(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080403] text-white">
      <CanvasHeatBackdrop />
      <div className="absolute inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(ellipse_at_top,#7f1d1d_0%,#2a0904_42%,transparent_72%)] opacity-80" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1560px] flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-orange-300/20 bg-[#120805]/88 p-5 shadow-2xl shadow-red-950/40 backdrop-blur-xl sm:p-8">
          <div className="grid gap-5 xl:grid-cols-[1fr_420px] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-400/10 px-3 py-1 text-xs font-bold uppercase text-orange-100">
                <Flame className="h-4 w-4" />
                ORO TEAM KPI
              </div>
              <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">
                8月オロチーム
                <span className="block bg-gradient-to-r from-red-300 via-orange-200 to-amber-100 bg-clip-text text-transparent">
                  目標達成ボード
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-orange-100/60 sm:text-base">
                面談日ベースで予約、着座、成約を集計。目標値を動かすと、必要成約数と不足分を即時に確認できます。
              </p>
            </div>
            <div className="hidden rounded-2xl border border-orange-300/20 bg-black/28 p-4 xl:block">
              <p className="text-xs font-black uppercase text-orange-100/50">Command signal</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatPill label="残り成約" value={formatNumber(data.totals.remainingClosedToTarget)} tone={data.totals.remainingClosedToTarget > 0 ? "warn" : "good"} />
                <StatPill label="計画差分" value={signed(preview.closedGap)} tone={planTone} />
                <StatPill label="計画率" value={formatPercent(preview.overallRate)} />
              </div>
            </div>
          </div>
          {lastError ? (
            <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {lastError}
            </div>
          ) : null}
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Target className="h-5 w-5" />}
            label="実績 / 成約目標"
            value={`${formatNumber(data.totals.actualClosed)} / ${formatNumber(data.totals.targetClosed)}`}
            sub={`残り ${formatNumber(data.totals.remainingClosedToTarget)}件 / 達成率 ${formatPercent(data.totals.targetAchievementRate)}`}
            tone="red"
          />
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="実績 / 予約"
            value={formatNumber(data.totals.currentAppointments)}
            sub={`配分 ${formatNumber(data.totals.targetAppointments)} / 差分 ${signed(data.totals.appointmentGap)}`}
            tone="orange"
          />
          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="予測 / 着座"
            value={formatNumber(data.totals.projectedSeated)}
            sub={`目標 ${formatNumber(data.totals.targetSeated)} / 差分 ${signed(data.totals.seatedGap)}`}
            tone="amber"
          />
          <SummaryCard
            icon={<Gauge className="h-5 w-5" />}
            label="計画 / 必要成約"
            value={formatNumber(data.totals.requiredClosedAtMemberRates)}
            sub={`メンバー最低ライン合算 / 差分 ${signed(data.totals.actualClosed - data.totals.requiredClosedAtMemberRates)}`}
            tone="cyan"
          />
        </section>

        <section className="rounded-3xl border border-orange-300/20 bg-[#120705]/92 p-4 shadow-xl shadow-red-950/20 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-orange-200/50">Goal control</p>
              <h2 className="mt-1 text-2xl font-black">操作・目標値設定</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                オレンジ枠は手入力、青枠は自動計算です。成約率を触ると、固定していないメンバーを自動調整します。
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={saveGoals}
                disabled={savingGoals}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-orange-200/30 bg-gradient-to-r from-red-600 to-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingGoals ? "保存中" : "保存"}
              </button>
              <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-orange-100">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {new Date(data.updatedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
          {saveMessage ? <p className="mt-3 text-sm font-bold text-amber-100">{saveMessage}</p> : null}

          <div className="mt-5 grid gap-4 xl:grid-cols-[360px_1fr]">
            <div className="rounded-2xl border border-cyan-300/18 bg-[#071113] p-4">
              <PanelTitle step="1" title="表示条件" note="どの月を、何%着座想定で見るか。" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SelectBox
                  label="対象月"
                  value={month}
                  onChange={(value) => {
                    setGoalDirty(false);
                    setMonth(value);
                  }}
                >
                  {data.availableMonths.map((option) => (
                    <option key={option.value} value={option.value} className="bg-black">
                      {option.label}
                    </option>
                  ))}
                </SelectBox>
                <SelectBox label="着座率" value={seatRate} onChange={updateSeatRate}>
                  {seatRateOptions.map((rate) => (
                    <option key={rate} value={rate} className="bg-black">
                      {rate}%
                    </option>
                  ))}
                </SelectBox>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-300/18 bg-[#160905] p-4">
              <PanelTitle step="2" title="チーム目標" note="チーム全体で達成したいゴール。ここが逆算の基準です。" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <NumberInput label="目標アポ" value={goalDraft.teamTargets.appointments} onChange={(value) => updateTeamGoal("appointments", value)} />
                <NumberInput label="目標着座" value={goalDraft.teamTargets.seated} onChange={(value) => updateTeamGoal("seated", value)} />
                <NumberInput label="目標成約" value={goalDraft.teamTargets.closed} onChange={(value) => updateTeamGoal("closed", value)} />
                <NumberInput label="全体成約率" value={goalDraft.teamTargets.closeRate} suffix="%" onChange={(value) => updateTeamGoal("closeRate", value)} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/22 p-4">
            <PanelTitle step="3" title="計画サマリー" note="今の入力値から見た、月末の計画値です。" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatPill label="配分アポ合計" value={formatNumber(preview.targetAppointments)} />
              <StatPill label="計画着座" value={formatNumber(preview.projectedSeated)} />
              <StatPill label="計画成約" value={formatNumber(preview.projectedClosed)} tone={planTone} />
              <StatPill label="目標差分" value={signed(preview.closedGap)} tone={planTone} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/16 p-4">
            <PanelTitle step="4" title="メンバー調整" note="成約率は - / + か直接入力。固定中の人は自動調整されません。" />
            <div className="mt-4 hidden xl:block">
              <DesktopMemberGoalGrid
                members={goalDraft.members}
                seatRate={seatRate}
                onAppointmentChange={updateMemberAppointment}
                onRateChange={updateMemberRate}
                onToggleLock={toggleMemberLock}
              />
            </div>
            <div className="mt-4 grid gap-2 xl:hidden">
              {goalDraft.members.map((member) => (
                <MemberGoalCard
                  key={member.name}
                  member={member}
                  seatRate={seatRate}
                  onAppointmentChange={(value) => updateMemberAppointment(member.name, value)}
                  onRateChange={(value) => updateMemberRate(member.name, value)}
                  onToggleLock={() => toggleMemberLock(member.name)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-orange-300/20 bg-[#100908] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-orange-200/50">Target heat</p>
              <h2 className="mt-1 text-2xl font-black">チーム進捗</h2>
            </div>
            <div className="text-sm text-white/55">全体成約率基準の必要成約 {formatNumber(data.totals.requiredClosedAtTeamRate)}件</div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-white/45">
              <span>成約目標達成率</span>
              <span>{formatPercent(data.totals.targetAchievementRate)}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-400 to-amber-200"
                style={{ width: `${targetProgress}%` }}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-orange-200/50">Member pressure</p>
                <h2 className="mt-1 text-2xl font-black">メンバー別 必要成約数</h2>
              </div>
              <p className="text-sm text-white/45">{data.members.length}名</p>
            </div>
            {sortedMembers.map((member) => (
              <MemberResultCard key={member.name} member={member} maxRemaining={maxRemaining} />
            ))}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-orange-300/20 bg-[#130b08] p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-200" />
                <h2 className="text-xl font-black">アポスライド案</h2>
              </div>
              <div className="mt-4 space-y-3">
                {data.slideSuggestions.length ? (
                  data.slideSuggestions.map((suggestion) => (
                    <div key={`${suggestion.from}-${suggestion.to}`} className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                        <span>{suggestion.from}</span>
                        <ArrowRight className="h-4 w-4 text-orange-200" />
                        <span>{suggestion.to}</span>
                        <span className="rounded-full bg-orange-400/15 px-2 py-1 text-xs text-orange-100">
                          {suggestion.appointments}アポ
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/50">{suggestion.reason}</p>
                      <p className="mt-2 text-sm font-black text-amber-100">予測改善 +{suggestion.expectedClosedLift}成約</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/50">現時点では明確なスライド候補はありません。</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-red-300/20 bg-[#150706] p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-200" />
                <h2 className="text-xl font-black">戦況分析</h2>
              </div>
              <div className="mt-4 space-y-3">
                {data.analysis.map((item) => (
                  <p key={item} className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white/70">
                    {item}
                  </p>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
