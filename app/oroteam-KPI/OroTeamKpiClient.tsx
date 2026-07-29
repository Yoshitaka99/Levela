"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Flame,
  Gauge,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { OroTeamKpiData, OroTeamMemberKpi } from "../api/oroteam-kpi/route";

const seatRateOptions = [60, 65, 70, 75];
type GoalDraft = OroTeamKpiData["editableGoals"];

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

function statusLabel(member: OroTeamMemberKpi) {
  if (member.remainingClosed <= 0) return { label: "達成圏", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" };
  if (member.currentCloseRate && member.currentCloseRate < member.minCloseRate) {
    return { label: "要改善", className: "border-red-400/40 bg-red-500/15 text-red-100" };
  }
  if (member.remainingClosed >= 10) return { label: "不足大", className: "border-orange-300/40 bg-orange-400/15 text-orange-100" };
  return { label: "追撃", className: "border-amber-300/40 bg-amber-300/15 text-amber-100" };
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
  tone?: "orange" | "red" | "amber" | "slate";
}) {
  const toneClass = {
    orange: "border-orange-400/30 bg-orange-500/10 text-orange-100",
    red: "border-red-400/30 bg-red-500/10 text-red-100",
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    slate: "border-white/10 bg-white/[0.04] text-slate-100",
  }[tone];

  return (
    <section className={`rounded-2xl border p-4 shadow-2xl shadow-black/30 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">{label}</p>
        <div className="text-white/70">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{value}</p>
      <p className="mt-2 text-sm text-white/55">{sub}</p>
    </section>
  );
}

function Meter({ value, max, danger = false }: { value: number; max: number; danger?: boolean }) {
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${danger ? "bg-gradient-to-r from-red-500 to-orange-300" : "bg-gradient-to-r from-orange-400 to-amber-200"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function MemberCard({ member, maxRemaining }: { member: OroTeamMemberKpi; maxRemaining: number }) {
  const state = statusLabel(member);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#130d0b]/90 p-4 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${state.className}`}>{state.label}</span>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200/55">{member.alias}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
            <h2 className="text-2xl font-black text-white">{member.name}</h2>
            <p className="text-sm text-white/45">最低成約率 {member.minCloseRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[580px]">
          <Metric label="予約" value={formatNumber(member.currentAppointments)} sub={`配分 ${formatNumber(member.targetAppointments)}`} />
          <Metric label="予測着座" value={formatNumber(member.projectedSeated)} sub={`実着座 ${formatNumber(member.actualSeated)}`} />
          <Metric label="必要成約" value={formatNumber(member.requiredClosed)} sub={`現在 ${formatNumber(member.actualClosed)}`} />
          <Metric label="残り" value={formatNumber(member.remainingClosed)} sub={`${formatPercent(member.currentCloseRate)}`} alert={member.remainingClosed > 0} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-white/45">
            <span>残り成約インパクト</span>
            <span>{formatNumber(member.remainingClosed)} / {formatNumber(maxRemaining || 1)}</span>
          </div>
          <Meter value={member.remainingClosed} max={maxRemaining} danger={member.remainingClosed >= 10} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Pace label="今日" value={member.pace.today} />
          <Pace label="今週" value={member.pace.thisWeek} />
          <Pace label="月末" value={member.pace.month} />
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, sub, alert = false }: { label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? "border-orange-400/25 bg-orange-500/10" : "border-white/10 bg-white/[0.04]"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-white/45">{sub}</p>
    </div>
  );
}

function Pace({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-center">
      <p className="text-[11px] font-semibold text-white/45">{label}</p>
      <p className="mt-1 text-xl font-black text-orange-100">{formatNumber(value)}</p>
    </div>
  );
}

function GoalInput({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-xl border border-white/10 bg-black/25 p-3">
      <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-orange-300/20 bg-black/40 px-3 text-xl font-black text-white outline-none focus:border-orange-200"
      />
    </label>
  );
}

export function OroTeamKpiClient({ initialData }: { initialData: OroTeamKpiData }) {
  const [data, setData] = useState(initialData);
  const [month, setMonth] = useState(initialData.selectedMonth);
  const [seatRate, setSeatRate] = useState(initialData.seatRate);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(initialData.editableGoals);
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
          setGoalDraft(nextData.editableGoals);
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
  }, [month, seatRate]);

  const updateTeamGoal = (key: keyof GoalDraft["teamTargets"], value: string) => {
    const numeric = Number(value);
    setGoalDraft((current) => ({
      ...current,
      teamTargets: {
        ...current.teamTargets,
        [key]: Number.isFinite(numeric) ? numeric : 0,
      },
    }));
  };

  const updateMemberGoal = (name: string, key: "targetAppointments" | "minCloseRate", value: string) => {
    const numeric = Number(value);
    setGoalDraft((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.name === name
          ? {
              ...member,
              [key]: Number.isFinite(numeric) ? numeric : 0,
            }
          : member,
      ),
    }));
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
      setSaveMessage("保存しました");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSavingGoals(false);
    }
  };

  const maxRemaining = useMemo(() => Math.max(1, ...data.members.map((member) => member.remainingClosed)), [data.members]);
  const targetProgress = Math.min(100, data.totals.targetAchievementRate);
  const sortedMembers = useMemo(
    () => [...data.members].sort((a, b) => b.remainingClosed - a.remainingClosed || b.requiredClosed - a.requiredClosed),
    [data.members],
  );

  return (
    <main className="min-h-screen bg-[#080403] text-white">
      <div className="absolute inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(ellipse_at_top,#7f1d1d_0%,#2a0904_42%,transparent_72%)] opacity-80" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-orange-300/20 bg-[#120805]/95 p-5 shadow-2xl shadow-red-950/40 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-orange-100">
                <Flame className="h-4 w-4" />
                ORO TEAM KPI
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                8月オロチーム
                <span className="block bg-gradient-to-r from-red-300 via-orange-200 to-amber-100 bg-clip-text text-transparent">
                  目標達成ボード
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-orange-100/60 sm:text-base">
                面談日基準で予約、着座、成約を集計。必要成約数とアポ配分のズレを即時に確認します。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[460px]">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">対象月</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="h-12 w-full rounded-xl border border-orange-300/25 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-orange-200"
                >
                  {data.availableMonths.map((option) => (
                    <option key={option.value} value={option.value} className="bg-black">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">着座率</span>
                <select
                  value={seatRate}
                  onChange={(event) => setSeatRate(Number(event.target.value))}
                  className="h-12 w-full rounded-xl border border-orange-300/25 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-orange-200"
                >
                  {seatRateOptions.map((rate) => (
                    <option key={rate} value={rate} className="bg-black">
                      {rate}%
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="block text-xs font-bold uppercase tracking-[0.18em] text-white/45">更新</span>
                <div className="mt-1 flex items-center gap-2 text-sm font-bold text-orange-100">
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {new Date(data.updatedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </div>
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
            label="成約目標"
            value={`${formatNumber(data.totals.actualClosed)} / ${formatNumber(data.totals.targetClosed)}`}
            sub={`残り ${formatNumber(data.totals.remainingClosedToTarget)}件 / 達成率 ${formatPercent(data.totals.targetAchievementRate)}`}
            tone="red"
          />
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="予約"
            value={formatNumber(data.totals.currentAppointments)}
            sub={`配分 ${formatNumber(data.totals.targetAppointments)} / 差分 ${signed(data.totals.appointmentGap)}`}
            tone="orange"
          />
          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="予測着座"
            value={formatNumber(data.totals.projectedSeated)}
            sub={`目標 ${formatNumber(data.totals.targetSeated)} / 差分 ${signed(data.totals.seatedGap)}`}
            tone="amber"
          />
          <SummaryCard
            icon={<Gauge className="h-5 w-5" />}
            label="必要成約"
            value={formatNumber(data.totals.requiredClosedAtMemberRates)}
            sub={`メンバー最低ライン合算 / 現在差分 ${signed(data.totals.actualClosed - data.totals.requiredClosedAtMemberRates)}`}
            tone="slate"
          />
        </section>

        <section className="rounded-2xl border border-orange-300/20 bg-[#120705] p-5 shadow-xl shadow-red-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-200/50">Goal control</p>
              <h2 className="mt-1 text-2xl font-black">目標値編集</h2>
              <p className="mt-2 text-sm text-white/50">対象月ごとに保存されます。保存後、全員の画面に最新値が反映されます。</p>
            </div>
            <button
              type="button"
              onClick={saveGoals}
              disabled={savingGoals}
              className="h-11 rounded-xl border border-orange-200/30 bg-gradient-to-r from-red-600 to-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingGoals ? "保存中" : "目標値を保存"}
            </button>
          </div>
          {saveMessage ? <p className="mt-3 text-sm font-bold text-amber-100">{saveMessage}</p> : null}

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <GoalInput label="目標アポ" value={goalDraft.teamTargets.appointments} onChange={(value) => updateTeamGoal("appointments", value)} />
            <GoalInput label="目標着座" value={goalDraft.teamTargets.seated} onChange={(value) => updateTeamGoal("seated", value)} />
            <GoalInput label="目標成約" value={goalDraft.teamTargets.closed} onChange={(value) => updateTeamGoal("closed", value)} />
            <GoalInput label="全体成約率%" value={goalDraft.teamTargets.closeRate} onChange={(value) => updateTeamGoal("closeRate", value)} />
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[760px] rounded-2xl border border-white/10">
              <div className="grid grid-cols-[1.2fr_1fr_140px_140px] border-b border-white/10 bg-black/25 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                <span>メンバー</span>
                <span>表示名</span>
                <span>配分アポ</span>
                <span>最低成約率%</span>
              </div>
              {goalDraft.members.map((member) => (
                <div key={member.name} className="grid grid-cols-[1.2fr_1fr_140px_140px] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0">
                  <span className="font-bold text-white">{member.name}</span>
                  <span className="text-sm text-orange-100/55">{member.alias}</span>
                  <input
                    type="number"
                    min={0}
                    value={member.targetAppointments}
                    onChange={(event) => updateMemberGoal(member.name, "targetAppointments", event.target.value)}
                    className="h-10 rounded-xl border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none focus:border-orange-200"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={member.minCloseRate}
                    onChange={(event) => updateMemberGoal(member.name, "minCloseRate", event.target.value)}
                    className="h-10 rounded-xl border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none focus:border-orange-200"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-orange-300/20 bg-[#100908] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-200/50">Target heat</p>
              <h2 className="mt-1 text-2xl font-black">チーム進捗</h2>
            </div>
            <div className="text-sm text-white/55">35%基準必要成約 {formatNumber(data.totals.requiredClosedAtTeamRate)}件</div>
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
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-200/50">Member pressure</p>
                <h2 className="mt-1 text-2xl font-black">メンバー別 必要成約数</h2>
              </div>
              <p className="text-sm text-white/45">{data.members.length}名</p>
            </div>
            {sortedMembers.map((member) => (
              <MemberCard key={member.name} member={member} maxRemaining={maxRemaining} />
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

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-white/60" />
                <h2 className="text-xl font-black">前提</h2>
              </div>
              <div className="mt-4 space-y-2">
                {data.assumptions.map((item) => (
                  <p key={item} className="text-xs leading-5 text-white/45">{item}</p>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
