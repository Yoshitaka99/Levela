"use client";

import Link from "next/link";

export default function FavoritesPage() {
  return (
    <main className="min-h-screen pt-24 pb-12 px-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">お気に入り 💖</h1>
      <p className="text-gray-400 text-sm mb-10">気になった商品を保存できます。</p>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center backdrop-blur-sm">
        <div className="text-6xl mb-4 opacity-50">💖</div>
        <h2 className="text-lg font-bold text-white mb-2">まもなく公開予定</h2>
        <p className="text-sm text-gray-400 mb-6">
          お気に入り機能は近日対応予定です。<br />
          今は商品一覧から気になるものをチェックしてみてください！
        </p>
        <Link
          href="/items"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors shadow-lg shadow-orange-500/25"
        >
          <span>📦</span> 商品を探す
        </Link>
      </div>
    </main>
  );
}
