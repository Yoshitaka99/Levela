import type { Metadata } from "next";
import { ChatbotClient } from "@/app/chatbot/ChatbotClient";

const BOT_NAME = "\u4f55\u3067\u3082\u4ffa\u306b\u805e\u3051\u541b";

export const metadata: Metadata = {
  title: `${BOT_NAME} | levela.sale`,
  metadataBase: new URL("https://levela.vercel.app"),
  alternates: {
    canonical: "/sale/chatbot",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SaleChatbotPage() {
  return <ChatbotClient />;
}
