# Levela automation trigger setup

URL、Discordメモ、追加指示をまとめて処理し、画像を生成してDiscordへ返すための入口です。

## できること

- `POST /api/automation/trigger` で一撃実行
- Discord slash command の受信口 `/api/discord/interactions`
- GitHub Actions の手動実行と毎時実行
- `OPENAI_API_KEY` と `OPENAI_IMAGE_MODEL` があればAI画像生成
- AI画像生成が使えない場合も、`sharp` でPNGカードを生成

## 必要な環境変数

```bash
AUTOMATION_TRIGGER_SECRET=長いランダム文字列
NEXT_PUBLIC_APP_URL=https://your-domain.example
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_PUBLIC_KEY=Discord Developer Portal の Public Key
DISCORD_BOT_TOKEN=slash command 登録時だけ必要
DISCORD_APPLICATION_ID=Discord Developer Portal の Application ID
DISCORD_GUILD_ID=任意。テストサーバー限定登録に使う
OPENAI_API_KEY=任意
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
AUTOMATION_DEFAULT_URLS=https://example.com https://example.org
```

`OPENAI_API_KEY` と `OPENAI_IMAGE_MODEL` は任意です。未設定でも画像カードは作られます。

秘密文字列は次で生成できます。

```bash
npm run automation:secret
```

## 手動トリガー

```bash
$env:AUTOMATION_TRIGGER_SECRET="..."
npm run dev
node tools/automation-trigger.mjs https://example.com "Discordから来たメモ" --instruction "投稿用に要点を強く"
```

デプロイ済みURLへ投げる場合:

```bash
$env:AUTOMATION_ENDPOINT="https://your-domain.example/api/automation/trigger"
node tools/automation-trigger.mjs https://example.com "メモ"
```

## GitHub Actions

Repository secrets に次を入れます。

- `AUTOMATION_ENDPOINT`: `https://your-domain.example/api/automation/trigger`
- `AUTOMATION_TRIGGER_SECRET`: アプリ側と同じ値
- `SCHEDULE_URLS`: 毎時処理したいURL。空白区切り
- `SCHEDULE_MEMO`: 毎時処理に足す文脈
- `SCHEDULE_INSTRUCTION`: 毎時画像の方向性
- `AUTOMATION_MODE`: `ai-drill-ranking` にするとAIドリルランキング専用処理

`.github/workflows/automation-trigger.yml` は毎時実行と `workflow_dispatch` の一撃実行に対応しています。

## AIドリルランキング自動投稿

`https://app.levela.co.jp/ai-drill/ranking` はログインが必要です。完全自動にするには、Vercel側に次のどちらかを設定します。

- `LEVELA_AI_DRILL_COOKIE`: ログイン済みセッションCookie
- `LEVELA_AI_DRILL_RANKING_JSON_URL`: ランキングJSONを返す内部/公開API URL

追加設定:

```bash
LEVELA_AI_DRILL_TARGET_MEMBERS=山田太郎,佐藤花子
LEVELA_AI_DRILL_ROUND_START=9
LEVELA_AI_DRILL_ROUND_START_DATE=2026-05-30
```

GitHub Actionsで定期実行する場合はRepository secretsに次を追加します。

```bash
AUTOMATION_MODE=ai-drill-ranking
```

## Discord slash command

Discord Developer Portal で Interactions Endpoint URL を次にします。

```text
https://your-domain.example/api/discord/interactions
```

slash command の例:

- name: `trigger`
- option `urls`: string
- option `memo`: string
- option `instruction`: string

Bot tokenで登録する場合:

```bash
$env:DISCORD_BOT_TOKEN="..."
$env:DISCORD_APPLICATION_ID="..."
$env:DISCORD_GUILD_ID="..." # 任意
npm run discord:register-command
```

Discordから実行すると即時に受領メッセージを返し、処理後に `DISCORD_WEBHOOK_URL` へ画像付きで投稿します。
