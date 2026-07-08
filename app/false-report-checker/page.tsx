import type { Metadata } from "next";
import FalseReportCheckerClient from "./FalseReportCheckerClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "虚偽報告チェック",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FalseReportCheckerPage() {
  return <FalseReportCheckerClient />;
}
