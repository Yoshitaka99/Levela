import { parseCsv } from "../../lib/csv";
import type {
  LstepColumnMap,
  LstepFriend,
  LstepSourceStat,
  LstepTagPair,
  LstepTagStat,
  LstepTagsData,
} from "../../lstep-tags/types";

export const DEFAULT_SPREADSHEET_ID = process.env.LSTEP_SPREADSHEET_ID ?? "";
export const DEFAULT_SHEET_NAME = process.env.LSTEP_SHEET_NAME ?? "";
export const DEFAULT_RANGE = process.env.LSTEP_RANGE ?? "A1:CV5000";

const NAME_PATTERN = /(友だち|友達|表示名|氏名|名前|ユーザー名|nickname|name)/i;
const DATE_PATTERN = /(登録日|追加日|友だち追加|作成日|日時|date)/i;
const SOURCE_PATTERN = /(流入|経路|媒体|参加経路|source)/i;
const STATUS_PATTERN = /(ステータス|状態|ブロック|status)/i;
const TAG_HEADER_PATTERN = /^(タグ|tag)/i;

/** ○×形式のタグ列を見分けるための「付いている」マーク。 */
const MARK_VALUES = new Set([
  "○",
  "◯",
  "〇",
  "●",
  "✓",
  "✔",
  "レ",
  "x",
  "×",
  "true",
  "1",
  "あり",
  "有",
  "yes",
  "y",
]);

const TRUE_MARK_VALUES = new Set(["○", "◯", "〇", "●", "✓", "✔", "レ", "true", "1", "あり", "有", "yes", "y"]);

const MAX_PAIR_TAGS = 20;
const MAX_PAIRS = 24;
const MAX_SOURCES = 20;

function getCell(row: string[], index: number) {
  return row[index]?.trim() ?? "";
}

function normalizeMark(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function normalizeSpreadsheetId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

function rangeStartRow(range: string) {
  const match = range.match(/^[A-Za-z]+(\d+)/);
  const parsed = match ? Number(match[1]) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function fetchCsv(spreadsheetId: string, sheetName: string, range: string) {
  const params = new URLSearchParams({ tqx: "out:csv", range });
  if (sheetName) params.set("sheet", sheetName);

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params.toString()}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "text/csv,*/*" },
  });

  if (!response.ok) {
    throw new Error(
      `スプレッドシートをCSVで読めませんでした（HTTP ${response.status}）。IDとシート名を確認してください。`,
    );
  }

  const text = await response.text();
  if (text.includes("<!DOCTYPE html") || text.includes("ServiceLogin")) {
    throw new Error(
      "公開CSVとして読めませんでした。共有設定を「リンクを知っている全員（閲覧者）」にしてください。",
    );
  }

  return parseCsv(text);
}

/** 先頭数行のうち、埋まっているセルが最も多い行をヘッダーとみなす。 */
function detectHeaderRowIndex(rows: string[][]) {
  const limit = Math.min(rows.length, 8);
  let bestIndex = 0;
  let bestFilled = -1;

  for (let i = 0; i < limit; i += 1) {
    const filled = rows[i].filter((cell) => cell.trim()).length;
    if (filled > bestFilled) {
      bestFilled = filled;
      bestIndex = i;
    }
  }

  return bestFilled >= 2 ? bestIndex : 0;
}

function findColumn(headers: string[], pattern: RegExp, used: Set<number>) {
  for (let i = 0; i < headers.length; i += 1) {
    if (used.has(i)) continue;
    if (pattern.test(headers[i])) {
      used.add(i);
      return i;
    }
  }
  return null;
}

/**
 * 列が「タグ名を見出しに持つ ○×列」かどうか。
 * 中身の非空値がすべてマーク記号なら、その列名をタグとして扱う。
 */
function isWideTagColumn(body: string[][], index: number) {
  let filled = 0;
  for (const row of body) {
    const value = getCell(row, index);
    if (!value) continue;
    filled += 1;
    if (!MARK_VALUES.has(normalizeMark(value))) return false;
  }
  return filled > 0;
}

