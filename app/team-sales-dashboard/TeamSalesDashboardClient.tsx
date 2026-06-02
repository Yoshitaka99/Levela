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
import type { ReasonCount, TeamMemberKpi, TeamSalesDashboardData } from "./data";

type TabKey = "overview" | "members" | "reasons" | "alerts";
type SortKey = "projectedRate" | "closeRate" | "seatRate" | "lost" | "hold";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "全体" },
  { key: "members", label: "メンバー" },
  { key: "reasons", label: "理由分析" },
  { key: "alerts", label: "アラート" },
];

const sortButtons: { key: SortKey; label: string }[] = [
  { key: "projectedRate", label: "予定込み成約率" },
  { key: "closeRate", label: "実成約率" },
  { key: "seatRate", label: "着座率" },
  { key: "lost", label: "失注理由数" },
  { key: "hold", label: "保留理由数" },
];

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function sumReasons(reasons: ReasonCount[]) {
  return reasons.reduce((sum, reason) => sum + reason.count, 0);
}

function topReason(reasons: ReasonCount[]) {
  return reasons[0]?.label ?? "該当なし";
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
                <span className="min-w-0 whitespace-normal break-words leading-5 text-slate-300">{reason.label}</span>
                <span className="shrink-0 font-semibold text-white">{reason.count}件</span>
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
  initialOnlyAlerts,
  initialOnlyHold,
  basePath = "/team-sales-dashboard",
}: {
  initialData: TeamSalesDashboardData;
  initialTab: TabKey;
  initialSort: SortKey;
  initialMember?: string;
  initialQuery?: string;
  initialSeminar?: string;
  initialTeam?: string;
  initialOnlyAlerts: boolean;
  initialOnlyHold: boolean;
  basePath?: string;
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [selectedSeminar, setSelectedSeminar] = useState(initialSeminar ?? initialData.selectedSeminar);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam ?? initialData.selectedTeam);
  const [onlyAlerts, setOnlyAlerts] = useState(initialOnlyAlerts);
  const [onlyHold, setOnlyHold] = useState(initialOnlyHold);
  const [selectedMember, setSelectedMember] = useState(
    initialData.members.some((member) => member.name === initialMember)
      ? initialMember ?? ""
      : initialData.members[0]?.name ?? "",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRequestRef = useRef(0);

  const refreshData = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    const requestedSeminar = selectedSeminar;
    const requestedTeam = selectedTeam;

    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (requestedSeminar) params.set("seminar", requestedSeminar);
      if (requestedTeam) params.set("team", requestedTeam);
      const response = await fetch(`/api/team-sales-dashboard?${params.toString()}`, { cache: "no-store" });
      const nextData = (await response.json()) as TeamSalesDashboardData;

      if (requestId !== refreshRequestRef.current) return;

      setData(nextData);
      setSelectedSeminar(nextData.selectedSeminar || requestedSeminar);
      setSelectedTeam(nextData.selectedTeam || requestedTeam);
      setLastSyncedAt(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
      setSelectedMember((currentMember) =>
        nextData.members.some((member) => member.name === currentMember) ? currentMember : nextData.members[0]?.name ?? "",
      );
    } finally {
      if (requestId === refreshRequestRef.current) setIsRefreshing(false);
    }
  }, [selectedSeminar, selectedTeam]);

  useEffect(() => {
    refreshData();
    const timer = window.setInterval(refreshData, 30000);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  const totals = useMemo(
    () =>
      data.members.reduce(
        (sum, member) => ({
          leads: sum.leads + member.leads,
          seated: sum.seated + member.seated,
          closed: sum.closed + member.closed,
          pending: sum.pending + member.pending,
          hold: sum.hold + member.hold,
          alert: sum.alert + member.alert,
        }),
        { leads: 0, seated: 0, closed: 0, pending: 0, hold: 0, alert: 0 },
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
      return b[sortKey] - a[sortKey];
    });
  }, [data.members, onlyAlerts, onlyHold, query, sortKey]);

  useEffect(() => {
    if (!filteredMembers.length) return;
    if (!filteredMembers.some((member) => member.name === selectedMember)) {
      setSelectedMember(filteredMembers[0].name);
    }
  }, [filteredMembers, selectedMember]);

  const selected = data.members.find((member) => member.name === selectedMember) ?? data.members[0];
  const alertMembers = data.members.filter((member) => member.alert > 0 || member.hold > 0);
  const activeFilterCount = Number(onlyAlerts) + Number(onlyHold) + Number(Boolean(query.trim()));
  const visibleSortButtons =
    activeTab === "reasons"
      ? sortButtons.filter((button) => button.key === "lost" || button.key === "hold")
      : sortButtons;

  function dashboardHref(
    overrides: {
      tab?: TabKey;
      sort?: SortKey;
      member?: string | null;
      q?: string | null;
      seminar?: string | null;
      team?: string | null;
      alerts?: boolean;
      hold?: boolean;
    } = {},
  ) {
    const params = new URLSearchParams();
    params.set("tab", overrides.tab ?? activeTab);
    params.set("sort", overrides.sort ?? sortKey);

    const nextMember = overrides.member === undefined ? selectedMember : overrides.member;
    const nextQuery = overrides.q === undefined ? query.trim() : overrides.q;
    const nextSeminar = overrides.seminar === undefined ? selectedSeminar : overrides.seminar;
    const nextTeam = overrides.team === undefined ? selectedTeam : overrides.team;
    const nextAlerts = overrides.alerts ?? onlyAlerts;
    const nextHold = overrides.hold ?? onlyHold;

    if (nextSeminar) params.set("seminar", nextSeminar);
    if (nextTeam) params.set("team", nextTeam);
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

  function selectMember(memberName: string) {
    setSelectedMember(memberName);
    setActiveTab("members");
    window.history.replaceState(null, "", dashboardHref({ tab: "members", member: memberName }));
  }

  function changeSeminar(nextSeminar: string) {
    refreshRequestRef.current += 1;
    setSelectedSeminar(nextSeminar);
    setSelectedMember("");
    window.history.replaceState(null, "", dashboardHref({ seminar: nextSeminar, member: null }));
  }

  function changeTeam(nextTeam: string) {
    refreshRequestRef.current += 1;
    setSelectedTeam(nextTeam);
    setSelectedMember("");
    window.history.replaceState(null, "", dashboardHref({ team: nextTeam, member: null }));
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
              <span>{data.selectedSeminar}</span>
              <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs">{data.selectedTeam}</span>
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
            <select
              value={selectedSeminar}
              onChange={(event) => changeSeminar(event.target.value)}
              className="h-10 w-full rounded-md border border-teal-300/25 bg-slate-950 px-3 text-sm text-white outline-none sm:w-[220px]"
            >
              {data.seminars.map((seminar) => (
                <option key={seminar} value={seminar}>
                  {seminar}
                </option>
              ))}
            </select>
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
            <form action={basePath} className="inline-flex h-10 w-full items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-slate-200 sm:w-[260px]">
              <input type="hidden" name="tab" value={activeTab} />
              <input type="hidden" name="sort" value={sortKey} />
              <input type="hidden" name="seminar" value={selectedSeminar} />
              <input type="hidden" name="team" value={selectedTeam} />
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
              setQuery("");
              setOnlyAlerts(false);
              setOnlyHold(false);
              window.history.replaceState(null, "", dashboardHref({ q: null, alerts: false, hold: false, member: null }));
            }}
            className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-slate-300"
          >
            <Filter className="h-4 w-4" />
            条件クリア{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
          </button>
          <span className="text-xs text-slate-400">表示対象: {filteredMembers.length}名</span>
          <span className="text-xs text-slate-500">最終同期: {lastSyncedAt || "確認中"} / 30秒ごとに更新</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricTile label="実際の着座" value={`${totals.seated}`} sub={`抽出 ${totals.leads} 件 / 着座率 ${formatPercent(seatRate)}`} tone="cyan" icon={Users} />
          <MetricTile label="成約数" value={`${totals.closed}`} sub={`実成約率 ${formatPercent(closeRate)}`} tone="teal" icon={CheckCircle2} />
          <MetricTile label="成約予定" value={`${totals.pending}`} sub={`予定込み成約率 ${formatPercent(projectedRate)}`} tone="amber" icon={TrendingUp} />
          <MetricTile label="保留" value={`${totals.hold}`} sub="保留理由を理由分析で確認" tone="violet" icon={CircleDot} />
          <MetricTile label="要確認" value={`${totals.alert}`} sub="成約済みで着金日未入力" tone="rose" icon={AlertTriangle} />
        </div>

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

        {activeTab === "overview" ? (
          <div className="mt-5 grid gap-5">
            <MemberTable members={filteredMembers} onSelect={selectMember} selectedMember={selected?.name} />
            <div className="grid gap-5 lg:grid-cols-2">
              <StatusPanel statusMix={data.statusMix} />
              <ReasonList title="失注理由 TOP" icon={CircleDot} reasons={data.lostReasons} tone="rose" />
            </div>
          </div>
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
                      <span>着座 {member.seated}</span>
                      <span>成約 {member.closed}</span>
                      <span>予定 {member.pending}</span>
                      <span>保留 {member.hold}</span>
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
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <SmallMetric label="予定込み成約率" value={formatPercent(selected.projectedRate)} />
                <SmallMetric label="実成約率" value={formatPercent(selected.closeRate)} />
                <SmallMetric label="着座率" value={formatPercent(selected.seatRate)} />
                <SmallMetric label="成約予定" value={`${selected.pending}件`} />
              </div>
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-white">KPIバランス</h3>
                <div className="space-y-3 rounded-lg border border-white/10 bg-slate-950/35 p-3">
                  <RatioRow label="着座率" value={selected.seatRate} />
                  <RatioRow label="実成約率" value={selected.closeRate} />
                  <RatioRow label="予定込み成約率" value={selected.projectedRate} />
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
      </section>
    </main>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 px-3 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
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
        {members.map((member) => (
          <button
            key={member.name}
            type="button"
            onClick={() => onSelect(member.name)}
            className={`rounded-lg border p-3 text-left ${
              selectedMember === member.name ? "border-teal-300/60 bg-teal-300/10" : "border-white/10 bg-slate-950/35"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{member.name}</p>
                <p className="mt-1 text-xs text-slate-400">抽出 {member.leads}件 / 着座 {member.seated}件</p>
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
              <SmallMetric label="実成約率" value={formatPercent(member.closeRate)} />
              <SmallMetric label="予定込み" value={formatPercent(member.projectedRate)} />
              <SmallMetric label="成約/予定/保留" value={`${member.closed}/${member.pending}/${member.hold}`} />
            </div>
          </button>
        ))}
      </div>
      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="w-[17%] px-4 py-3 text-left">メンバー</th>
              <th className="w-[14%] px-3 py-3 text-left">チーム</th>
              <th className="w-[10%] px-3 py-3 text-right">抽出/着座</th>
              <th className="w-[15%] px-3 py-3 text-left">着座率</th>
              <th className="w-[10%] px-3 py-3 text-right">成約/予定</th>
              <th className="w-[11%] px-3 py-3 text-right">実成約率</th>
              <th className="w-[11%] px-3 py-3 text-right">予定込み</th>
              <th className="w-[7%] px-3 py-3 text-right">保留</th>
              <th className="w-[5%] px-3 py-3 text-right">警告</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.name}
                onClick={() => onSelect(member.name)}
                className={`cursor-pointer border-t border-white/10 odd:bg-white/[0.02] hover:bg-teal-300/5 ${
                  selectedMember === member.name ? "bg-teal-300/10" : ""
                }`}
              >
                <td className="truncate px-4 py-3 font-medium text-white" title={member.name}>{member.name}</td>
                <td className="truncate px-3 py-3 text-slate-400" title={member.team}>{member.team}</td>
                <td className="px-3 py-3 text-right text-slate-300">{member.leads}/{member.seated}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-right text-slate-200">{formatPercent(member.seatRate)}</span>
                    <ProgressBar value={member.seatRate} />
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-slate-200">{member.closed}/{member.pending}</td>
                <td className="px-3 py-3 text-right font-medium text-teal-100">{formatPercent(member.closeRate)}</td>
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
