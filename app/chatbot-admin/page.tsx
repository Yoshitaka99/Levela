import type { Metadata } from "next";
import { getChatbotOcrResultCount } from "@/app/lib/chatbotOcrKnowledge";
import {
  chatbotKnowledgeSources,
  getKnowledgeSourceCounts,
} from "@/app/lib/chatbotKnowledgeSources";
import { ChatbotAdminClient } from "./ChatbotAdminClient";

export const metadata: Metadata = {
  title: "Levela Bot Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChatbotAdminPage() {
  return (
    <ChatbotAdminClient
      sourceCount={chatbotKnowledgeSources.length}
      sourceCounts={getKnowledgeSourceCounts()}
      ocrResultCount={getChatbotOcrResultCount()}
    />
  );
}
