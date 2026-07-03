export type ChatbotConversationMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ChatbotConversationRecord = {
  id: string;
  deviceId: string;
  chatId: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
  messages: ChatbotConversationMessage[];
};

export type ChatbotConversationLogSummary = {
  total: number;
  deviceCount: number;
  storageMode: "runtime-memory";
  storageNotice: string;
};

type ChatbotConversationLogStore = {
  records: ChatbotConversationRecord[];
};

const MAX_CONVERSATIONS = 300;
const MAX_MESSAGES_PER_CONVERSATION = 60;
const MAX_TEXT_LENGTH = 4000;

declare global {
  var __levelaChatbotConversationLogStore:
    | ChatbotConversationLogStore
    | undefined;
}

function getStore() {
  if (!globalThis.__levelaChatbotConversationLogStore) {
    globalThis.__levelaChatbotConversationLogStore = { records: [] };
  }

  return globalThis.__levelaChatbotConversationLogStore;
}

function sanitizeText(value: unknown, fallback = "") {
  return String(value ?? fallback).trim().slice(0, MAX_TEXT_LENGTH);
}

function sanitizeMessage(
  value: unknown
): ChatbotConversationMessage | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ChatbotConversationMessage>;
  const role = candidate.role === "assistant" ? "assistant" : "user";
  const text = sanitizeText(candidate.text);

  if (!text) return null;

  return { role, text };
}

export function upsertChatbotConversation(
  record: Omit<ChatbotConversationRecord, "id" | "messageCount">
) {
  const deviceId = sanitizeText(record.deviceId, "unknown-device").slice(0, 120);
  const chatId = sanitizeText(record.chatId, "unknown-chat").slice(0, 120);
  const messages = record.messages
    .map(sanitizeMessage)
    .filter((message): message is ChatbotConversationMessage => Boolean(message))
    .slice(-MAX_MESSAGES_PER_CONVERSATION);

  if (!deviceId || !chatId || messages.length === 0) return null;

  const nextRecord: ChatbotConversationRecord = {
    id: `${deviceId}:${chatId}`,
    deviceId,
    chatId,
    title: sanitizeText(record.title, "新しい相談").slice(0, 120),
    preview: sanitizeText(record.preview).slice(0, 240),
    updatedAt: record.updatedAt || new Date().toISOString(),
    messageCount: messages.length,
    messages,
  };
  const store = getStore();

  store.records = [
    nextRecord,
    ...store.records.filter((item) => item.id !== nextRecord.id),
  ]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, MAX_CONVERSATIONS);

  return nextRecord;
}

export function listChatbotConversations() {
  return [...getStore().records].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function summarizeChatbotConversations(
  records = listChatbotConversations()
): ChatbotConversationLogSummary {
  return {
    total: records.length,
    deviceCount: new Set(records.map((record) => record.deviceId)).size,
    storageMode: "runtime-memory",
    storageNotice:
      "現段階はランタイムメモリ保存です。Vercelの再起動や別インスタンスでは消えるため、長期保存はDBまたはGoogle Sheets連携が必要です。",
  };
}
