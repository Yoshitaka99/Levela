export type OroKpiMetrics = {
  reservations: number;
  seated: number;
  seatRate: number;
  closed: number;
  pending: number;
  closeRate: number;
};

export type OroKpiMember = {
  key: string;
  fullName: string;
  displayName: string;
  discordMention: string;
  metrics: OroKpiMetrics;
};

export type OroKpiCheckData = {
  month: string;
  monthLabel: string;
  updatedAt: string;
  source: "source" | "mirror" | "sheet" | "fallback";
  members: OroKpiMember[];
  totals: OroKpiMetrics;
  officialText: string;
};

export type ComparedMetricKey = keyof OroKpiMetrics;

export type MetricDifference = {
  key: ComparedMetricKey;
  label: string;
  unit: "件" | "pt";
  expected: number;
  reported: number | null;
  difference: number | null;
};

export type MemberDifference = {
  key: string;
  fullName: string;
  displayName: string;
  missingReport: boolean;
  differences: MetricDifference[];
};

export const ORO_ROLE_MENTION = "<@&1179698803692032070>";

export const ORO_REPORT_MEMBERS = [
  { key: "oi", fullName: "苙隼人", displayName: "苙", discordMention: "<@882595821781131284>" },
  { key: "ishida", fullName: "石田竜一", displayName: "石田", discordMention: "<@1421356591151845386>" },
  { key: "takahashi", fullName: "高橋健太", displayName: "高橋", discordMention: "<@1414732937160818771>" },
  { key: "yokoyama", fullName: "横山英輝", displayName: "横山", discordMention: "<@1510609257622671372>" },
  { key: "kato", fullName: "加藤陸", displayName: "加藤", discordMention: "<@1486597983683350538>" },
  { key: "orihara", fullName: "折原加純", displayName: "折原", discordMention: "<@1376798782464725013>" },
  { key: "sasaki", fullName: "佐々木爽", displayName: "佐々木", discordMention: "<@1497455355091746886>" },
  { key: "mochiki", fullName: "持木玲那", displayName: "持木", discordMention: "<@1316383883414994976>" },
  { key: "hoshino", fullName: "星野譲治", displayName: "星野", discordMention: "<@1513831877713068072>" },
  { key: "tanaka", fullName: "田仲由敬", displayName: "田仲", discordMention: "<@1058936156626104384>" },
] as const;

export const METRIC_META: Record<ComparedMetricKey, { label: string; unit: "件" | "pt" }> = {
  reservations: { label: "予約数", unit: "件" },
  seated: { label: "着座数", unit: "件" },
  seatRate: { label: "着座率", unit: "pt" },
  closed: { label: "成約数", unit: "件" },
  pending: { label: "成約予定数", unit: "件" },
  closeRate: { label: "成約率", unit: "pt" },
};

export const COMPARED_METRIC_KEYS = [
  "reservations",
  "seated",
  "seatRate",
  "closed",
  "pending",
  "closeRate",
] as const satisfies readonly ComparedMetricKey[];

