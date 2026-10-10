# ★自分の表の「同じ行」を、表の 外の 行から 見る★ 見本（★診断に 出ない 型★の 確かめ）
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
    $e.Delete(); $n=$z.CreateEntry('docProps/core.xml'); $w=New-Object System.IO.StreamWriter($n.Open(), (New-Object System.Text.UTF8Encoding($false))); $w.Write($x); $w.Close()
  } finally { $z.Dispose() }
  "作者を 見本に … $p"
}
$xl=$null
try{
  $xl=New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
  $wb=$xl.Workbooks.Add(); $sh=$wb.Worksheets.Item(1); $sh.Name='計算'
  $sh.Range('A1').Value2='日付'; $sh.Range('B1').Value2='数'; $sh.Range('C1').Value2='標本七ｈ'
  for($r=2;$r -le 5;$r++){ $sh.Cells($r,1).Value2=$r; $sh.Cells($r,2).Value2=$r*2; $sh.Cells($r,3).Value2=$r*3 }
  $lo=$sh.ListObjects.Add(1, $sh.Range('A1:C5'), $null, 1); $lo.Name='R8.8'
  # ★表の 外の 行（20行目）から 自分の表の「同じ行」を 見る★
  $sh.Range('B20').Formula='=IFERROR(R8.8[@標本七ｈ]*2, 0)'
  "B20 の 式 … $($sh.Range('B20').Formula)"
  "B20 の 値 … $($sh.Range('B20').Text)"
  $wb.SaveAs($Out, 51)
  "保存した … $Out"
}catch{ "★落ちた★ $($_.Exception.Message)" }
finally{ if($xl){ try{foreach($z in @($xl.Workbooks)){$z.Close($false)}}catch{}; try{$xl.Quit()}catch{} } }
作者を見本に ($Out)
