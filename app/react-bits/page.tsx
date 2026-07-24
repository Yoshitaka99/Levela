import type { Metadata } from "next";
import { AuroraBackground } from "@/components/react-bits/aurora-background";
import { ClickSpark } from "@/components/react-bits/click-spark";
import { GradientText } from "@/components/react-bits/gradient-text";
import { ShinyText } from "@/components/react-bits/shiny-text";
import { SpotlightCard } from "@/components/react-bits/spotlight-card";
import { SplitText } from "@/components/react-bits/split-text";
import { StarBorder } from "@/components/react-bits/star-border";

export const metadata: Metadata = {
  title: "React Bits ショーケース | Levela",
  description:
    "React Bits の代表的なコンポーネントを Levela のスタックで動かすデモページ",
};

const components = [
  {
    name: "SplitText",
    desc: "文字を1つずつ blur + slide で出現させる見出しアニメーション",
  },
  {
    name: "GradientText",
    desc: "テキストにクリップした多色グラデーションを流し続ける",
  },
  {
    name: "ShinyText",
    desc: "控えめなラベルに光沢のスイープを走らせる",
  },
  {
    name: "SpotlightCard",
    desc: "カーソルに追従する放射状グローを持つカード",
  },
  {
    name: "StarBorder",
    desc: "枠を周回する2つの光点を持つピルボタン",
  },
  {
    name: "ClickSpark",
    desc: "クリック地点から放射状にスパークを飛ばす",
  },
  {
    name: "Aurora",
    desc: "ゆっくり漂うオーロラ状の背景グラデーション",
  },
];

export default function ReactBitsPage() {
  return (
    <ClickSpark
      sparkColor="#c4a2ff"
      sparkCount={10}
      sparkRadius={22}
      className="min-h-screen bg-neutral-950 text-white"
    >
      <main className="relative isolate overflow-hidden">
        {/* Hero ------------------------------------------------------- */}
        <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <AuroraBackground
            colors={["#3A29FF", "#9c40ff", "#FF3232"]}
            amplitude={0.4}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.06),transparent_60%)]"
          />

          <span className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <ShinyText text="Powered by React Bits" />
          </span>

          <h1 className="relative max-w-4xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            <SplitText
              text="記憶に残る"
              animateOnView={false}
              delay={60}
              className="block"
            />
            <GradientText
              colors={["#9c40ff", "#ffaa40", "#3A29FF", "#9c40ff"]}
              speed={6}
              className="block text-6xl font-bold sm:text-8xl"
            >
              Web 体験を。
            </GradientText>
          </h1>

          <p className="relative mt-6 max-w-xl text-balance text-base text-white/60 sm:text-lg">
            アニメーション付きの React コンポーネント集「React Bits」を、
            Levela の Next.js 16 / React 19 / Tailwind v4 環境にそのまま統合したデモです。
          </p>

          <div className="relative mt-9 flex flex-wrap items-center justify-center gap-4">
            <StarBorder color="#9c40ff" speed={4}>
              コンポーネントを見る
            </StarBorder>
            <a
              href="https://reactbits.dev"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
            >
              React Bits 公式 ↗
            </a>
          </div>

          <p className="relative mt-14 text-xs text-white/40">
            背景・見出し・ボタン・このスパークはすべて React Bits コンポーネント。画面をクリックしてみてください。
          </p>
        </section>

        {/* Component grid -------------------------------------------- */}
        <section className="relative mx-auto max-w-6xl px-6 pb-32">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <SplitText text="収録コンポーネント" splitType="chars" delay={35} />
            </h2>
            <p className="mt-3 text-sm text-white/50">
              各カードにカーソルを合わせるとスポットライトが追従します。
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((c, i) => (
              <SpotlightCard
                key={c.name}
                spotlightColor="rgba(156,64,255,0.28)"
                className="min-h-[168px] transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex h-full flex-col">
                  <span className="text-xs font-mono text-white/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold">
                    <ShinyText text={c.name} speed={5} />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    {c.desc}
                  </p>
                </div>
              </SpotlightCard>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.02] px-8 py-12 text-center">
            <GradientText
              colors={["#ffaa40", "#9c40ff", "#ffaa40"]}
              speed={7}
              className="text-2xl font-bold sm:text-3xl"
            >
              次はどの画面に使いますか？
            </GradientText>
            <p className="max-w-lg text-sm text-white/55">
              ランディングページの新規作成、既存ダッシュボードの刷新など、
              このコンポーネント群をベースに本番デザインへ発展できます。
            </p>
          </div>
        </section>
      </main>
    </ClickSpark>
  );
}
