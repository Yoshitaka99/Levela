"use client";

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdSourceFilter, CustomerManagementRow, ReasonCount, TeamMemberKpi, TeamSalesDashboardData, TrafficFilter } from "./data";

type TabKey = "overview" | "appointments" | "members" | "reasons" | "alerts";
type SortKey = "projectedRate" | "closeRate" | "seatRate" | "reservationSlots" | "seated" | "closed" | "projected" | "lost" | "hold";
type ViewMode = "user" | "admin";
type AdminSortKey = "appointmentDesc" | "appointmentAsc" | "memberAsc" | "memberDesc";

const ALL_ADMIN_MEMBERS = "all";
const ALL_SEMINARS_LABEL = "全期間";
const SEMINAR_SEPARATOR = ",";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "全体" },
  { key: "appointments", label: "週間アポ" },
  { key: "members", label: "メンバー" },
  { key: "reasons", label: "理由分析" },
  { key: "alerts", label: "アラート" },
];

const sortButtons: { key: SortKey; label: string }[] = [
  { key: "projectedRate", label: "予定込み成約率" },
  { key: "closeRate", label: "実成約率" },
  { key: "seatRate", label: "着座率" },
  { key: "reservationSlots", label: "予約枠数" },
  { key: "seated", label: "着座数" },
  { key: "closed", label: "実成約数" },
  { key: "projected", label: "予定込み成約数" },
  { key: "lost", label: "失注理由数" },
  { key: "hold", label: "保留理由数" },
];

const trafficFilters: { key: TrafficFilter; label: string }[] = [
  { key: "all", label: "全て" },
  { key: "ad", label: "広告のみ" },
  { key: "exclude_ad", label: "広告除外" },
];

const adSourceFilters: { key: AdSourceFilter; label: string }[] = [
  { key: "all", label: "広告すべて" },
  { key: "x", label: "x流入" },
  { key: "meta", label: "metaすべて" },
  { key: "meta_ad", label: "meta_ad" },
  { key: "Meta_ad", label: "Meta_ad" },
  { key: "meta_ad_Suea_aw", label: "meta_ad_Suea_aw" },
  { key: "meta_ad_in-house_aw", label: "meta_ad_in-house_aw" },
  { key: "meta_ad_Suea", label: "meta_ad_Suea" },
  { key: "Meta_ad_aw", label: "Meta_ad_aw" },
  { key: "meta_ad_in-house", label: "meta_ad_in-house" },
];

function splitAdSources(value?: string) {
  return (value ?? "")
    .split(SEMINAR_SEPARATOR)
    .map((source) => source.trim())
    .filter(Boolean);
}

