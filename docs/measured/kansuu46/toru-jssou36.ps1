# toru-jssou36.ps1 — ★JS層の 36個を 実Excel に 聞く★（2026-09-08）
#
#  ★★なぜ 要るか★★
#    ★JS層が 本当に 受ける 26個の うち 答えを 確かめたのは ★2個だけ★★
#      （ISOMITTED・LINEST）
#    ★死にコードだった 12個は ★12個 とも 金の紙に 0本★★
#    ⇒ 26 − 2 ＋ 12 ＝ ★★36個★★
#    ⇒★見た 3個の うち 2個が 壊れていた（N・DATESTRING）＝★当たりの 密度が 高い★★
#
#  ★★押す 順★★ … ★XLOOKUP を 先頭★
#    ⇒★お客さんが 一番 使う 関数の 1つ／★1本も 確かめていない★★（指示役 2026-09-08）
#
#  ★★やり方（金の紙と 同じ）★★
#    ①引数の 形の 候補を 用意する（★人が 決めるのは ここだけ★）
#    ②★実Excel が 誤りに しなかった 形★を その 関数の「正しい 呼び方」に する
#    ③その 式と 答えを 紙に 書く
#    ⇒★私が 手で 答えを 書いては いけない★
#
#  ★出す 形（★他の 21枚と 同じ★）★
#    ★式の 一番外側の 関数名★ / 式 / 実Excel の 答え / 型
#    ⇒★1列目が 札だと ★grep で 数える 道具から 漏れる★（2026-09-08 に 踏んだ）
#
#  ★司さんの 実物には 触りません★＝新しい ブックを 開き、保存せずに 閉じる
#
#  使い方: powershell -File docs/measured/kansuu46/toru-jssou36.ps1

$ErrorActionPreference = 'Stop'
$ここ = Split-Path -Parent $MyInvocation.MyCommand.Path
$出 = Join-Path $ここ 'golden-jssou36-2026-09-08.tsv'

# ★誤りの 番号 → 名前★（★新しい 6種を 含む★＝表に 無い 番号は「数」として 紙に 載ってしまう）
$誤りの番号 = @{
  -2146826288 = '#NULL!'; -2146826281 = '#DIV/0!'; -2146826273 = '#VALUE!';
  -2146826265 = '#REF!';  -2146826259 = '#NAME?';  -2146826252 = '#NUM!';
  -2146826246 = '#N/A';
  -2146826243 = '#SPILL!';   -2146826242 = '#CONNECT!'; -2146826241 = '#BLOCKED!';
  -2146826240 = '#UNKNOWN!'; -2146826239 = '#FIELD!';   -2146826238 = '#CALC!'
}

# ★★押す 36個（★XLOOKUP を 先頭★）★★
#   ⇒ 名前は ★道具が 数えた 物★（_jsSet 26個 − 確かめ済み 2個 ＋ 死にコード 12個）
$名簿 = @(
  'XLOOKUP',
  'N', 'DATESTRING', 'OFFSET', 'FREQUENCY', 'PERCENTILE', 'QUARTILE', 'BINOM',
  'DSUM', 'DAVERAGE', 'DCOUNT', 'DCOUNTA', 'DMAX', 'DMIN', 'DPRODUCT',
  'DSTDEV', 'DSTDEVP', 'DVAR', 'DVARP', 'DGET',
  'MAKEARRAY', 'MAP', 'REDUCE', 'SCAN', 'XIRR',
  'MODE', 'TRIMMEAN', 'PERCENTRANK', 'KURT', 'INTERCEPT', 'FORECAST',
  'IRR', 'GESTEP', 'PERMUT', 'PERMUTATIONA', 'MDETERM'
)
Write-Host ('★名簿 ' + $名簿.Count + '個★（36個の はず）')
if ($名簿.Count -ne 36) { throw ('★名簿が ' + $名簿.Count + '個＝36個 では ない★') }

# ★引数の 形の 候補★（★人が 決めるのは ここだけ★）
#   `{F}` は 関数名に 置き換わる
$候補 = @(
  '={F}(A1:A5)',
  '={F}(A1:A5,B1:B5)',
  '={F}(A1:A5,2)',
  '={F}(A1:A5,0.2)',
  '={F}(3,A1:A5,B1:B5)',
  '={F}(3,A1:A5)',
  '={F}(5,2)',
  '={F}(2)',
  '={F}(5)',
  '={F}(TRUE)',
  '={F}("あ")',
  '={F}(A1)',
  '={F}(C1)',
  '={F}(F1:I3,"数",K1:K2)',
  '={F}(F1:I3,3,K1:K2)',
  '={F}(A1:B2)',
  '={F}(A1,0,0)',
  '={F}(A1,0,0,2,2)',
  '={F}(2,2,LAMBDA(r,c,r*c))',
  '={F}(A1:A5,LAMBDA(x,x*2))',
  '={F}(0,A1:A5,LAMBDA(a,b,a+b))',
  '={F}(A1:A5,B1:B5,0.1)',
  '={F}(A1:A5,B1:B5,C1:C5)'
)

