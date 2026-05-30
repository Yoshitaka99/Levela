import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/app/lib/automation/env";
import { runAiDrillRankingAutomation } from "@/app/lib/automation/aiDrillRanking";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAiDrillRankingAutomation();
  return NextResponse.json(result);
}
