# ★わざと 壊した 見本の ブックを 実Excel で 作る★（★司さんの 実物は 1バイトも 触らない★）
#   作る物 … 表を 2つ（R8.8 / R8.9）／R8.9 の 行から ★R8.8[@標本七ｈ] を 指す 式★
#   ＝2026-09-03 に 実物で 起きた 型と 同じ（8月を コピーして 9月を 作った 残り）
param([string]$Out)
$ErrorActionPreference='Stop'
# ★作者の欄に 本物の 名前を 残さない（10-10 司さんの決め）★＝Excel が 保存した 後に docProps/core.xml の 2つの 欄だけを「見本」に 替える
#   （Application.UserName を 替えても サインインした アカウントの 名前が 入った＝10-10 に 測った）
function 作者を見本に([string]$p){
  Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
  $z=[System.IO.Compression.ZipFile]::Open($p,'Update')
  try{
    $e=$z.GetEntry('docProps/core.xml'); $r=New-Object System.IO.StreamReader($e.Open()); $x=$r.ReadToEnd(); $r.Close()
    $x=$x -replace '<dc:creator>[^<]*</dc:creator>','<dc:creator>見本</dc:creator>' -replace '<cp:lastModifiedBy>[^<]*</cp:lastModifiedBy>','<cp:lastModifiedBy>見本</cp:lastModifiedBy>'
    if($x -notmatch '<dc:creator>見本</dc:creator>' -or $x -notmatch '<cp:lastModifiedBy>見本</cp:lastModifiedBy>'){ throw '★作者の欄を 見本に 替えられない（core.xml の 書き方が 変わった？）★ ' + $p }
    $e.Delete(); $n=$z.CreateEntry('docProps/core.xml'); $w=New-Object System.IO.StreamWriter($n.Open(), (New-Object System.Text.UTF8Encoding($false))); $w.Write($x); $w.Close()
  } finally { $z.Dispose() }
  "作者を 見本に … $p"
}
$xl=$null
try{
  $xl=New-Object -ComObject Excel.Application
  $xl.Visible=$false; $xl.DisplayAlerts=$false
  $wb=$xl.Workbooks.Add()
  $sh=$wb.Worksheets.Item(1); $sh.Name='計算'
  # ── 8月の 表（R8.8）A1:C5 ──
  $sh.Range('A1').Value2='日付'; $sh.Range('B1').Value2='数'; $sh.Range('C1').Value2='標本七ｈ'
  for($r=2;$r -le 5;$r++){ $sh.Cells($r,1).Value2=$r; $sh.Cells($r,2).Value2=$r*2; $sh.Cells($r,3).Value2=$r*3 }
  $lo1=$sh.ListObjects.Add(1, $sh.Range('A1:C5'), $null, 1)
  $lo1.Name='R8.8'
  # ── 9月の 表（R8.9）A8:C12 ──
  $sh.Range('A8').Value2='日付'; $sh.Range('B8').Value2='数'; $sh.Range('C8').Value2='標本七ｈ'
  for($r=9;$r -le 12;$r++){ $sh.Cells($r,1).Value2=$r; $sh.Cells($r,2).Value2=$r*2 }
  $lo2=$sh.ListObjects.Add(1, $sh.Range('A8:C12'), $null, 1)
  $lo2.Name='R8.9'
  # ── ★わざと 壊す★＝R8.9 の 行から R8.8 の「その行」を 指す ──
  $sh.Range('C9').Formula='=IFERROR(MAX(R8.9[@数]*2, 1000*R8.8[@標本七ｈ]), 0)'
  "C9 の 式 … $($sh.Range('C9').Formula)"
  "C9 の 値 … $($sh.Range('C9').Text)"
  "C10 の 式（正しい方）… $($sh.Range('C10').Formula)"
  $wb.SaveAs($Out, 51)   # 51 = xlsx
  "保存した … $Out"
  $b = [System.IO.Path]::ChangeExtension($Out, '.xlsb')
  $wb.SaveAs($b, 50)     # 50 = xlsb（★実物と 同じ 形式でも 見つかるか★）
  "保存した … $b"
}catch{ "★落ちた★ $($_.Exception.Message)" }
finally{ if($xl){ try{foreach($z in @($xl.Workbooks)){$z.Close($false)}}catch{}; try{$xl.Quit()}catch{} } }
作者を見本に ($Out)
作者を見本に ([System.IO.Path]::ChangeExtension($Out, '.xlsb'))
