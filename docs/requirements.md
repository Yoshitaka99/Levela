# 要求仕様（requirements）

サブエージェントは着手前にこのファイルを読み、「何を作るか」を理解してください。
新しい要求が決まったらここに追記し、完了したら `task-board.md` 側で消化します。

## プロダクトの目的
Levela は、営業・チーム運営を支援する社内向け Web アプリ群です。
主な利用者は社内メンバーで、日々の業務（営業ダッシュボード、チャットボット、
ロールプレイ、ライフプラン/リスクマップ等）を効率化します。

## 既存の主な機能（現状把握）
- `app/page.tsx` … トップ
- `app/chatbot/` … チャットボット（`app/lib/chatbot*` の知識ソースを参照）
- `app/chatbot-admin/`, `app/chatbot-knowledge/` … チャットボット管理・知識
- `app/team/`, `app/team-access/`, `app/team-sales-dashboard/` … チーム・営業ダッシュボード
- `app/seminar-dashboard/` … セミナーダッシュボード
- `app/roleplay/` … ロールプレイ
- `app/life-plan-risk-map/` … ライフプラン・リスクマップ
- `app/sale/` … セール
- PWA 対応（`public/manifest.json`, `public/sw.js`, `app/components/PwaHandler.tsx`）

## 機能要求（今後・テンプレート）
各要求は以下の形式で記述する:

### REQ-XXX: <タイトル>
- **背景 / 目的**:
- **ユーザーストーリー**: 〜として、〜したい。なぜなら〜。
- **受け入れ条件**:
  - [ ] …
- **対象範囲外（やらないこと）**:
- **優先度**: 高 / 中 / 低

> ここに具体的な要求を追記していく。未記入の場合、司令塔は
> `task-board.md` の未着手タスク、またはユーザーへの確認から要求を起こす。

## 非機能要求
- `npm run lint` / `npm run build` が常に通る状態を保つ。
- 既存機能を壊さない（リグレッション禁止）。
- モバイル/PWA で破綻しない。日本語 UI を基本とする。
- 秘密情報をコード・リポジトリに含めない。
