# Codex 操作メモ（Levela）

このリポジトリ（`levela`）は、iPhone の ChatGPT / Codex からでも作業できることを前提に運用します。
中身は Next.js (App Router) アプリ + Google Apps Script + 各種スクリプトの複合構成です。
※ 旧 `dormswap` から移行したリポジトリなので、古い名前が出てくるドキュメントがあります。

## 基本コマンド

```bash
npm install
npm run lint     # eslint（eslint-config-next）
npm run build    # next build
npm run dev      # next dev（http://localhost:3000）
npm run start    # 本番ビルドの起動
```

補助コマンド:

```bash
npm run chatbot:rag          # data/chatbot-rag/index.json を再生成
npm run chatbot:rag:eval     # data/chatbot-rag/eval-cases.json で精度チェック
npm run automation:secret    # AUTOMATION_TRIGGER_SECRET を生成
npm run automation:trigger   # /api/automation/* をローカルから叩く
npm run discord:register-command  # Discord スラッシュコマンド登録
```

## ディレクトリ構成

| パス | 中身 |
| --- | --- |
| `app/` | Next.js App Router。画面と `app/api/*` の Route Handler |
| `app/api/` | automation / chatbot / discord / false-report-checker / life-plan-risk-map / report-guard / roleplay-log / seminar-dashboard / skills-galaxy / team-access / team-sales-dashboard / team-sales-goals |
| `components/` | shadcn/ui 系 (`components/ui`) と AI Elements (`components/ai-elements`) |
| `lib/`, `app/lib/` | 共通ユーティリティ |
| `apps-script/` | Google Apps Script（`.gs`）。スプレッドシート連携・Web アプリ |
| `data/` | チャットボット用の RAG インデックス・Notion 取得結果・OCR 結果 |
| `docs/` | 各機能のセットアップ手順と作業メモ |
| `scripts/` | RAG 構築・Notion クロール・世帯収支レポートなどのバッチ（.mjs / .py） |
| `tools/` | automation trigger、Discord コマンド登録、Instagram 収集など |
| `public/` | 静的ファイル、PWA (`manifest.json`, `sw.js`) |
| ルート直下の `make_*.py` / `*.mjs` | スライド・画像・Excel 生成の使い捨てスクリプト（アプリ本体からは未参照） |

## 主要な環境変数

`.env.local` に置く（コミット禁止）。Vercel 側にも同じ値を設定する。

- OpenAI: `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_EMBEDDING_DIMENSIONS`
- チャットボット: `CHATBOT_LIVE_OPENAI`, `CHATBOT_ADMIN_PASSWORD`, `CHATBOT_RAG_CHUNK_SIZE` ほか
- automation: `AUTOMATION_ENDPOINT`, `AUTOMATION_TRIGGER_SECRET`, `AUTOMATION_DEFAULT_URLS`
- AI ドリル: `LEVELA_AI_DRILL_*`（ランキング取得用の URL / Cookie / 対象メンバーなど）
- Discord: `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_WEBHOOK_URL`, `DISCORD_THREAD_ID`
- 虚偽報告チェッカー: `FALSE_REPORT_SPREADSHEET_ID`, `FALSE_REPORT_WEBHOOK_URL`, `FALSE_REPORT_WEBHOOK_SECRET`
- ロープレログ: `ROLEPLAY_LOG_SHEET_WEBHOOK_URL`, `ROLEPLAY_LOG_SHEET_SECRET`
- ダッシュボード: `SEMINAR_DASHBOARD_DATA_URL`, `TEAM_SALES_DASHBOARD_DATA_URL`, `TEAM_SALES_GOALS_KV_REST_API_URL` / `_TOKEN`
- KV / Upstash: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- スキルギャラクシー: `SKILLS_GALAXY_ADMIN_ID`, `SKILLS_GALAXY_ADMIN_PASSWORD`
- その他: `NEXT_PUBLIC_APP_URL`

## CI / 自動化

- `.github/workflows/automation-trigger.yml`: `workflow_dispatch` でデプロイ済みの `/api/automation/trigger`（または `ai-drill-ranking`）を叩く。生成物は artifact `ai-drill-ranking-manual-post` に入るので、Discord へは手動で投稿する（自動送信はしない）。
- シークレットは GitHub Actions の Secrets に登録。
- デプロイは Vercel。`.vercelignore` の対象外だけが上がる。

## 作業ルール

- `.env.local` や `.env*`、Cookie・トークン類は絶対にコミットしない。
- 変更後は `npm run lint` と `npm run build` を通す。
- `data/` 配下の生成物を手で書き換えない。`npm run chatbot:rag` などで作り直す。
- `apps-script/` を触ったら、対応する `docs/*-setup.md` の手順も更新する。
- 個人情報や案件固有の情報を含む `docs/` は公開前提で書かない。

## iPhone からの使い方

1. このリポジトリを GitHub に push する。
2. iPhone の ChatGPT アプリで Codex を開く。
3. GitHub 連携を有効化し、`yoshitaka99/levela` を選ぶ。
4. 依頼時は「Levela の GitHub リポジトリで作業して」と伝える。
5. 変更は必ずブランチを切って PR にする（main へ直接 push しない）。
