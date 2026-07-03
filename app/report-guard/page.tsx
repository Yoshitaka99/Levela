import type { Metadata } from "next";
import { ReportGuardClient } from "./ReportGuardClient";

export const metadata: Metadata = {
  title: "レポートガード",
  description: "報告変更の監視ツール (比較検証版)",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default function ReportGuardPage() {
  return (
    <main className="min-h-screen bg-[#f8f3ea] text-[#231815]">
      <ReportGuardClient />
    </main>
  );
}
