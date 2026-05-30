import { postDiscordResult } from "./discord";
import { renderAutomationImage } from "./renderImage";
import type { AutomationResult } from "./types";

type RankingMember = {
  name: string;
  dailyPoints: number;
  totalPoints: number;
  dailyRank?: number;
  totalRank?: number;
};

type FlightRankingMember = {
  name?: string;
  xp?: number;
  groupName?: string | null;
};

type RankingBuckets = {
  today?: FlightRankingMember[];
  weekly?: FlightRankingMember[];
  total?: FlightRankingMember[];
};

type RankingPayload = {
  updatedAt?: string;
  members?: RankingMember[];
  daily?: RankingMember[];
  total?: RankingMember[];
  all?: RankingBuckets;
  group?: RankingBuckets;
  groupName?: string;
};

const DEFAULT_RANKING_URL = "https://app.levela.co.jp/ai-drill/ranking";
const DEFAULT_TARGET_MEMBERS = [
  "和佐田舞緒",
  "関口愛里",
  "田仲由敬",
  "早川大貴",
  "河上まちこ",
  "加藤陸",
  "持木玲那",
  "笠松佑衣",
  "五十嵐凌大",
];

export type AiDrillRankingOptions = {
  discordWebhookUrl?: string;
  rankingJsonUrl?: string;
  rankingCookie?: string;
  rankingAuthorization?: string;
  targetMembers?: string;
  roundStart?: string | number;
  roundStartDate?: string;
};

