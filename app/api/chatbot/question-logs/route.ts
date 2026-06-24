import { NextResponse } from "next/server";
import {
  listChatbotQuestionLogs,
  summarizeChatbotQuestionLogs,
} from "@/app/lib/chatbotQuestionLog";

export const dynamic = "force-dynamic";

export function GET() {
  const records = listChatbotQuestionLogs();

  return NextResponse.json({
    records,
    summary: summarizeChatbotQuestionLogs(records),
    updatedAt: new Date().toISOString(),
  });
}
