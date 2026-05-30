import crypto from "node:crypto";
import { postDiscordResult } from "./discord";
import { fetchSources } from "./source";
import { renderAutomationImage } from "./renderImage";
import { summarizeForImage } from "./summarize";
import type { AutomationRequest, AutomationResult } from "./types";

export async function runAutomation(request: AutomationRequest): Promise<AutomationResult> {
  if (!request.urls.length && !request.discordText?.trim()) {
    throw new Error("At least one URL or discordText is required.");
  }

  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
  const sources = request.urls.length ? await fetchSources(request.urls) : [];
  const summary = await summarizeForImage(sources, request.discordText, request.instruction);
  const image = await renderAutomationImage(id, summary);
  const title = makeTitle(summary);

  const result: AutomationResult = {
    id,
    title,
    summary,
    sources,
    ...image,
  };

  if (!request.skipDiscordPost) {
    await postDiscordResult(result, request.discordWebhookUrl, request.discordThreadId);
  }
  return result;
}

function makeTitle(summary: string) {
  const firstLine = summary.split("\n").map((line) => line.trim()).find(Boolean);
  return (firstLine || "Levela Automation Result").slice(0, 90);
}
