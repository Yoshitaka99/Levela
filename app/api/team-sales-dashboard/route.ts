import { NextResponse } from "next/server";
import {
  defaultTeamSalesDashboardData,
  type AdSourceFilter,
  type CustomerManagementRow,
  type DateBasis,
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
const TEAM_SALES_HISTORY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1a3WimNtSLyepfTZ3YxZmy3XAaV6eIG_8C-BdoAd4aIA/gviz/tq?tqx=out:csv&sheet=KPI_HISTORY&headers=1";

const DEFAULT_SEMINAR_TEXT = "5月セミナー";
const ALL_SEMINARS = "全期間";
const SEMINAR_SEPARATOR = ",";
const ALL_TEAMS = "全チーム";
const ALL_TRAFFIC: TrafficFilter = "all";
const AD_TRAFFIC: TrafficFilter = "ad";
const EXCLUDE_AD_TRAFFIC: TrafficFilter = "exclude_ad";
const SEMINAR_DATE_BASIS: DateBasis = "seminar";
const APPOINTMENT_DATE_BASIS: DateBasis = "appointment";
const CALENDAR_DATE_BASIS: DateBasis = "calendar";
const ALL_AD_SOURCES: AdSourceFilter = "all";
const AD_SOURCE_X = "x";
const AD_SOURCE_META = "meta";
const AD_SOURCE_SEPARATOR = ",";
const META_AD_SOURCES = new Set(["meta_ad", "Meta_ad", "meta_ad_Suea_aw", "meta_ad_in-house_aw", "meta_ad_Suea", "Meta_ad_aw", "meta_ad_in-house"]);
const VALID_AD_SOURCES = new Set([ALL_AD_SOURCES, AD_SOURCE_X, AD_SOURCE_META, ...META_AD_SOURCES]);
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
const EXCLUDED_INTERVIEW_STATUSES = new Set(["MLM失注"]);
const RESERVATION_SLOT_SEAT_STATUSES = new Set([
  "着座",
  "着席",
  "日程変更→着座",
  "飛び",
  "事前キャンセル",
  "【その場】事前キャンセル",
  "リスケ/再日程調整中",
  "【その場】リスケ/日程調整中",
  "【その場】リスケ/再日程調整中",
  "日程調整済",
  "日程調整中→返信なし",
  "日程調整→返信なし",
  "【その場】日程調整済",
  "【その場】日程調整→返信なし",
  "営業マン都合キャンセル",
]);
const DATA_CACHE_TTL_MS = 60_000;
const HISTORY_CACHE_TTL_MS = 10 * 60_000;
const CURRENT_DATA_START = "2026-07-01";

type TeamSalesDataCacheEntry = {
  expiresAt: number;
  data: TeamSalesDashboardData;
};

const dataCache = new Map<string, TeamSalesDataCacheEntry>();

const JULY_LAUNCH_CUTOFF = { year: 2026, month: 7 };
const AUGUST_LAUNCH_CUTOFF = { year: 2026, month: 8 };
const CALENDAR_AUGUST_TEAM_CUTOFF = "2026-07-27";

const LEGACY_TEAM_DEFINITIONS: Record<string, string[]> = {
  [ALL_TEAMS]: [],
  "おろチーム": ["苙隼人", "田仲由敬", "早川大貴", "河上まちこ", "折原加純"],
  "こなつチーム": ["長谷川小夏", "関口愛里", "山本美結", "中島絵美", "鈴木里果"],
  "つかさチーム": ["森田主", "根本義暉", "水野王羅", "加藤陸", "藤田吉陽", "田口亮太", "五十嵐凌大"],
  "ひかりチーム": ["橋口陽香里", "上村勇人", "佐藤ひなた", "岡田美菜子", "岡崎未来代", "仲戸茶子"],
  "かずきチーム": ["野嶋一樹", "三浦拓迪", "笠松佑衣", "持木玲那", "持木紀哉", "田中悠喜"],
  "むさしチーム": ["坂口武蔵", "久田翔太", "佐々木将城", "杉井友紀", "稲波杏奈", "西岡駿"],
  "れいなチーム": ["高橋礼菜", "和佐田舞緒", "大谷みくに", "栗原日向子", "遠藤羽琉", "梅津真珠", "木原桃香"],
};

const JULY_LAUNCH_TEAM_DEFINITIONS: Record<string, string[]> = {
  [ALL_TEAMS]: [],
  "おろチーム": ["苙隼人", "田仲由敬", "河上まちこ", "折原加純", "佐々木爽"],
  "こなつチーム": ["長谷川小夏", "関口愛里", "鈴木里果", "杉山ふうか", "中島絵美"],
  "れいなチーム": ["高橋礼菜", "和佐田舞緒", "大谷みくに", "栗原日向子", "木原桃香", "小牟田早智", "木村知代", "遠藤羽琉"],
  "りくチーム": ["加藤陸", "水野王羅", "藤田吉陽"],
  "むさしチーム": ["坂口武蔵", "久田翔太", "佐々木将城", "杉井友紀", "稲波杏奈", "西岡駿", "横山英輝"],
  "ひかりチーム": ["橋口陽香里", "上村勇人", "岡崎未来代", "仲戸茶子", "須見浩人"],
  "かずきチーム": ["野嶋一樹", "三浦拓迪", "笠松佑衣", "持木玲那", "持木紀哉", "田中悠喜"],
  "あおいチーム": ["野中碧", "五十嵐凌大", "田口亮太", "早川大貴"],
  "ひなたチーム": ["佐藤ひなた", "根本義暉"],
};

const AUGUST_LAUNCH_TEAM_DEFINITIONS: Record<string, string[]> = {
  [ALL_TEAMS]: [],
  "れいなチーム": ["高橋礼菜", "坂口武蔵", "田口亮太", "久田翔太", "稲波杏奈", "木村知代", "遠藤羽琉", "木原桃香", "大谷みくに", "杉井友紀", "小牟田早智"],
  "おろチーム": ["苙隼人", "田仲由敬", "河上まちこ", "折原加純", "佐々木爽", "田中悠喜", "加藤陸", "星野譲治", "石田竜一", "高橋健太", "持木玲那"],
  "こなつチーム": ["長谷川小夏", "関口愛里", "杉山ふうか", "五十嵐凌大", "三浦拓迪", "和佐田舞緒", "佐々木将城", "藤田吉陽", "小室瑠生", "鈴木里果"],
  "ひかりチーム": ["橋口陽香里", "上村勇人", "佐藤ひなた", "須見浩人", "横山英輝", "西岡駿", "水野王羅", "深見美幸", "岡崎未来代", "仲戸茶子", "根本義暉"],
};

const TEAM_ORDER = [
  ALL_TEAMS,
  ...Object.keys(LEGACY_TEAM_DEFINITIONS).filter((team) => team !== ALL_TEAMS),
  ...Object.keys(JULY_LAUNCH_TEAM_DEFINITIONS).filter((team) => team !== ALL_TEAMS && !Object.prototype.hasOwnProperty.call(LEGACY_TEAM_DEFINITIONS, team)),
  ...Object.keys(AUGUST_LAUNCH_TEAM_DEFINITIONS).filter(
    (team) =>
      team !== ALL_TEAMS &&
      !Object.prototype.hasOwnProperty.call(LEGACY_TEAM_DEFINITIONS, team) &&
      !Object.prototype.hasOwnProperty.call(JULY_LAUNCH_TEAM_DEFINITIONS, team),
  ),
];

type SourceRow = Record<string, string>;
let historyRowsCache: { expiresAt: number; rows: SourceRow[] } | null = null;

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

async function fetchCsvRows(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "text/csv,*/*" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`${url}: ${response.status}`);

  const text = await response.text();
  if (text.trim().startsWith("#")) throw new Error(`${url}: ${text.trim().slice(0, 80)}`);
  return parseCsv(text) as SourceRow[];
}

