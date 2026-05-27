"use client";

import { useState, Suspense } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParams = searchParams.get("redirect");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "登録成功！確認メールをチェックしてください（自動ログインできる場合はこのまま移動します）。" });
      setTimeout(() => {
        router.push(`/auth/login${redirectParams ? `?redirect=${redirectParams}` : ''}`);
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500">
      <div className="text-center">
        {redirectParams ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">
              アカウントを作成 🔒
            </h1>
            <p className="text-sm text-gray-400">出品者に連絡するには登録が必要です</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              新しく始める ✨
            </h1>
            <p className="text-sm text-gray-400">無料でドーモ！のアカウントを作成します</p>
          </>
        )}
      </div>

      <form onSubmit={handleSignup} className="space-y-6 mt-8">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">メールアドレス</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">パスワード (6文字以上)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 flex justify-center items-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:from-orange-400 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-orange-500/25"
        >
          {loading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : "アカウントを作成する"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-400">
        すでにアカウントをお持ちですか？{" "}
        <Link href={`/auth/login${redirectParams ? `?redirect=${redirectParams}` : ''}`} className="font-medium text-orange-400 hover:text-orange-300 transition-colors">
          ログインする
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
