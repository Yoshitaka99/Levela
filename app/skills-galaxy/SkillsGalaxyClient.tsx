"use client";

import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GalaxyCanvas, type FocusRequest } from "./GalaxyCanvas";
import { mergeObsidianNotes, parseObsidianMarkdown } from "./obsidianImport";
import { loadGalaxyData, parseGalaxyData, saveGalaxyData } from "./storage";
import { loadSyncKey, pullFromCloud, pushToCloud, saveSyncKey } from "./sync";
import { FALLBACK_COLOR, pickCategoryColor, type GalaxyData, type Skill } from "./types";

type SyncStatus = "off" | "saving" | "saved" | "pulling" | "error" | "not-configured";

const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  off: "未接続",
  saving: "クラウドへ保存中…",
  saved: "クラウドと同期済み ✓",
  pulling: "クラウドから取得中…",
  error: "同期エラー(通信を確認してください)",
  "not-configured": "サーバー側が未設定です(Upstash Redis の環境変数が必要)",
};

type FormState = {
  id: string | null; // null = 新規作成
  name: string;
  category: string;
  level: number;
  description: string;
  links: string[];
};

const emptyForm = (): FormState => ({
  id: null,
  name: "",
  category: "",
  level: 3,
  description: "",
  links: [],
});

const panelClass =
  "rounded-2xl border border-white/10 bg-slate-950/70 shadow-[0_0_40px_rgba(56,89,199,0.15)] backdrop-blur-xl";

