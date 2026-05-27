from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path("outputs/ai_drill_day1_slides")
W, H = 1600, 900


COLORS = {
    "black": "#070B16",
    "navy": "#0B1635",
    "blue": "#1673FF",
    "cyan": "#16D3FF",
    "white": "#FFFFFF",
    "muted": "#AAB7D3",
    "line": "#24355F",
    "gold": "#FFD24A",
    "red": "#FF4D6D",
}


def font_path(*names):
    root = Path("C:/Windows/Fonts")
    for name in names:
        p = root / name
        if p.exists():
            return str(p)
    return None


FONT_BOLD = font_path("YuGothB.ttc", "meiryob.ttc", "msgothic.ttc")
FONT_MED = font_path("YuGothM.ttc", "meiryo.ttc", "msgothic.ttc")


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_MED, size)


def rgb(hex_value):
    h = hex_value.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def text(draw, xy, value, size, color=COLORS["white"], bold=False, anchor=None, align="left", spacing=8):
    draw.multiline_text(xy, value, font=font(size, bold), fill=color, anchor=anchor, align=align, spacing=spacing)


def rect(draw, xy, fill, outline=None, radius=28, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def base():
    img = Image.new("RGB", (W, H), COLORS["black"]).convert("RGBA")
    d = ImageDraw.Draw(img)
    for i in range(0, W, 38):
        alpha = int(18 * (1 - i / W))
        d.line((i, 0, i - 520, H), fill=rgb(COLORS["blue"]) + (alpha,), width=2)
    d.ellipse((1040, -250, 1850, 560), fill=rgb(COLORS["blue"]) + (85,))
    d.ellipse((-360, 520, 540, 1220), fill=rgb(COLORS["cyan"]) + (42,))
    d.rectangle((0, 0, W, H), outline=rgb("#111D3F") + (255,), width=12)
    return img


def pill(d, xy, label, fill=COLORS["blue"], color=COLORS["white"], size=28):
    rect(d, xy, fill, fill, 999, 1)
    x1, y1, x2, y2 = xy
    text(d, ((x1 + x2) // 2, (y1 + y2) // 2 - 2), label, size, color, True, anchor="mm")


def stat(d, xy, number, label, accent=COLORS["blue"], num_size=78):
    x1, y1, x2, y2 = xy
    rect(d, xy, "#0E1B3C", COLORS["line"], 30, 2)
    d.rectangle((x1, y1 + 18, x1 + 8, y2 - 18), fill=accent)
    text(d, ((x1 + x2) // 2, y1 + 70), number, num_size, accent, True, anchor="mm")
    text(d, ((x1 + x2) // 2, y2 - 50), label, 28, COLORS["muted"], True, anchor="mm")


def title_block(d, no, title, subtitle=None):
    pill(d, (88, 70, 278, 122), no, COLORS["blue"])
    text(d, (92, 165), title, 64, COLORS["white"], True, spacing=10)
    if subtitle:
        sub_y = 330 if "\n" in title else 258
        text(d, (98, sub_y), subtitle, 34, COLORS["muted"], True)


def save(img, idx):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT_DIR / f"{idx:02d}.png", quality=95)


def slide_01():
    img = base()
    d = ImageDraw.Draw(img)
    pill(d, (92, 76, 338, 132), "DAY 1", COLORS["gold"], COLORS["black"], 30)
    text(d, (96, 190), "AIドリル入門編\n卒業チャレンジ", 82, COLORS["white"], True, spacing=12)
    text(d, (102, 430), "今日から4日間で、AIを“使える側”へ", 42, COLORS["muted"], True)
    stat(d, (930, 135, 1435, 300), "残り4日", "卒業までの期間", COLORS["cyan"], 62)
    stat(d, (930, 335, 1435, 500), "13本", "今日の目標", COLORS["gold"], 86)
    stat(d, (930, 535, 1435, 700), "195XP", "今日の獲得目安", COLORS["blue"], 76)
    rect(d, (126, 715, 820, 805), "#0E1B3C", COLORS["line"], 32, 2)
    text(d, (473, 760), "1時間44分で、Day1クリア。", 40, COLORS["white"], True, anchor="mm")
    save(img, 1)


def slide_02():
    img = base()
    d = ImageDraw.Draw(img)
    title_block(d, "02", "重く見える。\nでも数字にすると現実的。", "全部ではなく、今日は13本だけ。")
    stat(d, (115, 420, 440, 610), "50本", "全レッスン", COLORS["muted"], 68)
    stat(d, (480, 420, 805, 610), "8分", "1本あたり", COLORS["cyan"], 76)
    stat(d, (845, 420, 1170, 610), "13本", "今日やる分", COLORS["gold"], 76)
    stat(d, (1210, 420, 1535, 610), "195XP", "Day1到達", COLORS["blue"], 62)
    text(d, (800, 745), "「全部やる」より、「今日13本だけ」で考える。", 46, COLORS["white"], True, anchor="mm")
    text(d, (800, 807), "普通にいける。", 44, COLORS["gold"], True, anchor="mm")
    save(img, 2)


def slide_03():
    img = base()
    d = ImageDraw.Draw(img)
    title_block(d, "03", "時間は作るんじゃなく、置き換える", "SNSを見る時間を少しだけ、AIドリルへ。")
    rows = [
        ("通勤", "2本"),
        ("退勤", "2本"),
        ("隙間時間", "3本"),
        ("帰宅後", "4本"),
        ("寝る前", "2本"),
    ]
    y = 335
    for i, (name, count) in enumerate(rows):
        x = 135 if i < 3 else 620
        yy = y + (i if i < 3 else i - 3) * 118
        rect(d, (x, yy, x + 420, yy + 86), "#0E1B3C", COLORS["line"], 24, 2)
        text(d, (x + 35, yy + 43), name, 34, COLORS["white"], True, anchor="lm")
        text(d, (x + 350, yy + 43), count, 48, COLORS["cyan"] if i % 2 == 0 else COLORS["gold"], True, anchor="mm")
    stat(d, (1120, 365, 1480, 625), "13本", "今日の合計", COLORS["gold"], 94)
    rect(d, (235, 740, 1365, 815), COLORS["blue"], COLORS["blue"], 30, 1)
    text(d, (800, 777), "小さく刻めば、今日の目標は達成できる。", 40, COLORS["white"], True, anchor="mm")
    save(img, 3)


def slide_04():
    img = base()
    d = ImageDraw.Draw(img)
    title_block(d, "04", "まずは8分。\n1本だけ始めよう。", "勉強会開始直後に、全員で1レッスン。")
    steps = [
        ("1", "全員で1本進める"),
        ("2", "今日の目標本数を宣言"),
        ("3", "終わったらXPを共有"),
    ]
    for i, (n, body) in enumerate(steps):
        x = 145 + i * 485
        rect(d, (x, 405, x + 390, 575), "#0E1B3C", COLORS["line"], 30, 2)
        pill(d, (x + 32, 435, x + 92, 495), n, COLORS["gold"], COLORS["black"], 28)
        text(d, (x + 115, 490), body, 34, COLORS["white"], True, anchor="lm")
    text(d, (800, 675), "AIドリルは、気合いではなく\n行動開始の速さで決まる。", 48, COLORS["white"], True, anchor="mm", align="center", spacing=12)
    rect(d, (265, 780, 1335, 845), COLORS["gold"], COLORS["gold"], 28, 1)
    text(d, (800, 812), "8分動けば、もう前進。", 40, COLORS["black"], True, anchor="mm")
    save(img, 4)


def contact_sheet():
    thumbs = []
    for p in sorted(OUT_DIR.glob("[0-9][0-9].png")):
        im = Image.open(p).convert("RGB")
        im.thumbnail((400, 225))
        c = Image.new("RGB", (420, 260), "white")
        c.paste(im, (10, 10))
        dd = ImageDraw.Draw(c)
        dd.text((12, 235), p.name, fill=(7, 11, 22), font=font(22, True))
        thumbs.append(c)
    sheet = Image.new("RGB", (840, 520), "#F2F5FA")
    for i, im in enumerate(thumbs):
        sheet.paste(im, ((i % 2) * 420, (i // 2) * 260))
    sheet.save(OUT_DIR / "contact_sheet.png", quality=95)


def main():
    for i, fn in enumerate([slide_01, slide_02, slide_03, slide_04], start=1):
        fn()
    contact_sheet()
    print(f"saved 4 slides to {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
