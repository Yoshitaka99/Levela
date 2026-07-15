import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getRoleplayScopeLabels,
  getRoleplayScopeText,
  isRoleplayMember,
  normalizeRoleplayScopes,
  normalizeRoleplayMemberName,
  type RoleplayPairDirection,
  type RoleplayRecord,
  type RoleplayScope,
} from "@/app/lib/roleplayLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoleplayPayload = {
  sessionDate?: unknown;
  sellerName?: unknown;
  customerName?: unknown;
  scope?: unknown;
  scopes?: unknown;
  note?: unknown;
  reciprocal?: unknown;
};

type RoleplayImportPayload = {
  records?: unknown;
};

type NormalizedPayload = {
  sessionDate: string;
  sellerName: string;
  customerName: string;
  scopes: RoleplayScope[];
  note: string;
  reciprocal: boolean;
};

type StorageConfig =
  | {
      type: "spreadsheet";
      webhookUrl: string;
      secret: string;
    }
  | {
      type: "redis";
      url: string;
      token: string;
    };

const redisRecordsKey = "roleplay-log:records:v1";
const maxImportRecords = 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storage = getStorageConfig();

  if (!storage) {
    return sharedStorageNotConfigured();
  }

  try {
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const records = await readStoredRecords(storage, from, to);

    return NextResponse.json({
      ok: true,
      source: storage.type,
      records,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "共有ストレージから取得できませんでした。" },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: RoleplayPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON形式で送信してください。" }, { status: 400 });
  }

  const normalized = normalizePayload(body);
  if (!normalized.ok) {
    return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });
  }

  const records = createRecords(normalized.data);
  const storage = getStorageConfig();

  if (!storage) {
    return sharedStorageNotConfigured();
  }

  try {
    await saveRecords(records, storage);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "スプレッドシートへの保存に失敗しました。",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: storage.type,
    records,
    savedTargets: [storage.type],
    message: records.length === 2 ? "2件まとめて登録しました。" : "1件登録しました。",
  });
}

export async function PUT(request: NextRequest) {
  let body: RoleplayImportPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON形式で送信してください。" }, { status: 400 });
  }

  const rawRecords = Array.isArray(body.records) ? body.records.slice(0, maxImportRecords) : [];
  const records = rawRecords.map(normalizeImportedRecord).filter((record): record is RoleplayRecord => Boolean(record));

  if (records.length === 0) {
    return NextResponse.json({ ok: false, error: "取り込める過去記録がありません。" }, { status: 400 });
  }

  const storage = getStorageConfig();

  if (!storage) {
    return sharedStorageNotConfigured();
  }

  try {
    const existingRecords = await readStoredRecords(storage);
    const existingIds = new Set(existingRecords.map((record) => record.id));
    const seenIds = new Set<string>();
    const acceptedIds: string[] = [];
    const importRecords: RoleplayRecord[] = [];

    for (const record of records) {
      if (seenIds.has(record.id)) {
        acceptedIds.push(record.id);
        continue;
      }

      seenIds.add(record.id);
      acceptedIds.push(record.id);

      if (!existingIds.has(record.id)) {
        importRecords.push(record);
      }
    }

    if (importRecords.length > 0) {
      await saveRecords(importRecords, storage);
    }

    return NextResponse.json({
      ok: true,
      source: storage.type,
      importedCount: importRecords.length,
      skippedCount: records.length - importRecords.length,
      invalidCount: rawRecords.length - records.length,
      acceptedIds,
      message:
        importRecords.length > 0
          ? `${importRecords.length}件の過去記録を共有データへ取り込みました。`
          : "過去記録はすでに共有データに取り込み済みです。",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "過去記録の取り込みに失敗しました。" },
      { status: 502 },
    );
  }
}

function normalizePayload(body: RoleplayPayload): { ok: true; data: NormalizedPayload } | { ok: false; error: string } {
  const sessionDate = text(body.sessionDate, 20);
  const sellerName = normalizeRoleplayMemberName(text(body.sellerName, 100));
  const customerName = normalizeRoleplayMemberName(text(body.customerName, 100));
  const scopes = normalizeRoleplayScopes(body.scopes ?? body.scope);
  const note = text(body.note, 2000);
  const reciprocal = body.reciprocal === true;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return { ok: false, error: "実施日を選択してください。" };
  }

  if (!isRoleplayMember(sellerName)) {
    return { ok: false, error: "営業役を一覧から選択してください。" };
  }

  if (!isRoleplayMember(customerName)) {
    return { ok: false, error: "お客さん役を一覧から選択してください。" };
  }

  if (sellerName === customerName) {
    return { ok: false, error: "営業役とお客さん役は別の名前を選択してください。" };
  }

  if (scopes.length === 0) {
    return { ok: false, error: "実施範囲を選択してください。" };
  }

  return {
    ok: true,
    data: {
      sessionDate,
      sellerName,
      customerName,
      scopes,
      note,
      reciprocal,
    },
  };
}

