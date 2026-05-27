from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(r"C:\Users\celic\dormswap\outputs\revival_deck_images_v2")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1920, 1080
NAVY = "#0B3F66"; BG = "#F7F9FC"; INK = "#172033"; MUTED = "#607086"; LINE = "#D9E2EC"
BLUE = "#2D7FF9"; ORANGE = "#F59E0B"; PALE = "#EEF5FF"; RED = "#E23B3B"; WHITE = "#FFFFFF"
FONT = r"C:\Windows\Fonts\meiryo.ttc"; FONT_B = r"C:\Windows\Fonts\meiryob.ttc"

def f(size, bold=False): return ImageFont.truetype(FONT_B if bold else FONT, size)
def text(d, xy, s, size=24, fill=INK, bold=False, anchor=None): d.text(xy, s, font=f(size, bold), fill=fill, anchor=anchor)

members = [
    ("芝隼人","通常",32),
    ("田仲由敬","通常",36),
    ("持木玲那","ベンチ",20),
    ("木原桃香","通常",0),
    ("加藤陸","ベンチ",24),
    ("河上まちこ","ベンチ",20),
    ("五十嵐凌大","ベンチ",24),
    ("早川大貴","通常",22),
    ("笠松佑衣","通常",31),
    ("和佐田舞緒","通常",19),
    ("関口愛里","通常",36),
]
dates = ["5/25","5/26","5/27","5/28","5/29","5/30","5/31","6/1","6/2","6/3","6/4","6/5","6/6","6/7","6/8","6/9","6/10","6/11"]
schedule = {
    "芝隼人":[2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1],
    "田仲由敬":[2]*18,
    "持木玲那":[1]*16+[2,2],
    "木原桃香":[0]*18,
    "加藤陸":[1]*12+[2]*6,
    "河上まちこ":[1]*16+[2,2],
    "五十嵐凌大":[1]*12+[2]*6,
    "早川大貴":[2,2,2,2]+[1]*14,
    "笠松佑衣":[2]*13+[1]*5,
    "和佐田舞緒":[2]*1+[1]*17,
    "関口愛里":[2]*18,
}

im = Image.new("RGB", (W,H), BG)
d = ImageDraw.Draw(im)
d.rectangle([0,0,W,96], fill=NAVY)
text(d, (64,48), "5/25以降 メンバー別 追加アポスケジュール", 34, WHITE, True, "lm")
text(d, (W-64,50), "各日・各メンバーの追加アポ数", 20, "#DDEBFF", False, "rm")

x0, y0 = 48, 150
name_w, type_w, date_w, total_w = 178, 82, 78, 78
row_h = 54
table_w = name_w + type_w + date_w*len(dates) + total_w
table_h = row_h * (len(members)+2)
d.rounded_rectangle([x0-10,y0-12,x0+table_w+10,y0+table_h+10], radius=18, fill=WHITE, outline="#C8D9F3", width=2)

# Header
d.rectangle([x0, y0, x0+table_w, y0+row_h], fill="#C8D9F3")
text(d, (x0+12, y0+row_h/2), "メンバー", 18, INK, True, "lm")
text(d, (x0+name_w+12, y0+row_h/2), "区分", 18, INK, True, "lm")
for i,dt in enumerate(dates):
    x = x0 + name_w + type_w + i*date_w
    text(d, (x+date_w/2, y0+row_h/2), dt, 16, INK, True, "mm")
text(d, (x0+name_w+type_w+date_w*len(dates)+total_w/2, y0+row_h/2), "合計", 18, INK, True, "mm")

daily_totals = [0]*len(dates)
for r,(name,typ,total) in enumerate(members):
    y = y0 + row_h*(r+1)
    fill = "#FFF8EA" if typ == "ベンチ" else "#FFFFFF"
    d.rectangle([x0,y,x0+table_w,y+row_h], fill=fill)
    text(d, (x0+12,y+row_h/2), name, 18, INK, True, "lm")
    color = ORANGE if typ == "ベンチ" else BLUE
    text(d, (x0+name_w+12,y+row_h/2), typ, 16, color, True, "lm")
    vals = schedule[name]
    for i,v in enumerate(vals):
        daily_totals[i] += v
        x = x0 + name_w + type_w + i*date_w
        if v:
            pad = 12 if v == 1 else 8
            d.rounded_rectangle([x+pad,y+9,x+date_w-pad,y+row_h-9], radius=10, fill=color)
            text(d, (x+date_w/2,y+row_h/2), str(v), 18, WHITE, True, "mm")
        else:
            text(d, (x+date_w/2,y+row_h/2), "-", 17, "#9AA8B6", False, "mm")
    text(d, (x0+name_w+type_w+date_w*len(dates)+total_w/2,y+row_h/2), str(total), 19, INK, True, "mm")

# Daily total row
y = y0 + row_h*(len(members)+1)
d.rectangle([x0,y,x0+table_w,y+row_h], fill="#FFF2CC")
text(d, (x0+12,y+row_h/2), "日計", 18, INK, True, "lm")
for i,v in enumerate(daily_totals):
    x = x0 + name_w + type_w + i*date_w
    text(d, (x+date_w/2,y+row_h/2), str(v), 18, RED if v>=17 else INK, True, "mm")
text(d, (x0+name_w+type_w+date_w*len(dates)+total_w/2,y+row_h/2), str(sum(daily_totals)), 19, RED, True, "mm")

# Grid lines
for c in range(len(dates)+3):
    if c == 0: x=x0
    elif c == 1: x=x0+name_w
    elif c == 2: x=x0+name_w+type_w
    else: x=x0+name_w+type_w+(c-2)*date_w
    d.line([x,y0,x,y0+table_h], fill=LINE, width=1)
for r in range(len(members)+3):
    y = y0 + r*row_h
    d.line([x0,y,x0+table_w,y], fill=LINE, width=1)

text(d, (60, 990), "通常メンバーは均し、ベンチは毎日最低1件・終盤2件。日計264件を6/11までに消化する計画。", 26, RED, True)

path = OUT / "09_member_daily_schedule.png"
im.save(path, quality=95)
print(path)
