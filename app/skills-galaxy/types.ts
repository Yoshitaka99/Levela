export type Skill = {
  id: string;
  name: string;
  category: string;
  level: number; // 1〜5(惑星の大きさに反映)
  description: string;
  links: string[]; // 関連スキルの id
  createdAt: string;
  updatedAt: string;
};

export type GalaxyData = {
  version: 1;
  skills: Skill[];
  categoryColors: Record<string, string>;
  savedAt?: string; // クラウド同期の新旧比較に使う
};

export const CATEGORY_PALETTE = [
  "#60a5fa", // blue
  "#c084fc", // purple
  "#fbbf24", // amber
  "#fb7185", // rose
  "#34d399", // emerald
  "#22d3ee", // cyan
  "#f472b6", // pink
  "#a3e635", // lime
  "#fb923c", // orange
  "#818cf8", // indigo
] as const;

export const FALLBACK_COLOR = "#94a3b8";

export function pickCategoryColor(used: Record<string, string>): string {
  const usedColors = new Set(Object.values(used));
  const free = CATEGORY_PALETTE.find((c) => !usedColors.has(c));
  return free ?? CATEGORY_PALETTE[Object.keys(used).length % CATEGORY_PALETTE.length];
}
