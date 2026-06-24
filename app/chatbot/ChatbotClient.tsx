"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  CornerDownLeft,
  Home,
  MessageSquareText,
  PanelLeft,
  Plus,
  Shield,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
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

type StoredChat = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  messages: UIMessage[];
};

const STORAGE_KEY = "levela.sales.bot.user.history";
const BOT_NAME = "\u4f55\u3067\u3082\u4ffa\u306b\u805e\u3051\u541b";
const HOME_LABEL = "\u30db\u30fc\u30e0";
const BACK_LABEL = "\u623b\u308b";
const ADMIN_LABEL = "\u7ba1\u7406";
const USER_LABEL = "\u30e6\u30fc\u30b6\u30fc";
const NEW_CHAT = "\u65b0\u898f\u30c1\u30e3\u30c3\u30c8";
const HISTORY = "\u5c65\u6b74";
const EMPTY_TITLE = "\u4f55\u3092\u624b\u4f1d\u3044\u307e\u3057\u3087\u3046\uff1f";
const EMPTY_DESCRIPTION =
  "\u696d\u52d9\u30d5\u30ed\u30fc\u3001\u793e\u5185\u30eb\u30fc\u30eb\u3001\u5bfe\u5fdc\u65b9\u6cd5\u3001\u8fd4\u4fe1\u6587\u9762\u306e\u78ba\u8a8d\u7528\u3067\u3059\u3002";
const PLACEHOLDER =
  "\u4f55\u3067\u3082\u4ffa\u306b\u805e\u3051\u541b\u306b\u805e\u304f";
const ENTER_TO_SEND = "Enter\u3067\u9001\u4fe1";
const TOOL_LOADING = "\u78ba\u8a8d\u4e2d\u3067\u3059";
const NO_HISTORY = "\u307e\u3060\u5c65\u6b74\u306f\u3042\u308a\u307e\u305b\u3093";
const CLEAR_HISTORY = "\u5c65\u6b74\u3092\u30af\u30ea\u30a2";
const UNTITLED = "\u65b0\u3057\u3044\u76f8\u8ac7";
const START_BUTTON = "\u7740\u91d1\u6210\u7d04\u3059\u308b";

const starterPrompts = [
  "\u3053\u306e\u5834\u5408\u3069\u3046\u3059\u308c\u3070\u3044\u3044\uff1f",
  "\u554f\u3044\u5408\u308f\u305b\u5bfe\u5fdc\u306e\u6d41\u308c\u3092\u6559\u3048\u3066",
  "\u5224\u65ad\u306b\u8ff7\u3046\u6642\u306e\u78ba\u8a8d\u5148\u3092\u6559\u3048\u3066",
  "\u696d\u52d9\u30d5\u30ed\u30fc\u306b\u6cbf\u3063\u305f\u8fd4\u4fe1\u6587\u3092\u4f5c\u3063\u3066",
];

function createChatId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

function compactTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return UNTITLED;
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
}

function loadHistory() {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    return JSON.parse(value) as StoredChat[];
  } catch {
    return [];
  }
}

function saveHistory(history: StoredChat[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 12)));
}

