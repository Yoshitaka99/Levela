import type { Metadata } from "next";
import { SkillsGalaxyClient } from "./SkillsGalaxyClient";

export const metadata: Metadata = {
  title: "Skill Galaxy | スキルの銀河",
  description: "スキルを惑星として格納し、関連を軌道でつなぐ動的なグラフビュー。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SkillsGalaxyPage() {
  return <SkillsGalaxyClient />;
}
