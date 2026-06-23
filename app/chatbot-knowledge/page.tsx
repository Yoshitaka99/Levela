import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FileText,
  Images,
  MessageCircle,
} from "lucide-react";
import { listInternalArticles } from "@/app/lib/chatbotInternalArticles";

export const metadata: Metadata = {
  title: "Levela Bot Knowledge",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChatbotKnowledgeIndexPage() {
  const articles = listInternalArticles();
  const groupedArticles = articles.reduce<
    { category: string; articles: typeof articles }[]
  >((groups, article) => {
    const group = groups.find((item) => item.category === article.category);

    if (group) {
      group.articles.push(article);
    } else {
      groups.push({
        category: article.category,
        articles: [article],
      });
    }

    return groups;
  }, []);
  const imageCount = articles.reduce(
    (total, article) =>
      total + article.blocks.filter((block) => block.type === "image").length,
    0
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
        <header className="border-b border-border pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                <BookOpen className="size-3.5" />
                internal knowledge
              </div>
              <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
                記事一覧
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Notionを開かずに確認できる軽量版の記事です。チャットボットが参照する社内ナレッジをカテゴリ別に並べています。
              </p>
            </div>

            <Link
              href="/chatbot"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm transition-colors hover:bg-muted"
            >
              <MessageCircle className="size-4" />
              チャットへ
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/35 px-4 py-3">
              <div className="text-xs text-muted-foreground">記事数</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-semibold">
                <FileText className="size-4 text-muted-foreground" />
                {articles.length}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/35 px-4 py-3">
              <div className="text-xs text-muted-foreground">カテゴリ</div>
              <div className="mt-1 text-xl font-semibold">
                {groupedArticles.length}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/35 px-4 py-3">
              <div className="text-xs text-muted-foreground">画像</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-semibold">
                <Images className="size-4 text-muted-foreground" />
                {imageCount}
              </div>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2" aria-label="カテゴリ">
            {groupedArticles.map((group) => (
              <a
                key={group.category}
                href={`#${getCategoryId(group.category)}`}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                {group.category}
                <span className="text-xs text-muted-foreground">
                  {group.articles.length}
                </span>
              </a>
            ))}
          </nav>
        </header>

        <div className="mt-8 space-y-10">
          {groupedArticles.map((group) => (
            <section
              id={getCategoryId(group.category)}
              key={group.category}
              className="scroll-mt-6"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{group.category}</h2>
                  <p className="text-sm text-muted-foreground">
                    {group.articles.length}件
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {group.articles.map((article) => {
                  const articleImageCount = article.blocks.filter(
                    (block) => block.type === "image"
                  ).length;
                  const textBlocks = article.blocks.filter(
                    (block) => block.type === "text"
                  ).length;

                  return (
                    <article
                      key={article.slug}
                      className="rounded-lg border border-border bg-muted/20 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                              {article.slug}
                            </span>
                            {articleImageCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                                <Images className="size-3" />
                                画像 {articleImageCount}
                              </span>
                            ) : null}
                            <span className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                              本文 {textBlocks}
                            </span>
                          </div>
                          <h3 className="font-medium leading-6">
                            {article.title}
                          </h3>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            href={article.internalPath}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-sm text-background transition-opacity hover:opacity-85"
                          >
                            開く
                            <ArrowRight className="size-4" />
                          </Link>
                          <a
                            href={article.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm transition-colors hover:bg-muted"
                          >
                            Notion
                            <ExternalLink className="size-4" />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function getCategoryId(category: string) {
  const categoryIds: Record<string, string> = {
    ステータス: "status",
    決済: "payment",
    Lステップ操作: "lstep",
    その他: "other",
  };

  return categoryIds[category] ?? category;
}
