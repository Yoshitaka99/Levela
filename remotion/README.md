# Remotion — 動的テロップ動画

縦動画に「勝ちに行く / キモチ / キモチ！！」の動的テロップと、気合いの入る BGM を
のせて書き出す Remotion プロジェクトです。Next.js アプリ本体とは独立していて、
`remotion/` 配下に自前の `package.json` / `tsconfig.json` を持っています。

コンポジション: **HypeTelop** — 1080×1920 / 30fps / 216 フレーム（7.2秒）

## つかい方

```bash
cd remotion
npm install

npm run studio   # プレビュー（BGM を生成してから Remotion Studio を起動）
npm run render   # out/hype-telop.mp4 に書き出し
```

Remotion 同梱の Chrome をダウンロードできない環境では、既存の Chromium を指定できます。

```bash
REMOTION_BROWSER=/path/to/chrome npm run render
```

## 素材の作り方

| コマンド | 生成物 | 補足 |
| --- | --- | --- |
| `npm run bgm` | `public/audio/hype-bgm.wav` | 150BPM の BGM をゼロから合成。`studio` / `render` が自動実行 |
| `npm run source` | `public/media/source-h264.mp4` | 元動画を H.264 / SDR / 縦 1080×1920 に正規化 |
| `npm run fonts` | `src/generated/telop-font.json` | Noto Sans JP Black の必要サブセットのみ取得（要ネットワーク） |

- **BGM** は `scripts/make-bgm.mjs` が生成します。キック / スネア / ハイハット、
  サチュレーションをかけたベースとパワーコード、リード、ライザー、インパクト音を
  Em → C → G → D の進行で組み立てています。乱数はシード固定なので毎回同じ結果です。
- **元動画** は iPhone の Dolby Vision HEVC 10bit（回転メタデータ付き）でした。
  そのままだと描画時のデコードが重くコンポジターが落ちるため、
  `npm run source` で回転を焼き込んだ H.264 / SDR に変換して使います。
  リポジトリには変換後の mp4 のみコミットしています（元の `.mov` は gitignore）。
- **フォント** は Noto Sans JP Weight 900。テロップに使う文字を含む woff2 サブセット
  だけを base64 で `src/generated/telop-font.json` に埋め込んでいます。
  `public/` から配信すると描画タブでフォント取得が止まり `delayRender()` が
  タイムアウトすることがあるため、バンドルに同梱する方式にしています。

## 構成

```
src/
  Root.tsx              コンポジション登録
  HypeTelop.tsx         本体（映像・エフェクト・テロップ・音声の合成）
  timing.ts             BPM グリッドとテロップの打点（150BPM = 1拍12フレーム）
  theme.ts              配色・グラデーション・縁取り
  fonts.ts              テロップ用フォントの読み込み
  components/
    ImpactText.tsx      1文字ずつ飛び込むテロップ行
    Badge.tsx           上部の「気合い」スタンプ
    Effects.tsx         フラッシュ / 集中線 / 衝撃波 / 火花 / ビネット
```

映像・エフェクト・テロップの動きはすべて `timing.ts` の拍グリッドに合わせてあるので、
文言やテンポを変えるときはまず `LINES` と `HITS` を編集してください。

## テロップ文言を変える

1. `src/timing.ts` の `LINES` を書き換える（`at` は打点フレーム）。
2. 新しい文字を使う場合は `scripts/fetch-fonts.mjs` の `GLYPHS` に足して
   `npm run fonts` を再実行する（フォントサブセットに文字がないと表示されません）。
3. `npm run render`。
