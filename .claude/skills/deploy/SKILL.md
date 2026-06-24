---
name: deploy
description: Levela（Next.js）を本番ビルド・デプロイ前チェックする手順。リリース前確認、Vercel デプロイ準備、ビルド検証をしたいときに使う。
---

# deploy — リリース前チェックと Vercel デプロイ

Levela は Vercel へのデプロイを想定した Next.js アプリです。
デプロイ前に必ず以下を順に確認します。

## 1. ローカル検証（必須）

```bash
npm install
npm run lint
npm run build
```

- `lint` と `build` がともに成功することが前提。失敗したら原因を解消するまでデプロイしない。
- `build` 成功は本番ビルドが通ることの最低保証。

## 2. 環境変数の確認

- `.env.local` / `.env*` はリポジトリにコミットされない。
- 本番で必要なキー（AI SDK / OpenAI / Discord / Apps Script 連携など）は
  Vercel のプロジェクト設定（Environment Variables）に登録されているか確認する。
- 新しく追加した env がある場合は、その名前と用途をユーザーに伝える。

## 3. デプロイ

- 通常は対象ブランチを push → Vercel が自動デプロイ（GitHub 連携）。
- main へのマージで本番反映される運用が基本。
- **`git push` はユーザーの明示的な許可があるときのみ実行する。**

## 4. デプロイ後の確認

- 主要ページ（`/`, `/chatbot`, `/team`, ダッシュボード系）が 200 で表示されるか。
- PWA（`public/manifest.json`, `public/sw.js`）が壊れていないか。

## 注意
- 本番に影響する操作（push / マージ / env 変更）は必ず事前に確認する。
