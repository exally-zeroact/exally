# ★ENCODEURL の 答えを 実Excel に 出させる★（読むだけ・新規ブック・保存しない）
param([string]$Out)
$ErrorActionPreference='Stop'
# ★境界を 先に 並べる★（司さんの 使い方で 効く 所）
$字 = @(
  'abc', 'ABC', '123', '', ' ', 'a b', 'a  b',
  'a+b', 'a-b', 'a_b', 'a.b', 'a~b', 'a*b', "a'b", 'a(b)', 'a!b',
  'a/b', 'a:b', 'a?b', 'a=b', 'a&b', 'a#b', 'a%b', 'a@b', 'a,b', 'a;b',
  'a$b', 'a[b]', 'a{b}', 'a|b', 'a\b', 'a^b', 'a`b', 'a"b', 'a<b>', 
  'あ', 'あいう', '日本語', 'ｱ', '①', '髙', '🙂',
  'ZERO代行', '代行計算表2026', 'https://example.com/a b?x=1&y=2',
  'a
b', '0', '00', '-1', '1.5'
)
$xl=$null
try{
  $xl=New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
  $wb=$xl.Workbooks.Add(); $sh=$wb.Worksheets.Item(1)
  $r=1
  foreach($s in $字){ $sh.Cells($r,1).NumberFormat='@'; $sh.Cells($r,1).Value2=[string]$s; $sh.Cells($r,2).Formula="=ENCODEURL(A$r)"; $r++ }
  # ★字では ない 物★
  $sh.Cells($r,2).Formula='=ENCODEURL(123)';      $r++
  $sh.Cells($r,2).Formula='=ENCODEURL(TRUE)';     $r++
  $sh.Cells($r,2).Formula='=ENCODEURL(Z99)';      $r++   # 空の セル
  $sh.Cells($r,2).Formula='=ENCODEURL(1/0)';      $r++   # エラー
  $sh.Cells($r,2).Formula='=ENCODEURL(1.5)';      $r++
  Start-Sleep -Milliseconds 400
  $出=@(); $r=1
  foreach($s in $字){ $出 += [pscustomobject]@{ 入=[string]$s; セルの字=$sh.Cells($r,1).Text; text=$sh.Cells($r,2).Text }; $r++ }
  foreach($k in @('123','TRUE','空のセル','1/0','1.5')){
    $出 += [pscustomobject]@{ 入="(式)$k"; text=$sh.Cells($r,2).Text }; $r++ }
  $出 | ConvertTo-Json -Depth 3 | Out-File -FilePath $Out -Encoding utf8
  "書いた … $Out（$($出.Count)件）"
}catch{ "★落ちた★ $($_.Exception.Message)" }
finally{ if($xl){ try{foreach($z in @($xl.Workbooks)){$z.Close($false)}}catch{}; try{$xl.Quit()}catch{} } }
