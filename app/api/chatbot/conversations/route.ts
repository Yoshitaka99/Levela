import { NextResponse } from "next/server";
import { isChatbotAdminAuthorized } from "@/app/lib/chatbotAdminAuth";
import {
  listChatbotConversations,
  summarizeChatbotConversations,
  upsertChatbotConversation,
  type ChatbotConversationMessage,
} from "@/app/lib/chatbotConversationLog";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  if (!isChatbotAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = listChatbotConversations();

  return NextResponse.json({
    records,
    summary: summarizeChatbotConversations(records),
    updatedAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        deviceId?: string;
        chatId?: string;
        title?: string;
        preview?: string;
        updatedAt?: string;
        messages?: ChatbotConversationMessage[];
      }
    | null;

  if (!body?.deviceId || !body.chatId || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  }

  const record = upsertChatbotConversation({
    deviceId: body.deviceId,
    chatId: body.chatId,
    title: body.title ?? "新しい相談",
    preview: body.preview ?? "",
    updatedAt: body.updatedAt ?? new Date().toISOString(),
    messages: body.messages,
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  }

  return NextResponse.json({ record });
}