export async function runAiDrillRankingAutomation(options: AiDrillRankingOptions = {}): Promise<AutomationResult> {
  const payload = await fetchRankingPayload(options);
  const members = normalizeRankingMembers(payload);
  if (!members.length) {
    throw new Error("AI drill ranking data was empty. Set LEVELA_AI_DRILL_COOKIE or LEVELA_AI_DRILL_RANKING_JSON_URL.");
  }

  const targetMembers = getTargetMembers(options);
  const filteredMembers = targetMembers.length
    ? members.filter((member) => targetMembers.some((target) => sameName(target, member.name)))
    : members;

  if (!filteredMembers.length) {
    throw new Error("No target members matched the AI drill ranking data.");
  }

  const title = `${getRoundLabel(options)} AIドリルランキング`;
  const summary = buildRankingSummary(title, filteredMembers);
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-ai-drill`;
  const image = await renderAutomationImage(id, summary);

  const result: AutomationResult = {
    id,
    title,
    summary,
    sources: [
      {
        url: options.rankingJsonUrl || process.env.LEVELA_AI_DRILL_RANKING_URL || DEFAULT_RANKING_URL,
        title: "withAIドリルランキング",
        text: summary,
      },
    ],
    ...image,
  };

  await postDiscordResult(result, options.discordWebhookUrl);
  return result;
}

async function fetchRankingPayload(options: AiDrillRankingOptions): Promise<RankingPayload | string> {
  const jsonUrl = options.rankingJsonUrl || process.env.LEVELA_AI_DRILL_RANKING_JSON_URL;
  if (jsonUrl) {
    const response = await fetch(jsonUrl, {
      cache: "no-store",
      headers: buildRankingHeaders("application/json", options),
    });
    if (!response.ok) throw new Error(`Ranking JSON fetch failed: ${response.status}`);
    return response.json() as Promise<RankingPayload>;
  }

  const response = await fetch(DEFAULT_RANKING_URL, {
    cache: "no-store",
    headers: buildRankingHeaders("text/html", options),
  });
  if (!response.ok) throw new Error(`Ranking page fetch failed: ${response.status}`);
  return response.text();
}

function buildRankingHeaders(accept: string, options: AiDrillRankingOptions) {
  const headers: Record<string, string> = {
    accept,
    "user-agent": "LevelaAutomation/1.0",
  };
  const cookie = options.rankingCookie || process.env.LEVELA_AI_DRILL_COOKIE;
  const authorization = options.rankingAuthorization || process.env.LEVELA_AI_DRILL_AUTHORIZATION;
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;
  return headers;
}

function normalizeRankingMembers(payload: RankingPayload | string): RankingMember[] {
  if (typeof payload === "string") return parseRankingText(payload);

  const byName = new Map<string, RankingMember>();
  for (const member of payload.members || []) upsertMember(byName, member);
  for (const [index, member] of (payload.daily || []).entries()) {
    upsertMember(byName, { ...member, dailyRank: member.dailyRank ?? index + 1 });
  }
  for (const [index, member] of (payload.total || []).entries()) {
    upsertMember(byName, { ...member, totalRank: member.totalRank ?? index + 1 });
  }

  const scoped = payload.group || payload.all;
  for (const [index, member] of (scoped?.today || []).entries()) {
    upsertMember(byName, flightMemberToRankingMember(member, "daily", index + 1));
  }
  for (const [index, member] of (scoped?.total || []).entries()) {
    upsertMember(byName, flightMemberToRankingMember(member, "total", index + 1));
  }

  return [...byName.values()].sort((a, b) => (a.totalRank ?? 9999) - (b.totalRank ?? 9999));
}

function flightMemberToRankingMember(member: FlightRankingMember, kind: "daily" | "total", rank: number): RankingMember {
  const points = Number(member.xp || 0);
  return {
    name: String(member.name || "").trim(),
    dailyPoints: kind === "daily" ? points : 0,
    totalPoints: kind === "total" ? points : 0,
    dailyRank: kind === "daily" ? rank : undefined,
    totalRank: kind === "total" ? rank : undefined,
  };
}

function upsertMember(byName: Map<string, RankingMember>, member: RankingMember) {
  const name = String(member.name || "").trim();
  if (!name) return;
  const current = byName.get(name) || { name, dailyPoints: 0, totalPoints: 0 };
  byName.set(name, {
    ...current,
    ...member,
    name,
    dailyPoints: Number(member.dailyPoints ?? current.dailyPoints ?? 0),
    totalPoints: Number(member.totalPoints ?? current.totalPoints ?? 0),
  });
}

function parseRankingText(html: string): RankingMember[] {
  const fromFlight = parseNextFlightRanking(html);
  if (fromFlight.length) return fromFlight;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  const fromVisibleText = parseVisibleRankingText(text);
  if (fromVisibleText.length) return fromVisibleText;

  const members: RankingMember[] = [];
  const linePattern = /(?:#|第)?\s*(\d{1,3})\s*(?:位|rank)?\s+([^\n\r\d]{2,40}?)\s+(\d{1,7})\s*(?:pt|ポイント|XP)/gi;
  for (const match of text.matchAll(linePattern)) {
    const rank = Number(match[1]);
    const name = match[2].trim();
    const points = Number(match[3]);
    if (!name || !Number.isFinite(points)) continue;
    members.push({
      name,
      dailyPoints: points,
      totalPoints: points,
      dailyRank: rank,
      totalRank: rank,
    });
  }
  return members;
}

function parseVisibleRankingText(text: string): RankingMember[] {
  const members: RankingMember[] = [];
  const pattern = /【[^】]+】\s*([^\n\r]+?)\s*(?:\(あなた\))?\s*[\r\n\s]+([\d,]+)\s*XP/gi;
  for (const match of text.matchAll(pattern)) {
    const name = match[1].trim();
    const points = Number(match[2].replace(/,/g, ""));
    if (!name || !Number.isFinite(points)) continue;
    members.push({
      name,
      dailyPoints: points,
      totalPoints: points,
      dailyRank: members.length + 1,
      totalRank: members.length + 1,
    });
  }
  return members;
}

function parseNextFlightRanking(html: string): RankingMember[] {
  const normalized = html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">");

  const members: RankingMember[] = [];
  const pattern = /"name"\s*:\s*"([^"]+)"[\s\S]{0,700}?"xp"\s*:\s*(\d{1,8})/g;
  for (const match of normalized.matchAll(pattern)) {
    const name = match[1].trim();
    const points = Number(match[2]);
    if (!name || !Number.isFinite(points)) continue;
    members.push({ name, dailyPoints: points, totalPoints: points });
  }

  const unique = new Map<string, RankingMember>();
  for (const member of members) {
    const key = `${member.name}:${member.totalPoints}`;
    if (!unique.has(key)) unique.set(key, member);
  }
  return [...unique.values()];
}

function getTargetMembers(options: AiDrillRankingOptions) {
  const configuredTargets = options.targetMembers || process.env.LEVELA_AI_DRILL_TARGET_MEMBERS;
  if (!configuredTargets) return DEFAULT_TARGET_MEMBERS;

  return configuredTargets
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function sameName(target: string, actual: string) {
  return normalizeName(target) === normalizeName(actual);
}

function normalizeName(name: string) {
  return name
    .replace(/【[^】]+】/g, "")
    .replace(/\(あなた\)/g, "")
    .replace(/[()（）]/g, "")
    .replace(/[\s　]+/g, "")
    .toLowerCase();
}

function getRoundLabel(options: AiDrillRankingOptions) {
  const startDate = options.roundStartDate || process.env.LEVELA_AI_DRILL_ROUND_START_DATE;
  const startRound = Number(options.roundStart || process.env.LEVELA_AI_DRILL_ROUND_START || "9");
  if (!startDate || !Number.isFinite(startRound)) {
    return `第${Number.isFinite(startRound) ? startRound : 9}回`;
  }

  const today = new Date();
  const start = new Date(`${startDate}T00:00:00+09:00`);
  const diffDays = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
  return `第${startRound + diffDays}回`;
}

function buildRankingSummary(title: string, members: RankingMember[]) {
  const daily = [...members]
    .sort((a, b) => (b.dailyPoints || 0) - (a.dailyPoints || 0))
    .slice(0, 12)
    .map((member, index) => `${member.dailyRank ?? index + 1}. ${member.name} ${member.dailyPoints}pt`)
    .join("\n");

  const total = [...members]
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .slice(0, 12)
    .map((member, index) => `${member.totalRank ?? index + 1}. ${member.name} ${member.totalPoints}pt`)
    .join("\n");

  return [title, "", "デイリーランキング", daily || "対象データなし", "", "総合ポイントランキング", total || "対象データなし"].join("\n");
}
