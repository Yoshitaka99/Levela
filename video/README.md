# オロチーム モチベーション動画（Remotion）

台本 `docs/orochi-motivation-video-script.md` を [Remotion](https://remotion.dev) で
そのまま動画にしたものです。テロップ主体のキネティックタイポグラフィなので、
映像素材ゼロで1本成立します。

## コンポジション

| ID | 尺 | 解像度 | 用途 |
|---|---|---|---|
| `OrochiMotivation` | 2:40 | 1920x1080 | 本編。朝礼・月初キックオフ |
| `OrochiMotivationShort` | 1:00 | 1920x1080 | ショート版。Slack共有 |
| `OrochiMotivationVertical` | 1:00 | 1080x1920 | 縦型。スマホ／ストーリーズ |

## 使い方

```bash
cd video
npm install

# プレビュー（ブラウザが開いて、その場で数値やテロップを触れる）
npm run studio

# 書き出し
npm run render          # 本編 → out/orochi-motivation.mp4
npm run render:short    # ショート → out/orochi-motivation-short.mp4
npm run render:vertical # 縦型 → out/orochi-motivation-vertical.mp4
```

`npm run studio` を開くと左のタイムラインにシーンが `01-question` 〜 `06-team` の
名前で並びます。台本のブロック①〜⑥と1対1で対応しています。

## BGMの入れ方

権利の都合で音源は同梱していません。商用利用可の音源
（Artlist / Epidemic Sound / DOVA-SYNDROME など）を用意して、

1. `video/public/audio/bgm.mp3` に置く
2. Studio右側の props で `bgm` に `audio/bgm.mp3` と入力（または下のCLI）

```bash
npx remotion render OrochiMotivation out/orochi-motivation.mp4 \
  --props='{"bgm":"audio/bgm.mp3","bgmVolume":0.75}'
```

ナレーションを録った場合も同じ要領で音声トラックを足せます
（`src/OrochiMotivation.tsx` の `<Audio>` の隣にもう1本 `<Audio>` を置くだけ）。

## 中身をいじるとき

- **テロップの文言** → `src/scenes/Scene*.tsx`。`text` を書き換えるだけ。
- **タイミング** → 同じく `src/scenes/Scene*.tsx`。`from` / `duration` は
  `s(秒)` のヘルパーで秒指定しています。`s(12.5)` なら12.5秒。
- **シーンの尺** → `src/OrochiMotivation.tsx` の `SCENES`。合計が
  そのまま動画の長さになります。
- **色・フォント** → `src/theme.ts`。白／黒／赤の3色だけで組んでいます。
- **実績値の差し替え** → `src/scenes/Scene3Numbers.tsx` の `KpiBoard` に
  `rate` / `count` を渡すと、実際の成約率・成約数でカウントアップします。

## フォント

`public/fonts/NotoSansJP-VF.woff2` に Noto Sans JP の可変フォント（SIL OFL 1.1）を
サブセットして置いています。常用漢字を含む U+4E00–9FFF をまるごと持っているので、
テロップの文言を書き換えても字が欠けることはありません。

CDNではなくローカルのファイルを読んでいるので、オフラインでも同じ絵が出ます。
`@remotion/fonts` の `loadFont()` ではなく素の `@font-face` を使っているのは、
ヘッドレスでのレンダー中にページが作り直されると `FontFace.load()` が
返ってこないことがあるためです（`src/theme.ts` の `FONT_FACE_CSS`）。

## 補足

- 書き出しは Remotion が Chrome を自前でダウンロードして行います。
  すでに Chrome がある環境で使い回したい場合は
  `--browser-executable=/path/to/chrome` を付けてください。
- `out/` は `.gitignore` 済みです。書き出したmp4はリポジトリに入りません。
