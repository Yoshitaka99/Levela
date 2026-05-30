import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/app/lib/automation/env";
import { runAiDrillRankingAutomation } from "@/app/lib/automation/aiDrillRanking";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await runAiDrillRankingAutomation({
    discordWebhookUrl: body.discordWebhookUrl,
    rankingJsonUrl: body.rankingJsonUrl,
    rankingCookie: body.rankingCookie,
    rankingAuthorization: body.rankingAuthorization,
    targetMembers: body.targetMembers,
    roundStart: body.roundStart,
    roundStartDate: body.roundStartDate,
  });
  return NextResponse.json(result);
}
