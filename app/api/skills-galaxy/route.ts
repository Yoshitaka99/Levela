import { NextResponse } from "next/server";
import { parseGalaxyData } from "@/app/skills-galaxy/storage";

export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 400_000;
const MIN_KEY_LENGTH = 4;

// Vercel Marketplace (Upstash) は KV_REST_API_*、Upstash 直接連携は UPSTASH_REDIS_REST_* を設定する
function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisCommand(
  config: { url: string; token: string },
  command: Array<string>,
): Promise<unknown> {
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Redis request failed: ${res.status}`);
  }
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result;
}

async function storageKeyFor(syncKey: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(syncKey));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `skills-galaxy:${hex}`;
}

export async function GET(request: Request) {
  const config = getRedisConfig();
  if (!config) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const syncKey = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  if (syncKey.length < MIN_KEY_LENGTH) {
    return NextResponse.json({ error: "invalid-key" }, { status: 400 });
  }
  try {
    const stored = await redisCommand(config, ["GET", await storageKeyFor(syncKey)]);
    if (typeof stored !== "string" || !stored) {
      return NextResponse.json({ data: null });
    }
    const data = parseGalaxyData(JSON.parse(stored));
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "storage-error" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const config = getRedisConfig();
  if (!config) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as
    | { key?: string; data?: unknown }
    | null;
  const syncKey = body?.key?.trim() ?? "";
  if (syncKey.length < MIN_KEY_LENGTH) {
    return NextResponse.json({ error: "invalid-key" }, { status: 400 });
  }
  const data = parseGalaxyData(body?.data);
  if (!data) {
    return NextResponse.json({ error: "invalid-data" }, { status: 400 });
  }
  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  }
  try {
    await redisCommand(config, ["SET", await storageKeyFor(syncKey), serialized]);
    return NextResponse.json({ ok: true, savedAt: data.savedAt ?? null });
  } catch {
    return NextResponse.json({ error: "storage-error" }, { status: 502 });
  }
}