function createRecords(payload: NormalizedPayload) {
  const submittedAt = new Date().toISOString();
  const pairSessionId = randomUUID();
  const base = {
    submittedAt,
    sessionDate: payload.sessionDate,
    scope: payload.scopes.join(","),
    scopeLabel: getRoleplayScopeText(payload.scopes),
    scopes: payload.scopes,
    scopeLabels: getRoleplayScopeLabels(payload.scopes),
    note: payload.note,
    pairSessionId,
  };

  const primary = makeRecord({
    ...base,
    sellerName: payload.sellerName,
    customerName: payload.customerName,
    pairDirection: payload.reciprocal ? "primary" : "single",
  });

  if (!payload.reciprocal) return [primary];

  return [
    primary,
    makeRecord({
      ...base,
      sellerName: payload.customerName,
      customerName: payload.sellerName,
      pairDirection: "reversed",
    }),
  ];
}

function makeRecord(record: Omit<RoleplayRecord, "id">): RoleplayRecord {
  return {
    id: randomUUID(),
    ...record,
  };
}

async function saveRecords(records: RoleplayRecord[], storage: StorageConfig) {
  if (storage.type === "redis") {
    await redisCommand(storage, ["RPUSH", redisRecordsKey, ...records.map((record) => JSON.stringify(record))]);
    return;
  }

  await postRecordsToSheet(records, storage);
}

async function readStoredRecords(storage: StorageConfig, from = "", to = ""): Promise<RoleplayRecord[]> {
  if (storage.type === "spreadsheet") {
    const targetUrl = new URL(storage.webhookUrl);
    targetUrl.searchParams.set("secret", storage.secret);
    if (from) targetUrl.searchParams.set("from", from);
    if (to) targetUrl.searchParams.set("to", to);

    const response = await fetch(targetUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Spreadsheet webhook failed: ${response.status}`);
    }

    const payload = await response.json();
    const rawRecords = Array.isArray(payload.records) ? payload.records : [];

    return rawRecords.map(normalizeSheetRecord).filter(isStoredRoleplayRecord);
  }

  const rawRecords = await redisCommand(storage, ["LRANGE", redisRecordsKey, "0", "-1"]);

  return (Array.isArray(rawRecords) ? rawRecords : [])
    .map(parseRedisRecord)
    .map(normalizeSheetRecord)
    .filter(isStoredRoleplayRecord)
    .filter((record) => isInDateRange(record, from, to));
}

async function postRecordsToSheet(records: RoleplayRecord[], storage: Extract<StorageConfig, { type: "spreadsheet" }>) {
  const response = await fetch(storage.webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      secret: storage.secret,
      records,
    }),
  });

  if (!response.ok) {
    throw new Error(`Spreadsheet webhook failed: ${response.status}`);
  }
}

function getStorageConfig(): StorageConfig | null {
  const webhookUrl = process.env.ROLEPLAY_LOG_SHEET_WEBHOOK_URL;
  if (webhookUrl) {
    return {
      type: "spreadsheet",
      webhookUrl,
      secret: process.env.ROLEPLAY_LOG_SHEET_SECRET || "",
    };
  }

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;

  return {
    type: "redis",
    url,
    token,
  };
}

async function redisCommand(storage: Extract<StorageConfig, { type: "redis" }>, command: string[]) {
  const response = await fetch(storage.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${storage.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result;
}

function parseRedisRecord(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isInDateRange(record: RoleplayRecord, from: string, to: string) {
  if (from && record.sessionDate < from) return false;
  if (to && record.sessionDate > to) return false;
  return true;
}

function sharedStorageNotConfigured() {
  return NextResponse.json(
    {
      ok: false,
      source: "unconfigured",
      error: "共有保存先が未設定です。管理者に Upstash Redis か Google Sheets 連携の設定を依頼してください。",
    },
    { status: 503 },
  );
}

function normalizeSheetRecord(value: unknown): RoleplayRecord | null {
  if (!value || typeof value !== "object") return null;

  const source = value as Record<string, unknown>;
  const sessionDate = text(source.sessionDate, 20);
  const sellerName = normalizeRoleplayMemberName(text(source.sellerName, 100));
  const customerName = normalizeRoleplayMemberName(text(source.customerName, 100));
  const scopes = normalizeRoleplayScopes(source.scopes ?? source.scope);

  if (!sessionDate || !isRoleplayMember(sellerName) || !isRoleplayMember(customerName) || scopes.length === 0) {
    return null;
  }

  const pairDirection = text(source.pairDirection, 20);

  return {
    id: text(source.id, 100) || randomUUID(),
    submittedAt: text(source.submittedAt, 100),
    sessionDate,
    sellerName,
    customerName,
    scope: scopes.join(","),
    scopeLabel: text(source.scopeLabel, 300) || getRoleplayScopeText(scopes),
    scopes,
    scopeLabels: getRoleplayScopeLabels(scopes),
    note: text(source.note, 2000),
    pairSessionId: text(source.pairSessionId, 100),
    pairDirection: isPairDirection(pairDirection) ? pairDirection : "single",
  };
}

function normalizeImportedRecord(value: unknown): RoleplayRecord | null {
  if (!value || typeof value !== "object") return null;

  const id = text((value as Record<string, unknown>).id, 100);
  if (!id) return null;

  const record = normalizeSheetRecord(value);
  if (!record) return null;

  return {
    ...record,
    id,
  };
}

function isStoredRoleplayRecord(value: RoleplayRecord | null): value is RoleplayRecord {
  return value !== null;
}

function isPairDirection(value: string): value is RoleplayPairDirection {
  return value === "single" || value === "primary" || value === "reversed";
}

function text(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}
