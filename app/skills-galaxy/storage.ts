import type { GalaxyData, Skill } from "./types";

const STORAGE_KEY = "levela-skills-galaxy-v1";

const seedSkill = (
  id: string,
  name: string,
  category: string,
  level: number,
  description: string,
  links: string[] = [],
): Skill => ({
  id,
  name,
  category,
  level,
  description,
  links,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

export const SEED_DATA: GalaxyData = {
  version: 1,
  categoryColors: {
    営業: "#60a5fa",
    金融知識: "#34d399",
    AI活用: "#c084fc",
    マネジメント: "#fbbf24",
    マーケティング: "#fb7185",
  },
  skills: [
    seedSkill("s01", "ヒアリング", "営業", 4, "お客様の現状と想いを深掘りする質問力。", ["s06", "s02", "s05"]),
    seedSkill("s02", "クロージング", "営業", 3, "背中を押すひと言と決断のサポート。", ["s04"]),
    seedSkill("s03", "プレゼンテーション", "営業", 4, "伝わる構成と話し方で提案を届ける。", ["s19", "s15"]),
    seedSkill("s04", "応酬話法", "営業", 3, "反論・不安への切り返しパターン。"),
    seedSkill("s05", "紹介依頼", "営業", 2, "満足いただいたお客様から次の縁をつなぐ。"),
    seedSkill("s06", "ライフプラン設計", "金融知識", 5, "人生設計から逆算する資金計画の立案。", ["s07", "s08", "s10"]),
    seedSkill("s07", "生命保険知識", "金融知識", 4, "保障設計・商品比較の土台となる知識。"),
    seedSkill("s08", "資産運用知識", "金融知識", 3, "長期分散投資の基本と商品理解。", ["s09"]),
    seedSkill("s09", "NISA・iDeCo", "金融知識", 3, "税制優遇制度の使い分けと提案。"),
    seedSkill("s10", "税金・社会保障", "金融知識", 3, "公的制度を踏まえた最適な備えの提案。"),
    seedSkill("s11", "ChatGPT活用", "AI活用", 5, "日常業務にAIを組み込み生産性を上げる。", ["s12", "s15"]),
    seedSkill("s12", "プロンプト設計", "AI活用", 4, "狙った出力を引き出す指示の組み立て。", ["s13"]),
    seedSkill("s13", "業務自動化", "AI活用", 3, "定型作業をワークフロー化して手放す。", ["s14"]),
    seedSkill("s14", "データ分析", "AI活用", 3, "数字から示唆を読み取り行動につなげる。"),
    seedSkill("s15", "資料作成", "AI活用", 4, "AIを使った高速で伝わる資料づくり。", ["s03"]),
    seedSkill("s16", "チームビルディング", "マネジメント", 3, "強いチームをつくる仕組みと文化づくり。", ["s17"]),
    seedSkill("s17", "1on1コーチング", "マネジメント", 4, "メンバーの内発的動機を引き出す対話。", ["s18"]),
    seedSkill("s18", "目標設定", "マネジメント", 3, "逆算とKPI設計で行動を明確にする。"),
    seedSkill("s19", "セミナー登壇", "マーケティング", 4, "セミナーで価値を届けファンをつくる。", ["s03"]),
    seedSkill("s20", "SNS発信", "マーケティング", 3, "継続的な発信で認知と信頼を積み上げる。", ["s19", "s21"]),
    seedSkill("s21", "セミナー集客", "マーケティング", 2, "告知導線の設計と申込率の改善。"),
  ],
};

function isSkill(value: unknown): value is Skill {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.category === "string" &&
    typeof v.level === "number" &&
    Array.isArray(v.links)
  );
}

export function parseGalaxyData(raw: unknown): GalaxyData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (!Array.isArray(v.skills) || !v.skills.every(isSkill)) return null;
  const skills = (v.skills as Skill[]).map((s) => ({
    ...s,
    level: Math.min(5, Math.max(1, Math.round(s.level))),
    description: typeof s.description === "string" ? s.description : "",
    links: s.links.filter((l): l is string => typeof l === "string"),
    createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
    updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : new Date().toISOString(),
  }));
  const categoryColors =
    typeof v.categoryColors === "object" && v.categoryColors !== null
      ? Object.fromEntries(
          Object.entries(v.categoryColors as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {};
  return {
    version: 1,
    skills,
    categoryColors,
    savedAt: typeof v.savedAt === "string" ? v.savedAt : undefined,
  };
}

export function loadGalaxyData(): GalaxyData {
  if (typeof window === "undefined") return SEED_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_DATA;
    const parsed = parseGalaxyData(JSON.parse(raw));
    return parsed ?? SEED_DATA;
  } catch {
    return SEED_DATA;
  }
}

export function saveGalaxyData(data: GalaxyData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存失敗(容量超過など)は黙って無視する
  }
}
