import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TEAM_SALES_MIRROR_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1a3WimNtSLyepfTZ3YxZmy3XAaV6eIG_8C-BdoAd4aIA/gviz/tq?tqx=out:csv&sheet=KPI_MIRROR&headers=1";
const SANITIZED_SOURCE_QUERY =
  "select B,C,D,E,F,G,H,I,N,O,Q,R,T where B is not null label D '流入経路', E '面談日', F '流入', H 'ステータス', I '保留回答予定日', N '決着日(着金日)', T '保留理由2'";
const SANITIZED_SOURCE_CSV_URL = `https://docs.google.com/spreadsheets/d/1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s/gviz/tq?tqx=out:csv&gid=2051214579&tq=${encodeURIComponent(SANITIZED_SOURCE_QUERY)}`;

type TeamTargets = {
  appointments: number;
  seated: number;
  closed: number;
  closeRate: number;
};

type MemberGoal = {
  name: string;
  alias: string;
  targetAppointments: number;
  minCloseRate: number;
  lockedCloseRate?: boolean;
};

type OroGoalConfig = {
  month: string;
  teamTargets: TeamTargets;
  members: MemberGoal[];
  updatedAt: string;
};

type OroGoalStore = {
  goals: Record<string, OroGoalConfig>;
};

const DEFAULT_TEAM_TARGETS: TeamTargets = {
  appointments: 1050,
  seated: 561,
  closed: 180,
  closeRate: 35,
};

const DEFAULT_ORO_MEMBERS: MemberGoal[] = [
  { name: "苙隼人", alias: "オロハヤト", targetAppointments: 144, minCloseRate: 45 },
  { name: "田仲由敬", alias: "タナカヨシタカ", targetAppointments: 129, minCloseRate: 45 },
  { name: "河上まちこ", alias: "カワカマチコ", targetAppointments: 112, minCloseRate: 30 },
  { name: "折原加純", alias: "ホリハラカスミ", targetAppointments: 39, minCloseRate: 30 },
  { name: "佐々木爽", alias: "ササキサワ", targetAppointments: 71, minCloseRate: 30 },
  { name: "加藤陸", alias: "カトウリク", targetAppointments: 120, minCloseRate: 35 },
  { name: "星野譲治", alias: "ホシノジョウジ", targetAppointments: 106, minCloseRate: 30 },
  { name: "石田竜一", alias: "イシダリュウイチ", targetAppointments: 103, minCloseRate: 30 },
  { name: "高橋健太", alias: "タカハシケンタ", targetAppointments: 140, minCloseRate: 35 },
  { name: "持木玲那", alias: "モチキレナ", targetAppointments: 81, minCloseRate: 30 },
  { name: "横山英輝", alias: "ヨコヤマヒデキ", targetAppointments: 5, minCloseRate: 30 },
] as const satisfies MemberGoal[];

const EXCLUDED_SEAT_STATUSES = new Set(["担当者変更", "重複予約", "無効アポ"]);
const DEFAULT_MONTH = "2026-08";
const DATA_CACHE_TTL_MS = 60_000;
const GOAL_STORE_KEY = "oroteam-kpi-goals:v1";

type SourceRow = Record<string, string>;
type ParsedDate = { year: number; month: number; day: number };
type CacheEntry = { expiresAt: number; rows: SourceRow[] };
type Pace = { today: number; thisWeek: number; month: number; remainingDays: number; thisWeekDays: number };

declare global {
  var __oroTeamKpiGoalStore: OroGoalStore | undefined;
}

export type OroTeamMemberKpi = {
  name: string;
  alias: string;
  targetAppointments: number;
  minCloseRate: number;
  currentAppointments: number;
  actualSeated: number;
  actualClosed: number;
  pending: number;
  hold: number;
  projectedSeated: number;
  requiredClosed: number;
  remainingClosed: number;
  currentCloseRate: number;
  targetAppointmentGap: number;
  contributionGap: number;
  pace: Pace;
};

export type OroTeamKpiData = {
  updatedAt: string;
  source: "sheet" | "fallback";
  selectedMonth: string;
  selectedMonthLabel: string;
  availableMonths: { value: string; label: string }[];
  seatRate: number;
  teamTargets: TeamTargets;
  editableGoals: OroGoalConfig;
  totals: {
    targetAppointments: number;
    currentAppointments: number;
    targetSeated: number;
    projectedSeated: number;
    actualSeated: number;
    targetClosed: number;
    actualClosed: number;
    requiredClosedAtTeamRate: number;
    requiredClosedAtMemberRates: number;
    remainingClosedToTarget: number;
    remainingClosedToMemberRates: number;
    projectedClosedAtTeamRate: number;
    appointmentGap: number;
    seatedGap: number;
    closedGap: number;
    targetAchievementRate: number;
  };
  members: OroTeamMemberKpi[];
  slideSuggestions: {
    from: string;
    to: string;
    appointments: number;
    expectedClosedLift: number;
    reason: string;
  }[];
  analysis: string[];
  assumptions: string[];
};

