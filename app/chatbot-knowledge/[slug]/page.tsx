import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getInternalArticleBySlug,
  listInternalArticles,
  type ChatbotInternalArticleBlock,
} from "@/app/lib/chatbotInternalArticles";

type ChatbotKnowledgeArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const imageSizes: Record<string, { width: number; height: number }> = {
  "/chatbot-knowledge/assets/a5366ab3bdd08386886f81efd3993067_01_72dcb345f1.png": {
    width: 1620,
    height: 900,
  },
  "/chatbot-knowledge/assets/a5366ab3bdd08386886f81efd3993067_02_7169e64593.png": {
    width: 1524,
    height: 860,
  },
  "/chatbot-knowledge/assets/a5366ab3bdd08386886f81efd3993067_03_62bd6aace0.png": {
    width: 1524,
    height: 860,
  },
  "/chatbot-knowledge/assets/a5366ab3bdd08386886f81efd3993067_04_8fbbf513e7.png": {
    width: 1334,
    height: 884,
  },
};

export function generateStaticParams() {
  return listInternalArticles().map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: ChatbotKnowledgeArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getInternalArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${article.title} | Levela Bot`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ChatbotKnowledgeArticlePage({
  params,
}: ChatbotKnowledgeArticlePageProps) {
  const { slug } = await params;
  const article = getInternalArticleBySlug(slug);

  if (!article) notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
        <Link
          href="/chatbot-knowledge"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          内部記事一覧へ
        </Link>

        <header className="mt-6 border-b border-border pb-6">
          <div className="mb-3 text-sm text-muted-foreground">
            {article.category}
          </div>
          <h1 className="text-3xl font-semibold tracking-normal">
            {article.title}
          </h1>
        </header>

        <section className="mt-7 space-y-6">
          {article.blocks.map((block, index) => (
            <ArticleBlock block={block} index={index} key={index} />
          ))}
        </section>

        <footer className="mt-10 border-t border-border pt-5">
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            元のNotionページを開く
            <ExternalLink className="size-3.5" />
          </a>
        </footer>
      </article>
    </main>
  );
}

function ArticleBlock({
  block,
  index,
}: {
  block: ChatbotInternalArticleBlock;
  index: number;
}) {
  if (block.type === "empty") {
    return <div aria-hidden="true" className="h-4" />;
  }

  if (block.type === "link") {
    return (
      <a
        href={block.href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex break-all text-sm text-primary underline-offset-4 hover:underline"
      >
        {block.label}
      </a>
    );
  }

  if (block.type === "image") {
    const size = imageSizes[block.src] ?? { width: 1200, height: 800 };

    return (
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        <Image
          src={block.src}
          alt={block.alt}
          width={size.width}
          height={size.height}
          className="h-auto w-full"
          priority={index < 3}
        />
      </div>
    );
  }

  return <NotionText markdown={block.markdown} />;
}

function NotionText({ markdown }: { markdown: string }) {
  const colorMatch = markdown.match(/\s\{color="([^"]+)"\}$/);
  const color = colorMatch?.[1];
  const body = colorMatch
    ? markdown.slice(0, colorMatch.index).trimEnd()
    : markdown;
  const parts = body.split("<br>");

  return (
    <div
      className={
        color === "pink_bg"
          ? "whitespace-pre-wrap rounded-md bg-rose-500/15 px-3 py-2 text-sm leading-7"
          : color === "blue_bg"
            ? "whitespace-pre-wrap rounded-md bg-sky-500/15 px-3 py-2 text-sm leading-7"
            : "whitespace-pre-wrap text-sm leading-7"
      }
    >
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          <InlineMarkdown value={part} />
          {index < parts.length - 1 ? <br /> : null}
        </span>
      ))}
    </div>
  );
}

function InlineMarkdown({ value }: { value: string }) {
  const segments = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.startsWith("**") && segment.endsWith("**")) {
          return (
            <strong key={`${segment}-${index}`}>
              {segment.slice(2, -2)}
            </strong>
          );
        }

        return <span key={`${segment}-${index}`}>{segment}</span>;
      })}
    </>
  );
}
