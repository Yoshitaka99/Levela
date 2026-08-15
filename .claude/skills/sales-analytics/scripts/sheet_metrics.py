#!/usr/bin/env python3
"""顧客管理シートから「既存分析ツールと同一定義」で着座率/成約率を集計する。

なぜシートを使うか:
  DBの recordings_cache は「商談録画があるアポ」しか持たず、着座を取りこぼす
  （6月の広告で DB着座133 vs シート着座204）。着座率/成約率の母数はシートが正本。
  → 数値（着座率・成約率・着座数・成約数・失注数）は必ずこのスクリプト＝シート基準で出す。
  DBの recordings_cache / analysis_results は「失注要因の中身（文字起こし・AI分析）」専用。

定義は backend/api/assignee_dashboard.py に準拠（このスキルの references/sheet.md 参照）。
  着座率      = 着座 ÷ 消化済み（消化済み = G列が EXCLUDE_FROM_COMPLETED 以外）
  成約率(着金) = 着金成約(CLOSED_PAID) ÷ 着座
  成約率(見込) = (着金成約 + 成約予定) ÷ 着座

認証: gog。meeting@levela.co.jp は read 可（taichi トークンは invalid_grant になりがち）。
  GOG_ACCOUNT で上書き可。

使い方:
  sheet_metrics.py --month 2026-06 --source ad             # 6月・広告流入(Fに'ad'含む)
  sheet_metrics.py --month 2026-06 --not-source ad         # 6月・非広告(空/'-'除く)
  sheet_metrics.py --month 2026-06 --source ad --by-source    # 流入元別の内訳
  sheet_metrics.py --month 2026-06 --source ad --by-assignee  # 担当者別の内訳
  sheet_metrics.py --month 2026-06 --source ad --assignee 田仲由敬
  sheet_metrics.py --month 2026-06 --source ad --ids       # 該当行の管理ID/Lステ顧客IDを出力
                                                           #   → DB側(transcript/AI分析)の要因分析へ橋渡し
"""
import argparse
import json
import os
import subprocess
import sys

SHEET_ID = "1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s"
WORKSHEET = "顧客管理"
RANGE = f"{WORKSHEET}!B3:Y16507"  # B3起点。ヘッダーは行2、データは行3〜。A列(お客様名/PII)は取得しない

# B3起点の列インデックス（B=index0, X=22, Y=23）
COL = {
    "assignee": 0,    # B 担当者名
    "seminar": 1,     # C セミナー
    "route": 2,       # D 流入経路
    "date": 3,        # E 面談日   例: "2026年6月26日(金) 13:00～14:30"
    "source": 4,      # F 流入     例: meta_ad / x_ad-aw / yuna ...
    "seat": 5,        # G 着席ステータス
    "result": 6,      # H 結果ステータス
    "manage_id": 22,  # X 管理ID
    "lstep_id": 23,   # Y Lステ顧客ID
}

# --- ツール準拠の判定集合（backend/api/assignee_dashboard.py と一致させること） ---
EXCLUDE_FROM_COMPLETED = {"", "重複予約", "直後キャンセル", "リスケ/再日程調整中", "担当者変更", "日程調整→返信なし"}
CLOSED_PAID = {"成約", "予定→成約", "保留→成約", "ライフティ否決→成約"}
CLOSED_PENDING = {"成約予定（契あり）", "成約予定（ライフティ）"}
PENDING_TO_LOST = {"成約予定→失注", "ライフティ否決→失注"}
HOLD_TO_LOST = {"保留→失注"}
LOST = {"失注", "MLM失注"}


def fetch_rows():
    account = os.environ.get("GOG_ACCOUNT", "meeting@levela.co.jp")
    cmd = ["gog", "sheets", "get", SHEET_ID, RANGE, "--json", "--account", account]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"gog エラー: {out.stderr.strip()[:500]}\n"
                 f"（GOG_ACCOUNT を変えて再試行。taichi は invalid_grant になりがち）")
    return json.loads(out.stdout).get("values", [])


