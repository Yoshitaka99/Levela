"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/auth/login");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading)
    return (
      <div className="min-h-screen pt-24 flex justify-center text-gray-400">
        Loading...
      </div>
    );

  if (!user) return null;

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-extrabold tracking-tight mb-8">マイページ 👤</h1>

      <div className="space-y-4">
        {/* User info card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-500/25">
              {user.email?.[0].toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="font-bold text-white">{user.email}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                登録日: {new Date(user.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
          <Link
            href="/items"
            className="flex items-center gap-3 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/10"
          >
            <span className="text-xl">📦</span>
            <span className="font-medium text-gray-300">商品一覧</span>
            <span className="ml-auto text-gray-600">→</span>
          </Link>
          <Link
            href="/sell"
            className="flex items-center gap-3 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/10"
          >
            <span className="text-xl">✨</span>
            <span className="font-medium text-gray-300">出品する</span>
            <span className="ml-auto text-gray-600">→</span>
          </Link>
          <Link
            href="/messages"
            className="flex items-center gap-3 px-6 py-4 hover:bg-white/5 transition-colors"
          >
            <span className="text-xl">💬</span>
            <span className="font-medium text-gray-300">メッセージ</span>
            <span className="ml-auto text-gray-600">→</span>
          </Link>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-red-400 font-semibold hover:bg-red-500/10 hover:border-red-500/20 transition-all"
        >
          ログアウト
        </button>
      </div>
    </main>
  );
}
