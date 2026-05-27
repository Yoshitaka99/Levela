"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

const CATEGORIES = ["家電", "寝具", "家具", "キッチン", "収納", "衣類", "筋トレ", "その他"];

export default function SellPage() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/auth/login");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/auth/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from("items").insert({
      title,
      price: price === "" ? 0 : price,
      category: category || null,
      description,
      image_url: imageUrl,
      status: "available",
    });

    if (error) {
      setMessage({ type: "error", text: "❌ 失敗: " + error.message });
    } else {
      setMessage({ type: "success", text: "✅ 出品できました！" });
      setTitle(""); setPrice(""); setCategory(""); setDescription(""); setImageUrl("");
      setTimeout(() => router.push("/items"), 1500);
    }

    setLoading(false);
  };

  if (!user) return <div className="min-h-screen pt-24 pb-12 px-4 flex justify-center text-gray-400">Loading...</div>;

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 max-w-2xl mx-auto">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">出品する ✨</h1>
        <p className="text-gray-400 text-sm mb-8">不要になったものを寮の仲間にお譲りしましょう。</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">商品名 <span className="text-orange-500">*</span></label>
              <input
                placeholder="例: 電気ケトル（T-fal 1.2L）"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">カテゴリー <span className="text-orange-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      category === cat
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/25"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {!category && <p className="text-xs text-gray-500 mt-2">カテゴリーを選択してください</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">価格 (無料なら0) <span className="text-orange-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                <input
                  type="number"
                  placeholder="2000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  min="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">画像URL (任意)</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">説明 (任意)</label>
              <textarea
                placeholder="使用年数、状態、受け渡し希望日などを詳しく書くと取引がスムーズです。"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-y"
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
            disabled={loading || !category}
            className="w-full py-4 px-4 flex justify-center items-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg hover:from-orange-400 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-orange-500/25"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "出品する"}
          </button>
        </form>
      </div>
    </main>
  );
}
