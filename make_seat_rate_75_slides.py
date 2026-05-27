from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import zipfile

OUT = Path(r"C:\Users\celic\dormswap\outputs\revival_deck_images_v2")
W, H = 1920, 1080
NAVY="#0B3F66"; BG="#F7F9FC"; PANEL="#FFFFFF"; INK="#172033"; MUTED="#607086"; LINE="#D9E2EC"
BLUE="#2D7FF9"; ORANGE="#F59E0B"; RED="#E23B3B"; GREEN="#31A66A"; PALE="#EEF5FF"; WHITE="#FFFFFF"; YELLOW="#FFF2CC"
FONT=r"C:\Windows\Fonts\meiryo.ttc"; FONT_B=r"C:\Windows\Fonts\meiryob.ttc"
def f(s,b=False): return ImageFont.truetype(FONT_B if b else FONT,s)
def text(d,xy,s,size=26,fill=INK,bold=False,anchor=None,align="left",spacing=5):
    d.multiline_text(xy,s,font=f(size,bold),fill=fill,anchor=anchor,align=align,spacing=spacing)
def tw(d,s,font): 
    b=d.textbbox((0,0),s,font=font); return b[2]-b[0]
def wrap(d,s,font,maxw):
    lines=[]; cur=""
    for ch in s:
        if ch=="\n": lines.append(cur); cur=""; continue
        if tw(d,cur+ch,font)<=maxw: cur+=ch
        else: lines.append(cur); cur=ch
    if cur: lines.append(cur)
    return "\n".join(lines)
def canvas(title,sub=""):
    im=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(im)
    d.rectangle([0,0,W,96],fill=NAVY)
    text(d,(64,48),title,34,WHITE,True,"lm")
    if sub: text(d,(W-64,50),sub,20,"#DDEBFF",False,"rm")
    return im,d
def card(d,box,title=None,fill=PANEL):
    d.rounded_rectangle(box,radius=18,fill=fill,outline=LINE,width=2)
    if title: text(d,(box[0]+28,box[1]+28),title,24,MUTED,True)
