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
  "今日やることを一緒に整理して",
  "営業相談の返答案を作って",
  "予定調整の文章を考えて",
  "AIドリルの進め方を相談したい",
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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/95">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-slate-950 text-white">
              <Bot className="size-4" />
            </div>
            <span className="font-medium">Levela Bot</span>
          </div>
          <div className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
            <Sparkles className="size-3.5" />
            <span>Chat</span>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          <Conversation className="min-h-0">
            <ConversationContent className="min-h-full gap-5 px-0 py-6">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<Bot className="size-10" />}
                  title="何を手伝いましょうか？"
                  description="聞きたいことをそのまま入力してください。"
                  className="text-slate-950"
                >
                  <div className="flex w-full max-w-2xl flex-col items-center gap-5">
                    <div className="flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                      <Bot className="size-6 text-slate-500" />
                    </div>
                    <div className="text-center">
                      <h1 className="text-2xl font-semibold tracking-normal">
                        何を手伝いましょうか？
                      </h1>
                      <p className="mt-2 text-sm text-slate-600">
                        相談、文章作成、予定調整、学習サポートなどをそのまま話しかけてください。
                      </p>
                    </div>
                    <div className="grid w-full gap-2 sm:grid-cols-2">
                      {starterPrompts.map((prompt) => (
                        <Button
                          key={prompt}
                          type="button"
                          variant="outline"
                          className="h-auto justify-start whitespace-normal border-slate-200 bg-white px-3 py-3 text-left text-slate-900 shadow-sm hover:bg-slate-100 hover:text-slate-950"
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
                          ? "max-w-[min(720px,100%)] text-slate-900"
                          : "max-w-[min(78%,720px)] bg-slate-950 text-white"
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
                              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                            >
                              情報を確認しています
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
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {clientError || error?.message}
            </div>
          )}

          <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50/95 py-3 backdrop-blur">
            <PromptInput
              className="rounded-2xl bg-white text-slate-950 shadow-lg shadow-slate-200/70"
              onSubmit={submit}
            >
              <PromptInputTextarea
                value={input}
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder="メッセージを入力"
                className="min-h-16 text-slate-950 placeholder:text-slate-500"
                disabled={busy}
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <CornerDownLeft className="size-3.5" />
                  <span>Enterで送信</span>
                </div>
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  className="bg-slate-950 text-white hover:bg-slate-800"
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
