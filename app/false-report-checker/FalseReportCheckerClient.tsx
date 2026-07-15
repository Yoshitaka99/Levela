"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Save,
  Search,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type {
  CustomerRow,
  DiffDecision,
  FalseReportAction,
  FalseReportData,
  FalseReportRow,
  ProblemOkRow,
  ReplyRow,
} from "./types";

type TabId = "customers" | "changes" | "falseReports" | "problemOk" | "replies";

const handlers = ["成勢将司", "野中碧", "梅津真珠", "笠松佑衣", "大谷みくに"];

const emptyData: FalseReportData = {
  updatedAt: "",
  writeReady: false,
  source: "public-csv",
  sheetsUrl: "",
  customers: [],
  falseReports: [],
  problemOk: [],
  replies: [],
  stats: {
    totalCustomers: 0,
    confirmedCustomers: 0,
    changedCustomers: 0,
    unreviewedChanges: 0,
    falseReports: 0,
    problemOk: 0,
    replies: 0,
  },
};

const tabs: { id: TabId; label: string }[] = [
  { id: "customers", label: "顧客管理" },
  { id: "changes", label: "差分" },
  { id: "falseReports", label: "虚偽報告" },
  { id: "problemOk", label: "問題無し" },
  { id: "replies", label: "返信あり" },
];

function splitCombinedStatus(value: string) {
  const parts = value.split(/\s+\/\s+/).map((part) => part.trim()).filter(Boolean);
  return {
    first: parts[0] ?? value.trim(),
    second: parts.length > 1 ? parts.slice(1).join(" / ") : "",
  };
}

function seatOnly(value: string) {
  return splitCombinedStatus(value).first;
}

function statusOnly(value: string, fallback = "") {
  const split = splitCombinedStatus(value);
  if (split.second) return split.second;
  if (fallback && fallback !== value) return statusOnly(fallback);
  return value.trim();
}

