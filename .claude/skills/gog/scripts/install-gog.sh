#!/usr/bin/env bash
# gog (Google Workspace CLI) をインストールする。
#
#   bash .claude/skills/gog/scripts/install-gog.sh
#
# 優先順:
#   1. すでに PATH にあれば何もしない
#   2. Homebrew (macOS / Linuxbrew)
#   3. go install (Go 1.21+ / GOTOOLCHAIN=auto で必要な Go を自動取得)
#
# 環境変数:
#   GOG_VERSION  インストールするバージョン (既定: latest)
#   GOBIN        go install の出力先 (既定: ~/go/bin)

set -euo pipefail

GOG_VERSION="${GOG_VERSION:-latest}"
MODULE="github.com/openclaw/gogcli/cmd/gog"

log() { printf '[install-gog] %s\n' "$*" >&2; }

if command -v gog >/dev/null 2>&1; then
  log "gog はインストール済み: $(gog --version 2>&1 | head -1) ($(command -v gog))"
  exit 0
fi

if command -v brew >/dev/null 2>&1; then
  log "Homebrew でインストールします"
  brew install openclaw/tap/gogcli
elif command -v go >/dev/null 2>&1; then
  export GOBIN="${GOBIN:-$(go env GOPATH)/bin}"
  log "go install でインストールします (GOBIN=$GOBIN)"
  # gogcli の go.mod は新しい Go を要求するため、toolchain 自動取得を有効にする
  GOTOOLCHAIN=auto go install "${MODULE}@${GOG_VERSION}"
  case ":$PATH:" in
    *":$GOBIN:"*) ;;
    *) log "注意: $GOBIN が PATH にありません。次を shell 設定に追加してください: export PATH=\"\$PATH:$GOBIN\"" ;;
  esac
  export PATH="$PATH:$GOBIN"
else
  log "エラー: brew も go も見つかりません。"
  log "  macOS  : brew install openclaw/tap/gogcli"
  log "  それ以外: Go 1.21+ を入れて再実行、または https://github.com/openclaw/gogcli/releases からバイナリを取得"
  exit 1
fi

if ! command -v gog >/dev/null 2>&1; then
  log "エラー: インストール後も gog が PATH にありません"
  exit 1
fi

log "インストール完了: $(gog --version 2>&1 | head -1)"
log "次は OAuth 設定です → .claude/skills/gog/references/setup-oauth.md"
