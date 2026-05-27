from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader


BASE = Path(__file__).resolve().parents[1]
WORK = BASE / "work_pdf_ascii"
OUT = BASE / "household_work"


def normalize_digits(text: str) -> str:
    table = str.maketrans("０１２３４５６７８９", "0123456789")
    return text.translate(table)


def pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


ENTRY_RE = re.compile(
    r"(デビット\s+[0-9]+|ＡＴＭ\s+[^\d]+?|普通\s+円\s+.*?|給与＊.*?|振込＊.*?|フリカエ\s+ＰＡＹＰＡＹ|口座振替\s+.*?|ことら送金\s+.*?|国税|利息|ポイント利用|取消＊?[^0-9]*?)"
    r"\s+([0-9,]+)\s+([0-9,]+)\s+([0-9,]+)"
)
DATE_RE = re.compile(r"20[0-9]{2}年[0-9]{2}月[0-9]{2}日")


def parse_sbi(path: Path) -> list[dict]:
    text = normalize_digits(pdf_text(path))
    entries: list[dict] = []
    # Process each printed page separately so entries align with the date block on that page.
    chunks = re.split(r"取引明細書", text)
    for chunk in chunks:
        if "代表口座普通預金" not in chunk:
            continue
        dates = DATE_RE.findall(chunk)
        # Remove the date tail from the entry area. The entry block appears before the date list.
        first_date_pos = min((chunk.find(d) for d in dates), default=-1)
        entry_area = chunk[:first_date_pos] if first_date_pos >= 0 else chunk
        matches = list(ENTRY_RE.finditer(entry_area))
        for i, m in enumerate(matches):
            desc = " ".join(m.group(1).split())
            amount_a = int(m.group(2).replace(",", ""))
            amount_b = int(m.group(3).replace(",", ""))
            balance = int(m.group(4).replace(",", ""))
            entries.append(
                {
                    "source_file": path.name,
                    "date": dates[i] if i < len(dates) else "",
                    "description": desc,
                    "amount_a": amount_a,
                    "amount_b": amount_b,
                    "balance": balance,
                    "needs_date_check": i >= len(dates),
                }
            )
    return entries


def classify(entry: dict) -> tuple[str, str, str]:
    desc = entry["description"]
    a = entry["amount_a"]
    b = entry["amount_b"]
    # In these SBI PDFs, amount_a is generally withdrawal and amount_b is deposit.
    if "給与＊ニツケン" in desc:
        return "収入", "給与（日研）", "日研給与の入金"
    if "振込＊ニツケントータルソーシング" in desc:
        return "収入", "給与/精算（日研）", "日研からの追加入金。給与前払・精算の可能性"
    if "振込＊カ）ビイ" in desc:
        return "収入", "その他収入", "ビイ・フォアード関連入金"
    if "振込＊カ）レベラ" in desc:
        return "収入", "報酬（Levela）", "Levela報酬入金"
    if "ジエイアールエイエム" in desc:
        return "支出", "住居費", "家賃・住居関係の振込候補。名称と金額から要確認"
    if "ドコモ" in desc:
        return "支出", "通信費", "ドコモ携帯"
    if "エニタイム" in desc:
        return "支出", "会費/その他", "エニタイム会費"
    if "ニツケングループケンコウホケン" in desc:
        return "支出", "保険・社会保険", "日研グループ健康保険組合への支払い"
    if "ベン）アマタホウリツ" in desc:
        return "支出", "弁護士費用", "あまた法律事務所"
    if "ことら送金" in desc:
        return "支出", "送金/立替", "個人宛送金。用途確認"
    if "ＡＴＭ" in desc:
        return "支出", "現金引出", "現金払い用途の確認が必要"
    if "ＰＡＹＰＡＹ" in desc:
        return "支出", "PayPay", "PayPay残高チャージ/振替。PayPay明細で内訳確認"
    if "家賃" in desc:
        return "内部移動", "住居費用の目的別口座", "家賃ラベルの目的別口座移動。実支出はJR等の振込行で計上"
    if "弁護費用" in desc:
        return "内部移動", "弁護士費用用口座", "目的別口座の移動。実支出は振込行で計上"
    if "貯金" in desc or "雑費" in desc or "支払いｃ" in desc or "移動費携帯代" in desc or "税金用" in desc:
        return "内部移動", "目的別口座", "目的別口座間の振替。家計表では原則二重計上しない"
    if "国税" in desc:
        return "支出", "税金", "国税"
    if "利息" in desc or "ポイント利用" in desc or "取消" in desc:
        return "調整", "利息/ポイント/取消", "少額調整"
    if desc.startswith("デビット"):
        return "支出", "デビット用途未確認", "加盟店名がPDF上で見えないため用途確認"
    return "要確認", "要確認", "分類ルール未設定"


def parse_salary(path: Path) -> dict:
    text = normalize_digits(pdf_text(path))
    def find_money(label: str) -> int | None:
        m = re.search(label + r"\s+([0-9,]+)", text)
        return int(m.group(1).replace(",", "")) if m else None

    month = re.search(r"(20[0-9]{2}年[0-9]{2}月分) 支給明細書", text)
    paydate = re.search(r"振込日は (20[0-9]{4}年?[0-9]{1,2}月[0-9]{1,2}日|20[0-9]{2}年[0-9]{1,2}月[0-9]{1,2}日)", text)
    # Explicit patterns around known lines.
    gross = find_money("総支給額")
    net = find_money("差引支給額")
    total_ded = find_money("控除合計")
    social = find_money("社会保険計")
    tax = find_money("所得税")
    # Dorm/water are adjacent under a line; collect first few amounts after that label.
    dorm = water = cleaning = None
    m = re.search(r"寮費 .*?水道光熱費 .*?赴任旅費\s+([0-9,]+)(?:\s+([0-9,]+))?(?:\s+([0-9,]+))?(?:\s+([0-9,]+))?", text)
    if m:
        nums = [int(x.replace(",", "")) for x in m.groups() if x]
        if len(nums) >= 1:
            dorm = nums[0]
        if len(nums) >= 2:
            water = nums[1]
        if len(nums) >= 3:
            cleaning = nums[2]
    return {
        "source_file": path.name,
        "salary_month": month.group(1) if month else "",
        "pay_date_text": paydate.group(1) if paydate else "",
        "gross": gross,
        "net": net,
        "deductions_total": total_ded,
        "social_insurance": social,
        "income_tax": tax,
        "dorm_fee": dorm,
        "water_light": water,
        "cleaning_or_other": cleaning,
    }


def main() -> None:
    OUT.mkdir(exist_ok=True)
    sbi_files = [
        WORK / "sbi_2025-12_2026-03old.pdf",
        WORK / "sbi_2026-03.pdf",
        WORK / "sbi_2026-04.pdf",
        WORK / "sbi_2026-05.pdf",
    ]
    seen = set()
    transactions = []
    for f in sbi_files:
        for e in parse_sbi(f):
            key = (e["date"], e["description"], e["amount_a"], e["amount_b"], e["balance"])
            if key in seen:
                continue
            seen.add(key)
            direction, category, note = classify(e)
            e.update({"direction": direction, "category": category, "note": note})
            transactions.append(e)
    transactions.sort(key=lambda x: (x["date"], x["description"], x["amount_a"], x["amount_b"]))

    salaries = [parse_salary(p) for p in sorted(WORK.glob("salary_*.pdf"))]

    (OUT / "sbi_transactions_classified.json").write_text(
        json.dumps(transactions, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT / "salary_summary.json").write_text(
        json.dumps(salaries, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(json.dumps({"transactions": len(transactions), "salaries": salaries}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
