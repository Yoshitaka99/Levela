import { nanoid } from "nanoid";
import type { GalaxyData, Skill } from "./types";
import { pickCategoryColor } from "./types";

export type ParsedNote = {
  name: string;
  category: string | null;
  level: number | null;
  description: string;
  linkNames: string[];
};

/** frontmatter の `key: value` を素朴に読む(YAML完全対応はしない) */
function parseFrontmatter(block: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const rawLine of block.split("\n")) {
    const listItem = rawLine.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey) {
      const arr = Array.isArray(result[listKey]) ? (result[listKey] as string[]) : [];
      arr.push(listItem[1].trim().replace(/^["']|["']$/g, ""));
      result[listKey] = arr;
      continue;
    }
    const match = rawLine.match(/^([\w-]+|[^\s:]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (!value) {
      listKey = key;
      result[key] = [];
      continue;
    }
    listKey = null;
    if (value.startsWith("[") && value.endsWith("]")) {
      result[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["'#]|["']$/g, ""))
        .filter(Boolean);
    } else {
      result[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return result;
}

function firstString(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const s = Array.isArray(value) ? value[0] : value;
  return s ? s.replace(/^#/, "").trim() || null : null;
}

/** Obsidian の Markdown ノート1件をスキル候補に変換する */
export function parseObsidianMarkdown(fileName: string, content: string): ParsedNote {
  const name = fileName.replace(/\.(md|markdown)$/i, "").trim();
  let body = content;
  let meta: Record<string, string | string[]> = {};

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    meta = parseFrontmatter(fmMatch[1]);
    body = content.slice(fmMatch[0].length);
  }

  const linkNames = new Set<string>();
  for (const match of body.matchAll(/\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|[^\]\n]*)?\]\]/g)) {
    const target = match[1].trim();
    // "folder/Note" 形式はノート名部分だけを使う
    const base = target.split("/").pop()?.trim();
    if (base && base !== name) linkNames.add(base);
  }

  const category =
    firstString(meta["category"]) ??
    firstString(meta["カテゴリ"]) ??
    firstString(meta["tags"]) ??
    firstString(meta["tag"]) ??
    null;

  const levelRaw = firstString(meta["level"]) ?? firstString(meta["レベル"]);
  const levelNum = levelRaw ? Number(levelRaw) : NaN;
  const level = Number.isFinite(levelNum) ? Math.min(5, Math.max(1, Math.round(levelNum))) : null;

  const description = body
    .replace(/\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?\|([^\]\n]+)\]\]/g, "$2")
    .replace(/\[\[([^\]\n]+)\]\]/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 300)
    .trim();

  return { name, category, level, description, linkNames: Array.from(linkNames) };
}

export type ObsidianMergeResult = {
  data: GalaxyData;
  added: number;
  updated: number;
};

/** パース済みノート群を既存の銀河へマージする(名前一致で更新) */
export function mergeObsidianNotes(data: GalaxyData, notes: ParsedNote[]): ObsidianMergeResult {
  const now = new Date().toISOString();
  const skills = data.skills.map((s) => ({ ...s, links: [...s.links] }));
  const categoryColors = { ...data.categoryColors };
  const byName = new Map(skills.map((s) => [s.name, s]));
  let added = 0;
  let updated = 0;

  const ensureCategory = (category: string) => {
    if (!categoryColors[category]) {
      categoryColors[category] = pickCategoryColor(categoryColors);
    }
  };

  // 1周目: スキル本体を追加・更新
  for (const note of notes) {
    if (!note.name) continue;
    const existing = byName.get(note.name);
    if (existing) {
      existing.category = note.category ?? existing.category;
      existing.level = note.level ?? existing.level;
      existing.description = note.description || existing.description;
      existing.updatedAt = now;
      ensureCategory(existing.category);
      updated += 1;
    } else {
      const category = note.category ?? "Obsidian";
      ensureCategory(category);
      const skill: Skill = {
        id: nanoid(10),
        name: note.name,
        category,
        level: note.level ?? 3,
        description: note.description,
        links: [],
        createdAt: now,
        updatedAt: now,
      };
      skills.push(skill);
      byName.set(skill.name, skill);
      added += 1;
    }
  }

  // 2周目: [[リンク]] を id に解決して軌道をつなぐ
  for (const note of notes) {
    const source = byName.get(note.name);
    if (!source) continue;
    for (const linkName of note.linkNames) {
      const target = byName.get(linkName);
      if (!target || target.id === source.id) continue;
      if (!source.links.includes(target.id) && !target.links.includes(source.id)) {
        source.links.push(target.id);
      }
    }
  }

  return { data: { ...data, skills, categoryColors }, added, updated };
}
