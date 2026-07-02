"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CustomerRow,
  FalseReportCheckerData,
  FalseReportRow,
  ReplyRow,
} from "./types";

function falseReportId(report: FalseReportRow) {
  return report.rowKey || report.managementId || String(report.rowIndex);
}

type TabKey = "customers" | "diffs" | "falseReports" | "replies";

const PAGE_SIZE = 100;

const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "customers", label: "顧客管理", icon: Users },
  { key: "diffs", label: "差分", icon: RefreshCw },
  { key: "falseReports", label: "虚偽報告", icon: AlertTriangle },
  { key: "replies", label: "返信あり顧客", icon: MessageCircle },
];

async function postAction(payload: Record<string, unknown>) {
  const response = await fetch("/api/false-report-checker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({ ok: false, error: "invalid response" }));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `保存に失敗しました (status=${response.status})`);
  }
  return result;
}

export function FalseReportCheckerClient() {
  const [data, setData] = useState<FalseReportCheckerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<TabKey>("customers");
  const [query, setQuery] = useState("");
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/false-report-checker", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `データ取得に失敗しました (status=${response.status})`);
      }
      setData((await response.json()) as FalseReportCheckerData);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, query, unconfirmedOnly]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const markSaving = useCallback((key: string, saving: boolean) => {
    setSavingKeys((previous) => {
      const nextSet = new Set(previous);
      if (saving) nextSet.add(key);
      else nextSet.delete(key);
      return nextSet;
    });
  }, []);

  const runAction = useCallback(
    async (savingKey: string, payload: Record<string, unknown>, apply: () => void) => {
      if (!data?.writeEnabled) {
        setErrorMessage("書き込みは未接続です (Apps Script の設定が必要)。");
        return;
      }
      markSaving(savingKey, true);
      setErrorMessage("");
      try {
        await postAction(payload);
        apply();
        setNotice("保存しました");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました");
      } finally {
        markSaving(savingKey, false);
      }
    },
    [data?.writeEnabled, markSaving],
  );

  const setCustomerFlag = useCallback(
    (row: CustomerRow, field: "confirmed" | "diffConfirmed", value: boolean) => {
      const action = field === "confirmed" ? "setConfirmed" : "setDiffConfirmed";
      void runAction(`${action}:${row.rowKey}`, { action, rowKey: row.rowKey, value }, () => {
        setData((previous) =>
          previous
            ? {
                ...previous,
                customers: previous.customers.map((customer) =>
                  customer.rowKey === row.rowKey ? { ...customer, [field]: value } : customer,
                ),
              }
            : previous,
        );
      });
    },
    [runAction],
  );

  const saveFalseReportMemo = useCallback(
    (target: FalseReportRow, memo: string) => {
      const id = falseReportId(target);
      void runAction(
        `memo:${id}`,
        {
          action: "saveFalseReportMemo",
          rowKey: target.rowKey,
          managementId: target.managementId,
          rowIndex: target.rowIndex,
          customerName: target.customerName,
          memo,
        },
        () => {
          setData((previous) =>
            previous
              ? {
                  ...previous,
                  falseReports: previous.falseReports.map((report) =>
                    falseReportId(report) === id ? { ...report, memo } : report,
                  ),
                }
              : previous,
          );
        },
      );
    },
    [runAction],
  );

  const updateReply = useCallback(
    (row: ReplyRow, fields: Partial<Pick<ReplyRow, "contacted" | "status" | "contractStatus" | "memo">>) => {
      void runAction(
        `reply:${row.rowIndex}`,
        {
          action: "updateReply",
          rowIndex: row.rowIndex,
          customerName: row.customerName,
          appliedAt: row.appliedAtRaw,
          ...fields,
        },
        () => {
          setData((previous) =>
            previous
              ? {
                  ...previous,
                  replies: previous.replies.map((reply) =>
                    reply.rowIndex === row.rowIndex ? { ...reply, ...fields } : reply,
                  ),
                }
              : previous,
          );
        },
      );
    },
    [runAction],
  );

  const diffs = useMemo(
    () => data?.customers.filter((customer) => customer.changeDetected) ?? [],
    [data?.customers],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = useCallback(
    (...values: string[]) =>
      !normalizedQuery || values.some((value) => value.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  );

  const filteredCustomers = useMemo(() => {
    const source = tab === "diffs" ? diffs : data?.customers ?? [];
    return source.filter((customer) => {
      if (unconfirmedOnly) {
        if (tab === "diffs" && customer.diffConfirmed) return false;
        if (tab === "customers" && customer.confirmed) return false;
      }
      return matchesQuery(customer.customerName, customer.staffName, customer.status, customer.seminar);
    });
  }, [data?.customers, diffs, matchesQuery, tab, unconfirmedOnly]);

  const filteredReplies = useMemo(
    () =>
      (data?.replies ?? []).filter((reply) => {
        if (unconfirmedOnly && reply.contacted) return false;
        return matchesQuery(reply.customerName, reply.salesman, reply.status, reply.memo);
      }),
    [data?.replies, matchesQuery, unconfirmedOnly],
  );

  const filteredFalseReports = useMemo(
    () =>
      (data?.falseReports ?? []).filter((report) =>
        matchesQuery(report.customerName, report.staffName, report.falseReport, report.correctReport),
      ),
    [data?.falseReports, matchesQuery],
  );

  const tabCounts: Record<TabKey, number> = {
    customers: data?.customers.length ?? 0,
    diffs: diffs.length,
    falseReports: data?.falseReports.length ?? 0,
    replies: data?.replies.length ?? 0,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">虚偽報告チェック</h1>
          <p className="text-sm text-slate-500">
            軽量版シートの確認・差分チェック用 (大元シートには書き込みません)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && !data.writeEnabled && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              読み取り専用 (Apps Script未接続)
            </span>
          )}
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            再読み込み
          </button>
        </div>
      </header>

      {notice && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}
      {errorMessage && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}
      {loadError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {loadError}
        </div>
      )}

      <nav className="mb-4 flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === key
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                tab === key ? "bg-white/20" : "bg-slate-100 text-slate-500"
              }`}
            >
              {tabCounts[key]}
            </span>
          </button>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="顧客名・担当者・ステータスで検索"
            className="w-72 rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        {tab !== "falseReports" && (
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={unconfirmedOnly}
              onChange={(event) => setUnconfirmedOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {tab === "replies" ? "未連絡のみ" : "未確認のみ"}
          </label>
        )}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          読み込み中...
        </div>
      ) : (
        <>
          {(tab === "customers" || tab === "diffs") && (
            <CustomerTable
              rows={filteredCustomers.slice(0, visibleCount)}
              totalCount={filteredCustomers.length}
              showDiffColumns={tab === "diffs"}
              savingKeys={savingKeys}
              writeEnabled={data?.writeEnabled ?? false}
              onToggle={setCustomerFlag}
              onShowMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
            />
          )}
          {tab === "falseReports" && (
            <FalseReportList
              rows={filteredFalseReports}
              savingKeys={savingKeys}
              writeEnabled={data?.writeEnabled ?? false}
              onSaveMemo={saveFalseReportMemo}
            />
          )}
          {tab === "replies" && (
            <ReplyTable
              rows={filteredReplies.slice(0, visibleCount)}
              totalCount={filteredReplies.length}
              savingKeys={savingKeys}
              writeEnabled={data?.writeEnabled ?? false}
              onUpdate={updateReply}
              onShowMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
            />
          )}
        </>
      )}
    </div>
  );
}

function ShowMoreButton({
  shown,
  total,
  onShowMore,
}: {
  shown: number;
  total: number;
  onShowMore: () => void;
}) {
  if (shown >= total) return null;
  return (
    <div className="mt-3 text-center">
      <button
        type="button"
        onClick={onShowMore}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        さらに表示 ({shown} / {total})
      </button>
    </div>
  );
}

function CustomerTable({
  rows,
  totalCount,
  showDiffColumns,
  savingKeys,
  writeEnabled,
  onToggle,
  onShowMore,
}: {
  rows: CustomerRow[];
  totalCount: number;
  showDiffColumns: boolean;
  savingKeys: Set<string>;
  writeEnabled: boolean;
  onToggle: (row: CustomerRow, field: "confirmed" | "diffConfirmed", value: boolean) => void;
  onShowMore: () => void;
}) {
  if (!totalCount) {
    return <p className="py-10 text-center text-sm text-slate-500">該当するデータがありません</p>;
  }
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">確認済み</th>
              <th className="px-3 py-2">差分確認</th>
              <th className="px-3 py-2">お客様名</th>
              <th className="px-3 py-2">担当者</th>
              <th className="px-3 py-2">セミナー</th>
              <th className="px-3 py-2">申込日</th>
              <th className="px-3 py-2">面談日</th>
              {showDiffColumns ? (
                <>
                  <th className="px-3 py-2">確認時点ステータス</th>
                  <th className="px-3 py-2">現在ステータス</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2">着席</th>
                  <th className="px-3 py-2">ステータス</th>
                  <th className="px-3 py-2">成約プラン</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const confirmSaving = savingKeys.has(`setConfirmed:${row.rowKey}`);
              const diffSaving = savingKeys.has(`setDiffConfirmed:${row.rowKey}`);
              return (
                <tr key={row.rowKey} className={row.changeDetected ? "bg-amber-50/60" : undefined}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.confirmed}
                      disabled={!writeEnabled || confirmSaving || !row.rowKey}
                      onChange={(event) => onToggle(row, "confirmed", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.diffConfirmed}
                      disabled={!writeEnabled || diffSaving || !row.rowKey}
                      onChange={(event) => onToggle(row, "diffConfirmed", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 disabled:opacity-40"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                    {row.customerName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{row.staffName}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.seminar}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.appliedAt}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.interviewAt}</td>
                  {showDiffColumns ? (
                    <>
                      <td className="whitespace-nowrap px-3 py-2">{row.confirmedStatus}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-amber-700">
                        {row.currentStatus}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="whitespace-nowrap px-3 py-2">{row.seated}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.status}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.plan}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ShowMoreButton shown={rows.length} total={totalCount} onShowMore={onShowMore} />
    </div>
  );
}

function FalseReportList({
  rows,
  savingKeys,
  writeEnabled,
  onSaveMemo,
}: {
  rows: FalseReportCheckerData["falseReports"];
  savingKeys: Set<string>;
  writeEnabled: boolean;
  onSaveMemo: (report: FalseReportRow, memo: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!rows.length) {
    return <p className="py-10 text-center text-sm text-slate-500">該当するデータがありません</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((report) => {
        const id = falseReportId(report);
        const draft = drafts[id] ?? report.memo;
        const saving = savingKeys.has(`memo:${id}`);
        return (
          <div key={id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-slate-900">{report.customerName}</span>
                <span className="ml-2 text-sm text-slate-500">担当: {report.staffName}</span>
                <span className="ml-2 text-sm text-slate-500">{report.seminar}</span>
              </div>
              <div className="text-xs text-slate-400">
                確認: {report.confirmedAt} / 差分検知: {report.detectedAt}
              </div>
            </div>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm">
                <span className="mr-1 text-xs font-medium text-red-600">虚偽報告</span>
                <span className="text-red-800">{report.falseReport || "-"}</span>
              </div>
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm">
                <span className="mr-1 text-xs font-medium text-emerald-600">正しい報告</span>
                <span className="text-emerald-800">{report.correctReport || "-"}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <textarea
                value={draft}
                onChange={(event) =>
                  setDrafts((previous) => ({ ...previous, [id]: event.target.value }))
                }
                rows={2}
                placeholder="メモ"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={!writeEnabled || saving || draft === report.memo}
                onClick={() => onSaveMemo(report, draft)}
                className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-40"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                メモ保存
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReplyTable({
  rows,
  totalCount,
  savingKeys,
  writeEnabled,
  onUpdate,
  onShowMore,
}: {
  rows: ReplyRow[];
  totalCount: number;
  savingKeys: Set<string>;
  writeEnabled: boolean;
  onUpdate: (
    row: ReplyRow,
    fields: Partial<Pick<ReplyRow, "contacted" | "status" | "contractStatus" | "memo">>,
  ) => void;
  onShowMore: () => void;
}) {
  const [drafts, setDrafts] = useState<
    Record<number, { status?: string; contractStatus?: string; memo?: string }>
  >({});

  if (!totalCount) {
    return <p className="py-10 text-center text-sm text-slate-500">該当するデータがありません</p>;
  }

  const draftFor = (row: ReplyRow) => {
    const draft = drafts[row.rowIndex] ?? {};
    return {
      status: draft.status ?? row.status,
      contractStatus: draft.contractStatus ?? row.contractStatus,
      memo: draft.memo ?? row.memo,
    };
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">連絡済み</th>
              <th className="px-3 py-2">顧客名</th>
              <th className="px-3 py-2">営業マン</th>
              <th className="px-3 py-2">面談日</th>
              <th className="px-3 py-2">予約時間</th>
              <th className="px-3 py-2">着座/ステータス</th>
              <th className="px-3 py-2">成約状況</th>
              <th className="px-3 py-2">メモ</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const saving = savingKeys.has(`reply:${row.rowIndex}`);
              const draft = draftFor(row);
              const dirty =
                draft.status !== row.status ||
                draft.contractStatus !== row.contractStatus ||
                draft.memo !== row.memo;
              return (
                <tr key={row.rowIndex}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.contacted}
                      disabled={!writeEnabled || saving}
                      onChange={(event) => onUpdate(row, { contacted: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 disabled:opacity-40"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                    {row.customerName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{row.salesman}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.interviewDate}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.slot}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={draft.status}
                      disabled={!writeEnabled}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [row.rowIndex]: { ...previous[row.rowIndex], status: event.target.value },
                        }))
                      }
                      className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={draft.contractStatus}
                      disabled={!writeEnabled}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [row.rowIndex]: {
                            ...previous[row.rowIndex],
                            contractStatus: event.target.value,
                          },
                        }))
                      }
                      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={draft.memo}
                      disabled={!writeEnabled}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [row.rowIndex]: { ...previous[row.rowIndex], memo: event.target.value },
                        }))
                      }
                      className="w-44 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={!writeEnabled || saving || !dirty}
                      onClick={() => {
                        onUpdate(row, draft);
                        setDrafts((previous) => {
                          const next = { ...previous };
                          delete next[row.rowIndex];
                          return next;
                        });
                      }}
                      className="flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-40"
                    >
                      {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                      保存
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ShowMoreButton shown={rows.length} total={totalCount} onShowMore={onShowMore} />
    </div>
  );
}
