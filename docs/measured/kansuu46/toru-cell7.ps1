# toru-cell7.ps1 — ★通貨（¥）の 見分け方を 決める★（2026-09-07）
#
#  ★3回目で 引っかかった 所★
#    `\¥#,##0` を 入れたら 実Excel は ★`¥¥#,##0` に 直して★ 持った。
#    ⇒★日本語の Excel では ¥ が ★逃がしの 記号★（英語の `\`）も 兼ねる★
#    ⇒★「¥ が 在れば 通貨」で 本当に 良いのか★を 確かめないと
#      ★半分 合う 計算★に なる（`¥-0` の ¥ は 逃がしの 記号）
#
#  ★聞く事★
#    ①`"¥"#,##0`（字の かたまりに 入れた ¥）は C0 か
#    ②`¥#,##0`（裸の ¥）は C0 か
#    ③`¥-0`（¥ が 逃がしの 記号）は C0 か F0 か
#    ④`$#,##0` は やはり ,0 か（3回目と 同じに なるか）
#    ⑤`"円"#,##0` `#,##0"円"` は 通貨に なるか
#
#  使い方: powershell -File docs/measured/kansuu46/toru-cell7.ps1

$ErrorActionPreference = 'Stop'
$ここ = Split-Path -Parent $MyInvocation.MyCommand.Path
$出 = Join-Path $ここ 'golden-cell7-2026-09-07.tsv'

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
$版 = $xl.Version; $ビルド = $xl.Build
$wb = $xl.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)

$結果 = New-Object System.Collections.ArrayList
$Y = [char]0xA5      # ¥
$形たち = @(
  ('"' + $Y + '"#,##0'), ($Y + '#,##0'), ($Y + '-0'), ($Y + $Y + '#,##0'),
  '$#,##0', '"$"#,##0',
  '"円"#,##0', '#,##0"円"',
  ($Y + '#,##0.00'), ($Y + '#,##0;[赤]-' + $Y + '#,##0'),
  '0.00%;[赤]0.00%', '#,##0.0;[青]#,##0.0'
)
$r = 1
foreach ($f in $形たち) {
  $c = $ws.Cells.Item($r, 1)
  $c.Value2 = 1234.5678
  $付いた = $true
  try { $c.NumberFormatLocal = $f } catch {
    $付いた = $false
    [void]$結果.Add(("CELL`t(表示形式を 付けられない)`t★付かない★`t表示形式 {0}" -f $f))
  }
  if ($付いた) {
    $実 = [string]$c.NumberFormatLocal
    foreach ($k in @('format', 'color', 'parentheses')) {
      $ws.Range('H1').Formula = '=CELL("' + $k + '",A' + $r + ')'
      $v = $ws.Range('H1').Value2
      $答 = if ($null -eq $v) { '(空)' } elseif ($v -is [double]) { $v.ToString('R', [System.Globalization.CultureInfo]::InvariantCulture) } else { [string]$v }
      [void]$結果.Add(("CELL`t=CELL(""{0}"",A{1})`t{2}`t入れた 形 {3}（実際に 付いた 形 {4}）" -f $k, $r, $答, $f, $実))
    }
  }
  $r++
}

$wb.Close($false); $xl.Quit()
foreach ($o in @($ws, $wb, $xl)) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($o) | Out-Null }

$頭 = @(
  "# ★実Excel に 打たせた CELL の 答え（7回目・通貨の 見分け方）★",
  "# 取った 日 … 2026-09-07",
  "# ★どの Excel で 打ったか★ … 版 $版 ／ build $ビルド",
  "# ★A列に 1234.5678 を 置いて 表示形式だけ 変えた★",
  "# 関数`t式`t実Excel の 答え`tどんな 場面か"
)
[System.IO.File]::WriteAllText($出, ((($頭 + $結果) -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
Write-Host "★書いた … $出（$($結果.Count) 本）★"
