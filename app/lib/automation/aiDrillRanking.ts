import { postDiscordResult } from "./discord";
import { renderAiDrillRankingImages } from "./renderImage";
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
  discordThreadId?: string;
  rankingJsonUrl?: string;
  rankingCookie?: string;
  rankingAuthorization?: string;
  targetMembers?: string;
  roundStart?: string | number;
  roundStartDate?: string;
  phase?: string | number;
  dayStart?: string | number;
  gitDaysLeft?: string | number;
  skipDiscordPost?: boolean;
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

  const meta = getPhaseMeta(options);
  const title = `PHASE${meta.phase} ${meta.day}日目 AIドリルランキング`;
  const dailyRanking = buildDailyRanking(filteredMembers);
  const totalRanking = buildTotalRanking(filteredMembers);
  const summary = buildRankingAnnouncement(meta, dailyRanking, totalRanking);
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-ai-drill`;
  const images = await renderAiDrillRankingImages({
    id,
    phase: meta.phase,
    day: meta.day,
    gitDaysLeft: meta.gitDaysLeft,
    daily: dailyRanking.map((member, index) => ({
      name: member.name,
      points: member.dailyPoints,
      rank: member.dailyRank ?? index + 1,
    })),
    total: totalRanking.map((member, index) => ({
      name: member.name,
      points: member.totalPoints,
      rank: member.totalRank ?? index + 1,
    })),
  });

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
    imagePath: images.primary.imagePath,
    imageUrl: images.primary.imageUrl,
    imageDataUrl: images.primary.imageDataUrl,
    usedAiImage: images.primary.usedAiImage,
    extraImages: images.extraImages,
  };

  if (!options.skipDiscordPost) {
    await postDiscordResult(result, options.discordWebhookUrl, options.discordThreadId);
  }
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

function getPhaseMeta(options: AiDrillRankingOptions) {
  const startDate = options.roundStartDate || process.env.LEVELA_AI_DRILL_ROUND_START_DATE;
  const phase = Number(options.phase || process.env.LEVELA_AI_DRILL_PHASE || "2");
  const dayStart = Number(options.dayStart || options.roundStart || process.env.LEVELA_AI_DRILL_DAY_START || process.env.LEVELA_AI_DRILL_ROUND_START || "8");
  const gitDaysLeft = Number(options.gitDaysLeft || process.env.LEVELA_AI_DRILL_GIT_DAYS_LEFT || "4");
  if (!startDate || !Number.isFinite(dayStart)) {
    return {
      phase: Number.isFinite(phase) ? phase : 2,
      day: Number.isFinite(dayStart) ? dayStart : 8,
      gitDaysLeft: Number.isFinite(gitDaysLeft) ? gitDaysLeft : 4,
    };
  }

  const today = new Date();
  const start = new Date(`${startDate}T00:00:00+09:00`);
  const diffDays = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
  return {
    phase: Number.isFinite(phase) ? phase : 2,
    day: dayStart + diffDays,
    gitDaysLeft: Math.max(0, (Number.isFinite(gitDaysLeft) ? gitDaysLeft : 4) - diffDays),
  };
}

function buildDailyRanking(members: RankingMember[]) {
  return [...members]
    .sort((a, b) => (b.dailyPoints || 0) - (a.dailyPoints || 0))
    .map((member, index) => ({ ...member, dailyRank: member.dailyRank ?? index + 1 }));
}

function buildTotalRanking(members: RankingMember[]) {
  return [...members]
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .map((member, index) => ({ ...member, totalRank: member.totalRank ?? index + 1 }));
}

function buildRankingAnnouncement(
  meta: { phase: number; day: number; gitDaysLeft: number },
  dailyRanking: RankingMember[],
  totalRanking: RankingMember[],
) {
  const top3 = totalRanking.slice(0, 3);
  const dailyMvp = dailyRanking[0];
  const growthMembers = dailyRanking.filter((member) => member.dailyPoints > 0).slice(1, 4);
  const under1200 = totalRanking.filter((member) => member.totalPoints < 1200);

  return [
    `# 👹🔥《PHASE${meta.phase}｜${meta.day}日目ランキング速報》🔥👹`,
    "",
    "@snsclub営業メンバー",
    "",
    `PHASE${meta.phase}、`,
    "どんどん熱くなってきてます🔥🔥🔥",
    "",
    "まずは皆さん、",
    "本当にナイス積み上げです👏",
    "",
    "━━━━━━━━━━━━━━━",
    "",
    "# 👑 総合ランキング TOP3",
    "",
    ...top3.map((member, index) => `${["🥇", "🥈", "🥉"][index]} ${member.name}　${member.totalPoints.toLocaleString()}XP`),
    "",
    top3.some((member) => member.totalPoints >= 3000) ? "3000XP超えメンバーが出ています🔥" : "TOP3の積み上げがどんどん厚くなっています🔥",
    "",
    "ここまで積み上げてきた努力、",
    "本当に素晴らしいです🔥",
    "",
    "━━━━━━━━━━━━━━━",
    "",
    `# 🚀 本日のMVPは${dailyMvp?.name || "対象メンバー"}さん！！`,
    "",
    `🔥 +${(dailyMvp?.dailyPoints || 0).toLocaleString()}XP 🔥`,
    "",
    "今回のデイリーランキング1位👑",
    "",
    "勢いが止まりません🔥",
    "",
    "━━━━━━━━━━━━━━━",
    "",
    "# 👹 今日大きく伸びたメンバー！！！",
    "",
    growthMembers.length
      ? growthMembers.map((member) => `🔥 ${member.name}　+${member.dailyPoints.toLocaleString()}XP`).join("\n")
      : "今日は全員、次の一歩へ向けて力をためる日です🔥",
    "",
    "最初の頃と比べると",
    "本当に別人レベルです🔥",
    "",
    "━━━━━━━━━━━━━━━",
    "",
    "# 📈 皆、本当に成長してます。",
    "",
    "数日前まで小さな一歩だった積み上げが、",
    "今では確実にランキングを動かしています。",
    "",
    "これは本当に凄いことです👏",
    "",
    "━━━━━━━━━━━━━━━",
    "",
    "# ⚔️ この行動力は必ずアポの成果に繋がる ⚔️",
    "",
    "AIドリルを継続できる人は",
    "",
    "✅ 行動できる",
    "✅ 修正できる",
    "✅ 継続できる",
    "✅ 改善できる",
    "",
    "人です。",
    "",
    "つまり営業で結果を出す人の特徴そのもの🔥",
    "",
    "今積み上げていることは、",
    "必ず未来のアポ・成約・成果に繋がります👹",
    "",
    under1200.length ? "━━━━━━━━━━━━━━━" : "",
    under1200.length ? "" : "",
    under1200.length ? "# ⚡ 1200XP未満メンバーもここから！！！" : "",
    under1200.length ? "" : "",
    under1200.length ? `${under1200.map((member) => member.name).join("、")}、ここから一気に巻き返せます🔥` : "",
    under1200.length ? "PHASE2はまだ始まったばかり。積み上げた人から景色が変わります👹" : "",
    under1200.length ? "" : "",
    "━━━━━━━━━━━━━━━",
    "",
    `# 🔥 Git編終了まであと${meta.gitDaysLeft}日！！！🔥`,
    "",
    `ここからの${meta.gitDaysLeft}日で`,
    "順位はまだまだ変わります⚡️",
    "",
    "最後まで積み上げた人が勝つ。",
    "",
    `PHASE${meta.phase}、`,
    "最後まで駆け抜けましょう👹🔥",
    "",
    "━━━━━━━━━━━━━━━",
    "",
    "# 🌅 そして！！！",
    "",
    "朝のAIドリル勉強会、",
    "みんな参加してくれよな！！🔥🔥🔥",
    "",
    "参加するだけでも学びになります。",
    "",
    "積み上げる人同士で刺激し合って、",
    "さらに強くなっていきましょう👹⚔️",
    "",
    "明日も全力でいくぞーーーーー！！！！🔥🔥🔥",
  ].join("\n");
}
