import type { SegmentResult, SegmentRule } from "./types";

/**
 * 初期ルール。実際のタグ名に合わせて画面上で編集する前提のたたき台。
 * 上から順に判定し、最初に当たったセグメントに割り当てる（排他）。
 */
export const DEFAULT_SEGMENT_RULES: SegmentRule[] = [
  {
    id: "contracted",
    label: "成約",
    all: [],
    any: ["成約", "契約", "入金", "申込完了"],
    none: [],
  },
  {
    id: "left",
    label: "ブロック・離脱",
    all: [],
    any: ["ブロック", "離脱", "解除", "配信停止"],
    none: [],
  },
  {
    id: "consulting",
    label: "個別相談・面談",
    all: [],
    any: ["個別相談", "面談", "相談予約", "zoom"],
    none: [],
  },
  {
    id: "seminar-done",
    label: "セミナー参加済み",
    all: [],
    any: ["セミナー参加", "参加済", "視聴済"],
    none: [],
  },
  {
    id: "seminar-booked",
    label: "セミナー予約",
    all: [],
    any: ["セミナー予約", "予約", "申込"],
    none: [],
  },
  {
    id: "survey",
    label: "アンケート回答",
    all: [],
    any: ["アンケート", "回答", "診断"],
    none: [],
  },
];

export function normalizeTagText(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

function includesKeyword(normalizedTags: string[], keyword: string) {
  const needle = normalizeTagText(keyword);
  if (!needle) return false;
  return normalizedTags.some((tag) => tag.includes(needle));
}

export function isEmptyRule(rule: SegmentRule) {
  return rule.all.length === 0 && rule.any.length === 0 && rule.none.length === 0;
}

export function matchesRule(tags: string[], rule: SegmentRule) {
  if (isEmptyRule(rule)) return false;

  const normalizedTags = tags.map(normalizeTagText);

  if (rule.all.length && !rule.all.every((keyword) => includesKeyword(normalizedTags, keyword))) {
    return false;
  }
  if (rule.any.length && !rule.any.some((keyword) => includesKeyword(normalizedTags, keyword))) {
    return false;
  }
  if (rule.none.length && rule.none.some((keyword) => includesKeyword(normalizedTags, keyword))) {
    return false;
  }
  return true;
}

export const UNCLASSIFIED_SEGMENT_ID = "__unclassified__";

/** 先頭のルールから順に判定し、最初に一致したセグメントへ割り当てる。 */
export function assignSegments(
  friends: { rowNumber: number; tags: string[] }[],
  rules: SegmentRule[],
): SegmentResult[] {
  const buckets = new Map<string, number[]>();
  for (const rule of rules) {
    buckets.set(rule.id, []);
  }
  buckets.set(UNCLASSIFIED_SEGMENT_ID, []);

  for (const friend of friends) {
    const matched = rules.find((rule) => matchesRule(friend.tags, rule));
    buckets.get(matched?.id ?? UNCLASSIFIED_SEGMENT_ID)?.push(friend.rowNumber);
  }

  const total = friends.length;
  const toResult = (id: string, label: string): SegmentResult => {
    const rowNumbers = buckets.get(id) ?? [];
    return {
      id,
      label,
      count: rowNumbers.length,
      ratio: total ? rowNumbers.length / total : 0,
      rowNumbers,
    };
  };

  return [
    ...rules.map((rule) => toResult(rule.id, rule.label)),
    toResult(UNCLASSIFIED_SEGMENT_ID, "未分類"),
  ];
}

export function parseKeywordList(value: string) {
  return value
    .split(/[,、，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatKeywordList(values: string[]) {
  return values.join(", ");
}
