# CLAUDE.md — Levela プロジェクト前提

このファイルは、毎回の会話で同じ説明を繰り返さないための「プロジェクトの土台」です。
サブエージェントを含むすべての作業者は、着手前にここを読んでから動いてください。

## プロジェクト概要

- **名前**: Levela（旧 dormswap）
- **種別**: Next.js（App Router）Web アプリ
- **目的**: 営業・チーム運営・チャットボット・ロールプレイ等の社内向け業務支援ツール群
- **主要技術**: Next.js 16 / React 19 / TypeScript / Tailwind CSS v4 / shadcn/ui / Vercel AI SDK (`ai`, `@ai-sdk/*`)
- **デプロイ先**: Vercel 想定

## ディレクトリの読み方

| パス | 役割 |
| --- | --- |
| `app/` | App Router のページ・API・クライアントコンポーネント（主役） |
| `app/lib/` | チャットボットの知識ソース等の共有ロジック |
| `components/ui/` | shadcn/ui ベースの UI プリミティブ |
| `components/ai-elements/` | チャット UI 部品 |
| `lib/` | 汎用ユーティリティ（`cn` など） |
| `public/` | 静的ファイル・PWA 関連 |
| `apps-script/` | Google Apps Script（ダッシュボード連携 API） |
| `tools/` | 自動化・収集スクリプト |
| `scripts/` | データ整形などの一回限りスクリプト |
| `docs/` | 仕様・設計・タスク管理（**着手前に必ず読む**） |
| `.claude/` | 自律開発の中心設定（agents / skills / commands / rules） |

## 必ず守るコマンド規約

```bash
npm install        # 依存導入
npm run dev        # 開発サーバ（localhost:3000）
npm run lint       # ESLint（変更後に必須）
npm run build      # 本番ビルド（変更後に必須）
```

- **変更を終える前に必ず `npm run lint` と `npm run build` を通す。** 落ちたまま完了報告しない。
- `.env.local` / `.env*` はコミットしない。秘密情報をコードに直書きしない。

## 成功条件（Definition of Done）

1. 要求（`docs/requirements.md`）を満たしている。
2. `npm run lint` と `npm run build` がともに成功する。
3. 既存の挙動を壊していない（関連ページが表示・動作する）。
4. 変更が `docs/task-board.md` に反映され、該当タスクが完了に移されている。

## 命名・コーディング規約

- TypeScript は厳格に。`any` を避け、型を明示する。API ルートの入力は `zod` で検証する。
- コメントは最小限。コード自体で意図が伝わるようにし、複雑な箇所だけ日本語で補足する。
- コンポーネントは PascalCase、ファイルは既存ディレクトリの慣習に合わせる
  （ページは `page.tsx`、クライアント部品は `XxxClient.tsx`）。
- 日本語 UI が基本。トーンは親しみやすいカジュアル（短め）に寄せる。
- コミットメッセージは日本語で書く。
- 詳細は `.claude/rules/frontend.md` / `.claude/rules/backend.md` / `.claude/rules/git.md` を参照。

## 自律開発の回し方

詳細は `docs/autonomous-dev-playbook.md` を参照。要点:

1. 司令塔（最初のプロンプト）がタスクを分解し、サブエージェントへ割り振る。
2. `researcher → planner → implementer → tester → reviewer` の順で並列・直列に回す。
3. 各タスク完了ごとに `docs/task-board.md` を更新し、次のタスクを投入する。
