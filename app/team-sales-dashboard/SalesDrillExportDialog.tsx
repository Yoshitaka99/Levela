"use client";

import { ClipboardCopy, Database, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AdSourceFilter, TeamSalesDashboardData, TrafficFilter } from "./data";
import {
  buildSalesDrillFactText,
  getSalesDrillComparisonRanges,
  type SalesDrillComparisonUnit,
  type SalesDrillDateRange,
} from "./salesDrillExport";

function getTodayInJapan() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatRange(range: SalesDrillDateRange) {
  return `${range.startDate.replaceAll("-", "/")} - ${range.endDate.replaceAll("-", "/")}`;
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) throw new Error("clipboard unavailable");
  }
}

async function fetchRange({
  range,
  team,
  traffic,
  adSource,
}: {
  range: SalesDrillDateRange;
  team: string;
  traffic: TrafficFilter;
  adSource: AdSourceFilter;
}) {
  const params = new URLSearchParams({
    dateBasis: "calendar",
    startDate: range.startDate,
    endDate: range.endDate,
    team,
  });
  if (traffic !== "all") params.set("traffic", traffic);
  if (traffic === "ad" && adSource !== "all") params.set("adSource", adSource);

  const response = await fetch(`/api/team-sales-dashboard?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`KPI取得エラー（${response.status}）`);
  const data = (await response.json()) as TeamSalesDashboardData;
  if (data.source !== "sheet") throw new Error("顧客管理シートの最新データを確認できませんでした");
  return data;
}

export function SalesDrillExportDialog({
  selectedTeam,
  selectedTraffic,
  selectedAdSource,
  initialAnchorDate,
}: {
  selectedTeam: string;
  selectedTraffic: TrafficFilter;
  selectedAdSource: AdSourceFilter;
  initialAnchorDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<SalesDrillComparisonUnit>("week");
  const [anchorDate, setAnchorDate] = useState(initialAnchorDate ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "copied" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const ranges = useMemo(() => getSalesDrillComparisonRanges(unit, anchorDate), [anchorDate, unit]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function openDialog() {
    setAnchorDate(initialAnchorDate || anchorDate || getTodayInJapan());
    setStatus("idle");
    setErrorMessage("");
    setOpen(true);
  }

  async function copyFacts() {
    if (!ranges) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const [currentData, previousData] = await Promise.all([
        fetchRange({ range: ranges.current, team: selectedTeam, traffic: selectedTraffic, adSource: selectedAdSource }),
        fetchRange({ range: ranges.previous, team: selectedTeam, traffic: selectedTraffic, adSource: selectedAdSource }),
      ]);
      const text = buildSalesDrillFactText({ unit, ranges, currentData, previousData });
      await writeClipboard(text);
      setStatus("copied");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "コピーに失敗しました");
      setStatus("error");
    }
  }

  function updateUnit(nextUnit: SalesDrillComparisonUnit) {
    setUnit(nextUnit);
    setStatus("idle");
  }

  function updateAnchorDate(nextDate: string) {
    setAnchorDate(nextDate);
    setStatus("idle");
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-300/25 bg-rose-400/10 px-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20 sm:w-auto"
      >
        <Database className="h-4 w-4" />
        営業ドリル用コピー
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-drill-export-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg border border-white/10 bg-[#091413] p-5 shadow-2xl sm:max-w-xl sm:rounded-lg sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-rose-200">FACT DATA</p>
                <h2 id="sales-drill-export-title" className="mt-1 text-xl font-semibold text-white">
                  営業ドリル比較データ
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1.2fr]">
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-400">比較単位</legend>
                <div className="grid h-11 grid-cols-2 rounded-md border border-white/10 bg-slate-950 p-1">
                  {(["week", "month"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateUnit(option)}
                      className={`rounded text-sm font-semibold transition ${
                        unit === option ? "bg-rose-300 text-slate-950" : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      {option === "week" ? "週次" : "月次"}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">基準日</span>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(event) => updateAnchorDate(event.target.value)}
                  className="h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white [color-scheme:dark] outline-none focus:border-rose-300/50"
                />
              </label>
            </div>

            {ranges ? (
              <div className="mt-5 border-y border-white/10 py-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">今回</span>
                  <span className="font-medium text-white">{formatRange(ranges.current)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-slate-400">前期間</span>
                  <span className="font-medium text-slate-200">{formatRange(ranges.previous)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{selectedTeam}</span>
                  <span>/</span>
                  <span>面談日基準</span>
                  <span>/</span>
                  <span>{selectedTraffic === "all" ? "全流入" : selectedTraffic === "ad" ? "広告のみ" : "広告除外"}</span>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={copyFacts}
              disabled={!ranges || status === "loading"}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-rose-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardCopy className="h-4 w-4" />}
              {status === "loading" ? "集計中" : status === "copied" ? "コピーしました" : "成約数・成約率をコピー"}
            </button>
            {status === "error" ? <p className="mt-3 text-sm text-rose-200">{errorMessage}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
