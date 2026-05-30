import fs from "node:fs/promises";
import type { AutomationResult } from "./types";

export async function postDiscordResult(result: AutomationResult, overrideWebhookUrl?: string, overrideThreadId?: string) {
  const webhookUrl = buildDiscordWebhookUrl(overrideWebhookUrl, overrideThreadId);
  if (!webhookUrl) return;

  if (!result.imageUrl) {
    const form = new FormData();
    const image = await fs.readFile(result.imagePath);
    form.append("payload_json", JSON.stringify({
      content: [
        `**${result.title}**`,
        result.summary.slice(0, 1500),
      ].join("\n\n"),
      embeds: [
        {
          title: result.title,
          image: { url: "attachment://levela-result.png" },
          fields: result.sources.slice(0, 5).map((source) => ({
            name: source.title.slice(0, 256),
            value: source.url,
          })),
        },
      ],
    }));
    form.append("files[0]", new Blob([image], { type: "image/png" }), "levela-result.png");
    await fetch(webhookUrl, {
      method: "POST",
      body: form,
    });
    return;
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: [
        `**${result.title}**`,
        result.summary.slice(0, 1500),
        result.imageUrl,
      ].join("\n\n"),
      embeds: [
        {
          title: result.title,
          image: { url: result.imageUrl },
          fields: result.sources.slice(0, 5).map((source) => ({
            name: source.title.slice(0, 256),
            value: source.url,
          })),
        },
      ],
    }),
  });
}

function buildDiscordWebhookUrl(overrideWebhookUrl?: string, overrideThreadId?: string) {
  const webhookUrl = overrideWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
  const threadId = overrideThreadId || process.env.DISCORD_THREAD_ID;
  if (!webhookUrl || !threadId) return webhookUrl;

  const url = new URL(webhookUrl);
  url.searchParams.set("thread_id", threadId);
  return url.toString();
}
