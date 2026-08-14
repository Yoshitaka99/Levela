export type LstepTagMode = "none" | "csv" | "wide" | "mixed";

export type LstepColumnMap = {
  headerRowIndex: number;
  headers: string[];
  nameColumn: number | null;
  registeredAtColumn: number | null;
  sourceColumn: number | null;
  statusColumn: number | null;
  csvTagColumns: number[];
  wideTagColumns: number[];
  tagMode: LstepTagMode;
};

/** タグは tagList のインデックスで持つ（行数が多いときの転送量対策）。 */
export type LstepFriend = {
  rowNumber: number;
  name: string;
  registeredAt: string;
  source: string;
  status: string;
  tagIds: number[];
};

export type LstepTagStat = {
  tag: string;
  count: number;
  ratio: number;
};

/** a を持つ人が b も持ちやすいか。confidence = P(b|a)、lift は独立時との比。 */
export type LstepTagPair = {
  a: string;
  b: string;
  count: number;
  confidence: number;
  lift: number;
};

export type LstepSourceStat = {
  source: string;
  count: number;
  ratio: number;
  taggedRatio: number;
  topTags: string[];
};

export type LstepStats = {
  totalFriends: number;
  taggedFriends: number;
  untaggedFriends: number;
  totalTags: number;
  averageTagsPerFriend: number;
  blockedFriends: number;
};

export type LstepTagsData = {
  updatedAt: string;
  spreadsheetId: string;
  sheetName: string;
  sheetsUrl: string;
  columnMap: LstepColumnMap;
  tagList: string[];
  friends: LstepFriend[];
  tagStats: LstepTagStat[];
  tagPairs: LstepTagPair[];
  sources: LstepSourceStat[];
  stats: LstepStats;
  warning?: string;
};

/**
 * セグメント判定ルール。キーワードはタグ名の部分一致（NFKC + 小文字化）で判定する。
 * all: 全部含む / any: いずれか含む / none: ひとつも含まない。
 */
export type SegmentRule = {
  id: string;
  label: string;
  all: string[];
  any: string[];
  none: string[];
};

export type SegmentResult = {
  id: string;
  label: string;
  count: number;
  ratio: number;
  rowNumbers: number[];
};
