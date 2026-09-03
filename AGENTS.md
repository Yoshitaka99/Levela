# Codex 操作メモ

このリポジトリは、iPhone の ChatGPT/Codex から作業しやすいように以下の前提で運用します。

## 基本コマンド

```bash
npm install
npm run lint
npm run build
npm run dev
```

## 注意

- `.env.local` や `.env*` はコミットしない。
- 変更後は `npm run lint` と `npm run build` を確認する。
- Next.js アプリ。主要コードは `app/`、静的ファイルは `public/`。
- 動画制作は `video/`（Remotion、独立プロジェクト）。詳細は `docs/remotion-video-setup.md`。
  Remotion スキルは `.agents/skills/` にあり、`.claude/skills/` からリンクしている。

## iPhone からの使い方

1. このフォルダを GitHub リポジトリとして push する。
2. iPhone の ChatGPT アプリで Codex を開く。
3. GitHub 連携を有効化し、このリポジトリを選ぶ。
4. 依頼時は「dormswap の GitHub リポジトリで作業して」と伝える。
