"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Braces,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Database,
  ExternalLink,
  FileText,
  HelpCircle,
  Images,
  RefreshCcw,
  Settings2,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import type { ChatbotAdminSource } from "./adminSources";
import type { ChatbotKnowledgeCategory } from "@/app/lib/chatbotKnowledgeSources";
import type {
  ChatbotQuestionLogRecord,
  ChatbotQuestionLogSummary,
} from "@/app/lib/chatbotQuestionLog";
import type { ChatbotQuestionAnswerStatus } from "@/app/lib/chatbotQuestionTaxonomy";
import {
  listBrowserQuestionLogs,
  summarizeQuestionLogsForBrowser,
} from "@/app/lib/chatbotQuestionLogBrowser";

const adminStarters = [
  {
    icon: Database,
    text: "保存済みの資料URLを一覧として確認したい",
  },
  {
    icon: CalendarClock,
    text: "予約変更や当日トラブルの確認先を教えて",
  },
  {
    icon: Braces,
    text: "このボットをNotion本文まで答えられる形にするには何が必要？",
  },
];

type SourceCount = {
  category: ChatbotKnowledgeCategory;
  count: number;
};

type ChatbotAdminClientProps = {
  sourceCount: number;
  sourceCounts: SourceCount[];
  ocrResultCount: number;
  sources: ChatbotAdminSource[];
};

type QuestionLogResponse = {
  records: ChatbotQuestionLogRecord[];
  summary: ChatbotQuestionLogSummary;
  updatedAt: string;
};

type QuestionLogFilter = "all" | ChatbotQuestionAnswerStatus;

const answerStatusStyle: Record<
  ChatbotQuestionAnswerStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    className: string;
  }
> = {
  answered: {
    label: "回答済み",
    icon: CheckCircle2,
    className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  },
  needs_review: {
    label: "要確認",
    icon: AlertTriangle,
    className: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  },
  unanswered: {
    label: "未回答",
    icon: HelpCircle,
    className: "border-rose-300/40 bg-rose-300/10 text-rose-100",
  },
};

