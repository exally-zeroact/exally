# toru-tsunagi.ps1 — ★実Excel に「つなぎ」を 聞き直す★（2026-09-11）
#
#   ★★何の 為か★★
#     `lib/shiki-keisan.js`（＋−×÷＾＆ 大小 ％）の 答えは
#     ★全部 実Excel に 打って 測った 物★です（162通り・当て推量 0）。
#     ★その 測り直しが 出来ないと「162通り」は 中身の 無い 数字に なります★
#     （2026-08-29 の「実Excel 507個」が 消える場所に 置いて 消えた の と 同じ）
#
#   ★★使い方★★
#     pwsh -NoProfile -File docs/measured/toru-tsunagi.ps1
#       ⇒ docs/measured/golden-tsunagi-2026-09-11.tsv を 作り直す
#     node docs/measured/osu-tsunagi.mjs
#       ⇒ ★その 紙と 見張りの 中の 162通りを 突き合わせる★
#
#   ★★打つ 字は 見張りから 取ります★★（tests/shiki-keisan.test.mjs）
#     ★2か所に 同じ 表を 書きません★＝食い違いが 起きない
#
#   ★D1 は 何も 入って いない マス★（空マス）＝空の 字 "" とは 別物
#   ★Excel を 1つ 開いて 打つだけ★＝お金は かかりません
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$見張り = Join-Path $ROOT 'tests/shiki-keisan.test.mjs'
if (-not (Test-Path $見張り)) { throw "★見張りが 無い … $見張り★" }

# ── ★見張りの 中の 〔式, 答え〕から ★式だけ★ 取り出す★ ──
$中 = Get-Content -Raw -Encoding UTF8 $見張り
$式たち = @()
foreach ($m in [regex]::Matches($中, "\['(=[^']*)'\s*,")) { $式たち += $m.Groups[1].Value }
if ($式たち.Count -lt 100) { throw "★式が $($式たち.Count)本 しか 取れない★（162本 のはず）" }
Write-Host "★見張りから 取り出した 式 … $($式たち.Count)本★"

$x = New-Object -ComObject Excel.Application
$x.Visible = $false
$x.DisplayAlerts = $false
$wb = $x.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)
$ws.Columns.Item(1).ColumnWidth = 60    # ★字が 切れると 測り違える★（09-11 に 踏んだ）

$out = @()
$out += "# ★実Excel に「つなぎ」を 打って 読んだ 紙★（2026-09-11）"
$out += "# ★D1 は 空マス★／★列の 幅を 60に 広げて 字が 切れないように して 在る★"
$out += "# 打った字`t出た字`t中の値"
$r = 2                                   # ★1行目は 使わない★（D1 を 空の ままに する為 上の 行に 書く）
foreach ($f in $式たち) {
  $c = $ws.Range('A' + $r)
  try   { $c.Formula = $f; $out += ($f + "`t" + $c.Text + "`t" + $c.Value2) }
  catch { $out += ($f + "`t★打てない★`t") }
  $r++
}
$wb.Close($false)
$x.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null

$紙 = Join-Path $PSScriptRoot 'golden-tsunagi-2026-09-11.tsv'
$out -join "`n" | Out-File -Encoding utf8 $紙
Write-Host "★書いた … $紙★"
Write-Host ""
Write-Host "★次に これを 走らせて ください★"
Write-Host "  node docs/measured/osu-tsunagi.mjs"
