"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Filter,
  Layers,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Tags,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toCsv } from "../lib/csv";
import {
  DEFAULT_SEGMENT_RULES,
  assignSegments,
  formatKeywordList,
  parseKeywordList,
} from "./segments";
import type { LstepTagsData, SegmentRule } from "./types";

type TabKey = "overview" | "tags" | "segments" | "extract" | "settings";

type Connection = {
  spreadsheetId: string;
  sheetName: string;
  range: string;
};

type ResolvedFriend = {
  rowNumber: number;
  name: string;
  registeredAt: string;
  source: string;
  status: string;
  tags: string[];
};

const CONNECTION_STORAGE_KEY = "lstep-tags:connection";
const RULES_STORAGE_KEY = "lstep-tags:rules";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "概要" },
  { key: "tags", label: "タグ一覧" },
  { key: "segments", label: "セグメント判定" },
  { key: "extract", label: "抽出" },
  { key: "settings", label: "設定" },
];

const DEFAULT_CONNECTION: Connection = {
  spreadsheetId: "",
  sheetName: "",
  range: "A1:CV5000",
};

function formatPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // Excel が UTF-8 と判定できるように BOM を付ける。
  const blob = new Blob([`﻿${toCsv(rows)}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createRuleId() {
  return `rule-${Math.random().toString(36).slice(2, 9)}`;
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{sub}</p>
    </div>
  );
}

function Bar({ ratio }: { ratio: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div
        className="h-2 rounded-full bg-teal-600"
        style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
      />
    </div>
  );
}

function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function LstepTagsClient() {
  const [connection, setConnection] = useState<Connection>(DEFAULT_CONNECTION);
  const [draftConnection, setDraftConnection] = useState<Connection>(DEFAULT_CONNECTION);
  const [rules, setRules] = useState<SegmentRule[]>(DEFAULT_SEGMENT_RULES);
  const [data, setData] = useState<LstepTagsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  const [tagQuery, setTagQuery] = useState("");
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);
  const [includeMode, setIncludeMode] = useState<"and" | "or">("and");
  const [sourceFilter, setSourceFilter] = useState("");
  const [nameQuery, setNameQuery] = useState("");

  useEffect(() => {
    try {
      const savedConnection = window.localStorage.getItem(CONNECTION_STORAGE_KEY);
      if (savedConnection) {
        const parsed = { ...DEFAULT_CONNECTION, ...JSON.parse(savedConnection) } as Connection;
        setConnection(parsed);
        setDraftConnection(parsed);
      }
      const savedRules = window.localStorage.getItem(RULES_STORAGE_KEY);
      if (savedRules) {
        const parsed = JSON.parse(savedRules) as SegmentRule[];
        if (Array.isArray(parsed) && parsed.length) setRules(parsed);
      }
    } catch {
      // 壊れた保存値は無視して初期値で続行する。
    }
    setHydrated(true);
  }, []);

  const load = useCallback(async (target: Connection) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (target.spreadsheetId) params.set("spreadsheetId", target.spreadsheetId);
      if (target.sheetName) params.set("sheet", target.sheetName);
      if (target.range) params.set("range", target.range);

      const response = await fetch(`/api/lstep-tags?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? `読み込みに失敗しました（HTTP ${response.status}）`);
      }
      setData(payload as LstepTagsData);
    } catch (caught) {
      setData(null);
      setError(caught instanceof Error ? caught.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void load(connection);
  }, [hydrated, connection, load]);

  useEffect(() => {
    if (error && !data) setTab("settings");
  }, [error, data]);

  const friends = useMemo<ResolvedFriend[]>(() => {
    if (!data) return [];
    return data.friends.map((friend) => ({
      rowNumber: friend.rowNumber,
      name: friend.name,
      registeredAt: friend.registeredAt,
      source: friend.source,
      status: friend.status,
      tags: friend.tagIds.map((id) => data.tagList[id] ?? ""),
    }));
  }, [data]);

  const segments = useMemo(() => assignSegments(friends, rules), [friends, rules]);

  const filteredTagStats = useMemo(() => {
    if (!data) return [];
    const needle = tagQuery.trim().toLowerCase();
    if (!needle) return data.tagStats;
    return data.tagStats.filter((stat) => stat.tag.toLowerCase().includes(needle));
  }, [data, tagQuery]);

  const extractedFriends = useMemo(() => {
    const needle = nameQuery.trim().toLowerCase();
    return friends.filter((friend) => {
      if (includeTags.length) {
        const matched = includeTags.filter((tag) => friend.tags.includes(tag));
        if (includeMode === "and" && matched.length !== includeTags.length) return false;
        if (includeMode === "or" && matched.length === 0) return false;
      }
      if (excludeTags.some((tag) => friend.tags.includes(tag))) return false;
      if (sourceFilter && (friend.source || "（未設定）") !== sourceFilter) return false;
      if (needle && !friend.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [friends, includeTags, includeMode, excludeTags, sourceFilter, nameQuery]);

  const saveConnection = () => {
    const next: Connection = {
      spreadsheetId: draftConnection.spreadsheetId.trim(),
      sheetName: draftConnection.sheetName.trim(),
      range: draftConnection.range.trim() || DEFAULT_CONNECTION.range,
    };
    window.localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(next));
    setConnection(next);
  };

  const persistRules = (next: SegmentRule[]) => {
    setRules(next);
    window.localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(next));
  };

  const updateRule = (id: string, patch: Partial<SegmentRule>) => {
    persistRules(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const moveRule = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rules.length) return;
    const next = [...rules];
    [next[index], next[target]] = [next[target], next[index]];
    persistRules(next);
  };

  const toggleTag = (list: string[], setList: (next: string[]) => void, tag: string) => {
    setList(list.includes(tag) ? list.filter((item) => item !== tag) : [...list, tag]);
  };

  const exportFriends = (rows: ResolvedFriend[], filename: string) => {
    downloadCsv(filename, [
      ["行番号", "名前", "登録日", "流入経路", "ステータス", "タグ数", "タグ"],
      ...rows.map((friend) => [
        friend.rowNumber,
        friend.name,
        friend.registeredAt,
        friend.source,
        friend.status,
        friend.tags.length,
        friend.tags.join(" / "),
      ]),
    ]);
  };

  const columnLabel = (index: number | null) => {
    if (index === null || !data) return "未検出";
    return data.columnMap.headers[index] || `列${index + 1}`;
  };

  return (
    <main className="min-h-screen bg-slate-200 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 lg:px-8">
        <header className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-slate-50 px-5 py-4 shadow-sm xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Lステップ連携</p>
            <h1 className="text-2xl font-semibold tracking-normal">タグ抽出・セグメント判定</h1>
            <p className="mt-1 text-xs text-slate-500">
              {data
                ? `最終読み込み ${new Date(data.updatedAt).toLocaleString("ja-JP")} ／ ${formatNumber(
                    data.stats.totalFriends,
                  )}件`
                : "スプレッドシートを読み込んでください"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data?.sheetsUrl ? (
              <a
                className="inline-flex h-10 items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
                href={data.sheetsUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
                シートを開く
              </a>
            ) : null}
            <button
              className="inline-flex h-10 items-center gap-1.5 rounded bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              disabled={loading}
              onClick={() => void load(connection)}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "読み込み中" : "再読み込み"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {data?.warning ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{data.warning}</span>
          </div>
        ) : null}

        <nav className="flex flex-wrap gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
          {TABS.map((item) => (
            <button
              className={`rounded px-3 py-2 text-sm font-medium ${
                tab === item.key ? "bg-zinc-900 text-white" : "text-slate-600 hover:bg-slate-200"
              }`}
              key={item.key}
              onClick={() => setTab(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === "overview" && data ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatTile
                icon={Users}
                label="友だち総数"
                sub={`ブロック等 ${formatNumber(data.stats.blockedFriends)}件`}
                value={formatNumber(data.stats.totalFriends)}
              />
              <StatTile
                icon={Tags}
                label="タグ種類"
                sub={`平均 ${data.stats.averageTagsPerFriend.toFixed(1)}個/人`}
                value={formatNumber(data.stats.totalTags)}
              />
              <StatTile
                icon={Layers}
                label="タグ付与済み"
                sub={formatPercent(
                  data.stats.totalFriends ? data.stats.taggedFriends / data.stats.totalFriends : 0,
                )}
                value={formatNumber(data.stats.taggedFriends)}
              />
              <StatTile
                icon={AlertTriangle}
                label="タグ未付与"
                sub="判定できない層。付与ルールの見直し対象"
                value={formatNumber(data.stats.untaggedFriends)}
              />
              <StatTile
                icon={Filter}
                label="流入経路"
                sub="上位20件を集計"
                value={formatNumber(data.sources.length)}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Section description="付与人数の多い順に上位15件" title="よく使われているタグ">
                <ul className="flex flex-col gap-2">
                  {data.tagStats.slice(0, 15).map((stat) => (
                    <li className="flex flex-col gap-1" key={stat.tag}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{stat.tag}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {formatNumber(stat.count)}人 / {formatPercent(stat.ratio)}
                        </span>
                      </div>
                      <Bar ratio={stat.ratio} />
                    </li>
                  ))}
                  {data.tagStats.length === 0 ? (
                    <li className="text-sm text-slate-500">タグが見つかりませんでした。</li>
                  ) : null}
                </ul>
              </Section>

              <Section
                description="lift が高いほど「一緒に付きやすい」組み合わせ。導線の実態が読める。"
                title="タグの併用パターン"
              >
                {data.tagPairs.length ? (
                  <ul className="flex flex-col gap-2 text-sm">
                    {data.tagPairs.map((pair) => (
                      <li
                        className="rounded border border-slate-200 px-3 py-2"
                        key={`${pair.a}__${pair.b}`}
                      >
                        <p className="font-medium">
                          {pair.a} <span className="text-slate-400">→</span> {pair.b}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          「{pair.a}」を持つ人の {formatPercent(pair.confidence)} が「{pair.b}」も保有
                          （{formatNumber(pair.count)}人 / lift {pair.lift.toFixed(2)}）
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    十分な共起データがありません（10件以上のデータが必要です）。
                  </p>
                )}
              </Section>
            </div>

            <Section description="経路ごとの人数とタグ付与率" title="流入経路">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <tr>
                      <th className="py-2 pr-3 font-medium">流入経路</th>
                      <th className="py-2 pr-3 font-medium">人数</th>
                      <th className="py-2 pr-3 font-medium">構成比</th>
                      <th className="py-2 pr-3 font-medium">タグ付与率</th>
                      <th className="py-2 font-medium">主なタグ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sources.map((source) => (
                      <tr className="border-b border-slate-100" key={source.source}>
                        <td className="py-2 pr-3 font-medium">{source.source}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatNumber(source.count)}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatPercent(source.ratio)}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatPercent(source.taggedRatio)}</td>
                        <td className="py-2 text-xs text-slate-600">
                          {source.topTags.join(" / ") || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        ) : null}

        {tab === "tags" && data ? (
          <Section
            action={
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-100"
                onClick={() =>
                  downloadCsv("lstep-tag-stats.csv", [
                    ["タグ", "人数", "比率"],
                    ...data.tagStats.map((stat) => [stat.tag, stat.count, formatPercent(stat.ratio)]),
                  ])
                }
                type="button"
              >
                <Download className="h-4 w-4" />
                CSV出力
              </button>
            }
            description="タグ名をクリックすると抽出タブの条件に追加されます"
            title={`タグ一覧（${formatNumber(data.tagStats.length)}件）`}
          >
            <label className="mb-3 flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="h-full w-full text-sm outline-none"
                onChange={(event) => setTagQuery(event.target.value)}
                placeholder="タグ名で絞り込み"
                value={tagQuery}
              />
            </label>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">タグ</th>
                    <th className="py-2 pr-3 font-medium">人数</th>
                    <th className="py-2 pr-3 font-medium">比率</th>
                    <th className="py-2 font-medium">分布</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTagStats.map((stat) => (
                    <tr className="border-b border-slate-100" key={stat.tag}>
                      <td className="py-2 pr-3">
                        <button
                          className="text-left font-medium text-teal-800 hover:underline"
                          onClick={() => {
                            toggleTag(includeTags, setIncludeTags, stat.tag);
                            setTab("extract");
                          }}
                          type="button"
                        >
                          {stat.tag}
                        </button>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{formatNumber(stat.count)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatPercent(stat.ratio)}</td>
                      <td className="w-1/3 py-2">
                        <Bar ratio={stat.ratio} />
                      </td>
                    </tr>
                  ))}
                  {filteredTagStats.length === 0 ? (
                    <tr>
                      <td className="py-3 text-sm text-slate-500" colSpan={4}>
                        該当するタグがありません。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}

        {tab === "segments" && data ? (
          <div className="flex flex-col gap-4">
            <Section
              description="上のルールから順に判定し、最初に当てはまったセグメントに割り当てます（1人1セグメント）"
              title="判定結果"
            >
              <ul className="flex flex-col gap-2">
                {segments.map((segment) => (
                  <li className="flex flex-col gap-1" key={segment.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{segment.label}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="tabular-nums text-slate-500">
                          {formatNumber(segment.count)}人 / {formatPercent(segment.ratio)}
                        </span>
                        <button
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 hover:underline disabled:text-slate-400 disabled:no-underline"
                          disabled={segment.count === 0}
                          onClick={() => {
                            const rowSet = new Set(segment.rowNumbers);
                            exportFriends(
                              friends.filter((friend) => rowSet.has(friend.rowNumber)),
                              `lstep-segment-${segment.label}.csv`,
                            );
                          }}
                          type="button"
                        >
                          <Download className="h-3.5 w-3.5" />
                          CSV
                        </button>
                      </span>
                    </div>
                    <Bar ratio={segment.ratio} />
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              action={
                <div className="flex gap-2">
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-100"
                    onClick={() =>
                      persistRules([
                        ...rules,
                        { id: createRuleId(), label: "新しいセグメント", all: [], any: [], none: [] },
                      ])
                    }
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    ルール追加
                  </button>
                  <button
                    className="inline-flex h-9 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-100"
                    onClick={() => persistRules(DEFAULT_SEGMENT_RULES)}
                    type="button"
                  >
                    初期値に戻す
                  </button>
                </div>
              }
              description="キーワードはタグ名の部分一致で判定します（カンマ区切りで複数指定）。この端末に自動保存されます。"
              title="判定ルール"
            >
              <div className="flex flex-col gap-3">
                {rules.map((rule, index) => (
                  <div className="rounded border border-slate-200 p-3" key={rule.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums text-slate-600">
                        {index + 1}
                      </span>
                      <input
                        className="h-9 flex-1 min-w-[160px] rounded border border-slate-300 px-2 text-sm font-medium outline-none"
                        onChange={(event) => updateRule(rule.id, { label: event.target.value })}
                        placeholder="セグメント名"
                        value={rule.label}
                      />
                      <button
                        aria-label="上へ"
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                        disabled={index === 0}
                        onClick={() => moveRule(index, -1)}
                        type="button"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="下へ"
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                        disabled={index === rules.length - 1}
                        onClick={() => moveRule(index, 1)}
                        type="button"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="削除"
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        onClick={() => persistRules(rules.filter((item) => item.id !== rule.id))}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      {(
                        [
                          ["any", "いずれかを含む"],
                          ["all", "すべて含む"],
                          ["none", "含まない"],
                        ] as const
                      ).map(([key, label]) => (
                        <label className="flex flex-col gap-1 text-xs text-slate-500" key={key}>
                          {label}
                          <input
                            className="h-9 rounded border border-slate-300 px-2 text-sm text-slate-900 outline-none"
                            onChange={(event) => {
                              const patch: Partial<SegmentRule> = {};
                              patch[key] = parseKeywordList(event.target.value);
                              updateRule(rule.id, patch);
                            }}
                            placeholder="例: セミナー参加, 個別相談"
                            value={formatKeywordList(rule[key])}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        ) : null}

        {tab === "extract" && data ? (
          <div className="flex flex-col gap-4">
            <Section description="タグの組み合わせで対象者を絞り込みます" title="抽出条件">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xs font-medium text-slate-500">含むタグの条件</span>
                  {(["and", "or"] as const).map((mode) => (
                    <button
                      className={`rounded border px-2 py-1 text-xs font-medium ${
                        includeMode === mode
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-slate-300 bg-white text-slate-600"
                      }`}
                      key={mode}
                      onClick={() => setIncludeMode(mode)}
                      type="button"
                    >
                      {mode === "and" ? "すべて含む(AND)" : "いずれか含む(OR)"}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    流入経路
                    <select
                      className="h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none"
                      onChange={(event) => setSourceFilter(event.target.value)}
                      value={sourceFilter}
                    >
                      <option value="">すべて</option>
                      {data.sources.map((source) => (
                        <option key={source.source} value={source.source}>
                          {source.source}（{formatNumber(source.count)}）
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    名前で検索
                    <input
                      className="h-9 rounded border border-slate-300 px-2 text-sm text-slate-900 outline-none"
                      onChange={(event) => setNameQuery(event.target.value)}
                      placeholder="部分一致"
                      value={nameQuery}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-slate-500">
                    タグを選択（クリックで含む条件、右のボタンで除外条件）
                  </p>
                  <label className="flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      className="h-full w-full text-sm outline-none"
                      onChange={(event) => setTagQuery(event.target.value)}
                      placeholder="タグ名で絞り込み"
                      value={tagQuery}
                    />
                  </label>
                  <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded border border-slate-200 p-2">
                    {filteredTagStats.slice(0, 200).map((stat) => {
                      const included = includeTags.includes(stat.tag);
                      const excluded = excludeTags.includes(stat.tag);
                      return (
                        <span
                          className={`inline-flex items-center overflow-hidden rounded border text-xs ${
                            included
                              ? "border-teal-600 bg-teal-600 text-white"
                              : excluded
                                ? "border-red-300 bg-red-50 text-red-700 line-through"
                                : "border-slate-300 bg-white text-slate-700"
                          }`}
                          key={stat.tag}
                        >
                          <button
                            className="px-2 py-1"
                            onClick={() => toggleTag(includeTags, setIncludeTags, stat.tag)}
                            type="button"
                          >
                            {stat.tag}
                            <span className="ml-1 opacity-70">{formatNumber(stat.count)}</span>
                          </button>
                          <button
                            aria-label={`${stat.tag} を除外`}
                            className="border-l border-current px-1.5 py-1 opacity-70 hover:opacity-100"
                            onClick={() => toggleTag(excludeTags, setExcludeTags, stat.tag)}
                            type="button"
                          >
                            −
                          </button>
                        </span>
                      );
                    })}
                    {filteredTagStats.length === 0 ? (
                      <span className="text-xs text-slate-500">該当するタグがありません。</span>
                    ) : null}
                  </div>
                  {includeTags.length || excludeTags.length ? (
                    <button
                      className="self-start text-xs font-medium text-slate-500 hover:underline"
                      onClick={() => {
                        setIncludeTags([]);
                        setExcludeTags([]);
                      }}
                      type="button"
                    >
                      条件をクリア
                    </button>
                  ) : null}
                </div>
              </div>
            </Section>

            <Section
              action={
                <button
                  className="inline-flex h-9 items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50"
                  disabled={extractedFriends.length === 0}
                  onClick={() => exportFriends(extractedFriends, "lstep-extract.csv")}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  CSV出力
                </button>
              }
              description={`全${formatNumber(friends.length)}件中 ${formatPercent(
                friends.length ? extractedFriends.length / friends.length : 0,
              )}`}
              title={`抽出結果 ${formatNumber(extractedFriends.length)}件`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <tr>
                      <th className="py-2 pr-3 font-medium">行</th>
                      <th className="py-2 pr-3 font-medium">名前</th>
                      <th className="py-2 pr-3 font-medium">登録日</th>
                      <th className="py-2 pr-3 font-medium">流入経路</th>
                      <th className="py-2 font-medium">タグ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedFriends.slice(0, 300).map((friend) => (
                      <tr className="border-b border-slate-100 align-top" key={friend.rowNumber}>
                        <td className="py-2 pr-3 tabular-nums text-slate-500">{friend.rowNumber}</td>
                        <td className="py-2 pr-3 font-medium">{friend.name || "-"}</td>
                        <td className="py-2 pr-3 text-xs text-slate-600">{friend.registeredAt || "-"}</td>
                        <td className="py-2 pr-3 text-xs text-slate-600">{friend.source || "-"}</td>
                        <td className="py-2 text-xs text-slate-600">{friend.tags.join(" / ") || "-"}</td>
                      </tr>
                    ))}
                    {extractedFriends.length === 0 ? (
                      <tr>
                        <td className="py-3 text-sm text-slate-500" colSpan={5}>
                          条件に一致する友だちがいません。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {extractedFriends.length > 300 ? (
                <p className="mt-2 text-xs text-slate-500">
                  表示は先頭300件です。全件はCSV出力から取得してください。
                </p>
              ) : null}
            </Section>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="flex flex-col gap-4">
            <Section
              description="Lステップの友だちリストを書き出したスプレッドシートを指定します。共有設定は「リンクを知っている全員（閲覧者）」にしてください。"
              title="スプレッドシート接続"
            >
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  スプレッドシートURL または ID
                  <div className="flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-2">
                    <Link2 className="h-4 w-4 text-slate-400" />
                    <input
                      className="h-full w-full text-sm text-slate-900 outline-none"
                      onChange={(event) =>
                        setDraftConnection((prev) => ({ ...prev, spreadsheetId: event.target.value }))
                      }
                      placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
                      value={draftConnection.spreadsheetId}
                    />
                  </div>
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    シート名（空欄なら先頭シート）
                    <input
                      className="h-10 rounded border border-slate-300 px-2 text-sm text-slate-900 outline-none"
                      onChange={(event) =>
                        setDraftConnection((prev) => ({ ...prev, sheetName: event.target.value }))
                      }
                      placeholder="友だちリスト"
                      value={draftConnection.sheetName}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    読み込み範囲
                    <input
                      className="h-10 rounded border border-slate-300 px-2 text-sm text-slate-900 outline-none"
                      onChange={(event) =>
                        setDraftConnection((prev) => ({ ...prev, range: event.target.value }))
                      }
                      placeholder="A1:CV5000"
                      value={draftConnection.range}
                    />
                  </label>
                </div>
                <button
                  className="inline-flex h-10 w-fit items-center gap-1.5 rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  disabled={loading}
                  onClick={saveConnection}
                  type="button"
                >
                  <Settings className="h-4 w-4" />
                  保存して読み込む
                </button>
              </div>
            </Section>

            {data ? (
              <Section
                description="ヘッダー名から自動判定した結果です。ズレている場合はシートの見出しを分かりやすい名前に変えてください。"
                title="列の自動判定"
              >
                <dl className="grid gap-2 text-sm md:grid-cols-2">
                  <div className="flex justify-between gap-3 rounded border border-slate-200 px-3 py-2">
                    <dt className="text-slate-500">名前列</dt>
                    <dd className="font-medium">{columnLabel(data.columnMap.nameColumn)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 rounded border border-slate-200 px-3 py-2">
                    <dt className="text-slate-500">登録日列</dt>
                    <dd className="font-medium">{columnLabel(data.columnMap.registeredAtColumn)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 rounded border border-slate-200 px-3 py-2">
                    <dt className="text-slate-500">流入経路列</dt>
                    <dd className="font-medium">{columnLabel(data.columnMap.sourceColumn)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 rounded border border-slate-200 px-3 py-2">
                    <dt className="text-slate-500">ステータス列</dt>
                    <dd className="font-medium">{columnLabel(data.columnMap.statusColumn)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 rounded border border-slate-200 px-3 py-2 md:col-span-2">
                    <dt className="text-slate-500">タグの持ち方</dt>
                    <dd className="text-right font-medium">
                      {data.columnMap.tagMode === "csv"
                        ? `1列にまとめて記載（${data.columnMap.csvTagColumns
                            .map((index) => columnLabel(index))
                            .join(", ")}）`
                        : data.columnMap.tagMode === "wide"
                          ? `タグごとに列（${data.columnMap.wideTagColumns.length}列）`
                          : data.columnMap.tagMode === "mixed"
                            ? `混在（まとめ${data.columnMap.csvTagColumns.length}列 + 個別${data.columnMap.wideTagColumns.length}列）`
                            : "未検出"}
                    </dd>
                  </div>
                </dl>
              </Section>
            ) : null}
          </div>
        ) : null}

        {!data && !error && tab !== "settings" ? (
          <div className="rounded-lg border border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            {loading ? "読み込み中です…" : "設定タブでスプレッドシートを指定してください。"}
          </div>
        ) : null}
      </div>
    </main>
  );
}