function includesQuery(values: string[], query: string) {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalized));
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  const normalized = status.trim();

  if (!normalized) return "border-zinc-200 bg-zinc-50 text-zinc-500";
  if (normalized.includes("担当者変更")) return "border-red-200 bg-red-700 text-white";
  if (normalized.includes("成約")) return "border-red-200 bg-red-50 text-red-700";
  if (normalized.includes("着座")) return "border-yellow-200 bg-yellow-100 text-yellow-900";
  if (normalized.includes("事前キャンセル") || normalized.includes("その場キャンセル")) {
    return "border-orange-900 bg-orange-900 text-white";
  }
  if (normalized.includes("営業マン都合キャンセル")) {
    return "border-yellow-950 bg-yellow-950 text-yellow-50";
  }
  if (normalized.includes("リスケ") || normalized.includes("再日程調整中") || normalized.includes("日程調整中")) {
    return "border-green-200 bg-green-100 text-emerald-800";
  }
  if (normalized.includes("返信なし")) return "border-red-200 bg-red-100 text-red-700";
  if (normalized.includes("日程調整済")) {
    return "border-zinc-200 bg-zinc-100 text-zinc-800";
  }
  if (normalized.includes("重複予約") || normalized.includes("無効アポ") || normalized.includes("MLM失注")) {
    return "border-purple-200 bg-purple-700 text-white";
  }
  if (normalized === "飛び" || normalized.includes("飛び")) {
    return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }

  return "border-zinc-200 bg-white text-zinc-800";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-medium leading-tight ${statusClass(value)}`}
      title={value || "-"}
    >
      <span className="truncate">{value || "-"}</span>
    </span>
  );
}

function SheetCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-zinc-800">
      <input
        aria-label={label}
        checked={checked}
        className="h-4 w-4 accent-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function DecisionCheckbox({
  decision,
  selected,
  disabled,
  onSelect,
}: {
  decision: "ok" | "ng";
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-semibold ${
        decision === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <input
        checked={selected}
        className="h-4 w-4 accent-zinc-900"
        disabled={disabled}
        type="checkbox"
        onChange={onSelect}
      />
      {decision.toUpperCase()}
    </label>
  );
}

export default function FalseReportCheckerClient() {
  const [data, setData] = useState<FalseReportData>(emptyData);
  const [activeTab, setActiveTab] = useState<TabId>("customers");
  const [query, setQuery] = useState("");
  const [launchFilter, setLaunchFilter] = useState("all");
  const [handler, setHandler] = useState(handlers[0]);
  const [diffSelections, setDiffSelections] = useState<Record<number, "ok" | "ng">>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [memoDrafts, setMemoDrafts] = useState<Record<number, string>>({});
  const [replyMemoDrafts, setReplyMemoDrafts] = useState<Record<number, string>>({});

  const loadData = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/false-report-checker", { cache: "no-store" });
      const nextData = (await response.json()) as FalseReportData;
      setData({
        ...nextData,
        problemOk: nextData.problemOk ?? [],
        stats: {
          ...nextData.stats,
          problemOk: nextData.stats.problemOk ?? 0,
        },
      });
      setMemoDrafts(Object.fromEntries(nextData.falseReports.map((row) => [row.rowNumber, row.memo])));
      setReplyMemoDrafts(Object.fromEntries(nextData.replies.map((row) => [row.rowNumber, row.contactMemo])));
      if (nextData.warning) setMessage(nextData.warning);
    } catch {
      setMessage("データ取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const launches = useMemo(() => {
    return [...new Set(data.customers.map((row) => row.seminar).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ja", { numeric: true }),
    );
  }, [data.customers]);

  const seatOptions = useMemo(() => {
    return [
      "",
      ...new Set(
        [
          ...data.customers.map((row) => row.seatStatus),
          ...data.replies.map((row) => row.seatStatus),
          "着座",
          "日程変更→着座",
          "飛び",
          "事前キャンセル",
          "その場キャンセル",
          "リスケ/再日程調整中",
          "日程調整済",
          "重複予約",
          "無効アポ",
          "担当者変更",
          "営業マン都合キャンセル",
        ].filter(Boolean),
      ),
    ];
  }, [data.customers, data.replies]);

  const contractOptions = useMemo(() => {
    return [
      "",
      ...new Set(
        [
          ...data.customers.map((row) => row.secondStatus),
          ...data.replies.map((row) => row.contractStatus),
          "成約",
          "失注",
          "MLM失注",
          "保留",
          "日程調整→返信なし",
          "日程調整済",
        ].filter(Boolean),
      ),
    ];
  }, [data.customers, data.replies]);

  const matchesLaunch = useCallback(
    (seminar: string) => launchFilter === "all" || seminar === launchFilter,
    [launchFilter],
  );

  const filteredCustomers = useMemo(() => {
    return data.customers.filter(
      (row) =>
        matchesLaunch(row.seminar) &&
        includesQuery(
          [row.customerName, row.ownerName, row.seminar, row.seatStatus, row.secondStatus],
          query,
        ),
    );
  }, [data.customers, matchesLaunch, query]);

  const filteredChanges = useMemo(() => filteredCustomers.filter((row) => row.changed), [filteredCustomers]);

  const filteredFalseReports = useMemo(() => {
    return data.falseReports.filter(
      (row) =>
        matchesLaunch(row.seminar) &&
        includesQuery(
          [row.customerName, row.ownerName, row.seminar, row.falseReport, row.correctReport, row.memo],
          query,
        ),
    );
  }, [data.falseReports, matchesLaunch, query]);

  const filteredProblemOk = useMemo(() => {
    return data.problemOk.filter(
      (row) =>
        matchesLaunch(row.seminar) &&
        includesQuery(
          [row.customerName, row.ownerName, row.seminar, row.falseReport, row.correctReport, row.handler, row.memo],
          query,
        ),
    );
  }, [data.problemOk, matchesLaunch, query]);

  const filteredReplies = useMemo(() => {
    return data.replies.filter(
      (row) =>
        matchesLaunch(row.seminar) &&
        includesQuery([row.customerName, row.ownerName, row.seminar, row.memo, row.contactMemo], query),
    );
  }, [data.replies, matchesLaunch, query]);

  const selectedDecisions = useMemo<DiffDecision[]>(() => {
    return Object.entries(diffSelections).map(([rowNumber, decision]) => ({
      rowNumber: Number(rowNumber),
      decision,
    }));
  }, [diffSelections]);

  const runAction = async (key: string, action: FalseReportAction) => {
    if (!data.writeReady) {
      setMessage("書き込み用のApps Script連携が未設定です。");
      return false;
    }

    setSavingKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/false-report-checker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || result.ok === false) {
        setMessage(result.message ?? "保存に失敗しました。");
        return false;
      }

      setMessage("保存しました。");
      patchLocal(action);
      return true;
    } catch {
      setMessage("保存に失敗しました。");
      return false;
    } finally {
      setSavingKey(null);
    }
  };

  const applyDiffDecisions = async () => {
    if (!selectedDecisions.length) {
      setMessage("OK/NGを選んでから反映してください。");
      return;
    }

    const ok = await runAction("apply-diff-decisions", {
      action: "applyDiffDecisions",
      handler,
      decisions: selectedDecisions,
    });
    if (ok) {
      setDiffSelections({});
      await loadData();
    }
  };

  const patchLocal = (action: FalseReportAction) => {
    if (action.action === "setConfirmed") {
      setData((current) => ({
        ...current,
        customers: current.customers.map((row) =>
          row.rowNumber === action.rowNumber ? { ...row, confirmed: action.checked } : row,
        ),
      }));
      return;
    }

    if (action.action === "setDiffReviewed") {
      setData((current) => ({
        ...current,
        customers: current.customers.map((row) =>
          row.rowNumber === action.rowNumber ? { ...row, diffReviewed: action.checked } : row,
        ),
      }));
      return;
    }

    if (action.action === "applyDiffDecisions") {
      const reviewedRows = new Set(action.decisions.map((decision) => decision.rowNumber));
      setData((current) => ({
        ...current,
        customers: current.customers.map((row) =>
          reviewedRows.has(row.rowNumber) ? { ...row, diffReviewed: true } : row,
        ),
      }));
      return;
    }

    if (action.action === "saveFalseReportMemo") {
      setData((current) => ({
        ...current,
        falseReports: current.falseReports.map((row) =>
          row.rowNumber === action.rowNumber ? { ...row, memo: action.memo } : row,
        ),
      }));
      return;
    }

    if (action.action === "updateReply") {
      setData((current) => ({
        ...current,
        replies: current.replies.map((row) =>
          row.rowNumber === action.rowNumber ? { ...row, [action.field]: action.value } : row,
        ),
      }));
    }
  };

  return (
    <main className="min-h-screen bg-slate-200 text-slate-950">
      <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-6 py-5 2xl:px-10">
        <header className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-slate-50 px-5 py-4 shadow-sm xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">軽量版シート操作</p>
            <h1 className="text-2xl font-semibold tracking-normal">虚偽報告チェック</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="inline-flex h-10 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              href={data.sheetsUrl || "#"}
              rel="noreferrer"
              target="_blank"
            >
              シートを開く
            </a>
            <button
              className="inline-flex h-10 items-center gap-2 rounded bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
              disabled={loading}
              title="再読み込み"
              type="button"
              onClick={() => void loadData()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              更新
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <Metric label="確認済み" value={`${data.stats.confirmedCustomers}/${data.stats.totalCustomers}`} />
          <Metric label="未確認差分" value={data.stats.unreviewedChanges.toLocaleString("ja-JP")} danger />
          <Metric label="差分あり" value={data.stats.changedCustomers.toLocaleString("ja-JP")} />
          <Metric label="虚偽報告" value={data.stats.falseReports.toLocaleString("ja-JP")} />
          <Metric label="問題無し" value={data.stats.problemOk.toLocaleString("ja-JP")} />
          <Metric label="返信あり" value={data.stats.replies.toLocaleString("ja-JP")} />
          <Metric label="最終取得" value={formatDateTime(data.updatedAt)} />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded bg-slate-200 p-1">
              {tabs.map((tab) => (
                <button
                  className={`h-9 whitespace-nowrap rounded px-3 text-sm font-medium ${
                    activeTab === tab.id ? "bg-blue-700 text-white shadow-sm" : "text-slate-700 hover:bg-white"
                  }`}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              className="h-10 min-w-72 rounded border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900"
              value={launchFilter}
              onChange={(event) => setLaunchFilter(event.target.value)}
            >
              <option value="all">すべてのローンチ</option>
              {launches.map((launch) => (
                <option key={launch} value={launch}>
                  {launch}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "changes" ? (
              <>
                <select
                  className="h-10 rounded border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900"
                  value={handler}
                  onChange={(event) => setHandler(event.target.value)}
                >
                  {handlers.map((name) => (
                    <option key={name} value={name}>
                      対応者: {name}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!selectedDecisions.length || savingKey === "apply-diff-decisions"}
                  type="button"
                  onClick={() => void applyDiffDecisions()}
                >
                  {savingKey === "apply-diff-decisions" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  反映 {selectedDecisions.length ? `(${selectedDecisions.length})` : ""}
                </button>
              </>
            ) : null}

            <label className="relative block w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                className="h-10 w-full rounded border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-900"
                placeholder="名前・担当・ローンチで検索"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
        </section>

        {message ? (
          <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        {activeTab === "customers" ? (
          <CustomersTable
            disabled={!data.writeReady}
            rows={filteredCustomers.slice(0, 350)}
            savingKey={savingKey}
            onAction={runAction}
          />
        ) : null}

        {activeTab === "changes" ? (
          <CustomersTable
            changesOnly
            decisionSelections={diffSelections}
            disabled={!data.writeReady}
            rows={filteredChanges.slice(0, 350)}
            savingKey={savingKey}
            setDecisionSelections={setDiffSelections}
            onAction={runAction}
          />
        ) : null}

        {activeTab === "falseReports" ? (
          <FalseReportsTable
            disabled={!data.writeReady}
            memoDrafts={memoDrafts}
            rows={filteredFalseReports.slice(0, 350)}
            savingKey={savingKey}
            setMemoDrafts={setMemoDrafts}
            onAction={runAction}
          />
        ) : null}

        {activeTab === "problemOk" ? <ProblemOkTable rows={filteredProblemOk.slice(0, 350)} /> : null}

        {activeTab === "replies" ? (
          <RepliesTable
            contractOptions={contractOptions}
            disabled={!data.writeReady}
            memoDrafts={replyMemoDrafts}
            rows={filteredReplies.slice(0, 350)}
            savingKey={savingKey}
            seatOptions={seatOptions}
            setMemoDrafts={setReplyMemoDrafts}
            onAction={runAction}
          />
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 shadow-sm ${
        danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-xl font-semibold ${danger ? "text-red-700" : "text-slate-950"}`}>
        {value}
      </div>
    </div>
  );
}

