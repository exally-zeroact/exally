# toru-jitsu-excel-no-sel-shoshiki-wareki-keika.ps1
#   -- ★和暦（g/e）と 経過時間（[h]）を ★マスの 書式★ に した 時、実Excel が 画面に 出す 字（.Text）を 取る★（132）（2026-10-02）
#
#  ★★なぜ★★
#    Exally1 の 依頼（10-02）＝TEXT_era_wareki ／ TEXT_elapsed_hours を 作る 前の 物差し。
#    ★TEXT 関数の 答え★は tools/golden-excel.ps1 の 真値（cases/61-text-wareki-keika.json）で 取った。
#    ★画面の 道（マスの 書式）は TEXT と 同じとは 限らない★ ⇒ ここで 別に 取る（㋒）。
#
#  ★★司さんの 本は 使いません★★＝★新しい 空の 本★に 日付と 数を 置くだけ（★お客さんの 数字は 入りません★）
#    ⇒★出来た tsv は repo に 置いて よい★
#
#  ★★取り方★★
#    ・値は ★式（=DATE(...) ／ =0.5）★で 置く（★化けない 為★）
#    ・書式は ★.NumberFormatLocal★ に 渡す（★画面で 人が 打つ 字と 同じ★）
#      ＝★.NumberFormat（US）も 読み戻して 並べる★（★Excel が どう 受け取ったか★）
#    ・列の 幅は 60＝★`####` で 字が 隠れない 様に★（★`####` が 出たら 数える★）
#
#  ★★門★★
#    ①5.1（exit 8）／②走らせる 前の Excel が 0個（exit 3）★他の 席を 閉じません★
#    ③★頼んだ 数 ≠ 書いた 数 なら 赤（exit 6）★
#
#  使い方:
#    powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/measured/toru-jitsu-excel-no-sel-shoshiki-wareki-keika.ps1 -出す先 <tsv>

param([string]$出す先 = '')

$版 = $PSVersionTable.PSVersion
Write-Host ('★走らせて いる 貝殻 ... PowerShell ' + $版.ToString() + '★')
if ($版.Major -ne 5) { Write-Host '★★powershell.exe（5.1）で 走らせて ください★★'; exit 8 }
if (-not $出す先) { Write-Host '★★-出す先 を 渡して ください★★'; exit 4 }

$数1 = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue).Count
$数2 = @(Get-CimInstance Win32_Process -Filter "Name='EXCEL.EXE'" -ErrorAction SilentlyContinue).Count
Write-Host ('★走らせる 直前の Excel ... ' + $数1 + '個 ／ ' + $数2 + '個★')
if ($数1 -ne 0 -or $数2 -ne 0) { Write-Host '★★Excel が 動いて います＝走らせません★★'; exit 3 }

# ★Exally1 の 依頼 そのまま★
$日付 = @('1900,1,1', '1912,7,29', '1912,7,30', '1926,12,24', '1926,12,25', '1989,1,7', '1989,1,8',
  '2019,4,30', '2019,5,1', '2020,1,1', '2026,1,31')
$和暦の書式 = @('g', 'gg', 'ggg', 'e', 'ee', 'ge.m.d', 'ggge年m月d日', 'gggee年', '[$-ja-JP]ggge年')
$値 = @('0', '0.5', '1.5', '46234', '1/24/60*59.5/60', '0.999999', '-1.5')
$経過の書式 = @('[h]:mm', '[hh]:mm', '[h]:mm:ss', '[m]:ss', '[mm]:ss', '[s]', '[h]', '[h]:mm:ss.00')

$頼 = New-Object System.Collections.ArrayList
foreach ($d in $日付) { foreach ($f in $和暦の書式) { [void]$頼.Add(@('W', ('=DATE(' + $d + ')'), $f)) } }
foreach ($v in $値) { foreach ($f in $経過の書式) { [void]$頼.Add(@('K', ('=' + $v), $f)) } }
Write-Host ('★頼んだ 数★ ' + $頼.Count)

$xl = New-Object -ComObject Excel.Application
$wb = $null; $ws = $null; $c = $null
$行 = New-Object System.Collections.ArrayList
$版xl = ''
$隠れ = 0
try {
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  $版xl = [string]$xl.Version + ' build ' + [string]$xl.Build
  $wb = $xl.Workbooks.Add()
  $ws = $wb.Worksheets.Item(1)
  $ws.Columns.Item(1).ColumnWidth = 60
  $r = 1
  foreach ($q in $頼) {
    $c = $ws.Cells.Item($r, 1)
    $c.Formula = [string]$q[1]
    $誤 = ''
    try { $c.NumberFormatLocal = [string]$q[2] } catch { $誤 = 'NumberFormatLocal が 投げた: ' + $_.Exception.Message }
    $字 = [string]$c.Text
    if ($字 -match '^#+$') { $隠れ++ }
    $us = [string]$c.NumberFormat
    $lo = [string]$c.NumberFormatLocal
    [void]$行.Add(($q[0] + "`t" + $q[1] + "`t" + $q[2] + "`t" + $字 + "`t" + $us + "`t" + $lo + "`t" + $誤))
    $c = $null
    $r++
  }
  $wb.Close($false)
} finally {
  $c = $null; $ws = $null; $wb = $null
  $xl.Quit()
  $xl = $null
}

$書 = New-Object System.IO.StreamWriter($出す先, $false, (New-Object System.Text.UTF8Encoding($false)))
$書.NewLine = "`n"
$書.WriteLine('# 132 実Excel のマスの書式としての .Text（和暦・経過時間）／Excel ' + $版xl + '／頼んだ ' + $頼.Count + '／書いた ' + $行.Count)
$書.WriteLine("組`t値の式`t渡した書式(Local)`t画面の字(.Text)`t読み戻し(.NumberFormat US)`t読み戻し(.NumberFormatLocal)`t誤り")
foreach ($l in $行) { $書.WriteLine($l) }
$書.Close()

Write-Host ('★Excel★ ' + $版xl)
Write-Host ('★頼んだ ' + $頼.Count + ' ／ 書いた ' + $行.Count + ' ／ `####` で 隠れた ' + $隠れ + '★')
if ($頼.Count -ne $行.Count) { Write-Host '★★頼んだ 数と 書いた 数が 違います★★'; exit 6 }
