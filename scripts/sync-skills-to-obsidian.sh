#!/usr/bin/env bash
# .claude/skills と .claude/agents を obsidian/Claude Skills/ にミラーする
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$repo_root/obsidian/Claude Skills"
mkdir -p "$dest"

for skill_dir in "$repo_root"/.claude/skills/*/; do
  name="$(basename "$skill_dir")"
  cp "$skill_dir/SKILL.md" "$dest/$name.md"
done

for agent_file in "$repo_root"/.claude/agents/*.md; do
  cp "$agent_file" "$dest/$(basename "$agent_file")"
done

echo "Synced skills and agents to $dest"
