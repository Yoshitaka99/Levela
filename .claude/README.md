# .claude — 自律開発の中心設定

Claude Code で自律開発を回すための設定一式です。全体像は
[`docs/autonomous-dev-playbook.md`](../docs/autonomous-dev-playbook.md) を参照してください。

## 構成
```
.claude/
├── settings.json          権限・hooks・環境設定（現状は env のみ）
├── agents/                役割ごとのサブエージェント
│   ├── researcher.md      調査（読み取り専用）
│   ├── planner.md         設計
│   ├── implementer.md     実装
│   ├── tester.md          検証（lint/build/手動観点）
│   └── reviewer.md        差分レビュー（最終ゲート）
├── skills/                再利用手順
│   ├── deploy/SKILL.md     リリース前チェック・デプロイ
│   └── debug/SKILL.md      バグ切り分け
├── commands/              スラッシュコマンド
│   ├── kickoff.md         /kickoff … 司令塔の起動
│   └── review.md          /review … 差分レビュー
└── rules/                 開発方針
    ├── frontend.md
    └── backend.md
```

## 使い方
1. 最初の指示（司令塔プロンプト）で `/kickoff` を実行、または
   `docs/autonomous-dev-playbook.md` の「司令塔プロンプト集」をコピーして開始。
2. 司令塔がタスクを分解し、各サブエージェントへ割り振る。
3. 完了ごとに `docs/task-board.md` を更新し、次のタスクを投入し続ける。

## 推奨する権限設定（任意・手動で有効化）
`settings.json` の権限ルールは、エージェント自身による自動書き換えが
安全上ブロックされるため、ここに置いています。よく使うコマンドの
許可プロンプトを減らしたい場合、`settings.json` に下記を**ご自身で**追記してください。

```jsonc
{
  "permissions": {
    "allow": [
      "Bash(npm install)",
      "Bash(npm run lint)",
      "Bash(npm run build)",
      "Bash(npm run dev)",
      "Bash(npx tsc --noEmit)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.local)",
      "Bash(git push:*)"
    ]
  }
}
```

> 権限は環境やリスク許容度に応じて調整してください。`git push` を
> 自動許可しない運用を推奨します。
