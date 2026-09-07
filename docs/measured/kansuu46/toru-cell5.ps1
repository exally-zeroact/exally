# toru-cell5.ps1 — ★CELL("format") の 日付・時刻の 合図を 詰める★（2026-09-07）
#
#  ★3回目で 分かった 事★
#    D1 … 年+月+日 ／ D2 … 月+年 ／ D3 … 月+日 ／ D6〜D9 … 時刻
#  ★でも まだ 決まらない 形が 在る★（★どちらでも 合う 組で 決めない★）
#    ・年だけ（yyyy）／月だけ（mmm）／日だけ（dd）
#    ・秒だけ（ss）／分:秒（mm:ss）／経過時間（[h]:mm）
#    ・年+月（yyyy/m）／日+年（d-mmm-yyyy）
#    ・★D4・D5 が 出る 形が 在るのか★（3回目では 1本も 出なかった）
#
#  使い方: powershell -File docs/measured/kansuu46/toru-cell5.ps1

$ErrorActionPreference = 'Stop'
$ここ = Split-Path -Parent $MyInvocation.MyCommand.Path
$出 = Join-Path $ここ 'golden-cell5-2026-09-07.tsv'

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
$版 = $xl.Version; $ビルド = $xl.Build
$wb = $xl.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)

$結果 = New-Object System.Collections.ArrayList
$形たち = @(
  'yyyy', 'yy', 'mmm', 'mmmm', 'dd', 'd', 'aaa', 'aaaa',
  'ss', 'mm:ss', 'h', '[h]:mm', '[mm]:ss',
  'yyyy/m', 'yyyy"年"m"月"', 'd-mmm-yyyy', 'yyyy/m/d h:mm:ss',
  'm/d/yy', 'mm/dd/yy', 'dd/mm/yy', 'yy/m/d',
  '0.00_ ', '#,##0"円"', '"("#,##0")"', '0"個"',
  '[>100]0;[<=100]0.00', '_-* #,##0_-;-* #,##0_-;_-* "-"_-;_-@_-'
)
$r = 1
foreach ($f in $形たち) {
  $c = $ws.Cells.Item($r, 1)
  $c.Value2 = 45293.5
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
      [void]$結果.Add(("CELL`t=CELL(""{0}"",A{1})`t{2}`t表示形式 {3}（実際に 付いた 形 {4}）" -f $k, $r, $答, $f, $実))
    }
  }
  $r++
}

$wb.Close($false); $xl.Quit()
foreach ($o in @($ws, $wb, $xl)) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($o) | Out-Null }

$頭 = @(
  "# ★実Excel に 打たせた CELL の 答え（5回目・日付/時刻の 合図を 詰める）★",
  "# 取った 日 … 2026-09-07",
  "# ★どの Excel で 打ったか★ … 版 $版 ／ build $ビルド",
  "# ★A列に 45293.5（2024/1/2 12:00）を 置いて 表示形式だけ 変えた★",
  "# 関数`t式`t実Excel の 答え`tどんな 場面か"
)
[System.IO.File]::WriteAllText($出, ((($頭 + $結果) -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
Write-Host "★書いた … $出（$($結果.Count) 本）★"
