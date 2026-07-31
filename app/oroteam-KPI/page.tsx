import type { Metadata } from "next";
import { getOroTeamKpiData } from "../api/oroteam-kpi/route";
import { OroTeamKpiClient } from "./OroTeamKpiClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ORO TEAM KPI",
  description: "オロチーム専用の目標達成ダッシュボードです。",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OroTeamKpiPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const month = Array.isArray(params.month) ? params.month[0] : params.month;
  const seatRate = Array.isArray(params.seatRate) ? params.seatRate[0] : params.seatRate;
  const initialData = await getOroTeamKpiData({ month, seatRate });

  return <OroTeamKpiClient initialData={initialData} />;
}
