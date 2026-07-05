import { NextResponse, type NextRequest } from "next/server";
import { parseGalaxyData } from "@/app/skills-galaxy/storage";
import { isSkillsGalaxyAdmin } from "./adminAuth";

export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 400_000;
// 全員が同じ銀河を見る(閲覧は公開・保存はログイン必須)
const STORAGE_KEY = "skills-galaxy:main";

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

export async function GET() {
  const config = getRedisConfig();
  if (!config) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  try {
    const stored = await redisCommand(config, ["GET", STORAGE_KEY]);
    if (typeof stored !== "string" || !stored) {
      return NextResponse.json({ data: null });
    }
    const data = parseGalaxyData(JSON.parse(stored));
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "storage-error" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSkillsGalaxyAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const config = getRedisConfig();
  if (!config) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { data?: unknown } | null;
  const data = parseGalaxyData(body?.data);
  if (!data) {
    return NextResponse.json({ error: "invalid-data" }, { status: 400 });
  }
  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  }
  try {
    await redisCommand(config, ["SET", STORAGE_KEY, serialized]);
    return NextResponse.json({ ok: true, savedAt: data.savedAt ?? null });
  } catch {
    return NextResponse.json({ error: "storage-error" }, { status: 502 });
  }
}
