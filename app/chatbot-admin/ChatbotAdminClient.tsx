"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import {
  Bot,
  Braces,
  CalendarClock,
  Database,
  ExternalLink,
  FileText,
  RefreshCcw,
  Settings2,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
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
import type { ChatbotKnowledgeCategory } from "@/app/lib/chatbotKnowledgeSources";

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
};

export function ChatbotAdminClient({
  sourceCount,
  sourceCounts,
  ocrResultCount,
}: ChatbotAdminClientProps) {
  const [input, setInput] = useState("");
  const [clientError, setClientError] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chatbot" }),
    []
  );

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
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileText className="size-3.5" />
                保存済み資料
              </div>
              <div className="mb-3 text-2xl font-semibold">{sourceCount}件</div>
              <div className="space-y-2">
                {sourceCounts.map((item) => (
                  <ApiSlot
                    key={item.category}
                    name={item.category}
                    state={`${item.count}件`}
                  />
                ))}
                <ApiSlot name="画像OCR" state={`${ocrResultCount}件`} />
              </div>
            </div>
          </aside>

          <div className="flex min-h-[640px] flex-col overflow-hidden rounded-lg border border-border bg-card">
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
        </section>
      </div>
    </main>
  );
}

function ApiSlot({ name, state }: { name: string; state: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <span className="font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">{state}</span>
    </div>
  );
}
