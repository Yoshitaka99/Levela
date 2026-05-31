import type { Metadata } from "next";
import { fetchLiveData } from "../api/seminar-dashboard/route";
import { SeminarDashboardClient } from "./SeminarDashboardClient";
import { defaultDashboardData } from "./data";

export const metadata: Metadata = {
  title: "オロチーム セミナーKPI",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const validTabs = ["overview", "members", "reasons", "alerts"] as const;
const validSorts = ["projectedRate", "closeRate", "seatRate", "lost", "hold"] as const;

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam<T extends readonly string[]>(
  value: string | string[] | undefined,
  allowed: T,
  fallback: T[number],
) {
  const raw = Array.isArray(value) ? value[0] : value;
  return allowed.includes(raw ?? "") ? (raw as T[number]) : fallback;
}

export default async function SeminarDashboardPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const initialTab = pickParam(params.tab, validTabs, "overview");
  const initialSort = pickParam(params.sort, validSorts, "projectedRate");
  const initialMember = Array.isArray(params.member) ? params.member[0] : params.member;
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const initialSeminar = Array.isArray(params.seminar) ? params.seminar[0] : params.seminar;
  const initialOnlyAlerts = (Array.isArray(params.alerts) ? params.alerts[0] : params.alerts) === "1";
  const initialOnlyHold = (Array.isArray(params.hold) ? params.hold[0] : params.hold) === "1";
  const initialData = (await fetchLiveData(initialSeminar)) ?? defaultDashboardData;

  return (
    <SeminarDashboardClient
      initialData={initialData}
      initialTab={initialTab}
      initialSort={initialSort}
      initialMember={initialMember}
      initialQuery={initialQuery}
      initialSeminar={initialSeminar}
      initialOnlyAlerts={initialOnlyAlerts}
      initialOnlyHold={initialOnlyHold}
    />
  );
}
