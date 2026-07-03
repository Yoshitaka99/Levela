import { NextResponse } from "next/server";
import { isChatbotAdminAuthorized } from "@/app/lib/chatbotAdminAuth";
import {
  listChatbotQuestionLogs,
  summarizeChatbotQuestionLogs,
} from "@/app/lib/chatbotQuestionLog";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  if (!isChatbotAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = listChatbotQuestionLogs();

  return NextResponse.json({
    records,
    summary: summarizeChatbotQuestionLogs(records),
    updatedAt: new Date().toISOString(),
  });
}
