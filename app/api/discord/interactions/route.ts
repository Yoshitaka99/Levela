import { NextRequest, NextResponse } from "next/server";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { runAutomation } from "@/app/lib/automation/runAutomation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "DISCORD_PUBLIC_KEY is not set." }, { status: 500 });
  }

  const signature = request.headers.get("x-signature-ed25519") || "";
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  const rawBody = await request.text();
  const verified = await verifyKey(rawBody, signature, timestamp, publicKey);

  if (!verified) {
    return NextResponse.json({ error: "Bad request signature" }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody);
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  const options = interaction.data?.options || [];
  const getOption = (name: string) => options.find((option: { name: string }) => option.name === name)?.value;
  const urlText = String(getOption("urls") || "");
  const discordText = String(getOption("memo") || "");
  const instruction = String(getOption("instruction") || "");
  const urls = urlText.split(/\s+/).filter(Boolean);

  queueMicrotask(async () => {
    try {
      await runAutomation({
        urls,
        discordText,
        instruction,
        trigger: "discord",
      });
    } catch (error) {
      console.error("Discord automation failed", error);
    }
  });

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "受け取りました。URLとメモを処理して、画像ができたらこのチャンネルへ投稿します。",
    },
  });
}
