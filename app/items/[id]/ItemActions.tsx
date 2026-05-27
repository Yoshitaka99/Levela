"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

export default function ItemActions({
  itemId,
  itemOwnerId,
  itemStatus,
}: {
  itemId: string;
  itemOwnerId: string;
  itemStatus: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="mt-8 pt-6 border-t border-white/10 h-16" />;

  const isOwner = userId === itemOwnerId;
  const isLoggedIn = !!userId;
  const contactHref = isLoggedIn
    ? `/messages/${itemId}?partner_id=${itemOwnerId}`
    : `/auth/login?redirect=/items/${itemId}`;

  return (
    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-3">
      {!isOwner && (
        <a
          href={itemStatus === "available" ? contactHref : "#"}
          className={`w-full py-4 rounded-xl text-center font-bold text-lg transition-all shadow-lg block ${
            itemStatus === "available"
              ? "bg-orange-600 text-white hover:bg-orange-500 hover:shadow-orange-500/25"
              : "bg-gray-600 text-gray-400 cursor-not-allowed pointer-events-none"
          }`}
        >
          {itemStatus === "available"
            ? isLoggedIn
              ? "💬 アプリ内で出品者にメッセージ"
              : "ログインして出品者に連絡"
            : "売り切れました"}
        </a>
      )}

      {isOwner && (
        <Link
          href={`/items/${itemId}/edit`}
          className="w-full py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-lg hover:bg-white/20 transition-all text-center flex items-center justify-center gap-2"
        >
          <span>✏️</span> 投稿を編集する
        </Link>
      )}

      {!isOwner && isLoggedIn && (
        <p className="text-xs text-center text-gray-500">※アプリ内のメッセージ画面が開きます。</p>
      )}
      {!isOwner && !isLoggedIn && (
        <p className="text-xs text-center text-gray-500">※連絡や取引にはログインが必要です。</p>
      )}
    </div>
  );
}
