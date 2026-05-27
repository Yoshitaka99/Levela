import type { AutomationResult } from "./types";

export async function postDiscordResult(result: AutomationResult) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

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
