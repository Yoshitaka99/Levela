import type { Metadata } from "next";
import { FalseReportCheckerClient } from "./FalseReportCheckerClient";

export const metadata: Metadata = {
  title: "虚偽報告チェック",
  description: "軽量版シートの虚偽報告チェックツール",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default function FalseReportCheckerPage() {
  return (
    <main className="min-h-screen bg-[#f8f3ea] text-[#231815]">
      <FalseReportCheckerClient />
    </main>
  );
}
