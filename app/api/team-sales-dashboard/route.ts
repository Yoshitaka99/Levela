import { NextResponse } from "next/server";
import {
  defaultTeamSalesDashboardData,
  type AdSourceFilter,
  type ReasonCount,
  type StatusCount,
  type TeamMemberKpi,
  type TeamSalesDashboardData,
  type TrafficFilter,
  type WeeklyKpi,
} from "../../team-sales-dashboard/data";

export const dynamic = "force-dynamic";

const CUSTOMER_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1wDIaRyHx0NUUuZWaiP5R9oBhT0Ko5e8HLvaJMlLDmHo/gviz/tq?tqx=out:csv&gid=1151421241";
const SANITIZED_SOURCE_QUERY =
  "select B,C,D,E,F,G,H,I,N,O,Q,R,T where B is not null label D '流入経路', E '面談日', F '流入', H 'ステータス', I '保留回答予定日', N '決着日(着金日)', T '保留理由2'";
const SANITIZED_SOURCE_CSV_URL = `https://docs.google.com/spreadsheets/d/1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s/gviz/tq?tqx=out:csv&gid=2051214579&tq=${encodeURIComponent(SANITIZED_SOURCE_QUERY)}`;
const TEAM_SALES_MIRROR_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1a3WimNtSLyepfTZ3YxZmy3XAaV6eIG_8C-BdoAd4aIA/gviz/tq?tqx=out:csv&sheet=KPI_MIRROR&headers=1";

const DEFAULT_SEMINAR_TEXT = "5月セミナー";
const ALL_SEMINARS = "全期間";
const SEMINAR_SEPARATOR = ",";
const ALL_TEAMS = "全チーム";
const ALL_TRAFFIC: TrafficFilter = "all";
const AD_TRAFFIC: TrafficFilter = "ad";
const ALL_AD_SOURCES: AdSourceFilter = "all";
const AD_SOURCE_X: Exclude<AdSourceFilter, "all"> = "x";
const AD_SOURCE_META: Exclude<AdSourceFilter, "all"> = "meta";
const SALES_AGENCY_TEAM = "営業代行チーム";

const EXCLUDED_MEMBER_KEYWORDS = [
  "SNS運用",
  "SNSクラブ運営",
  "SNSクラブ運用",
  "SnsClub運営",
  "SnsClub",
];

const EXCLUDED_RAW_MEMBERS = new Set(["中島 絵美"]);
const EXCLUDED_EXACT_MEMBERS = new Set(["池上翔太", "有川薫", "中村珠梨"]);
const EXCLUDED_SEAT_STATUSES = new Set([
  "担当者変更",
  "重複予約",
  "無効アポ",
]);
const DATA_CACHE_TTL_MS = 60_000;

type TeamSalesDataCacheEntry = {
  expiresAt: number;
  data: TeamSalesDashboardData;
};

const dataCache = new Map<string, TeamSalesDataCacheEntry>();

const IMAGE_TEAM_DEFINITIONS: Record<string, string[]> = {
  [ALL_TEAMS]: [],
  "おろチーム": ["苙隼人", "田仲由敬", "早川大貴", "河上まちこ", "折原加純"],
  "こなつチーム": ["長谷川小夏", "関口愛里", "山本美結", "中島絵美", "鈴木里果"],
  "つかさチーム": ["森田主", "根本義暉", "水野王羅", "加藤陸", "藤田吉陽", "田口亮太", "五十嵐凌大"],
  "ひかりチーム": ["橋口陽香里", "上村勇人", "佐藤ひなた", "岡田美菜子", "岡崎未来代", "仲戸茶子"],
  "かずきチーム": ["野嶋一樹", "三浦拓迪", "笠松佑衣", "持木玲那", "持木紀哉", "田中悠喜"],
  "むさしチーム": ["坂口武蔵", "久田翔太", "佐々木将城", "杉井友紀", "稲波杏奈", "西岡駿"],
  "れいなチーム": ["高橋礼菜", "和佐田舞緒", "大谷みくに", "栗原日向子", "遠藤羽琉", "梅津真珠", "木原桃香"],
};

type SourceRow = Record<string, string>;

