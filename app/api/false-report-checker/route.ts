import { NextResponse } from "next/server";
import type { DiffDecision, FalseReportAction, FalseReportData } from "../../false-report-checker/types";
import { fetchFromPublicCsv, LIGHTWEIGHT_SHEETS_URL } from "./sheet-data";

export const dynamic = "force-dynamic";

const WEBHOOK_URL = process.env.FALSE_REPORT_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.FALSE_REPORT_WEBHOOK_SECRET;
const HANDLERS = ["成勢将司", "野中碧", "梅津真珠", "笠松佑衣", "大谷みくに"];

async function callAppsScript(payload: Record<string, unknown>) {
  if (!WEBHOOK_URL) {
    return null;
  }

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      secret: WEBHOOK_SECRET,
      ...payload,
    }),
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { ok: false, message: text };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: typeof parsed === "object" && parsed && "message" in parsed ? String(parsed.message) : text,
    };
  }

  return parsed;
}

function isValidAction(body: Partial<FalseReportAction>): body is FalseReportAction {
  if (!body || typeof body.action !== "string") return false;

  if (body.action === "setConfirmed" || body.action === "setDiffReviewed") {
    return Number.isInteger(body.rowNumber) && typeof body.checked === "boolean";
  }

  if (body.action === "saveFalseReportMemo") {
    return Number.isInteger(body.rowNumber) && typeof body.memo === "string";
  }

  if (body.action === "updateReply") {
    return (
      Number.isInteger(body.rowNumber) &&
      typeof body.field === "string" &&
      ["messageDone", "contacted", "seatStatus", "contractStatus", "contactMemo"].includes(body.field) &&
      (typeof body.value === "string" || typeof body.value === "boolean")
    );
  }

  if (body.action === "applyDiffDecisions") {
    const decisions = (body as { decisions?: unknown }).decisions;
    return (
      typeof body.handler === "string" &&
      HANDLERS.includes(body.handler) &&
      Array.isArray(decisions) &&
      decisions.length > 0 &&
      decisions.every((decision) => {
        if (!decision || typeof decision !== "object") return false;
        const item = decision as Partial<DiffDecision>;
        return Number.isInteger(item.rowNumber) && (item.decision === "ok" || item.decision === "ng");
      })
    );
  }

  return false;
}

export async function GET() {
  try {
    const appsScriptData = await callAppsScript({ action: "getData" });
    if (appsScriptData && typeof appsScriptData === "object" && "data" in appsScriptData) {
      return NextResponse.json({
        ...(appsScriptData.data as FalseReportData),
        writeReady: true,
        source: "apps-script",
      });
    }

    const data = await fetchFromPublicCsv();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        writeReady: Boolean(WEBHOOK_URL),
        source: "public-csv",
        sheetsUrl: LIGHTWEIGHT_SHEETS_URL,
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
        warning: error instanceof Error ? error.message : "データ取得に失敗しました。",
      },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<FalseReportAction> | null;
  if (!body || !isValidAction(body)) {
    return NextResponse.json(
      { ok: false, message: "操作内容が正しくありません。" },
      { status: 400 },
    );
  }

  if (!WEBHOOK_URL) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "書き込み用のApps Script URLが未設定です。FALSE_REPORT_WEBHOOK_URL を設定すると、この画面から操作できます。",
      },
      { status: 501 },
    );
  }

  const result = await callAppsScript(body);
  if (!result || (typeof result === "object" && "ok" in result && result.ok === false)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          typeof result === "object" && result && "message" in result
            ? String(result.message)
            : "Apps Scriptへの書き込みに失敗しました。",
      },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}