function detectColumns(rows: string[][], headerRowIndex: number): LstepColumnMap {
  const headers = (rows[headerRowIndex] ?? []).map((cell) => cell.trim());
  const body = rows.slice(headerRowIndex + 1);
  const used = new Set<number>();

  const csvTagColumns: number[] = [];
  headers.forEach((header, index) => {
    if (TAG_HEADER_PATTERN.test(header)) {
      csvTagColumns.push(index);
      used.add(index);
    }
  });

  const nameColumn = findColumn(headers, NAME_PATTERN, used);
  const registeredAtColumn = findColumn(headers, DATE_PATTERN, used);
  const sourceColumn = findColumn(headers, SOURCE_PATTERN, used);
  const statusColumn = findColumn(headers, STATUS_PATTERN, used);

  const wideTagColumns: number[] = [];
  headers.forEach((header, index) => {
    if (used.has(index) || !header) return;
    if (isWideTagColumn(body, index)) wideTagColumns.push(index);
  });

  let tagMode: LstepColumnMap["tagMode"] = "none";
  if (csvTagColumns.length && wideTagColumns.length) tagMode = "mixed";
  else if (csvTagColumns.length) tagMode = "csv";
  else if (wideTagColumns.length) tagMode = "wide";

  return {
    headerRowIndex,
    headers,
    nameColumn,
    registeredAtColumn,
    sourceColumn,
    statusColumn,
    csvTagColumns,
    wideTagColumns,
    tagMode,
  };
}

