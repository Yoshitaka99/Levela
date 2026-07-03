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
  ChevronDown,
  ClipboardList,
  Database,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Images,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  RefreshCcw,
  Settings2,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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
import type {
  ChatbotConversationLogSummary,
  ChatbotConversationRecord,
} from "@/app/lib/chatbotConversationLog";
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

type ConversationLogResponse = {
  records: ChatbotConversationRecord[];
  summary: ChatbotConversationLogSummary;
  updatedAt: string;
};

type QuestionLogFilter = "all" | ChatbotQuestionAnswerStatus;
type QuestionLogCategoryFilter = string;

type QuestionLogMonthOption = {
  value: string;
  label: string;
};

type QuestionLogCategoryOption = {
  value: string;
  label: string;
};

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
const ADMIN_PASSWORD = "Levela2026";
const ADMIN_PASSWORD_STORAGE_KEY = "levela.sales.bot.admin.password";

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
  const [questionLogMonth, setQuestionLogMonth] = useState("all");
  const [questionLogMajorCategory, setQuestionLogMajorCategory] =
    useState<QuestionLogCategoryFilter>("all");
  const [questionLogMinorCategory, setQuestionLogMinorCategory] =
    useState<QuestionLogCategoryFilter>("all");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState("");
  const [conversationLogData, setConversationLogData] =
    useState<ConversationLogResponse | null>(null);
  const [conversationLogLoading, setConversationLogLoading] = useState(false);
  const [conversationLogError, setConversationLogError] = useState("");
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
  const questionLogMonthOptions = useMemo(
    () => createQuestionLogMonthOptions(questionLogData?.records ?? []),
    [questionLogData?.records]
  );
  const questionLogMajorCategoryOptions = useMemo(
    () => createQuestionLogMajorCategoryOptions(questionLogData?.records ?? []),
    [questionLogData?.records]
  );
  const periodQuestionLogs = useMemo(() => {
    const records = questionLogData?.records ?? [];
    if (questionLogMonth === "all") return records;

    return records.filter(
      (record) => getQuestionLogMonthKey(record.askedAt) === questionLogMonth
    );
  }, [questionLogData?.records, questionLogMonth]);
  const questionLogMinorCategoryOptions = useMemo(
    () =>
      createQuestionLogMinorCategoryOptions(
        periodQuestionLogs,
        questionLogMajorCategory
      ),
    [periodQuestionLogs, questionLogMajorCategory]
  );
  const periodQuestionLogSummary = useMemo(
    () => summarizeQuestionLogsForBrowser(periodQuestionLogs),
    [periodQuestionLogs]
  );
  const filteredQuestionLogs = useMemo(() => {
    const visibleRecords = periodQuestionLogs.filter((record) => {
      const matchesStatus =
        questionLogFilter === "all" ||
        record.answerStatus === questionLogFilter;
      const matchesMajor =
        questionLogMajorCategory === "all" ||
        record.majorCategory === questionLogMajorCategory;
      const matchesMinor =
        questionLogMinorCategory === "all" ||
        record.minorCategory === questionLogMinorCategory;

      return matchesStatus && matchesMajor && matchesMinor;
    });

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
  }, [
    periodQuestionLogs,
    questionLogFilter,
    questionLogMajorCategory,
    questionLogMinorCategory,
  ]);
  const filteredQuestionLogSummary = useMemo(
    () => summarizeQuestionLogsForBrowser(filteredQuestionLogs),
    [filteredQuestionLogs]
  );

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    transport,
    onError: (currentError) => setClientError(currentError.message),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const storedPassword = window.localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
    if (storedPassword === ADMIN_PASSWORD) {
      setAdminPassword(storedPassword);
      setAdminAuthenticated(true);
    }
  }, []);

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
    if (!adminAuthenticated) return;

    setQuestionLogLoading(true);
    setQuestionLogError("");

    try {
      const response = await fetch("/api/chatbot/question-logs", {
        cache: "no-store",
        headers: {
          "x-levela-admin-password": adminPassword,
        },
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
  }, [adminAuthenticated, adminPassword]);

  const loadConversationLogs = useCallback(async () => {
    if (!adminAuthenticated) return;

    setConversationLogLoading(true);
    setConversationLogError("");

    try {
      const response = await fetch("/api/chatbot/conversations", {
        cache: "no-store",
        headers: {
          "x-levela-admin-password": adminPassword,
        },
      });

      if (!response.ok) {
        throw new Error("チャット履歴を取得できませんでした。");
      }

      setConversationLogData((await response.json()) as ConversationLogResponse);
    } catch (currentError) {
      setConversationLogError(
        currentError instanceof Error
          ? currentError.message
          : "チャット履歴を取得できませんでした。"
      );
    } finally {
      setConversationLogLoading(false);
    }
  }, [adminAuthenticated, adminPassword]);

  useEffect(() => {
    if (!adminAuthenticated) return;
    void loadQuestionLogs();
    void loadConversationLogs();
  }, [adminAuthenticated, loadConversationLogs, loadQuestionLogs]);

  useEffect(() => {
    if (
      questionLogMonth !== "all" &&
      !questionLogMonthOptions.some((option) => option.value === questionLogMonth)
    ) {
      setQuestionLogMonth("all");
    }
  }, [questionLogMonth, questionLogMonthOptions]);

  useEffect(() => {
    if (
      questionLogMajorCategory !== "all" &&
      !questionLogMajorCategoryOptions.some(
        (option) => option.value === questionLogMajorCategory
      )
    ) {
      setQuestionLogMajorCategory("all");
      setQuestionLogMinorCategory("all");
    }
  }, [questionLogMajorCategory, questionLogMajorCategoryOptions]);

  useEffect(() => {
    if (
      questionLogMinorCategory !== "all" &&
      !questionLogMinorCategoryOptions.some(
        (option) => option.value === questionLogMinorCategory
      )
    ) {
      setQuestionLogMinorCategory("all");
    }
  }, [questionLogMinorCategory, questionLogMinorCategoryOptions]);

  function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminAuthError("");

    if (adminPassword !== ADMIN_PASSWORD) {
      setAdminAuthError("パスワードが違います。");
      return;
    }

    window.localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, adminPassword);
    setAdminAuthenticated(true);
  }

  function handleAdminLogout() {
    window.localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
    setAdminPassword("");
    setAdminAuthenticated(false);
    setQuestionLogData(null);
    setConversationLogData(null);
    setQuestionLogMonth("all");
    setQuestionLogFilter("all");
    setQuestionLogMajorCategory("all");
    setQuestionLogMinorCategory("all");
  }

  if (!adminAuthenticated) {
    return (
      <AdminPasswordGate
        error={adminAuthError}
        password={adminPassword}
        onPasswordChange={setAdminPassword}
        onSubmit={handleAdminLogin}
      />
    );
  }

  return (
    <main className="dark min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-3 sm:px-4 md:py-5">
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
              <Settings2 className="size-3.5" />
              chatbot admin
            </div>
            <h1 className="text-xl font-semibold tracking-normal md:text-3xl">
              Levela Bot 管理画面
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              質問ログの確認と出力を中心に、必要な管理項目だけ展開して使います。
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-white sm:w-fit"
            onClick={handleAdminLogout}
            type="button"
          >
            <LogOut className="size-3.5" />
            ログアウト
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-white sm:w-fit"
          >
            <Link href="/sale/chatbot">
              一般ユーザー画面を開く
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </header>

        <section className="grid min-h-0 flex-1 gap-3 py-3 lg:grid-cols-[320px_1fr] lg:gap-4 lg:py-4">
          <aside className="order-2 space-y-3 lg:order-1">
            <AdminFolder
              title="接続状態"
              description="API・外部連携の確認"
              icon={Database}
              meta="4 slots"
            >
              <div className="space-y-2 text-sm">
                <ApiSlot name="OpenAI API" state="env gated" />
                <ApiSlot name="Notion / tl;dv" state="URL registry" />
                <ApiSlot name="Google Sheets" state="mock tool" />
                <ApiSlot name="Discord" state="mock tool" />
              </div>
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-500">
                実APIを使う場合は <code>CHATBOT_LIVE_OPENAI=true</code> と{" "}
                <code>OPENAI_API_KEY</code> を設定します。
              </div>
            </AdminFolder>

            <AdminFolder
              title="保存済み資料"
              description="資料一覧・内部記事の確認"
              icon={FileText}
              meta={`${sourceCount}件`}
            >
              <div className="mb-3 grid grid-cols-2 gap-2">
                {sourceCounts.map((item) => (
                  <div
                    key={item.category}
                    className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5"
                  >
                    <div className="truncate text-[11px] text-slate-500">
                      {item.category}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">
                      {item.count}件
                    </div>
                  </div>
                ))}
                <div className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5">
                  <div className="truncate text-[11px] text-slate-500">
                    画像OCR
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">
                    {ocrResultCount}件
                  </div>
                </div>
              </div>

              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
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
                          : "w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-left transition-colors hover:border-slate-600 hover:bg-slate-900"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {source.title}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {source.category}
                          </div>
                        </div>
                        <BookOpen className="mt-0.5 size-4 shrink-0 text-slate-500" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                        <span className="rounded bg-slate-900 px-1.5 py-0.5">
                          本文 {source.textBlockCount}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5">
                          <Images className="size-3" />
                          {source.imageCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedSource ? (
                <div className="mt-3 border-t border-slate-800 pt-3">
                  <div className="mb-1 text-xs font-medium text-slate-500">
                    選択中
                  </div>
                  <h2 className="text-sm font-semibold leading-6">
                    {selectedSource.title}
                  </h2>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
                    {selectedSource.preview || "本文プレビューはありません。"}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <Button
                      asChild
                      size="sm"
                      className="justify-start bg-white text-slate-950 hover:bg-slate-200"
                    >
                      <Link href={selectedSource.internalPath}>
                        <BookOpen className="size-3.5" />
                        内部記事
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
                        元資料
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}
            </AdminFolder>
          </aside>

          <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2 lg:min-h-[640px] lg:gap-4">
            <QuestionLogPanel
              error={questionLogError}
              filter={questionLogFilter}
              majorCategoryFilter={questionLogMajorCategory}
              majorCategoryOptions={questionLogMajorCategoryOptions}
              minorCategoryFilter={questionLogMinorCategory}
              minorCategoryOptions={questionLogMinorCategoryOptions}
              filteredRecords={filteredQuestionLogs}
              filteredSummary={filteredQuestionLogSummary}
              isLoading={questionLogLoading}
              monthFilter={questionLogMonth}
              monthOptions={questionLogMonthOptions}
              periodSummary={periodQuestionLogSummary}
              onFilterChange={setQuestionLogFilter}
              onMajorCategoryChange={(value) => {
                setQuestionLogMajorCategory(value);
                setQuestionLogMinorCategory("all");
              }}
              onMinorCategoryChange={setQuestionLogMinorCategory}
              onMonthChange={setQuestionLogMonth}
              onDownloadCsv={() =>
                downloadQuestionLogCsv({
                  records: filteredQuestionLogs,
                  statusFilter: questionLogFilter,
                  majorCategoryFilter: questionLogMajorCategory,
                  minorCategoryFilter: questionLogMinorCategory,
                  monthFilter: questionLogMonth,
                  monthOptions: questionLogMonthOptions,
                })
              }
              onRefresh={loadQuestionLogs}
            />

            <ConversationLogPanel
              data={conversationLogData}
              error={conversationLogError}
              isLoading={conversationLogLoading}
              onRefresh={loadConversationLogs}
            />

            <details className="group rounded-lg border border-slate-800 bg-slate-950/70">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-medium text-slate-200 marker:text-slate-500 md:px-4">
                <span className="flex min-w-0 items-center gap-2">
                  <Bot className="size-4 shrink-0 text-slate-500" />
                  <span className="truncate">管理用プロンプトの動作確認</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-slate-500">
                  必要時のみ
                  <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                </span>
              </summary>

          <div className="flex min-h-[360px] flex-col overflow-hidden border-t border-slate-800 bg-card md:min-h-[520px]">
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

function AdminPasswordGate({
  error,
  password,
  onPasswordChange,
  onSubmit,
}: {
  error: string;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-50">
      <form
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30"
        onSubmit={onSubmit}
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300">
            <LockKeyhole className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Levela Bot 管理画面</h1>
            <p className="mt-1 text-sm text-slate-400">
              管理パスワードを入力してください。
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm text-slate-300">
          パスワード
          <input
            autoFocus
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-50 outline-none transition focus:border-cyan-300"
            onChange={(event) => onPasswordChange(event.currentTarget.value)}
            placeholder="Levela2026"
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <div className="mt-3 rounded-md border border-rose-300/40 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <Button
          className="mt-5 w-full bg-white text-slate-950 hover:bg-slate-200"
          type="submit"
        >
          管理画面を開く
        </Button>
      </form>
    </main>
  );
}

function AdminFolder({
  title,
  description,
  icon: Icon,
  meta,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  meta: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-slate-800 bg-slate-950/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 marker:text-slate-500">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-400">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-100">
              {title}
            </span>
            <span className="block truncate text-xs text-slate-500">
              {description}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs text-slate-400">
            {meta}
          </span>
          <ChevronDown className="size-3.5 text-slate-500 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-slate-800 px-3 py-3">{children}</div>
    </details>
  );
}

function QuestionLogPanel({
  error,
  filter,
  majorCategoryFilter,
  majorCategoryOptions,
  minorCategoryFilter,
  minorCategoryOptions,
  filteredRecords,
  filteredSummary,
  isLoading,
  monthFilter,
  monthOptions,
  periodSummary,
  onFilterChange,
  onMajorCategoryChange,
  onMinorCategoryChange,
  onMonthChange,
  onDownloadCsv,
  onRefresh,
}: {
  error: string;
  filter: QuestionLogFilter;
  majorCategoryFilter: string;
  majorCategoryOptions: QuestionLogCategoryOption[];
  minorCategoryFilter: string;
  minorCategoryOptions: QuestionLogCategoryOption[];
  filteredRecords: ChatbotQuestionLogRecord[];
  filteredSummary: ChatbotQuestionLogSummary;
  isLoading: boolean;
  monthFilter: string;
  monthOptions: QuestionLogMonthOption[];
  periodSummary: ChatbotQuestionLogSummary;
  onFilterChange: (filter: QuestionLogFilter) => void;
  onMajorCategoryChange: (value: string) => void;
  onMinorCategoryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onDownloadCsv: () => void;
  onRefresh: () => void;
}) {
  const summary = filteredSummary;
  const total = filteredSummary.total;
  const periodTotal = periodSummary.total;
  const statusFilters: QuestionLogFilter[] = [
    "all",
    "answered",
    "needs_review",
    "unanswered",
  ];

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 shadow-xl shadow-black/20 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
            <ClipboardList className="size-3.5" />
            question logs
          </div>
          <h2 className="text-xl font-semibold">質問ログ</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            未回答・要確認を先に見て、必要な分だけ出力します。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-white sm:w-fit"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCcw className={isLoading ? "size-3.5 animate-spin" : "size-3.5"} />
          更新
        </Button>
      </div>

      <div className="mt-4 grid gap-2 rounded-md border border-slate-800 bg-slate-900/50 p-2.5 md:grid-cols-[minmax(170px,220px)_minmax(170px,220px)_minmax(170px,220px)_auto] md:items-end md:gap-3 md:p-3">
        <label className="grid gap-1 text-xs text-slate-400">
          対象月
          <select
            value={monthFilter}
            onChange={(event) => onMonthChange(event.currentTarget.value)}
            className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300"
          >
            <option value="all">すべての期間</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          大ジャンル
          <select
            value={majorCategoryFilter}
            onChange={(event) =>
              onMajorCategoryChange(event.currentTarget.value)
            }
            className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300"
          >
            <option value="all">すべての大ジャンル</option>
            {majorCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          中ジャンル
          <select
            value={minorCategoryFilter}
            onChange={(event) =>
              onMinorCategoryChange(event.currentTarget.value)
            }
            className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300"
          >
            <option value="all">すべての中ジャンル</option>
            {minorCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          className="w-full border-slate-700 bg-slate-950 text-slate-50 hover:bg-slate-800 hover:text-white md:w-fit"
          onClick={onDownloadCsv}
          disabled={filteredRecords.length === 0}
        >
          <Download className="size-3.5" />
          CSVダウンロード
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 py-3 md:grid-cols-4">
        <MetricCard
          icon={BarChart3}
          label="質問数"
          value={
            total === periodTotal ? `${total}件` : `${total}/${periodTotal}件`
          }
        />
        {(["answered", "needs_review", "unanswered"] as ChatbotQuestionAnswerStatus[]).map(
          (status) => {
            const style = answerStatusStyle[status];
            const Icon = style.icon;
            const count =
              filteredSummary.byAnswerStatus.find((item) => item.status === status)
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

      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
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
                  ? "shrink-0 rounded-full border border-cyan-300/60 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100"
                  : "shrink-0 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
              }
              onClick={() => onFilterChange(item)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {summary.byMajorCategory.length ? (
        <details className="group mb-3 rounded-md border border-slate-800 bg-slate-900/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-medium text-slate-300 marker:text-slate-500">
            <span>大ジャンル別集計</span>
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-wrap gap-2 border-t border-slate-800 px-3 py-3">
            {summary.byMajorCategory.map((item) => (
              <span
                key={item.category}
                className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-400"
              >
                {item.category}
                <span className="ml-1 font-semibold text-slate-100">
                  {item.count}
                </span>
              </span>
            ))}
          </div>
        </details>
      ) : null}

      {filteredSummary.byMinorCategory.length ? (
        <details className="group mb-3 rounded-md border border-slate-800 bg-slate-900/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-medium text-slate-300 marker:text-slate-500">
            <span>中ジャンル別集計</span>
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t border-slate-800 px-3 py-3 md:grid-cols-2">
            {filteredSummary.byMinorCategory.slice(0, 20).map((item) => (
              <div
                key={`${item.majorCategory}-${item.minorCategory}`}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-slate-200">
                    {item.minorCategory}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-100">
                    {item.count}
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-500">
                  {item.majorCategory}
                </div>
              </div>
            ))}
          </div>
        </details>
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
        <div className="space-y-2 pr-0.5 md:max-h-[520px] md:overflow-auto">
          {filteredRecords.map((record) => (
            <QuestionLogRow key={record.id} record={record} />
          ))}
        </div>
      ) : null}

      {summary.storageNotice ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {summary.storageNotice}
        </p>
      ) : null}
    </section>
  );
}

function ConversationLogPanel({
  data,
  error,
  isLoading,
  onRefresh,
}: {
  data: ConversationLogResponse | null;
  error: string;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const records = data?.records ?? [];
  const summary = data?.summary;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 shadow-xl shadow-black/20 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
            <MessageSquareText className="size-3.5" />
            conversation history
          </div>
          <h2 className="text-xl font-semibold">ユーザー別チャット履歴</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            同一デバイスに発行したID単位で、チャット内容を確認できます。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-white sm:w-fit"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCcw className={isLoading ? "size-3.5 animate-spin" : "size-3.5"} />
          更新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 py-3">
        <MetricCard
          icon={MessageSquareText}
          label="会話数"
          value={`${summary?.total ?? 0}件`}
        />
        <MetricCard
          icon={Smartphone}
          label="デバイス数"
          value={`${summary?.deviceCount ?? 0}件`}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!error && records.length === 0 ? (
        <div className="rounded-md border border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
          {isLoading
            ? "チャット履歴を読み込み中です。"
            : "まだ表示できるチャット履歴はありません。一般ユーザー画面で会話が完了するとここに表示されます。"}
        </div>
      ) : null}

      {records.length > 0 ? (
        <div className="space-y-2 md:max-h-[520px] md:overflow-auto">
          {records.map((record) => (
            <details
              className="group rounded-md border border-slate-800 bg-slate-900/70"
              key={record.id}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-2 px-3 py-3 marker:text-slate-500 md:flex-row md:items-start md:justify-between">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-100">
                    {record.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-400">
                    {record.preview}
                  </span>
                  <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">
                    <Smartphone className="size-3" />
                    {formatDeviceLabel(record.deviceId)}
                  </span>
                </span>
                <span className="shrink-0 text-xs leading-5 text-slate-500">
                  {formatAskedAt(record.updatedAt)}
                  <br />
                  {record.messageCount} messages
                </span>
              </summary>
              <div className="space-y-2 border-t border-slate-800 px-3 py-3">
                {record.messages.map((message, index) => (
                  <div
                    className={
                      message.role === "assistant"
                        ? "rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-200"
                        : "rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm leading-6 text-cyan-50"
                    }
                    key={`${record.id}-${index}`}
                  >
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {message.role === "assistant" ? "bot" : "user"}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>
            </details>
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

function formatDeviceLabel(deviceId: string) {
  if (deviceId.length <= 18) return deviceId;
  return `${deviceId.slice(0, 8)}...${deviceId.slice(-6)}`;
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
    <div className="min-w-0 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-2 md:px-3">
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400 md:gap-2 md:text-xs">
        <Icon className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div className="mt-1 text-base font-semibold md:text-lg">{value}</div>
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
            className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${style.className}`}
          >
            <Icon className="size-3" />
            {style.label}
          </span>
          <span className="max-w-full rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300">
            {record.majorCategory}
          </span>
          <span className="max-w-full rounded-full border border-slate-800 px-2 py-1 text-[11px] text-slate-400">
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

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
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

function formatCsvAskedAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getQuestionLogMonthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function formatQuestionLogMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return "日時不明";

  return `${year}年${Number(month)}月`;
}

function createQuestionLogMonthOptions(records: ChatbotQuestionLogRecord[]) {
  const monthKeys = new Set<string>();

  for (const record of records) {
    const monthKey = getQuestionLogMonthKey(record.askedAt);
    if (monthKey !== "unknown") monthKeys.add(monthKey);
  }

  return [...monthKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({
      value,
      label: formatQuestionLogMonthLabel(value),
    }));
}

function createQuestionLogMajorCategoryOptions(
  records: ChatbotQuestionLogRecord[]
): QuestionLogCategoryOption[] {
  const categories = new Set<string>();

  for (const record of records) {
    if (record.majorCategory) categories.add(record.majorCategory);
  }

  return [...categories].sort((a, b) => a.localeCompare(b)).map((value) => ({
    value,
    label: value,
  }));
}

function createQuestionLogMinorCategoryOptions(
  records: ChatbotQuestionLogRecord[],
  majorCategory: string
): QuestionLogCategoryOption[] {
  const categories = new Set<string>();

  for (const record of records) {
    if (majorCategory !== "all" && record.majorCategory !== majorCategory) {
      continue;
    }

    if (record.minorCategory) categories.add(record.minorCategory);
  }

  return [...categories].sort((a, b) => a.localeCompare(b)).map((value) => ({
    value,
    label: value,
  }));
}

function escapeCsvCell(value: string | number) {
  const text = String(value).replace(/\r?\n/g, "\n");

  return `"${text.replace(/"/g, '""')}"`;
}

function downloadQuestionLogCsv({
  records,
  statusFilter,
  majorCategoryFilter,
  minorCategoryFilter,
  monthFilter,
  monthOptions,
}: {
  records: ChatbotQuestionLogRecord[];
  statusFilter: QuestionLogFilter;
  majorCategoryFilter: string;
  minorCategoryFilter: string;
  monthFilter: string;
  monthOptions: QuestionLogMonthOption[];
}) {
  if (records.length === 0) return;

  const headers = [
    "質問日時",
    "大ジャンル",
    "小ジャンル",
    "回答状態",
    "質問詳細",
    "参照候補数",
  ];
  const rows = records.map((record) => [
    formatCsvAskedAt(record.askedAt),
    record.majorCategory,
    record.minorCategory,
    answerStatusStyle[record.answerStatus].label,
    record.questionText,
    record.matchedSourceCount,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const monthLabel =
    monthFilter === "all"
      ? "all-periods"
      : monthOptions.find((option) => option.value === monthFilter)?.value ??
        monthFilter;
  const statusLabel = statusFilter === "all" ? "all-statuses" : statusFilter;
  const majorLabel =
    majorCategoryFilter === "all" ? "all-major" : majorCategoryFilter;
  const minorLabel =
    minorCategoryFilter === "all" ? "all-minor" : minorCategoryFilter;

  link.href = url;
  link.download = `levela-question-logs_${monthLabel}_${statusLabel}_${majorLabel}_${minorLabel}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
