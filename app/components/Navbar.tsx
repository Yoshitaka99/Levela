"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (pathname.startsWith("/auth")) return null; // 認証画面では出さない
  if (pathname.startsWith("/seminar-dashboard")) return null;

  return (
    <nav className="fixed top-0 inset-x-0 h-16 bg-black/50 backdrop-blur-xl border-b border-white/10 z-50 transition-all px-4">
      <div className="h-full max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg group-hover:shadow-orange-500/50 transition-all">
            <span className="text-white text-sm">🏠</span>
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
            ドーモ！
          </span>
        </Link>
        
        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <Link href="/items" className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white px-2 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1">
            <span className="text-base sm:text-lg">📦</span>
            <span className="hidden sm:inline">一覧</span>
          </Link>
          
          <Link href="/sell" className="text-xs sm:text-sm font-medium text-white px-2.5 sm:px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all flex items-center gap-1">
            <span className="text-base sm:text-lg">✨</span>
            <span>出品</span>
          </Link>

          {user ? (
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-[10px] sm:text-sm font-medium text-orange-400 bg-orange-500/10 px-2 sm:px-4 py-2 rounded-xl border border-orange-500/20 hover:bg-orange-500/20 transition-colors ml-1"
            >
              ログアウト
            </button>
          ) : (
            <Link href="/auth/login" className="text-[10px] sm:text-sm font-medium text-white px-2 sm:px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 transition-colors shadow-lg shadow-orange-500/25 ml-1">
              ログイン
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