/** タグ列は「,」「、」「|」改行区切りを想定。「/」はタグ名に含まれ得るので分割しない。 */
function splitTags(value: string) {
  return value
    .split(/[,、，|\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildFriends(rows: string[][], columnMap: LstepColumnMap, startRow: number) {
  const body = rows.slice(columnMap.headerRowIndex + 1);
  const tagList: string[] = [];
  const tagIndexByName = new Map<string, number>();

  const tagIdOf = (tag: string) => {
    const existing = tagIndexByName.get(tag);
    if (existing !== undefined) return existing;
    const id = tagList.length;
    tagList.push(tag);
    tagIndexByName.set(tag, id);
    return id;
  };

  const friends: LstepFriend[] = body.flatMap((row, index) => {
    const name = columnMap.nameColumn === null ? "" : getCell(row, columnMap.nameColumn);
    const tagIds = new Set<number>();

    for (const column of columnMap.csvTagColumns) {
      for (const tag of splitTags(getCell(row, column))) {
        tagIds.add(tagIdOf(tag));
      }
    }

    for (const column of columnMap.wideTagColumns) {
      const value = normalizeMark(getCell(row, column));
      if (!value || !TRUE_MARK_VALUES.has(value)) continue;
      const header = columnMap.headers[column];
      if (header) tagIds.add(tagIdOf(header));
    }

    if (!name && tagIds.size === 0) return [];

    return [
      {
        rowNumber: startRow + columnMap.headerRowIndex + 1 + index,
        name,
        registeredAt:
          columnMap.registeredAtColumn === null ? "" : getCell(row, columnMap.registeredAtColumn),
        source: columnMap.sourceColumn === null ? "" : getCell(row, columnMap.sourceColumn),
        status: columnMap.statusColumn === null ? "" : getCell(row, columnMap.statusColumn),
        tagIds: [...tagIds],
      },
    ];
  });

  return { friends, tagList };
}

function buildTagStats(friends: LstepFriend[], tagList: string[]): LstepTagStat[] {
  const counts = new Array<number>(tagList.length).fill(0);
  for (const friend of friends) {
    for (const tagId of friend.tagIds) counts[tagId] += 1;
  }

  const total = friends.length;
  return tagList
    .map((tag, id) => ({
      tag,
      count: counts[id],
      ratio: total ? counts[id] / total : 0,
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ja"));
}

/** 上位タグ同士の共起。lift が高い＝そのタグ同士が一緒に付きやすい。 */
function buildTagPairs(friends: LstepFriend[], tagList: string[]): LstepTagPair[] {
  const total = friends.length;
  if (total < 10) return [];

  const countById = new Array<number>(tagList.length).fill(0);
  for (const friend of friends) {
    for (const tagId of friend.tagIds) countById[tagId] += 1;
  }

  const targetIds = new Set(
    countById
      .map((count, id) => ({ count, id }))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_PAIR_TAGS)
      .map((entry) => entry.id),
  );

  const pairCounts = new Map<string, number>();
  for (const friend of friends) {
    const ids = friend.tagIds.filter((id) => targetIds.has(id)).sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const key = `${ids[i]}:${ids[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const minCount = Math.max(3, Math.round(total * 0.005));
  const pairs: LstepTagPair[] = [];

  for (const [key, count] of pairCounts) {
    if (count < minCount) continue;
    const [rawA, rawB] = key.split(":").map(Number);
    const countA = countById[rawA];
    const countB = countById[rawB];
    if (!countA || !countB) continue;

    const lift = (count / total) / ((countA / total) * (countB / total));
    if (lift < 1.2) continue;

    // 母数の大きいタグを起点にして「Aを持つ人のX%がBも持つ」と読めるようにする。
    const [baseId, otherId, baseCount] =
      countA >= countB ? [rawA, rawB, countA] : [rawB, rawA, countB];

    pairs.push({
      a: tagList[baseId],
      b: tagList[otherId],
      count,
      confidence: count / baseCount,
      lift,
    });
  }

  return pairs.sort((a, b) => b.lift - a.lift || b.count - a.count).slice(0, MAX_PAIRS);
}

function buildSourceStats(friends: LstepFriend[], tagList: string[]): LstepSourceStat[] {
  const groups = new Map<string, LstepFriend[]>();
  for (const friend of friends) {
    const key = friend.source || "（未設定）";
    const bucket = groups.get(key);
    if (bucket) bucket.push(friend);
    else groups.set(key, [friend]);
  }

  const total = friends.length;
  return [...groups.entries()]
    .map(([source, members]) => {
      const counts = new Map<number, number>();
      let tagged = 0;
      for (const member of members) {
        if (member.tagIds.length) tagged += 1;
        for (const tagId of member.tagIds) {
          counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
        }
      }

      const topTags = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tagId]) => tagList[tagId]);

      return {
        source,
        count: members.length,
        ratio: total ? members.length / total : 0,
        taggedRatio: members.length ? tagged / members.length : 0,
        topTags,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_SOURCES);
}

function buildWarning(columnMap: LstepColumnMap, friends: LstepFriend[]) {
  const warnings: string[] = [];
  if (columnMap.tagMode === "none") {
    warnings.push("タグ列を自動判定できませんでした。設定タブで列を指定してください。");
  }
  if (columnMap.nameColumn === null) {
    warnings.push("名前列を自動判定できませんでした。");
  }
  if (!friends.length) {
    warnings.push("データ行が0件です。シート名と範囲を確認してください。");
  }
  return warnings.length ? warnings.join(" / ") : undefined;
}

export type ColumnOverrides = Partial<
  Pick<
    LstepColumnMap,
    "nameColumn" | "registeredAtColumn" | "sourceColumn" | "statusColumn" | "csvTagColumns"
  >
>;

/** CSV取得と分離した純粋な解析部。 */
export function analyzeLstepRows(
  rows: string[][],
  options: {
    spreadsheetId: string;
    sheetName: string;
    startRow: number;
    overrides?: ColumnOverrides;
  },
): LstepTagsData {
  const { spreadsheetId, sheetName, startRow, overrides } = options;
  const headerRowIndex = detectHeaderRowIndex(rows);
  const detected = detectColumns(rows, headerRowIndex);

  const columnMap: LstepColumnMap = overrides
    ? {
        ...detected,
        nameColumn: overrides.nameColumn ?? detected.nameColumn,
        registeredAtColumn: overrides.registeredAtColumn ?? detected.registeredAtColumn,
        sourceColumn: overrides.sourceColumn ?? detected.sourceColumn,
        statusColumn: overrides.statusColumn ?? detected.statusColumn,
        csvTagColumns: overrides.csvTagColumns?.length ? overrides.csvTagColumns : detected.csvTagColumns,
      }
    : detected;

  if (overrides?.csvTagColumns?.length) {
    const forced = new Set(overrides.csvTagColumns);
    columnMap.wideTagColumns = detected.wideTagColumns.filter((index) => !forced.has(index));
    columnMap.tagMode = columnMap.wideTagColumns.length ? "mixed" : "csv";
  }

  const { friends, tagList } = buildFriends(rows, columnMap, startRow);
  const tagStats = buildTagStats(friends, tagList);
  const taggedFriends = friends.filter((friend) => friend.tagIds.length).length;
  const totalTagAssignments = friends.reduce((sum, friend) => sum + friend.tagIds.length, 0);
  const blockedFriends = friends.filter((friend) => /ブロック|block/i.test(friend.status)).length;

  return {
    updatedAt: new Date().toISOString(),
    spreadsheetId,
    sheetName,
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    columnMap,
    tagList,
    friends,
    tagStats,
    tagPairs: buildTagPairs(friends, tagList),
    sources: buildSourceStats(friends, tagList),
    stats: {
      totalFriends: friends.length,
      taggedFriends,
      untaggedFriends: friends.length - taggedFriends,
      totalTags: tagList.length,
      averageTagsPerFriend: friends.length ? totalTagAssignments / friends.length : 0,
      blockedFriends,
    },
    warning: buildWarning(columnMap, friends),
  };
}

export async function fetchLstepData(options: {
  spreadsheetId: string;
  sheetName: string;
  range: string;
  overrides?: ColumnOverrides;
}): Promise<LstepTagsData> {
  const { spreadsheetId, sheetName, range, overrides } = options;
  const rows = await fetchCsv(spreadsheetId, sheetName, range);
  return analyzeLstepRows(rows, {
    spreadsheetId,
    sheetName,
    startRow: rangeStartRow(range),
    overrides,
  });
}
