from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

OUT = Path(r"C:\Users\celic\dormswap\outputs\revival_deck_images")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080
NAVY = "#0B3F66"
INK = "#172033"
MUTED = "#607086"
BG = "#F7F9FC"
PANEL = "#FFFFFF"
BLUE = "#2D7FF9"
CYAN = "#45B8D8"
GREEN = "#31A66A"
RED = "#E23B3B"
ORANGE = "#F59E0B"
YELLOW = "#FFF2CC"
LINE = "#D9E2EC"

FONT = r"C:\Windows\Fonts\meiryo.ttc"
FONT_B = r"C:\Windows\Fonts\meiryob.ttc"

def f(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)

def text(draw, xy, s, size=34, fill=INK, bold=False, anchor=None, align="left", spacing=6):
    draw.multiline_text(xy, s, font=f(size, bold), fill=fill, anchor=anchor, align=align, spacing=spacing)

def tw(draw, s, font):
    b = draw.textbbox((0,0), s, font=font)
    return b[2]-b[0]

def wrap(draw, s, font, max_w):
    lines = []
    for para in s.split("\n"):
        cur = ""
        for ch in para:
            if tw(draw, cur + ch, font) <= max_w:
                cur += ch
            else:
                if cur:
                    lines.append(cur)
                cur = ch
        lines.append(cur)
    return "\n".join(lines)

def canvas(title, subtitle=None):
    im = Image.new("RGB", (W,H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0,0,W,96], fill=NAVY)
    text(d, (64,48), title, 36, "white", True, anchor="lm")
    if subtitle:
        text(d, (W-64,50), subtitle, 20, "#DDEBFF", False, anchor="rm")
    return im, d

def card(d, box, title=None, fill=PANEL, outline=LINE):
    d.rounded_rectangle(box, radius=18, fill=fill, outline=outline, width=2)
    if title:
        text(d, (box[0]+28, box[1]+28), title, 24, MUTED, True)

def metric(d, box, label, value, note="", color=BLUE):
    card(d, box)
    x1,y1,x2,y2 = box
    text(d, (x1+28,y1+26), label, 24, MUTED, True)
    text(d, (x1+28,y1+82), value, 58, color, True)
    if note:
        text(d, (x1+28,y2-42), note, 22, MUTED)

