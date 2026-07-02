# Claude Skills(Obsidian ミラー)

このフォルダは Obsidian で閲覧・編集するための Claude Code skills / agents のミラーです。

- **実体(Claude Code が読み込む場所)**: `.claude/skills/` と `.claude/agents/`
- このフォルダを編集した場合は、`.claude/` 側にも同じ内容を反映すること(`scripts/sync-skills-to-obsidian.sh` で `.claude/` → `obsidian/` の同期が可能)。

## 一覧

| ノート | 種別 | 役割 |
|--------|------|------|
| [[model-routing]] | skill | Fable 5 = 指示監査役、実行 = Opus 4.8 のモデル役割分担 |
| [[browser-ops]] | skill | ブラウザ操作は Kimi webbridge を優先使用 |
| [[opus-executor]] | agent | 実行役サブエージェント(Opus 4.8) |
| [[fable-auditor]] | agent | 指示監査役サブエージェント(Fable 5) |
