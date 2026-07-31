#!/usr/bin/env bash
# HyperFrames 動画制作の環境点検。
# 足りないものだけを報告する。壊れている項目があっても最後まで走り切る。

missing=0
note() { printf '  %s\n' "$1"; }
ok()   { printf '[OK]   %s: %s\n' "$1" "$2"; }
ng()   { printf '[NG]   %s: %s\n' "$1" "$2"; missing=$((missing+1)); }
warn() { printf '[WARN] %s: %s\n' "$1" "$2"; }

echo "=== HyperFrames 環境チェック ==="
echo

# --- Node.js 22+ ---
if command -v node >/dev/null 2>&1; then
  ver=$(node -v)
  major=$(printf '%s' "$ver" | sed 's/^v\([0-9]*\).*/\1/')
  if [ "$major" -ge 22 ] 2>/dev/null; then
    ok "Node.js" "$ver"
  else
    ng "Node.js" "$ver (22以上が必要)"
    note "https://nodejs.org からインストーラを取得、または nvm install 22"
  fi
else
  ng "Node.js" "未インストール (22以上が必要)"
  note "https://nodejs.org からインストーラを取得"
fi

# --- FFmpeg ---
if command -v ffmpeg >/dev/null 2>&1; then
  ok "FFmpeg" "$(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f1-3)"
else
  ng "FFmpeg" "未インストール"
  note "macOS: brew install ffmpeg / Windows: winget install ffmpeg / Debian: sudo apt-get install -y ffmpeg"
fi

# --- 日本語フォント（日本語動画では必須。無いと本文が豆腐□になる） ---
if command -v fc-list >/dev/null 2>&1; then
  ja=$(fc-list :lang=ja 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ja" -gt 0 ]; then
    ok "日本語フォント" "${ja}件"
  else
    ng "日本語フォント" "0件 — レンダーすると日本語が □ になる"
    note "Debian: sudo apt-get install -y fonts-noto-cjk fonts-noto-color-emoji"
    note "macOS : brew install --cask font-noto-sans-cjk-jp"
  fi
  emoji=$(fc-list 2>/dev/null | grep -ci 'emoji')
  [ "$emoji" -eq 0 ] && warn "絵文字フォント" "未検出 — 絵文字がモノクロ記号になる可能性"
elif [ "$(uname)" = "Darwin" ]; then
  warn "日本語フォント" "fc-list 無し。macOS はヒラギノ標準搭載のため通常は問題なし"
else
  warn "日本語フォント" "fc-list が無く確認不可。レンダー後に日本語表示を目視確認すること"
fi

# --- HyperFrames スキル ---
found=""
for d in .claude/skills skills .agents/skills; do
  [ -d "$d/hyperframes" ] && found="$d/hyperframes"
done
if [ -n "$found" ]; then
  n=$(find "$(dirname "$found")" -maxdepth 2 -name SKILL.md 2>/dev/null | wc -l | tr -d ' ')
  ok "HyperFrames スキル" "$found (SKILL.md ${n}件)"
else
  ng "HyperFrames スキル" "このディレクトリに未検出"
  note "npx skills add heygen-com/hyperframes --all --full-depth"
fi

# --- ブランド仕様ファイル（優先順位 frame.md > design.md > DESIGN.md） ---
spec=""
for f in frame.md design.md DESIGN.md; do
  [ -f "$f" ] && [ -z "$spec" ] && spec="$f"
done
if [ -n "$spec" ]; then
  ok "ブランド仕様" "$spec"
  [ "$spec" != "frame.md" ] && note "frame.md に拡張するとモーションまで統一できる（references/brand-frame.md）"
else
  warn "ブランド仕様" "frame.md / design.md / DESIGN.md いずれも無し"
  note "無くても動くが、出力はブランド非適用の汎用デザインになる"
  note "作り方: references/brand-frame.md"
fi

# --- プロジェクトの現在地 ---
if [ -f hyperframes.json ]; then
  ok "プロジェクト" "hyperframes.json あり（既存プロジェクト）"
  [ -f BRIEF.md ] && note "BRIEF.md あり — ルーティング済み。/hyperframes は再質問せず再開する"
else
  note "hyperframes.json 無し — 新規作成として扱われる"
fi

echo
if [ "$missing" -eq 0 ]; then
  echo "必須項目はすべて揃っている。/hyperframes に依頼文を渡して開始できる。"
else
  echo "NG が ${missing} 件。上記の手順で解消してから開始すること。"
fi
exit 0
