"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CustomerRow,
  FalseReportCheckerData,
  FalseReportRow,
  ReplyRow,
} from "./types";

type TabKey = "customers" | "diffs" | "falseReports" | "replies";

const PAGE_SIZE = 100;

const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "customers", label: "顧客管理", icon: Users },
  { key: "diffs", label: "差分", icon: RefreshCw },
  { key: "falseReports", label: "虚偽報告", icon: ShieldAlert },
  { key: "replies", label: "返信あり顧客", icon: MessageCircle },
];

function falseReportId(report: FalseReportRow) {
  return report.rowKey || report.managementId || String(report.rowIndex);
}

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

function statusChipClass(text: string) {
  if (text.includes("成約") && !text.includes("失注")) {
    return "bg-[#e60012]/10 text-[#c90010]";
  }
  if (text.includes("失注") || text.includes("キャンセル") || text.includes("飛び")) {
    return "bg-[#231815]/8 text-[#6f6259]";
  }
  return "bg-[#f3ead9] text-[#8a7355]";
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
    const timer = setTimeout(() => setNotice(""), 2600);
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
          slot: row.slot,
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
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#231815]/25 to-transparent" />

      <header className="sticky top-0 z-20 border-b border-[#d8cbb8] bg-[#fffaf2]/90 shadow-sm shadow-[#231815]/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-wide md:text-lg">
              虚偽報告チェック
            </h1>
            <p className="hidden text-xs text-[#8a7a63] md:block">
              軽量版シートの確認・差分チェック (大元シートには書き込みません)
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {data && !data.writeEnabled && (
              <span className="rounded-full border border-[#e8d9ba] bg-[#fdf1dc] px-3 py-1 text-[11px] font-medium text-[#9a6b1f]">
                読み取り専用
              </span>
            )}
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-full border border-[#d8cbb8] bg-white/90 px-3.5 py-2 text-xs font-medium text-[#231815] shadow-sm transition hover:bg-[#f8f3ea] disabled:opacity-50 md:text-sm"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">再読み込み</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
        <nav className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <div className="flex w-max gap-2 md:w-auto">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  tab === key
                    ? "bg-[#231815] text-[#fffaf2] shadow-lg shadow-[#231815]/20"
                    : "border border-[#dfd1bc] bg-white/80 text-[#231815] hover:bg-[#fffaf2]"
                }`}
              >
                <Icon className={`size-4 ${tab === key ? "text-[#f2c9c2]" : "text-[#a08b6f]"}`} />
                {label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                    tab === key ? "bg-white/15 text-[#fffaf2]" : "bg-[#f3ead9] text-[#8a7355]"
                  }`}
                >
                  {tabCounts[key]}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-3 md:mt-4">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a08b6f]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="顧客名・担当者・ステータスで検索"
              className="w-full rounded-full border border-[#d8cbb8] bg-white/95 py-2.5 pl-10 pr-4 text-sm text-[#231815] shadow-sm placeholder:text-[#b3a48c] focus:border-[#231815]/50 focus:outline-none"
            />
          </div>
          {tab !== "falseReports" && (
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[#dfd1bc] bg-white/80 px-3.5 py-2 text-sm text-[#6f6259]">
              <input
                type="checkbox"
                checked={unconfirmedOnly}
                onChange={(event) => setUnconfirmedOnly(event.target.checked)}
                className="size-4 accent-[#e60012]"
              />
              {tab === "replies" ? "未連絡のみ" : "未確認のみ"}
            </label>
          )}
        </div>

        {loadError && (
          <div className="mt-4 flex items-center gap-2 rounded-[20px] border border-[#f0c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#a3272d]">
            <AlertTriangle className="size-4 shrink-0" />
            {loadError}
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-[20px] border border-[#f0c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#a3272d]">
            <AlertTriangle className="size-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="mt-4 md:mt-5">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 rounded-[28px] border border-[#dfd1bc] bg-[#fffaf2]/80 py-24 text-[#8a7a63]">
              <Loader2 className="size-5 animate-spin" />
              読み込み中...
            </div>
          ) : (
            <>
              {(tab === "customers" || tab === "diffs") && (
                <CustomerList
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
                <ReplyList
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
      </div>

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-[#231815] px-5 py-2.5 text-sm text-[#fffaf2] shadow-2xl shadow-[#231815]/30">
            <CheckCircle2 className="size-4 text-[#7fd8a5]" />
            {notice}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <p className="rounded-[28px] border border-[#dfd1bc] bg-[#fffaf2]/80 py-16 text-center text-sm text-[#8a7a63]">
      該当するデータがありません
    </p>
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
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={onShowMore}
        className="rounded-full border border-[#d8cbb8] bg-white/90 px-6 py-2.5 text-sm font-medium text-[#231815] shadow-sm transition hover:bg-[#f8f3ea]"
      >
        さらに表示 ({shown} / {total})
      </button>
    </div>
  );
}

function CheckField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-1.5 text-xs ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } text-[#6f6259]`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-[18px] accent-[#e60012]"
      />
      {label}
    </label>
  );
}

function CustomerList({
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
  if (!totalCount) return <EmptyState />;
  return (
    <div>
      {/* PC: テーブル表示 */}
      <div className="hidden overflow-hidden rounded-[24px] border border-[#dfd1bc] bg-[#fffaf2] shadow-lg shadow-[#231815]/5 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#f3ead9] text-left text-xs text-[#8a7355]">
                <th className="px-4 py-3 font-medium">確認済み</th>
                <th className="px-4 py-3 font-medium">差分確認</th>
                <th className="px-4 py-3 font-medium">お客様名</th>
                <th className="px-4 py-3 font-medium">担当者</th>
                <th className="px-4 py-3 font-medium">申込日</th>
                <th className="px-4 py-3 font-medium">面談日</th>
                {showDiffColumns ? (
                  <>
                    <th className="px-4 py-3 font-medium">確認時点</th>
                    <th className="px-4 py-3 font-medium">現在</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 font-medium">着席</th>
                    <th className="px-4 py-3 font-medium">ステータス</th>
                    <th className="px-4 py-3 font-medium">成約プラン</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee3d0]">
              {rows.map((row) => {
                const confirmSaving = savingKeys.has(`setConfirmed:${row.rowKey}`);
                const diffSaving = savingKeys.has(`setDiffConfirmed:${row.rowKey}`);
                return (
                  <tr
                    key={row.rowKey}
                    className={`transition hover:bg-[#f8f3ea] ${
                      row.changeDetected ? "bg-[#fdeeee]/60" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={row.confirmed}
                        disabled={!writeEnabled || confirmSaving || !row.rowKey}
                        onChange={(event) => onToggle(row, "confirmed", event.target.checked)}
                        className="size-[18px] accent-[#e60012] disabled:opacity-40"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={row.diffConfirmed}
                        disabled={!writeEnabled || diffSaving || !row.rowKey}
                        onChange={(event) => onToggle(row, "diffConfirmed", event.target.checked)}
                        className="size-[18px] accent-[#e60012] disabled:opacity-40"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium">{row.customerName}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#6f6259]">{row.staffName}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#6f6259]">{row.appliedAt}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#6f6259]">{row.interviewAt}</td>
                    {showDiffColumns ? (
                      <>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[#6f6259]">
                          {row.confirmedStatus || "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium text-[#c90010]">
                          {row.currentStatus || "-"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[#6f6259]">{row.seated}</td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {row.status ? (
                            <span
                              className={`inline-block rounded-full px-2.5 py-1 text-xs ${statusChipClass(row.status)}`}
                            >
                              {row.status}
                            </span>
                          ) : (
                            <span className="text-[#b3a48c]">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[#6f6259]">{row.plan}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* スマホ: カード表示 */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const confirmSaving = savingKeys.has(`setConfirmed:${row.rowKey}`);
          const diffSaving = savingKeys.has(`setDiffConfirmed:${row.rowKey}`);
          return (
            <div
              key={row.rowKey}
              className={`rounded-[20px] border bg-[#fffaf2] p-4 shadow-lg shadow-[#231815]/5 ${
                row.changeDetected ? "border-[#f0c9c9]" : "border-[#dfd1bc]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{row.customerName}</p>
                  <p className="mt-0.5 text-xs text-[#8a7a63]">
                    担当: {row.staffName || "-"} / {row.seminar}
                  </p>
                </div>
                {(showDiffColumns ? row.currentStatus : row.status) && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${statusChipClass(
                      showDiffColumns ? row.currentStatus : row.status,
                    )}`}
                  >
                    {showDiffColumns ? row.currentStatus : row.status}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-[#8a7a63]">
                申込 {row.appliedAt || "-"} / 面談 {row.interviewAt || "-"}
              </p>
              {showDiffColumns && (
                <p className="mt-1 text-xs text-[#a3272d]">
                  確認時点: {row.confirmedStatus || "-"} → 現在: {row.currentStatus || "-"}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 border-t border-[#eee3d0] pt-3">
                <CheckField
                  label="確認済み"
                  checked={row.confirmed}
                  disabled={!writeEnabled || confirmSaving || !row.rowKey}
                  onChange={(value) => onToggle(row, "confirmed", value)}
                />
                <CheckField
                  label="差分確認"
                  checked={row.diffConfirmed}
                  disabled={!writeEnabled || diffSaving || !row.rowKey}
                  onChange={(value) => onToggle(row, "diffConfirmed", value)}
                />
              </div>
            </div>
          );
        })}
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
  rows: FalseReportRow[];
  savingKeys: Set<string>;
  writeEnabled: boolean;
  onSaveMemo: (report: FalseReportRow, memo: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!rows.length) return <EmptyState />;
  return (
    <div className="space-y-4">
      {rows.map((report) => {
        const id = falseReportId(report);
        const draft = drafts[id] ?? report.memo;
        const saving = savingKeys.has(`memo:${id}`);
        return (
          <div
            key={id}
            className="relative overflow-hidden rounded-[24px] border border-[#dfd1bc] bg-[#fffaf2] shadow-lg shadow-[#231815]/5"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#231815] via-[#e60012] to-[#231815]" />
            <div className="p-4 pt-5 md:p-5 md:pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold">{report.customerName}</span>
                  <span className="ml-2 text-sm text-[#8a7a63]">担当: {report.staffName || "-"}</span>
                </div>
                <span className="text-[11px] text-[#a08b6f]">
                  確認 {report.confirmedAt || "-"} / 差分検知 {report.detectedAt || "-"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[16px] bg-[#fdeeee] px-3.5 py-2.5 text-sm">
                  <p className="text-[11px] font-medium text-[#c9313a]">虚偽報告</p>
                  <p className="mt-0.5 text-[#7c2226]">{report.falseReport || "-"}</p>
                </div>
                <div className="rounded-[16px] bg-[#ecf5ec] px-3.5 py-2.5 text-sm">
                  <p className="text-[11px] font-medium text-[#3a7d44]">正しい報告</p>
                  <p className="mt-0.5 text-[#2c5e34]">{report.correctReport || "-"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
                <textarea
                  value={draft}
                  onChange={(event) =>
                    setDrafts((previous) => ({ ...previous, [id]: event.target.value }))
                  }
                  rows={2}
                  placeholder="メモを入力..."
                  className="flex-1 rounded-[16px] border border-[#d8cbb8] bg-white/95 px-3.5 py-2.5 text-sm shadow-inner placeholder:text-[#b3a48c] focus:border-[#231815]/50 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!writeEnabled || saving || draft === report.memo}
                  onClick={() => onSaveMemo(report, draft)}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-[#e60012] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#e60012]/20 transition hover:bg-[#c90010] disabled:opacity-40 disabled:shadow-none"
                >
                  {saving && <Loader2 className="size-3.5 animate-spin" />}
                  メモ保存
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReplyList({
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

  if (!totalCount) return <EmptyState />;

  const draftFor = (row: ReplyRow) => {
    const draft = drafts[row.rowIndex] ?? {};
    return {
      status: draft.status ?? row.status,
      contractStatus: draft.contractStatus ?? row.contractStatus,
      memo: draft.memo ?? row.memo,
    };
  };

  const setDraft = (rowIndex: number, patch: Record<string, string>) => {
    setDrafts((previous) => ({ ...previous, [rowIndex]: { ...previous[rowIndex], ...patch } }));
  };

  const clearDraft = (rowIndex: number) => {
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[rowIndex];
      return next;
    });
  };

  const inputClass =
    "w-full rounded-[14px] border border-[#d8cbb8] bg-white/95 px-3 py-2 text-sm shadow-inner placeholder:text-[#b3a48c] focus:border-[#231815]/50 focus:outline-none disabled:bg-[#f8f3ea] disabled:text-[#a08b6f]";

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row) => {
          const saving = savingKeys.has(`reply:${row.rowIndex}`);
          const draft = draftFor(row);
          const dirty =
            draft.status !== row.status ||
            draft.contractStatus !== row.contractStatus ||
            draft.memo !== row.memo;
          return (
            <div
              key={row.rowIndex}
              className="rounded-[20px] border border-[#dfd1bc] bg-[#fffaf2] p-4 shadow-lg shadow-[#231815]/5 md:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 items-center gap-3">
                  <label
                    className={`flex shrink-0 items-center gap-1.5 text-xs text-[#6f6259] ${
                      !writeEnabled || saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={row.contacted}
                      disabled={!writeEnabled || saving}
                      onChange={(event) => onUpdate(row, { contacted: event.target.checked })}
                      className="size-[18px] accent-[#e60012]"
                    />
                    連絡済み
                  </label>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.customerName}</p>
                    <p className="text-xs text-[#8a7a63]">営業: {row.salesman || "-"}</p>
                  </div>
                </div>
                <p className="text-xs text-[#a08b6f]">
                  面談 {row.interviewDate || "-"} {row.slot}
                </p>
              </div>
              <div className="mt-3 grid gap-2 border-t border-[#eee3d0] pt-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
                <div>
                  <label className="mb-1 block text-[11px] text-[#a08b6f]">着座/ステータス</label>
                  <input
                    type="text"
                    value={draft.status}
                    disabled={!writeEnabled}
                    onChange={(event) => setDraft(row.rowIndex, { status: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-[#a08b6f]">成約状況</label>
                  <input
                    type="text"
                    value={draft.contractStatus}
                    disabled={!writeEnabled}
                    onChange={(event) =>
                      setDraft(row.rowIndex, { contractStatus: event.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-[#a08b6f]">メモ</label>
                  <input
                    type="text"
                    value={draft.memo}
                    disabled={!writeEnabled}
                    onChange={(event) => setDraft(row.rowIndex, { memo: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={!writeEnabled || saving || !dirty}
                    onClick={() => {
                      onUpdate(row, draft);
                      clearDraft(row.rowIndex);
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#231815] px-5 py-2 text-sm font-medium text-[#fffaf2] shadow-lg shadow-[#231815]/20 transition hover:bg-[#3a2b24] disabled:opacity-40 disabled:shadow-none sm:w-auto"
                  >
                    {saving && <Loader2 className="size-3.5 animate-spin" />}
                    保存
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ShowMoreButton shown={rows.length} total={totalCount} onShowMore={onShowMore} />
    </div>
  );
}