Write-Host '★実Excel を 開きます（新しい ブック・保存しません）★'
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
  $bk = $xl.Workbooks.Add()
  $sh = $bk.Worksheets.Item(1)

  # ★土台★（金の紙と 同じ ＋ D系の 為の 台）
  for ($r = 1; $r -le 5; $r++) {
    $sh.Cells.Item($r, 1).Value2 = $r          # A1:A5 = 1..5
    $sh.Cells.Item($r, 2).Value2 = $r * 2      # B1:B5 = 2,4,6,8,10
  }
  $sh.Range('C1').Value2 = 0                   # ★0 を 置く（|| が 落とすか 見る）★
  $sh.Range('C2').Value2 = 3
  $sh.Range('C3').Value2 = 0.1
  $sh.Range('C4').Value2 = 0.2
  $sh.Range('C5').Value2 = 1
  # ★D系の 台★（F1:I3）と 条件（K1:K2）
  $sh.Range('F1').Value2 = '名'; $sh.Range('G1').Value2 = '組'; $sh.Range('H1').Value2 = '数'; $sh.Range('I1').Value2 = '日'
  $sh.Range('F2').Value2 = 'あ'; $sh.Range('G2').Value2 = 'X'; $sh.Range('H2').Value2 = 10; $sh.Range('I2').Value2 = 1
  $sh.Range('F3').Value2 = 'い'; $sh.Range('G3').Value2 = 'X'; $sh.Range('H3').Value2 = 20; $sh.Range('I3').Value2 = 2
  $sh.Range('K1').Value2 = '組'; $sh.Range('K2').Value2 = 'X'

  $行 = New-Object System.Collections.Generic.List[string]
  $行.Add('# ★JS層の 36個を 実Excel に 聞いた★（2026-09-08）')
  $行.Add('# ★JS層が 受ける 26個の うち 確かめたのは 2個だけ／死にコードだった 12個は 全部 0本★')
  $行.Add('# ★1列目＝式の 一番外側の 関数名★（他の 21枚と 同じ 形）')
  $行.Add('# ★土台★ A1:A5=1..5 / B1:B5=2,4,6,8,10 / C1=0 C2=3 C3=0.1 C4=0.2 C5=1 / F1:I3=台 / K1:K2=条件')
  $行.Add('# 関数' + "`t" + '式' + "`t" + '実Excel の 答え' + "`t" + '型')

  $本数 = 0; $見つかった = 0; $無し = 0; $i = 0
  foreach ($f in $名簿) {
    $i++
    Write-Host ('  ' + $i + '/' + $名簿.Count + '  ' + $f)
    $当たり = 0
    foreach ($かた in $候補) {
      $式 = $かた.Replace('{F}', $f)
      $値 = $null; $型 = ''
      try {
        $sh.Range('N1').Formula = $式
        $v = $sh.Range('N1').Value2
        if ($null -eq $v) { continue }
        if (($v -is [int] -or $v -is [long]) -and $誤りの番号.ContainsKey([int]$v)) { continue }
        if ($v -is [bool]) { $値 = if ($v) { 'True' } else { 'False' }; $型 = 'Boolean' }
        elseif ($v -is [double]) { $値 = [string]$v; $型 = 'Double' }
        elseif ($v -is [int] -or $v -is [long]) { $値 = [string]$v; $型 = 'Int32' }
        else { $値 = [string]$v; $型 = 'String' }
      } catch { continue }
      if ($null -eq $値 -or $値 -eq '') { continue }
      $行.Add($f + "`t" + $式 + "`t" + $値 + "`t" + $型)
      $本数++; $当たり++
    }
    if ($当たり -gt 0) { $見つかった++ } else { $無し++; Write-Host ('    ★呼び方が 見つからない★') }
  }

  $行.Insert(4, ('# ★数★ 関数 ' + $名簿.Count + '個 ／ 呼び方あり ' + $見つかった + '個 ／ なし ' + $無し + '個 ／ 式 ' + $本数 + '本'))
  [System.IO.File]::WriteAllLines($出, $行, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ''
  Write-Host ('★★関数 ' + $名簿.Count + '個 ／ 呼び方あり ' + $見つかった + ' ／ なし ' + $無し + ' ／ 式 ' + $本数 + '本★★')
  Write-Host ('★書いた … ' + $出 + '★')

  $bk.Close($false)
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
}
