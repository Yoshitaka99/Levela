import type { Metadata } from "next";
import { getChatbotOcrResultCount } from "@/app/lib/chatbotOcrKnowledge";
import {
  chatbotKnowledgeSources,
  getKnowledgeSourceCounts,
} from "@/app/lib/chatbotKnowledgeSources";
import { getChatbotAdminSources } from "@/app/chatbot-admin/adminSources";
import { ChatbotAdminClient } from "@/app/chatbot-admin/ChatbotAdminClient";

export const metadata: Metadata = {
  title: "Levela Bot Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SaleChatbotAdminPage() {
  return (
    <ChatbotAdminClient
      sourceCount={chatbotKnowledgeSources.length}
      sourceCounts={getKnowledgeSourceCounts()}
      ocrResultCount={getChatbotOcrResultCount()}
      sources={getChatbotAdminSources()}
    />
  );
}
