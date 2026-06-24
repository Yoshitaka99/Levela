"use client";

import type { UIMessage } from "ai";
import type {
  ChatbotQuestionLogRecord,
  ChatbotQuestionLogSummary,
} from "./chatbotQuestionLog";
import {
  chatbotQuestionAnswerStatusLabels,
  classifyChatbotQuestion,
  determineChatbotAnswerStatusFromAnswer,
  type ChatbotQuestionAnswerStatus,
} from "./chatbotQuestionTaxonomy";

const BROWSER_LOG_KEY = "levela.sales.bot.question.logs";
const MAX_BROWSER_RECORDS = 300;

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

function createBrowserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `browser-${crypto.randomUUID()}`;
  }

  return `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inferMatchedSourceCount(answerText: string) {
  const matches = answerText.match(/\/chatbot-knowledge\/|https?:\/\//g);
  return matches?.length ?? 0;
}

function inferAnswerStatus(
  questionText: string,
  answerText: string
): ChatbotQuestionAnswerStatus {
  return determineChatbotAnswerStatusFromAnswer({
    question: questionText,
    answer: answerText,
    matchedSourceCount: inferMatchedSourceCount(answerText),
  });
}

function readRawBrowserLogs() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(BROWSER_LOG_KEY);
    if (!value) return [];

    return JSON.parse(value) as ChatbotQuestionLogRecord[];
  } catch {
    return [];
  }
}

function writeBrowserLogs(records: ChatbotQuestionLogRecord[]) {
  window.localStorage.setItem(
    BROWSER_LOG_KEY,
    JSON.stringify(records.slice(0, MAX_BROWSER_RECORDS))
  );
}

export function appendBrowserQuestionLogFromMessages(messages: UIMessage[]) {
  const lastUserMessage = messages.findLast((message) => message.role === "user");
  const lastAssistantMessage = messages.findLast(
    (message) => message.role === "assistant"
  );
  const questionText = lastUserMessage ? getMessageText(lastUserMessage) : "";
  const answerText = lastAssistantMessage
    ? getMessageText(lastAssistantMessage)
    : "";

  if (!questionText) return null;

  const classification = classifyChatbotQuestion(questionText);
  const matchedSourceCount = inferMatchedSourceCount(answerText);
  const record: ChatbotQuestionLogRecord = {
    id: createBrowserId(),
    askedAt: new Date().toISOString(),
    majorCategory: classification.majorCategory,
    minorCategory: classification.minorCategory,
    questionText: questionText.slice(0, 1200),
    answerStatus: inferAnswerStatus(questionText, answerText),
    matchedSourceCount,
  };
  const records = [record, ...readRawBrowserLogs()].slice(0, MAX_BROWSER_RECORDS);
  writeBrowserLogs(records);

  return record;
}

export function listBrowserQuestionLogs() {
  return readRawBrowserLogs();
}

export function summarizeQuestionLogsForBrowser(
  records: ChatbotQuestionLogRecord[]
): ChatbotQuestionLogSummary {
  const majorCounts = new Map<string, number>();
  const statusCounts = new Map<ChatbotQuestionAnswerStatus, number>();

  for (const record of records) {
    majorCounts.set(
      record.majorCategory,
      (majorCounts.get(record.majorCategory) ?? 0) + 1
    );
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
      "現段階はブラウザ保存とランタイムメモリ保存です。全ユーザー分の長期集計にはDBまたはGoogle Sheets連携が必要です。",
  };
}