def bar(d,x,y,w,h,val,maxv,color,right=""):
    d.rounded_rectangle([x,y,x+w,y+h],radius=h//2,fill="#E7EEF6")
    bw=int(w*val/maxv) if maxv else 0
    if bw: d.rounded_rectangle([x,y,x+bw,y+h],radius=h//2,fill=color)
    if right: text(d,(x+w+14,y+h/2),right,19,INK,True,"lm")
def save(im,i,name):
    p=OUT/f"{i:02d}_{name}.png"; im.save(p,quality=95); return p

members=[
("芝隼人","通常",32,11.2,15.8),("田仲由敬","通常",36,12.6,22.7),("持木玲那","ベンチ",20,7.0,7.0),
("木原桃香","通常",0,0.0,0.0),("加藤陸","ベンチ",24,8.4,13.3),("河上まちこ","ベンチ",20,7.0,8.0),
("五十嵐凌大","ベンチ",24,8.4,9.1),("早川大貴","通常",22,7.7,10.1),("笠松佑衣","通常",31,10.9,17.2),
("和佐田舞緒","通常",19,6.7,10.2),("関口愛里","通常",36,12.6,24.9)
]

# 10 corrected required numbers
im,d=canvas("目標達成に必要なメンバー別数値：着座率75%版","上司FB反映：必要着座目安を75%で再計算")
card(d,(60,145,1860,940))
headers=["メンバー","区分","追加アポ","日平均","追加期待成約","合計期待","必要着座目安","着座後必要成約率","優先度"]
xs=[95,285,435,590,750,975,1195,1405,1665]
for x,h in zip(xs,headers): text(d,(x,205),h,21,MUTED,True)
max_add=max(m[2] for m in members)
for i,m in enumerate(members):
    name,typ,add,add_exp,total_exp=m
    y=260+i*58
    color=ORANGE if typ=="ベンチ" else BLUE
    seat=round(add*0.75,1)
    close_req=(add_exp/seat*100) if seat else 0
    priority="最優先" if add>=31 or typ=="ベンチ" else ("高" if add>=20 else "通常")
    vals=[name,typ,f"{add}件",f"{add/18:.1f}/日",f"{add_exp:.1f}件",f"{total_exp:.1f}件",f"{seat:.1f}件",f"{close_req:.1f}%",priority]
    for x,v in zip(xs,vals):
        fill=color if x==285 else (RED if x==1405 and close_req>50 else INK)
        text(d,(x,y),v,20,fill,True if x in [95,285,1665] else False)
    bar(d,1770,y-2,75,22,add,max_add,color)
text(d,(95,910),"修正点：必要着座目安は現状着座率ではなく、一律75%で算出。着座後成約率が非現実的にならない前提に変更。",25,RED,True)
save(im,10,"required_numbers_75")

# 11 before/after explanation
im,d=canvas("なぜ着座率75%で見るのか","赤丸指摘への回答")
card(d,(90,150,890,900),"問題")
text(d,(135,240),wrap(d,"現状着座率ベースで必要着座を出すと、着座数が低く見えすぎる。結果として、必要な着座後成約率が80%前後になり、実行計画として現実味が薄い。",f(34,True),680),34,INK,True)
card(d,(1030,150,1830,900),"修正方針")
text(d,(1075,240),wrap(d,"必要着座目安は「追加アポ × 75%」で統一する。着座率を上げるために、前日連絡・当日朝連絡・文章精査・顧客管理アプリ運用を必須アクション化する。",f(34,True),680),34,INK,True)
text(d,(135,705),"Before：現状着座率のまま計算",28,MUTED,True)
text(d,(135,765),"After：75%着座を目標値として計算",36,BLUE,True)
text(d,(1075,705),"狙い：アポ数だけでなく、着座数を増やして成約率を現実ラインへ戻す。",30,RED,True)
save(im,11,"why_75")

# 12 action workflow
im,d=canvas("着座率75%にするためのアクションプラン","前日準備 → 当日朝連絡 → 漏れ防止")
card(d,(80,150,1840,910),"着座率改善の流れ")
steps=[
("前日確認","営業担当に伝えたいことを確認\n顧客ごとの連絡意図を整理"),
("文章精査","ChatGPTで文章を精査\n返事が来やすい文面にする"),
("アプリ導線","顧客管理アプリから\n翌日の顧客名をタップして連絡"),
("当日朝連絡","朝から再連絡\n漏れなく着座率75%へ寄せる"),
]
for i,(a,b) in enumerate(steps):
    x=135+i*430
    d.rounded_rectangle([x,320,x+330,600],radius=18,fill=PALE,outline="#C8D9F3",width=2)
    text(d,(x+165,380),a,34,BLUE if i<3 else RED,True,"mm")
    text(d,(x+165,500),b,24,INK,True,"mm",align="center")
    if i<3: text(d,(x+370,460),"→",48,MUTED,True,"mm")
text(d,(130,715),"運用ルール：翌日の顧客一覧を必ずアプリから開き、顧客ごとに前日・当日朝の連絡履歴を残す。",31,INK,True)
text(d,(130,785),"完了基準：翌日アポの75%以上が着座見込みになっている状態で当日を迎える。",32,RED,True)
save(im,12,"seat_rate_action")

# 13 member countermeasure
im,d=canvas("着座が弱いメンバーへの対策","75%に寄せるための個別運用")
card(d,(70,145,1850,930))
rows=[
("芝隼人","42.2%","前日文面の標準化。返信が来る一言を追加"),
("田仲由敬","33.9%","アポ前の意図共有と当日朝の再確認を徹底"),
("加藤陸","34.6%","ベンチ復帰枠。連絡文を必ず事前チェック"),
("河上まちこ","40.0%","返信誘導文をChatGPTで精査して送信"),
("早川大貴","28.6%","低着座。顧客管理アプリから漏れ防止を最優先"),
("笠松佑衣","33.3%","成約率は高いので着座改善が最重要"),
("関口愛里","31.3%","残アポが多い。前日・当日朝の連絡をルーティン化"),
]
headers=["メンバー","現在着座率","75%へ上げるための対策"]
xs=[115,390,650]
for x,h in zip(xs,headers): text(d,(x,210),h,23,MUTED,True)
for i,(name,rate,act) in enumerate(rows):
    y=280+i*82
    d.rounded_rectangle([95,y-15,1785,y+50],radius=12,fill="#FFF" if i%2==0 else "#F7FAFF",outline=LINE)
    text(d,(115,y+17),name,24,INK,True,"lm")
    text(d,(420,y+17),rate,24,RED,True,"lm")
    text(d,(650,y+17),act,23,INK,False,"lm")
text(d,(115,890),"共通対策：前日連絡＋当日朝連絡＋ChatGPT文章精査＋顧客管理アプリ導線で、連絡漏れをゼロにする。",26,RED,True)
save(im,13,"member_seat_countermeasure")

zip_path=OUT/"orochi_may_revival_presentation_images.zip"
with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.glob("*.png")):
        z.write(p,p.name)
print(zip_path)