async function fetchHistoryRows() {
  if (historyRowsCache && historyRowsCache.expiresAt > Date.now()) return historyRowsCache.rows;

  const rows = await fetchCsvRows(TEAM_SALES_HISTORY_CSV_URL);
  historyRowsCache = { rows, expiresAt: Date.now() + HISTORY_CACHE_TTL_MS };
  return rows;
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

  const jpDate = normalized.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (jpDate) {
    return {
      year: Number(jpDate[1]),
      month: Number(jpDate[2]),
      day: Number(jpDate[3]),
    };
  }

  return null;
}

function getSourcePeriodKey(row: SourceRow) {
  const appointmentDate = parseSheetDate(getAppointmentDate(row));
  if (appointmentDate) return toDateKey(appointmentDate);

  const seminarMonth = parseSeminarLaunchMonth(getSeminar(row));
  if (!seminarMonth) return "";
  return `${seminarMonth.year}-${String(seminarMonth.month).padStart(2, "0")}-01`;
}

function isHistoricalPeriodRow(row: SourceRow) {
  const periodKey = getSourcePeriodKey(row);
  return Boolean(periodKey && periodKey < CURRENT_DATA_START);
}

function isCurrentPeriodRow(row: SourceRow) {
  const periodKey = getSourcePeriodKey(row);
  return Boolean(periodKey && periodKey >= CURRENT_DATA_START);
}

