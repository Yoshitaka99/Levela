import type { Metadata } from "next";
import { LifePlanRiskMapClient } from "./LifePlanRiskMapClient";

export const metadata: Metadata = {
  title: "ライフプラン整理マップ",
  description: "入力内容を固定構図のライフプラン整理マップへ即時反映する編集ページです。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LifePlanRiskMapPage() {
  return <LifePlanRiskMapClient />;
}
