$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$W=1920; $H=1080
$out='C:\Users\celic\dormswap\bench_member_operation_update_16x9.png'
$bmp = New-Object System.Drawing.Bitmap $W,$H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
function Brush($hex){ return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex)) }
function FontJP($size,$style='Regular'){ return New-Object System.Drawing.Font('Yu Gothic', $size, [System.Drawing.FontStyle]::$style, [System.Drawing.GraphicsUnit]::Pixel) }
function RRect($x,$y,$w,$h,$r,$fill,$outline=$null,$ow=1){
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d=$r*2
  $path.AddArc($x,$y,$d,$d,180,90); $path.AddArc($x+$w-$d,$y,$d,$d,270,90); $path.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90); $path.AddArc($x,$y+$h-$d,$d,$d,90,90); $path.CloseFigure()
  if($fill){ $br=Brush $fill; $g.FillPath($br,$path); $br.Dispose() }
  if($outline){ $p=New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($outline)), $ow; $g.DrawPath($p,$path); $p.Dispose() }
  $path.Dispose()
}
function Text($txt,$x,$y,$size,$color,$style='Regular',$w=0,$h=0){
  $f=FontJP $size $style; $b=Brush $color
  if($w -gt 0){ $rect=New-Object System.Drawing.RectangleF([float]$x,[float]$y,[float]$w,[float]$h); $sf=New-Object System.Drawing.StringFormat; $sf.LineAlignment=[System.Drawing.StringAlignment]::Near; $g.DrawString($txt,$f,$b,$rect,$sf); $sf.Dispose() }
  else { $g.DrawString($txt,$f,$b,[float]$x,[float]$y) }
  $f.Dispose(); $b.Dispose()
}
function CenterText($txt,$x,$y,$w,$h,$size,$color,$style='Bold'){
  $f=FontJP $size $style; $b=Brush $color; $sf=New-Object System.Drawing.StringFormat; $sf.Alignment=[System.Drawing.StringAlignment]::Center; $sf.LineAlignment=[System.Drawing.StringAlignment]::Center
  $rect=New-Object System.Drawing.RectangleF([float]$x,[float]$y,[float]$w,[float]$h); $g.DrawString($txt,$f,$b,$rect,$sf)
  $sf.Dispose(); $f.Dispose(); $b.Dispose()
}
function Card($x,$y,$w,$h,$tag,$title,$body,$accent){
  RRect $x $y $w $h 24 '#ffffff' '#c9d6e4' 3
  RRect $x $y $w 58 24 $accent $null 1
  $br=Brush $accent; $g.FillRectangle($br,$x,($y+34),$w,24); $br.Dispose()
  Text $tag ($x+28) ($y+13) 27 '#ffffff' 'Bold'
  Text $title ($x+28) ($y+82) 34 '#07376f' 'Bold'
  Text $body ($x+34) ($y+140) 28 '#111827' 'Regular' ($w-68) ($h-150)
}
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#f7fbff'))
$p=New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#b7c3d0')),3; $g.DrawRectangle($p,18,18,$W-36,$H-36); $p.Dispose()
RRect 50 45 80 80 4 '#07376f'
CenterText '3' 50 45 80 80 52 '#ffffff' 'Bold'
Text '対応者向け運用：トーク確認・FB／録画共有ルール' 155 48 52 '#07376f' 'Bold'
Text 'よしたかさん以外も対応するため、全員が同じ基準で運用してください' 158 120 29 '#475569' 'Regular'
RRect 80 170 1760 98 22 '#fff2f2' '#ffd1d1' 3
RRect 105 192 100 53 16 '#e84b4b'
CenterText '重要' 105 192 100 53 27 '#ffffff' 'Bold'
Text 'FBの判断軸は「あくまでもトークスクリプト通りか／そうでないか」' 235 186 40 '#e84b4b' 'Bold'
Text '基本は良かったところをFB。逸脱や強い違和感がある場合のみ、その場FB OK。' 235 235 28 '#111827' 'Bold'
Card 80 305 545 285 'STEP 1' '見るポイント' "・トークスクリプト通りか`n・そうでないか`nこの2点を中心に確認" '#0f62b5'
Card 690 305 545 285 'STEP 2' '基本FB' '良かったと思う所だけを基本FB。細かい改善点の指摘はしすぎない。' '#16a34a'
Card 1295 305 545 285 'STEP 3' 'その場FB OK条件' 'トークスクリプトから逸脱している／あまりにも違和感がある場合は、その場でFB OK。' '#f59e0b'
Card 80 635 850 300 '必須' '録画・共有' '対応時は必ず録画する。録画はスレッドで共有し、共有時は必ずオロさんをメンションする。' '#e84b4b'
Card 990 635 850 300 '報告' '気づきの共有' '上記以外でも気になることがあれば、オロさんへの報告時に全て共有する。' '#07376f'
$labels=@('録画する','スレッド共有','オロさんをメンション','気づきも全て報告'); $xs=@(250,650,1090,1510); $fy=955
for($i=0;$i -lt 4;$i++){
  $col= if($i -lt 3){'#0f62b5'}else{'#e84b4b'}
  $br=Brush $col; $g.FillEllipse($br,$xs[$i]-38,$fy-38,76,76); $br.Dispose()
  if($i -eq 0){ $brw=Brush '#ffffff'; $g.FillRectangle($brw,$xs[$i]-16,$fy-13,34,27); [System.Drawing.Point[]]$pts=@([System.Drawing.Point]::new($xs[$i]+18,$fy-10),[System.Drawing.Point]::new($xs[$i]+34,$fy-20),[System.Drawing.Point]::new($xs[$i]+34,$fy+20),[System.Drawing.Point]::new($xs[$i]+18,$fy+10)); $g.FillPolygon($brw,$pts); $brw.Dispose() }
  elseif($i -eq 1){ CenterText '…' ($xs[$i]-30) ($fy-35) 60 70 36 $col 'Bold' }
  elseif($i -eq 2){ CenterText '@' ($xs[$i]-38) ($fy-38) 76 76 45 '#ffffff' 'Bold' }
  else { CenterText '!' ($xs[$i]-38) ($fy-38) 76 76 52 '#ffffff' 'Bold' }
  CenterText $labels[$i] ($xs[$i]-170) ($fy+50) 340 50 26 '#111827' 'Bold'
  if($i -lt 3){ $pen=New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#94a3b8')),6; $g.DrawLine($pen,$xs[$i]+58,$fy,$xs[$i+1]-58,$fy); $pen.Dispose() }
}
$bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output $out