const dataCache = new Map<string, CacheEntry>();

function getMemoryGoalStore() {
  globalThis.__oroTeamKpiGoalStore ??= { goals: {} };
  return globalThis.__oroTeamKpiGoalStore;
}

function getKvConfig() {
  const url = process.env.OROTEAM_KPI_KV_REST_API_URL || process.env.TEAM_SALES_GOALS_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.OROTEAM_KPI_KV_REST_API_TOKEN || process.env.TEAM_SALES_GOALS_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function shouldUseMemoryFallback() {
  return !process.env.VERCEL;
}

async function readGoalStore(): Promise<{ store: OroGoalStore; source: "kv" | "memory" }> {
  const kv = getKvConfig();
  if (!kv) {
    if (shouldUseMemoryFallback()) return { store: getMemoryGoalStore(), source: "memory" };
    throw new Error("shared oro KPI goal storage is not configured");
  }

  const response = await fetch(kv.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${kv.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(["GET", GOAL_STORE_KEY]),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`KV read failed: ${response.status}`);
  const payload = (await response.json()) as { result?: string | null };
  if (!payload.result) return { store: { goals: {} }, source: "kv" };

  const parsed = JSON.parse(payload.result) as OroGoalStore;
  return { store: { goals: parsed.goals ?? {} }, source: "kv" };
}

async function writeGoalStore(store: OroGoalStore) {
  const kv = getKvConfig();
  if (!kv) {
    if (!shouldUseMemoryFallback()) throw new Error("shared oro KPI goal storage is not configured");
    globalThis.__oroTeamKpiGoalStore = store;
    return "memory" as const;
  }

  const response = await fetch(kv.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${kv.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(["SET", GOAL_STORE_KEY, JSON.stringify(store)]),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`KV write failed: ${response.status}`);
  return "kv" as const;
}

function getDefaultGoalConfig(month: string): OroGoalConfig {
  return {
    month,
    teamTargets: { ...DEFAULT_TEAM_TARGETS },
    members: DEFAULT_ORO_MEMBERS.map((member) => ({ ...member })),
    updatedAt: "",
  };
}

async function readGoalConfig(month: string) {
  try {
    const { store } = await readGoalStore();
    return store.goals[month] ?? getDefaultGoalConfig(month);
  } catch (error) {
    console.error("[oroteam-kpi] failed to read saved goals", error);
    return getDefaultGoalConfig(month);
  }
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
    const entry: SourceRow = {};
    headers.forEach((header, index) => {
      const key = header.trim();
      const value = line[index]?.trim() ?? "";
      entry[`__col_${index}`] = value;
      if (key && entry[key] === undefined) entry[key] = value;
    });
    return entry;
  });
}

function getMappedValue(row: SourceRow, headers: string[], sanitizedIndex: number, sourceIndex: number) {
  for (const header of headers) {
    if (row[header] !== undefined) return row[header];
  }
  return row[`__col_${sanitizedIndex}`] ?? row[`__col_${sourceIndex}`] ?? "";
}

function normalizeName(name: string) {
  return name.replace(/[\s　]/g, "").replace(/髙/g, "高").trim();
}

function getMember(row: SourceRow) {
  return getMappedValue(row, ["担当者名"], 0, 1).trim();
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

function parseSheetDate(value: string): ParsedDate | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const slashDate = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (slashDate) {
    return { year: Number(slashDate[1]), month: Number(slashDate[2]), day: Number(slashDate[3]) };
  }

  const jpDate = normalized.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (jpDate) {
    return { year: Number(jpDate[1]), month: Number(jpDate[2]), day: Number(jpDate[3]) };
  }

  return null;
}

function monthKey(date: ParsedDate) {
  return `${date.year}-${String(date.month).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${String(year).slice(-2)}年${month}月`;
}

function isSeated(seat: string) {
  const normalized = seat.trim();
  return normalized === "着座" || normalized === "着席" || normalized.endsWith("→着座");
}

function isClosedStatus(status: string) {
  return status.trim().endsWith("成約");
}

function isPendingStatus(status: string) {
  const normalized = status.trim();
  return normalized.includes("成約予定") && !normalized.includes("失注") && !isClosedStatus(normalized);
}

function isHoldStatus(status: string) {
  return status.trim() === "保留";
}

function isValidAppointmentRow(row: SourceRow, memberGoals = DEFAULT_ORO_MEMBERS) {
  const member = normalizeName(getMember(row));
  const targetMembers = new Set(memberGoals.map((plan) => normalizeName(plan.name)));
  if (!targetMembers.has(member)) return false;
  return !EXCLUDED_SEAT_STATUSES.has(getSeat(row));
}

function getJstToday() {
  const shifted = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateToUtcDay(date: ParsedDate) {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000);
}

function getPace(remainingClosed: number, selectedMonth: string): Pace {
  if (remainingClosed <= 0) return { today: 0, thisWeek: 0, month: 0, remainingDays: 0, thisWeekDays: 0 };

  const [year, month] = selectedMonth.split("-").map(Number);
  const today = getJstToday();
  const monthStart = { year, month, day: 1 };
  const monthEnd = { year, month, day: daysInMonth(year, month) };
  const todayKey = dateToUtcDay(today);
  const start = todayKey > dateToUtcDay(monthStart) ? today : monthStart;
  const startKey = Math.min(Math.max(dateToUtcDay(start), dateToUtcDay(monthStart)), dateToUtcDay(monthEnd));
  const endKey = dateToUtcDay(monthEnd);
  const remainingDays = Math.max(1, endKey - startKey + 1);
  const startDate = new Date(startKey * 86_400_000);
  const dayOfWeek = startDate.getUTCDay();
  const daysToSunday = 6 - dayOfWeek;
  const thisWeekDays = Math.max(1, Math.min(remainingDays, daysToSunday + 1));

  return {
    today: Math.ceil(remainingClosed / remainingDays),
    thisWeek: Math.ceil((remainingClosed * thisWeekDays) / remainingDays),
    month: remainingClosed,
    remainingDays,
    thisWeekDays,
  };
}

async function loadRows() {
  const cached = dataCache.get("rows");
  if (cached && cached.expiresAt > Date.now()) return cached.rows;

  const urls = [TEAM_SALES_MIRROR_CSV_URL, process.env.TEAM_SALES_DASHBOARD_DATA_URL, SANITIZED_SOURCE_CSV_URL].filter(Boolean) as string[];
  const errors: string[] = [];

  for (const url of [...new Set(urls)]) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { accept: "text/csv,*/*" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        errors.push(`${url}: ${response.status}`);
        continue;
      }
      const text = await response.text();
      if (!text.trim() || text.trim().startsWith("#")) {
        errors.push(`${url}: empty or formula error`);
        continue;
      }
      const rows = parseCsv(text);
      dataCache.set("rows", { rows, expiresAt: Date.now() + DATA_CACHE_TTL_MS });
      return rows;
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.error("[oroteam-kpi] failed to load rows", errors);
  return [];
}

function resolveSeatRate(value?: string | null) {
  const rate = Number(value);
  if ([60, 65, 70, 75].includes(rate)) return rate;
  return 65;
}

function resolveMonth(value: string | null, availableMonths: string[]) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  if (availableMonths.includes(DEFAULT_MONTH)) return DEFAULT_MONTH;
  return availableMonths[0] ?? DEFAULT_MONTH;
}

function toBoundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function normalizeGoalPayload(body: Partial<OroGoalConfig>, month: string): OroGoalConfig {
  const defaultConfig = getDefaultGoalConfig(month);
  const incomingTargets = (body.teamTargets ?? {}) as Partial<TeamTargets>;
  const incomingMembers = new Map((body.members ?? []).map((member) => [normalizeName(member.name ?? ""), member]));

  return {
    month,
    teamTargets: {
      appointments: toBoundedNumber(incomingTargets.appointments, defaultConfig.teamTargets.appointments, 0, 9999),
      seated: toBoundedNumber(incomingTargets.seated, defaultConfig.teamTargets.seated, 0, 9999),
      closed: toBoundedNumber(incomingTargets.closed, defaultConfig.teamTargets.closed, 0, 9999),
      closeRate: toBoundedNumber(incomingTargets.closeRate, defaultConfig.teamTargets.closeRate, 0, 100),
    },
    members: defaultConfig.members.map((member) => {
      const incoming = incomingMembers.get(normalizeName(member.name));
      return {
        ...member,
        targetAppointments: toBoundedNumber(incoming?.targetAppointments, member.targetAppointments, 0, 9999),
        minCloseRate: toBoundedNumber(incoming?.minCloseRate, member.minCloseRate, 0, 100),
        lockedCloseRate: Boolean(incoming?.lockedCloseRate),
      };
    }),
    updatedAt: new Date().toISOString(),
  };
}

