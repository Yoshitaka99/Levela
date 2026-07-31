# 環境構築とトラブル対処

## 必要なもの

| 項目 | 条件 | 確認 |
| --- | --- | --- |
| Node.js | 22 以上 | `node -v` |
| FFmpeg | インストール済み | `ffmpeg -version` |
| HyperFrames スキル | プロジェクトに導入済み | `ls .claude/skills` または `npx hyperframes --version` |
| 日本語フォント | OS にインストール済み | 後述 |

どちらも無料。Git LFS はリポジトリ本体を開発する場合のみで、動画を作るだけなら不要。

## インストール

```bash
# macOS
brew install ffmpeg

# Windows
winget install ffmpeg

# Debian / Ubuntu
sudo apt-get install -y ffmpeg
```

Node.js は公式サイトのインストーラが最も確実。バージョン管理をしているなら `nvm install 22`。

環境構築で止まりそうなら、エージェントに丸ごと投げてよい：

```
この環境に Node.js 22 以上と FFmpeg をセットアップして。
終わったら動作確認までやって。
```

エラーが出たらエラー文をそのまま貼り返す。道具の使い方を覚えるより、道具に詳しい相棒への頼み方を覚える方が速い。

## HyperFrames スキルの導入

動画用のフォルダを作り、その中で実行する：

```bash
npx skills add heygen-com/hyperframes --all --full-depth
```

- `--all` … 全スキルを入れる（迷ったらこれ。後から選び直す手間が消える）
- `--full-depth` … リポジトリ最新版から取得。付けないと数時間古いコピーが入ることがある

導入後にエージェントを開き直すと `/hyperframes` 以下のコマンドが使えるようになる。Claude Code / Codex / Cursor / Gemini CLI など、スキル対応のエージェントであれば同じスキル群がそのまま動く。特定ツールへの依存ではない。

個別ワークフローの更新：

```bash
npx hyperframes skills update <workflow-name>   # 例: faceless-explainer（先頭の / は付けない）
```

## 日本語フォント — ここが最頻出の事故

レンダリングはヘッドレス Chrome が行う。**OS にフォントが無ければ、画面上の日本語はすべて豆腐（□□□）になる。** しかもプレビュー環境と本番レンダー環境が違うと、プレビューでは正常に見えて書き出しだけ壊れることがある。

確認：

```bash
fc-list :lang=ja | head        # Linux / macOS(fontconfig導入時)
```

何も出ない場合の導入：

```bash
# Debian / Ubuntu
sudo apt-get install -y fonts-noto-cjk fonts-noto-color-emoji

# macOS — ヒラギノが標準搭載。Noto を足すなら
brew install --cask font-noto-sans-cjk-jp
```

`frame.md` の font-family には**必ずフォールバックを書く**。1 つ目が無くても崩れないようにするため：

```css
font-family: "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
```

絵文字を使うならカラー絵文字フォントも要る（`fonts-noto-color-emoji`）。無いとモノクロの記号になる。

## 動作確認 — 最初の 1 本

```
/hyperframes を使って、10秒のプロダクト紹介動画を作ってください。
黒背景にタイトルがフェードインして、控えめなBGMが流れる構成で。
サイズは1920x1080でお願いします。
```

```bash
npx hyperframes preview   # ブラウザで確認（保存すると即反映）
npx hyperframes render    # MP4 書き出し
```

初回レンダーはブラウザ部品のダウンロードが走るので時間がかかる。2 回目以降は速い。

## 主なコマンド

| コマンド | 用途 |
| --- | --- |
| `npx hyperframes init <name>` | プロジェクト雛形の作成 |
| `npx hyperframes preview` | ライブリロード付きプレビュー |
| `npx hyperframes lint` / `check` | 構成の検証 |
| `npx hyperframes snapshot` | フレームを静止画で書き出し（目視 QA 用） |
| `npx hyperframes render` | MP4 書き出し |
| `npx hyperframes doctor` | 環境診断 |
| `npx hyperframes publish` | 公開 |

## つまずいたら

| 症状 | 対処 |
| --- | --- |
| 日本語が □ になる | 日本語フォント未導入。上記を実行してから再レンダー |
| レンダーだけ表示が違う | プレビューと本番でフォント環境が違う。`snapshot` で本番経路の絵を確認する |
| 色が指定と違う | `frame.md` が読まれていない。ファイル名（`frame.md` 小文字推奨）と置き場所を確認 |
| プロジェクトが古い版で動いている | `npx hyperframes@latest upgrade --project . --check` で確認し、適用後 `npx hyperframes check` で検証 |
| 原因が分からない | `npx hyperframes doctor`。それでもダメならエラー全文をエージェントに貼る |

古いピン留めを上げた場合、`check` が通るのは「構成が新版でも通る」ことの確認であって「レンダー結果がフレーム単位で同一」の保証ではない。バージョンを上げたら、上げた事実を作業サマリに明記する。
