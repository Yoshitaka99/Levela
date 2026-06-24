import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ExternalLink, ImageIcon, MessageSquare, Smile } from "lucide-react";
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
  "/chatbot-knowledge/payment-method/bank-transfer.png": {
    width: 1620,
    height: 900,
  },
  "/chatbot-knowledge/payment-method/credit-card.png": {
    width: 1524,
    height: 860,
  },
  "/chatbot-knowledge/payment-method/special-payment.png": {
    width: 1524,
    height: 860,
  },
  "/chatbot-knowledge/payment-method/lifety.png": {
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
    <main className="min-h-screen bg-[#191919] text-[#f1f1ef]">
      <article className="mx-auto w-full max-w-[1060px] px-4 py-6 md:px-10 md:py-8">
        <Link
          href="/chatbot-knowledge"
          className="inline-flex items-center gap-2 text-[15px] font-medium text-[#a9a9a9] transition-colors hover:text-[#f1f1ef]"
        >
          <ArrowLeft className="size-4" />
          内部記事一覧へ
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#8a8a8a]">
          <span className="inline-flex items-center gap-1.5">
            <Smile className="size-4" />
            アイコンを追加
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ImageIcon className="size-4" />
            カバー画像を追加
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-4" />
            認証を追加
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="size-4" />
            コメントを追加
          </span>
        </div>

        <header className="mt-6 pb-8">
          <h1 className="text-[44px] font-bold leading-[1.12] tracking-normal md:text-[58px]">
            {article.title}
          </h1>
        </header>

        <section className="space-y-5">
          {article.blocks.map((block, index) => (
            <ArticleBlock block={block} index={index} key={index} />
          ))}
        </section>

        <footer className="mt-14 border-t border-[#3f3f3f] pt-6">
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-[#f1f1ef] transition-colors hover:text-[#cfcfcf]"
          >
            元のNotionページを開く
            <ExternalLink className="size-4" />
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
        className="inline-flex break-all text-[20px] leading-8 text-[#d6d6d6] underline decoration-[#7b7b7b] underline-offset-4 hover:text-[#f1f1ef]"
      >
        {block.label}
      </a>
    );
  }

  if (block.type === "image") {
    const src = normalizeKnowledgeImageSrc(block.src);
    const size = imageSizes[src] ?? { width: 1200, height: 800 };

    return (
      <div className="overflow-hidden rounded-sm bg-[#202020]">
        <Image
          src={src}
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

function normalizeKnowledgeImageSrc(src: string) {
  if (src.startsWith("/chatbot-knowledge/assets/notion-crawl/")) return src;
  if (!src.startsWith("/chatbot-knowledge/assets/")) return src;

  const fileName = src.replace(/\\/g, "/").split("/").at(-1);
  return fileName ? `/chatbot-knowledge/assets/${fileName}` : src;
}

type ParsedLine =
  | {
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
      color?: string;
    }
  | {
      type: "paragraph";
      text: string;
      color?: string;
    }
  | {
      type: "list";
      ordered?: boolean;
      items: string[];
    }
  | {
      type: "quote";
      text: string;
    }
  | {
      type: "callout";
      color?: string;
      lines: string[];
    }
  | {
      type: "divider";
    }
  | {
      type: "empty";
    };

function NotionText({ markdown }: { markdown: string }) {
  const lines = parseNotionMarkdown(markdown);

  return (
    <div className="space-y-4">
      {lines.map((line, index) => {
        if (line.type === "empty") {
          return <div key={index} className="h-2" aria-hidden="true" />;
        }

        if (line.type === "divider") {
          return <hr key={index} className="my-8 border-[#4a4a4a]" />;
        }

        if (line.type === "list") {
          const ListTag = line.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={`ml-6 max-w-full space-y-3 break-words text-[22px] leading-[1.75] marker:text-[#f1f1ef] ${
                line.ordered ? "list-decimal" : "list-disc"
              }`}
            >
              {line.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="pl-2">
                  <InlineMarkdown value={item} />
                </li>
              ))}
            </ListTag>
          );
        }

        if (line.type === "quote") {
          return (
            <blockquote
              key={index}
              className="max-w-full break-words border-l-4 border-[#5f5f5f] pl-4 text-[21px] leading-[1.7] text-[#d7d7d3]"
            >
              <InlineMarkdown value={line.text} />
            </blockquote>
          );
        }

        if (line.type === "callout") {
          return (
            <div
              key={index}
              className={`max-w-full break-words rounded-md px-4 py-3 text-[20px] leading-[1.7] ${getNotionColorClass(
                line.color
              ) || "bg-[#2b2b2b]"}`}
            >
              {line.lines.map((item, itemIndex) => (
                <p key={`${item}-${itemIndex}`} className="my-1">
                  <InlineMarkdown value={stripHeadingPrefix(item)} />
                </p>
              ))}
            </div>
          );
        }

        if (line.type === "heading") {
          const content = <InlineMarkdown value={line.text} />;

          if (line.level === 1) {
            return (
              <h2
                key={index}
                className={`mt-10 max-w-full break-words rounded-md px-1.5 py-1 text-[38px] font-bold leading-[1.2] tracking-normal md:text-[44px] ${getNotionColorClass(
                  line.color
                )}`}
              >
                {content}
              </h2>
            );
          }

          if (line.level === 2) {
            return (
              <h3
                key={index}
                className={`mt-8 max-w-full break-words rounded-md px-1.5 py-1 text-[30px] font-bold leading-[1.25] ${getNotionColorClass(
                  line.color
                )}`}
              >
                {content}
              </h3>
            );
          }

          return (
            <h4
              key={index}
              className={`mt-8 max-w-full break-words rounded-md px-1.5 py-1 text-[26px] font-bold leading-[1.35] ${getNotionColorClass(
                line.color
              )}`}
            >
              {content}
            </h4>
          );
        }

        return (
          <p
            key={index}
            className={`max-w-full break-words rounded-md px-1.5 py-0.5 text-[22px] leading-[1.75] ${getNotionColorClass(
              line.color
            )}`}
          >
            <InlineMarkdown value={line.text} />
          </p>
        );
      })}
    </div>
  );
}

