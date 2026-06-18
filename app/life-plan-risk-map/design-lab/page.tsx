import type { Metadata } from "next";
import { RiskMapDesignLabClient } from "./RiskMapDesignLabClient";

export const metadata: Metadata = {
  title: "ライフプラン整理マップ デザインラボ",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LifePlanRiskMapDesignLabPage() {
  return <RiskMapDesignLabClient />;
}
