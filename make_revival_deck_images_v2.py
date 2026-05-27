from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import zipfile

OUT = Path(r"C:\Users\celic\dormswap\outputs\revival_deck_images_v2")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1920, 1080
NAVY = "#0B3F66"; INK = "#172033"; MUTED = "#607086"; BG = "#F7F9FC"; PANEL = "#FFFFFF"
BLUE = "#2D7FF9"; ORANGE = "#F59E0B"; GREEN = "#31A66A"; RED = "#E23B3B"; LINE = "#D9E2EC"; PALE = "#EEF5FF"
FONT = r"C:\Windows\Fonts\meiryo.ttc"; FONT_B = r"C:\Windows\Fonts\meiryob.ttc"
def f(s,b=False): return ImageFont.truetype(FONT_B if b else FONT, s)
def text(d,xy,s,size=30,fill=INK,bold=False,anchor=None,align="left",spacing=6): d.multiline_text(xy,s,font=f(size,bold),fill=fill,anchor=anchor,align=align,spacing=spacing)
def width(d,s,font): b=d.textbbox((0,0),s,font=font); return b[2]-b[0]
def wrap(d,s,font,maxw):
    out=[]; cur=""
    for ch in s:
        if ch=="\n": out.append(cur); cur=""; continue
        if width(d,cur+ch,font)<=maxw: cur+=ch
        else: out.append(cur); cur=ch
    if cur: out.append(cur)
    return "\n".join(out)
def canvas(title,sub=""):
    im=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(im)
    d.rectangle([0,0,W,96],fill=NAVY)
    text(d,(64,48),title,36,"white",True,anchor="lm")
    if sub: text(d,(W-64,50),sub,20,"#DDEBFF",False,anchor="rm")
    return im,d
def card(d,box,title=None,fill=PANEL):
    d.rounded_rectangle(box,radius=18,fill=fill,outline=LINE,width=2)
    if title: text(d,(box[0]+28,box[1]+28),title,24,MUTED,True)
def metric(d,box,label,value,note="",color=BLUE):
    card(d,box); x1,y1,x2,y2=box
    text(d,(x1+26,y1+24),label,23,MUTED,True)
    text(d,(x1+26,y1+78),value,54,color,True)
    if note: text(d,(x1+26,y2-38),note,20,MUTED)
