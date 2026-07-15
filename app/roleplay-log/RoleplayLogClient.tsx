"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  RefreshCw,
  Repeat2,
  Search,
  Send,
  UsersRound,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getRoleplayScopeText,
  roleplayMembers,
  roleplayScopeOptions,
  type RoleplayRecord,
  type RoleplayScope,
} from "@/app/lib/roleplayLog";

type ActiveView = "form" | "manager";
type StorageMode = "unknown" | "spreadsheet" | "redis" | "unconfigured";

type FormState = {
  sessionDate: string;
  sellerName: string;
  customerName: string;
  scopes: RoleplayScope[];
  note: string;
  reciprocal: boolean;
};

type SummaryRow = {
  name: string;
  sellerCount: number;
  customerCount: number;
  total: number;
};

export function RoleplayLogClient() {
  const [activeView, setActiveView] = useState<ActiveView>("form");
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [rangeStart, setRangeStart] = useState(() => firstDayOfCurrentMonth());
  const [rangeEnd, setRangeEnd] = useState(() => toDateInputValue(new Date()));
  const [nameFilter, setNameFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | RoleplayScope>("all");
  const [records, setRecords] = useState<RoleplayRecord[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode>("unknown");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; text: string }>({
    tone: "idle",
    text: "",
  });

  const refreshRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (rangeStart) params.set("from", rangeStart);
      if (rangeEnd) params.set("to", rangeEnd);

      const response = await fetch(`/api/roleplay-log?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        if (result.source === "unconfigured") {
          setStorageMode("unconfigured");
          setRecords([]);
        }
        throw new Error(result.error || "集計データを取得できませんでした。");
      }

      setStorageMode(result.source === "spreadsheet" ? "spreadsheet" : "redis");
      setRecords(Array.isArray(result.records) ? result.records : []);
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "集計データを取得できませんでした。",
      });
    } finally {
      setIsLoading(false);
    }
  }, [rangeEnd, rangeStart]);

  useEffect(() => {
    void refreshRecords();
  }, [refreshRecords]);

  const visibleRecords = useMemo(() => {
    return records
      .filter((record) => !rangeStart || record.sessionDate >= rangeStart)
      .filter((record) => !rangeEnd || record.sessionDate <= rangeEnd)
      .filter((record) => nameFilter === "all" || record.sellerName === nameFilter || record.customerName === nameFilter)
      .filter((record) => scopeFilter === "all" || record.scopes.includes(scopeFilter))
      .sort((a, b) => {
        if (a.sessionDate !== b.sessionDate) return b.sessionDate.localeCompare(a.sessionDate);
        return b.submittedAt.localeCompare(a.submittedAt);
      });
  }, [nameFilter, rangeEnd, rangeStart, records, scopeFilter]);

  const summaryRows = useMemo(() => {
    const rows = new Map<string, SummaryRow>();
    for (const name of roleplayMembers) {
      rows.set(name, { name, sellerCount: 0, customerCount: 0, total: 0 });
    }

    for (const record of visibleRecords) {
      const seller = rows.get(record.sellerName) ?? {
        name: record.sellerName,
        sellerCount: 0,
        customerCount: 0,
        total: 0,
      };
      seller.sellerCount += 1;
      seller.total += 1;
      rows.set(record.sellerName, seller);

      const customer = rows.get(record.customerName) ?? {
        name: record.customerName,
        sellerCount: 0,
        customerCount: 0,
        total: 0,
      };
      customer.customerCount += 1;
      customer.total += 1;
      rows.set(record.customerName, customer);
    }

    return Array.from(rows.values()).sort((a, b) => {
      if (a.total !== b.total) return b.total - a.total;
      return a.name.localeCompare(b.name, "ja");
    });
  }, [visibleRecords]);

  const sellerEqualsCustomer = form.sellerName === form.customerName;
  const scopeMissing = form.scopes.length === 0;
  const submitCount = form.reciprocal ? 2 : 1;
  const totalSellerCount = visibleRecords.length;
  const totalParticipantCount = visibleRecords.length * 2;
  const storageUnavailable = storageMode === "unconfigured";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sellerEqualsCustomer) {
      setStatus({ tone: "error", text: "営業役とお客さん役は別の名前を選択してください。" });
      return;
    }

    if (scopeMissing) {
      setStatus({ tone: "error", text: "実施範囲を1つ以上選択してください。" });
      return;
    }

    if (storageUnavailable) {
      setStatus({ tone: "error", text: "共有保存先が未設定のため登録できません。" });
      return;
    }

    setIsSubmitting(true);
    setStatus({ tone: "idle", text: "" });

    try {
      const response = await fetch("/api/roleplay-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "登録に失敗しました。");
      }

      await refreshRecords();

      setStatus({ tone: "success", text: result.message || `${submitCount}件登録しました。` });
      setForm((current) => ({ ...current, note: "", reciprocal: false }));
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "登録に失敗しました。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-4 text-[#14211f] sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="grid gap-4 border-b border-[#d9e2df] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#66756f]">ROLEPLAY LOG</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-[#14211f] sm:text-3xl">
              ロープレ実施記録
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="記録" value={visibleRecords.length} />
            <Metric label="役割回数" value={totalParticipantCount} />
            <Metric label="営業回数" value={totalSellerCount} />
          </div>
        </header>

        <div className="grid gap-2 sm:w-fit sm:grid-cols-2" role="tablist" aria-label="ロープレ実施記録">
          <TabButton active={activeView === "form"} icon={<ClipboardCheck size={17} />} onClick={() => setActiveView("form")}>
            入力
          </TabButton>
          <TabButton active={activeView === "manager"} icon={<BarChart3 size={17} />} onClick={() => setActiveView("manager")}>
            集計
          </TabButton>
        </div>

        {status.text ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm font-medium ${
              status.tone === "success"
                ? "border-[#9cd5c5] bg-[#e9f8f3] text-[#0f5f52]"
                : "border-[#f1b4a7] bg-[#fff1ed] text-[#9a3412]"
            }`}
            aria-live="polite"
          >
            {status.text}
          </div>
        ) : null}

        {activeView === "form" ? (
          <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.45fr)]">
            <section className="grid gap-5 rounded-md border border-[#d9e2df] bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="実施日" icon={<CalendarDays size={18} />}>
                  <Input
                    type="date"
                    value={form.sessionDate}
                    onChange={(event) => setForm((current) => ({ ...current, sessionDate: event.target.value }))}
                    className="h-12 bg-white text-[16px]"
                    required
                  />
                </Field>

                <fieldset className="grid gap-2">
                  <legend className="flex items-center gap-2 text-sm font-semibold text-[#273a34]">
                    <span className="text-[#0f766e]">
                      <Search size={18} />
                    </span>
                    実施範囲
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roleplayScopeOptions.map((option) => {
                      const checked = form.scopes.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setForm((current) => toggleScope(current, option.value))}
                          aria-pressed={checked}
                          className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                            checked
                              ? "border-[#0f766e] bg-[#e9f8f3] text-[#0f5f52]"
                              : "border-[#d9e2df] bg-white text-[#273a34] hover:border-[#0f766e]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="営業役" icon={<UsersRound size={18} />}>
                  <MemberSelect
                    value={form.sellerName}
                    onChange={(value) => setForm((current) => ({ ...current, sellerName: value }))}
                  />
                </Field>

                <Field label="お客さん役" icon={<UsersRound size={18} />}>
                  <MemberSelect
                    value={form.customerName}
                    onChange={(value) => setForm((current) => ({ ...current, customerName: value }))}
                  />
                </Field>
              </div>

              <Field label="メモ">
                <Textarea
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="任意"
                  className="min-h-24 bg-white text-[16px]"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, reciprocal: !current.reciprocal }))}
                  disabled={sellerEqualsCustomer}
                  aria-pressed={form.reciprocal}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    form.reciprocal
                      ? "border-[#0f766e] bg-[#0f766e] text-white"
                      : "border-[#cbd8d3] bg-[#f8fbfa] text-[#243b35] hover:border-[#0f766e]"
                  }`}
                >
                  <Repeat2 size={18} aria-hidden="true" />
                  役割入れ替え分も登録
                </button>

                <Button
                  type="submit"
                  disabled={isSubmitting || sellerEqualsCustomer || scopeMissing || storageUnavailable}
                  className="h-12 rounded-md bg-[#17211d] px-5 text-sm font-bold text-white hover:bg-[#24362f]"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                  {submitCount}件登録
                </Button>
              </div>
            </section>

            <aside className="grid content-start gap-3 rounded-md border border-[#d9e2df] bg-[#17211d] p-4 text-white shadow-sm sm:p-5">
              <h2 className="text-lg font-bold">登録内容</h2>
              <PreviewRow label="実施日" value={formatDate(form.sessionDate)} />
              <PreviewRow label="営業役" value={form.sellerName} />
              <PreviewRow label="お客さん役" value={form.customerName} />
              <PreviewRow label="実施範囲" value={getRoleplayScopeText(form.scopes) || "未選択"} />
              <PreviewRow
                label="件数"
                value={form.reciprocal ? "2件（役割入れ替えあり）" : "1件"}
              />
              <PreviewRow
                label="保存先"
                value={getStorageModeLabel(storageMode)}
              />
            </aside>
          </form>
        ) : (
          <section className="grid gap-5">
            <div className="grid gap-3 rounded-md border border-[#d9e2df] bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <Field label="開始日">
                <Input
                  type="date"
                  value={rangeStart}
                  onChange={(event) => setRangeStart(event.target.value)}
                  className="h-11 bg-white text-[16px]"
                />
              </Field>
              <Field label="終了日">
                <Input
                  type="date"
                  value={rangeEnd}
                  onChange={(event) => setRangeEnd(event.target.value)}
                  className="h-11 bg-white text-[16px]"
                />
              </Field>
              <Field label="名前">
                <select
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-white px-3 text-[16px] outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
                >
                  <option value="all">全員</option>
                  {roleplayMembers.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="実施範囲">
                <select
                  value={scopeFilter}
                  onChange={(event) => setScopeFilter(event.target.value as "all" | RoleplayScope)}
                  className="h-11 w-full rounded-lg border border-input bg-white px-3 text-[16px] outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
                >
                  <option value="all">すべて</option>
                  {roleplayScopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Button
                type="button"
                onClick={() => void refreshRecords()}
                disabled={isLoading}
                className="h-11 self-end rounded-md bg-[#0f766e] text-white hover:bg-[#0b5f59]"
              >
                <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
                更新
              </Button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
              <section className="rounded-md border border-[#d9e2df] bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-[#e3ebe8] px-4 py-3">
                  <h2 className="font-bold">役割別回数</h2>
                  <span className="rounded-md bg-[#eef6f4] px-2 py-1 text-xs font-semibold text-[#0f5f52]">
                    {getStorageModeLabel(storageMode)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-[#f6f8fb] text-xs text-[#60736c]">
                      <tr>
                        <th className="px-4 py-3">名前</th>
                        <th className="px-4 py-3 text-right">営業役</th>
                        <th className="px-4 py-3 text-right">お客さん役</th>
                        <th className="px-4 py-3 text-right">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((row) => (
                        <tr key={row.name} className="border-t border-[#edf1ef]">
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.sellerCount}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.customerCount}</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-md border border-[#d9e2df] bg-white shadow-sm">
                <div className="border-b border-[#e3ebe8] px-4 py-3">
                  <h2 className="font-bold">明細</h2>
                </div>
                <div className="max-h-[620px] overflow-auto">
                  {visibleRecords.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-[#60736c]">該当する記録はありません。</p>
                  ) : (
                    <div className="divide-y divide-[#edf1ef]">
                      {visibleRecords.map((record) => (
                        <article key={record.id} className="grid gap-2 px-4 py-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-semibold">
                              {record.sellerName} → {record.customerName}
                            </div>
                            <div className="shrink-0 text-xs text-[#60736c]">{formatDate(record.sessionDate)}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {record.scopeLabels.map((label) => (
                              <span key={label} className="rounded-md bg-[#eef6f4] px-2 py-1 text-[#0f5f52]">
                                {label}
                              </span>
                            ))}
                            {record.pairDirection === "reversed" ? (
                              <span className="rounded-md bg-[#fff7df] px-2 py-1 text-[#8a5a00]">役割入れ替え</span>
                            ) : null}
                          </div>
                          {record.note ? <p className="break-words text-[#4d6059]">{record.note}</p> : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function createInitialForm(): FormState {
  return {
    sessionDate: toDateInputValue(new Date()),
    sellerName: roleplayMembers[0] ?? "",
    customerName: roleplayMembers[1] ?? "",
    scopes: ["full"],
    note: "",
    reciprocal: false,
  };
}

function toggleScope(form: FormState, scope: RoleplayScope): FormState {
  const scopes = form.scopes.includes(scope)
    ? form.scopes.filter((current) => current !== scope)
    : [...form.scopes, scope];

  return { ...form, scopes };
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-[#273a34]">
        {icon ? <span className="text-[#0f766e]">{icon}</span> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

function MemberSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-lg border border-input bg-white px-3 text-[16px] outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
      required
    >
      {roleplayMembers.map((member) => (
        <option key={member} value={member}>
          {member}
        </option>
      ))}
    </select>
  );
}

function TabButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
        active
          ? "border-[#17211d] bg-[#17211d] text-white"
          : "border-[#cbd8d3] bg-white text-[#243b35] hover:border-[#0f766e]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#d9e2df] bg-white px-3 py-2 shadow-sm">
      <div className="text-lg font-bold tabular-nums text-[#14211f]">{value}</div>
      <div className="text-xs font-medium text-[#66756f]">{label}</div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.07] px-3 py-3">
      <dt className="text-xs font-semibold text-[#b7c8c2]">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-white">{value}</dd>
    </div>
  );
}

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function firstDayOfCurrentMonth() {
  const date = new Date();
  date.setDate(1);
  return toDateInputValue(date);
}

function formatDate(value: string) {
  if (!value) return "未選択";
  return new Date(`${value}T00:00:00`).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

function getStorageModeLabel(mode: StorageMode) {
  if (mode === "spreadsheet") return "スプレッドシート共有";
  if (mode === "redis") return "共有データ";
  if (mode === "unconfigured") return "共有保存先未設定";
  return "確認中";
}
