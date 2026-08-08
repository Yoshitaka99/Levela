import type { TeamMemberKpi, TeamSalesDashboardData } from "./data";

export type SalesDrillComparisonUnit = "week" | "month";

export type SalesDrillDateRange = {
  startDate: string;
  endDate: string;
};

type KpiSummary = Pick<
  TeamMemberKpi,
  | "leads"
  | "seated"
  | "closed"
  | "tokushinClosed"
  | "basicClosed"
  | "pending"
  | "hold"
  | "holdClosed"
  | "holdLost"
  | "alert"
>;

const EMPTY_SUMMARY: KpiSummary = {
  leads: 0,
  seated: 0,
  closed: 0,
  tokushinClosed: 0,
  basicClosed: 0,
  pending: 0,
  hold: 0,
  holdClosed: 0,
  holdLost: 0,
  alert: 0,
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
  target.leads += source.leads;
  target.seated += source.seated;
  target.closed += source.closed;
  target.tokushinClosed += source.tokushinClosed;
  target.basicClosed += source.basicClosed;
  target.pending += source.pending;
  target.hold += source.hold;
  target.holdClosed += source.holdClosed;
  target.holdLost += source.holdLost;
  target.alert += source.alert;
  return target;
}

function summarizeMembers(members: TeamMemberKpi[]) {
  return members.reduce((summary, member) => addSummary(summary, member), { ...EMPTY_SUMMARY });
}

function rate(numerator: number, denominator: number) {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function holdBase(summary: KpiSummary) {
  return summary.holdClosed + summary.holdLost + summary.hold;
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
  const resolvedHold = holdBase(summary);
  return [
    `予約${summary.leads}件`,
    `着座${summary.seated}件`,
    `着座率${formatPercent(rate(summary.seated, summary.leads))}`,
    `成約${summary.closed}件（特進${summary.tokushinClosed}件・ベーシック${summary.basicClosed}件）`,
    `実成約率${formatPercent(rate(summary.closed, summary.seated))}`,
    `成約予定${summary.pending}件`,
    `予定込み成約率${formatPercent(rate(summary.closed + summary.pending, summary.seated))}`,
    `未決着保留${summary.hold}件`,
    `保留→成約${summary.holdClosed}件/${resolvedHold}件（${formatPercent(rate(summary.holdClosed, resolvedHold))}）`,
    `要確認${summary.alert}件`,
  ].join("、");
}

function formatSummaryDelta(current: KpiSummary, previous: KpiSummary) {
  return [
    `予約${formatCountDelta(current.leads, previous.leads)}`,
    `着座${formatCountDelta(current.seated, previous.seated)}`,
    `着座率${formatRateDelta(rate(current.seated, current.leads), rate(previous.seated, previous.leads))}`,
    `成約${formatCountDelta(current.closed, previous.closed)}`,
    `実成約率${formatRateDelta(rate(current.closed, current.seated), rate(previous.closed, previous.seated))}`,
    `成約予定${formatCountDelta(current.pending, previous.pending)}`,
    `予定込み成約率${formatRateDelta(
      rate(current.closed + current.pending, current.seated),
      rate(previous.closed + previous.pending, previous.seated),
    )}`,
    `未決着保留${formatCountDelta(current.hold, previous.hold)}`,
    `保留→成約率${formatRateDelta(
      rate(current.holdClosed, holdBase(current)),
      rate(previous.holdClosed, holdBase(previous)),
    )}`,
  ].join("、");
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

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });
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
    `対象メンバー: ${members.length}名`,
    `データ更新: ${formatUpdatedAt(currentData.updatedAt)}`,
    "",
    "【全体KPI】",
    `今回: ${formatSummary(currentTotal)}`,
    `前期間: ${formatSummary(previousTotal)}`,
    `前期間比: ${formatSummaryDelta(currentTotal, previousTotal)}`,
    "",
    "【チーム比較】",
    ...teamNames.map((team, index) => {
      const current = currentTeams.get(team) ?? { ...EMPTY_SUMMARY };
      const previous = previousTeams.get(team) ?? { ...EMPTY_SUMMARY };
      return `${index + 1}. ${team}\n今回: ${formatSummary(current)}\n前期間: ${formatSummary(previous)}\n差分: ${formatSummaryDelta(current, previous)}`;
    }),
    "",
    "【個人比較】",
    ...members.map((member, index) => {
      const current = member.current ? addSummary({ ...EMPTY_SUMMARY }, member.current) : { ...EMPTY_SUMMARY };
      const previous = member.previous ? addSummary({ ...EMPTY_SUMMARY }, member.previous) : { ...EMPTY_SUMMARY };
      return `${index + 1}. ${member.name}（${member.team}）\n今回: ${formatSummary(current)}\n前期間: ${formatSummary(previous)}\n差分: ${formatSummaryDelta(current, previous)}`;
    }),
    "",
    "【計算定義】",
    "着座率=着座数÷予約数",
    "実成約率=成約数÷着座数",
    "予定込み成約率=（成約数+成約予定数）÷着座数",
    "保留→成約率=保留→成約数÷（保留→成約数+保留→失注数+未決着保留数）",
    "率の差分はポイント（pt）、件数の差分は件で表記。分母0件の率は0.0%として表記。",
  ];

  return lines.join("\n");
}
