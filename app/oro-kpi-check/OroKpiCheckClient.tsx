"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ClipboardPaste,
  Copy,
  Database,
  RefreshCw,
  RotateCcw,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { MemberDifference, MetricDifference, OroKpiCheckData } from "./data";
import { compareOroReport } from "./reportComparison";

type Props = {
  initialData: OroKpiCheckData | null;
  initialMonth?: string;
};

function formatTimestamp(value: string) {
  if (!value) return "未取得";
  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetricValue(value: number, unit: MetricDifference["unit"]) {
  const rendered = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit === "pt" ? `${rendered}%` : rendered;
}

function formatDifference(value: number, unit: MetricDifference["unit"]) {
  const rendered = Number.isInteger(value) ? String(Math.abs(value)) : Math.abs(value).toFixed(1);
  const suffix = unit === "pt" ? "pt" : "件";
  return `${value > 0 ? "+" : "-"}${rendered}${suffix}`;
}

function DifferenceTile({ difference }: { difference: MetricDifference }) {
  if (difference.reported === null || difference.difference === null) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">{difference.label}</p>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">未入力</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <MetricDatum label="正解" value={formatMetricValue(difference.expected, difference.unit)} />
          <MetricDatum label="報告" value="—" />
        </div>
      </div>
    );
  }

  const isOver = difference.difference > 0;
  const palette = isOver
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className={`rounded-xl border p-4 ${palette}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{difference.label}</p>
          <p className="mt-1 text-xs font-semibold opacity-70">{isOver ? "多く報告" : "少なく報告"}</p>
        </div>
        {isOver ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
      </div>
      <p className="mt-3 font-mono text-3xl font-black tracking-tight">
        {formatDifference(difference.difference, difference.unit)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-center text-slate-900">
        <MetricDatum label="正解" value={formatMetricValue(difference.expected, difference.unit)} />
        <MetricDatum label="報告" value={formatMetricValue(difference.reported, difference.unit)} />
      </div>
    </div>
  );
}

function MetricDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/5 bg-white/70 px-3 py-2">
      <p className="text-[11px] font-bold tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function MemberDifferenceCard({ member }: { member: MemberDifference }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-slate-400">MEMBER</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{member.displayName}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{member.fullName}</p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white">
          {member.missingReport ? "報告なし" : `${member.differences.length}項目`}
        </span>
      </div>

      {member.missingReport ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">このメンバーの報告を見つけられませんでした</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {member.differences.map((difference) => (
            <DifferenceTile key={difference.key} difference={difference} />
          ))}
        </div>
      )}
    </article>
  );
}

export function OroKpiCheckClient({ initialData, initialMonth }: Props) {
  const [data, setData] = useState(initialData);
  const [month, setMonth] = useState(initialData?.month ?? initialMonth ?? "2026-09");
  const [reportText, setReportText] = useState("");
  const [differences, setDifferences] = useState<MemberDifference[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [message, setMessage] = useState("");

  const differenceCount = useMemo(
    () => differences?.reduce((total, member) => total + (member.missingReport ? 1 : member.differences.length), 0) ?? 0,
    [differences],
  );

  async function reloadData() {
    setIsLoading(true);
    setMessage("");
    setDifferences(null);
    try {
      const response = await fetch(`/api/oro-kpi-check?month=${encodeURIComponent(month)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`KPI取得エラー: ${response.status}`);
      const nextData = (await response.json()) as OroKpiCheckData;
      setData(nextData);
      setMonth(nextData.month);
      window.history.replaceState(null, "", `/oro-kpi-check?month=${encodeURIComponent(nextData.month)}`);
    } catch (error) {
      console.error("[oro-kpi-check] refresh failed", error);
      setMessage("KPIデータを更新できませんでした。少し待ってから再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyOfficialText() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.officialText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch (error) {
      console.error("[oro-kpi-check] copy failed", error);
      setCopyState("error");
      setMessage("コピーできませんでした。文章を選択して手動でコピーしてください。");
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setReportText(text);
      setDifferences(null);
      setMessage(text.trim() ? "" : "クリップボードに文章がありませんでした。");
    } catch (error) {
      console.error("[oro-kpi-check] paste failed", error);
      setMessage("貼り付けを許可できませんでした。入力欄を長押しして貼り付けてください。");
    }
  }

  function compareReport() {
    if (!data) {
      setMessage("先に正しいKPIデータを読み込んでください。");
      return;
    }
    if (!reportText.trim()) {
      setMessage("Discordの報告文を貼り付けてください。");
      return;
    }
    setMessage("");
    setDifferences(compareOroReport(data, reportText));
    window.setTimeout(() => document.getElementById("comparison-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function clearReport() {
    setReportText("");
    setDifferences(null);
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-slate-950">
      <header className="relative overflow-hidden bg-[#0b1324] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,0.23),transparent_38%),radial-gradient(circle_at_8%_85%,rgba(244,63,94,0.12),transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold tracking-[0.18em] text-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                ORO KPI CHECK
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">おろチーム KPI照合</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                顧客管理シートの正解値と、Discordに投稿された自己申告値を照合します。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <HeaderStat icon={<Users className="h-4 w-4" />} label="対象" value="10名" />
              <HeaderStat icon={<Database className="h-4 w-4" />} label="最終取得" value={formatTimestamp(data?.updatedAt ?? "")} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-slate-400">TARGET MONTH</p>
              <h2 className="mt-1 text-xl font-black">対象月</h2>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:w-44"
                aria-label="対象月"
              />
              <button
                type="button"
                onClick={reloadData}
                disabled={isLoading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                更新
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1.5">面談日基準</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">おろチーム10名</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">率は整数切り捨て</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{data?.source === "fallback" || !data ? "データ未取得" : "顧客管理シート連携中"}</span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-slate-400">OFFICIAL REPORT</p>
                <h2 className="mt-1 text-xl font-black">正しい投稿文</h2>
                <p className="mt-1 text-sm text-slate-500">このままDiscordへ貼り付けられます。</p>
              </div>
              <button
                type="button"
                onClick={copyOfficialText}
                disabled={!data}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-40"
              >
                {copyState === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copyState === "copied" ? "コピー済み" : "全文コピー"}
              </button>
            </div>
            <pre className="mt-5 max-h-[540px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-200 sm:text-sm">
              {data?.officialText ?? "KPIデータを取得できませんでした。対象月を更新してください。"}
            </pre>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-6">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-slate-400">PASTE & CHECK</p>
              <h2 className="mt-1 text-xl font-black">みんなの報告を貼り付け</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">投稿順や全角コロン、予定数の括弧表記が混ざっていても照合できます。</p>
            </div>
            <textarea
              value={reportText}
              onChange={(event) => {
                setReportText(event.target.value);
                setDifferences(null);
              }}
              placeholder="Discordからコピーした報告文をここへ貼り付け"
              className="mt-5 min-h-[360px] w-full resize-y rounded-xl border border-slate-300 bg-[#fbfaf7] p-4 font-mono text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <button
                type="button"
                onClick={compareReport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
              >
                <Check className="h-4 w-4" />
                数字を照合する
              </button>
              <button
                type="button"
                onClick={pasteFromClipboard}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <ClipboardPaste className="h-4 w-4" />
                貼り付け
              </button>
              <button
                type="button"
                onClick={clearReport}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <RotateCcw className="h-4 w-4" />
                クリア
              </button>
            </div>
          </div>
        </section>

        {message ? (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {message}
          </div>
        ) : null}

        <section id="comparison-result" className="scroll-mt-5 pb-12">
          {differences !== null ? (
            differences.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-[0_16px_50px_rgba(16,185,129,0.08)] sm:p-10">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-2xl font-black text-emerald-950">全員の報告が一致しています</h2>
                <p className="mt-2 text-sm text-emerald-800">ズレているメンバー・項目はありません。</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-[0.16em] text-slate-400">DIFFERENCES ONLY</p>
                    <h2 className="mt-1 text-2xl font-black">ズレがある箇所だけ</h2>
                  </div>
                  <div className="flex gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">{differences.length}名</span>
                    <span className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200">{differenceCount}箇所</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[...differences]
                    .sort((a, b) => Number(b.missingReport) - Number(a.missingReport) || b.differences.length - a.differences.length)
                    .map((member) => <MemberDifferenceCard key={member.key} member={member} />)}
                </div>
              </div>
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}

function HeaderStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-36 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-sm font-black text-white">{value}</p>
    </div>
  );
}
