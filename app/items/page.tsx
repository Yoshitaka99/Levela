export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "../lib/supabaseServerClient";

const CATEGORIES = ["家電", "寝具", "家具", "キッチン", "収納", "衣類", "筋トレ", "その他"];

const STATUS_LABEL: Record<string, string> = {
  available: "出品中",
  reserved: "交渉中",
  sold: "譲渡済み",
};

type Item = {
  id: string;
  title: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category: string | null;
  status: "available" | "reserved" | "sold";
  created_at: string;
};

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const resolvedParams = await searchParams;
  const category = resolvedParams.category;

  let query = supabaseServer
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <main className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-4 text-red-400">エラーが発生しました</h1>
        <pre className="bg-white/5 p-4 rounded-xl border border-white/10 overflow-x-auto text-sm">
          {JSON.stringify(error, null, 2)}
        </pre>
      </main>
    );
  }

  const items = (data ?? []) as Item[];

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {category ? `${category}の出品` : "すべての出品"}
          </h1>
          <p className="text-gray-400 mt-2">新着順に表示しています</p>
        </div>
        <Link
          href="/sell"
          className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2"
        >
          <span>✨</span> 新規出品
        </Link>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/items"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            !category
              ? "bg-orange-500 border-orange-500 text-white"
              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
          }`}
        >
          すべて
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/items?category=${cat}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              category === cat
                ? "bg-orange-500 border-orange-500 text-white"
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
          <div className="text-5xl mb-4 opacity-50">😴</div>
          <p className="text-gray-400 font-medium">
            {category ? `「${category}」の出品はまだありません` : "まだ出品がありません"}
          </p>
          <Link href="/sell" className="text-orange-400 hover:text-orange-300 mt-2 inline-block transition-colors">
            一番乗りで出品する →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((it) => (
            <Link
              href={`/items/${it.id}`}
              key={it.id}
              className="group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all hover:border-white/20 hover:-translate-y-1 shadow-lg backdrop-blur-sm"
            >
              <div className="aspect-[4/3] bg-white/10 relative overflow-hidden flex items-center justify-center">
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.image_url}
                    alt={it.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="text-4xl opacity-20">📦</div>
                )}
                {it.status === "sold" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full rotate-[-12deg] text-lg tracking-widest border-2 border-red-400/50 shadow-xl">
                      SOLD OUT
                    </span>
                  </div>
                )}
                {it.category && (
                  <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-xs text-gray-300 px-2 py-0.5 rounded-full border border-white/10">
                    {it.category}
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-lg line-clamp-1 group-hover:text-orange-400 transition-colors mb-2">
                  {it.title}
                </h3>
                <div className="text-xl font-black text-white mb-3">
                  {it.price === 0 ? (
                    <span className="text-green-400">¥0 (無料)</span>
                  ) : (
                    `¥${it.price.toLocaleString()}`
                  )}
                </div>
                {it.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed mb-4 flex-grow">
                    {it.description}
                  </p>
                )}
                <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(it.created_at).toLocaleDateString("ja-JP")}</span>
                  <span
                    className={`px-2 py-1 rounded-md bg-white/10 ${
                      it.status === "available" ? "text-green-400" : "text-gray-400"
                    }`}
                  >
                    {STATUS_LABEL[it.status] ?? it.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
