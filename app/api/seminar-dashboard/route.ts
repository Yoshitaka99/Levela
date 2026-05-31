import { NextResponse } from "next/server";
import {
  defaultDashboardData,
  type MemberKpi,
  type ReasonCount,
  type SeminarDashboardData,
  type StatusCount,
} from "../../seminar-dashboard/data";

export const dynamic = "force-dynamic";

const CUSTOMER_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s/gviz/tq?tqx=out:csv&gid=2051214579";

const DEFAULT_SEMINAR_TEXT = "5月セミナー";

const TARGET_MEMBERS = [
  "和佐田舞緒",
  "関口愛里",
  "田仲由敬",
  "早川大貴",
  "河上まちこ",
  "加藤陸",
  "持木玲那",
  "笠松佑衣",
  "五十嵐凌大",
  "苙隼人",
];

type SourceRow = Record<string, string>;

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[,%]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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

function getValue(row: SourceRow, index: number, fallbackHeader?: string) {
  return row[`__col_${index}`] ?? (fallbackHeader ? row[fallbackHeader] : "") ?? "";
}

function getSeminarOptions(rows: SourceRow[]) {
  return [
    ...new Set(
      rows
        .map((row) => getValue(row, 2, "セミナー").trim())
        .filter((seminar) => seminar.includes("セミナー")),
    ),
  ].sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
}

function resolveSelectedSeminar(options: string[], requestedSeminar?: string | null) {
  const requested = requestedSeminar?.trim();
  if (requested && options.includes(requested)) return requested;
  if (requested) {
    const partialMatch = options.find((option) => option.includes(requested));
    if (partialMatch) return partialMatch;
  }

  return options.find((option) => option.includes(DEFAULT_SEMINAR_TEXT)) ?? options[0] ?? DEFAULT_SEMINAR_TEXT;
}

function aggregateCustomerRows(rows: SourceRow[], requestedSeminar?: string | null): SeminarDashboardData | null {
  const seminars = getSeminarOptions(rows);
  const selectedSeminar = resolveSelectedSeminar(seminars, requestedSeminar);
  const memberRows = new Map<string, SourceRow[]>();
  TARGET_MEMBERS.forEach((member) => memberRows.set(member, []));

  rows.forEach((row) => {
    const member = getValue(row, 1, "担当者名").trim();
    const seminar = getValue(row, 2, "セミナー").trim();
    if (!TARGET_MEMBERS.includes(member)) return;
    if (seminar !== selectedSeminar) return;
    memberRows.get(member)?.push(row);
  });

  const allLostReasons = new Map<string, number>();
  const allHoldReasons = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  let totalLeads = 0;

  const members: MemberKpi[] = TARGET_MEMBERS.map((name) => {
    const scopedRows = memberRows.get(name) ?? [];
    const lostReasons = new Map<string, number>();
    const holdReasons = new Map<string, number>();
    let seated = 0;
    let closed = 0;
    let pending = 0;
    let hold = 0;
    let alert = 0;

    scopedRows.forEach((row) => {
      const seat = getValue(row, 6, "着席").trim();
      const status = getValue(row, 7, "2回目/実施後ステータス").trim();
      const paymentDate = getValue(row, 13, "決着日(着金日)").trim();
      const lostReason = getValue(row, 16, "失注理由");
      const holdReason = getValue(row, 17, "保留理由") || getValue(row, 19, "保留理由");

      if (seat === "着座") seated += 1;
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
      if (status) increment(statusCounts, status);
    });

    const leads = scopedRows.length;
    totalLeads += leads;
    const projected = closed + pending;

    return {
      name,
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
      rate: totalLeads ? (count / totalLeads) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"))
    .slice(0, 8);

  return {
    updatedAt: new Date().toISOString(),
    source: "sheet",
    selectedSeminar,
    seminars,
    members,
    lostReasons: toReasonCounts(allLostReasons),
    holdReasons: toReasonCounts(allHoldReasons),
    statusMix,
  };
}

function normalizeMembers(rows: Record<string, unknown>[]): MemberKpi[] {
  return rows
    .filter((row) => String(row.name ?? row["メンバー"] ?? "").trim())
    .map((row) => {
      const name = String(row.name ?? row["メンバー"] ?? "").trim();
      const leads = toNumber(row.leads ?? row["抽出"]);
      const seated = toNumber(row.seated ?? row["着座"]);
      const closed = toNumber(row.closed ?? row["成約"]);
      const pending = toNumber(row.pending ?? row["予定"] ?? row["成約予定"]);
      const projected = closed + pending;
      const hold = toNumber(row.hold ?? row["保留"]);
      const alert = toNumber(row.alert ?? row["警告"] ?? row["アラート"]);
      const seatRate = leads ? (seated / leads) * 100 : toNumber(row.seatRate ?? row["着座率"]);
      const closeRate = seated ? (closed / seated) * 100 : toNumber(row.closeRate ?? row["成約率"]);
      const projectedRate = seated
        ? (projected / seated) * 100
        : toNumber(row.projectedRate ?? row["予定込率"] ?? row["予定込み成約率"]);

      return {
        name,
        leads,
        seated,
        seatRate,
        closed,
        closeRate,
        pending,
        projected,
        projectedRate,
        hold,
        alert,
        lostReasons: [],
        holdReasons: [],
      };
    });
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

export async function fetchLiveData(requestedSeminar?: string | null): Promise<SeminarDashboardData | null> {
  const url = process.env.SEMINAR_DASHBOARD_DATA_URL || CUSTOMER_SHEET_CSV_URL;

  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json,text/csv,*/*" },
  });

  if (!response.ok) {
    throw new Error(`Dashboard data fetch failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (contentType.includes("application/json") || text.trim().startsWith("{")) {
    const data = JSON.parse(text) as SeminarDashboardData;
    return {
      ...defaultDashboardData,
      ...data,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      source: "sheet",
    };
  }

  const parsedRows = parseCsv(text);
  const customerSheetData = parsedRows.length ? aggregateCustomerRows(parsedRows as SourceRow[], requestedSeminar) : null;
  if (customerSheetData) return customerSheetData;

  const members = normalizeMembers(parsedRows);
  if (!members.length) return null;

  return {
    ...defaultDashboardData,
    updatedAt: new Date().toISOString(),
    source: "sheet",
    selectedSeminar: requestedSeminar || defaultDashboardData.selectedSeminar,
    members,
  };
}

export async function GET(request: Request) {
  try {
    const requestedSeminar = new URL(request.url).searchParams.get("seminar");
    const liveData = await fetchLiveData(requestedSeminar);

    return NextResponse.json(liveData ?? defaultDashboardData, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...defaultDashboardData,
        source: "fallback",
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown data fetch error",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
