import { listInternalArticles } from "@/app/lib/chatbotInternalArticles";

export type ChatbotAdminSource = {
  slug: string;
  title: string;
  category: string;
  sourceUrl: string;
  internalPath: string;
  preview: string;
  imageCount: number;
  textBlockCount: number;
};

export function getChatbotAdminSources(): ChatbotAdminSource[] {
  return listInternalArticles().map((article) => {
    const textBlocks = article.blocks.filter((block) => block.type === "text");
    const preview = textBlocks
      .map((block) => block.markdown)
      .join(" ")
      .replace(/\*\*/g, "")
      .replace(/<br>/g, " ")
      .replace(/\s\{color="[^"]+"\}/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      slug: article.slug,
      title: article.title,
      category: article.category,
      sourceUrl: article.sourceUrl,
      internalPath: article.internalPath,
      preview: preview.slice(0, 180),
      imageCount: article.blocks.filter((block) => block.type === "image")
        .length,
      textBlockCount: textBlocks.length,
    };
  });
}
