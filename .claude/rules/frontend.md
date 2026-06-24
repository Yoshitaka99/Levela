# フロントエンド規約（Levela）

App Router / React 19 / TypeScript / Tailwind v4 / shadcn/ui を前提とした規約です。

## ディレクトリと命名
- ページは `app/<route>/page.tsx`。サーバ側で完結できるものは Server Component のまま。
- 対話・状態を持つ UI は `app/<route>/XxxClient.tsx` に分離し、先頭に `"use client"`。
- 再利用 UI プリミティブは `components/ui/`（shadcn/ui）。チャット部品は `components/ai-elements/`。
- 汎用ユーティリティは `lib/`（クラス結合は `cn`）。

## Server / Client の境界
- `useState` / `useEffect` / イベントハンドラを使うコンポーネントは必ず `"use client"`。
- データ取得・秘密情報アクセスは Server 側（Server Component / Route Handler）で行う。
- Client に API キーや内部知識ソースを直接渡さない。

## スタイリング
- Tailwind v4 のユーティリティを使う。アドホックな inline style は避ける。
- shadcn/ui のコンポーネントを優先し、独自実装を増やしすぎない。
- レスポンシブ（モバイル幅）を必ず考慮する。日本語 UI が基本。

## 型と品質
- `any` を避け、props・状態に明示的な型を付ける。
- import の未使用・到達不能コードを残さない。
- 変更後は `npm run lint` と `npm run build` を通す。

## アクセシビリティ・UX
- ボタン・リンクには適切なラベル。ローディング・エラー・空状態を表示する。
- 既存ページのトーン・余白・配色に合わせる。
