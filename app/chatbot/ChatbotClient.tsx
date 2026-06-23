"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, CornerDownLeft, Sparkles } from "lucide-react";
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

const starterPrompts = [
  "着座ステータスについて教えて",
  "契約時によくある質問を確認したい",
  "予約変更の手順はどこを見ればいい？",
  "不明事項がある時の相談先を知りたい",
];

export function ChatbotClient() {
  const [input, setInput] = useState("");
  const [clientError, setClientError] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chatbot" }),
    []
  );

  const { messages, sendMessage, status, stop, error } = useChat({
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
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bot className="size-4" />
            </div>
            <span className="font-medium">Levela Bot</span>
          </div>
          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Sparkles className="size-3.5" />
            <span>社内ナレッジ</span>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          <Conversation className="min-h-0">
            <ConversationContent className="min-h-full gap-5 px-0 py-6">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<Bot className="size-10" />}
                  title="何を確認しますか？"
                  description="ステータス、決済、Lステップ操作などをそのまま聞いてください。"
                >
                  <div className="flex w-full max-w-2xl flex-col items-center gap-5">
                    <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card">
                      <Bot className="size-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <h1 className="text-2xl font-semibold tracking-normal">
                        何を確認しますか？
                      </h1>
                      <p className="mt-2 text-sm text-muted-foreground">
                        社内資料の場所や、次に確認すべき情報をチャット形式で返します。
                      </p>
                    </div>
                    <div className="grid w-full gap-2 sm:grid-cols-2">
                      {starterPrompts.map((prompt) => (
                        <Button
                          key={prompt}
                          type="button"
                          variant="outline"
                          className="h-auto justify-start whitespace-normal px-3 py-3 text-left"
                          onClick={() => sendStarter(prompt)}
                        >
                          {prompt}
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
                          ? "max-w-[min(720px,100%)]"
                          : undefined
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
                              className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
                            >
                              資料を確認しています
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
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {clientError || error?.message}
            </div>
          )}

          <div className="sticky bottom-0 border-t border-border bg-background/95 py-3 backdrop-blur">
            <PromptInput onSubmit={submit}>
              <PromptInputTextarea
                value={input}
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder="メッセージを入力"
                className="min-h-16"
                disabled={busy}
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CornerDownLeft className="size-3.5" />
                  <span>Enterで送信</span>
                </div>
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  disabled={!input.trim() && !busy}
                />
              </div>
            </PromptInput>
          </div>
        </section>
      </div>
    </main>
  );
}