def bar(d, x, y, w, h, value, maxv, color, label=None, value_label=None):
    d.rounded_rectangle([x,y,x+w,y+h], radius=h//2, fill="#E8EEF5")
    bw = 0 if maxv == 0 else int(w * value / maxv)
    if bw:
        d.rounded_rectangle([x,y,x+bw,y+h], radius=h//2, fill=color)
    if label:
        text(d, (x,y-34), label, 22, INK, True)
    if value_label:
        text(d, (x+w+18,y+h/2), value_label, 22, INK, True, anchor="lm")

members = [
    {"name":"芝隼人","type":"通常","apo":45,"seat":42.2,"close":21.1,"contract":4,"remain":13,"add":32,"expected":15.8,"risk":"中"},
    {"name":"田仲由敬","type":"通常","apo":59,"seat":33.9,"close":25.0,"contract":5,"remain":29,"add":36,"expected":22.7,"risk":"低"},
    {"name":"持木玲那","type":"ベンチ","apo":0,"seat":0.0,"close":0.0,"contract":0,"remain":0,"add":20,"expected":7.0,"risk":"高"},
    {"name":"木原桃香","type":"通常","apo":0,"seat":0.0,"close":0.0,"contract":0,"remain":0,"add":0,"expected":0.0,"risk":"高"},
    {"name":"加藤陸","type":"ベンチ","apo":26,"seat":34.6,"close":22.2,"contract":2,"remain":14,"add":24,"expected":13.3,"risk":"高"},
    {"name":"河上まちこ","type":"ベンチ","apo":5,"seat":40.0,"close":0.0,"contract":0,"remain":3,"add":20,"expected":8.0,"risk":"高"},
    {"name":"五十嵐凌大","type":"ベンチ","apo":22,"seat":68.2,"close":6.7,"contract":1,"remain":2,"add":24,"expected":9.1,"risk":"高"},
    {"name":"早川大貴","type":"通常","apo":14,"seat":28.6,"close":25.0,"contract":1,"remain":7,"add":22,"expected":10.1,"risk":"中"},
    {"name":"笠松佑衣","type":"通常","apo":30,"seat":33.3,"close":30.0,"contract":3,"remain":18,"add":31,"expected":17.2,"risk":"低"},
    {"name":"和佐田舞緒","type":"通常","apo":23,"seat":47.8,"close":9.1,"contract":1,"remain":10,"add":19,"expected":10.2,"risk":"中"},
    {"name":"関口愛里","type":"通常","apo":64,"seat":31.3,"close":25.0,"contract":5,"remain":35,"add":36,"expected":24.9,"risk":"低"},
]
bench = [m for m in members if m["type"]=="ベンチ"]
normal = [m for m in members if m["type"]=="通常"]
dates = ["5/25","5/26","5/27","5/28","5/29","5/30","5/31","6/1","6/2","6/3","6/4","6/5","6/6","6/7","6/8","6/9","6/10","6/11"]
daily_totals = [18,17,16,16,16,16,15,15,15,15,15,17,16,14,13,14,13,13]
bench_daily = [4,4,4,4,4,4,4,4,4,4,4,6,6,6,6,6,8,8]

def save(im, i, name):
    path = OUT / f"{i:02d}_{name}.png"
    im.save(path, quality=95)
    return path

# 1
im,d = canvas("オロチーム 5月復活劇", "6/11着金・数字達成に向けた実行資料")
text(d, (90,190), "不足124成約を、追加264アポで取り切る。", 58, INK, True)
text(d, (94,270), "方針：強い通常メンバーへ厚く、ベンチは5/25から毎日戦力化。", 30, MUTED, True)
metric(d, (90,390,455,610), "不足成約", "124件", "達成期限：6/11", RED)
metric(d, (495,390,860,610), "必要アポ", "355件", "124 ÷ 35%", BLUE)
metric(d, (900,390,1265,610), "現在残アポ", "96件", "前提値", GREEN)
metric(d, (1305,390,1670,610), "追加アポ", "264件", "実務管理値", ORANGE)
card(d, (90,700,1830,930), "最終メッセージ")
text(d, (125,760), wrap(d, "勝ち筋は「追加アポ数の確保」と「配分の設計」。通常メンバーの負荷を下げるため、ベンチも毎日最低1件、終盤は2件に引き上げて復活ラインを作る。", f(34, True), 1660), 34, INK, True)
save(im,1,"title")

# 2
im,d = canvas("全体ギャップ：何がどれだけ足りないか", "現状認識")
metric(d, (80,150,420,340), "目標値", "147件", "期間全データ", NAVY)
metric(d, (460,150,800,340), "現状合計", "30件", "成約17＋予定13", GREEN)
metric(d, (840,150,1180,340), "進捗", "20.4%", "まだ不足が大きい", RED)
metric(d, (1220,150,1560,340), "着席率", "70.3%", "質の土台あり", BLUE)
metric(d, (1600,150,1840,340), "残アポ", "96件", "", ORANGE)
card(d, (80,420,1840,900), "逆算ロジック")
steps = [("不足成約", "124件"), ("想定成約率", "35%"), ("必要アポ", "約355件"), ("残アポ差引", "追加264件")]
for i,(lab,val) in enumerate(steps):
    x=140+i*430
    d.rounded_rectangle([x,540,x+300,720], radius=16, fill="#EEF5FF", outline="#C8D9F3", width=2)
    text(d,(x+150,590),lab,28,MUTED,True,anchor="mm")
    text(d,(x+150,665),val,48,BLUE if i<3 else RED,True,anchor="mm")
    if i<3:
        text(d,(x+350,635),"→",48,MUTED,True,anchor="mm")
text(d,(140,800),"結論：既存アポだけでは届かない。5/25以降の追加アポ設計が勝負。",34,INK,True)
save(im,2,"gap")

# 3
im,d = canvas("誰が数字を作っているか", "メンバー別KPI")
card(d,(70,145,895,940),"成約数・追加アポ候補")
rank = sorted(members, key=lambda x:(x["contract"], x["close"], x["apo"]), reverse=True)
max_add=max(m["add"] for m in members)
for i,m in enumerate(rank[:8]):
    y=220+i*78
    text(d,(105,y+14),m["name"],25,INK,True)
    bar(d,300,y,285,30,m["add"],max_add,BLUE if m["type"]=="通常" else ORANGE)
    text(d,(610,y+16),f'+{m["add"]}アポ',22,INK,True,anchor="lm")
    text(d,(725,y+16),f'成約{m["contract"]} / {m["close"]:.1f}%',20,MUTED,False,anchor="lm")
card(d,(945,145,1850,940),"強い指標")
highlights=[
    ("一番数字が強い","田仲由敬 / 関口愛里","成約数5件"),
    ("成約率トップ","笠松佑衣","着座対成約率30.0%"),
    ("着座率トップ","五十嵐凌大","68.2%・ベンチ枠"),
    ("既存期待値トップ","関口愛里","残アポ35件 → 期待12.3件"),
]
for i,(a,b,c) in enumerate(highlights):
    y=235+i*155
    d.rounded_rectangle([995,y,1800,y+110],radius=14,fill="#F7FAFF",outline=LINE)
    text(d,(1025,y+30),a,24,MUTED,True)
    text(d,(1025,y+76),b,34,INK,True)
    text(d,(1510,y+76),c,23,BLUE,True,anchor="lm")
text(d,(995,840),"意図：強い人へ厚く振り、弱い部分は商談改善・ベンチ復活で補完する。",28,RED,True)
save(im,3,"kpi")

# 4
im,d = canvas("追加264アポの配分方針", "通常176 / ベンチ88")
card(d,(80,155,780,500),"配分バランス")
total=264
bar(d,150,285,520,52,176,total,BLUE,label="通常メンバー",value_label="176件")
bar(d,150,400,520,52,88,total,ORANGE,label="ベンチメンバー",value_label="88件")
text(d,(120,560),wrap(d,"通常側に偏りすぎないよう、ベンチも毎日稼働へ引き上げ。",f(28,True),650),28,INK,True)
card(d,(840,155,1840,930),"メンバー別 追加アポ")
maxv=max(m["add"] for m in members)
for i,m in enumerate(sorted(members,key=lambda x:x["add"],reverse=True)):
    y=225+i*60
    color=ORANGE if m["type"]=="ベンチ" else BLUE
    text(d,(880,y+14),m["name"],22,INK,True)
    bar(d,1080,y,500,26,m["add"],maxv,color,value_label=f'{m["add"]}件')
    text(d,(1700,y+14),m["type"],20,MUTED,False,anchor="lm")
save(im,4,"allocation")

# 5
im,d = canvas("5/25以降 日別追加アポ計画", "通常は均し / ベンチは最低1件・終盤2件")
card(d,(70,145,1850,880),"日別アポ数")
maxd=max(daily_totals)
base_x, base_y = 130, 730
chart_w, chart_h = 1600, 470
for i,(dt,val,bd) in enumerate(zip(dates,daily_totals,bench_daily)):
    x=base_x+i*(chart_w/len(dates))+10
    bw=chart_w/len(dates)-18
    h=int(chart_h*val/maxd)
    bh=int(chart_h*bd/maxd)
    d.rounded_rectangle([x,base_y-h,x+bw,base_y],radius=6,fill=BLUE)
    d.rounded_rectangle([x,base_y-bh,x+bw,base_y],radius=6,fill=ORANGE)
    if i%2==0 or i>=16:
        text(d,(x+bw/2,base_y+28),dt,17,MUTED,False,anchor="mm")
    text(d,(x+bw/2,base_y-h-18),str(val),18,INK,True,anchor="mm")
d.line([base_x,base_y,base_x+chart_w,base_y],fill=LINE,width=3)
d.rounded_rectangle([130,190,430,250],radius=12,fill=BLUE)
text(d,(460,220),"日計",24,INK,True,anchor="lm")
d.rounded_rectangle([650,190,950,250],radius=12,fill=ORANGE)
text(d,(980,220),"うちベンチ",24,INK,True,anchor="lm")
text(d,(130,810),"読み方：序盤から全員が動き、6/6以降にベンチ比率を上げて通常メンバーの負担を逃がす。",30,RED,True)
save(im,5,"daily_plan")

# 6
im,d = canvas("ベンチ復活計画", "5/25から毎日戦力化")
card(d,(80,150,1840,900),"ベンチメンバー別の役割")
for i,m in enumerate(bench):
    x=125+i*430
    d.rounded_rectangle([x,260,x+360,720],radius=18,fill="#FFF8EA",outline="#F8D991",width=2)
    text(d,(x+30,310),m["name"],34,INK,True)
    text(d,(x+30,390),f'追加 {m["add"]}アポ',48,ORANGE,True)
    text(d,(x+30,470),f'既存期待 {m["expected"]:.1f}件',25,MUTED,True)
    text(d,(x+30,520),wrap(d,"5/25以降は毎日最低1件。終盤は2件へ。ロープレ・最終確認を前倒し。",f(22),300),22,INK)
    text(d,(x+30,660),"リスク：高",24,RED,True)
text(d,(130,800),"狙い：ベンチをゼロ扱いしない。ただし満額戦力ではなく、段階的に数字へ参加させる。",32,INK,True)
save(im,6,"bench")

# 7
im,d = canvas("実行方針と確認事項", "発表締め")
card(d,(80,150,910,900),"今すぐやること")
actions=[
    "1. 5/25以降の日別アポ枠を確定",
    "2. 強メンバーの追加枠を先に押さえる",
    "3. ベンチ4名のロープレ・最終確認を前倒し",
    "4. 残アポ96件の正確性を確認",
    "5. 6/11着金に間に合う契約導線を確認",
]
for i,a in enumerate(actions):
    text(d,(125,240+i*90),a,30,INK,True)
card(d,(980,150,1840,900),"確認すべきリスク")
risks=[
    ("残アポ差分","前提96件 / 元データ集計91件"),
    ("追加アポ数","計算259件だが実務264件で管理"),
    ("成約率35%","逆算用の想定値。個人評価とは別"),
    ("ベンチ条件","5/25再デビューの許可日が必要"),
]
for i,(a,b) in enumerate(risks):
    y=240+i*125
    d.rounded_rectangle([1025,y,1785,y+88],radius=14,fill="#F7FAFF",outline=LINE)
    text(d,(1055,y+30),a,25,RED,True)
    text(d,(1280,y+30),b,25,INK,True)
text(d,(1025,780),wrap(d,"最終方針：通常メンバーだけで背負わず、ベンチを毎日稼働に乗せて264アポを取り切る。",f(28,True),730),28,INK,True)
save(im,7,"actions")

print(str(OUT))
