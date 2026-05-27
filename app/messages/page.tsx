"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Conversation = {
  item_id: string;
  partner_id: string;
  item_title: string;
  item_image?: string | null;
  latest_message: string;
  created_at: string;
  is_unread: boolean;
};

export default function MessagesInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchMessages() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login?redirect=/messages");
        return;
      }

      const userId = session.user.id;

      // Fetch all messages for the current user, joined with item info
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*, items(id, title, image_url)")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error || !messages) {
        console.error("Error fetching messages", error);
        setLoading(false);
        return;
      }

      // Group into conversations manually latest-first
      const convMap = new Map<string, Conversation>();

      messages.forEach((msg) => {
        const isSender = msg.sender_id === userId;
        const partner_id = isSender ? msg.receiver_id : msg.sender_id;
        // Group by item + partner
        const convKey = `${msg.item_id}_${partner_id}`;

        if (!convMap.has(convKey)) {
          convMap.set(convKey, {
            item_id: msg.item_id,
            partner_id,
            item_title: msg.items?.title || "削除された商品",
            item_image: msg.items?.image_url,
            latest_message: msg.content,
            created_at: msg.created_at,
            is_unread: !isSender && !msg.read,
          });
        }
      });

      setConversations(Array.from(convMap.values()));
      setLoading(false);
    }

    fetchMessages();
  }, [router]);

  return (
    <main className="min-h-screen pt-24 pb-32 px-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold tracking-tight mb-8">メッセージ 💬</h1>

      {loading ? (
        <div className="text-gray-400 text-center py-10">読み込み中...</div>
      ) : conversations.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center backdrop-blur-sm">
          <div className="text-6xl mb-4 opacity-50">📭</div>
          <p className="text-gray-400">現在メッセージはありません。</p>
          <p className="text-sm text-gray-500 mt-2">気になる商品を見つけてコンタクトを取ってみましょう！</p>
          <Link href="/items" className="inline-block mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors">
            商品を探す
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => (
            <Link 
              href={`/messages/${conv.item_id}?partner_id=${conv.partner_id}`} 
              key={`${conv.item_id}_${conv.partner_id}`}
              className="block group"
            >
              <div className={`p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4
                ${conv.is_unread 
                  ? 'bg-white/10 border-orange-500/50 hover:bg-white/15 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {/* Item Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-black/50 overflow-hidden shrink-0 border border-white/10 relative">
                  {conv.item_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conv.item_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl opacity-50">📦</div>
                  )}
                  {conv.is_unread && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-[#1a1a1a] animate-pulse"></div>
                  )}
                </div>

                {/* Conversation preview */}
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-bold truncate pr-3 ${conv.is_unread ? 'text-white' : 'text-gray-300'}`}>
                      {conv.item_title}
                    </h3>
                    <span className="text-xs text-gray-500 shrink-0">
                      {new Date(conv.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric'})}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conv.is_unread ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                    {conv.latest_message}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
