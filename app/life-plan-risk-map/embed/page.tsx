import type { Metadata } from "next";
import { RiskMapEmbedClient } from "./RiskMapEmbedClient";

export const metadata: Metadata = {
  title: "ライフプラン整理マップ",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LifePlanRiskMapEmbedPage() {
  return <RiskMapEmbedClient />;
}
