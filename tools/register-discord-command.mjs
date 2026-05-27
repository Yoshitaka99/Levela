#!/usr/bin/env node

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId) {
  console.error("DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID are required.");
  process.exit(1);
}

const command = {
  name: "trigger",
  description: "URLとメモを処理して画像を生成します",
  type: 1,
  options: [
    {
      name: "urls",
      description: "処理したいURL。複数ある場合は空白区切り",
      type: 3,
      required: false,
    },
    {
      name: "memo",
      description: "Discord側の文脈や追加情報",
      type: 3,
      required: false,
    },
    {
      name: "instruction",
      description: "画像や要約の方向性",
      type: 3,
      required: false,
    },
  ],
};

const route = guildId
  ? `applications/${applicationId}/guilds/${guildId}/commands`
  : `applications/${applicationId}/commands`;

const response = await fetch(`https://discord.com/api/v10/${route}`, {
  method: "POST",
  headers: {
    authorization: `Bot ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(command),
});

const json = await response.json();
if (!response.ok) {
  console.error(json);
  process.exit(1);
}

console.log(JSON.stringify(json, null, 2));
