import type { Metadata } from "next";
import { loadOroKpiCheckData, normalizeOroKpiMonth } from "../lib/oroKpiCheck.server";
import { OroKpiCheckClient } from "./OroKpiCheckClient";

export const metadata: Metadata = {
  title: "おろチーム KPI照合",
  description: "顧客管理シートの正解値とDiscordの自己申告値を照合するツールです。",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OroKpiCheckPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const rawMonth = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = normalizeOroKpiMonth(rawMonth);
  let initialData: Awaited<ReturnType<typeof loadOroKpiCheckData>> | null = null;

  try {
    initialData = await loadOroKpiCheckData(month);
  } catch (error) {
    console.error("[oro-kpi-check] initial data load failed", error);
  }

  return <OroKpiCheckClient initialData={initialData} initialMonth={month} />;
}
