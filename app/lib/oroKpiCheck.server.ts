import { fetchTeamSalesData } from "../api/team-sales-dashboard/route";
import {
  ORO_REPORT_MEMBERS,
  ORO_ROLE_MENTION,
  type OroKpiCheckData,
  type OroKpiMember,
  type OroKpiMetrics,
} from "../oro-kpi-check/data";

const EMPTY_METRICS: OroKpiMetrics = {
  reservations: 0,
  seated: 0,
  seatRate: 0,
  closed: 0,
  pending: 0,
  closeRate: 0,
};

function normalizeName(value: string) {
  return value.replace(/[\s　]/g, "").replace(/髙/g, "高").trim();
}

function floorRate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.floor((numerator / denominator) * 100) : 0;
}

function getTokyoCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "09";
  return `${year}-${month}`;
}

function getTokyoToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "09";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function normalizeOroKpiMonth(value?: string | null) {
  const fallback = getTokyoCurrentMonth();
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return fallback;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12 ? value : fallback;
}

function getMonthLabels(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return {
    report: `${monthNumber}月商談`,
    seminar: `${String(year).slice(-2)}年${monthNumber}月セミナー`,
  };
}

function getRealtimeMonthRange(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
  const today = getTokyoToday();

  return {
    startDate: `${month}-01`,
    endDate: today < monthEnd ? today : monthEnd,
  };
}

function sumMetrics(members: OroKpiMember[]): OroKpiMetrics {
  const counts = members.reduce(
    (total, member) => ({
      reservations: total.reservations + member.metrics.reservations,
      seated: total.seated + member.metrics.seated,
      closed: total.closed + member.metrics.closed,
      pending: total.pending + member.metrics.pending,
    }),
    { reservations: 0, seated: 0, closed: 0, pending: 0 },
  );

  return {
    ...counts,
    seatRate: floorRate(counts.seated, counts.reservations),
    closeRate: floorRate(counts.closed, counts.seated),
  };
}

function buildOfficialText(monthLabel: string, members: OroKpiMember[], totals: OroKpiMetrics) {
  const lines = [
    ORO_ROLE_MENTION,
    "",
    `# 全商談更新【${monthLabel}】`,
    "",
    "# 全体現状結果",
    "",
    `予約数:${totals.reservations}`,
    `着座数:${totals.seated}`,
    `着座率:${totals.seatRate}%`,
    `成約数:${totals.closed}`,
    `成約率:${totals.closeRate}%`,
    "",
    "### 目標:成約率40%",
    "",
    "### 着座率70%",
  ];

  members.forEach((member) => {
    lines.push(
      "",
      `## ${member.displayName}`,
      "",
      member.discordMention,
      "",
      `予約数:${member.metrics.reservations}`,
      `着座数:${member.metrics.seated}`,
      `着座率:${member.metrics.seatRate}%`,
      `成約数:${member.metrics.closed}`,
      `成約予定数:${member.metrics.pending}`,
      `成約率:${member.metrics.closeRate}%`,
    );
  });

  return lines.join("\n");
}

export async function loadOroKpiCheckData(rawMonth?: string | null): Promise<OroKpiCheckData> {
  const month = normalizeOroKpiMonth(rawMonth);
  const labels = getMonthLabels(month);
  const range = getRealtimeMonthRange(month);
  const dashboard = await fetchTeamSalesData(
    "全期間",
    "全チーム",
    "all",
    "all",
    "calendar",
    range.startDate,
    range.endDate,
  );

  if (!dashboard) throw new Error("KPIデータを取得できませんでした");

  const members: OroKpiMember[] = ORO_REPORT_MEMBERS.map((definition) => {
    const sourceMember = dashboard.members.find(
      (member) => normalizeName(member.name) === normalizeName(definition.fullName),
    );
    const counts = sourceMember
      ? {
          reservations: sourceMember.leads,
          seated: sourceMember.seated,
          closed: sourceMember.closed,
          pending: sourceMember.pending,
        }
      : EMPTY_METRICS;
    const metrics: OroKpiMetrics = {
      reservations: counts.reservations,
      seated: counts.seated,
      seatRate: floorRate(counts.seated, counts.reservations),
      closed: counts.closed,
      pending: counts.pending,
      closeRate: floorRate(counts.closed, counts.seated),
    };

    return { ...definition, metrics };
  });
  const totals = sumMetrics(members);

  return {
    month,
    monthLabel: labels.report,
    updatedAt: dashboard.updatedAt,
    source: dashboard.source,
    members,
    totals,
    officialText: buildOfficialText(labels.report, members, totals),
  };
}
