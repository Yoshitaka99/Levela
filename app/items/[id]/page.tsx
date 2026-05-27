export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "../../lib/supabaseServerClient";
import ItemActions from "./ItemActions";

const STATUS_LABEL: Record<string, string> = {
  available: "出品中",
  reserved: "交渉中",
  sold: "譲渡済み",
};

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: item, error } = await supabaseServer
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) {
    return (
      <main className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-extrabold mb-4 text-white">404</h1>
        <p className="text-gray-400 mb-8">お探しの商品は見つかりませんでした。</p>
        <Link href="/items" className="text-orange-400 hover:text-orange-300">
          商品一覧に戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 max-w-4xl mx-auto">
      <Link
        href="/items"
        className="text-gray-400 hover:text-white mb-6 inline-flex items-center gap-2 transition-colors"
      >
        ← 一覧に戻る
      </Link>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="w-full md:w-1/2 min-h-[300px] bg-white/10 relative flex items-center justify-center">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover absolute inset-0"
            />
          ) : (
            <div className="text-6xl opacity-20">📦</div>
          )}
          {item.status === "sold" && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
              <span className="bg-red-600 text-white font-bold px-6 py-2 rounded-full rotate-[-12deg] text-2xl tracking-widest border-4 border-red-400/50 shadow-xl">
                SOLD OUT
              </span>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                item.status === "available"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
              }`}
            >
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
            <div className="flex items-center gap-2">
              {item.category && (
                <span className="text-xs bg-white/10 text-gray-400 px-2 py-1 rounded-lg border border-white/10">
                  {item.category}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {new Date(item.created_at).toLocaleDateString("ja-JP")}
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4 line-clamp-2">{item.title}</h1>
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 mb-8">
            {item.price === 0 ? "¥0 (無料)" : `¥${item.price.toLocaleString()}`}
          </div>

          <div className="flex-grow">
            <h2 className="text-sm font-semibold text-gray-400 mb-2 border-b border-white/10 pb-2">
              商品説明
            </h2>
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
              {item.description || "説明はありません。"}
            </p>
          </div>

          {/* Client component for auth-dependent action buttons */}
          <ItemActions
            itemId={id}
            itemOwnerId={item.user_id}
            itemStatus={item.status}
          />
        </div>
      </div>
    </main>
  );
}
