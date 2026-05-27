import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/app/lib/automation/env";
import { runAutomation } from "@/app/lib/automation/runAutomation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const defaultUrls = (process.env.AUTOMATION_DEFAULT_URLS || "").split(/\s+/).filter(Boolean);
  const result = await runAutomation({
    urls: Array.isArray(body.urls) && body.urls.length ? body.urls : body.url ? [body.url] : defaultUrls,
    discordText: body.discordText,
    instruction: body.instruction,
    trigger: body.trigger || "manual",
  });

  return NextResponse.json(result);
}
