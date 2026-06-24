import type { Metadata } from "next";
import { ChatbotAdminClient } from "./ChatbotAdminClient";

export const metadata: Metadata = {
  title: "Levela Bot Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SaleChatbotAdminPage() {
  return <ChatbotAdminClient />;
}
