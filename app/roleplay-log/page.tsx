import type { Metadata } from "next";
import { RoleplayLogClient } from "./RoleplayLogClient";

export const metadata: Metadata = {
  title: "ロープレ実施記録",
  description: "ロープレの実施日、営業役、お客さん役、実施範囲を記録します。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RoleplayLogPage() {
  return <RoleplayLogClient />;
}
