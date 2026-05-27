"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type ItemStatus = "available" | "reserved" | "sold";

export default function EditItemPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<ItemStatus>("available");
  
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    async function fetchItem() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error || !data) {
        setMessage({ type: "error", text: "商品の取得に失敗しました。" });
      } else {
        setTitle(data.title);
        setPrice(data.price);
        setDescription(data.description || "");
        setImageUrl(data.image_url || "");
        setStatus(data.status);
      }
      setInitialLoad(false);
    }
    
    fetchItem();
  }, [id, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase
      .from("items")
      .update({
        title,
        price: price === "" ? 0 : price,
        description,
        image_url: imageUrl,
        status,
      })
      .eq("id", id);

    if (error) {
      setMessage({ type: "error", text: "❌ 失敗: " + error.message });
    } else {
      setMessage({ type: "success", text: "✅ 更新しました！" });
      setTimeout(() => {
        router.push(`/items/${id}`);
        router.refresh();
      }, 1500);
    }
    setLoading(false);
  };

  if (initialLoad) return <div className="min-h-screen pt-24 pb-12 px-4 flex justify-center text-gray-400">Loading...</div>;

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 max-w-3xl mx-auto">
      <Link href={`/items/${id}`} className="text-gray-400 hover:text-white mb-6 inline-flex items-center gap-2 transition-colors">
        ← 詳細に戻る
      </Link>
      
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-500 w-full max-w-full overflow-hidden">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">投稿を編集する ✏️</h1>
        <p className="text-gray-400 text-sm mb-8">商品情報を更新したり、ステータスを変更できます。</p>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-4">
            
            {/* Image Preview (Fixed the large image bug) */}
            {imageUrl && (
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-300 block mb-2">現在の画像</label>
                <div className="w-full h-48 sm:h-64 bg-black/50 rounded-xl overflow-hidden border border-white/10 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={imageUrl} 
                    alt="プレビュー" 
                    className="absolute inset-0 w-full h-full object-contain p-2"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">※画像が大きすぎた問題を絶対配置で完全に修正しました。</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">画像URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
                className="w-full px-4 py-3 rounded-xl bg-[#171717] border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="available">出品中 (募集中)</option>
                <option value="reserved">交渉中 (お取り置き)</option>
                <option value="sold">譲渡済み (SOLD OUT)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">商品名</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">価格</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                required
                min="0"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">説明</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-y"
              />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {message.text}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg hover:shadow-orange-500/25 disabled:opacity-50"
          >
            {loading ? "更新中..." : "変更を保存する"}
          </button>
        </form>
      </div>
    </main>
  );
}