function parseNotionMarkdown(markdown: string): ParsedLine[] {
  const rawLines = markdown
    .replace(/<br\s*\/?>/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  const parsed: ParsedLine[] = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const rawLine = rawLines[index].trim();

    if (!rawLine || rawLine === "<empty-block/>") {
      parsed.push({ type: "empty" });
      continue;
    }

    if (rawLine === "---") {
      parsed.push({ type: "divider" });
      continue;
    }

    const calloutMatch = rawLine.match(/^<callout(?:\s+color="([^"]+)")?>$/);
    if (calloutMatch) {
      const lines: string[] = [];
      while (rawLines[index + 1] && rawLines[index + 1].trim() !== "</callout>") {
        index += 1;
        const calloutLine = rawLines[index].trim();
        if (calloutLine && calloutLine !== "<empty-block/>") lines.push(calloutLine);
      }
      if (rawLines[index + 1]?.trim() === "</callout>") index += 1;
      parsed.push({ type: "callout", color: calloutMatch[1], lines });
      continue;
    }

    if (rawLine.startsWith("> ")) {
      parsed.push({ type: "quote", text: rawLine.slice(2).trim() });
      continue;
    }

    if (rawLine.startsWith("- ")) {
      const items = [rawLine.slice(2).trim()];

      while (rawLines[index + 1]?.trim().startsWith("- ")) {
        index += 1;
        items.push(rawLines[index].trim().slice(2).trim());
      }

      parsed.push({ type: "list", items });
      continue;
    }

    const orderedMatch = rawLine.match(/^\d+\.\s*(.+)$/);
    if (orderedMatch) {
      const items = [orderedMatch[1].trim()];

      while (/^\d+\.\s*/.test(rawLines[index + 1]?.trim() ?? "")) {
        index += 1;
        items.push(rawLines[index].trim().replace(/^\d+\.\s*/, "").trim());
      }

      parsed.push({ type: "list", ordered: true, items });
      continue;
    }

    const { text, color } = extractNotionColor(rawLine);
    const headingMatch = text.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      parsed.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
        color,
      });
      continue;
    }

    parsed.push({ type: "paragraph", text, color });
  }

  return parsed;
}

function stripHeadingPrefix(value: string) {
  return value.replace(/^#{1,6}\s+/, "").replace(/^>\s+/, "");
}

function extractNotionColor(value: string) {
  const colorMatch = value.match(/\s\{[^}]*color="([^"]+)"[^}]*\}$/);

  return {
    text: value.replace(/\s\{[^}]+\}$/, "").trimEnd(),
    color: colorMatch?.[1],
  };
}

function getNotionColorClass(color?: string) {
  const classes: Record<string, string> = {
    yellow_bg: "bg-[#4f4324]",
    gray_bg: "bg-[#373938]",
    red_bg: "bg-[#5a2f2f]",
    green_bg: "bg-[#314a39]",
    purple_bg: "bg-[#45375a]",
    pink_bg: "bg-[#5a3545]",
    blue_bg: "bg-[#2f405c]",
    brown_bg: "bg-[#4a3f2a]",
  };

  return color ? (classes[color] ?? "") : "";
}

function InlineMarkdown({ value }: { value: string }) {
  const cleanValue = value
    .replace(/<span\b[^>]*>/g, "")
    .replace(/<\/span>/g, "")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]");
  const segments = cleanValue
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .filter(Boolean);

  return (
    <>
      {segments.map((segment, index) => {
        const linkMatch = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const isInternalLink = linkMatch[2].startsWith("/");
          return (
            <a
              key={`${segment}-${index}`}
              href={linkMatch[2]}
              target={isInternalLink ? undefined : "_blank"}
              rel={isInternalLink ? undefined : "noreferrer"}
              className="underline decoration-[#7b7b7b] underline-offset-4 transition-colors hover:text-white"
            >
              {linkMatch[1]}
            </a>
          );
        }

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
