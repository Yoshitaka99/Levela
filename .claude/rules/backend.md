# バックエンド規約（Levela）

App Router の Route Handler / AI SDK / Apps Script 連携 / 自動化スクリプトを対象とした規約です。

## API ルート（`app/**/route.ts`）
- HTTP メソッドごとに `export async function GET/POST(...)` を実装。
- 入力は `zod` で検証してから使う。検証失敗は 400 を返す。
- レスポンスは型・形を一貫させ、エラー時は適切なステータスコードと最小限のメッセージ。
- 例外は握り潰さず、サーバログに出しつつクライアントには内部情報を漏らさない。

## AI / 外部サービス
- AI 呼び出しは Vercel AI SDK（`ai`, `@ai-sdk/*`）/ `openai` を使用。
- API キー等は環境変数から読み、**サーバ側のみ**で参照する。クライアントへ渡さない。
- レート制限・タイムアウト・失敗時のフォールバックを考慮する。
- 知識ソース（`app/lib/chatbot*`）の構造を壊さず、追加時は型を合わせる。

## 環境変数・秘密情報
- `.env.local` / `.env*` はコミットしない。コードに直書きしない。
- 新規 env を追加したら名前・用途をドキュメント化し、ユーザーに伝える。

## Apps Script / 自動化（`apps-script/`, `tools/`）
- `apps-script/` は Google Apps Script。デプロイ手順は `docs/levela-apps-script-setup.md` 等を参照。
- `tools/` の自動化スクリプトはシークレットをハードコードしない（`automation:secret` 等を利用）。

## 品質
- 破壊的変更を避け、既存のレスポンス契約を維持する。
- 変更後は `npm run lint` と `npm run build` を通す。