export function SkillsGalaxyClient() {
  const [data, setData] = useState<GalaxyData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncKey, setSyncKey] = useState("");
  const [syncKeyInput, setSyncKeyInput] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("off");
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const obsidianInputRef = useRef<HTMLInputElement | null>(null);
  const skipNextPushRef = useRef(false);

  useEffect(() => {
    // ハイドレーション完了後に localStorage から読み込む
    const id = requestAnimationFrame(() => {
      setData(loadGalaxyData());
      const key = loadSyncKey();
      setSyncKey(key);
      setSyncKeyInput(key);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // クラウドから受け取ったデータを反映する(直後の自動プッシュは抑止)
  const applyCloudData = useCallback((cloud: GalaxyData) => {
    skipNextPushRef.current = true;
    setData(cloud);
  }, []);

  // 起動時: 同期コードが設定されていればクラウドの新しいデータを取り込む
  const initialPullDoneRef = useRef(false);
  useEffect(() => {
    if (!data || !syncKey || initialPullDoneRef.current) return;
    initialPullDoneRef.current = true;
    let cancelled = false;
    (async () => {
      setSyncStatus("pulling");
      const result = await pullFromCloud(syncKey);
      if (cancelled) return;
      if (result.status !== "ok") {
        setSyncStatus(result.status);
        return;
      }
      const cloud = result.data;
      const localSavedAt = data.savedAt ?? "";
      if (cloud && (cloud.savedAt ?? "") > localSavedAt) {
        applyCloudData(cloud);
        setNotice("クラウドの最新データを読み込みました");
      }
      setSyncStatus("saved");
    })();
    return () => {
      cancelled = true;
    };
  }, [data, syncKey, applyCloudData]);

  // データ変更後に自動でクラウドへ保存(1.5秒デバウンス)
  useEffect(() => {
    if (!data || !syncKey) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (!data.savedAt) return; // まだローカル変更が入っていない初期状態
    const timer = setTimeout(async () => {
      setSyncStatus("saving");
      const result = await pushToCloud(syncKey, data);
      setSyncStatus(result.status === "ok" ? "saved" : result.status);
    }, 1500);
    return () => clearTimeout(timer);
  }, [data, syncKey]);

  useEffect(() => {
    if (data) saveGalaxyData(data);
  }, [data]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const skills = useMemo(() => data?.skills ?? [], [data]);
  const categoryColors = data?.categoryColors ?? {};

  // すべてのローカル変更はここを通して savedAt を更新する(クラウド同期の新旧判定用)
  const commitData = (next: GalaxyData) => {
    setData({ ...next, savedAt: new Date().toISOString() });
  };

  const links = useMemo<Array<[string, string]>>(() => {
    const ids = new Set(skills.map((s) => s.id));
    const seen = new Set<string>();
    const result: Array<[string, string]> = [];
    for (const skill of skills) {
      for (const target of skill.links) {
        if (!ids.has(target) || target === skill.id) continue;
        const key = skill.id < target ? `${skill.id}|${target}` : `${target}|${skill.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push([skill.id, target]);
      }
    }
    return result;
  }, [skills]);

  const categories = useMemo(() => {
    const names = new Set<string>(skills.map((s) => s.category));
    return Array.from(names);
  }, [skills]);

  const dimmedIds = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query && !activeCategory) return null;
    const dimmed = new Set<string>();
    for (const skill of skills) {
      const matchesQuery =
        !query ||
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.category.toLowerCase().includes(query);
      const matchesCategory = !activeCategory || skill.category === activeCategory;
      if (!matchesQuery || !matchesCategory) dimmed.add(skill.id);
    }
    return dimmed;
  }, [skills, search, activeCategory]);

  const searchHits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return skills
      .filter((s) => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query))
      .slice(0, 6);
  }, [skills, search]);

  const selected = skills.find((s) => s.id === selectedId) ?? null;

  const skillById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  const relatedOf = (skill: Skill): Skill[] => {
    const ids = new Set<string>(skill.links);
    for (const other of skills) {
      if (other.links.includes(skill.id)) ids.add(other.id);
    }
    ids.delete(skill.id);
    return Array.from(ids)
      .map((id) => skillById.get(id))
      .filter((s): s is Skill => Boolean(s));
  };

  const selectSkill = (id: string | null, focus = false) => {
    setSelectedId(id);
    setConfirmDelete(false);
    setForm(null);
    if (id && focus) setFocusRequest({ id, nonce: Date.now() });
  };

  const openCreate = () => {
    setSelectedId(null);
    setConfirmDelete(false);
    setForm({ ...emptyForm(), category: activeCategory ?? categories[0] ?? "" });
  };

  const openEdit = (skill: Skill) => {
    setForm({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      level: skill.level,
      description: skill.description,
      links: [...skill.links],
    });
    setConfirmDelete(false);
  };

  const submitForm = () => {
    if (!data || !form) return;
    const name = form.name.trim();
    const category = form.category.trim() || "未分類";
    if (!name) {
      setNotice("スキル名を入力してください");
      return;
    }
    const now = new Date().toISOString();
    const categoryColors = { ...data.categoryColors };
    if (!categoryColors[category]) {
      categoryColors[category] = pickCategoryColor(categoryColors);
    }
    if (form.id === null) {
      const skill: Skill = {
        id: nanoid(10),
        name,
        category,
        level: form.level,
        description: form.description.trim(),
        links: form.links,
        createdAt: now,
        updatedAt: now,
      };
      commitData({ ...data, categoryColors, skills: [...data.skills, skill] });
      setSelectedId(skill.id);
      setFocusRequest({ id: skill.id, nonce: Date.now() });
      setNotice(`「${name}」を銀河に追加しました`);
    } else {
      commitData({
        ...data,
        categoryColors,
        skills: data.skills.map((s) =>
          s.id === form.id
            ? { ...s, name, category, level: form.level, description: form.description.trim(), links: form.links, updatedAt: now }
            : s,
        ),
      });
      setSelectedId(form.id);
      setNotice(`「${name}」を更新しました`);
    }
    setForm(null);
  };

  const deleteSkill = (id: string) => {
    if (!data) return;
    const target = skillById.get(id);
    commitData({
      ...data,
      skills: data.skills
        .filter((s) => s.id !== id)
        .map((s) => (s.links.includes(id) ? { ...s, links: s.links.filter((l) => l !== id) } : s)),
    });
    setSelectedId(null);
    setConfirmDelete(false);
    if (target) setNotice(`「${target.name}」を削除しました`);
  };

  const toggleLink = (skillId: string, targetId: string) => {
    if (!data || skillId === targetId) return;
    commitData({
      ...data,
      skills: data.skills.map((s) => {
        if (s.id !== skillId) return s;
        const has = s.links.includes(targetId);
        return {
          ...s,
          links: has ? s.links.filter((l) => l !== targetId) : [...s.links, targetId],
          updatedAt: new Date().toISOString(),
        };
      }),
    });
  };

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `skill-galaxy-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("JSONをエクスポートしました");
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseGalaxyData(JSON.parse(String(reader.result)));
        if (!parsed) {
          setNotice("読み込めない形式のJSONです");
          return;
        }
        commitData(parsed);
        setSelectedId(null);
        setForm(null);
        setNotice(`${parsed.skills.length} 件のスキルを読み込みました`);
      } catch {
        setNotice("JSONの解析に失敗しました");
      }
    };
    reader.readAsText(file);
  };

  const importObsidian = async (files: FileList) => {
    if (!data) return;
    const mdFiles = Array.from(files).filter((f) => /\.(md|markdown)$/i.test(f.name));
    if (mdFiles.length === 0) {
      setNotice("Markdownファイル(.md)を選択してください");
      return;
    }
    const notes = await Promise.all(
      mdFiles.map(async (file) => parseObsidianMarkdown(file.name, await file.text())),
    );
    const result = mergeObsidianNotes(data, notes);
    commitData(result.data);
    setSelectedId(null);
    setForm(null);
    setNotice(`Obsidianから ${result.added} 件追加・${result.updated} 件更新しました`);
  };

  const connectSync = async () => {
    const key = syncKeyInput.trim();
    if (key.length < 4) {
      setNotice("同期コードは4文字以上にしてください");
      return;
    }
    setSyncStatus("pulling");
    const result = await pullFromCloud(key);
    if (result.status !== "ok") {
      setSyncStatus(result.status);
      return;
    }
    setSyncKey(key);
    saveSyncKey(key);
    initialPullDoneRef.current = true;
    if (result.data && result.data.skills.length > 0) {
      applyCloudData(result.data);
      setNotice(`クラウドから ${result.data.skills.length} 件のスキルを読み込みました`);
      setSyncStatus("saved");
    } else if (data) {
      // クラウドが空なら今のデータを最初の内容として保存する
      const stamped = { ...data, savedAt: new Date().toISOString() };
      applyCloudData(stamped);
      const pushed = await pushToCloud(key, stamped);
      setSyncStatus(pushed.status === "ok" ? "saved" : pushed.status);
      if (pushed.status === "ok") setNotice("この銀河をクラウドに保存しました");
    }
  };

  const disconnectSync = () => {
    setSyncKey("");
    saveSyncKey("");
    setSyncStatus("off");
    setNotice("クラウド同期を解除しました(データはこの端末に残ります)");
  };

  if (!data) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#04040f] text-sm text-slate-400">
        銀河を読み込み中…
      </div>
    );
  }

  const linkableSkills = (current: FormState | Skill) =>
    skills.filter((s) => s.id !== ("id" in current ? current.id : null));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#04040f] text-slate-100">
      <GalaxyCanvas
        skills={skills}
        links={links}
        categoryColors={categoryColors}
        selectedId={selectedId}
        dimmedIds={dimmedIds}
        focusRequest={focusRequest}
        onSelect={(id) => selectSkill(id)}
      />

      {/* ヘッダー */}
      <div className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-6">
        <h1 className="bg-gradient-to-r from-sky-300 via-violet-300 to-rose-300 bg-clip-text text-2xl font-bold tracking-widest text-transparent sm:text-3xl">
          SKILL GALAXY
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          スキルの銀河 — {skills.length} planets ・ {links.length} orbits ・ {categories.length} systems
        </p>
      </div>

      {/* 検索・操作 */}
      <div className="absolute right-4 top-4 flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2 sm:right-6 sm:top-6">
        <div className={`${panelClass} flex items-center gap-2 px-3 py-2`}>
          <span className="text-slate-500">🔭</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="スキルを探索…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-300">
              ×
            </button>
          )}
        </div>
        {searchHits.length > 0 && (
          <div className={`${panelClass} overflow-hidden py-1`}>
            {searchHits.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  selectSkill(s.id, true);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/5"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: categoryColors[s.category] ?? FALLBACK_COLOR }}
                />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-500">{s.category}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={openCreate}
            className="flex-1 rounded-xl border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-200 backdrop-blur-xl transition hover:bg-sky-500/30"
          >
            ＋ スキルを追加
          </button>
          <button
            onClick={exportJson}
            title="JSONエクスポート"
            className={`${panelClass} px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10`}
          >
            ⬇
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="JSONインポート"
            className={`${panelClass} px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10`}
          >
            ⬆
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importJson(file);
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => obsidianInputRef.current?.click()}
            title="Obsidianのmdファイルを取り込み"
            className={`${panelClass} flex-1 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10`}
          >
            📥 Obsidian取込
          </button>
          <button
            onClick={() => setShowSyncPanel((v) => !v)}
            className={`${panelClass} flex-1 px-3 py-2 text-xs transition hover:bg-white/10 ${
              syncKey ? "text-emerald-300" : "text-slate-300"
            }`}
          >
            ☁ 同期{syncKey ? "中" : ""}
          </button>
          <input
            ref={obsidianInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) importObsidian(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {showSyncPanel && (
          <div className={`${panelClass} flex flex-col gap-2 p-3`}>
            <p className="text-xs font-medium text-slate-300">クラウド同期</p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              同じ同期コードを入れた端末同士で銀河を共有できます。コードは合い言葉なので推測されにくいものに。
            </p>
            <input
              value={syncKeyInput}
              onChange={(e) => setSyncKeyInput(e.target.value)}
              placeholder="同期コード(4文字以上)"
              className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50"
            />
            <div className="flex gap-2">
              <button
                onClick={connectSync}
                className="flex-1 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-500/30"
              >
                {syncKey ? "再接続" : "接続する"}
              </button>
              {syncKey && (
                <button
                  onClick={disconnectSync}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                >
                  解除
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">状態: {SYNC_STATUS_LABEL[syncStatus]}</p>
          </div>
        )}
      </div>

      {/* カテゴリ(星系)フィルタ */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3 sm:bottom-6 sm:left-6 sm:right-6">
        <div className="flex max-w-full flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full border px-3 py-1 text-xs backdrop-blur-xl transition ${
              activeCategory === null
                ? "border-white/40 bg-white/15 text-white"
                : "border-white/10 bg-slate-950/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            すべて
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs backdrop-blur-xl transition ${
                activeCategory === cat
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-slate-950/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: categoryColors[cat] ?? FALLBACK_COLOR }}
              />
              {cat}
            </button>
          ))}
        </div>
        <p className="hidden text-[11px] text-slate-600 sm:block">
          ドラッグ: 移動 ／ ホイール: ズーム ／ 惑星クリック: 詳細
        </p>
      </div>

      {/* 通知 */}
      {notice && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-1.5 text-xs text-slate-200 backdrop-blur-xl">
          {notice}
        </div>
      )}

      {/* 詳細 / 編集パネル */}
      {(selected || form) && (
        <div
          className={`${panelClass} absolute bottom-16 right-4 top-32 w-[min(340px,calc(100vw-2rem))] overflow-y-auto p-5 sm:right-6 sm:top-36`}
        >
          {form ? (
            <FormPanel
              form={form}
              setForm={setForm}
              categories={categories}
              categoryColors={categoryColors}
              linkables={linkableSkills(form)}
              onSubmit={submitForm}
              onCancel={() => setForm(null)}
            />
          ) : selected ? (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: categoryColors[selected.category] ?? FALLBACK_COLOR,
                      boxShadow: `0 0 12px ${categoryColors[selected.category] ?? FALLBACK_COLOR}`,
                    }}
                  />
                  <span className="text-xs text-slate-400">{selected.category}</span>
                  <button
                    onClick={() => selectSkill(null)}
                    className="ml-auto text-slate-500 hover:text-slate-300"
                  >
                    ×
                  </button>
                </div>
                <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
                <div className="mt-2 flex items-center gap-1" title={`レベル ${selected.level}`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: i < selected.level ? 18 : 10,
                        backgroundColor:
                          i < selected.level
                            ? categoryColors[selected.category] ?? FALLBACK_COLOR
                            : "rgba(148,163,184,0.25)",
                      }}
                    />
                  ))}
                  <span className="ml-2 text-xs text-slate-400">Lv.{selected.level}</span>
                </div>
              </div>

              {selected.description && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {selected.description}
                </p>
              )}

              <div>
                <h3 className="mb-2 text-xs font-medium tracking-wider text-slate-500">
                  関連スキル(軌道)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {relatedOf(selected).map((rel) => (
                    <button
                      key={rel.id}
                      onClick={() => selectSkill(rel.id, true)}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-white/10"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: categoryColors[rel.category] ?? FALLBACK_COLOR }}
                      />
                      {rel.name}
                    </button>
                  ))}
                  {relatedOf(selected).length === 0 && (
                    <p className="text-xs text-slate-600">まだ軌道がありません</p>
                  )}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) toggleLink(selected.id, e.target.value);
                  }}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-300 outline-none"
                >
                  <option value="">＋ 軌道をつなぐ…</option>
                  {linkableSkills(selected)
                    .filter((s) => !relatedOf(selected).some((r) => r.id === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}({s.category})
                      </option>
                    ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-600">
                更新: {new Date(selected.updatedAt).toLocaleDateString("ja-JP")}
              </p>

              <div className="mt-auto flex gap-2 pt-2">
                <button
                  onClick={() => openEdit(selected)}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
                >
                  編集
                </button>
                {confirmDelete ? (
                  <>
                    <button
                      onClick={() => deleteSkill(selected.id)}
                      className="flex-1 rounded-xl border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-500/30"
                    >
                      本当に削除
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
                    >
                      戻る
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300/80 transition hover:bg-rose-500/20"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FormPanel({
  form,
  setForm,
  categories,
  categoryColors,
  linkables,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  setForm: (f: FormState | null) => void;
  categories: string[];
  categoryColors: Record<string, string>;
  linkables: Skill[];
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-slate-300">
          {form.id ? "スキルを編集" : "新しい惑星を追加"}
        </h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300">
          ×
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        スキル名 *
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="例: プレゼンテーション"
          className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50"
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        カテゴリ(星系)
        <input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="例: 営業(新規カテゴリも入力可)"
          list="skill-galaxy-categories"
          className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50"
        />
        <datalist id="skill-galaxy-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {form.category && categoryColors[form.category] === undefined && (
          <span className="text-[11px] text-violet-300/80">✦ 新しい星系が生まれます</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        レベル(惑星の大きさ): {form.level}
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={form.level}
          onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
          className="accent-sky-400"
        />
        <span className="flex justify-between text-[10px] text-slate-600">
          <span>小惑星</span>
          <span>巨大惑星</span>
        </span>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        メモ・説明
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          placeholder="このスキルについてのメモ"
          className="resize-none rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50"
        />
      </label>

      <div className="flex flex-col gap-1 text-xs text-slate-400">
        関連スキル(軌道でつなぐ)
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/50 p-2">
          {linkables.length === 0 && <span className="text-slate-600">他のスキルがありません</span>}
          {linkables.map((s) => {
            const active = form.links.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    links: active ? form.links.filter((l) => l !== s.id) : [...form.links, s.id],
                  })
                }
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
                  active
                    ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: categoryColors[s.category] ?? FALLBACK_COLOR }}
                />
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSubmit}
          className="flex-1 rounded-xl border border-sky-400/40 bg-sky-500/25 px-3 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/35"
        >
          {form.id ? "保存する" : "銀河に追加"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