function CustomersTable({
  rows,
  disabled,
  savingKey,
  changesOnly = false,
  decisionSelections = {},
  setDecisionSelections,
  onAction,
}: {
  rows: CustomerRow[];
  disabled: boolean;
  savingKey: string | null;
  changesOnly?: boolean;
  decisionSelections?: Record<number, "ok" | "ng">;
  setDecisionSelections?: Dispatch<SetStateAction<Record<number, "ok" | "ng">>>;
  onAction: (key: string, action: FalseReportAction) => Promise<boolean>;
}) {
  return (
    <TableShell>
      <table className="w-full table-fixed text-left text-sm">
        <thead className="sticky top-0 bg-slate-200 text-xs font-semibold text-slate-700">
          <tr>
            <Th className="w-[9%]">操作</Th>
            <Th className="w-[13%]">顧客</Th>
            <Th className="w-[14%]">ローンチ</Th>
            <Th className="w-[9%]">担当</Th>
            <Th className="w-[11%] bg-sky-100">確認時 着座</Th>
            <Th className="w-[12%] bg-sky-100">確認時 ステータス</Th>
            <Th className="w-[11%] bg-amber-100">現在 着座</Th>
            <Th className="w-[12%] bg-amber-100">現在 ステータス</Th>
            <Th className="w-[9%]">状態</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {rows.map((row) => {
            const key = `customer-${row.rowNumber}`;
            const selected = decisionSelections[row.rowNumber];
            return (
              <tr
                className={
                  row.changed
                    ? changesOnly
                      ? "bg-red-50/60"
                      : "bg-yellow-100/70"
                    : row.confirmed
                      ? "bg-slate-50 text-slate-500"
                      : "bg-white"
                }
                key={row.rowNumber}
              >
                <Td>
                  <div className="flex flex-col gap-2">
                    {changesOnly ? (
                      <div className="flex flex-wrap gap-1">
                        <DecisionCheckbox
                          decision="ok"
                          disabled={disabled}
                          selected={selected === "ok"}
                          onSelect={() =>
                            setDecisionSelections?.((current) => {
                              const next = { ...current };
                              if (next[row.rowNumber] === "ok") {
                                delete next[row.rowNumber];
                              } else {
                                next[row.rowNumber] = "ok";
                              }
                              return next;
                            })
                          }
                        />
                        <DecisionCheckbox
                          decision="ng"
                          disabled={disabled}
                          selected={selected === "ng"}
                          onSelect={() =>
                            setDecisionSelections?.((current) => {
                              const next = { ...current };
                              if (next[row.rowNumber] === "ng") {
                                delete next[row.rowNumber];
                              } else {
                                next[row.rowNumber] = "ng";
                              }
                              return next;
                            })
                          }
                        />
                      </div>
                    ) : (
                      <SheetCheckbox
                        checked={row.confirmed}
                        disabled={disabled || savingKey === key}
                        label="確認済み"
                        onChange={(checked) =>
                          onAction(key, { action: "setConfirmed", rowNumber: row.rowNumber, checked })
                        }
                      />
                    )}
                  </div>
                </Td>
                <Td>
                  <div className={row.confirmed ? "line-through decoration-zinc-500" : ""}>
                    <div className="break-words font-medium text-zinc-950">{row.customerName}</div>
                    <div className="text-xs text-zinc-500">行 {row.rowNumber}</div>
                  </div>
                </Td>
                <Td>{row.seminar || "-"}</Td>
                <Td>{row.ownerName || "-"}</Td>
                <Td className="bg-sky-50/80">
                  <StatusBadge value={seatOnly(row.confirmedSeatStatus || row.confirmedSecondStatus)} />
                </Td>
                <Td className="bg-sky-50/80">
                  <StatusBadge value={statusOnly(row.confirmedSecondStatus, row.confirmedSeatStatus)} />
                </Td>
                <Td className="bg-amber-50/80">
                  <StatusBadge value={seatOnly(row.currentSeatStatus)} />
                </Td>
                <Td className="bg-amber-50/80">
                  <StatusBadge value={statusOnly(row.currentSecondStatus, row.currentSeatStatus)} />
                </Td>
                <Td>
                  <span
                    className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                      row.changed && !row.diffReviewed
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    {row.changed ? (row.diffReviewed ? "対応済" : "差分あり") : "通常"}
                  </span>
                </Td>
              </tr>
            );
          })}
          {rows.length === 0 ? <EmptyRow colSpan={9} text="対象データがありません。" /> : null}
        </tbody>
      </table>
    </TableShell>
  );
}

