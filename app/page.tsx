import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <div className="z-10 text-center max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-xl overflow-hidden backdrop-blur-md">
          <span className="text-4xl">🏠</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
          寮内で<span className="text-orange-500">かんたん</span>取引
        </h1>
        
        <p className="text-gray-400 text-base md:text-lg mb-8 leading-relaxed max-w-md">
          不要になったものを寮の仲間に譲ろう。<br />引っ越し・退寮時の整理に便利！
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/items"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold flex items-center justify-center gap-2 hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg hover:shadow-orange-500/25"
          >
            <span>📦</span> 商品を探す
          </Link>
          <Link
            href="/sell"
            className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-all backdrop-blur-sm"
          >
            <span>✨</span> 出品する
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="z-10 mt-24 mb-16 w-full max-w-3xl">
        <h2 className="text-sm font-semibold text-gray-400 mb-6 px-2">サービスの特徴</h2>
        <div className="grid gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-xl shrink-0">📍</div>
            <div>
              <h3 className="font-semibold text-gray-200">寮限定だから安心</h3>
              <p className="text-sm text-gray-400 mt-1">同じ寮の仲間と直接取引。送料なし！</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl shrink-0">⚡</div>
            <div>
              <h3 className="font-semibold text-gray-200">スマホでかんたん</h3>
              <p className="text-sm text-gray-400 mt-1">写真を撮って出品するだけ。3分で完了！</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-xl shrink-0">💰</div>
            <div>
              <h3 className="font-semibold text-gray-200">無料譲渡もOK</h3>
              <p className="text-sm text-gray-400 mt-1">価格0円で無料譲渡も可能です</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="z-10 w-full max-w-3xl mb-16">
        <h2 className="text-sm font-semibold text-gray-400 mb-6 px-2">よく出品されるもの</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { tag: "家電", emoji: "📺" },
            { tag: "寝具", emoji: "🛏️" },
            { tag: "家具", emoji: "🪑" },
            { tag: "キッチン", emoji: "🍳" },
            { tag: "収納", emoji: "📦" },
            { tag: "衣類", emoji: "👕" },
            { tag: "筋トレ", emoji: "💪" },
            { tag: "その他", emoji: "🎮" },
          ].map((cat) => (
            <Link key={cat.tag} href={`/items?category=${cat.tag}`} className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors">
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-sm font-medium text-gray-300">{cat.tag}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Call to action */}
      <div className="z-10 w-full max-w-md text-center mt-8 pb-12">
        <h2 className="text-xl font-bold mb-2">さっそく始めよう！</h2>
        <p className="text-gray-400 text-sm mb-6">登録は無料です</p>
        <Link href="/auth/signup" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors">
          <span>✨</span> 新規登録
        </Link>
      </div>

    </main>
  );
}
