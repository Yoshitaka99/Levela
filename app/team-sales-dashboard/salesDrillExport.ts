import type { TeamMemberKpi, TeamSalesDashboardData } from "./data";

export type SalesDrillComparisonUnit = "week" | "month";

export type SalesDrillDateRange = {
  startDate: string;
  endDate: string;
};

type KpiSummary = Pick<TeamMemberKpi, "seated" | "closed">;

const EMPTY_SUMMARY: KpiSummary = {
  seated: 0,
  closed: 0,
};

function parseIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonday(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

export function getSalesDrillComparisonRanges(unit: SalesDrillComparisonUnit, anchorDate: string) {
  const anchor = parseIsoDate(anchorDate);
  if (!anchor) return null;

  if (unit === "week") {
    const currentStart = getMonday(anchor);
    return {
      current: { startDate: formatIsoDate(currentStart), endDate: formatIsoDate(anchor) },
      previous: { startDate: formatIsoDate(addDays(currentStart, -7)), endDate: formatIsoDate(addDays(anchor, -7)) },
    };
  }

  const currentStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const previousStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const previousLastDay = new Date(anchor.getFullYear(), anchor.getMonth(), 0).getDate();
  const previousEnd = new Date(anchor.getFullYear(), anchor.getMonth() - 1, Math.min(anchor.getDate(), previousLastDay));

  return {
    current: { startDate: formatIsoDate(currentStart), endDate: formatIsoDate(anchor) },
    previous: { startDate: formatIsoDate(previousStart), endDate: formatIsoDate(previousEnd) },
  };
}

function addSummary(target: KpiSummary, source: TeamMemberKpi) {
  target.seated += source.seated;
  target.closed += source.closed;
  return target;
}

function summarizeMembers(members: TeamMemberKpi[]) {
  return members.reduce((summary, member) => addSummary(summary, member), { ...EMPTY_SUMMARY });
}

function rate(numerator: number, denominator: number) {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatCountDelta(current: number, previous: number) {
  const delta = current - previous;
  return `${delta > 0 ? "+" : ""}${delta}件`;
}

function formatRateDelta(current: number, previous: number) {
  const delta = current - previous;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}pt`;
}

function formatSummary(summary: KpiSummary) {
  return `成約数${summary.closed}件、成約率${formatPercent(rate(summary.closed, summary.seated))}`;
}

function formatSummaryDelta(current: KpiSummary, previous: KpiSummary) {
  return `成約数${formatCountDelta(current.closed, previous.closed)}、成約率${formatRateDelta(
    rate(current.closed, current.seated),
    rate(previous.closed, previous.seated),
  )}`;
}

function normalizeMemberName(name: string) {
  return name.replace(/\s+/g, "");
}

function groupMembersByTeam(members: TeamMemberKpi[]) {
  const teams = new Map<string, KpiSummary>();
  members.forEach((member) => {
    const summary = teams.get(member.team) ?? { ...EMPTY_SUMMARY };
    teams.set(member.team, addSummary(summary, member));
  });
  return teams;
}

function formatRange(range: SalesDrillDateRange) {
  return `${range.startDate}〜${range.endDate}`;
}

function formatTraffic(data: TeamSalesDashboardData) {
  if (data.selectedTraffic === "exclude_ad") return "広告除外";
  if (data.selectedTraffic === "ad") {
    return data.selectedAdSource === "all" ? "広告のみ（全広告）" : `広告のみ（${data.selectedAdSource.split(",").join(" / ")}）`;
  }
  return "全流入";
}

export function buildSalesDrillFactText({
  unit,
  ranges,
  currentData,
  previousData,
}: {
  unit: SalesDrillComparisonUnit;
  ranges: { current: SalesDrillDateRange; previous: SalesDrillDateRange };
  currentData: TeamSalesDashboardData;
  previousData: TeamSalesDashboardData;
}) {
  const currentTotal = summarizeMembers(currentData.members);
  const previousTotal = summarizeMembers(previousData.members);
  const currentTeams = groupMembersByTeam(currentData.members);
  const previousTeams = groupMembersByTeam(previousData.members);
  const teamNames = [...new Set([...currentTeams.keys(), ...previousTeams.keys()])].sort((a, b) => a.localeCompare(b, "ja"));
  const memberMap = new Map<
    string,
    { name: string; team: string; current?: TeamMemberKpi; previous?: TeamMemberKpi }
  >();

  previousData.members.forEach((member) => {
    memberMap.set(normalizeMemberName(member.name), { name: member.name, team: member.team, previous: member });
  });
  currentData.members.forEach((member) => {
    const key = normalizeMemberName(member.name);
    const existing = memberMap.get(key);
    memberMap.set(key, { name: member.name, team: member.team || existing?.team || "未所属", current: member, previous: existing?.previous });
  });

  const members = [...memberMap.values()].sort((a, b) => {
    const closedDiff = (b.current?.closed ?? 0) - (a.current?.closed ?? 0);
    if (closedDiff !== 0) return closedDiff;
    const seatedDiff = (b.current?.seated ?? 0) - (a.current?.seated ?? 0);
    if (seatedDiff !== 0) return seatedDiff;
    return a.name.localeCompare(b.name, "ja");
  });

  const lines = [
    "以下はチームセールスKPIから抽出した確定済みの事実数値です。評価・推測・改善判定は含みません。",
    "",
    "【期間・対象】",
    `比較単位: ${unit === "week" ? "週次（月曜始まり・同曜日まで）" : "月次（暦月・同日まで）"}`,
    `今回: ${formatRange(ranges.current)}`,
    `前期間: ${formatRange(ranges.previous)}`,
    `集計基準: 面談日`,
    `対象: ${currentData.selectedTeam}`,
    `流入条件: ${formatTraffic(currentData)}`,
    "",
    "【全体KPI】",
    `今回 ${formatSummary(currentTotal)} / 前期間 ${formatSummary(previousTotal)} / 差分 ${formatSummaryDelta(currentTotal, previousTotal)}`,
    "",
    "【チーム比較】",
    ...teamNames.map((team, index) => {
      const current = currentTeams.get(team) ?? { ...EMPTY_SUMMARY };
      const previous = previousTeams.get(team) ?? { ...EMPTY_SUMMARY };
      return `${index + 1}. ${team}: 今回 ${formatSummary(current)} / 前期間 ${formatSummary(previous)} / 差分 ${formatSummaryDelta(current, previous)}`;
    }),
    "",
    "【個人比較】",
    ...members.map((member, index) => {
      const current = member.current ? addSummary({ ...EMPTY_SUMMARY }, member.current) : { ...EMPTY_SUMMARY };
      const previous = member.previous ? addSummary({ ...EMPTY_SUMMARY }, member.previous) : { ...EMPTY_SUMMARY };
      return `${index + 1}. ${member.name}（${member.team}）: 今回 ${formatSummary(current)} / 前期間 ${formatSummary(previous)} / 差分 ${formatSummaryDelta(current, previous)}`;
    }),
  ];

  return lines.join("\n");
}