function parseTeamDefinitions() {
  return IMAGE_TEAM_DEFINITIONS;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headers = [], ...body] = rows.filter((line) => line.some(Boolean));
  return body.map((line) => {
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => {
      const key = header.trim();
      const value = line[index]?.trim() ?? "";
      entry[`__col_${index}`] = value;
      if (key && entry[key] === undefined) entry[key] = value;
    });
    return entry;
  });
}

function getValue(row: SourceRow, index: number, fallbackHeader?: string, aliases: string[] = []) {
  const headerKeys = [fallbackHeader, ...aliases].filter(Boolean) as string[];
  for (const key of headerKeys) {
    if (row[key] !== undefined) return row[key];
  }
  return row[`__col_${index}`] ?? "";
}

function getMappedValue(row: SourceRow, headers: string[], sanitizedIndex: number, sourceIndex: number) {
  for (const header of headers) {
    if (row[header] !== undefined) return row[header];
  }
  return row[`__col_${sanitizedIndex}`] ?? row[`__col_${sourceIndex}`] ?? "";
}

function getMember(row: SourceRow) {
  return getMappedValue(row, ["担当者名"], 0, 1).trim();
}

function getSeminar(row: SourceRow) {
  return getMappedValue(row, ["セミナー"], 1, 2).trim();
}

function getSeat(row: SourceRow) {
  return getMappedValue(row, ["着席", "着座"], 5, 6).trim();
}

function getStatus(row: SourceRow) {
  return getMappedValue(row, ["ステータス", "2回目/実施後ステータス"], 6, 7).trim();
}

function getAppointmentDate(row: SourceRow) {
  return getMappedValue(row, ["面談日", "A~F列に直接入力禁止！ 面談日"], 3, 4).trim();
}

function getTrafficRoute(row: SourceRow) {
  return getMappedValue(row, ["流入経路"], 2, 3).trim();
}

function getInflow(row: SourceRow) {
  return getMappedValue(row, ["流入"], 4, 5).trim();
}

function getPaymentDate(row: SourceRow) {
  return getMappedValue(row, ["決済日(着金日)", "決着日(着金日)", "決着日（着金日）"], 8, 13).trim();
}

function getLostReason(row: SourceRow) {
  return getMappedValue(row, ["失注理由"], 10, 16);
}

function getHoldReason(row: SourceRow) {
  return getMappedValue(row, ["保留理由"], 11, 17) || getMappedValue(row, ["保留理由2"], 12, 19);
}

function getHoldAnswerDate(row: SourceRow) {
  return getMappedValue(row, ["保留回答予定日"], 7, 8).trim();
}

function getContractPlan(row: SourceRow) {
  return getMappedValue(row, ["成約プラン"], 9, 14).trim();
}

function parseSheetDate(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  const slashDate = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (slashDate) {
    return {
      year: Number(slashDate[1]),
      month: Number(slashDate[2]),
      day: Number(slashDate[3]),
    };
  }

  const jpDate = normalized.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (jpDate) {
    return {
      year: Number(jpDate[1]),
      month: Number(jpDate[2]),
      day: Number(jpDate[3]),
    };
  }

  return null;
}

function getWeekLabel(row: SourceRow) {
  const seminar = getSeminar(row);
  const parsedDate = parseSheetDate(getAppointmentDate(row));
  if (!parsedDate) {
    return {
      key: `${seminar}:日付未入力`,
      seminar,
      label: "日付未入力",
      order: 99,
    };
  }

  const week = Math.min(Math.ceil(parsedDate.day / 7), 5);
  return {
    key: `${seminar}:第${week}週`,
    seminar,
    label: `第${week}週`,
    order: week,
  };
}

function getAppointmentWeekLabel(row: SourceRow) {
  const parsedDate = parseSheetDate(getAppointmentDate(row));
  if (!parsedDate) {
    return {
      key: "面談日未入力:日付未入力",
      seminar: "面談日未入力",
      label: "日付未入力",
      order: 99,
    };
  }

  const week = Math.min(Math.ceil(parsedDate.day / 7), 5);
  const monthLabel = `${parsedDate.year}/${parsedDate.month}`;
  return {
    key: `${monthLabel}:第${week}週`,
    seminar: monthLabel,
    label: `第${week}週`,
    order: week,
  };
}

function increment(map: Map<string, number>, rawLabel: string) {
  const label = rawLabel.trim() || "未記入";
  map.set(label, (map.get(label) ?? 0) + 1);
}

function formatReasonDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const parsed = parseSheetDate(trimmed);
  if (parsed) return `${parsed.month}/${parsed.day}`;

  return trimmed;
}

function incrementReasonWithDate(counts: Map<string, number>, dates: Map<string, Set<string>>, rawLabel: string, rawDate: string) {
  const label = rawLabel.trim() || "未記入";
  counts.set(label, (counts.get(label) ?? 0) + 1);

  const date = formatReasonDate(rawDate);
  if (!date) return;

  if (!dates.has(label)) dates.set(label, new Set());
  dates.get(label)?.add(date);
}

function toReasonCounts(map: Map<string, number>, limit = 6, dateMap?: Map<string, Set<string>>): ReasonCount[] {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .map(([label, count]) => ({
      label,
      count,
      rate: total ? (count / total) * 100 : 0,
      answerDates: dateMap?.get(label) ? [...dateMap.get(label)!].slice(0, 4) : undefined,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"))
    .slice(0, limit);
}

function normalizeMemberName(name: string) {
  return name.replace(/[\s　]/g, "").replace(/髙/g, "高").trim();
}

function isExcludedMember(member: string) {
  const normalized = normalizeMemberName(member);
  return (
    EXCLUDED_RAW_MEMBERS.has(member) ||
    [...EXCLUDED_EXACT_MEMBERS].some((name) => normalizeMemberName(name) === normalized) ||
    EXCLUDED_MEMBER_KEYWORDS.some((keyword) => member.includes(keyword))
  );
}

function isClosedStatus(status: string) {
  return status.trim().endsWith("成約");
}

function normalizeContractPlan(plan: string) {
  const normalized = plan.trim();
  if (normalized.includes("コミット")) return "tokushin";
  if (normalized.includes("プレプラ") || normalized.includes("プレミアムプラス")) return "basic";
  return "";
}

function getTrafficText(row: SourceRow) {
  return `${getTrafficRoute(row)} ${getInflow(row)}`;
}

function isAdTraffic(row: SourceRow) {
  return /ad/i.test(getTrafficText(row));
}

function getAdSource(row: SourceRow): Exclude<AdSourceFilter, "all"> | "" {
  const traffic = getTrafficText(row);
  if (/(^|[^a-z])x[_-]?ad/i.test(traffic) || /x[_-]?ad/i.test(traffic)) return AD_SOURCE_X;
  if (/meta/i.test(traffic)) return AD_SOURCE_META;
  return "";
}

function resolveTrafficFilter(value?: string | null): TrafficFilter {
  return value === AD_TRAFFIC ? AD_TRAFFIC : ALL_TRAFFIC;
}

function resolveAdSourceFilter(value?: string | null): AdSourceFilter {
  return value === AD_SOURCE_X || value === AD_SOURCE_META ? value : ALL_AD_SOURCES;
}

function matchesTrafficFilter(row: SourceRow, traffic: TrafficFilter, adSource: AdSourceFilter) {
  if (traffic === ALL_TRAFFIC) return true;
  if (!isAdTraffic(row)) return false;
  if (adSource === ALL_AD_SOURCES) return true;
  return getAdSource(row) === adSource;
}

function isPendingStatus(status: string) {
  const normalized = status.trim();
  return normalized.includes("成約予定") && !normalized.includes("失注") && !isClosedStatus(normalized);
}

function isLostStatus(status: string) {
  return status.includes("失注");
}

function isHoldStatus(status: string) {
  return status.trim() === "保留";
}

function isExcludedFromSeatBase(seat: string) {
  return EXCLUDED_SEAT_STATUSES.has(seat.trim());
}

function isSeated(seat: string) {
  const normalized = seat.trim();
  return normalized === "着座" || normalized === "着席";
}

function getSeminarOptions(rows: SourceRow[]) {
  const seminars = [
    ...new Set(
      rows
        .map((row) => getSeminar(row))
        .filter((seminar) => seminar.includes("セミナー")),
    ),
  ].sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
  return [ALL_SEMINARS, ...seminars];
}

function resolveSelectedSeminars(options: string[], requestedSeminar?: string | null) {
  const requested = requestedSeminar?.trim();
  if (requested) {
    const requestedOptions = requested
      .split(SEMINAR_SEPARATOR)
      .map((seminar) => seminar.trim())
      .filter(Boolean);

    if (requestedOptions.includes(ALL_SEMINARS)) return [ALL_SEMINARS];

    const selected = requestedOptions
      .map((seminar) => {
        if (options.includes(seminar)) return seminar;
        return options.find((option) => option !== ALL_SEMINARS && option.includes(seminar));
      })
      .filter((seminar): seminar is string => Boolean(seminar));

    const uniqueSelected = [...new Set(selected)];
    if (uniqueSelected.length) return uniqueSelected;
  }

  if (requested) {
    const partialMatch = options.find((option) => option.includes(requested));
    if (partialMatch) return [partialMatch];
  }

  return [options.find((option) => option.includes(DEFAULT_SEMINAR_TEXT)) ?? options.find((option) => option !== ALL_SEMINARS) ?? DEFAULT_SEMINAR_TEXT];
}

function resolveTeamForMember(member: string, teamDefinitions: Record<string, string[]>) {
  const normalized = normalizeMemberName(member);
  const match = Object.entries(teamDefinitions).find(
    ([team, members]) =>
      team !== ALL_TEAMS && members.some((definedMember) => normalizeMemberName(definedMember) === normalized),
  );
  return match?.[0] ?? SALES_AGENCY_TEAM;
}

function getTeamOptions(teamDefinitions: Record<string, string[]>, members: string[]) {
  const definedTeams = Object.keys(teamDefinitions).filter((team) => team !== ALL_TEAMS);
  const hasSalesAgency = members.some((member) => resolveTeamForMember(member, teamDefinitions) === SALES_AGENCY_TEAM);
  return [ALL_TEAMS, ...definedTeams, ...(hasSalesAgency ? [SALES_AGENCY_TEAM] : [])];
}

type WeeklyAccumulator = WeeklyKpi & { order: number };

function buildWeeklyKpis(rows: SourceRow[]): WeeklyKpi[] {
  return buildWeeklyKpisBy(rows, getWeekLabel);
}

function buildAppointmentWeeklyKpis(rows: SourceRow[]): WeeklyKpi[] {
  return buildWeeklyKpisBy(rows, getAppointmentWeekLabel);
}

function buildWeeklyKpisBy(rows: SourceRow[], getLabel: (row: SourceRow) => { key: string; seminar: string; label: string; order: number }): WeeklyKpi[] {
  const weeklyMap = new Map<string, WeeklyAccumulator>();

  rows.forEach((row) => {
    const week = getLabel(row);
    const status = getStatus(row);
    const seat = getSeat(row);
    const isClosed = isClosedStatus(status);
    const isPending = isPendingStatus(status);
    const isHold = isHoldStatus(status);
    const paymentDate = getPaymentDate(row);
    const current =
      weeklyMap.get(week.key) ??
      ({
        key: week.key,
        seminar: week.seminar,
        label: week.label,
        leads: 0,
        seated: 0,
        closed: 0,
        pending: 0,
        hold: 0,
        paid: 0,
        seatRate: 0,
        closeRate: 0,
        projectedRate: 0,
        holdRate: 0,
        paidRate: 0,
        order: week.order,
      } satisfies WeeklyAccumulator);

    current.leads += 1;
    if (isSeated(seat)) current.seated += 1;
    if (isClosed) current.closed += 1;
    if (isPending) current.pending += 1;
    if (isHold) current.hold += 1;
    if (isClosed && paymentDate) current.paid += 1;
    weeklyMap.set(week.key, current);
  });

  return [...weeklyMap.values()]
    .map((week) => ({
      key: week.key,
      seminar: week.seminar,
      label: week.label,
      leads: week.leads,
      seated: week.seated,
      closed: week.closed,
      pending: week.pending,
      hold: week.hold,
      paid: week.paid,
      seatRate: week.leads ? (week.seated / week.leads) * 100 : 0,
      closeRate: week.seated ? (week.closed / week.seated) * 100 : 0,
      projectedRate: week.seated ? ((week.closed + week.pending) / week.seated) * 100 : 0,
      holdRate: week.leads ? (week.hold / week.leads) * 100 : 0,
      paidRate: week.seated ? (week.paid / week.seated) * 100 : 0,
    }))
    .sort((a, b) => a.seminar.localeCompare(b.seminar, "ja", { numeric: true }) || weeklyMap.get(a.key)!.order - weeklyMap.get(b.key)!.order);
}

function resolveSelectedTeam(options: string[], requestedTeam?: string | null) {
  const requested = requestedTeam?.trim();
  return requested && options.includes(requested) ? requested : ALL_TEAMS;
}

function compareMembersByTeamOrder(
  a: string,
  b: string,
  teamDefinitions: Record<string, string[]>,
) {
  const teamOrder = getTeamOptions(teamDefinitions, [a, b]);
  const teamA = resolveTeamForMember(a, teamDefinitions);
  const teamB = resolveTeamForMember(b, teamDefinitions);
  const teamDiff = teamOrder.indexOf(teamA) - teamOrder.indexOf(teamB);
  if (teamDiff !== 0) return teamDiff;

  const definedMembers = teamDefinitions[teamA] ?? [];
  const indexA = definedMembers.findIndex((member) => normalizeMemberName(member) === normalizeMemberName(a));
  const indexB = definedMembers.findIndex((member) => normalizeMemberName(member) === normalizeMemberName(b));
  if (indexA >= 0 && indexB >= 0) return indexA - indexB;
  if (indexA >= 0) return -1;
  if (indexB >= 0) return 1;
  return a.localeCompare(b, "ja");
}

function aggregateRows(
  rows: SourceRow[],
  requestedSeminar?: string | null,
  requestedTeam?: string | null,
  requestedTraffic?: string | null,
  requestedAdSource?: string | null,
): TeamSalesDashboardData {
  const teamDefinitions = parseTeamDefinitions();
  const seminars = getSeminarOptions(rows);
  const selectedSeminars = resolveSelectedSeminars(seminars, requestedSeminar);
  const selectedSeminar = selectedSeminars.join(SEMINAR_SEPARATOR);
  const selectedTraffic = resolveTrafficFilter(requestedTraffic);
  const selectedAdSource = selectedTraffic === AD_TRAFFIC ? resolveAdSourceFilter(requestedAdSource) : ALL_AD_SOURCES;

  const seminarRows = rows.filter((row) => {
    const member = getMember(row);
    const seminar = getSeminar(row);
    const seat = getSeat(row);
    const matchesSeminar = selectedSeminars.includes(ALL_SEMINARS) || selectedSeminars.includes(seminar);
    return member && !isExcludedMember(member) && matchesSeminar && matchesTrafficFilter(row, selectedTraffic, selectedAdSource) && !isExcludedFromSeatBase(seat);
  });

  const memberNames = [...new Set(seminarRows.map((row) => getMember(row)))].sort((a, b) => compareMembersByTeamOrder(a, b, teamDefinitions));
  const teams = getTeamOptions(teamDefinitions, memberNames);
  const selectedTeam = resolveSelectedTeam(teams, requestedTeam);
  const scopedMemberNames = memberNames.filter((member) => {
    if (selectedTeam === ALL_TEAMS) return true;
    return resolveTeamForMember(member, teamDefinitions) === selectedTeam;
  });

  const scopedRows = seminarRows.filter((row) => scopedMemberNames.includes(getMember(row)));
  const allLostReasons = new Map<string, number>();
  const allHoldReasons = new Map<string, number>();
  const allHoldReasonDates = new Map<string, Set<string>>();
  const statusCounts = new Map<string, number>();

  scopedRows.forEach((row) => {
    const status = getStatus(row);
    if (status) increment(statusCounts, status);
  });

  const members: TeamMemberKpi[] = scopedMemberNames.map((name) => {
    const memberRows = scopedRows.filter((row) => getMember(row) === name);
    const lostReasons = new Map<string, number>();
    const holdReasons = new Map<string, number>();
    const holdReasonDates = new Map<string, Set<string>>();
    let seated = 0;
    let closed = 0;
    let tokushinClosed = 0;
    let basicClosed = 0;
    let pending = 0;
    let hold = 0;
    let alert = 0;

    memberRows.forEach((row) => {
      const seat = getSeat(row);
      const status = getStatus(row);
      const paymentDate = getPaymentDate(row);
      const lostReason = getLostReason(row);
      const holdReason = getHoldReason(row);
      const holdAnswerDate = getHoldAnswerDate(row);
      const contractPlan = normalizeContractPlan(getContractPlan(row));

      if (isSeated(seat)) seated += 1;
      if (isClosedStatus(status)) {
        closed += 1;
        if (contractPlan === "tokushin") tokushinClosed += 1;
        if (contractPlan === "basic") basicClosed += 1;
        if (!paymentDate) alert += 1;
      }
      if (isPendingStatus(status)) pending += 1;
      if (isHoldStatus(status)) {
        hold += 1;
        incrementReasonWithDate(holdReasons, holdReasonDates, holdReason, holdAnswerDate);
        incrementReasonWithDate(allHoldReasons, allHoldReasonDates, holdReason, holdAnswerDate);
      }
      if (isLostStatus(status)) {
        increment(lostReasons, lostReason);
        increment(allLostReasons, lostReason);
      }
    });

    const leads = memberRows.length;
    const projected = closed + pending;

    return {
      name,
      team: resolveTeamForMember(name, teamDefinitions),
      leads,
      seated,
      seatRate: leads ? (seated / leads) * 100 : 0,
      closed,
      tokushinClosed,
      basicClosed,
      closeRate: seated ? (closed / seated) * 100 : 0,
      pending,
      projected,
      projectedRate: seated ? (projected / seated) * 100 : 0,
      hold,
      alert,
      lostReasons: toReasonCounts(lostReasons, 5),
      holdReasons: toReasonCounts(holdReasons, 5, holdReasonDates),
    };
  });

  const statusMix: StatusCount[] = [...statusCounts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      rate: scopedRows.length ? (count / scopedRows.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"))
    .slice(0, 8);
  const weeklyKpis = buildWeeklyKpis(scopedRows);
  const appointmentWeeklyKpis = buildAppointmentWeeklyKpis(scopedRows);

  return {
    updatedAt: new Date().toISOString(),
    source: "sheet",
    selectedSeminar,
    selectedTeam,
    selectedTraffic,
    selectedAdSource,
    seminars,
    teams,
    members,
    lostReasons: toReasonCounts(allLostReasons),
    holdReasons: toReasonCounts(allHoldReasons, 6, allHoldReasonDates),
    statusMix,
    weeklyKpis,
    appointmentWeeklyKpis,
  };
}

export async function fetchTeamSalesData(
  requestedSeminar?: string | null,
  requestedTeam?: string | null,
  requestedTraffic?: string | null,
  requestedAdSource?: string | null,
): Promise<TeamSalesDashboardData | null> {
  const cacheKey = `${requestedSeminar ?? ""}::${requestedTeam ?? ""}::${requestedTraffic ?? ""}::${requestedAdSource ?? ""}`;
  const cached = dataCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const urls = [
    TEAM_SALES_MIRROR_CSV_URL,
    process.env.TEAM_SALES_DASHBOARD_DATA_URL,
    SANITIZED_SOURCE_CSV_URL,
    CUSTOMER_SHEET_CSV_URL,
  ].filter(Boolean) as string[];
  const errors: string[] = [];

  for (const url of [...new Set(urls)]) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { accept: "text/csv,*/*" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        errors.push(`${url}: ${response.status}`);
        continue;
      }

      const text = await response.text();
      if (text.trim().startsWith("#")) {
        errors.push(`${url}: ${text.trim().slice(0, 80)}`);
        continue;
      }

      const rows = parseCsv(text);
      const hasExpectedHeaders = rows.some(
        (row) => getValue(row, 1, "担当者名").trim() && getValue(row, 2, "セミナー").trim(),
      );
      if (rows.length && hasExpectedHeaders) {
        const data = aggregateRows(rows as SourceRow[], requestedSeminar, requestedTeam, requestedTraffic, requestedAdSource);
        dataCache.set(cacheKey, { data, expiresAt: Date.now() + DATA_CACHE_TTL_MS });
        return data;
      }

      errors.push(`${url}: invalid or empty rows`);
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : "Unknown fetch error"}`);
    }
  }

  throw new Error(`Team sales dashboard data fetch failed. ${errors.join(" | ")}`);
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const liveData = await fetchTeamSalesData(searchParams.get("seminar"), searchParams.get("team"), searchParams.get("traffic"), searchParams.get("adSource"));

    return NextResponse.json(liveData ?? defaultTeamSalesDashboardData, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...defaultTeamSalesDashboardData,
        source: "fallback",
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown data fetch error",
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