def bar(d,x,y,w,h,val,maxv,color,label="",right=""):
    if label: text(d,(x,y-32),label,21,INK,True)
    d.rounded_rectangle([x,y,x+w,y+h],radius=h//2,fill="#E7EEF6")
    bw=int(w*val/maxv) if maxv else 0
    if bw: d.rounded_rectangle([x,y,x+bw,y+h],radius=h//2,fill=color)
    if right: text(d,(x+w+18,y+h/2),right,22,INK,True,anchor="lm")
def save(im,i,name):
    p=OUT/f"{i:02d}_{name}.png"; im.save(p,quality=95); return p

members=[
("芝隼人","通常",45,19,42.2,4,21.1,13,4.6,32,11.2,15.8,"中"),
("田仲由敬","通常",59,20,33.9,5,25.0,29,10.1,36,12.6,22.7,"低"),
("持木玲那","ベンチ",0,0,0.0,0,0.0,0,0.0,20,7.0,7.0,"高"),
("木原桃香","通常",0,0,0.0,0,0.0,0,0.0,0,0.0,0.0,"高"),
("加藤陸","ベンチ",26,9,34.6,2,22.2,14,4.9,24,8.4,13.3,"高"),
("河上まちこ","ベンチ",5,2,40.0,0,0.0,3,1.0,20,7.0,8.0,"高"),
("五十嵐凌大","ベンチ",22,15,68.2,1,6.7,2,0.7,24,8.4,9.1,"高"),
("早川大貴","通常",14,4,28.6,1,25.0,7,2.4,22,7.7,10.1,"中"),
("笠松佑衣","通常",30,10,33.3,3,30.0,18,6.3,31,10.9,17.2,"低"),
("和佐田舞緒","通常",23,11,47.8,1,9.1,10,3.5,19,6.7,10.2,"中"),
("関口愛里","通常",64,20,31.3,5,25.0,35,12.3,36,12.6,24.9,"低"),
]
dates=["5/25","5/26","5/27","5/28","5/29","5/30","5/31","6/1","6/2","6/3","6/4","6/5","6/6","6/7","6/8","6/9","6/10","6/11"]
daily=[18,17,16,16,16,16,15,15,15,15,15,17,16,14,13,14,13,13]
bench_daily=[4,4,4,4,4,4,4,4,4,4,4,6,6,6,6,6,8,8]

# 1 Team overview
im,d=canvas("オロチーム5月復活劇：チーム数値", "目標達成に必要な数字")
text(d,(90,165),"6/11までに、不足124成約を埋めるための実行設計",50,INK,True)
metric(d,(90,300,410,500),"目標値","147件","期間全データ",NAVY)
metric(d,(450,300,770,500),"現状合計","30件","成約17＋予定13",GREEN)
metric(d,(810,300,1130,500),"進捗","20.4%","不足が大きい",RED)
metric(d,(1170,300,1490,500),"残アポ","96件","前提値",ORANGE)
metric(d,(1530,300,1830,500),"追加必要","264件","実務管理値",BLUE)
card(d,(90,620,1830,910),"発表の主張")
text(d,(130,690),wrap(d,"既存アポだけでは届かない。追加264アポを、強い通常メンバーと再デビューするベンチメンバーに分けて、毎日消化できる状態を作る。",f(36,True),1600),36,INK,True)
save(im,1,"team_numbers")

# 2 Reverse math
im,d=canvas("不足124成約をどう埋めるか", "逆算ロジック")
card(d,(90,150,1830,900),"必要アポ数の逆算")
items=[("不足成約","124件"),("想定成約率","35%"),("必要アポ","約355件"),("残アポ差引","追加264件")]
for i,(a,b) in enumerate(items):
    x=150+i*425
    d.rounded_rectangle([x,330,x+300,550],radius=18,fill=PALE,outline="#C8D9F3",width=2)
    text(d,(x+150,395),a,28,MUTED,True,anchor="mm")
    text(d,(x+150,485),b,52,RED if i==3 else BLUE,True,anchor="mm")
    if i<3: text(d,(x+350,445),"→",54,MUTED,True,anchor="mm")
text(d,(150,690),"配分後：通常メンバー176件 / ベンチメンバー88件",42,INK,True)
text(d,(150,760),"意図：通常メンバーに背負わせすぎず、ベンチも5/25以降は毎日最低1件、終盤2件に引き上げる。",30,RED,True)
save(im,2,"reverse_math")

# 3 Current performance table
im,d=canvas("各メンバーの現在成績", "アポ数・着座・成約数・成約率")
card(d,(55,145,1865,940))
headers=["メンバー","区分","アポ","着座","着座率","成約","成約率","残アポ"]
xs=[90,330,485,615,750,930,1065,1235]
for x,h in zip(xs,headers): text(d,(x,205),h,22,MUTED,True)
max_apo=max(m[2] for m in members)
for i,m in enumerate(members):
    y=260+i*58
    color=ORANGE if m[1]=="ベンチ" else BLUE
    vals=[m[0],m[1],str(m[2]),str(m[3]),f"{m[4]:.1f}%",str(m[5]),f"{m[6]:.1f}%",str(m[7])]
    for x,v in zip(xs,vals):
        text(d,(x,y),v,22,INK if x!=330 else color,True if x in [90,330] else False)
    bar(d,1390,y-2,320,22,m[2],max_apo,color,right=f"アポ{m[2]}")
text(d,(90,910),"読み筋：田仲・関口は成約数、笠松は成約率、五十嵐は着座率が強い。一方でベンチは品質確認が必須。",27,RED,True)
save(im,3,"current_performance")

# 4 Required by member
im,d=canvas("目標達成に必要なメンバー別数値", "追加アポ・期待成約・日平均")
card(d,(60,145,1860,940))
headers=["メンバー","区分","追加アポ","日平均","追加期待成約","合計期待","必要着座目安","優先度"]
xs=[95,300,455,620,775,1015,1205,1470]
for x,h in zip(xs,headers): text(d,(x,205),h,22,MUTED,True)
max_add=max(m[9] for m in members)
for i,m in enumerate(members):
    y=260+i*58
    color=ORANGE if m[1]=="ベンチ" else BLUE
    seat_basis=(m[4]/100) if m[4]>0 else 0.703
    priority="最優先" if m[9]>=31 or m[1]=="ベンチ" else ("高" if m[9]>=20 else "通常")
    vals=[m[0],m[1],f"{m[9]}件",f"{m[9]/18:.1f}/日",f"{m[10]:.1f}件",f"{m[11]:.1f}件",f"{m[9]*seat_basis:.1f}件",priority]
    for x,v in zip(xs,vals):
        text(d,(x,y),v,21, color if x==300 else INK, True if x in [95,300,1470] else False)
    bar(d,1620,y-2,170,22,m[9],max_add,color)
text(d,(95,910),"結論：田仲・関口・芝・笠松は通常側の柱。ベンチ4名は毎日最低1件で復活ラインに乗せる。",27,RED,True)
save(im,4,"required_numbers")

# 5 Allocation bars
im,d=canvas("追加264アポの割り振り", "誰にどれだけ持たせるか")
card(d,(80,145,780,470),"全体配分")
bar(d,145,270,500,48,176,264,BLUE,label="通常メンバー",right="176件")
bar(d,145,385,500,48,88,264,ORANGE,label="ベンチメンバー",right="88件")
card(d,(840,145,1840,940),"追加アポ 多い順")
for i,m in enumerate(sorted(members,key=lambda x:x[9],reverse=True)):
    y=220+i*60; color=ORANGE if m[1]=="ベンチ" else BLUE
    text(d,(885,y+13),m[0],22,INK,True); bar(d,1085,y,470,25,m[9],36,color,right=f"{m[9]}件"); text(d,(1710,y+13),m[1],20,MUTED,anchor="lm")
text(d,(115,620),wrap(d,"強い人へ厚く振る。ただし通常メンバーだけに寄せすぎず、ベンチ復活で負担を分散する。",f(32,True),620),32,INK,True)
save(im,5,"allocation")

# 6 Daily plan
im,d=canvas("5/25以降の日別アポ計画", "通常は均し / ベンチは最低1件・終盤2件")
card(d,(70,145,1850,880),"日別追加アポ数")
base_x,base_y,chart_w,chart_h=130,730,1600,470
maxd=max(daily)
for i,(dt,total,bd) in enumerate(zip(dates,daily,bench_daily)):
    x=base_x+i*(chart_w/len(dates))+10; bw=chart_w/len(dates)-18
    h=int(chart_h*total/maxd); bh=int(chart_h*bd/maxd)
    d.rounded_rectangle([x,base_y-h,x+bw,base_y],radius=6,fill=BLUE)
    d.rounded_rectangle([x,base_y-bh,x+bw,base_y],radius=6,fill=ORANGE)
    text(d,(x+bw/2,base_y-h-18),str(total),18,INK,True,anchor="mm")
    if i%2==0 or i>=16: text(d,(x+bw/2,base_y+28),dt,17,MUTED,anchor="mm")
d.line([base_x,base_y,base_x+chart_w,base_y],fill=LINE,width=3)
d.rounded_rectangle([130,190,430,250],radius=12,fill=BLUE); text(d,(460,220),"日計",24,INK,True,anchor="lm")
d.rounded_rectangle([650,190,950,250],radius=12,fill=ORANGE); text(d,(980,220),"うちベンチ",24,INK,True,anchor="lm")
text(d,(130,810),"6/6以降にベンチ比率を上げ、通常メンバーの連アポ負担を逃がす。",31,RED,True)
save(im,6,"daily_plan")

# 7 Action plan 90min
im,d=canvas("アクションプラン：連アポを可能にする", "90分着金の型を作る")
card(d,(80,150,1840,910),"商談改善の流れ")
steps=[("比較","自分の商談と\nオロさんの商談を比較"),("削る","無駄な説明・確認・\nクロージングのズレを整理"),("型化","90分着金までの\n標準フローを作る"),("統一","全員のアポを\nその流れに揃える")]
for i,(a,b) in enumerate(steps):
    x=135+i*430
    d.rounded_rectangle([x,330,x+330,570],radius=18,fill=PALE,outline="#C8D9F3",width=2)
    text(d,(x+165,390),a,38,BLUE if i<3 else RED,True,anchor="mm")
    text(d,(x+165,485),b,25,INK,True,anchor="mm",align="center")
    if i<3: text(d,(x+370,450),"→",48,MUTED,True,anchor="mm")
text(d,(130,690),"提出物：比較メモ、削る項目リスト、標準フロー、アポ前チェックリスト",32,INK,True)
text(d,(130,760),"完了基準：90分で着金まで持っていく流れが言語化され、全メンバーが同じ型でアポに入れる。",30,RED,True)
save(im,7,"action_plan")

# 8 Execution checklist
im,d=canvas("実行チェックリスト", "毎日見るべきもの")
card(d,(80,150,910,900),"日次で確認")
checks=["アポ数：日別計画との差分","着座数：アポ品質の確認","成約数：35%ラインとの差分","着金：6/11に間に合う導線","不足分：翌日に再配分"]
for i,c in enumerate(checks): text(d,(130,250+i*105),f"{i+1}. {c}",31,INK,True)
card(d,(980,150,1840,900),"残リスク")
risks=[("残アポ差分","前提96件 / 元データ集計91件"),("追加必要数","計算259件だが実務264件で管理"),("ベンチ条件","5/25再デビュー許可が必要"),("商談品質","連アポで成約率を落とさない")]
for i,(a,b) in enumerate(risks):
    y=245+i*125
    d.rounded_rectangle([1030,y,1790,y+88],radius=14,fill=PALE,outline=LINE)
    text(d,(1060,y+30),a,25,RED,True); text(d,(1280,y+30),b,24,INK,True)
text(d,(1030,800),wrap(d,"最終方針：数字・配分・商談の型を毎日更新し、264アポを取り切る。",f(28,True),720),28,INK,True)
save(im,8,"checklist")

zip_path=OUT/"orochi_may_revival_presentation_images.zip"
with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.glob("*.png")): z.write(p,p.name)
print(OUT)