export function ChatbotClient() {
  const [input, setInput] = useState("");
  const [clientError, setClientError] = useState("");
  const [history, setHistory] = useState<StoredChat[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [splashReady, setSplashReady] = useState(false);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [activeChatId, setActiveChatId] = useState(createChatId);
  const [activeMessages, setActiveMessages] = useState<UIMessage[]>([]);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chatbot" }),
    []
  );

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    id: activeChatId,
    messages: activeMessages,
    transport,
    onError: (currentError) => setClientError(currentError.message),
    onFinish: ({ messages: finishedMessages }) => {
      persistChat(finishedMessages);
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const id = window.setTimeout(() => setHistory(loadHistory()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!showSplash) return;
    const id = window.setTimeout(() => setSplashReady(true), 280);
    return () => window.clearTimeout(id);
  }, [showSplash]);

  function persistChat(nextMessages: UIMessage[]) {
    if (nextMessages.length === 0) return;
    const firstUser = nextMessages.find((message) => message.role === "user");
    const lastMessage = nextMessages.at(-1);
    const record: StoredChat = {
      id: activeChatId,
      title: compactTitle(firstUser ? getMessageText(firstUser) : ""),
      preview: compactTitle(lastMessage ? getMessageText(lastMessage) : ""),
      updatedAt: Date.now(),
      messages: nextMessages,
    };

    setHistory((current) => {
      const next = [
        record,
        ...current.filter((chat) => chat.id !== activeChatId),
      ].slice(0, 12);
      saveHistory(next);
      return next;
    });
  }

  function startNewChat() {
    setClientError("");
    setInput("");
    const nextId = createChatId();
    setActiveChatId(nextId);
    setActiveMessages([]);
    setMessages([]);
  }

  function openStoredChat(chat: StoredChat) {
    setClientError("");
    setInput("");
    setActiveChatId(chat.id);
    setActiveMessages(chat.messages);
    setMessages(chat.messages);
  }

  function clearHistory() {
    window.localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
    startNewChat();
  }

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

  function enterChat() {
    setSplashLeaving(true);
    window.setTimeout(() => setShowSplash(false), 860);
  }

  function returnHome() {
    if (busy) stop();
    startNewChat();
    setSplashLeaving(false);
    setSplashReady(false);
    setShowSplash(true);
  }

  if (showSplash) {
    return (
      <main
        className={`levela-splash flex min-h-screen items-center justify-center bg-white px-6 text-[#231815] ${
          splashReady ? "is-ready" : ""
        } ${
          splashLeaving ? "is-leaving" : ""
        }`}
      >
        <div className="levela-splash-line levela-splash-line-a" />
        <div className="levela-splash-line levela-splash-line-b" />
        <Image
          alt=""
          aria-hidden="true"
          className="levela-splash-ghost h-auto"
          height={278}
          priority
          src="/levela-start-logo.png"
          width={357}
        />
        <div className="levela-splash-stage flex w-full max-w-lg flex-col items-center text-center">
          <Image
            alt="Levela"
            className="levela-splash-logo h-auto w-[min(76vw,390px)]"
            height={278}
            priority
            src="/levela-start-logo.png"
            width={357}
          />
          <button
            className="levela-splash-enter levela-splash-button"
            onClick={enterChat}
            type="button"
          >
            <span>{START_BUTTON}</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f3ea] text-[#231815]">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 hidden h-auto w-[min(58vw,620px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.035] md:block"
        height={278}
        priority={false}
        src="/levela-start-logo.png"
        width={357}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#231815]/25 to-transparent" />
      <div className="relative z-10 grid min-h-screen md:grid-cols-[304px_1fr]">
        <aside className="hidden border-r border-[#3a2822]/20 bg-[#211713] text-[#fffaf2] shadow-2xl shadow-[#231815]/20 md:flex md:flex-col">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#fffaf2] p-1.5 shadow-lg shadow-black/20">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="h-auto w-full"
                  height={278}
                  src="/levela-start-logo.png"
                  width={357}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{BOT_NAME}</p>
                <p className="text-xs text-[#c8b9a4]">levela.sale assistant</p>
              </div>
            </div>
            <Button
              className="mt-5 h-10 w-full justify-start rounded-full bg-[#e60012] text-white shadow-lg shadow-[#e60012]/20 hover:bg-[#c90010]"
              onClick={startNewChat}
            >
              <Plus className="size-4" />
              {NEW_CHAT}
            </Button>
          </div>

          <nav className="space-y-1 border-b border-white/10 p-3 text-sm">
            <Link
              className="flex items-center gap-2 rounded-xl bg-[#fff6e7] px-3 py-2 font-medium text-[#231815] shadow-sm"
              href="/sale/chatbot"
            >
              <MessageSquareText className="size-4 text-[#e60012]" />
              {USER_LABEL}
            </Link>
            <Link
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[#d7cab8] transition hover:bg-white/10 hover:text-white"
              href="/sale/chatbot/admin"
            >
              <Shield className="size-4" />
              {ADMIN_LABEL}
            </Link>
            <button
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[#d7cab8] transition hover:bg-white/10 hover:text-white"
              onClick={returnHome}
              type="button"
            >
              <Home className="size-4" />
              {HOME_LABEL}
            </button>
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[#c8b9a4]">
                <Clock3 className="size-3.5" />
                {HISTORY}
              </div>
              {history.length > 0 && (
                <button
                  className="text-xs text-[#d7cab8] hover:text-white"
                  onClick={clearHistory}
                  type="button"
                >
                  {CLEAR_HISTORY}
                </button>
              )}
            </div>
            <div className="space-y-1">
              {history.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[#b9aa96]">{NO_HISTORY}</p>
              ) : (
                history.map((chat) => (
                  <button
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      chat.id === activeChatId
                        ? "bg-[#fff6e7] text-[#231815] shadow-sm"
                        : "text-[#f4eadc] hover:bg-white/10"
                    }`}
                    key={chat.id}
                    onClick={() => openStoredChat(chat)}
                    type="button"
                  >
                    <span className="block truncate font-medium">
                      {chat.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs opacity-70">
                      {chat.preview}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#d8cbb8] bg-[#fffaf2]/90 px-3 shadow-sm shadow-[#231815]/5 backdrop-blur md:h-[72px] md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                aria-label={BACK_LABEL}
                className="rounded-full text-[#231815] hover:bg-[#efe3d2]"
                onClick={() => window.history.back()}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#dfd1bc] bg-white p-1.5 shadow-lg shadow-[#231815]/10 md:hidden">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="h-auto w-full"
                  height={278}
                  src="/levela-start-logo.png"
                  width={357}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black tracking-normal md:text-lg">
                  {BOT_NAME}
                </p>
                <p className="hidden text-xs text-[#7d6d5a] sm:block">
                  {EMPTY_DESCRIPTION}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                aria-label={HOME_LABEL}
                className="rounded-full text-[#231815] hover:bg-[#efe3d2]"
                onClick={returnHome}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Home className="size-4" />
              </Button>
              <Button
                asChild
                className="rounded-full text-[#231815] hover:bg-[#efe3d2]"
                size="icon"
                variant="ghost"
              >
                <Link aria-label={ADMIN_LABEL} href="/sale/chatbot/admin">
                  <Shield className="size-4" />
                </Link>
              </Button>
              <Button
                aria-label={NEW_CHAT}
                className="rounded-full bg-[#231815] text-white shadow-md shadow-[#231815]/15 hover:bg-[#34251f]"
                onClick={startNewChat}
                size="icon"
                type="button"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <Conversation className="min-h-0">
              <ConversationContent className="mx-auto min-h-full w-full max-w-4xl gap-6 px-4 py-6 md:px-8 md:py-8">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={<PanelLeft className="size-10" />}
                    title={EMPTY_TITLE}
                    description={EMPTY_DESCRIPTION}
                  >
                    <div className="flex w-full max-w-2xl flex-col gap-5">
                      <div className="overflow-hidden rounded-[28px] border border-[#dfd1bc] bg-[#fffaf2]/92 shadow-2xl shadow-[#231815]/10">
                        <div className="relative p-6 md:p-7">
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#231815] via-[#e60012] to-[#231815]" />
                          <div className="mb-5 flex items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-2xl border border-[#dfd1bc] bg-white p-1.5 shadow-lg shadow-[#231815]/10">
                              <Image
                                alt=""
                                aria-hidden="true"
                                className="h-auto w-full"
                                height={278}
                                src="/levela-start-logo.png"
                                width={357}
                              />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e60012]">
                                Levela Bot
                              </div>
                              <div className="text-sm font-semibold text-[#5f5143]">
                                {BOT_NAME}
                              </div>
                            </div>
                          </div>
                          <h1 className="text-2xl font-black tracking-normal text-[#231815] md:text-3xl">
                            {EMPTY_TITLE}
                          </h1>
                          <p className="mt-3 text-sm leading-6 text-[#6f5d4a] md:text-base">
                            {EMPTY_DESCRIPTION}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {starterPrompts.map((prompt) => (
                          <Button
                            key={prompt}
                            type="button"
                            variant="outline"
                            className="group h-auto justify-start gap-3 whitespace-normal rounded-2xl border-[#dfd1bc] bg-[#fffaf2]/85 px-4 py-4 text-left text-[#231815] shadow-sm shadow-[#231815]/5 transition hover:border-[#e60012]/35 hover:bg-white hover:text-[#231815] hover:shadow-md"
                            onClick={() => sendStarter(prompt)}
                          >
                            <span className="size-2 rounded-full bg-[#e60012] shadow-[0_0_0_4px_rgba(230,0,18,0.08)] transition group-hover:scale-110" />
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
                            ? "max-w-[min(760px,100%)] rounded-[24px] border border-[#dfd1bc] bg-[#fffaf2] px-5 py-4 text-[#231815] shadow-lg shadow-[#231815]/10"
                            : "max-w-[min(680px,100%)] rounded-[24px] !bg-[#231815] px-5 py-4 !text-white shadow-lg shadow-[#231815]/20"
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
                                className="rounded-2xl border border-[#dfd1bc] bg-[#f8f3ea] px-3 py-2 text-xs text-[#6f5d4a]"
                              >
                                {TOOL_LOADING}
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
              <div className="mx-auto mb-3 w-full max-w-3xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {clientError || error?.message}
              </div>
            )}

            <div className="sticky bottom-0 border-t border-[#d8cbb8] bg-[#fffaf2]/88 px-3 py-3 shadow-[0_-18px_42px_rgba(35,24,21,0.08)] backdrop-blur">
              <div className="mx-auto w-full max-w-4xl">
                <PromptInput
                  className="rounded-[28px] border-[#d8cbb8] bg-white/95 shadow-2xl shadow-[#231815]/12"
                  onSubmit={submit}
                >
                  <PromptInputTextarea
                    value={input}
                    onChange={(event) => setInput(event.currentTarget.value)}
                    placeholder={PLACEHOLDER}
                    className="min-h-16 px-1 text-[#231815] placeholder:text-[#9b8d7a]"
                    disabled={busy}
                  />
                  <div className="flex items-center justify-between gap-2 px-2 pb-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-[#8b7a65]">
                      <CornerDownLeft className="size-3.5" />
                      <span>{ENTER_TO_SEND}</span>
                    </div>
                    <PromptInputSubmit
                      className="bg-[#e60012] text-white shadow-lg shadow-[#e60012]/20 hover:bg-[#c90010]"
                      status={status}
                      onStop={stop}
                      disabled={!input.trim() && !busy}
                    />
                  </div>
                </PromptInput>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