def cell(row, key):
    i = COL[key]
    return row[i].strip() if len(row) > i and row[i] else ""


def month_substr(month):  # "2026-06" -> "2026年6月"
    y, m = month.split("-")
    return f"{int(y)}年{int(m)}月"


def filter_rows(rows, args):
    sub = month_substr(args.month) if args.month else None
    out = []
    for r in rows:
        if not cell(r, "assignee"):
            continue
        if sub and sub not in cell(r, "date"):
            continue
        src = cell(r, "source")
        if args.source and args.source.lower() not in src.lower():
            continue
        if args.not_source:
            if args.not_source.lower() in src.lower() or src in ("", "-"):
                continue
        if args.assignee and cell(r, "assignee") != args.assignee:
            continue
        out.append(r)
    return out


def calc_stats(rows):
    seat = [r for r in rows if cell(r, "seat") == "着座"]
    completed = [r for r in rows if cell(r, "seat") not in EXCLUDE_FROM_COMPLETED]
    paid = [r for r in rows if cell(r, "result") in CLOSED_PAID]
    pending = [r for r in rows if cell(r, "result") in CLOSED_PENDING]
    lost = [r for r in rows if cell(r, "result") in LOST]
    hold_lost = [r for r in rows if cell(r, "result") in HOLD_TO_LOST]
    pend_lost = [r for r in rows if cell(r, "result") in PENDING_TO_LOST]
    nseat, ncomp = len(seat), len(completed)

    def pct(a, b):
        return round(a / b * 100, 1) if b else 0.0

    return {
        "rows": len(rows),
        "completed": ncomp,
        "seated": nseat,
        "seated_rate": pct(nseat, ncomp),
        "closed_paid": len(paid),
        "closed_rate": pct(len(paid), nseat),
        "closed_pending": len(pending),
        "closed_with_pending_rate": pct(len(paid) + len(pending), nseat),
        "lost": len(lost),
        "hold_to_lost": len(hold_lost),
        "pending_to_lost": len(pend_lost),
        "lost_total": len(lost) + len(hold_lost) + len(pend_lost),
    }


def group_stats(rows, keyname, min_seat=3):
    groups = {}
    for r in rows:
        groups.setdefault(cell(r, keyname), []).append(r)
    res = {}
    for k, rs in sorted(groups.items(), key=lambda x: -len(x[1])):
        s = calc_stats(rs)
        if s["seated"] >= min_seat:
            res[k or "(空)"] = s
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", help="YYYY-MM（面談日E列で絞る）")
    ap.add_argument("--source", help="流入(F列)にこの文字を含む。広告なら 'ad'")
    ap.add_argument("--not-source", dest="not_source", help="流入(F列)にこの文字を含まない（空/'-'も除外）")
    ap.add_argument("--assignee", help="担当者名で完全一致フィルタ")
    ap.add_argument("--by-source", action="store_true")
    ap.add_argument("--by-assignee", action="store_true")
    ap.add_argument("--ids", action="store_true", help="該当行の管理ID/Lステ顧客IDを列挙（DB側の要因分析へ橋渡し）")
    args = ap.parse_args()

    rows = fetch_rows()
    sel = filter_rows(rows, args)

    label = f"month={args.month or '全期間'} source~={args.source or '-'} not~={args.not_source or '-'} assignee={args.assignee or '-'}"
    print(f"# {label}  （定義はツール準拠 / 数値はシート＝顧客管理 が正本）", file=sys.stderr)

    if args.ids:
        for r in sel:
            print("\t".join([cell(r, "manage_id"), cell(r, "lstep_id"), cell(r, "assignee"),
                             cell(r, "source"), cell(r, "seat"), cell(r, "result")]))
    elif args.by_source:
        print(json.dumps(group_stats(sel, "source"), ensure_ascii=False, indent=2))
    elif args.by_assignee:
        print(json.dumps(group_stats(sel, "assignee"), ensure_ascii=False, indent=2))
    else:
        print(json.dumps(calc_stats(sel), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