function buildSlideSuggestions(members: OroTeamMemberKpi[], seatRate: number) {
  const rankedReceivers = members
    .filter((member) => member.actualSeated >= 3 && member.currentCloseRate >= member.minCloseRate)
    .sort((a, b) => b.currentCloseRate - a.currentCloseRate || b.remainingClosed - a.remainingClosed);
  const rankedDonors = members
    .filter((member) => member.currentAppointments > 0 && member.remainingClosed > 0)
    .sort((a, b) => a.currentCloseRate - b.currentCloseRate || b.remainingClosed - a.remainingClosed);

  return rankedDonors.slice(0, 3).flatMap((donor, index) => {
    const receiver = rankedReceivers.find((candidate) => candidate.name !== donor.name);
    if (!receiver) return [];
    const appointments = Math.min(3, Math.max(1, Math.ceil(donor.remainingClosed / 3)), index === 0 ? 3 : 2);
    const donorRate = Math.max(donor.currentCloseRate, donor.minCloseRate * 0.75);
    const receiverRate = Math.max(receiver.currentCloseRate, receiver.minCloseRate);
    const expectedClosedLift = Math.max(0, appointments * (seatRate / 100) * ((receiverRate - donorRate) / 100));
    return [
      {
        from: donor.name,
        to: receiver.name,
        appointments,
        expectedClosedLift: Number(expectedClosedLift.toFixed(1)),
        reason: `${receiver.name}の直近成約率が高く、${donor.name}は必要成約数の残りが大きい`,
      },
    ];
  });
}

function buildAnalysis(members: OroTeamMemberKpi[], data: Pick<OroTeamKpiData, "totals" | "seatRate">) {
  const largestGap = [...members].sort((a, b) => b.remainingClosed - a.remainingClosed)[0];
  const strongest = [...members].sort((a, b) => b.actualClosed - a.actualClosed || b.currentCloseRate - a.currentCloseRate)[0];
  const underLine = members.filter((member) => member.actualSeated >= 3 && member.currentCloseRate < member.minCloseRate);
  const appointmentShortage = members.filter((member) => member.targetAppointmentGap < 0).sort((a, b) => a.targetAppointmentGap - b.targetAppointmentGap)[0];
  const analysis: string[] = [];

  analysis.push(`チーム成約目標${data.totals.targetClosed}件に対して、現時点の残り必要成約は${data.totals.remainingClosedToTarget}件です。`);
  if (largestGap) analysis.push(`最も成約残数が大きいのは${largestGap.name}で、月末までにあと${largestGap.remainingClosed}件が必要です。`);
  if (underLine.length) analysis.push(`最低成約率を下回っているメンバーは${underLine.map((member) => member.name).join("、")}です。フィードバック優先候補です。`);
  if (strongest) analysis.push(`${strongest.name}は現在${strongest.actualClosed}成約で、チームへの実績貢献が最大です。`);
  if (appointmentShortage) analysis.push(`${appointmentShortage.name}は配分アポに対して${Math.abs(appointmentShortage.targetAppointmentGap)}件不足しています。供給側の確認が必要です。`);
  analysis.push(`着座率${data.seatRate}%前提では、予測着座は${data.totals.projectedSeated}件です。着座目標との差分は${data.totals.seatedGap}件です。`);

  return analysis;
}

