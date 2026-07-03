"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileWarning,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type {
  CustomerRow,
  FalseReportRow,
  GuardAlert,
  ReportGuardData,
  TriageState,
} from "./types";

type TabKey = "inbox" | "customers" | "records";
type InboxFilter = "pending" | "investigating" | "confirmed_false" | "done" | "all";

const PAGE_SIZE = 100;
const DATA_CACHE_KEY = "report-guard-data-v1";

const inboxFilters: { key: InboxFilter; label: string }[] = [
  { key: "pending", label: "未処理" },
  { key: "investigating", label: "要調査" },
  { key: "confirmed_false", label: "虚偽確定" },
  { key: "done", label: "問題なし" },
  { key: "all", label: "すべて" },
];

function customerId(row: CustomerRow) {
  return `${row.rowKey}#${row.rowIndex}`;
}

function falseReportId(report: FalseReportRow) {
  return report.rowKey || report.managementId || String(report.rowIndex);
}

async function postAction(payload: Record<string, unknown>) {
  const response = await fetch("/api/report-guard", {
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

function matchInboxFilter(alert: GuardAlert, filter: InboxFilter) {
  if (filter === "all") return true;
  if (filter === "pending") return alert.triage === "";
  if (filter === "done") return alert.triage === "ok";
  return alert.triage === filter;
}

export function ReportGuardClient() {
  const [data, setData] = useState<ReportGuardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<TabKey>("inbox");
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("pending");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/report-guard", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `データ取得に失敗しました (status=${response.status})`);
      }
      const payload = (await response.json()) as ReportGuardData;
      setData(payload);
      try {
        sessionStorage.setItem(DATA_CACHE_KEY, JSON.stringify(payload));
      } catch {
        // キャッシュ失敗は無視
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(DATA_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as ReportGuardData;
        setData((previous) => previous ?? parsed);
      }
    } catch {
      // 壊れたキャッシュは無視
    }
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, query, dateFrom, unconfirmedOnly, inboxFilter]);

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

  const requireWrite = useCallback(() => {
    if (data?.writeEnabled) return true;
    setErrorMessage("書き込みは未接続です (Apps Script の設定が必要)。");
    return false;
  }, [data?.writeEnabled]);

  // トリアージ: 押した瞬間に反映、失敗時のみ巻き戻す
  const setTriage = useCallback(
    (alert: GuardAlert, state: TriageState, memo: string) => {
      if (!requireWrite()) return;
      const previousState = alert.triage;
      const previousMemo = alert.triageMemo;
      const apply = (nextState: TriageState, nextMemo: string) => {
        setData((previous) =>
          previous
            ? {
                ...previous,
                alerts: previous.alerts.map((item) =>
                  item.rowKey === alert.rowKey
                    ? { ...item, triage: nextState, triageMemo: nextMemo }
                    : item,
                ),
              }
            : previous,
        );
      };

      apply(state, memo);
      markSaving(`triage:${alert.rowKey}`, true);
      setErrorMessage("");
      postAction({ action: "setTriage", rowKey: alert.rowKey, state, memo })
        .then(() => setNotice("保存しました"))
        .catch((error) => {
          apply(previousState, previousMemo);
          setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました");
        })
        .finally(() => markSaving(`triage:${alert.rowKey}`, false));
    },
    [markSaving, requireWrite],
  );

  const setCustomerFlag = useCallback(
    (row: CustomerRow, field: "confirmed" | "diffConfirmed", value: boolean) => {
      if (!requireWrite()) return;
      const action = field === "confirmed" ? "setConfirmed" : "setDiffConfirmed";
      const id = customerId(row);
      const applyValue = (flag: boolean) => {
        setData((previous) =>
          previous
            ? {
                ...previous,
                customers: previous.customers.map((customer) =>
                  customerId(customer) === id ? { ...customer, [field]: flag } : customer,
                ),
              }
            : previous,
        );
      };

      applyValue(value);
      markSaving(`${action}:${id}`, true);
      setErrorMessage("");
      postAction({ action, rowKey: row.rowKey, rowIndex: row.rowIndex, value })
        .then(() => setNotice("保存しました"))
        .catch((error) => {
          applyValue(!value);
          setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました");
        })
        .finally(() => markSaving(`${action}:${id}`, false));
    },
    [markSaving, requireWrite],
  );

  const saveFalseReportMemo = useCallback(
    (target: FalseReportRow, memo: string) => {
      if (!requireWrite()) return;
      const id = falseReportId(target);
      markSaving(`memo:${id}`, true);
      setErrorMessage("");
      postAction({
        action: "saveFalseReportMemo",
        rowKey: target.rowKey,
        managementId: target.managementId,
        rowIndex: target.rowIndex,
        customerName: target.customerName,
        memo,
      })
        .then(() => {
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
          setNotice("保存しました");
        })
        .catch((error) =>
          setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました"),
        )
        .finally(() => markSaving(`memo:${id}`, false));
    },
    [markSaving, requireWrite],
  );

  const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);
  const kpi = useMemo(
    () => ({
      pending: alerts.filter((alert) => alert.triage === "").length,
      investigating: alerts.filter((alert) => alert.triage === "investigating").length,
      confirmedFalse: alerts.filter((alert) => alert.triage === "confirmed_false").length,
      done: alerts.filter((alert) => alert.triage === "ok").length,
    }),
    [alerts],
  );

  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const matchesQuery = useCallback(
    (...values: string[]) =>
      !normalizedQuery || values.some((value) => value.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  );

  const filteredAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          matchInboxFilter(alert, inboxFilter) &&
          matchesQuery(alert.customerName, alert.staffName, alert.beforeStatus, alert.afterStatus),
      ),
    [alerts, inboxFilter, matchesQuery],
  );

  const filteredCustomers = useMemo(
    () =>
      (data?.customers ?? []).filter((customer) => {
        if (unconfirmedOnly && customer.confirmed) return false;
        if (dateFrom && (!customer.interviewDate || customer.interviewDate < dateFrom)) return false;
        return matchesQuery(customer.customerName, customer.staffName, customer.status, customer.seminar);
      }),
    [data?.customers, dateFrom, matchesQuery, unconfirmedOnly],
  );

  const filteredFalseReports = useMemo(
    () =>
      (data?.falseReports ?? []).filter((report) =>
        matchesQuery(report.customerName, report.staffName, report.confirmedStatus, report.currentStatus),
      ),
    [data?.falseReports, matchesQuery],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ダークヒーロー: 開いた瞬間に「見るべき件数」だけが分かる */}
      <header className="bg-[#211713] text-[#fffaf2]">
        <div className="mx-auto max-w-5xl px-4 pb-5 pt-4 md:px-6 md:pb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e60012] shadow-lg shadow-[#e60012]/30">
                <ShieldCheck className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-wide md:text-lg">
                  レポートガード
                </h1>
                <p className="truncate text-[11px] text-[#c8b9a4]">
                  報告変更の監視 — 見るのは検知された案件だけ
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {data && !data.writeEnabled && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-[#f2c9c2]">
                  読み取り専用
                </span>
              )}
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-medium text-[#fffaf2] transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">更新</span>
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 md:gap-3">
            <KpiTile
              label="未処理"
              value={kpi.pending}
              highlight={kpi.pending > 0}
              onClick={() => {
                setTab("inbox");
                setInboxFilter("pending");
              }}
            />
            <KpiTile
              label="要調査"
              value={kpi.investigating}
              onClick={() => {
                setTab("inbox");
                setInboxFilter("investigating");
              }}
            />
            <KpiTile
              label="虚偽確定"
              value={kpi.confirmedFalse}
              onClick={() => {
                setTab("inbox");
                setInboxFilter("confirmed_false");
              }}
            />
            <KpiTile
              label="問題なし"
              value={kpi.done}
              onClick={() => {
                setTab("inbox");
                setInboxFilter("done");
              }}
            />
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#211713] via-[#e60012] to-[#211713]" />
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6">
        <nav className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <div className="flex w-max gap-2 md:w-auto">
            <TabButton
              active={tab === "inbox"}
              icon={Inbox}
              label="受信箱"
              count={kpi.pending}
              onClick={() => setTab("inbox")}
            />
            <TabButton
              active={tab === "customers"}
              icon={Users}
              label="顧客"
              count={data?.customers.length ?? 0}
              onClick={() => setTab("customers")}
            />
            <TabButton
              active={tab === "records"}
              icon={FileWarning}
              label="記録"
              count={data?.falseReports.length ?? 0}
              onClick={() => setTab("records")}
            />
          </div>
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-52 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a08b6f]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="顧客名・担当者で検索"
              className="w-full rounded-full border border-[#d8cbb8] bg-white/95 py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-[#b3a48c] focus:border-[#231815]/50 focus:outline-none"
            />
          </div>
          {tab === "customers" && (
            <>
              <label className="flex items-center gap-1.5 rounded-full border border-[#dfd1bc] bg-white/90 py-1.5 pl-3.5 pr-2 text-sm text-[#6f6259]">
                <CalendarDays className="size-4 shrink-0 text-[#a08b6f]" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="bg-transparent text-sm text-[#231815] focus:outline-none"
                />
                <span className="shrink-0 text-xs">〜</span>
                {dateFrom && (
                  <button
                    type="button"
                    onClick={() => setDateFrom("")}
                    aria-label="面談日フィルタを解除"
                    className="rounded-full p-1 text-[#a08b6f] hover:bg-[#f3ead9]"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dfd1bc] bg-white/80 px-3.5 py-2 text-sm text-[#6f6259]">
                <input
                  type="checkbox"
                  checked={unconfirmedOnly}
                  onChange={(event) => setUnconfirmedOnly(event.target.checked)}
                  className="size-4 accent-[#e60012]"
                />
                未確認のみ
              </label>
            </>
          )}
          {tab === "inbox" && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
              {inboxFilters.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setInboxFilter(key)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                    inboxFilter === key
                      ? "bg-[#231815] text-[#fffaf2]"
                      : "border border-[#dfd1bc] bg-white/80 text-[#6f6259] hover:bg-[#fffaf2]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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

        <div className="mt-4">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 rounded-[28px] border border-[#dfd1bc] bg-[#fffaf2]/80 py-24 text-[#8a7a63]">
              <Loader2 className="size-5 animate-spin" />
              読み込み中...
            </div>
          ) : (
            <>
              {tab === "inbox" && (
                <InboxList
                  alerts={filteredAlerts}
                  filter={inboxFilter}
                  savingKeys={savingKeys}
                  writeEnabled={data?.writeEnabled ?? false}
                  onTriage={setTriage}
                />
              )}
              {tab === "customers" && (
                <CustomerCompactList
                  rows={filteredCustomers.slice(0, visibleCount)}
                  totalCount={filteredCustomers.length}
                  savingKeys={savingKeys}
                  writeEnabled={data?.writeEnabled ?? false}
                  onToggle={setCustomerFlag}
                  onShowMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
                />
              )}
              {tab === "records" && (
                <RecordsList
                  reports={filteredFalseReports}
                  confirmedFalseAlerts={alerts.filter((alert) => alert.triage === "confirmed_false")}
                  savingKeys={savingKeys}
                  writeEnabled={data?.writeEnabled ?? false}
                  onSaveMemo={saveFalseReportMemo}
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

function KpiTile({
  label,
  value,
  highlight,
  onClick,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-3 py-2.5 text-left transition md:px-4 md:py-3 ${
        highlight
          ? "bg-[#e60012] text-white shadow-lg shadow-[#e60012]/30"
          : "bg-white/10 text-[#fffaf2] hover:bg-white/15"
      }`}
    >
      <p className={`text-[10px] md:text-[11px] ${highlight ? "text-white/80" : "text-[#c8b9a4]"}`}>
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold leading-none md:text-2xl">{value}</p>
    </button>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: typeof Users;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#231815] text-[#fffaf2] shadow-lg shadow-[#231815]/20"
          : "border border-[#dfd1bc] bg-white/80 text-[#231815] hover:bg-[#fffaf2]"
      }`}
    >
      <Icon className={`size-4 ${active ? "text-[#f2c9c2]" : "text-[#a08b6f]"}`} />
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
          active ? "bg-white/15" : "bg-[#f3ead9] text-[#8a7355]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function InboxList({
  alerts,
  filter,
  savingKeys,
  writeEnabled,
  onTriage,
}: {
  alerts: GuardAlert[];
  filter: InboxFilter;
  savingKeys: Set<string>;
  writeEnabled: boolean;
  onTriage: (alert: GuardAlert, state: TriageState, memo: string) => void;
}) {
  if (!alerts.length) {
    return (
      <div className="rounded-[28px] border border-[#dfd1bc] bg-[#fffaf2]/80 py-16 text-center">
        <ShieldCheck className="mx-auto size-10 text-[#7fb894]" />
        <p className="mt-3 text-sm font-medium text-[#231815]">
          {filter === "pending" ? "未処理の案件はありません 🎉" : "該当する案件がありません"}
        </p>
        <p className="mt-1 text-xs text-[#8a7a63]">
          確認済みチェック後にステータスが変更されると、ここに自動で届きます
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          saving={savingKeys.has(`triage:${alert.rowKey}`)}
          writeEnabled={writeEnabled}
          onTriage={onTriage}
        />
      ))}
    </div>
  );
}

const triageButtons: { state: TriageState; label: string; activeClass: string }[] = [
  { state: "ok", label: "問題なし", activeClass: "bg-[#2c5e34] text-white" },
  { state: "investigating", label: "要調査", activeClass: "bg-[#9a6b1f] text-white" },
  { state: "confirmed_false", label: "虚偽確定", activeClass: "bg-[#e60012] text-white" },
];

const AlertCard = memo(function AlertCard({
  alert,
  saving,
  writeEnabled,
  onTriage,
}: {
  alert: GuardAlert;
  saving: boolean;
  writeEnabled: boolean;
  onTriage: (alert: GuardAlert, state: TriageState, memo: string) => void;
}) {
  const [memoDraft, setMemoDraft] = useState(alert.triageMemo);

  return (
    <div
      className={`overflow-hidden rounded-[20px] border bg-[#fffaf2] shadow-lg shadow-[#231815]/5 ${
        alert.triage === "" ? "border-[#f0c9c9]" : "border-[#dfd1bc]"
      }`}
    >
      <div className="flex">
        <div
          className={`w-1.5 shrink-0 ${
            alert.kind === "auto" ? "bg-[#e60012]" : "bg-[#d9b96a]"
          }`}
        />
        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-semibold">{alert.customerName}</span>
              <span className="text-xs text-[#8a7a63]">担当: {alert.staffName || "-"}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  alert.kind === "auto"
                    ? "bg-[#e60012]/10 text-[#c90010]"
                    : "bg-[#f6ecd4] text-[#8a7355]"
                }`}
              >
                {alert.kind === "auto" ? "自動検知" : "手動チェック"}
              </span>
            </div>
            <span className="text-[11px] text-[#a08b6f]">
              面談 {alert.interviewAt || "-"}
              {alert.confirmedAt ? ` / 確認 ${alert.confirmedAt}` : ""}
            </span>
          </div>

          <p className="mt-2 text-[15px] leading-relaxed">
            変更前【
            <span className="font-semibold text-[#c90010]">{alert.beforeStatus || "-"}</span>
            】▶︎ 変更後【
            <span className="font-semibold text-[#2c5e34]">{alert.afterStatus || "-"}</span>
            】
          </p>

          <div className="mt-3 flex flex-col gap-2 border-t border-[#eee3d0] pt-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={memoDraft}
              onChange={(event) => setMemoDraft(event.target.value)}
              disabled={!writeEnabled}
              placeholder="対応メモ (任意)"
              className="min-w-0 flex-1 rounded-full border border-[#d8cbb8] bg-white/95 px-3.5 py-2 text-sm shadow-inner placeholder:text-[#b3a48c] focus:border-[#231815]/50 focus:outline-none disabled:bg-[#f8f3ea]"
            />
            <div className="flex shrink-0 items-center gap-1.5">
              {saving && <Loader2 className="size-4 animate-spin text-[#a08b6f]" />}
              {triageButtons.map(({ state, label, activeClass }) => (
                <button
                  key={state}
                  type="button"
                  disabled={!writeEnabled || saving}
                  onClick={() => onTriage(alert, alert.triage === state ? "" : state, memoDraft)}
                  className={`rounded-full px-3.5 py-2 text-xs font-medium transition disabled:opacity-40 ${
                    alert.triage === state
                      ? activeClass
                      : "border border-[#d8cbb8] bg-white/90 text-[#6f6259] hover:bg-[#f8f3ea]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

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

type CustomerItemProps = {
  row: CustomerRow;
  writeEnabled: boolean;
  confirmSaving: boolean;
  diffSaving: boolean;
  onToggle: (row: CustomerRow, field: "confirmed" | "diffConfirmed", value: boolean) => void;
};

const CustomerCompactRow = memo(function CustomerCompactRow({
  row,
  writeEnabled,
  confirmSaving,
  diffSaving,
  onToggle,
}: CustomerItemProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border border-[#eee3d0] bg-[#fffaf2] px-4 py-3">
      <label
        className={`flex shrink-0 items-center gap-1.5 text-xs text-[#6f6259] ${
          !writeEnabled || confirmSaving ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={row.confirmed}
          disabled={!writeEnabled || confirmSaving || !row.rowKey}
          onChange={(event) => onToggle(row, "confirmed", event.target.checked)}
          className="size-[18px] accent-[#e60012]"
        />
        確認
      </label>
      <label
        className={`flex shrink-0 items-center gap-1.5 text-xs text-[#6f6259] ${
          !writeEnabled || diffSaving ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={row.diffConfirmed}
          disabled={!writeEnabled || diffSaving || !row.rowKey}
          onChange={(event) => onToggle(row, "diffConfirmed", event.target.checked)}
          className="size-[18px] accent-[#e60012]"
        />
        差分
      </label>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{row.customerName}</p>
        <p className="truncate text-[11px] text-[#8a7a63]">
          {row.staffName || "-"} / 面談 {row.interviewAt || "-"}
        </p>
      </div>
      {row.status && (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${statusChipClass(row.status)}`}
        >
          {row.status}
        </span>
      )}
    </div>
  );
});

function CustomerCompactList({
  rows,
  totalCount,
  savingKeys,
  writeEnabled,
  onToggle,
  onShowMore,
}: {
  rows: CustomerRow[];
  totalCount: number;
  savingKeys: Set<string>;
  writeEnabled: boolean;
  onToggle: (row: CustomerRow, field: "confirmed" | "diffConfirmed", value: boolean) => void;
  onShowMore: () => void;
}) {
  if (!totalCount) {
    return (
      <p className="rounded-[28px] border border-[#dfd1bc] bg-[#fffaf2]/80 py-16 text-center text-sm text-[#8a7a63]">
        該当するデータがありません
      </p>
    );
  }
  return (
    <div>
      <div className="space-y-2">
        {rows.map((row) => {
          const id = customerId(row);
          return (
            <CustomerCompactRow
              key={id}
              row={row}
              writeEnabled={writeEnabled}
              confirmSaving={savingKeys.has(`setConfirmed:${id}`)}
              diffSaving={savingKeys.has(`setDiffConfirmed:${id}`)}
              onToggle={onToggle}
            />
          );
        })}
      </div>
      <ShowMoreButton shown={rows.length} total={totalCount} onShowMore={onShowMore} />
    </div>
  );
}

function RecordsList({
  reports,
  confirmedFalseAlerts,
  savingKeys,
  writeEnabled,
  onSaveMemo,
}: {
  reports: FalseReportRow[];
  confirmedFalseAlerts: GuardAlert[];
  savingKeys: Set<string>;
  writeEnabled: boolean;
  onSaveMemo: (report: FalseReportRow, memo: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <div className="space-y-5">
      {confirmedFalseAlerts.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium text-[#8a7355]">
            受信箱で「虚偽確定」にした案件 ({confirmedFalseAlerts.length})
          </h2>
          <div className="space-y-2">
            {confirmedFalseAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-[16px] border border-[#f0c9c9] bg-[#fffaf2] px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold">{alert.customerName}</span>
                    <span className="ml-2 text-xs text-[#8a7a63]">担当: {alert.staffName || "-"}</span>
                  </div>
                  <span className="text-[11px] text-[#a08b6f]">面談 {alert.interviewAt || "-"}</span>
                </div>
                <p className="mt-1 text-sm">
                  変更前【<span className="font-medium text-[#c90010]">{alert.beforeStatus || "-"}</span>
                  】▶︎ 変更後【
                  <span className="font-medium text-[#2c5e34]">{alert.afterStatus || "-"}</span>】
                </p>
                {alert.triageMemo && (
                  <p className="mt-1 text-xs text-[#8a7a63]">メモ: {alert.triageMemo}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium text-[#8a7355]">虚偽報告の記録 ({reports.length})</h2>
        {!reports.length ? (
          <p className="rounded-[28px] border border-[#dfd1bc] bg-[#fffaf2]/80 py-12 text-center text-sm text-[#8a7a63]">
            記録はありません
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const id = falseReportId(report);
              const draft = drafts[id] ?? report.memo;
              const saving = savingKeys.has(`memo:${id}`);
              return (
                <div
                  key={id}
                  className="relative overflow-hidden rounded-[20px] border border-[#dfd1bc] bg-[#fffaf2] p-4 shadow-lg shadow-[#231815]/5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold">{report.customerName}</span>
                      <span className="ml-2 text-sm text-[#8a7a63]">
                        担当: {report.staffName || "-"}
                      </span>
                      {report.legacy && (
                        <span className="ml-2 inline-block rounded-full bg-[#f3ead9] px-2 py-0.5 align-middle text-[10px] font-medium text-[#8a7355]">
                          旧シート移行分
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#a08b6f]">
                      {report.legacy ? `移行日 ${report.detectedAt || "-"}` : `検知 ${report.detectedAt || "-"}`}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">
                    変更前【
                    <span className="font-medium text-[#c90010]">
                      {report.confirmedStatus || "記録なし"}
                    </span>
                    】▶︎ 変更後【
                    <span className="font-medium text-[#2c5e34]">
                      {report.currentStatus || report.correctReport || "-"}
                    </span>
                    】
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={draft}
                      onChange={(event) =>
                        setDrafts((previous) => ({ ...previous, [id]: event.target.value }))
                      }
                      disabled={!writeEnabled}
                      placeholder="メモを入力..."
                      className="min-w-0 flex-1 rounded-full border border-[#d8cbb8] bg-white/95 px-3.5 py-2 text-sm shadow-inner placeholder:text-[#b3a48c] focus:border-[#231815]/50 focus:outline-none disabled:bg-[#f8f3ea]"
                    />
                    <button
                      type="button"
                      disabled={!writeEnabled || saving || draft === report.memo}
                      onClick={() => onSaveMemo(report, draft)}
                      className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#231815] px-4 py-2 text-xs font-medium text-[#fffaf2] transition hover:bg-[#3a2b24] disabled:opacity-40"
                    >
                      {saving && <Loader2 className="size-3 animate-spin" />}
                      メモ保存
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
