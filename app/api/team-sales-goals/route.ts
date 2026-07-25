import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GoalMode = "perMember" | "teamClosed" | "closeRate";

type TeamSalesGoal = {
  team: string;
  period: string;
  mode: GoalMode;
  value: string;
  updatedAt: string;
};

type GoalStore = {
  goals: Record<string, TeamSalesGoal>;
};

const DEFAULT_GOAL_MODE: GoalMode = "closeRate";
const DEFAULT_GOAL_VALUE = "35";
const STORE_KEY = "team-sales-goals:v1";
const goalModeValues = new Set<GoalMode>(["perMember", "teamClosed", "closeRate"]);

declare global {
  var __teamSalesGoalStore: GoalStore | undefined;
}

function getMemoryStore() {
  globalThis.__teamSalesGoalStore ??= { goals: {} };
  return globalThis.__teamSalesGoalStore;
}

function makeGoalKey(team: string, period: string) {
  return `${team.trim()}::${period.trim()}`;
}

function getDefaultGoal(team: string, period: string): TeamSalesGoal {
  return {
    team,
    period,
    mode: DEFAULT_GOAL_MODE,
    value: DEFAULT_GOAL_VALUE,
    updatedAt: "",
  };
}

function getKvConfig() {
  const url = process.env.TEAM_SALES_GOALS_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.TEAM_SALES_GOALS_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function shouldUseMemoryFallback() {
  return !process.env.VERCEL;
}

async function readStore(): Promise<{ store: GoalStore; source: "kv" | "memory" }> {
  const kv = getKvConfig();
  if (!kv) {
    if (shouldUseMemoryFallback()) return { store: getMemoryStore(), source: "memory" };
    throw new Error("shared goal storage is not configured");
  }

  const response = await fetch(kv.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${kv.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(["GET", STORE_KEY]),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`KV read failed: ${response.status}`);
  const payload = (await response.json()) as { result?: string | null };
  if (!payload.result) return { store: { goals: {} }, source: "kv" };

  const parsed = JSON.parse(payload.result) as GoalStore;
  return { store: { goals: parsed.goals ?? {} }, source: "kv" };
}

async function writeStore(store: GoalStore) {
  const kv = getKvConfig();
  if (!kv) {
    if (!shouldUseMemoryFallback()) throw new Error("shared goal storage is not configured");
    globalThis.__teamSalesGoalStore = store;
    return "memory" as const;
  }

  const response = await fetch(kv.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${kv.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(["SET", STORE_KEY, JSON.stringify(store)]),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`KV write failed: ${response.status}`);
  return "kv" as const;
}

function getParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team")?.trim() ?? "";
  const period = searchParams.get("period")?.trim() ?? "";
  return { team, period };
}

export async function GET(request: Request) {
  try {
    const { team, period } = getParams(request);
    if (!team || !period) return NextResponse.json({ error: "team and period are required" }, { status: 400 });

    const { store, source } = await readStore();
    const goal = store.goals[makeGoalKey(team, period)] ?? getDefaultGoal(team, period);
    return NextResponse.json({ goal, source }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[team-sales-goals] GET failed", error);
    return NextResponse.json({ error: "Failed to load team sales goal" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<TeamSalesGoal>;
    const team = body.team?.trim() ?? "";
    const period = body.period?.trim() ?? "";
    const mode = body.mode;
    const value = body.value?.trim() ?? "";

    if (!team || !period) return NextResponse.json({ error: "team and period are required" }, { status: 400 });
    if (!mode || !goalModeValues.has(mode)) return NextResponse.json({ error: "invalid goal mode" }, { status: 400 });
    if (!value || !Number.isFinite(Number(value))) return NextResponse.json({ error: "invalid goal value" }, { status: 400 });

    const { store } = await readStore();
    const goal: TeamSalesGoal = {
      team,
      period,
      mode,
      value,
      updatedAt: new Date().toISOString(),
    };
    const nextStore = {
      goals: {
        ...store.goals,
        [makeGoalKey(team, period)]: goal,
      },
    };
    const source = await writeStore(nextStore);

    return NextResponse.json({ goal, source }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[team-sales-goals] POST failed", error);
    return NextResponse.json({ error: "Failed to save team sales goal" }, { status: 500 });
  }
}
