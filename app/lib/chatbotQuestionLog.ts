import {
  chatbotQuestionAnswerStatusLabels,
  type ChatbotQuestionAnswerStatus,
} from "./chatbotQuestionTaxonomy";

export type ChatbotQuestionLogRecord = {
  id: string;
  askedAt: string;
  majorCategory: string;
  minorCategory: string;
  questionText: string;
  answerStatus: ChatbotQuestionAnswerStatus;
  matchedSourceCount: number;
};

export type ChatbotQuestionLogSummary = {
  total: number;
  byMajorCategory: Array<{
    category: string;
    count: number;
  }>;
  byMinorCategory: Array<{
    majorCategory: string;
    minorCategory: string;
    count: number;
  }>;
  byAnswerStatus: Array<{
    status: ChatbotQuestionAnswerStatus;
    label: string;
    count: number;
  }>;
  storageMode: "runtime-memory";
  storageNotice: string;
};

type ChatbotQuestionLogStore = {
  records: ChatbotQuestionLogRecord[];
};

const MAX_RECORDS = 300;

declare global {
  var __levelaChatbotQuestionLogStore:
    | ChatbotQuestionLogStore
    | undefined;
}

function getStore() {
  if (!globalThis.__levelaChatbotQuestionLogStore) {
    globalThis.__levelaChatbotQuestionLogStore = { records: [] };
  }

  return globalThis.__levelaChatbotQuestionLogStore;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendChatbotQuestionLog(
  record: Omit<ChatbotQuestionLogRecord, "id">
) {
  if (!record.questionText.trim()) return null;

  const store = getStore();
  const nextRecord: ChatbotQuestionLogRecord = {
    ...record,
    id: createId(),
    questionText: record.questionText.trim().slice(0, 1200),
  };

  store.records = [nextRecord, ...store.records].slice(0, MAX_RECORDS);

  return nextRecord;
}

export function listChatbotQuestionLogs() {
  return [...getStore().records];
}

export function summarizeChatbotQuestionLogs(
  records = listChatbotQuestionLogs()
): ChatbotQuestionLogSummary {
  const majorCounts = new Map<string, number>();
  const minorCounts = new Map<
    string,
    { majorCategory: string; minorCategory: string; count: number }
  >();
  const statusCounts = new Map<ChatbotQuestionAnswerStatus, number>();

  for (const record of records) {
    majorCounts.set(
      record.majorCategory,
      (majorCounts.get(record.majorCategory) ?? 0) + 1
    );
    const minorKey = `${record.majorCategory}\u0000${record.minorCategory}`;
    const minorItem = minorCounts.get(minorKey);
    minorCounts.set(minorKey, {
      majorCategory: record.majorCategory,
      minorCategory: record.minorCategory,
      count: (minorItem?.count ?? 0) + 1,
    });
    statusCounts.set(
      record.answerStatus,
      (statusCounts.get(record.answerStatus) ?? 0) + 1
    );
  }

  return {
    total: records.length,
    byMajorCategory: [...majorCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    byMinorCategory: [...minorCounts.values()].sort(
      (a, b) =>
        b.count - a.count ||
        a.majorCategory.localeCompare(b.majorCategory) ||
        a.minorCategory.localeCompare(b.minorCategory)
    ),
    byAnswerStatus: ([
      "answered",
      "needs_review",
      "unanswered",
    ] as ChatbotQuestionAnswerStatus[]).map((status) => ({
      status,
      label: chatbotQuestionAnswerStatusLabels[status],
      count: statusCounts.get(status) ?? 0,
    })),
    storageMode: "runtime-memory",
    storageNotice:
      "現段階はランタイムメモリ保存です。Vercelの再起動や別インスタンスでは消えるため、長期保存はDBまたはGoogle Sheets連携が必要です。",
  };
}
