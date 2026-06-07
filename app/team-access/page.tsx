import type { Metadata } from "next";
import { TeamAccessForm } from "./TeamAccessForm";

export const metadata: Metadata = {
  title: "チームダッシュボード認証",
  robots: {
    index: false,
    follow: false,
  },
};

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TeamAccessPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  return <TeamAccessForm nextPath={next ?? "/team"} />;
}