function formatSelectedAdSource(value: string) {
  if (value === "all") return "";
  return splitAdSources(value)
    .map((source) => adSourceFilters.find((filter) => filter.key === source)?.label ?? source)
    .join(" / ");
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

function sumReasons(reasons: ReasonCount[]) {
  return reasons.reduce((sum, reason) => sum + reason.count, 0);
}

function topReason(reasons: ReasonCount[]) {
  return reasons[0]?.label ?? "該当なし";
}

function formatPlanBreakdown(member: Pick<TeamMemberKpi, "tokushinClosed" | "basicClosed">) {
  return `特進 ${member.tokushinClosed} / ベーシック ${member.basicClosed}`;
}

function formatCount(value: number | undefined) {
  return `${value ?? 0}件`;
}

function holdConversionBase(member: Pick<TeamMemberKpi, "holdClosed" | "holdLost" | "hold">) {
  return (member.holdClosed ?? 0) + (member.holdLost ?? 0) + (member.hold ?? 0);
}

function splitSeminars(value?: string) {
  return (value ?? "")
    .split(SEMINAR_SEPARATOR)
    .map((seminar) => seminar.trim())
    .filter(Boolean);
}

function formatSelectedSeminars(value: string) {
  return splitSeminars(value).join(" / ") || value;
}

function normalizeSeminarSelection(value: string, options: string[]) {
  const selected = splitSeminars(value).filter((seminar) => options.includes(seminar));
  if (!selected.length) return options[0] ? [options[0]] : [];
  if (selected.includes(ALL_SEMINARS_LABEL)) return [ALL_SEMINARS_LABEL];
  return selected;
}

type AppointmentTone = "closed" | "pending" | "hold" | "lost" | "seated" | "future" | "other";

type CalendarAppointment = CustomerManagementRow & {
  id: string;
  startsAt: Date;
  dayKey: string;
  hourKey: string;
  timeLabel: string;
  statusLabel: string;
  tone: AppointmentTone;
  memberInitial: string;
  memberColor: string;
};

const memberColorClasses = [
  "bg-teal-300 text-slate-950",
  "bg-sky-300 text-slate-950",
  "bg-amber-300 text-slate-950",
  "bg-violet-300 text-slate-950",
  "bg-rose-300 text-slate-950",
  "bg-lime-300 text-slate-950",
  "bg-cyan-300 text-slate-950",
  "bg-orange-300 text-slate-950",
  "bg-fuchsia-300 text-slate-950",
  "bg-emerald-300 text-slate-950",
];

const appointmentToneClasses: Record<AppointmentTone, string> = {
  closed: "border-emerald-300/30 bg-emerald-400/12 text-emerald-50",
  pending: "border-amber-300/30 bg-amber-300/12 text-amber-50",
  hold: "border-violet-300/30 bg-violet-400/12 text-violet-50",
  lost: "border-rose-300/30 bg-rose-400/12 text-rose-50",
  seated: "border-sky-300/30 bg-sky-400/12 text-sky-50",
  future: "border-slate-400/25 bg-slate-700/35 text-slate-100",
  other: "border-orange-300/30 bg-orange-300/12 text-orange-50",
};

function parseAppointmentDate(value: string) {
  const match = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function getWeekStart(date = new Date()) {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
  return weekStart;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function isExcludedCalendarRow(row: CustomerManagementRow, startsAt: Date) {
  const seat = row.seat.trim();
  const status = row.status.trim();
  if (!seat && !status) return startsAt <= new Date();
  return ["重複予約", "無効アポ", "担当者変更"].some((label) => seat.includes(label) || status.includes(label));
}

function getAppointmentTone(row: CustomerManagementRow, startsAt: Date): { label: string; tone: AppointmentTone } {
  const seat = row.seat.trim();
  const status = row.status.trim();
  const isSeated = seat === "着座" || seat === "着席" || seat.endsWith("→着座");

  if (status.includes("失注") || status.includes("クーリングオフ")) return { label: "失注", tone: "lost" };
  if (status.endsWith("成約") || status.includes("→成約")) return { label: "成約", tone: "closed" };
  if (status.includes("成約予定")) return { label: "成約予定", tone: "pending" };
  if (status === "保留") return { label: "保留", tone: "hold" };
  if (isSeated) return { label: "着座", tone: "seated" };
  if (startsAt > new Date() && !status) return { label: "未来アポ", tone: "future" };
  return { label: status || seat || "未反映", tone: "other" };
}

function getMemberInitial(member: string, firstLetterCounts: Map<string, number>) {
  const compactName = member.replace(/\s+/g, "");
  const letters = Array.from(compactName);
  const first = letters[0] ?? "?";
  return (firstLetterCounts.get(first) ?? 0) > 1 ? letters.slice(0, 2).join("") || first : first;
}

function ProgressBar({ value, tone = "teal" }: { value: number; tone?: "teal" | "amber" | "rose" }) {
  const color = {
    teal: "bg-teal-300",
    amber: "bg-amber-300",
    rose: "bg-rose-300",
  }[tone];

  return (
    <div className="h-2 w-full rounded-full bg-slate-800">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "cyan" | "teal" | "amber" | "violet" | "rose";
  icon: typeof BarChart3;
}) {
  const toneClass = {
    cyan: "border-cyan-300/25 bg-cyan-500/12 text-cyan-100",
    teal: "border-teal-300/25 bg-teal-500/12 text-teal-100",
    amber: "border-amber-300/25 bg-amber-400/12 text-amber-100",
    violet: "border-violet-300/25 bg-violet-500/12 text-violet-100",
    rose: "border-rose-300/25 bg-rose-500/12 text-rose-100",
  }[tone];

  return (
    <div className={`min-h-[118px] rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium opacity-85">{label}</p>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-xs leading-5 opacity-75">{sub}</p>
    </div>
  );
}

type WeeklyRateKey = "seatRate" | "closeRate" | "holdRate" | "paidRate";

const weeklyRateMetrics: { key: WeeklyRateKey; label: string }[] = [
  { key: "seatRate", label: "着座率" },
  { key: "closeRate", label: "成約率" },
  { key: "holdRate", label: "保留率" },
  { key: "paidRate", label: "着金率" },
];

const weeklyLineColors = ["#5eead4", "#93c5fd", "#fbbf24", "#fda4af", "#c4b5fd", "#86efac", "#f0abfc", "#fdba74"];

function getWeekOrder(label: string) {
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function WeeklyLineCharts({
  weeks,
  title,
  emptyText,
}: {
  weeks: TeamSalesDashboardData["weeklyKpis"];
  title: string;
  emptyText: string;
}) {
  if (!weeks.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-2 text-xs text-slate-400">{emptyText}</p>
      </div>
    );
  }

  const weekLabels = Array.from(new Set(weeks.map((week) => week.label))).sort((a, b) => getWeekOrder(a) - getWeekOrder(b));
  const seminars = Array.from(new Set(weeks.map((week) => week.seminar)));
  const chartWidth = 280;
  const chartHeight = 118;
  const padding = { top: 10, right: 8, bottom: 24, left: 30 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  function getPoint(index: number, value: number) {
    const x = padding.left + (weekLabels.length > 1 ? (innerWidth * index) / (weekLabels.length - 1) : innerWidth / 2);
    const y = padding.top + innerHeight - (Math.min(Math.max(value, 0), 100) / 100) * innerHeight;
    return { x, y };
  }

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
          {seminars.map((seminar, index) => (
            <span key={seminar} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: weeklyLineColors[index % weeklyLineColors.length] }} />
              {seminar}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {weeklyRateMetrics.map((metric) => (
          <div key={metric.key} className="rounded-lg border border-white/10 bg-black/15 p-2.5">
            <p className="mb-2 text-xs font-semibold text-slate-200">{metric.label}</p>
            <svg className="h-32 w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${metric.label}の週別折れ線`}>
              {[0, 50, 100].map((tick) => {
                const y = padding.top + innerHeight - (tick / 100) * innerHeight;
                return (
                  <g key={tick}>
                    <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="rgba(148, 163, 184, 0.18)" />
                    <text x={padding.left - 7} y={y + 4} textAnchor="end" className="fill-slate-500 text-[9px]">
                      {tick}
                    </text>
                  </g>
                );
              })}

              {weekLabels.map((label, index) => {
                const { x } = getPoint(index, 0);
                return (
                  <g key={label}>
                    <line x1={x} x2={x} y1={padding.top} y2={padding.top + innerHeight} stroke="rgba(148, 163, 184, 0.08)" />
                    <text x={x} y={chartHeight - 7} textAnchor="middle" className="fill-slate-400 text-[9px]">
                      {label.replace("第", "").replace("週", "w")}
                    </text>
                  </g>
                );
              })}

              {seminars.map((seminar, seminarIndex) => {
                const color = weeklyLineColors[seminarIndex % weeklyLineColors.length];
                const points = weekLabels
                  .map((label, index) => {
                    const week = weeks.find((item) => item.seminar === seminar && item.label === label);
                    if (!week) return null;
                    const point = getPoint(index, week[metric.key]);
                    return { ...point, value: week[metric.key], key: `${seminar}-${label}` };
                  })
                  .filter((point): point is { x: number; y: number; value: number; key: string } => Boolean(point));
                const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

                return (
                  <g key={seminar}>
                    {points.length > 1 ? (
                      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    ) : null}
                    {points.map((point) => (
                      <circle key={point.key} cx={point.x} cy={point.y} r="3.2" fill={color}>
                        <title>{`${seminar} ${formatPercent(point.value)}`}</title>
                      </circle>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyKpiPanel({
  weeks,
  appointmentWeeks,
}: {
  weeks: TeamSalesDashboardData["weeklyKpis"];
  appointmentWeeks: TeamSalesDashboardData["appointmentWeeklyKpis"];
}) {
  if (!weeks.length && !appointmentWeeks.length) {
    return (
      <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal-200" />
          <h2 className="text-base font-semibold text-white">週別推移</h2>
        </div>
        <p className="mt-3 text-sm text-slate-400">週別に表示できる日付データがありません。</p>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-teal-200" />
            <h2 className="text-base font-semibold text-white">週別推移</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">上段はセミナー別、下段は面談日の年月別で第1週〜第5週に分けています。</p>
        </div>
        <span className="rounded-md border border-white/10 bg-slate-950/50 px-2 py-1 text-xs text-slate-300">
          {weeks.length}枠
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <WeeklyLineCharts weeks={weeks} title="セミナー別折れ線" emptyText="セミナー別に表示できる週別データがありません。" />
        <WeeklyLineCharts
          weeks={appointmentWeeks}
          title="面談日基準の折れ線"
          emptyText="面談日基準で表示できる週別データがありません。"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {weeks.map((week) => (
          <div key={week.key} className="rounded-lg border border-white/10 bg-slate-950/35 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white" title={week.seminar}>
                  {week.seminar}
                </p>
                <p className="mt-1 text-xs text-teal-100">{week.label}</p>
              </div>
              <span className="shrink-0 rounded bg-white/5 px-2 py-1 text-xs text-slate-300">抽出 {week.leads}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <SmallMetric label="着座率" value={formatPercent(week.seatRate)} />
              <SmallMetric label="成約率" value={formatPercent(week.closeRate)} />
              <SmallMetric label="保留率" value={formatPercent(week.holdRate)} />
              <SmallMetric label="着金率" value={formatPercent(week.paidRate)} />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-slate-400">
              <span>着座 {week.seated}</span>
              <span>成約 {week.closed}</span>
              <span>予定 {week.pending}</span>
              <span>保留 {week.hold}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReasonList({
  title,
  icon: Icon,
  reasons,
  tone,
}: {
  title: string;
  icon: typeof CircleDot;
  reasons: ReasonCount[];
  tone: "rose" | "amber";
}) {
  const total = Math.max(sumReasons(reasons), 1);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone === "rose" ? "text-rose-300" : "text-amber-200"}`} />
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {reasons.length ? (
          reasons.map((reason) => (
            <div key={reason.label}>
              <div className="mb-1 flex items-start justify-between gap-4 text-sm">
                <span className="min-w-0 whitespace-normal break-words leading-5 text-slate-300">
                  {reason.label}
                  {reason.answerDates?.length ? (
                    <span className="mt-0.5 block text-[11px] font-normal leading-4 text-amber-100/70">
                      回答予定 {reason.answerDates.join("、")}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right font-semibold text-white">
                  {reason.count}件
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {formatPercent(reason.rate ?? (reason.count / total) * 100)}
                  </span>
                </span>
              </div>
              <ProgressBar value={(reason.count / total) * 100} tone={tone} />
            </div>
          ))
        ) : (
          <p className="rounded-md border border-white/10 bg-slate-950/50 px-3 py-4 text-sm text-slate-400">
            該当データはありません。
          </p>
        )}
      </div>
    </section>
  );
}

export function TeamSalesDashboardClient({
  initialData,
  initialTab,
  initialSort,
  initialMember,
  initialQuery,
  initialSeminar,
  initialTeam,
  initialTraffic,
  initialAdSource,
  initialOnlyAlerts,
  initialOnlyHold,
  initialView = "user",
  basePath = "/team-sales-dashboard",
}: {
  initialData: TeamSalesDashboardData;
  initialTab: TabKey;
  initialSort: SortKey;
  initialMember?: string;
  initialQuery?: string;
  initialSeminar?: string;
  initialTeam?: string;
  initialTraffic: TrafficFilter;
  initialAdSource: AdSourceFilter;
  initialOnlyAlerts: boolean;
  initialOnlyHold: boolean;
  initialView?: ViewMode;
  basePath?: string;
}) {
  const [data, setData] = useState(initialData);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [selectedSeminar, setSelectedSeminar] = useState(initialSeminar ?? initialData.selectedSeminar);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam ?? initialData.selectedTeam);
  const [selectedTraffic, setSelectedTraffic] = useState<TrafficFilter>(initialTraffic ?? initialData.selectedTraffic);
  const [selectedAdSource, setSelectedAdSource] = useState<AdSourceFilter>(initialAdSource ?? initialData.selectedAdSource);
  const [onlyAlerts, setOnlyAlerts] = useState(initialOnlyAlerts);
  const [onlyHold, setOnlyHold] = useState(initialOnlyHold);
  const [selectedMember, setSelectedMember] = useState(
    initialMember === ALL_ADMIN_MEMBERS
      ? ALL_ADMIN_MEMBERS
      : initialData.members.some((member) => member.name === initialMember)
        ? initialMember ?? ""
        : initialData.members[0]?.name ?? "",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasMountedRef = useRef(false);
  const refreshRequestRef = useRef(0);

  const refreshData = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    const requestedSeminar = selectedSeminar;
    const requestedTeam = selectedTeam;
    const requestedTraffic = selectedTraffic;
    const requestedAdSource = selectedAdSource;

    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (requestedSeminar) params.set("seminar", requestedSeminar);
      if (requestedTeam) params.set("team", requestedTeam);
      if (requestedTraffic !== "all") params.set("traffic", requestedTraffic);
      if (requestedTraffic === "ad" && requestedAdSource !== "all") params.set("adSource", requestedAdSource);
      const response = await fetch(`/api/team-sales-dashboard?${params.toString()}`, { cache: "no-store" });
      const nextData = (await response.json()) as TeamSalesDashboardData;

      if (requestId !== refreshRequestRef.current) return;

      setData(nextData);
      setSelectedSeminar(nextData.selectedSeminar || requestedSeminar);
      setSelectedTeam(nextData.selectedTeam || requestedTeam);
      setSelectedTraffic(nextData.selectedTraffic || requestedTraffic);
      setSelectedAdSource(nextData.selectedAdSource || requestedAdSource);
      setLastSyncedAt(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
      setSelectedMember((currentMember) =>
        currentMember === ALL_ADMIN_MEMBERS || nextData.members.some((member) => member.name === currentMember)
          ? currentMember
          : nextData.members[0]?.name ?? "",
      );
    } finally {
      if (requestId === refreshRequestRef.current) setIsRefreshing(false);
    }
  }, [selectedAdSource, selectedSeminar, selectedTeam, selectedTraffic]);

  useEffect(() => {
    if (hasMountedRef.current) {
      refreshData();
    } else {
      hasMountedRef.current = true;
    }

    const timer = window.setInterval(refreshData, 120000);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  const totals = useMemo(
    () =>
      data.members.reduce(
        (sum, member) => ({
          leads: sum.leads + member.leads,
          reservationSlots: sum.reservationSlots + member.reservationSlots,
          seated: sum.seated + member.seated,
          closed: sum.closed + member.closed,
          pending: sum.pending + member.pending,
          hold: sum.hold + member.hold,
          alert: sum.alert + member.alert,
        }),
        { leads: 0, reservationSlots: 0, seated: 0, closed: 0, pending: 0, hold: 0, alert: 0 },
      ),
    [data.members],
  );

  const seatRate = totals.leads ? (totals.seated / totals.leads) * 100 : 0;
  const closeRate = totals.seated ? (totals.closed / totals.seated) * 100 : 0;
  const projectedRate = totals.seated ? ((totals.closed + totals.pending) / totals.seated) * 100 : 0;

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const candidates = data.members.filter((member) => {
      const matchesQuery = !normalizedQuery || member.name.toLowerCase().includes(normalizedQuery);
      const matchesAlert = !onlyAlerts || member.alert > 0;
      const matchesHold = !onlyHold || member.hold > 0;
      return matchesQuery && matchesAlert && matchesHold;
    });

    return [...candidates].sort((a, b) => {
      if (sortKey === "lost") return sumReasons(b.lostReasons) - sumReasons(a.lostReasons);
      if (sortKey === "hold") return sumReasons(b.holdReasons) - sumReasons(a.holdReasons);
      if (sortKey === "reservationSlots") return b.leads - a.leads;
      return b[sortKey] - a[sortKey];
    });
  }, [data.members, onlyAlerts, onlyHold, query, sortKey]);

  useEffect(() => {
    if (!filteredMembers.length) return;
    if (selectedMember === ALL_ADMIN_MEMBERS) return;
    if (!filteredMembers.some((member) => member.name === selectedMember)) {
      setSelectedMember(filteredMembers[0].name);
    }
  }, [filteredMembers, selectedMember]);

  const selected = data.members.find((member) => member.name === selectedMember) ?? data.members[0];
  const alertMembers = data.members.filter((member) => member.alert > 0 || member.hold > 0);
  const activeFilterCount = Number(onlyAlerts) + Number(onlyHold) + Number(Boolean(query.trim())) + Number(selectedTraffic !== "all");
  const selectedSeminarValues = useMemo(
    () => normalizeSeminarSelection(selectedSeminar, data.seminars),
    [data.seminars, selectedSeminar],
  );
  const visibleSortButtons =
    activeTab === "appointments"
      ? []
      : activeTab === "reasons"
      ? sortButtons.filter((button) => button.key === "lost" || button.key === "hold")
      : sortButtons;

  function dashboardHref(
    overrides: {
      view?: ViewMode;
      tab?: TabKey;
      sort?: SortKey;
      member?: string | null;
      q?: string | null;
      seminar?: string | null;
      team?: string | null;
      traffic?: TrafficFilter;
      adSource?: AdSourceFilter;
      alerts?: boolean;
      hold?: boolean;
    } = {},
  ) {
    const params = new URLSearchParams();
    const nextView = overrides.view ?? viewMode;
    const nextTab = overrides.tab ?? activeTab;
    const nextSort = overrides.sort ?? sortKey;
    if (nextView === "admin") params.set("view", "admin");
    params.set("tab", nextTab);
    params.set("sort", nextSort);

    const nextMember = overrides.member === undefined ? selectedMember : overrides.member;
    const nextQuery = overrides.q === undefined ? query.trim() : overrides.q;
    const nextSeminar = overrides.seminar === undefined ? selectedSeminar : overrides.seminar;
    const nextTeam = overrides.team === undefined ? selectedTeam : overrides.team;
    const nextTraffic = overrides.traffic ?? selectedTraffic;
    const nextAdSource = overrides.adSource ?? selectedAdSource;
    const nextAlerts = overrides.alerts ?? onlyAlerts;
    const nextHold = overrides.hold ?? onlyHold;

    if (nextSeminar) params.set("seminar", nextSeminar);
    if (nextTeam) params.set("team", nextTeam);
    if (nextTraffic !== "all") params.set("traffic", nextTraffic);
    if (nextTraffic === "ad" && nextAdSource !== "all") params.set("adSource", nextAdSource);
    if (nextMember) params.set("member", nextMember);
    if (nextQuery) params.set("q", nextQuery);
    if (nextAlerts) params.set("alerts", "1");
    if (nextHold) params.set("hold", "1");
    return `${basePath}?${params.toString()}`;
  }

  function changeTab(nextTab: TabKey) {
    const nextSort = nextTab === "reasons" && sortKey !== "lost" && sortKey !== "hold" ? "lost" : sortKey;
    setActiveTab(nextTab);
    if (nextSort !== sortKey) setSortKey(nextSort);
    window.history.replaceState(null, "", dashboardHref({ tab: nextTab, sort: nextSort }));
  }

  function changeSort(nextSort: SortKey) {
    setSortKey(nextSort);
    window.history.replaceState(null, "", dashboardHref({ sort: nextSort }));
  }

  function changeView(nextView: ViewMode) {
    setViewMode(nextView);
    window.history.replaceState(null, "", dashboardHref({ view: nextView }));
  }

  function selectMember(memberName: string) {
    setSelectedMember(memberName);
    setActiveTab("members");
    window.history.replaceState(null, "", dashboardHref({ tab: "members", member: memberName }));
  }

  function selectAdminMember(memberName: string) {
    setSelectedMember(memberName);
    window.history.replaceState(null, "", dashboardHref({ view: "admin", member: memberName }));
  }

  function changeSeminar(nextSeminar: string) {
    refreshRequestRef.current += 1;
    const currentSelection = normalizeSeminarSelection(selectedSeminar, data.seminars);
    let nextSelection: string[];

    if (nextSeminar === ALL_SEMINARS_LABEL) {
      nextSelection = [ALL_SEMINARS_LABEL];
    } else {
      const withoutAll = currentSelection.filter((seminar) => seminar !== ALL_SEMINARS_LABEL);
      nextSelection = withoutAll.includes(nextSeminar)
        ? withoutAll.filter((seminar) => seminar !== nextSeminar)
        : [...withoutAll, nextSeminar];
      if (!nextSelection.length) nextSelection = [ALL_SEMINARS_LABEL];
    }

    const nextValue = nextSelection.join(SEMINAR_SEPARATOR);
    setSelectedSeminar(nextValue);
    setSelectedMember("");
    window.history.replaceState(null, "", dashboardHref({ seminar: nextValue, member: null }));
  }

  function changeTeam(nextTeam: string) {
    refreshRequestRef.current += 1;
    setSelectedTeam(nextTeam);
    setSelectedMember("");
    window.history.replaceState(null, "", dashboardHref({ team: nextTeam, member: null }));
  }

  function changeTraffic(nextTraffic: TrafficFilter) {
    refreshRequestRef.current += 1;
    const nextAdSource = nextTraffic === "ad" ? selectedAdSource : "all";
    setSelectedTraffic(nextTraffic);
    setSelectedAdSource(nextAdSource);
    setSelectedMember("");
    window.history.replaceState(null, "", dashboardHref({ traffic: nextTraffic, adSource: nextAdSource, member: null }));
  }

  function changeAdSource(nextAdSource: AdSourceFilter) {
    refreshRequestRef.current += 1;
    const currentSources = splitAdSources(selectedAdSource);
    const nextSources =
      nextAdSource === "all"
        ? ["all"]
        : currentSources.includes(nextAdSource)
          ? currentSources.filter((source) => source !== nextAdSource && source !== "all")
          : [...currentSources.filter((source) => source !== "all"), nextAdSource];
    const nextValue = nextSources.length ? nextSources.join(SEMINAR_SEPARATOR) : "all";
    setSelectedTraffic("ad");
    setSelectedAdSource(nextValue);
    setSelectedMember("");
    window.history.replaceState(null, "", dashboardHref({ traffic: "ad", adSource: nextValue, member: null }));
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07100f] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-sm font-semibold text-teal-100">
              <span className="h-2 w-2 rounded-full bg-teal-300" />
              チームセールス
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <CalendarDays className="h-4 w-4" />
              <span>{formatSelectedSeminars(selectedSeminar)}</span>
              <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs">{data.selectedTeam}</span>
              <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs">
                {selectedTraffic === "ad"
                  ? `広告のみ${selectedAdSource !== "all" ? ` / ${formatSelectedAdSource(selectedAdSource)}` : ""}`
                  : selectedTraffic === "exclude_ad"
                    ? "広告除外"
                    : "全て"}
              </span>
              <span className="rounded-full border border-teal-300/25 bg-teal-300/10 px-2 py-0.5 text-xs text-teal-100">
                {data.source === "sheet" ? "顧客管理シート連携中" : "フォールバック"}
              </span>
            </div>
            <h1 className="mt-3 max-w-full break-words text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl">
              チームセールスダッシュボード
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              個別顧客管理シートのB列「担当者名」をもとに、SNS運用/SNSクラブ運営系を除外してチーム別にKPIを確認します。
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            <div className="flex h-10 rounded-md border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => changeView("user")}
                className={`rounded px-3 text-sm font-medium ${
                  viewMode === "user" ? "bg-teal-300 text-slate-950" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                ユーザー画面
              </button>
              <button
                type="button"
                onClick={() => changeView("admin")}
                className={`rounded px-3 text-sm font-medium ${
                  viewMode === "admin" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                管理者画面
              </button>
            </div>
            <div className="flex min-h-10 w-full max-w-full flex-wrap gap-1.5 rounded-md border border-teal-300/25 bg-slate-950 p-1 sm:w-[360px]">
              {data.seminars.map((seminar) => {
                const selected = selectedSeminarValues.includes(seminar);
                return (
                  <button
                    key={seminar}
                    type="button"
                    onClick={() => changeSeminar(seminar)}
                    className={`min-h-8 rounded px-2.5 py-1 text-xs font-medium transition ${
                      selected
                        ? "bg-teal-300/20 text-teal-50"
                        : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    {seminar}
                  </button>
                );
              })}
            </div>
            <select
              value={selectedTeam}
              onChange={(event) => changeTeam(event.target.value)}
              className="h-10 w-full rounded-md border border-teal-300/25 bg-slate-950 px-3 text-sm text-white outline-none sm:w-[180px]"
            >
              {data.teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <div className="flex h-10 rounded-md border border-white/10 bg-white/5 p-1">
              {trafficFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => changeTraffic(filter.key)}
                  className={`rounded px-3 text-sm font-medium ${
                    selectedTraffic === filter.key ? "bg-teal-300 text-slate-950" : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {selectedTraffic === "ad" ? (
              <div className="flex min-h-10 max-w-full flex-wrap gap-1 rounded-md border border-white/10 bg-white/5 p-1">
                {adSourceFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => changeAdSource(filter.key)}
                    className={`rounded px-2.5 text-xs font-medium ${
                      splitAdSources(selectedAdSource).includes(filter.key) ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            ) : null}
            <form action={basePath} className="inline-flex h-10 w-full items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-slate-200 sm:w-[260px]">
              {viewMode === "admin" ? <input type="hidden" name="view" value="admin" /> : null}
              <input type="hidden" name="tab" value={activeTab} />
              <input type="hidden" name="sort" value={sortKey} />
              <input type="hidden" name="seminar" value={selectedSeminar} />
              <input type="hidden" name="team" value={selectedTeam} />
              {selectedTraffic !== "all" ? <input type="hidden" name="traffic" value={selectedTraffic} /> : null}
              {selectedTraffic === "ad" && selectedAdSource !== "all" ? <input type="hidden" name="adSource" value={selectedAdSource} /> : null}
              {onlyAlerts ? <input type="hidden" name="alerts" value="1" /> : null}
              {onlyHold ? <input type="hidden" name="hold" value="1" /> : null}
              <Search className="h-4 w-4" />
              <input
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="メンバー検索"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="検索をクリア">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              ) : null}
            </form>
            <button
              type="button"
              onClick={refreshData}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              更新
            </button>
          </div>
        </div>

        <div id="conditions" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <button
            type="button"
            onClick={() => {
              setOnlyAlerts((value) => !value);
              window.history.replaceState(null, "", dashboardHref({ alerts: !onlyAlerts, member: null }));
            }}
            className={`rounded-md px-3 py-2 text-sm ${onlyAlerts ? "bg-rose-400 text-slate-950" : "bg-white/5 text-slate-300"}`}
          >
            着金日アラートあり
          </button>
          <button
            type="button"
            onClick={() => {
              setOnlyHold((value) => !value);
              window.history.replaceState(null, "", dashboardHref({ hold: !onlyHold, member: null }));
            }}
            className={`rounded-md px-3 py-2 text-sm ${onlyHold ? "bg-amber-300 text-slate-950" : "bg-white/5 text-slate-300"}`}
          >
            保留あり
          </button>
          <button
            type="button"
            onClick={() => {
              refreshRequestRef.current += 1;
              setQuery("");
              setOnlyAlerts(false);
              setOnlyHold(false);
              setSelectedTraffic("all");
              setSelectedAdSource("all");
              window.history.replaceState(null, "", dashboardHref({ q: null, traffic: "all", adSource: "all", alerts: false, hold: false, member: null }));
            }}
            className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-slate-300"
          >
            <Filter className="h-4 w-4" />
            条件クリア{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
          </button>
          <span className="text-xs text-slate-400">表示対象: {filteredMembers.length}名</span>
          <span className="text-xs text-slate-500">最終同期: {lastSyncedAt || "確認中"} / 30秒ごとに更新</span>
        </div>

        {viewMode === "admin" ? (
          <AdminCustomerPanel
            members={filteredMembers}
            rows={data.customerRows ?? []}
            selectedMember={selectedMember}
            onSelectMember={selectAdminMember}
          />
        ) : (
          <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <MetricTile label="予約枠数" value={`${totals.leads}`} sub="条件適用後" tone="cyan" icon={CalendarDays} />
          <MetricTile label="実際の着座" value={`${totals.seated}`} sub={`予約 ${totals.leads} 件 / 着座率 ${formatPercent(seatRate)}`} tone="cyan" icon={Users} />
          <MetricTile label="成約数" value={`${totals.closed}`} sub={`着座 ${totals.seated} 件中`} tone="teal" icon={CheckCircle2} />
          <MetricTile label="実成約率" value={formatPercent(closeRate)} sub={`成約 ${totals.closed} 件 / 着座 ${totals.seated} 件`} tone="teal" icon={BarChart3} />
          <MetricTile label="成約予定" value={`${totals.pending}`} sub={`予定込み成約率 ${formatPercent(projectedRate)}`} tone="amber" icon={TrendingUp} />
          <MetricTile label="保留" value={`${totals.hold}`} sub="保留理由を理由分析で確認" tone="violet" icon={CircleDot} />
          <MetricTile label="要確認" value={`${totals.alert}`} sub="成約済みで着金日未入力" tone="rose" icon={AlertTriangle} />
        </div>

        <WeeklyKpiPanel weeks={data.weeklyKpis} appointmentWeeks={data.appointmentWeeklyKpis} />

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeTab(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                activeTab === tab.key ? "bg-teal-400 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {visibleSortButtons.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleSortButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                onClick={() => changeSort(button.key)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  sortKey === button.key
                    ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300"
                }`}
              >
                {button.label}
              </button>
            ))}
          </div>
        ) : null}

        {activeTab === "overview" ? (
          <div className="mt-5 grid gap-5">
            <MemberTable members={filteredMembers} onSelect={selectMember} selectedMember={selected?.name} />
            <div className="grid gap-5 lg:grid-cols-2">
              <StatusPanel statusMix={data.statusMix} />
              <ReasonList title="失注理由 TOP" icon={CircleDot} reasons={data.lostReasons} tone="rose" />
            </div>
          </div>
        ) : null}

        {activeTab === "appointments" ? (
          <WeeklyAppointmentCalendar rows={data.customerRows ?? []} members={filteredMembers} />
        ) : null}

        {activeTab === "members" && selected ? (
          <div className="mt-5 grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">メンバー選択</h2>
                  <p className="mt-1 text-xs text-slate-400">選んだメンバーのKPIと理由を右側に表示します。</p>
                </div>
                <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400">{filteredMembers.length}名</span>
              </div>
              <div className="mt-4 grid gap-2">
                {filteredMembers.length ? filteredMembers.map((member) => (
                  <button
                    key={member.name}
                    type="button"
                    onClick={() => selectMember(member.name)}
                    className={`rounded-md border px-3 py-3 text-left transition ${
                      selected.name === member.name
                        ? "border-teal-300/60 bg-teal-300/10"
                        : "border-white/10 bg-slate-950/35 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">{member.name}</span>
                      <span className="text-sm font-semibold text-cyan-100">{formatPercent(member.projectedRate)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4">
                      <span>予約 {member.leads}</span>
                      <span>着座 {member.seated}</span>
                      <span>成約 {member.closed}</span>
                      <span>予定 {member.pending}</span>
                    </div>
                  </button>
                )) : (
                  <p className="rounded-md border border-white/10 bg-slate-950/35 px-3 py-4 text-sm text-slate-400">
                    条件に一致するメンバーがいません。
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selected.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{selected.team} / 個別KPIと理由トップ</p>
                </div>
                <span className="rounded-md border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-sm text-teal-100">
                  予定込み成約率 {formatPercent(selected.projectedRate)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <SmallMetric label="予定込み成約率" value={formatPercent(selected.projectedRate)} />
                <SmallMetric label="実成約率" value={formatPercent(selected.closeRate)} />
                <SmallMetric label="保留→成約率" value={formatPercent(selected.holdConversionRate)} />
                <SmallMetric label="予約枠数" value={`${selected.leads}件`} />
                <SmallMetric label="着座率" value={formatPercent(selected.seatRate)} />
                <SmallMetric label="成約予定" value={`${selected.pending}件`} />
                <SmallMetric label="成約内訳" value={formatPlanBreakdown(selected)} />
              </div>
              <div className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-amber-100">保留→成約率の内訳</h3>
                  <span className="rounded-md bg-amber-300/10 px-2 py-1 text-sm font-semibold text-amber-100">
                    {formatPercent(selected.holdConversionRate)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <SmallMetric label="保留→成約" value={formatCount(selected.holdClosed)} />
                  <SmallMetric label="保留→失注" value={formatCount(selected.holdLost)} />
                  <SmallMetric label="未決着保留" value={formatCount(selected.hold)} />
                  <SmallMetric label="母数" value={formatCount(holdConversionBase(selected))} />
                </div>
              </div>
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-white">KPIバランス</h3>
                <div className="space-y-3 rounded-lg border border-white/10 bg-slate-950/35 p-3">
                  <RatioRow label="着座率" value={selected.seatRate} />
                  <RatioRow label="実成約率" value={selected.closeRate} />
                  <RatioRow label="予定込み成約率" value={selected.projectedRate} />
                  <RatioRow label="保留→成約率" value={selected.holdConversionRate} />
                </div>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <ReasonList title="このメンバーの失注理由TOP" icon={CircleDot} reasons={selected.lostReasons} tone="rose" />
                <ReasonList title="このメンバーの保留理由TOP" icon={Users} reasons={selected.holdReasons} tone="amber" />
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "reasons" ? (
          <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-5">
              <ReasonList title="失注理由 TOP" icon={CircleDot} reasons={data.lostReasons} tone="rose" />
              <ReasonList title="保留理由 TOP" icon={Users} reasons={data.holdReasons} tone="amber" />
            </div>
            <ReasonMatrix members={filteredMembers} />
          </div>
        ) : null}

        {activeTab === "alerts" ? (
          <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-300" />
              <h2 className="text-base font-semibold text-white">確認が必要なメンバー</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {alertMembers.length ? alertMembers.map((member) => (
                <button
                  key={member.name}
                  type="button"
                  onClick={() => selectMember(member.name)}
                  className="rounded-lg border border-white/10 bg-slate-950/40 p-4 text-left hover:border-teal-300/50"
                >
                  <p className="font-semibold text-white">{member.name}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    着金日アラート {member.alert}件 / 保留 {member.hold}件
                  </p>
                  <p className="mt-2 text-xs text-slate-500">押すと個別分析へ移動</p>
                </button>
              )) : (
                <p className="rounded-md border border-white/10 bg-slate-950/35 px-3 py-4 text-sm text-slate-400">
                  現在、確認が必要なメンバーはいません。
                </p>
              )}
            </div>
          </section>
        ) : null}
          </>
        )}
      </section>
    </main>
  );
}

function WeeklyAppointmentCalendar({
  rows,
  members,
}: {
  rows: CustomerManagementRow[];
  members: TeamMemberKpi[];
}) {
  const [selectedBucket, setSelectedBucket] = useState("");
  const weekStart = useMemo(() => getWeekStart(), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const visibleMemberNames = useMemo(() => new Set(members.map((member) => member.name)), [members]);
  const firstLetterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((member) => {
      const first = Array.from(member.name.replace(/\s+/g, ""))[0] ?? "?";
      counts.set(first, (counts.get(first) ?? 0) + 1);
    });
    return counts;
  }, [members]);
  const memberColorMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member, index) => {
      map.set(member.name, memberColorClasses[index % memberColorClasses.length]);
    });
    return map;
  }, [members]);

  const appointments = useMemo<CalendarAppointment[]>(() => {
    return rows
      .filter((row) => visibleMemberNames.has(row.member))
      .map((row, index) => {
        const startsAt = parseAppointmentDate(row.appointmentDate);
        if (!startsAt || startsAt < weekStart || startsAt >= weekEnd) return null;
        if (isExcludedCalendarRow(row, startsAt)) return null;
        const state = getAppointmentTone(row, startsAt);
        const dayKey = formatDateKey(startsAt);
        const hourKey = `${String(startsAt.getHours()).padStart(2, "0")}:00`;
        return {
          ...row,
          id: `${row.member}-${row.appointmentDate}-${index}`,
          startsAt,
          dayKey,
          hourKey,
          timeLabel: formatTimeLabel(startsAt),
          statusLabel: state.label,
          tone: state.tone,
          memberInitial: getMemberInitial(row.member, firstLetterCounts),
          memberColor: memberColorMap.get(row.member) ?? memberColorClasses[0],
        };
      })
      .filter((appointment): appointment is CalendarAppointment => Boolean(appointment))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.member.localeCompare(b.member, "ja"));
  }, [firstLetterCounts, memberColorMap, rows, visibleMemberNames, weekEnd, weekStart]);

  const appointmentsByBucket = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    appointments.forEach((appointment) => {
      const key = `${appointment.dayKey}:${appointment.hourKey}`;
      const group = map.get(key) ?? [];
      group.push(appointment);
      map.set(key, group);
    });
    return map;
  }, [appointments]);

  const hours = useMemo(() => {
    if (!appointments.length) return Array.from({ length: 13 }, (_, index) => `${String(index + 9).padStart(2, "0")}:00`);
    const minHour = Math.min(...appointments.map((appointment) => appointment.startsAt.getHours()));
    const maxHour = Math.max(...appointments.map((appointment) => appointment.startsAt.getHours()));
    const start = Math.max(7, Math.min(9, minHour));
    const end = Math.min(23, Math.max(21, maxHour));
    return Array.from({ length: end - start + 1 }, (_, index) => `${String(start + index).padStart(2, "0")}:00`);
  }, [appointments]);

  const selectedAppointments =
    (selectedBucket ? appointmentsByBucket.get(selectedBucket) : undefined) ?? appointments.slice(0, 8);
  const weekLabel = `${formatDayLabel(weekStart)} - ${formatDayLabel(addDays(weekStart, 6))}`;
  const now = new Date();
  const summary = {
    total: appointments.length,
    done: appointments.filter((appointment) => appointment.startsAt <= now).length,
    future: appointments.filter((appointment) => appointment.startsAt > now).length,
    closed: appointments.filter((appointment) => appointment.tone === "closed").length,
    pending: appointments.filter((appointment) => appointment.tone === "pending").length,
    hold: appointments.filter((appointment) => appointment.tone === "hold").length,
    lost: appointments.filter((appointment) => appointment.tone === "lost").length,
  };

  return (
    <section className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">週間アポカレンダー</h2>
            <p className="mt-1 text-sm text-slate-400">面談日をもとに、今週月曜から日曜までのアポを表示します。</p>
          </div>
          <span className="rounded-md border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-sm font-semibold text-teal-100">
            {weekLabel}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <SmallMetric label="今週アポ" value={`${summary.total}件`} />
          <SmallMetric label="実施済み" value={`${summary.done}件`} />
          <SmallMetric label="未来アポ" value={`${summary.future}件`} />
          <SmallMetric label="成約" value={`${summary.closed}件`} />
          <SmallMetric label="成約予定" value={`${summary.pending}件`} />
          <SmallMetric label="保留" value={`${summary.hold}件`} />
          <SmallMetric label="失注" value={`${summary.lost}件`} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {members.map((member) => (
            <span key={member.name} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-300">
              <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold ${memberColorMap.get(member.name) ?? memberColorClasses[0]}`}>
                {getMemberInitial(member.name, firstLetterCounts)}
              </span>
              {member.name}
            </span>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
          <div className="min-w-[980px]">
            <div className="grid bg-slate-900 text-xs font-medium text-slate-400" style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}>
              <div className="border-r border-white/10 px-3 py-3">時間</div>
              {weekDays.map((day) => (
                <div key={formatDateKey(day)} className="border-r border-white/10 px-3 py-3 last:border-r-0">
                  {formatDayLabel(day)}
                </div>
              ))}
            </div>
            {hours.map((hour) => (
              <div key={hour} className="grid border-t border-white/10" style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}>
                <div className="border-r border-white/10 bg-slate-950/45 px-3 py-3 text-xs font-semibold text-slate-400">{hour}</div>
                {weekDays.map((day) => {
                  const dayKey = formatDateKey(day);
                  const bucketKey = `${dayKey}:${hour}`;
                  const bucketAppointments = appointmentsByBucket.get(bucketKey) ?? [];
                  const visibleAppointments = bucketAppointments.slice(0, 3);
                  return (
                    <div key={bucketKey} className="min-h-[96px] border-r border-white/10 bg-slate-950/20 p-2 last:border-r-0">
                      <div className="space-y-1.5">
                        {visibleAppointments.map((appointment) => (
                          <button
                            key={appointment.id}
                            type="button"
                            title={`${appointment.member} ${appointment.timeLabel} ${appointment.statusLabel}`}
                            onClick={() => setSelectedBucket(bucketKey)}
                            className={`flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs leading-tight transition hover:border-white/35 ${appointmentToneClasses[appointment.tone]}`}
                          >
                            <span className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold ${appointment.memberColor}`}>
                              {appointment.memberInitial}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-semibold">{appointment.timeLabel}</span>
                              <span className="block truncate opacity-80">{appointment.statusLabel}</span>
                            </span>
                          </button>
                        ))}
                        {bucketAppointments.length > visibleAppointments.length ? (
                          <button
                            type="button"
                            onClick={() => setSelectedBucket(bucketKey)}
                            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-white/10"
                          >
                            +{bucketAppointments.length - visibleAppointments.length}件
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="rounded-lg border border-white/10 bg-white/[0.03] p-4 xl:sticky xl:top-4 xl:self-start">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">選択中のアポ</h3>
            <p className="mt-1 text-xs text-slate-400">
              {selectedBucket ? "同じ曜日・時間帯のアポを表示中" : "直近のアポを表示中"}
            </p>
          </div>
          <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">{selectedAppointments.length}件</span>
        </div>
        <div className="mt-4 space-y-3">
          {selectedAppointments.length ? selectedAppointments.map((appointment) => (
            <div key={appointment.id} className={`rounded-lg border p-3 ${appointmentToneClasses[appointment.tone]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-xs font-bold ${appointment.memberColor}`}>
                    {appointment.memberInitial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{appointment.member}</p>
                    <p className="text-xs opacity-75">{formatDayLabel(appointment.startsAt)} {appointment.timeLabel}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-slate-950/35 px-2 py-1 text-xs font-semibold">{appointment.statusLabel}</span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-200">
                <AdminInfo label="着座" value={appointment.seat} />
                <AdminInfo label="ステータス" value={appointment.status} />
                <AdminInfo label="流入" value={appointment.inflow} />
                <AdminInfo label="流入経路" value={appointment.trafficRoute} />
                <AdminInfo label="失注理由" value={appointment.lostReason} />
                <AdminInfo label="保留理由" value={appointment.holdReason} />
              </div>
            </div>
          )) : (
            <p className="rounded-md border border-white/10 bg-slate-950/35 px-3 py-4 text-sm text-slate-400">
              今週表示できるアポはありません。
            </p>
          )}
        </div>
      </aside>
    </section>
  );
}

function AdminCustomerPanel({
  members,
  rows,
  selectedMember,
  onSelectMember,
}: {
  members: TeamMemberKpi[];
  rows: TeamSalesDashboardData["customerRows"];
  selectedMember: string;
  onSelectMember: (member: string) => void;
}) {
  const isAllMembers = selectedMember === ALL_ADMIN_MEMBERS;
  const effectiveMember = isAllMembers
    ? ALL_ADMIN_MEMBERS
    : members.some((member) => member.name === selectedMember)
      ? selectedMember
      : members[0]?.name ?? "";
  const selectedKpi = members.find((member) => member.name === effectiveMember);
  const summaryKpi = useMemo(() => {
    if (!isAllMembers) return selectedKpi;
        const summary = members.reduce(
          (sum, member) => ({
            leads: sum.leads + member.leads,
            reservationSlots: sum.reservationSlots + member.reservationSlots,
            seated: sum.seated + member.seated,
            closed: sum.closed + member.closed,
            pending: sum.pending + member.pending,
          }),
      { leads: 0, reservationSlots: 0, seated: 0, closed: 0, pending: 0 },
    );
    return {
      ...summary,
      projectedRate: summary.seated ? ((summary.closed + summary.pending) / summary.seated) * 100 : 0,
    };
  }, [isAllMembers, members, selectedKpi]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminSort, setAdminSort] = useState<AdminSortKey>("appointmentDesc");
  const visibleMemberNames = useMemo(() => new Set(members.map((member) => member.name)), [members]);
  const memberRowsAll = useMemo(
    () =>
      isAllMembers
        ? rows.filter((row) => visibleMemberNames.has(row.member))
        : rows.filter((row) => row.member === effectiveMember),
    [effectiveMember, isAllMembers, rows, visibleMemberNames],
  );
  const statusOptions = useMemo(
    () =>
      [...new Set(memberRowsAll.map((row) => row.status.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "ja")),
    [memberRowsAll],
  );
  const effectiveStatusFilter = statusFilter === "all" || statusOptions.includes(statusFilter) ? statusFilter : "all";
  const memberRows = useMemo(
    () => {
      const filtered =
        effectiveStatusFilter === "all"
          ? memberRowsAll
          : memberRowsAll.filter((row) => row.status.trim() === effectiveStatusFilter);

      return [...filtered].sort((a, b) => {
        if (adminSort === "memberAsc" || adminSort === "memberDesc") {
          const memberDiff = a.member.localeCompare(b.member, "ja");
          if (memberDiff !== 0) return adminSort === "memberAsc" ? memberDiff : -memberDiff;
          return b.appointmentDate.localeCompare(a.appointmentDate, "ja");
        }

        const dateDiff = a.appointmentDate.localeCompare(b.appointmentDate, "ja");
        if (dateDiff !== 0) return adminSort === "appointmentAsc" ? dateDiff : -dateDiff;
        return a.member.localeCompare(b.member, "ja");
      });
    },
    [adminSort, effectiveStatusFilter, memberRowsAll],
  );

  return (
    <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-100">
            <Users className="h-4 w-4" />
            管理者画面
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">営業担当別 顧客管理データ</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            現在のセミナー・チーム・流入条件を適用した上で、選択した営業担当のミラー済み明細を確認できます。
          </p>
        </div>
        <label className="grid gap-1 text-sm text-slate-300 lg:w-[280px]">
          <span className="text-xs font-medium text-slate-400">営業担当</span>
          <select
            value={effectiveMember}
            onChange={(event) => onSelectMember(event.target.value)}
            className="h-11 rounded-md border border-cyan-300/25 bg-slate-950 px-3 text-sm text-white outline-none"
          >
            <option value={ALL_ADMIN_MEMBERS}>全て</option>
            {members.map((member) => (
              <option key={member.name} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-300 lg:w-[280px]">
          <span className="text-xs font-medium text-slate-400">実施後ステータス</span>
          <select
            value={effectiveStatusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-md border border-cyan-300/25 bg-slate-950 px-3 text-sm text-white outline-none"
          >
            <option value="all">全ステータス</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-300 lg:w-[280px]">
          <span className="text-xs font-medium text-slate-400">並び順</span>
          <select
            value={adminSort}
            onChange={(event) => setAdminSort(event.target.value as AdminSortKey)}
            className="h-11 rounded-md border border-cyan-300/25 bg-slate-950 px-3 text-sm text-white outline-none"
          >
            <option value="appointmentDesc">面談日 新しい順</option>
            <option value="appointmentAsc">面談日 古い順</option>
            <option value="memberAsc">営業担当 あいうえお順</option>
            <option value="memberDesc">営業担当 逆順</option>
          </select>
        </label>
      </div>

      {summaryKpi ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SmallMetric label="対象行" value={`${memberRows.length}件`} />
          <SmallMetric label="担当者全体" value={`${memberRowsAll.length}件`} />
          <SmallMetric label="予約枠数" value={`${summaryKpi.leads}件`} />
          <SmallMetric label="着座数" value={`${summaryKpi.seated}件`} />
          <SmallMetric label="成約数" value={`${summaryKpi.closed}件`} />
          <SmallMetric label="予定込み成約率" value={formatPercent(summaryKpi.projectedRate)} />
        </div>
      ) : null}

      {memberRows.length ? (
        <>
          <div className="mt-5 hidden overflow-x-auto rounded-lg border border-white/10 lg:block">
            <table className="w-full min-w-[1160px] border-collapse text-sm">
              <thead className="bg-slate-900 text-xs text-slate-400">
                <tr>
                  <th className="px-3 py-3 text-left">営業担当</th>
                  <th className="px-3 py-3 text-left">面談日</th>
                  <th className="px-3 py-3 text-left">セミナー</th>
                  <th className="px-3 py-3 text-left">流入</th>
                  <th className="px-3 py-3 text-left">流入経路</th>
                  <th className="px-3 py-3 text-left">着座</th>
                  <th className="px-3 py-3 text-left">ステータス</th>
                  <th className="px-3 py-3 text-left">保留回答予定日</th>
                  <th className="px-3 py-3 text-left">決着日</th>
                  <th className="px-3 py-3 text-left">成約プラン</th>
                  <th className="px-3 py-3 text-left">失注理由</th>
                  <th className="px-3 py-3 text-left">保留理由</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((row, index) => (
                  <tr key={`${row.member}-${row.appointmentDate}-${index}`} className="border-t border-white/10 odd:bg-white/[0.02]">
                    <AdminCell value={row.member} />
                    <AdminCell value={row.appointmentDate} />
                    <AdminCell value={row.seminar} />
                    <AdminCell value={row.inflow} />
                    <AdminCell value={row.trafficRoute} />
                    <AdminCell value={row.seat} />
                    <AdminCell value={row.status} />
                    <AdminCell value={row.holdAnswerDate} />
                    <AdminCell value={row.paymentDate} />
                    <AdminCell value={row.contractPlan} />
                    <AdminCell value={row.lostReason} wide />
                    <AdminCell value={row.holdReason} wide />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 lg:hidden">
            {memberRows.map((row, index) => (
              <div key={`${row.member}-${row.appointmentDate}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/35 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{displayAdminValue(row.appointmentDate)}</p>
                    <p className="mt-1 text-xs text-slate-400">{displayAdminValue(row.member)} / {displayAdminValue(row.seminar)}</p>
                  </div>
                  <span className="rounded-md bg-cyan-300/15 px-2 py-1 text-xs font-semibold text-cyan-100">
                    {displayAdminValue(row.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-300">
                  <AdminInfo label="流入" value={row.inflow} />
                  <AdminInfo label="流入経路" value={row.trafficRoute} />
                  <AdminInfo label="着座" value={row.seat} />
                  <AdminInfo label="保留回答予定日" value={row.holdAnswerDate} />
                  <AdminInfo label="決着日" value={row.paymentDate} />
                  <AdminInfo label="成約プラン" value={row.contractPlan} />
                  <AdminInfo label="失注理由" value={row.lostReason} />
                  <AdminInfo label="保留理由" value={row.holdReason} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-md border border-white/10 bg-slate-950/35 px-3 py-4 text-sm text-slate-400">
          条件に一致する明細がありません。
        </p>
      )}
    </section>
  );
}

function displayAdminValue(value: string) {
  return value?.trim() || "-";
}

function AdminCell({ value, wide = false }: { value: string; wide?: boolean }) {
  return (
    <td className={`whitespace-normal break-words px-3 py-3 align-top text-slate-300 ${wide ? "min-w-[180px] leading-5" : ""}`}>
      {displayAdminValue(value)}
    </td>
  );
}

function AdminInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 whitespace-normal break-words leading-5 text-slate-200">{displayAdminValue(value)}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 px-3 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold leading-snug text-white">{value}</p>
    </div>
  );
}

function RatioRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">{formatPercent(value)}</span>
      </div>
      <ProgressBar value={value} />
    </div>
  );
}

function MemberTable({
  members,
  onSelect,
  selectedMember,
}: {
  members: TeamMemberKpi[];
  onSelect: (member: string) => void;
  selectedMember?: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-white">メンバー別KPI</h2>
          <p className="text-xs text-slate-400">行を押すと個別の理由分析に切り替わります。</p>
        </div>
        <TrendingUp className="h-5 w-5 text-teal-300" />
      </div>
      <div className="grid gap-3 p-3 lg:hidden">
        {members.map((member, index) => (
          <button
            key={member.name}
            type="button"
            onClick={() => onSelect(member.name)}
            className={`rounded-lg border p-3 text-left ${
              selectedMember === member.name ? "border-teal-300/60 bg-teal-300/10" : "border-white/10 bg-slate-950/35"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-cyan-300/15 px-1.5 py-0.5 text-xs font-semibold text-cyan-100">#{index + 1}</span>
                  <p className="truncate font-semibold text-white">{member.name}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">予約 {member.leads}件 / 着座 {member.seated}件</p>
              </div>
              {member.alert > 0 ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-500/15 px-2 py-1 text-xs font-medium text-rose-100">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {member.alert}
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <SmallMetric label="着座率" value={formatPercent(member.seatRate)} />
              <SmallMetric label="予約枠数" value={`${member.leads}`} />
              <SmallMetric label="実成約率" value={formatPercent(member.closeRate)} />
              <SmallMetric label="保留→成約率" value={formatPercent(member.holdConversionRate)} />
              <SmallMetric label="予定込み" value={formatPercent(member.projectedRate)} />
              <SmallMetric label="成約/予定/保留" value={`${member.closed}/${member.pending}/${member.hold}`} />
              <SmallMetric label="成約内訳" value={formatPlanBreakdown(member)} />
            </div>
          </button>
        ))}
      </div>
      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="w-[5%] px-3 py-3 text-right">順位</th>
              <th className="w-[11%] px-3 py-3 text-left">メンバー</th>
              <th className="w-[9%] px-3 py-3 text-left">チーム</th>
              <th className="w-[9%] px-3 py-3 text-right">予約/着座</th>
              <th className="w-[12%] px-3 py-3 text-left">着座率</th>
              <th className="w-[8%] px-3 py-3 text-right">成約/予定</th>
              <th className="w-[12%] px-3 py-3 text-right">成約内訳</th>
              <th className="w-[8%] px-3 py-3 text-right">実成約率</th>
              <th className="w-[9%] px-3 py-3 text-right">保留→成約率</th>
              <th className="w-[8%] px-3 py-3 text-right">予定込み</th>
              <th className="w-[5%] px-3 py-3 text-right">保留</th>
              <th className="w-[4%] px-3 py-3 text-right">警告</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr
                key={member.name}
                onClick={() => onSelect(member.name)}
                className={`cursor-pointer border-t border-white/10 odd:bg-white/[0.02] hover:bg-teal-300/5 ${
                  selectedMember === member.name ? "bg-teal-300/10" : ""
                }`}
              >
                <td className="px-3 py-3 text-right font-semibold text-cyan-100">#{index + 1}</td>
                <td className="truncate px-3 py-3 font-medium text-white" title={member.name}>{member.name}</td>
                <td className="truncate px-3 py-3 text-slate-400" title={member.team}>{member.team}</td>
                <td className="px-3 py-3 text-right text-slate-300">{member.leads}/{member.seated}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-right text-slate-200">{formatPercent(member.seatRate)}</span>
                    <ProgressBar value={member.seatRate} />
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-slate-200">{member.closed}/{member.pending}</td>
                <td className="whitespace-normal break-words px-3 py-3 text-right text-xs leading-5 text-slate-300">
                  {formatPlanBreakdown(member)}
                </td>
                <td className="px-3 py-3 text-right font-medium text-teal-100">{formatPercent(member.closeRate)}</td>
                <td className="px-3 py-3 text-right text-amber-100">{formatPercent(member.holdConversionRate)}</td>
                <td className="px-3 py-3 text-right font-semibold text-cyan-100">{formatPercent(member.projectedRate)}</td>
                <td className="px-3 py-3 text-right text-violet-100">{member.hold}</td>
                <td className="px-3 py-3 text-right">
                  {member.alert > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-1 text-xs font-medium text-rose-100">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {member.alert}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />0
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPanel({ statusMix }: { statusMix: TeamSalesDashboardData["statusMix"] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-base font-semibold text-white">ステータス内訳</h2>
      <div className="mt-4 space-y-3">
        {statusMix.length ? statusMix.map((status) => (
          <div key={status.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-300">{status.label}</span>
              <span className="text-slate-400">
                {status.count}件 / {formatPercent(status.rate)}
              </span>
            </div>
            <ProgressBar value={status.rate} />
          </div>
        )) : (
          <p className="rounded-md border border-white/10 bg-slate-950/35 px-3 py-4 text-sm text-slate-400">
            ステータスデータはありません。
          </p>
        )}
      </div>
    </section>
  );
}

function ReasonMatrix({ members }: { members: TeamMemberKpi[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-cyan-200" />
        <h2 className="text-base font-semibold text-white">メンバー別 理由トップ</h2>
      </div>
      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-slate-900 text-xs text-slate-400">
            <tr>
              <th className="px-3 py-3 text-left">メンバー</th>
              <th className="px-3 py-3 text-left">失注理由TOP</th>
              <th className="px-3 py-3 text-right">失注理由数</th>
              <th className="px-3 py-3 text-left">保留理由TOP</th>
              <th className="px-3 py-3 text-right">保留数</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.name} className="border-t border-white/10 odd:bg-white/[0.02]">
                <td className="px-3 py-3 font-medium text-white">{member.name}</td>
                <td className="whitespace-normal break-words px-3 py-3 leading-5 text-slate-300">{topReason(member.lostReasons)}</td>
                <td className="px-3 py-3 text-right text-rose-100">{sumReasons(member.lostReasons)}</td>
                <td className="whitespace-normal break-words px-3 py-3 leading-5 text-slate-300">{topReason(member.holdReasons)}</td>
                <td className="px-3 py-3 text-right text-amber-100">{sumReasons(member.holdReasons)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 lg:hidden">
        {members.map((member) => (
          <div key={member.name} className="rounded-lg border border-white/10 bg-slate-950/35 p-3">
            <p className="font-semibold text-white">{member.name}</p>
            <div className="mt-3 grid gap-2">
              <SmallMetric label="失注理由TOP" value={`${topReason(member.lostReasons)} / ${sumReasons(member.lostReasons)}件`} />
              <SmallMetric label="保留理由TOP" value={`${topReason(member.holdReasons)} / ${sumReasons(member.holdReasons)}件`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