function FalseReportsTable({
  rows,
  disabled,
  savingKey,
  memoDrafts,
  setMemoDrafts,
  onAction,
}: {
  rows: FalseReportRow[];
  disabled: boolean;
  savingKey: string | null;
  memoDrafts: Record<number, string>;
  setMemoDrafts: Dispatch<SetStateAction<Record<number, string>>>;
  onAction: (key: string, action: FalseReportAction) => Promise<boolean>;
}) {
  return (
    <TableShell>
      <table className="w-full table-fixed text-left text-sm">
        <thead className="sticky top-0 bg-slate-200 text-xs font-semibold text-slate-700">
          <tr>
            <Th className="w-[15%]">顧客</Th>
            <Th className="w-[14%]">ローンチ</Th>
            <Th className="w-[18%]">虚偽報告</Th>
            <Th className="w-[18%]">正しい報告</Th>
            <Th className="w-[12%]">検知</Th>
            <Th className="w-[23%]">メモ</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {rows.map((row) => {
            const key = `false-report-${row.rowNumber}`;
            return (
              <tr key={row.rowNumber}>
                <Td>
                  <div className="break-words font-medium text-zinc-950">{row.customerName || "-"}</div>
                  <div className="text-xs text-zinc-500">{row.ownerName || "-"} / 行 {row.rowNumber}</div>
                </Td>
                <Td>{row.seminar || "-"}</Td>
                <Td>
                  <StatusBadge value={row.falseReport} />
                </Td>
                <Td>
                  <StatusBadge value={row.correctReport} />
                </Td>
                <Td>
                  <div>{formatDateTime(row.detectedAt)}</div>
                  <div className="text-xs text-zinc-500">確認 {formatDateTime(row.confirmedAt)}</div>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <input
                      className="h-9 min-w-0 flex-1 rounded border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-900 disabled:bg-zinc-100"
                      disabled={disabled}
                      value={memoDrafts[row.rowNumber] ?? ""}
                      onChange={(event) =>
                        setMemoDrafts((current) => ({ ...current, [row.rowNumber]: event.target.value }))
                      }
                    />
                    <button
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={disabled || savingKey === key}
                      title="保存"
                      type="button"
                      onClick={() =>
                        onAction(key, {
                          action: "saveFalseReportMemo",
                          rowNumber: row.rowNumber,
                          memo: memoDrafts[row.rowNumber] ?? "",
                        })
                      }
                    >
                      {savingKey === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
          {rows.length === 0 ? <EmptyRow colSpan={6} text="虚偽報告データがありません。" /> : null}
        </tbody>
      </table>
    </TableShell>
  );
}

function ProblemOkTable({ rows }: { rows: ProblemOkRow[] }) {
  return (
    <TableShell>
      <table className="w-full table-fixed text-left text-sm">
        <thead className="sticky top-0 bg-slate-200 text-xs font-semibold text-slate-700">
          <tr>
            <Th className="w-[16%]">顧客</Th>
            <Th className="w-[14%]">ローンチ</Th>
            <Th className="w-[17%]">確認時</Th>
            <Th className="w-[17%]">現在</Th>
            <Th className="w-[12%]">対応者</Th>
            <Th className="w-[12%]">反映日時</Th>
            <Th className="w-[12%]">元行</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {rows.map((row) => (
            <tr key={row.rowNumber}>
              <Td>
                <div className="break-words font-medium text-zinc-950">{row.customerName || "-"}</div>
                <div className="text-xs text-zinc-500">{row.ownerName || "-"}</div>
              </Td>
              <Td>{row.seminar || "-"}</Td>
              <Td>
                <StatusBadge value={row.falseReport} />
              </Td>
              <Td>
                <StatusBadge value={row.correctReport} />
              </Td>
              <Td>{row.handler || "-"}</Td>
              <Td>{formatDateTime(row.reflectedAt)}</Td>
              <Td>{row.sourceRowNumber || "-"}</Td>
            </tr>
          ))}
          {rows.length === 0 ? <EmptyRow colSpan={7} text="問題無しデータがありません。" /> : null}
        </tbody>
      </table>
    </TableShell>
  );
}

function RepliesTable({
  rows,
  disabled,
  savingKey,
  memoDrafts,
  seatOptions,
  contractOptions,
  setMemoDrafts,
  onAction,
}: {
  rows: ReplyRow[];
  disabled: boolean;
  savingKey: string | null;
  memoDrafts: Record<number, string>;
  seatOptions: string[];
  contractOptions: string[];
  setMemoDrafts: Dispatch<SetStateAction<Record<number, string>>>;
  onAction: (key: string, action: FalseReportAction) => Promise<boolean>;
}) {
  return (
    <TableShell>
      <table className="w-full table-fixed text-left text-sm">
        <thead className="sticky top-0 bg-slate-200 text-xs font-semibold text-slate-700">
          <tr>
            <Th className="w-[14%]">顧客</Th>
            <Th className="w-[14%]">ローンチ</Th>
            <Th className="w-[16%]">返信</Th>
            <Th className="w-[12%]">対応</Th>
            <Th className="w-[12%]">着座</Th>
            <Th className="w-[12%]">成約</Th>
            <Th className="w-[20%]">メモ</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {rows.map((row) => {
            const key = `reply-${row.rowNumber}`;
            return (
              <tr key={row.rowNumber}>
                <Td>
                  <div className="break-words font-medium text-zinc-950">{row.customerName}</div>
                  <div className="text-xs text-zinc-500">{row.ownerName || "-"} / 行 {row.rowNumber}</div>
                </Td>
                <Td>{row.seminar || "-"}</Td>
                <Td>
                  <div>{formatDateTime(row.replyAt)}</div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <MessageSquareText className="h-3.5 w-3.5" />
                    <span className="break-words">{row.memo || "-"}</span>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-col gap-2">
                    <SheetCheckbox
                      checked={row.messageDone}
                      disabled={disabled || savingKey === key}
                      label="メッセ済"
                      onChange={(checked) =>
                        onAction(key, {
                          action: "updateReply",
                          rowNumber: row.rowNumber,
                          field: "messageDone",
                          value: checked,
                        })
                      }
                    />
                    <SheetCheckbox
                      checked={row.contacted}
                      disabled={disabled || savingKey === key}
                      label="接触済"
                      onChange={(checked) =>
                        onAction(key, {
                          action: "updateReply",
                          rowNumber: row.rowNumber,
                          field: "contacted",
                          value: checked,
                        })
                      }
                    />
                  </div>
                </Td>
                <Td>
                  <SelectCell
                    disabled={disabled || savingKey === key}
                    options={seatOptions}
                    value={row.seatStatus}
                    onChange={(value) =>
                      onAction(key, {
                        action: "updateReply",
                        rowNumber: row.rowNumber,
                        field: "seatStatus",
                        value,
                      })
                    }
                  />
                </Td>
                <Td>
                  <SelectCell
                    disabled={disabled || savingKey === key}
                    options={contractOptions}
                    value={row.contractStatus}
                    onChange={(value) =>
                      onAction(key, {
                        action: "updateReply",
                        rowNumber: row.rowNumber,
                        field: "contractStatus",
                        value,
                      })
                    }
                  />
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <input
                      className="h-9 min-w-0 flex-1 rounded border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-900 disabled:bg-zinc-100"
                      disabled={disabled}
                      value={memoDrafts[row.rowNumber] ?? ""}
                      onChange={(event) =>
                        setMemoDrafts((current) => ({ ...current, [row.rowNumber]: event.target.value }))
                      }
                    />
                    <button
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={disabled || savingKey === key}
                      title="保存"
                      type="button"
                      onClick={() =>
                        onAction(key, {
                          action: "updateReply",
                          rowNumber: row.rowNumber,
                          field: "contactMemo",
                          value: memoDrafts[row.rowNumber] ?? "",
                        })
                      }
                    >
                      {savingKey === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
          {rows.length === 0 ? <EmptyRow colSpan={7} text="返信あり顧客データがありません。" /> : null}
        </tbody>
      </table>
    </TableShell>
  );
}

function SelectCell({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="h-9 w-full rounded border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-900 disabled:bg-zinc-100"
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option || "empty"} value={option}>
          {option || "-"}
        </option>
      ))}
    </select>
  );
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[68vh] overflow-y-auto overflow-x-hidden">{children}</div>
    </section>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-sm text-zinc-500" colSpan={colSpan}>
        <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-zinc-400" />
        {text}
      </td>
    </tr>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-2 py-2 ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`align-top break-words px-2 py-3 ${className}`}>{children}</td>;
}
