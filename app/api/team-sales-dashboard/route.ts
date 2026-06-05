import { NextResponse } from "next/server";
import {
  defaultTeamSalesDashboardData,
  type ReasonCount,
  type StatusCount,
  type TeamMemberKpi,
  type TeamSalesDashboardData,
} from "../../team-sales-dashboard/data";

export const dynamic = "force-dynamic";

const CUSTOMER_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1wDIaRyHx0NUUuZWaiP5R9oBhT0Ko5e8HLvaJMlLDmHo/gviz/tq?tqx=out:csv&gid=1151421241";
const SANITIZED_SOURCE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s/gviz/tq?tqx=out:csv&gid=2051214579&tq=select%20B%2CC%2CG%2CH%2CN%2CQ%2CR%2CT%20where%20B%20is%20not%20null%20label%20H%20%27%E3%82%B9%E3%83%86%E3%83%BC%E3%82%BF%E3%82%B9%27%2C%20T%20%27%E4%BF%9D%E7%95%99%E7%90%86%E7%94%B12%27";

const DEFAULT_SEMINAR_TEXT = "5月セミナー";
const ALL_SEMINARS = "全期間";
const SEMINAR_SEPARATOR = ",";
const ALL_TEAMS = "全チーム";
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
const EXCLUDED_SEAT_STATUSES = new Set(["担当者変更", "重複予約", "無効アポ"]);
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
  return getMappedValue(row, ["着席", "着座"], 2, 6).trim();
}

function getStatus(row: SourceRow) {
  return getMappedValue(row, ["ステータス", "2回目/実施後ステータス"], 3, 7).trim();
}

function getPaymentDate(row: SourceRow) {
  return getMappedValue(row, ["決済日(着金日)", "決着日(着金日)", "決着日（着金日）"], 4, 13).trim();
}

function getLostReason(row: SourceRow) {
  return getMappedValue(row, ["失注理由"], 5, 16);
}

function getHoldReason(row: SourceRow) {
  return getMappedValue(row, ["保留理由"], 6, 17) || getMappedValue(row, ["保留理由2"], 7, 19);
}

function increment(map: Map<string, number>, rawLabel: string) {
  const label = rawLabel.trim() || "未記入";
  map.set(label, (map.get(label) ?? 0) + 1);
}

function toReasonCounts(map: Map<string, number>, limit = 6): ReasonCount[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
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
): TeamSalesDashboardData {
  const teamDefinitions = parseTeamDefinitions();
  const seminars = getSeminarOptions(rows);
  const selectedSeminars = resolveSelectedSeminars(seminars, requestedSeminar);
  const selectedSeminar = selectedSeminars.join(SEMINAR_SEPARATOR);

  const seminarRows = rows.filter((row) => {
    const member = getMember(row);
    const seminar = getSeminar(row);
    const seat = getSeat(row);
    const matchesSeminar = selectedSeminars.includes(ALL_SEMINARS) || selectedSeminars.includes(seminar);
    return member && !isExcludedMember(member) && matchesSeminar && !isExcludedFromSeatBase(seat);
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
  const statusCounts = new Map<string, number>();

  scopedRows.forEach((row) => {
    const status = getStatus(row);
    if (status) increment(statusCounts, status);
  });

  const members: TeamMemberKpi[] = scopedMemberNames.map((name) => {
    const memberRows = scopedRows.filter((row) => getMember(row) === name);
    const lostReasons = new Map<string, number>();
    const holdReasons = new Map<string, number>();
    let seated = 0;
    let closed = 0;
    let pending = 0;
    let hold = 0;
    let alert = 0;

    memberRows.forEach((row) => {
      const seat = getSeat(row);
      const status = getStatus(row);
      const paymentDate = getPaymentDate(row);
      const lostReason = getLostReason(row);
      const holdReason = getHoldReason(row);

      if (isSeated(seat)) seated += 1;
      if (isClosedStatus(status)) {
        closed += 1;
        if (!paymentDate) alert += 1;
      }
      if (isPendingStatus(status)) pending += 1;
      if (isHoldStatus(status)) {
        hold += 1;
        increment(holdReasons, holdReason);
        increment(allHoldReasons, holdReason);
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
      closeRate: seated ? (closed / seated) * 100 : 0,
      pending,
      projected,
      projectedRate: seated ? (projected / seated) * 100 : 0,
      hold,
      alert,
      lostReasons: toReasonCounts(lostReasons, 5),
      holdReasons: toReasonCounts(holdReasons, 5),
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

  return {
    updatedAt: new Date().toISOString(),
    source: "sheet",
    selectedSeminar,
    selectedTeam,
    seminars,
    teams,
    members,
    lostReasons: toReasonCounts(allLostReasons),
    holdReasons: toReasonCounts(allHoldReasons),
    statusMix,
  };
}

export async function fetchTeamSalesData(
  requestedSeminar?: string | null,
  requestedTeam?: string | null,
): Promise<TeamSalesDashboardData | null> {
  const cacheKey = `${requestedSeminar ?? ""}::${requestedTeam ?? ""}`;
  const cached = dataCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const urls = [
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
        const data = aggregateRows(rows as SourceRow[], requestedSeminar, requestedTeam);
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
    const liveData = await fetchTeamSalesData(searchParams.get("seminar"), searchParams.get("team"));

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
