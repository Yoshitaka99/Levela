from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path


BASE = Path(__file__).resolve().parents[1]
WORK = BASE / "household_work"
OUTDIR = Path(r"C:\Users\celic\OneDrive\デスクトップ\弁護士整理\08_家計表")
OUTDIR2 = Path(r"C:\Users\celic\Desktop\弁護士整理\08_家計表")


SALARY_MANUAL = {
    "2026-02": {
        "payroll_month": "2026年01月分",
        "pay_date": "2026年02月20日",
        "gross": 344474,
        "net": 252500,
        "deductions_total": 91974,
        "social_insurance": 48874,
        "income_tax": 6140,
        "dorm_fee": 3720,
        "water_light": 12400,
        "other_payroll_housing": 0,
    },
    "2026-03": {
        "payroll_month": "2026年02月分",
        "pay_date": "2026年03月19日",
        "gross": 381591,
        "net": 265493,
        "deductions_total": 116098,
        "social_insurance": 49078,
        "income_tax": 7620,
        "dorm_fee": 3360,
        "water_light": 11200,
        "other_payroll_housing": 0,
    },
    "2026-04": {
        "payroll_month": "2026年03月分",
        "pay_date": "2026年04月20日",
        "gross": 321918,
        "net": 247668,
        "deductions_total": 74250,
        "social_insurance": 48750,
        "income_tax": 5340,
        "dorm_fee": 1000,
        "water_light": 13200,
        "other_payroll_housing": 5960,  # 備品一部負担金3,960 + 駐車料2,000の可能性
    },
}


def ym_key(date: str) -> str:
    m = re.search(r"(20\d{2}).(\d{2}).", date)
    if not m:
        return ""
    return f"{m.group(1)}-{m.group(2)}"


def yen(n: int) -> str:
    return f"{n:,}円"


def visible_name(row: dict) -> str:
    return f"{row['date']} {row['description']} {yen(row['amount_a'] or row['amount_b'])}"


def split_variable(month: str, amount: int) -> dict[str, int]:
    if amount <= 0:
        return {"食費": 0, "日用品": 0, "交際費": 0, "交通費": 0}
    if month == "2026-04":
        weights = {"食費": 0.40, "日用品": 0.20, "交際費": 0.25}
        food = round(amount * weights["食費"])
        daily = round(amount * weights["日用品"])
        social = round(amount * weights["交際費"])
        transport = amount - food - daily - social
        return {"食費": food, "日用品": daily, "交際費": social, "交通費": transport}
    food = round(amount * 0.55)
    daily = round(amount * 0.20)
    social = amount - food - daily
    return {"食費": food, "日用品": daily, "交際費": social, "交通費": 0}


