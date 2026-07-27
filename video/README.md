# オロチーム モチベーション動画（Remotion）

台本 `docs/orochi-motivation-video-script.md` を [Remotion](https://remotion.dev) で動画にしたものです。
実写の映像・劇伴・日本語ナレーションが入っています。

## コンポジション

| ID | 尺 | 解像度 | 用途 |
|---|---|---|---|
| `OrochiMotivation` | 3:11 | 1920x1080 | 本編。朝礼・月初キックオフ |
| `OrochiMotivationShort` | 1:00 | 1920x1080 | ショート版。Slack共有 |
| `OrochiMotivationVertical` | 1:00 | 1080x1920 | 縦型。スマホ／ストーリーズ |

## セットアップ

素材（映像・音楽・ナレーション音声）はリポジトリに入れていません。クローン後に取得します。

```bash
cd video
npm install
python3 scripts/fetch_assets.py     # 映像・BGM を Mixkit から取得（約230MB）
pip install edge-tts                # ナレーション生成に必要
python3 scripts/build_narration.py  # ナレーション音声を生成

npm run studio                      # プレビュー
npm run render:all                  # 3本まとめて書き出し
```

個別に書き出す場合は `npm run render` / `render:short` / `render:vertical`。

## 素材とライセンス

| 種類 | 出どころ | ライセンス |
|---|---|---|
| 映像 17本 | [Mixkit](https://mixkit.co/free-stock-video/) | Mixkit Free License（商用可・クレジット不要・素材の再配布は不可） |
| BGM 2曲 | [Mixkit](https://mixkit.co/free-stock-music/) | 同上 |
| フォント | Noto Sans JP | SIL Open Font License 1.1 |
| ナレーション | Microsoft Edge の読み上げ音声（`ja-JP-KeitaNeural`）をピッチを下げて使用 | **下記の注意を参照** |

### ナレーションについて

`edge-tts` は Edge の読み上げ機能のエンドポイントを叩くツールで、
社外公開する動画の音声として使うことは Microsoft の利用規約上グレーです。
**社内向けの仮ナレーションと考えて、公開するなら人の声で録り直してください。**

録り直しは差し替えるだけです。`public/narration/<シーン>/<id>.mp3` を
同じファイル名で上書きし、長さが変わったら `src/narration.json` の
`durSec` を実測値に直します（`fromSec` も動かした場合は
`python3 scripts/build_narration.py` が重なりを検出してくれます）。

読ませる原稿は `src/narration.json` の `text` がそのまま台本です。

## 中身をいじるとき

- **セリフ・字幕** → `src/narration.json`。ここが音声と字幕の唯一の正。
  書き換えたら `python3 scripts/build_narration.py` を実行する。
  `subtitle: false` の行は大きいテロップとして別に出ているので字幕を出さない。
- **テロップの文言・タイミング** → `src/scenes/Scene*.tsx`。
  `from` / `duration` は `s(秒)` ヘルパーで秒指定。
- **使う映像の差し替え** → `scripts/fetch_assets.py` の `FOOTAGE` に
  Mixkit の動画IDを足して取得し、`src/scenes/Scene*.tsx` の `FootageTrack` で指すだけ。
  素材の明るさは `grade: { mono, brightness, contrast }` で調整する。
- **BGMの盛り上がり方** → `src/OrochiMotivation.tsx` の `BGM_PLAN`。
  `[秒, 音量]` のキーポイントを並べたカーブなので、ここを触ると
  「どこからテンションを上げるか」が変わる。
- **シーンの尺** → 各 `Scene*.tsx` が `SCENE?_DURATION` を持っていて、
  `src/OrochiMotivation.tsx` の `SCENES` がそれを合計して全体の長さになる。
- **実績値の差し替え** → `src/scenes/Scene3Numbers.tsx` の `KpiBoard` に
  `rate` / `count` を渡すと、実際の成約率・成約数でカウントアップする。
- **色・フォント** → `src/theme.ts`。白／黒／赤の3色だけで組んでいる。

## 構成

```
src/
  Root.tsx                コンポジションの定義
  OrochiMotivation.tsx    本編。シーンの並びとBGMプラン
  OrochiMotivationShort.tsx  ショート版（縦型と共用）
  narration.json          セリフ・タイミング（音声と字幕の元データ）
  narration.tsx           narration.json を音声と字幕に展開する
  theme.ts                色・フォント・解像度スケール
  scenes/Scene1〜6        台本のブロック①〜⑥に1対1で対応
  components/
    Footage.tsx           実写レイヤー（グレード・ゆっくりズーム・つなぎ）
    Telop.tsx             テロップ／畳みかけ／字幕
    Bgm.tsx               音量カーブ付きのBGM
    Kpi.tsx               成約率・成約数のカウントアップ
    Atmosphere.tsx        グレイン・ヴィネット・フラッシュ・暗転
    EndCard.tsx           ラストのロゴ
scripts/
  fetch_assets.py         映像・BGMの取得
  build_narration.py      ナレーション音声の生成
```

## フォント

`public/fonts/NotoSansJP-VF.woff2` に Noto Sans JP の可変フォントをサブセットして置いています。
常用漢字を含む U+4E00–9FFF をまるごと持っているので、文言を書き換えても字が欠けません。

`@remotion/fonts` の `loadFont()` ではなく素の `@font-face` を使っているのは、
ヘッドレスでのレンダー中にページが作り直されると `FontFace.load()` が
返ってこないことがあるためです（`src/theme.ts` の `FONT_FACE_CSS`）。

## 補足

- 書き出しは Remotion が Chrome を自前でダウンロードして行います。
  既存の Chrome を使い回すなら `--browser-executable=/path/to/chrome`。
- `out/` と素材ディレクトリ（`public/footage`, `public/music`, `public/narration`）は
  `.gitignore` 済みです。
