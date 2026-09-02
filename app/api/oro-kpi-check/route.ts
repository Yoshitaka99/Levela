import { NextResponse } from "next/server";
import { loadOroKpiCheckData } from "../../lib/oroKpiCheck.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get("month");
    const data = await loadOroKpiCheckData(month);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[oro-kpi-check] failed to load KPI data", error);
    return NextResponse.json(
      { error: "KPIデータを取得できませんでした" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

