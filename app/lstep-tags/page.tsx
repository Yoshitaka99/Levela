import type { Metadata } from "next";
import LstepTagsClient from "./LstepTagsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lステップ タグ分析",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LstepTagsPage() {
  return <LstepTagsClient />;
}
