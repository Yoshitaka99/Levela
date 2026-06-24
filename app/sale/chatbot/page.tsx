import type { Metadata } from "next";
import { ChatbotClient } from "./ChatbotClient";

export const metadata: Metadata = {
  title: "Levela Bot",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SaleChatbotPage() {
  return <ChatbotClient />;
}