export async function getOroTeamKpiData({
  month,
  seatRate: requestedSeatRate,
}: {
  month?: string | null;
  seatRate?: string | null;
} = {}): Promise<OroTeamKpiData> {
  const rows = await loadRows();
  const defaultValidRows = rows.filter((row) => isValidAppointmentRow(row));
  const availableMonthValues = [
    ...new Set(
      defaultValidRows
        .map((row) => parseSheetDate(getAppointmentDate(row)))
        .filter((date): date is ParsedDate => Boolean(date))
        .map(monthKey)
        .filter((value) => value >= DEFAULT_MONTH),
    ),
  ].sort();
  const selectedMonth = resolveMonth(month ?? null, availableMonthValues);
  const goalConfig = await readGoalConfig(selectedMonth);
  const teamTargets = goalConfig.teamTargets;
  const memberGoals = goalConfig.members;
  const seatRate = resolveSeatRate(requestedSeatRate);
  const validRows = rows.filter((row) => isValidAppointmentRow(row, memberGoals));
  const monthRows = validRows.filter((row) => {
    const parsed = parseSheetDate(getAppointmentDate(row));
    return parsed && monthKey(parsed) === selectedMonth;
  });

  const members = memberGoals.map((plan): OroTeamMemberKpi => {
    const memberRows = monthRows.filter((row) => normalizeName(getMember(row)) === normalizeName(plan.name));
    const actualSeated = memberRows.filter((row) => isSeated(getSeat(row))).length;
    const actualClosed = memberRows.filter((row) => isClosedStatus(getStatus(row))).length;
    const pending = memberRows.filter((row) => isPendingStatus(getStatus(row))).length;
    const hold = memberRows.filter((row) => isHoldStatus(getStatus(row))).length;
    const currentAppointments = memberRows.length;
    const projectedSeated = Math.round(currentAppointments * (seatRate / 100));
    const requiredClosed = Math.ceil(projectedSeated * (plan.minCloseRate / 100));
    const remainingClosed = Math.max(0, requiredClosed - actualClosed);
    const currentCloseRate = actualSeated ? (actualClosed / actualSeated) * 100 : 0;

    return {
      name: plan.name,
      alias: plan.alias,
      targetAppointments: plan.targetAppointments,
      minCloseRate: plan.minCloseRate,
      currentAppointments,
      actualSeated,
      actualClosed,
      pending,
      hold,
      projectedSeated,
      requiredClosed,
      remainingClosed,
      currentCloseRate,
      targetAppointmentGap: currentAppointments - plan.targetAppointments,
      contributionGap: actualClosed - requiredClosed,
      pace: getPace(remainingClosed, selectedMonth),
    };
  });

  const currentAppointments = members.reduce((sum, member) => sum + member.currentAppointments, 0);
  const actualSeated = members.reduce((sum, member) => sum + member.actualSeated, 0);
  const actualClosed = members.reduce((sum, member) => sum + member.actualClosed, 0);
  const projectedSeated = Math.round(currentAppointments * (seatRate / 100));
  const requiredClosedAtTeamRate = Math.ceil(projectedSeated * (teamTargets.closeRate / 100));
  const requiredClosedAtMemberRates = members.reduce((sum, member) => sum + member.requiredClosed, 0);
  const projectedClosedAtTeamRate = requiredClosedAtTeamRate;
  const totals = {
    targetAppointments: teamTargets.appointments,
    currentAppointments,
    targetSeated: teamTargets.seated,
    projectedSeated,
    actualSeated,
    targetClosed: teamTargets.closed,
    actualClosed,
    requiredClosedAtTeamRate,
    requiredClosedAtMemberRates,
    remainingClosedToTarget: Math.max(0, teamTargets.closed - actualClosed),
    remainingClosedToMemberRates: Math.max(0, requiredClosedAtMemberRates - actualClosed),
    projectedClosedAtTeamRate,
    appointmentGap: currentAppointments - teamTargets.appointments,
    seatedGap: projectedSeated - teamTargets.seated,
    closedGap: actualClosed - teamTargets.closed,
    targetAchievementRate: teamTargets.closed ? (actualClosed / teamTargets.closed) * 100 : 0,
  };

  const data = {
    updatedAt: new Date().toISOString(),
    source: rows.length ? ("sheet" as const) : ("fallback" as const),
    selectedMonth,
    selectedMonthLabel: monthLabel(selectedMonth),
    availableMonths: (availableMonthValues.length ? availableMonthValues : [DEFAULT_MONTH]).map((value) => ({
      value,
      label: monthLabel(value),
    })),
    seatRate,
    teamTargets,
    editableGoals: goalConfig,
    totals,
    members,
    slideSuggestions: buildSlideSuggestions(members, seatRate),
    analysis: [] as string[],
    assumptions: [
      "目標値はこの画面から月ごとに保存できます。横山英輝の初期値は5アポ・最低成約率30%です。",
      "集計基準は面談日です。選択月の面談日を持つ有効アポのみを対象にしています。",
      "担当者変更・重複予約・無効アポは予約母数から除外しています。",
    ],
  };
  data.analysis = buildAnalysis(members, data);

  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await getOroTeamKpiData({
    month: searchParams.get("month"),
    seatRate: searchParams.get("seatRate"),
  });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<OroGoalConfig>;
    const month = typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : DEFAULT_MONTH;
    const goal = normalizeGoalPayload(body, month);
    const { store } = await readGoalStore();
    const nextStore: OroGoalStore = {
      goals: {
        ...store.goals,
        [month]: goal,
      },
    };
    const source = await writeGoalStore(nextStore);
    const data = await getOroTeamKpiData({ month });

    return NextResponse.json({ goal, data, source }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[oroteam-kpi] POST failed", error);
    return NextResponse.json({ error: "Failed to save ORO KPI goals" }, { status: 500 });
  }
}
