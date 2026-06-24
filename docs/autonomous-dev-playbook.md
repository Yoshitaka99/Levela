# 自律開発プレイブック — Claude Code で開発を回し続ける構造

「5時間レートを燃やし続けるために、何を置き、どう回すか」を Levela 用にまとめたものです。
サブエージェントを最大展開し、調査・設計・実装・テスト・レビューを並列で回します。

## 全体像
```
AUTONOMOUS DEV/
├── ① 司令塔プロンプト        → 最初の指示。仕事を分解し、担当に渡し、成果を回収し、次を投入
│     └ .claude/commands/kickoff.md（/kickoff）と下記「司令塔プロンプト集」
├── ② .claude/               → Claude Code の中心設定
│     ├ settings.json         権限・hooks・環境設定
│     ├ agents/               役割ごとのサブエージェント（researcher/planner/implementer/tester/reviewer）
│     ├ skills/               再利用手順（deploy / debug）
│     ├ commands/             スラッシュコマンド（kickoff / review）
│     └ rules/                開発方針（backend / frontend）
├── ③ CLAUDE.md              → プロジェクト前提・成功条件・命名規約（毎回読む土台）
└── ④ docs/                  → 仕様・設計・現在タスク
      ├ requirements.md       何を作るか
      ├ architecture.md       どう作るか
      └ task-board.md         今やること / 終わったこと
```

## 役割分担（サブエージェント）
| エージェント | 役割 | 書き込み |
| --- | --- | --- |
| researcher | コードベース・仕様を調査し事実を回収 | しない（読み取り専用） |
| planner | 実装計画・受け入れ条件を設計 | しない |
| implementer | 計画どおりに実装し lint/build を通す | する |
| tester | lint/build と手動観点で検証 | しない |
| reviewer | 差分レビューで最終ゲート | しない |

## 回し方（1タスクのループ）
1. **司令塔**がタスクを分解し、`task-board.md` で「進行中」に。
2. `researcher` に調査させ事実を回収。
3. `planner` に実装計画を作らせる。
4. `implementer` に実装させる（独立タスクは複数並列展開）。
5. `tester` に `lint` / `build` と手動観点で検証させる。
6. `reviewer` に差分レビューさせ合否判定。
7. 成果を回収し `task-board.md` を更新（完了へ）。
8. 次の未着手タスクを即投入し 1 へ戻る。

> 待ちが生じたら、別タスクの調査・設計を先行させてレートを遊ばせない。

## 司令塔プロンプト集（最初の指示の例）
そのままコピーして使えます。

1. 起動:
   > サブエージェントを最大展開して、`docs/task-board.md` の未着手タスクから自律開発を進めてください。各タスクは researcher → planner → implementer → tester → reviewer の流れで回し、完了ごとに task-board を更新してください。

2. 高負荷タスクの割り振り:
   > 高負荷の調査・設計・実装・テスト・レビューはサブエージェントに担当させ、あなたは司令塔として分解・回収・次タスク投入に専念してください。

3. 連続投入:
   > 1タスク完了ごとに次の未着手タスクを即投入し続けてください。タスクが尽きたら、要求から新しい候補を提案してください。

## 守ること
- 完了報告の前に必ず `npm run lint` と `npm run build` を通す。
- `git push` や本番反映はユーザーの明示的許可があるときのみ。
- 秘密情報（`.env*` / API キー）をコード・リポジトリに含めない。
- 成功条件は `CLAUDE.md` の Definition of Done に従う。
