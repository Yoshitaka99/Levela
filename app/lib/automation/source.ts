import * as cheerio from "cheerio";
import type { AutomationSource } from "./types";

const MAX_SOURCE_CHARS = 3200;

export function normalizeUrls(urls: string[]) {
  return Array.from(
    new Set(
      urls
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => new URL(url).toString()),
    ),
  );
}

export async function fetchSources(urls: string[]): Promise<AutomationSource[]> {
  const normalized = normalizeUrls(urls);
  return Promise.all(normalized.map(fetchSource));
}

async function fetchSource(url: string): Promise<AutomationSource> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "LevelaAutomation/1.0 (+https://levela.local)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (!contentType.includes("html")) {
    return {
      url,
      title: url,
      text: compactText(body).slice(0, MAX_SOURCE_CHARS),
    };
  }

  const $ = cheerio.load(body);
  $("script,style,noscript,svg,iframe").remove();
  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").first().text() ||
    $("h1").first().text() ||
    url;
  const description =
    $("meta[name='description']").attr("content") ||
    $("meta[property='og:description']").attr("content") ||
    "";
  const mainText = compactText(
    [
      description,
      $("main").text(),
      $("article").text(),
      $("body").text(),
    ].join("\n"),
  );

  return {
    url,
    title: compactText(title).slice(0, 160),
    text: mainText.slice(0, MAX_SOURCE_CHARS),
  };
}

export function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
