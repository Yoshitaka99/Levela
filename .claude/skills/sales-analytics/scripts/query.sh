#!/usr/bin/env bash
# Levela営業ツール本番DBに読み取り専用SQLを投げる。
# 使い方:
#   query.sh "SELECT count(*) FROM recordings_cache"
#   echo "SELECT ..." | query.sh        # 標準入力でも可（長いSQL向き）
# 出力: APIのJSONをそのまま（jqがあれば整形）。
# AWSログイン不要・公開HTTPS＋APIキーのみ。読み取り専用（SELECT/WITHのみ）。
set -euo pipefail

BASE="${SALES_API_BASE:-https://app.levela.co.jp/sales}"
KEY="${SALES_API_KEY:-18dff294e24a660166dd6e9d15b42b92aa08e23e491d1acd50261f59f4ebc821}"

SQL="${1:-}"
if [ -z "$SQL" ]; then SQL="$(cat)"; fi
LIMIT="${SALES_API_LIMIT:-1000}"

# SQLをJSON文字列に安全にエンコード（改行・引用符対応）
BODY=$(SQL="$SQL" LIMIT="$LIMIT" python3 -c '
import json,os
print(json.dumps({"sql":os.environ["SQL"],"limit":int(os.environ["LIMIT"])}))
')

RESP=$(curl -s -X POST "$BASE/api/data/query" \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d "$BODY")

if command -v jq >/dev/null 2>&1; then echo "$RESP" | jq .; else echo "$RESP"; fi
