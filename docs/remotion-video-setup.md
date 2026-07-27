# Remotion 動画制作セットアップ

Claude Code / Codex などのエージェントに「Remotion で動画を作って」と頼めるようにするための構成メモ。

## 何が入っているか

| 場所 | 中身 |
| --- | --- |
| `.agents/skills/` | `remotion-dev/skills` から入れた Remotion スキル本体（11個）。Git 管理対象。 |
| `.claude/skills/` | 上記へのシンボリックリンク。Claude Code はここを読む。 |
| `video/` | Remotion プロジェクト本体（独立した npm プロジェクト） |

インストールしたスキル:

- `remotion-best-practices` … 入口。ここから他のスキルへ辿る
- `remotion-create` … 新規プロジェクト作成、レイアウト・文字サイズのルール
- `remotion-markup` … アニメーションの書き方（`useCurrentFrame()` / `interpolate()`）
- `remotion-render` … レンダリング
- `remotion-captions` … 字幕・キャプション
- `remotion-docs` / `remotion-upgrade` / `remotion-interactivity` / `remotion-maps` / `remotion-saas` / `mediabunny`

スキルの更新は再インストールで行う:

```bash
npx skills add remotion-dev/skills
```

## 使い方

依存関係のインストール（初回のみ / `video/node_modules` は Git 管理外）:

```bash
npm run video:install
```

プレビュー（Remotion Studio、http://localhost:3000）:

```bash
npm run video:dev
```

動画を書き出す:

```bash
npm run video:render          # video/out/ に出力
# または
cd video && npx remotion render MyComp out/video.mp4
```

Lint + 型チェック:

```bash
npm run video:lint
```

## エージェントへの頼み方

記事を動画にしたい場合は、Markdown をリポジトリに置いて次のように頼むだけでよい:

> `docs/xxx.md` を Remotion のスキルを使って動画にして

新しい動画を足す場合は `video/src/` にコンポーネントを作り、`video/src/Root.tsx` に `<Composition>` を追加する。

## Next.js アプリとの関係

`video/` は Next.js アプリとは完全に別のプロジェクトで、依存も分離している。
本体のビルドに影響しないよう、以下から除外済み:

- `tsconfig.json` の `exclude`
- `eslint.config.mjs` の `globalIgnores`
- `.vercelignore`

## 注意点

- アニメーションは必ず `useCurrentFrame()` で駆動する。CSS transition / animation、Tailwind の `animate-*` は
  レンダリング結果に反映されないので禁止。
- アセットは `video/public/` に置き、`staticFile()` で参照する。
- 書き出した動画（`video/out/`）は Git 管理外。
