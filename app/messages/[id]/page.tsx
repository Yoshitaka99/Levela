"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  item_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type Item = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
};

function ChatContent() {
  const params = useParams();
  const itemId = params.id as string;
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("partner_id");

  const [messages, setMessages] = useState<Message[]>([]);
  const [item, setItem] = useState<Item | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async (userId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("item_id", itemId)
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
      // Mark received messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("item_id", itemId)
        .eq("sender_id", partnerId)
        .eq("receiver_id", userId)
        .eq("read", false);
    }
  };

  useEffect(() => {
    if (!partnerId) {
      router.push("/messages");
      return;
    }

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(
          `/auth/login?redirect=/messages/${itemId}?partner_id=${partnerId}`
        );
        return;
      }

      const userId = session.user.id;
      setCurrentUserId(userId);

      const { data: itemData } = await supabase
        .from("items")
        .select("id, title, price, image_url")
        .eq("id", itemId)
        .single();

      if (itemData) setItem(itemData);

      await fetchMessages(userId);
      setLoading(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, partnerId]);

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId || !partnerId) return;

    const channel = supabase
      .channel(`chat-${itemId}-${[currentUserId, partnerId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as Message;
          if (
            msg.item_id !== itemId ||
            !(
              (msg.sender_id === currentUserId && msg.receiver_id === partnerId) ||
              (msg.sender_id === partnerId && msg.receiver_id === currentUserId)
            )
          )
            return;

          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Auto-mark as read if we are the receiver
          if (msg.receiver_id === currentUserId) {
            await supabase
              .from("messages")
              .update({ read: true })
              .eq("id", msg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, itemId, partnerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !partnerId) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: partnerId,
      item_id: itemId,
      content,
      read: false,
    });

    if (error) setNewMessage(content);
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3 px-4 h-16 max-w-2xl mx-auto">
          <Link
            href="/messages"
            className="text-gray-400 hover:text-white transition-colors shrink-0 text-xl"
          >
            ←
          </Link>
          {item && (
            <>
              <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0 border border-white/10">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    📦
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-bold text-sm truncate">{item.title}</p>
                <p className="text-orange-400 text-xs font-bold">
                  {item.price === 0
                    ? "¥0 (無料)"
                    : `¥${item.price.toLocaleString()}`}
                </p>
              </div>
              <Link
                href={`/items/${item.id}`}
                className="shrink-0 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5"
              >
                商品を見る
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto pt-16 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              <p className="text-4xl mb-3">💬</p>
              <p>最初のメッセージを送ってみましょう！</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-br-sm"
                        : "bg-white/10 text-gray-200 rounded-bl-sm border border-white/10"
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <div
                      className={`text-[10px] mt-1 flex items-center gap-1 ${
                        isMe ? "text-white/60 justify-end" : "text-gray-500"
                      }`}
                    >
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMe && (
                        <span
                          className={
                            msg.read ? "text-blue-300" : "text-white/40"
                          }
                        >
                          {msg.read ? "既読" : "未読"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white disabled:opacity-40 hover:from-orange-400 hover:to-amber-400 transition-all shrink-0 shadow-lg shadow-orange-500/25"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
