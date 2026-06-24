# アーキテクチャ（architecture）

サブエージェントは着手前にこのファイルを読み、「どう作られているか」を理解してください。

## 技術スタック
| レイヤ | 採用技術 |
| --- | --- |
| フレームワーク | Next.js 16（App Router） |
| UI | React 19 / TypeScript / Tailwind CSS v4 / shadcn/ui |
| AI | Vercel AI SDK（`ai`, `@ai-sdk/openai`, `@ai-sdk/react`）, `openai` |
| Markdown/描画 | `streamdown`, `@streamdown/*`（CJK, code, math, mermaid） |
| バリデーション | `zod` |
| 外部連携 | Google Apps Script（`apps-script/`）, Discord（`discord-interactions`） |
| デプロイ | Vercel 想定 |

## ディレクトリ構成
```
app/                  App Router（ページ・API・Client 部品）
  lib/                チャットボット知識ソース等の共有ロジック
  components/         アプリ固有コンポーネント（PwaHandler 等）
  <route>/page.tsx    各ページ
  <route>/XxxClient.tsx  クライアント側 UI
components/
  ui/                 shadcn/ui プリミティブ
  ai-elements/        チャット UI 部品
lib/                  汎用ユーティリティ（cn 等）
public/               静的ファイル・PWA（manifest, sw.js）
apps-script/          Google Apps Script（ダッシュボード連携 API）
tools/                自動化・収集スクリプト
scripts/              データ整形などの単発スクリプト
data/                 生成データ（OCR 結果など）
docs/                 仕様・設計・各種メモ
.claude/              自律開発設定（agents/skills/commands/rules）
```

## 設計上の原則
- **Server / Client 分離**: データ取得・秘密情報はサーバ側。状態を持つ UI は `"use client"`。
- **知識ソースの一元化**: チャットボットの知識は `app/lib/chatbot*` に集約。
- **UI の再利用**: 新規 UI は `components/ui/`（shadcn/ui）を優先利用。
- **外部連携の境界**: Apps Script / Discord / AI 呼び出しはサーバ側に閉じる。

## 既知の制約・注意
- 自動テスト基盤は未整備。品質保証は `lint` / `build` + 手動確認が中心。
- `.env*` はコミットしない。本番 env は Vercel 側で管理。
- セットアップ系の詳細は `docs/*-setup.md`（apps-script / automation-trigger 等）を参照。

## ADR（設計判断の記録・テンプレート）
重要な設計判断はここに追記する:
```
### ADR-XXX: <決定事項>
- 背景 / 選択肢 / 決定 / 理由 / 影響
```
