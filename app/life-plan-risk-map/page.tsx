import type { Metadata } from "next";
import { LifePlanRiskMapClient } from "./LifePlanRiskMapClient";

export const metadata: Metadata = {
  title: "ライフプラン整理フォーム",
  description: "お客様情報を整理してライフプラン資料作成に使える内容を準備します。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LifePlanRiskMapPage() {
  return <LifePlanRiskMapClient />;
}