export function ChatbotAdminClient({
  sourceCount,
  sourceCounts,
  ocrResultCount,
  sources,
}: ChatbotAdminClientProps) {
  const [input, setInput] = useState("");
  const [clientError, setClientError] = useState("");
  const [selectedSourceSlug, setSelectedSourceSlug] = useState(
    () => sources[0]?.slug ?? ""
  );
  const [questionLogData, setQuestionLogData] =
    useState<QuestionLogResponse | null>(null);
  const [questionLogLoading, setQuestionLogLoading] = useState(true);
  const [questionLogError, setQuestionLogError] = useState("");
  const [questionLogFilter, setQuestionLogFilter] =
    useState<QuestionLogFilter>("all");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chatbot" }),
    []
  );
  const selectedSource = useMemo(
    () =>
      sources.find((source) => source.slug === selectedSourceSlug) ??
      sources[0] ??
      null,
    [selectedSourceSlug, sources]
  );
  const filteredQuestionLogs = useMemo(() => {
    const records = questionLogData?.records ?? [];
    const visibleRecords =
      questionLogFilter === "all"
        ? records
        : records.filter((record) => record.answerStatus === questionLogFilter);

    return [...visibleRecords].sort((a, b) => {
      const statusRank: Record<ChatbotQuestionAnswerStatus, number> = {
        unanswered: 3,
        needs_review: 2,
        answered: 1,
      };

      return (
        statusRank[b.answerStatus] - statusRank[a.answerStatus] ||
        new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime()
      );
    });
  }, [questionLogData?.records, questionLogFilter]);

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    transport,
    onError: (currentError) => setClientError(currentError.message),
  });

  const busy = status === "submitted" || status === "streaming";

  function submit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text) return;
    setClientError("");
    sendMessage({ text });
    setInput("");
  }

  function sendStarter(text: string) {
    setClientError("");
    sendMessage({ text });
  }

  function openInternalSource(source: ChatbotAdminSource) {
    setSelectedSourceSlug(source.slug);
    window.open(source.internalPath, "_blank", "noopener,noreferrer")?.focus();
  }

  const loadQuestionLogs = useCallback(async () => {
    setQuestionLogLoading(true);
    setQuestionLogError("");

    try {
      const response = await fetch("/api/chatbot/question-logs", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("質問ログを取得できませんでした。");
      }

      const data = (await response.json()) as QuestionLogResponse;
      const records = mergeQuestionLogs([
        ...listBrowserQuestionLogs(),
        ...data.records,
      ]);

      setQuestionLogData({
        ...data,
        records,
        summary: summarizeQuestionLogsForBrowser(records),
      });
    } catch (currentError) {
      setQuestionLogError(
        currentError instanceof Error
          ? currentError.message
          : "質問ログを取得できませんでした。"
      );
    } finally {
      setQuestionLogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuestionLogs();
  }, [loadQuestionLogs]);

  return (
    <main className="dark min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5">
        <header className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <Settings2 className="size-3.5" />
              chatbot admin
            </div>
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
              Levela Bot 管理画面
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              API接続、資料URL、実データ連携の確認用画面です。一般ユーザーには見せない前提の操作席です。
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-fit border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-white"
          >
            <Link href="/sale/chatbot">
              一般ユーザー画面を開く
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </header>

        <section className="grid min-h-0 flex-1 gap-4 py-4 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-3 text-xs font-medium text-muted-foreground">
                API slots
              </div>
              <div className="space-y-2 text-sm">
                <ApiSlot name="OpenAI API" state="env gated" />
                <ApiSlot name="Notion / tl;dv" state="URL registry" />
                <ApiSlot name="Google Sheets" state="mock tool" />
                <ApiSlot name="Discord" state="mock tool" />
              </div>
              <div className="mt-4 rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                実APIを使う場合は <code>CHATBOT_LIVE_OPENAI=true</code> と{" "}
                <code>OPENAI_API_KEY</code> を設定します。
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <FileText className="size-3.5" />
                  保存済み資料
                </div>
                <div className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {sourceCount}件
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                {sourceCounts.map((item) => (
                  <div
                    key={item.category}
                    className="rounded-md border border-border bg-background px-2 py-1.5"
                  >
                    <div className="truncate text-[11px] text-muted-foreground">
                      {item.category}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">
                      {item.count}件
                    </div>
                  </div>
                ))}
                <div className="rounded-md border border-border bg-background px-2 py-1.5">
                  <div className="truncate text-[11px] text-muted-foreground">
                    画像OCR
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">
                    {ocrResultCount}件
                  </div>
                </div>
              </div>

              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {sources.map((source) => {
                  const selected = selectedSource?.slug === source.slug;

                  return (
                    <button
                      key={source.slug}
                      type="button"
                      onClick={() => setSelectedSourceSlug(source.slug)}
                      onDoubleClick={() => openInternalSource(source)}
                      aria-label={`${source.title}を選択。ダブルクリックで内部記事を別タブで開く`}
                      title="ダブルクリックで内部記事を別タブで開く"
                      className={
                        selected
                          ? "w-full rounded-md border border-cyan-300/70 bg-cyan-300/10 px-3 py-2 text-left shadow-sm shadow-cyan-950/30"
                          : "w-full rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:border-slate-500 hover:bg-slate-900"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {source.title}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {source.category}
                          </div>
                        </div>
                        <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5">
                          本文 {source.textBlockCount}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                          <Images className="size-3" />
                          {source.imageCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedSource ? (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    選択中の資料
                  </div>
                  <h2 className="text-base font-semibold leading-6">
                    {selectedSource.title}
                  </h2>
                  <p className="mt-2 line-clamp-4 text-xs leading-5 text-muted-foreground">
                    {selectedSource.preview || "本文プレビューはありません。"}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="justify-start bg-white text-slate-950 hover:bg-slate-200"
                    >
                      <Link href={selectedSource.internalPath}>
                        <BookOpen className="size-3.5" />
                        内部記事で見る
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="justify-start border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-white"
                    >
                      <a
                        href={selectedSource.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                        元の資料を開く
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          <div className="flex min-h-[640px] min-w-0 flex-col gap-4">
            <QuestionLogPanel
              data={questionLogData}
              error={questionLogError}
              filter={questionLogFilter}
              filteredRecords={filteredQuestionLogs}
              isLoading={questionLogLoading}
              onFilterChange={setQuestionLogFilter}
              onRefresh={loadQuestionLogs}
            />

            <details className="rounded-lg border border-slate-800 bg-slate-950/60">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200 marker:text-slate-500">
                管理用プロンプトの動作確認
                <span className="ml-2 text-xs font-normal text-slate-500">
                  API接続や回答の出方を確認する時だけ開きます
                </span>
              </summary>

          <div className="flex min-h-[520px] flex-col overflow-hidden border-t border-slate-800 bg-card">
            <Conversation className="min-h-0">
              <ConversationContent className="min-h-full gap-5 p-4 md:p-6">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={<Bot className="size-10" />}
                    title="管理用プロンプトを試す"
                    description="資料URL、API接続、業務フローを確認できます。"
                  >
                    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
                      <Bot className="size-10 text-muted-foreground" />
                      <div className="text-center">
                        <h2 className="text-lg font-medium">
                          管理用プロンプトを試す
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          接続したいAPIや、答えさせたい業務フローを入力してください。
                        </p>
                      </div>
                      <div className="grid w-full gap-2">
                        {adminStarters.map((starter) => (
                          <Button
                            key={starter.text}
                            type="button"
                            variant="outline"
                            className="h-auto justify-start gap-2 whitespace-normal px-3 py-2 text-left"
                            onClick={() => sendStarter(starter.text)}
                          >
                            <starter.icon className="size-4 shrink-0" />
                            <span>{starter.text}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </ConversationEmptyState>
                ) : (
                  messages.map((message) => (
                    <Message from={message.role} key={message.id}>
                      <MessageContent
                        className={
                          message.role === "assistant"
                            ? "max-w-[min(760px,100%)] text-slate-50"
                            : "max-w-[min(78%,720px)] bg-white text-slate-950"
                        }
                      >
                        {message.parts.map((part, index) => {
                          if (part.type === "text") {
                            return (
                              <MessageResponse key={`${message.id}-${index}`}>
                                {part.text}
                              </MessageResponse>
                            );
                          }

                          if (part.type.startsWith("tool-")) {
                            return (
                              <div
                                key={`${message.id}-${index}`}
                                className="rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground"
                              >
                                {part.type.replace("tool-", "api: ")}
                              </div>
                            );
                          }

                          return <Fragment key={`${message.id}-${index}`} />;
                        })}
                      </MessageContent>
                    </Message>
                  ))
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {(clientError || error) && (
              <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {clientError || error?.message}
              </div>
            )}

            <div className="border-t border-border p-3 md:p-4">
              <PromptInput
                className="rounded-2xl bg-slate-900 text-slate-50 shadow-lg shadow-black/30"
                onSubmit={submit}
              >
                <PromptInputTextarea
                  value={input}
                  onChange={(event) => setInput(event.currentTarget.value)}
                  placeholder="例: 決済まわりの資料URLを確認したい"
                  className="min-h-20 text-slate-50 placeholder:text-slate-400"
                  disabled={busy}
                />
                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => regenerate()}
                    disabled={messages.length === 0 || busy}
                  >
                    <RefreshCcw className="size-3.5" />
                    再生成
                  </Button>
                  <PromptInputSubmit
                    status={status}
                    onStop={stop}
                    className="bg-white text-slate-950 hover:bg-slate-200"
                    disabled={!input.trim() && !busy}
                  />
                </div>
              </PromptInput>
            </div>
          </div>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}

function QuestionLogPanel({
  data,
  error,
  filter,
  filteredRecords,
  isLoading,
  onFilterChange,
  onRefresh,
}: {
  data: QuestionLogResponse | null;
  error: string;
  filter: QuestionLogFilter;
  filteredRecords: ChatbotQuestionLogRecord[];
  isLoading: boolean;
  onFilterChange: (filter: QuestionLogFilter) => void;
  onRefresh: () => void;
}) {
  const summary = data?.summary;
  const total = summary?.total ?? 0;
  const statusFilters: QuestionLogFilter[] = [
    "all",
    "answered",
    "needs_review",
    "unanswered",
  ];

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
            <ClipboardList className="size-3.5" />
            question logs
          </div>
          <h2 className="text-xl font-semibold">質問ログ</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            一般ユーザー画面で質問された内容を、未回答・要確認を見落とさない順番で確認します。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-white"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCcw className={isLoading ? "size-3.5 animate-spin" : "size-3.5"} />
          更新
        </Button>
      </div>

      <div className="grid gap-2 py-4 md:grid-cols-4">
        <MetricCard
          icon={BarChart3}
          label="質問数"
          value={`${total}件`}
        />
        {(["answered", "needs_review", "unanswered"] as ChatbotQuestionAnswerStatus[]).map(
          (status) => {
            const style = answerStatusStyle[status];
            const Icon = style.icon;
            const count =
              summary?.byAnswerStatus.find((item) => item.status === status)
                ?.count ?? 0;

            return (
              <MetricCard
                key={status}
                icon={Icon}
                label={style.label}
                value={`${count}件`}
              />
            );
          }
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {statusFilters.map((item) => {
          const active = filter === item;
          const label =
            item === "all" ? "すべて" : answerStatusStyle[item].label;

          return (
            <button
              key={item}
              type="button"
              className={
                active
                  ? "rounded-full border border-cyan-300/60 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100"
                  : "rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
              }
              onClick={() => onFilterChange(item)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {summary?.byMajorCategory.length ? (
        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {summary.byMajorCategory.map((item) => (
            <span
              key={item.category}
              className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400"
            >
              {item.category}
              <span className="ml-1 font-semibold text-slate-100">
                {item.count}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!error && filteredRecords.length === 0 ? (
        <div className="rounded-md border border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
          {isLoading
            ? "質問ログを読み込み中です。"
            : "まだ表示できる質問ログはありません。一般ユーザー画面から質問するとここに表示されます。"}
        </div>
      ) : null}

      {filteredRecords.length > 0 ? (
        <div className="max-h-[460px] space-y-2 overflow-auto pr-1">
          {filteredRecords.map((record) => (
            <QuestionLogRow key={record.id} record={record} />
          ))}
        </div>
      ) : null}

      {summary?.storageNotice ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {summary.storageNotice}
        </p>
      ) : null}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function QuestionLogRow({ record }: { record: ChatbotQuestionLogRecord }) {
  const style = answerStatusStyle[record.answerStatus];
  const Icon = style.icon;

  return (
    <article className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${style.className}`}
          >
            <Icon className="size-3" />
            {style.label}
          </span>
          <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300">
            {record.majorCategory}
          </span>
          <span className="rounded-full border border-slate-800 px-2 py-1 text-[11px] text-slate-400">
            {record.minorCategory}
          </span>
        </div>
        <div className="shrink-0 text-xs leading-5 text-slate-500">
          {formatAskedAt(record.askedAt)}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words leading-6 text-slate-100">
        {record.questionText}
      </p>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
        <span>参照候補 {record.matchedSourceCount}件</span>
        {record.answerStatus !== "answered" ? (
          <span>確認対象として残します</span>
        ) : null}
      </div>
    </article>
  );
}

function formatAskedAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mergeQuestionLogs(records: ChatbotQuestionLogRecord[]) {
  const groupedById = new Map<string, ChatbotQuestionLogRecord>();

  for (const record of records) {
    groupedById.set(record.id, record);
  }

  const sorted = [...groupedById.values()].sort(
    (a, b) =>
      new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime()
  );
  const merged: ChatbotQuestionLogRecord[] = [];

  for (const record of sorted) {
    const duplicateIndex = merged.findIndex(
      (existing) =>
        existing.questionText === record.questionText &&
        Math.abs(
          new Date(existing.askedAt).getTime() -
            new Date(record.askedAt).getTime()
        ) < 60_000
    );

    if (duplicateIndex === -1) {
      merged.push(record);
      continue;
    }

    merged[duplicateIndex] = combineQuestionLogRecords(
      merged[duplicateIndex],
      record
    );
  }

  return merged;
}

function combineQuestionLogRecords(
  first: ChatbotQuestionLogRecord,
  second: ChatbotQuestionLogRecord
): ChatbotQuestionLogRecord {
  const statusRank: Record<ChatbotQuestionAnswerStatus, number> = {
    unanswered: 3,
    needs_review: 2,
    answered: 1,
  };
  const answerStatus =
    statusRank[first.answerStatus] >= statusRank[second.answerStatus]
      ? first.answerStatus
      : second.answerStatus;
  const askedAt =
    new Date(first.askedAt).getTime() >= new Date(second.askedAt).getTime()
      ? first.askedAt
      : second.askedAt;

  return {
    ...first,
    askedAt,
    answerStatus,
    matchedSourceCount: Math.max(
      first.matchedSourceCount,
      second.matchedSourceCount
    ),
  };
}

function ApiSlot({ name, state }: { name: string; state: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <span className="font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">{state}</span>
    </div>
  );
}
