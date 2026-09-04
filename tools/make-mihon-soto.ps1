# ★自分の表の「同じ行」を、表の 外の 行から 見る★ 見本（★診断に 出ない 型★の 確かめ）
param([string]$Out)
$ErrorActionPreference='Stop'
$xl=$null
try{
  $xl=New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
  $wb=$xl.Workbooks.Add(); $sh=$wb.Worksheets.Item(1); $sh.Name='計算'
  $sh.Range('A1').Value2='日付'; $sh.Range('B1').Value2='数'; $sh.Range('C1').Value2='正岡ｈ'
  for($r=2;$r -le 5;$r++){ $sh.Cells($r,1).Value2=$r; $sh.Cells($r,2).Value2=$r*2; $sh.Cells($r,3).Value2=$r*3 }
  $lo=$sh.ListObjects.Add(1, $sh.Range('A1:C5'), $null, 1); $lo.Name='R8.8'
  # ★表の 外の 行（20行目）から 自分の表の「同じ行」を 見る★
  $sh.Range('B20').Formula='=IFERROR(R8.8[@正岡ｈ]*2, 0)'
  "B20 の 式 … $($sh.Range('B20').Formula)"
  "B20 の 値 … $($sh.Range('B20').Text)"
  $wb.SaveAs($Out, 51)
  "保存した … $Out"
}catch{ "★落ちた★ $($_.Exception.Message)" }
finally{ if($xl){ try{foreach($z in @($xl.Workbooks)){$z.Close($false)}}catch{}; try{$xl.Quit()}catch{} } }