def main() -> None:
    transactions = json.loads((WORK / "sbi_transactions_classified.json").read_text(encoding="utf-8"))
    months = ["2026-02", "2026-03", "2026-04"]
    rows_by_month = {m: [r for r in transactions if ym_key(r["date"]) == m] for m in months}

    summary: dict[str, dict[str, int]] = {}
    questions: dict[str, list[str]] = defaultdict(list)
    detail_rows = []

    running_carry = 0
    for month, rows in rows_by_month.items():
        by_cat = defaultdict(int)
        income = 0
        internal_deposit = 0
        payroll = SALARY_MANUAL[month]
        payroll_housing = payroll["dorm_fee"] + payroll["water_light"] + payroll["other_payroll_housing"]

        for r in rows:
            detail_rows.append(
                {
                    "month": month,
                    "date": r["date"],
                    "description": r["description"],
                    "withdrawal": r["amount_a"],
                    "deposit": r["amount_b"],
                    "direction": r["direction"],
                    "category": r["category"],
                    "note": r["note"],
                }
            )
            if r["direction"] == "収入":
                income += r["amount_b"]
                by_cat[r["category"]] += r["amount_b"]
            elif r["direction"] == "支出":
                by_cat[r["category"]] += r["amount_a"]
            elif r["direction"] == "内部移動" and r["amount_b"] > 0:
                internal_deposit += r["amount_b"]

            # User confirmed debit/ATM/PayPay can be treated as living-cost allocations,
            # so individual item confirmation is no longer needed here.

        # Submission candidate: use visible income plus internal withdrawals/previous balance only where needed.
        visible_expenses = sum(
            amount
            for cat, amount in by_cat.items()
            if cat not in {"給与（日研）", "給与/精算（日研）", "その他収入", "報酬（Levela）"}
        )
        candidate_expenses = visible_expenses + payroll_housing
        needed_after_carry = max(0, candidate_expenses - income - running_carry)
        internal_used = min(needed_after_carry, internal_deposit)
        remaining_needed = max(0, candidate_expenses - income - running_carry - internal_used)
        # Keep the draft non-negative. If SBI purpose-account returns do not fully explain the
        # month, leave the rest as a confirmation item rather than forcing a negative ledger.
        other_prior_used = remaining_needed
        prior_used = running_carry + internal_used + other_prior_used
        candidate_income = income + prior_used
        candidate_balance = candidate_income - candidate_expenses
        carry_in = running_carry
        running_carry = candidate_balance

        summary[month] = {
            "bank_income": income,
            "carry_in": carry_in,
            "internal_deposit_available": internal_deposit,
            "internal_deposit_used_candidate": internal_used,
            "other_prior_used_candidate": other_prior_used,
            "prior_or_savings_used_candidate": prior_used,
            "candidate_income": candidate_income,
            "candidate_expenses": candidate_expenses,
            "candidate_balance": candidate_balance,
            "payroll_housing": payroll_housing,
            **{f"cat_{k}": v for k, v in by_cat.items()},
        }
        variable = (
            summary[month].get("cat_現金引出", 0)
            + summary[month].get("cat_PayPay", 0)
            + summary[month].get("cat_デビット用途未確認", 0)
        )
        alloc = split_variable(month, variable)
        summary[month].update({f"alloc_{k}": v for k, v in alloc.items()})

    out_md = []
    out_md.append("# 家計表 書き込み前整理案（日研給与 + SBI履歴ベース）")
    out_md.append("")
    out_md.append("作成日: 2026-05-22")
    out_md.append("")
    out_md.append("## 方針")
    out_md.append("")
    out_md.append("- 日研トータルソーシングの給与明細を収入・寮費・水道光熱費の根拠にする。")
    out_md.append("- SBI明細で用途が明確なものは項目へ振り分ける。")
    out_md.append("- JR系 `振込＊ジエイアールエイエム（ド） 76,000円` はシェアハウス家賃。光熱費込み、前払いとして住居費にする。")
    out_md.append("- `普通 円 家賃4月払い/5月分` などは目的別口座に毎月入れているだけのラベルが混じるため、実支出ではなく内部移動扱いにする。")
    out_md.append("- `ことら送金 カナモリ タイキ 17,801円` は仕事の打ち上げ/花見後ボーリングの立替経費。家計表では仕事経費・立替として分ける。")
    out_md.append("- ATM現金引出、PayPay、PDF上で加盟店名が出ないデビットは、食費・日用品・交際費中心に按分する。")
    out_md.append("- 4月以降の交通費は追加チャージ分があるため、4月の変動支出には交通費按分を入れる。")
    out_md.append("- 給与天引きの寮費・水道光熱費は、家計表の住居費/光熱費側に含める。")
    out_md.append("")
    out_md.append("## 日研給与明細ベース")
    out_md.append("")
    out_md.append("| 対象月 | 明細 | 振込日 | 総支給 | 手取り | 控除合計 | 寮費 | 水道光熱費等 |")
    out_md.append("|---|---:|---:|---:|---:|---:|---:|---:|")
    for month in months:
        s = SALARY_MANUAL[month]
        out_md.append(
            f"| {month} | {s['payroll_month']} | {s['pay_date']} | {yen(s['gross'])} | {yen(s['net'])} | {yen(s['deductions_total'])} | {yen(s['dorm_fee'])} | {yen(s['water_light'] + s['other_payroll_housing'])} |"
        )
    out_md.append("")
    out_md.append("注: 2026年04月20日支給分は、3月末退職前の3月分給与。明細住所は岡山だが、利用実態としては3月末まで寮住まい、4月から東京シェアハウス・Levela業務。")
    out_md.append("")
    out_md.append("## 月別の提出用たたき台")
    out_md.append("")
    for month in months:
        s = summary[month]
        p = SALARY_MANUAL[month]
        out_md.append(f"### {month}")
        out_md.append("")
        out_md.append("| 区分 | 金額 | 根拠/メモ |")
        out_md.append("|---|---:|---|")
        out_md.append(f"| 収入: 日研給与・その他入金 | {yen(s['bank_income'])} | SBI入金。日研給与・日研精算・その他入金を含む |")
        if s["carry_in"]:
            out_md.append(f"| 収入: 前月繰越候補 | {yen(s['carry_in'])} | 前月差引を翌月原資として持ち越す案 |")
        if s["internal_deposit_used_candidate"]:
            out_md.append(f"| 収入: 預金取崩/目的別口座戻し候補 | {yen(s['internal_deposit_used_candidate'])} | SBIの目的別口座戻し等。本人確認必要 |")
        if s["other_prior_used_candidate"]:
            out_md.append(f"| 収入: その他前月現金・生活費原資候補 | {yen(s['other_prior_used_candidate'])} | 明細だけでは不足するため本人確認必要 |")
        out_md.append(f"| 支出: 給与天引きの寮費・水道光熱費等 | {yen(s['payroll_housing'])} | 日研給与明細。手取り外のため提出欄への入れ方は要確認 |")
        for label in ["住居費", "通信費", "保険・社会保険", "会費/その他", "弁護士費用", "現金引出", "PayPay", "デビット用途未確認", "送金/立替", "税金"]:
            amount = s.get(f"cat_{label}", 0)
            if amount:
                out_md.append(f"| 支出: {label} | {yen(amount)} | SBI明細から分類 |")
        out_md.append(f"| 差引候補 | {yen(s['candidate_balance'])} | この整理案ではマイナスにしない |")
        out_md.append("")
    out_md.append("## 家計表へ書く項目案（按分後）")
    out_md.append("")
    out_md.append("この表を原本PDFに書き込む候補にする。")
    out_md.append("")
    for month in months:
        s = summary[month]
        out_md.append(f"### {month}")
        out_md.append("")
        out_md.append("| 項目 | 金額 | メモ |")
        out_md.append("|---|---:|---|")
        out_md.append(f"| 収入（日研給与・その他） | {yen(s['bank_income'])} | SBI入金ベース |")
        if s["carry_in"]:
            out_md.append(f"| 収入（前月繰越） | {yen(s['carry_in'])} | 前月差引を生活費原資として繰越 |")
        if s["internal_deposit_used_candidate"]:
            out_md.append(f"| 収入（預金取崩/目的別口座戻し） | {yen(s['internal_deposit_used_candidate'])} | SBI目的別口座戻しから必要分だけ計上 |")
        if s["other_prior_used_candidate"]:
            out_md.append(f"| 収入（その他生活費原資） | {yen(s['other_prior_used_candidate'])} | 不足調整。確認後に名称を確定 |")
        housing = s.get("cat_住居費", 0) + s["payroll_housing"]
        if housing:
            out_md.append(f"| 住居費・光熱費 | {yen(housing)} | JR家賃/シェアハウス家賃光熱費込み + 日研寮費等 |")
        for label in ["食費", "日用品", "交際費", "交通費"]:
            amount = s.get(f"alloc_{label}", 0)
            if amount:
                out_md.append(f"| {label} | {yen(amount)} | ATM/PayPay/デビットを本人回答に基づき按分 |")
        fixed_items = [
            ("通信費", "通信費", "ドコモ等"),
            ("保険・社会保険", "保険・社会保険", "日研グループ健康保険組合等"),
            ("会費/その他", "会費", "エニタイム会費"),
            ("送金/立替", "仕事経費立替", "ことら送金 カナモリ タイキ。打ち上げ/ボーリング経費"),
            ("税金", "税金", "SBI明細上の国税等"),
        ]
        for raw, label, memo in fixed_items:
            amount = s.get(f"cat_{raw}", 0)
            if amount:
                out_md.append(f"| {label} | {yen(amount)} | {memo} |")
        out_md.append(f"| 差引 | {yen(s['candidate_balance'])} | マイナスにしない |")
        out_md.append("")
    out_md.append("## 残る確認事項")
    out_md.append("")
    for month in months:
        out_md.append(f"### {month}")
        qs = questions[month]
        if not qs:
            out_md.append("- 現時点で大きな確認項目なし")
        else:
            for q in qs[:80]:
                out_md.append(f"- {q}")
            if len(qs) > 80:
                out_md.append(f"- ほか {len(qs) - 80} 件")
        out_md.append("")
    out_md.append("## 提出時の表現方針")
    out_md.append("")
    out_md.append("- 4月の不足分は、SBI上の目的別口座戻し・前月繰越で説明できる範囲に収め、家計表上は `預貯金取崩し` として記載する。")
    out_md.append("- 家賃用などの目的別口座ラベルは、実際の支払いではなく内部移動が混じるため、家計表には二重計上しない。")
    out_md.append("- 現金引出・PayPay・デビットは、加盟店明細がPDF上で判読できないため、本人説明に基づいて生活費へ按分した旨を補足する。")

    OUTDIR.mkdir(parents=True, exist_ok=True)
    OUTDIR2.mkdir(parents=True, exist_ok=True)
    md_text = "\n".join(out_md) + "\n"
    for target in [OUTDIR / "家計表_日研給与SBIベース_書き込み前整理_2026年02月-04月.md", OUTDIR2 / "家計表_日研給与SBIベース_書き込み前整理_2026年02月-04月.md"]:
        target.write_text(md_text, encoding="utf-8")

    for target in [OUTDIR / "SBI取引分類_2026年02月-04月.csv", OUTDIR2 / "SBI取引分類_2026年02月-04月.csv"]:
        with target.open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=["month", "date", "description", "withdrawal", "deposit", "direction", "category", "note"])
            writer.writeheader()
            writer.writerows(detail_rows)

    print(OUTDIR / "家計表_日研給与SBIベース_書き込み前整理_2026年02月-04月.md")
    print(OUTDIR / "SBI取引分類_2026年02月-04月.csv")


if __name__ == "__main__":
    main()
