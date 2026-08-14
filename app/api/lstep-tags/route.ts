import { NextResponse } from "next/server";
import {
  DEFAULT_RANGE,
  DEFAULT_SHEET_NAME,
  DEFAULT_SPREADSHEET_ID,
  fetchLstepData,
  normalizeSpreadsheetId,
} from "./sheet-data";

export const dynamic = "force-dynamic";

function parseColumnIndex(value: string | null) {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseColumnIndexList(value: string | null) {
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0);
  return parsed.length ? parsed : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spreadsheetId = normalizeSpreadsheetId(
    searchParams.get("spreadsheetId") ?? DEFAULT_SPREADSHEET_ID,
  );
  const sheetName = (searchParams.get("sheet") ?? DEFAULT_SHEET_NAME).trim();
  const range = (searchParams.get("range") || DEFAULT_RANGE).trim();

  if (!spreadsheetId) {
    return NextResponse.json(
      {
        error:
          "スプレッドシートが未設定です。画面の設定タブでURLを入力するか、環境変数 LSTEP_SPREADSHEET_ID を設定してください。",
      },
      { status: 400 },
    );
  }

  const overrides = {
    nameColumn: parseColumnIndex(searchParams.get("nameColumn")),
    registeredAtColumn: parseColumnIndex(searchParams.get("registeredAtColumn")),
    sourceColumn: parseColumnIndex(searchParams.get("sourceColumn")),
    statusColumn: parseColumnIndex(searchParams.get("statusColumn")),
    csvTagColumns: parseColumnIndexList(searchParams.get("tagColumns")),
  };
  const hasOverrides = Object.values(overrides).some((value) => value !== undefined);

  try {
    const data = await fetchLstepData({
      spreadsheetId,
      sheetName,
      range,
      overrides: hasOverrides ? overrides : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "スプレッドシートの読み込みに失敗しました。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