function toDateKey(date: { year: number; month: number; day: number }) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function isIsoDate(value?: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function matchesCalendarRange(row: SourceRow, startDate: string, endDate: string) {
  if (!startDate && !endDate) return true;
  const parsedDate = parseSheetDate(getAppointmentDate(row));
  if (!parsedDate) return false;
  const appointmentKey = toDateKey(parsedDate);
  return (!startDate || appointmentKey >= startDate) && (!endDate || appointmentKey <= endDate);
}

function formatSeminarMonthLabel(year: number, month: number) {
  return `${String(year).slice(-2)}年${month}月セミナー`;
}

function getAppointmentSeminar(row: SourceRow) {
  const parsedDate = parseSheetDate(getAppointmentDate(row));
  if (!parsedDate) return "";
  return formatSeminarMonthLabel(parsedDate.year, parsedDate.month);
}

function getEffectiveSeminar(row: SourceRow, dateBasis: DateBasis = SEMINAR_DATE_BASIS) {
  if (dateBasis === APPOINTMENT_DATE_BASIS || dateBasis === CALENDAR_DATE_BASIS) {
    return getAppointmentSeminar(row) || getSeminar(row);
  }
  return getSeminar(row);
}

function parseSeminarLaunchMonth(seminar: string) {
  const match = seminar.match(/(\d{2,4})\D+(\d{1,2})/);
  if (!match) {
    const monthOnlyMatch = seminar.match(/(\d{1,2})\D*月/);
    if (!monthOnlyMatch) return null;
    return { year: 2026, month: Number(monthOnlyMatch[1]) };
  }
  const rawYear = Number(match[1]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const month = Number(match[2]);
  if (!year || !month) return null;
  return { year, month };
}

function usesJulyLaunchTeam(row: SourceRow, dateBasis: DateBasis) {
  const parsed = parseSeminarLaunchMonth(getEffectiveSeminar(row, dateBasis));
  if (!parsed) return false;
  return parsed.year > JULY_LAUNCH_CUTOFF.year || (parsed.year === JULY_LAUNCH_CUTOFF.year && parsed.month >= JULY_LAUNCH_CUTOFF.month);
}

function usesAugustLaunchTeam(row: SourceRow, dateBasis: DateBasis, calendarStartDate = "") {
  if (dateBasis === CALENDAR_DATE_BASIS && calendarStartDate >= CALENDAR_AUGUST_TEAM_CUTOFF) return true;
  const parsed = parseSeminarLaunchMonth(getEffectiveSeminar(row, dateBasis));
  if (!parsed) return false;
  return parsed.year > AUGUST_LAUNCH_CUTOFF.year || (parsed.year === AUGUST_LAUNCH_CUTOFF.year && parsed.month >= AUGUST_LAUNCH_CUTOFF.month);
}

function getTeamDefinitionsForRow(row: SourceRow, dateBasis: DateBasis, calendarStartDate = "") {
  if (usesAugustLaunchTeam(row, dateBasis, calendarStartDate)) return AUGUST_LAUNCH_TEAM_DEFINITIONS;
  return usesJulyLaunchTeam(row, dateBasis) ? JULY_LAUNCH_TEAM_DEFINITIONS : LEGACY_TEAM_DEFINITIONS;
}

function getTeamOrderIndex(team: string) {
  const index = TEAM_ORDER.indexOf(team);
  if (index >= 0) return index;
  return team === SALES_AGENCY_TEAM ? TEAM_ORDER.length : TEAM_ORDER.length + 1;
}

function resolveTeamForRow(row: SourceRow, dateBasis: DateBasis = SEMINAR_DATE_BASIS, calendarStartDate = "") {
  return resolveTeamForMember(getMember(row), getTeamDefinitionsForRow(row, dateBasis, calendarStartDate));
}

function getMemberKey(team: string, member: string) {
  return `${team}::${normalizeMemberName(member)}`;
}

function getMemberKeyForRow(row: SourceRow, dateBasis: DateBasis = SEMINAR_DATE_BASIS, calendarStartDate = "") {
  return getMemberKey(resolveTeamForRow(row, dateBasis, calendarStartDate), getMember(row));
}

function getWeekLabel(row: SourceRow, dateBasis: DateBasis = SEMINAR_DATE_BASIS) {
  const seminar = getEffectiveSeminar(row, dateBasis);
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
  const normalized = plan.trim().replace(/\s+/g, "");
  if (normalized.includes("コミット") || normalized.includes("特進")) return "tokushin";
  if (normalized.includes("プレプラ") || normalized.includes("プレミアムプラス") || normalized.includes("ベーシック")) return "basic";
  return "";
}

function getTrafficText(row: SourceRow) {
  return `${getTrafficRoute(row)} ${getInflow(row)}`;
}

function getAdSource(row: SourceRow) {
  const traffic = getTrafficText(row);
  if (/(^|[^a-z])x[_-]?ad/i.test(traffic) || /x[_-]?ad/i.test(traffic)) return AD_SOURCE_X;
  const inflow = getInflow(row).trim();
  if (META_AD_SOURCES.has(inflow)) return inflow;
  return "";
}

function isMetaAdSource(source: string) {
  return META_AD_SOURCES.has(source);
}

function isAdTraffic(row: SourceRow) {
  return /ad/i.test(getTrafficText(row)) || Boolean(getAdSource(row));
}

function resolveTrafficFilter(value?: string | null): TrafficFilter {
  if (value === AD_TRAFFIC) return AD_TRAFFIC;
  if (value === EXCLUDE_AD_TRAFFIC) return EXCLUDE_AD_TRAFFIC;
  return ALL_TRAFFIC;
}

function resolveDateBasis(value?: string | null): DateBasis {
  if (value === CALENDAR_DATE_BASIS) return CALENDAR_DATE_BASIS;
  return value === APPOINTMENT_DATE_BASIS ? APPOINTMENT_DATE_BASIS : SEMINAR_DATE_BASIS;
}

function resolveAdSourceFilter(value?: string | null): AdSourceFilter {
  const requested = value
    ?.split(AD_SOURCE_SEPARATOR)
    .map((source) => source.trim())
    .filter((source) => source && VALID_AD_SOURCES.has(source));

  if (!requested?.length || requested.includes(ALL_AD_SOURCES)) return ALL_AD_SOURCES;
  return [...new Set(requested)].join(AD_SOURCE_SEPARATOR);
}

function resolveSelectedAdSources(adSource: AdSourceFilter) {
  if (adSource === ALL_AD_SOURCES) return [ALL_AD_SOURCES];
  return adSource
    .split(AD_SOURCE_SEPARATOR)
    .map((source) => source.trim())
    .filter((source) => source && VALID_AD_SOURCES.has(source));
}

function matchesTrafficFilter(row: SourceRow, traffic: TrafficFilter, adSource: AdSourceFilter) {
  if (traffic === ALL_TRAFFIC) return true;
  if (traffic === EXCLUDE_AD_TRAFFIC) return !isAdTraffic(row);
  if (!isAdTraffic(row)) return false;
  if (adSource === ALL_AD_SOURCES) return true;

  const source = getAdSource(row);
  const selectedSources = resolveSelectedAdSources(adSource);
  return selectedSources.some((selectedSource) => {
    if (selectedSource === AD_SOURCE_META) return isMetaAdSource(source);
    return source === selectedSource;
  });
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

function isHoldClosedStatus(status: string) {
  const normalized = status.trim();
  return normalized.includes("保留") && isClosedStatus(normalized);
}

function isHoldLostStatus(status: string) {
  const normalized = status.trim();
  return normalized.includes("保留") && isLostStatus(normalized);
}

function normalizeKpiStatusLabel(value: string) {
  return value.trim().replace(/／/g, "/").replace(/\s+/g, "");
}

function isExcludedFromSeatBase(seat: string) {
  return EXCLUDED_SEAT_STATUSES.has(normalizeKpiStatusLabel(seat));
}

function isExcludedFromInterviewBase(seat: string, status: string) {
  return isExcludedFromSeatBase(seat) || EXCLUDED_INTERVIEW_STATUSES.has(normalizeKpiStatusLabel(status));
}

function isReservationSlot(seat: string) {
  return RESERVATION_SLOT_SEAT_STATUSES.has(normalizeKpiStatusLabel(seat));
}

function isBlankReservationSlot(row: SourceRow) {
  return !getSeat(row).trim() && !getStatus(row).trim();
}

function isTodayOrFutureAppointment(row: SourceRow) {
  const parsedDate = parseSheetDate(getAppointmentDate(row));
  if (!parsedDate) return false;
  const appointmentDate = new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return appointmentDate >= today;
}

function getAppointmentTimestamp(row: SourceRow) {
  const value = getAppointmentDate(row);
  const parsedDate = parseSheetDate(value);
  if (!parsedDate) return null;

  const time = value.match(/(\d{1,2}):(\d{2})/);
  const hour = time ? Number(time[1]) : 23;
  const minute = time ? Number(time[2]) : 59;
  return Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, hour - 9, minute);
}

function isFutureUnheldAppointment(row: SourceRow, now = Date.now()) {
  const appointmentAt = getAppointmentTimestamp(row);
  if (appointmentAt === null || appointmentAt <= now) return false;

  const status = getStatus(row);
  return !isClosedStatus(status) && !isLostStatus(status) && !status.includes("クーリングオフ");
}

function isSeated(seat: string) {
  const normalized = seat.trim();
  return normalized === "着座" || normalized === "着席" || normalized.endsWith("→着座");
}

function getSeminarOptions(rows: SourceRow[], dateBasis: DateBasis) {
  const seminars = [
    ...new Set(
      rows
        .map((row) => getEffectiveSeminar(row, dateBasis))
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

function getTeamOptionsForRows(rows: SourceRow[], dateBasis: DateBasis, calendarStartDate = "") {
  const rowTeams = new Set(rows.map((row) => resolveTeamForRow(row, dateBasis, calendarStartDate)));
  const orderedTeams = TEAM_ORDER.filter((team) => team !== ALL_TEAMS && rowTeams.has(team));
  return [ALL_TEAMS, ...orderedTeams, ...(rowTeams.has(SALES_AGENCY_TEAM) ? [SALES_AGENCY_TEAM] : [])];
}

type WeeklyAccumulator = WeeklyKpi & { order: number };

function buildWeeklyKpis(rows: SourceRow[], dateBasis: DateBasis): WeeklyKpi[] {
  return buildWeeklyKpisBy(rows, (row) => getWeekLabel(row, dateBasis));
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

function buildCustomerRows(
  rows: SourceRow[],
  dateBasis: DateBasis,
  calendarStartDate = "",
): CustomerManagementRow[] {
  return rows
    .map((row) => {
      const member = getMember(row);
      const team = resolveTeamForRow(row, dateBasis, calendarStartDate);
      return {
        member,
        team,
        seminar: getSeminar(row),
        appointmentDate: getAppointmentDate(row),
        trafficRoute: getTrafficRoute(row),
        inflow: getInflow(row),
        seat: getSeat(row),
        status: getStatus(row),
        holdAnswerDate: getHoldAnswerDate(row),
        paymentDate: getPaymentDate(row),
        contractPlan: getContractPlan(row),
        lostReason: getLostReason(row),
        holdReason: getHoldReason(row),
      };
    })
    .sort((a, b) => {
      const teamDiff = getTeamOrderIndex(a.team) - getTeamOrderIndex(b.team);
      if (teamDiff !== 0) return teamDiff;
      const memberDiff = a.member.localeCompare(b.member, "ja");
      if (memberDiff !== 0) return memberDiff;
      return a.appointmentDate.localeCompare(b.appointmentDate, "ja");
    });
}

function aggregateRows(
  rows: SourceRow[],
  requestedSeminar?: string | null,
  requestedTeam?: string | null,
  requestedTraffic?: string | null,
  requestedAdSource?: string | null,
  requestedDateBasis?: string | null,
  requestedStartDate?: string | null,
  requestedEndDate?: string | null,
): TeamSalesDashboardData {
  const selectedDateBasis = resolveDateBasis(requestedDateBasis);
  const selectedStartDate = selectedDateBasis === CALENDAR_DATE_BASIS && isIsoDate(requestedStartDate) ? requestedStartDate! : "";
  const selectedEndDate = selectedDateBasis === CALENDAR_DATE_BASIS && isIsoDate(requestedEndDate) ? requestedEndDate! : "";
  const seminars = getSeminarOptions(rows, selectedDateBasis);
  const selectedSeminars = resolveSelectedSeminars(seminars, requestedSeminar);
  const selectedSeminar = selectedSeminars.join(SEMINAR_SEPARATOR);
  const selectedTraffic = resolveTrafficFilter(requestedTraffic);
  const selectedAdSource = selectedTraffic === AD_TRAFFIC ? resolveAdSourceFilter(requestedAdSource) : ALL_AD_SOURCES;

  const seminarRows = rows.filter((row) => {
    const member = getMember(row);
    const seminar = getEffectiveSeminar(row, selectedDateBasis);
    const seat = getSeat(row);
    const status = getStatus(row);
    const matchesPeriod =
      selectedDateBasis === CALENDAR_DATE_BASIS
        ? matchesCalendarRange(row, selectedStartDate, selectedEndDate)
        : selectedSeminars.includes(ALL_SEMINARS) || selectedSeminars.includes(seminar);
    return (
      member &&
      !isExcludedMember(member) &&
      matchesPeriod &&
      matchesTrafficFilter(row, selectedTraffic, selectedAdSource) &&
      !isExcludedFromInterviewBase(seat, status) &&
      !isBlankReservationSlot(row)
    );
  });

  const displayRows = rows.filter((row) => {
    const member = getMember(row);
    const seminar = getEffectiveSeminar(row, selectedDateBasis);
    const seat = getSeat(row);
    const status = getStatus(row);
    const matchesPeriod =
      selectedDateBasis === CALENDAR_DATE_BASIS
        ? matchesCalendarRange(row, selectedStartDate, selectedEndDate)
        : selectedSeminars.includes(ALL_SEMINARS) || selectedSeminars.includes(seminar);
    return (
      member &&
      !isExcludedMember(member) &&
      matchesPeriod &&
      matchesTrafficFilter(row, selectedTraffic, selectedAdSource) &&
      !isExcludedFromInterviewBase(seat, status) &&
      (!isBlankReservationSlot(row) || isTodayOrFutureAppointment(row))
    );
  });

  const calendarBaseRows = rows.filter((row) => {
    const member = getMember(row);
    const seat = getSeat(row);
    const status = getStatus(row);
    return (
      member &&
      !isExcludedMember(member) &&
      (selectedDateBasis !== CALENDAR_DATE_BASIS || matchesCalendarRange(row, selectedStartDate, selectedEndDate)) &&
      matchesTrafficFilter(row, selectedTraffic, selectedAdSource) &&
      !isExcludedFromInterviewBase(seat, status) &&
      (!isBlankReservationSlot(row) || isTodayOrFutureAppointment(row))
    );
  });

  const optionRows = selectedSeminars.includes(ALL_SEMINARS) ? [...displayRows, ...calendarBaseRows] : displayRows;
  const teams = getTeamOptionsForRows(optionRows, selectedDateBasis, selectedStartDate);
  const selectedTeam = resolveSelectedTeam(teams, requestedTeam);
  const matchesSelectedTeam = (row: SourceRow) => selectedTeam === ALL_TEAMS || resolveTeamForRow(row, selectedDateBasis, selectedStartDate) === selectedTeam;

  const scopedRows = seminarRows.filter(matchesSelectedTeam);
  const scopedDisplayRows = displayRows.filter(matchesSelectedTeam);
  const scopedCalendarRows = calendarBaseRows.filter(matchesSelectedTeam);
  const allLostReasons = new Map<string, number>();
  const allHoldReasons = new Map<string, number>();
  const allHoldReasonDates = new Map<string, Set<string>>();
  const statusCounts = new Map<string, number>();

  scopedRows.forEach((row) => {
    const status = getStatus(row);
    if (status) increment(statusCounts, status);
  });

  const memberGroups = [...new Map([...scopedRows, ...scopedDisplayRows].map((row) => {
    const member = getMember(row);
    const team = resolveTeamForRow(row, selectedDateBasis, selectedStartDate);
    return [getMemberKey(team, member), { key: getMemberKey(team, member), name: member, team }];
  })).values()].sort((a, b) => {
    const teamDiff = getTeamOrderIndex(a.team) - getTeamOrderIndex(b.team);
    if (teamDiff !== 0) return teamDiff;
    return a.name.localeCompare(b.name, "ja");
  });

  const members: TeamMemberKpi[] = memberGroups.map((group) => {
    const memberRows = scopedRows.filter((row) => getMemberKeyForRow(row, selectedDateBasis, selectedStartDate) === group.key);
    const displayMemberRows = scopedDisplayRows.filter((row) => getMemberKeyForRow(row, selectedDateBasis, selectedStartDate) === group.key);
    const lostReasons = new Map<string, number>();
    const holdReasons = new Map<string, number>();
    const holdReasonDates = new Map<string, Set<string>>();
    let reservationSlots = 0;
    let seated = 0;
    let closed = 0;
    let tokushinClosed = 0;
    let basicClosed = 0;
    let pending = 0;
    let hold = 0;
    let holdClosed = 0;
    let holdLost = 0;
    let alert = 0;

    memberRows.forEach((row) => {
      const seat = getSeat(row);
      const status = getStatus(row);
      const paymentDate = getPaymentDate(row);
      const lostReason = getLostReason(row);
      const holdReason = getHoldReason(row);
      const holdAnswerDate = getHoldAnswerDate(row);
      const contractPlan = normalizeContractPlan(getContractPlan(row));

      if (isReservationSlot(seat)) reservationSlots += 1;
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
      if (isHoldClosedStatus(status)) holdClosed += 1;
      if (isHoldLostStatus(status)) holdLost += 1;
      if (isLostStatus(status)) {
        increment(lostReasons, lostReason);
        increment(allLostReasons, lostReason);
      }
    });

    const leads = memberRows.length;
    const futureAppointments = displayMemberRows.filter((row) => isFutureUnheldAppointment(row)).length;
    const projected = closed + pending;
    const resolvedHold = holdClosed + holdLost + hold;

    return {
      memberKey: group.key,
      name: group.name,
      team: group.team,
      leads,
      futureAppointments,
      reservationSlots,
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
      holdClosed,
      holdLost,
      holdConversionRate: resolvedHold ? (holdClosed / resolvedHold) * 100 : 0,
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
  const weeklyKpis = buildWeeklyKpis(scopedRows, selectedDateBasis);
  const appointmentWeeklyKpis = buildAppointmentWeeklyKpis(scopedRows);
  const memberWeeklyKpis = memberGroups.map((group) => {
    const memberRows = scopedRows.filter((row) => getMemberKeyForRow(row, selectedDateBasis, selectedStartDate) === group.key);
    return {
      memberKey: group.key,
      name: group.name,
      team: group.team,
      weeklyKpis: buildWeeklyKpis(memberRows, selectedDateBasis),
      appointmentWeeklyKpis: buildAppointmentWeeklyKpis(memberRows),
    };
  });
  const customerRows = buildCustomerRows(scopedDisplayRows, selectedDateBasis, selectedStartDate);
  const calendarRows = buildCustomerRows(scopedCalendarRows, selectedDateBasis, selectedStartDate);

  return {
    updatedAt: new Date().toISOString(),
    source: "sheet",
    selectedSeminar,
    selectedTeam,
    selectedTraffic,
    selectedAdSource,
    selectedDateBasis,
    selectedStartDate,
    selectedEndDate,
    seminars,
    teams,
    members,
    lostReasons: toReasonCounts(allLostReasons),
    holdReasons: toReasonCounts(allHoldReasons, 6, allHoldReasonDates),
    statusMix,
    weeklyKpis,
    appointmentWeeklyKpis,
    memberWeeklyKpis,
    customerRows,
    calendarRows,
  };
}

export async function fetchTeamSalesData(
  requestedSeminar?: string | null,
  requestedTeam?: string | null,
  requestedTraffic?: string | null,
  requestedAdSource?: string | null,
  requestedDateBasis?: string | null,
  requestedStartDate?: string | null,
  requestedEndDate?: string | null,
): Promise<TeamSalesDashboardData | null> {
  const cacheKey = `${requestedSeminar ?? ""}::${requestedTeam ?? ""}::${requestedTraffic ?? ""}::${requestedAdSource ?? ""}::${requestedDateBasis ?? ""}::${requestedStartDate ?? ""}::${requestedEndDate ?? ""}`;
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
      const rows = await fetchCsvRows(url);
      const hasExpectedHeaders = rows.some(
        (row) => getValue(row, 1, "担当者名").trim() && getValue(row, 2, "セミナー").trim(),
      );
      if (rows.length && hasExpectedHeaders) {
        let combinedRows = rows.filter(isCurrentPeriodRow);
        try {
          const historyRows = await fetchHistoryRows();
          combinedRows = [...historyRows.filter(isHistoricalPeriodRow), ...combinedRows];
        } catch (historyError) {
          errors.push(
            `history: ${historyError instanceof Error ? historyError.message : "Unknown history fetch error"}`,
          );
        }

        const data = aggregateRows(
          combinedRows,
          requestedSeminar,
          requestedTeam,
          requestedTraffic,
          requestedAdSource,
          requestedDateBasis,
          requestedStartDate,
          requestedEndDate,
        );
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
    const liveData = await fetchTeamSalesData(
      searchParams.get("seminar"),
      searchParams.get("team"),
      searchParams.get("traffic"),
      searchParams.get("adSource"),
      searchParams.get("dateBasis"),
      searchParams.get("startDate"),
      searchParams.get("endDate"),
    );

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
