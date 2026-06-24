---
name: debug
description: Levela で発生したバグ・ビルドエラー・実行時エラーを体系的に切り分ける手順。エラーの原因特定、再現、修正方針づくりに使う。
---

# debug — バグ切り分け手順

## 1. 事実を集める
- エラーメッセージ全文・スタックトレースを確認する（推測しない）。
- 再現手順（URL・操作・入力）を特定する。
- いつから起きたか（直近の変更を `git log`・`git diff` で確認）。

## 2. 種類で分岐

### ビルド / 型エラー
```bash
npm run build
npx tsc --noEmit
```
- 型不整合・import 切れ・Server/Client コンポーネント境界（`"use client"`）を疑う。

### Lint エラー
```bash
npm run lint
```

### 実行時エラー（ブラウザ / API）
```bash
npm run dev
```
- ブラウザのコンソールと Network タブ、サーバ側のターミナルログを両方見る。
- App Router の API ルート（`app/**/route.ts`）はサーバ側ログを確認。
- AI SDK / OpenAI 呼び出しは API キー・レート・レスポンス形を確認。

## 3. 仮説 → 最小再現 → 修正
- 原因仮説を1つに絞り、最小の変更で検証する。
- 修正後は必ず `npm run lint` と `npm run build` を再実行する。

## 4. 再発防止
- 同じ轍を踏まないためのメモを `docs/` に残すか、`rules/` を更新する。

## よくある落とし穴（Next.js 16 / React 19）
- Server Component で `useState`/`useEffect` を使い `"use client"` を付け忘れる。
- `async` Server Component と Client 部品の責務混在。
- 画像最適化（`next/image`）と `public/` パスの不一致。
