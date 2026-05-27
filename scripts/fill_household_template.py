from pathlib import Path
import shutil

from PIL import Image, ImageDraw, ImageFont


BASE = Path(r"C:\Users\celic\dormswap")
TEMPLATE_IMAGE = BASE / "household_template_preview.png"
OUT = BASE / "generated_household_filled"
OUT.mkdir(exist_ok=True)

FONT = Path(r"C:\Windows\Fonts\YuGothR.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\YuGothB.ttc")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold and FONT_BOLD.exists() else FONT
    return ImageFont.truetype(str(path), size=size)


MONTHS = [
    {
        "label": "2026年2月",
        "year": "2026",
        "month": "2",
        "end_day": "28",
        "salary": 346_772,
        "prev_carry": 0,
        "other_income_label": "",
        "other_income": 0,
        "income_total": 346_772,
        "rent": 3_720,
        "utilities": 12_400,
        "food": 117_472,
        "daily": 42_717,
        "phone": 0,
        "insurance": 0,
        "transport": 0,
        "social_label": "交際費：食事・外出等",
        "social": 53_397,
        "entertainment_label": "",
        "entertainment": 0,
        "fee": 7_678,
        "other_expense_label": "",
        "other_expense": 0,
        "next_carry": 109_388,
        "expense_total": 237_384,
    },
    {
        "label": "2026年3月",
        "year": "2026",
        "month": "3",
        "end_day": "31",
        "salary": 265_493,
        "prev_carry": 109_388,
        "other_income_label": "",
        "other_income": 0,
        "income_total": 374_881,
        "rent": 79_360,  # JR家賃76,000 + 寮費3,360
        "utilities": 11_200,
        "food": 141_026,
        "daily": 51_282,
        "phone": 0,
        "insurance": 0,
        "transport": 0,
        "social_label": "交際費：食事・外出等",
        "social": 64_103,
        "entertainment_label": "",
        "entertainment": 0,
        "fee": 7_678,
        "other_expense_label": "",
        "other_expense": 0,
        "tax": 1,
        "next_carry": 20_231,
        "expense_total": 354_650,
    },
    {
        "label": "2026年4月",
        "year": "2026",
        "month": "4",
        "end_day": "30",
        "salary": 247_668,
        "prev_carry": 20_231,
        "other_income_label": "預貯金取崩し",
        "other_income": 50_407,
        "income_total": 318_306,
        "rent": 77_000,  # JR家賃76,000 + 日研寮費1,000
        "utilities": 19_160,
        "food": 58_063,
        "daily": 29_032,
        "phone": 6_541,
        "insurance": 44_968,
        "insurance_contractor": "日研グループ健康保険組合",
        "transport": 21_773,
        "social_label": "交際費：食事・外出等",
        "social": 36_290,
        "entertainment_label": "娯楽費：仕事経費立替含む",
        "entertainment": 17_801,
        "fee": 7_678,
        "other_expense_label": "",
        "other_expense": 0,
        "next_carry": 0,
        "expense_total": 318_306,
    },
]


def yen(value: int) -> str:
    return f"{value:,}"


def draw_right(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, width: int, fnt: ImageFont.FreeTypeFont) -> None:
    if not text:
        return
    bbox = draw.textbbox((0, 0), text, font=fnt)
    draw.text((xy[0] + width - (bbox[2] - bbox[0]), xy[1]), text, fill="black", font=fnt)


def draw_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.FreeTypeFont) -> None:
    if text:
        draw.text(xy, text, fill="black", font=fnt)


def fill_one(month: dict) -> Path:
    im = Image.open(TEMPLATE_IMAGE).convert("RGB")
    draw = ImageDraw.Draw(im)
    f = font(31)
    small = font(25)
    tiny = font(22)
    micro = font(19)

    # Header.
    draw.rectangle((1010, 182, 1525, 292), fill="white")
    draw.text((1260, 198), f"（{month['year']}年 {month['month']}月分）", fill="black", font=small)
    draw.text((1052, 248), f"（対象期間：{month['month']}月 1日〜 {month['month']}月 {month['end_day']}日）", fill="black", font=small)

    # Income side.
    draw_right(draw, (640, 576), yen(month["salary"]), 160, f)
    if month["prev_carry"]:
        draw_right(draw, (640, 2160), yen(month["prev_carry"]), 160, f)
    if month["other_income"]:
        draw_label(draw, (165, 1450), month["other_income_label"], tiny)
        draw_right(draw, (640, 1436), yen(month["other_income"]), 160, f)
    draw_right(draw, (640, 2220), yen(month["income_total"]), 160, f)

    # Expense side. Coordinates follow the scanned template rows.
    draw_right(draw, (1322, 576), yen(month["rent"]), 160, f)
    draw_right(draw, (1322, 768), yen(month["food"]), 160, f)
    draw_right(draw, (1322, 816), yen(month["utilities"]), 160, f)  # electric/gas/water are combined here
    draw.text((835, 816), "水道光熱費", fill="black", font=small)
    draw_right(draw, (1322, 960), yen(month["daily"]), 160, f)
    if month["phone"]:
        draw_right(draw, (1322, 1008), yen(month["phone"]), 160, f)
    if month["insurance"]:
        draw_right(draw, (1322, 1104), yen(month["insurance"]), 160, f)
        draw.text((1035, 1151), month.get("insurance_contractor", ""), fill="black", font=micro)
    if month["transport"]:
        draw_right(draw, (1322, 1534), yen(month["transport"]), 160, f)
    if month["social"]:
        draw_label(draw, (835, 1630), month["social_label"], tiny)
        draw_right(draw, (1322, 1630), yen(month["social"]), 160, f)
    if month["entertainment"]:
        draw_label(draw, (835, 1730), month["entertainment_label"], micro)
        draw_right(draw, (1322, 1730), yen(month["entertainment"]), 160, f)
    if month["fee"]:
        draw_label(draw, (835, 2062), "その他（会費）", tiny)
        draw_right(draw, (1322, 2062), yen(month["fee"]), 160, f)
    if month.get("tax"):
        draw_right(draw, (1322, 1966), yen(month["tax"]), 160, f)
    draw_right(draw, (1322, 2160), yen(month["next_carry"]), 160, f)
    draw_right(draw, (1322, 2220), yen(month["expense_total"]), 160, f)

    png = OUT / f"家計表原本記入済み_提出用_{month['label']}.png"
    pdf = OUT / f"家計表原本記入済み_提出用_{month['label']}.pdf"
    im.save(png)
    im.save(pdf, "PDF", resolution=200.0)
    return pdf


def main() -> None:
    pdfs = [fill_one(month) for month in MONTHS]
    images = [Image.open(pdf.with_suffix(".png")).convert("RGB") for pdf in pdfs]
    combined = OUT / "家計表原本記入済み_提出用_2026年02月-04月.pdf"
    images[0].save(combined, "PDF", save_all=True, append_images=images[1:], resolution=200.0)

    for dest in [
        Path(r"C:\Users\celic\Desktop\弁護士整理\08_家計表"),
        Path(r"C:\Users\celic\OneDrive\デスクトップ\弁護士整理\08_家計表"),
    ]:
        dest.mkdir(parents=True, exist_ok=True)
        for file in OUT.glob("家計表原本記入済み_提出用_*.pdf"):
            shutil.copy2(file, dest / file.name)
        for file in OUT.glob("家計表原本記入済み_提出用_*.png"):
            shutil.copy2(file, dest / file.name)

    for file in sorted(OUT.glob("家計表原本記入済み_提出用_*.pdf")):
        print(file.name, file.stat().st_size)


if __name__ == "__main__":
    main()
