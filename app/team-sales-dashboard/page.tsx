import type { Metadata } from "next";
import { fetchTeamSalesData } from "../api/team-sales-dashboard/route";
import { defaultTeamSalesDashboardData } from "./data";
import { TeamSalesDashboardClient } from "./TeamSalesDashboardClient";

export const metadata: Metadata = {
  title: "チームセールスダッシュボード",
  description: "全体チーム別のセールスKPIダッシュボード",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const validTabs = ["overview", "appointments", "members", "reasons", "alerts"] as const;
const validSorts = ["projectedRate", "closeRate", "seatRate", "reservationSlots", "seated", "closed", "projected", "lost", "hold"] as const;
const validTraffic = ["all", "ad", "exclude_ad"] as const;
const validAdSources = ["all", "x", "meta", "meta_ad", "Meta_ad", "meta_ad_Suea_aw", "meta_ad_in-house_aw", "meta_ad_Suea", "Meta_ad_aw", "meta_ad_in-house"] as const;
const validViews = ["user", "admin", "manager"] as const;
const validDateBasis = ["seminar", "appointment", "calendar"] as const;
const validSeatCountFilters = ["all", "at_least_10", "under_10"] as const;

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam<T extends readonly string[]>(
  value: string | string[] | undefined,
  allowed: T,
  fallback: T[number],
) {
  const raw = Array.isArray(value) ? value[0] : value;
  return allowed.includes(raw ?? "") ? (raw as T[number]) : fallback;
}

function pickAdSourceParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "all";

  const selected = raw
    .split(",")
    .map((source) => source.trim())
    .filter((source) => validAdSources.includes(source as (typeof validAdSources)[number]));

  if (!selected.length || selected.includes("all")) return "all";
  return [...new Set(selected)].join(",");
}

async function getInitialTeamSalesData(
  seminar?: string,
  team?: string,
  traffic?: string,
  adSource?: string,
  dateBasis?: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    return (await fetchTeamSalesData(seminar, team, traffic, adSource, dateBasis, startDate, endDate)) ?? defaultTeamSalesDashboardData;
  } catch (error) {
    console.error("[team-sales-dashboard] failed to load team sales data", error);
    return defaultTeamSalesDashboardData;
  }
}

export default async function TeamSalesDashboardPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const initialTab = pickParam(params.tab, validTabs, "overview");
  const initialView = pickParam(params.view, validViews, "user");
  const initialSort = pickParam(params.sort, validSorts, "projectedRate");
  const initialMember = Array.isArray(params.member) ? params.member[0] : params.member;
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const initialSeminar = Array.isArray(params.seminar) ? params.seminar[0] : params.seminar;
  const initialTeam = Array.isArray(params.team) ? params.team[0] : params.team;
  const initialTraffic = pickParam(params.traffic, validTraffic, "all");
  const initialAdSource = pickAdSourceParam(params.adSource);
  const initialDateBasis = pickParam(params.dateBasis, validDateBasis, "seminar");
  const initialStartDate = Array.isArray(params.startDate) ? params.startDate[0] : params.startDate;
  const initialEndDate = Array.isArray(params.endDate) ? params.endDate[0] : params.endDate;
  const initialSeatCountFilter = pickParam(params.seatCount, validSeatCountFilters, "all");
  const initialOnlyAlerts = (Array.isArray(params.alerts) ? params.alerts[0] : params.alerts) === "1";
  const initialOnlyHold = (Array.isArray(params.hold) ? params.hold[0] : params.hold) === "1";
  const initialData = await getInitialTeamSalesData(initialSeminar, initialTeam, initialTraffic, initialAdSource, initialDateBasis, initialStartDate, initialEndDate);

  return (
    <TeamSalesDashboardClient
      initialData={initialData}
      initialView={initialView}
      initialTab={initialTab}
      initialSort={initialSort}
      initialMember={initialMember}
      initialQuery={initialQuery}
      initialSeminar={initialSeminar}
      initialTeam={initialTeam}
      initialTraffic={initialTraffic}
      initialAdSource={initialAdSource}
      initialDateBasis={initialDateBasis}
      initialStartDate={initialStartDate}
      initialEndDate={initialEndDate}
      initialSeatCountFilter={initialSeatCountFilter}
      initialOnlyAlerts={initialOnlyAlerts}
      initialOnlyHold={initialOnlyHold}
    />
  );
}
