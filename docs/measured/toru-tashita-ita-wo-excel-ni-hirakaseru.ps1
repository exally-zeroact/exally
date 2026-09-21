# toru-tashita-ita-wo-excel-ni-hirakaseru.ps1
#   -- ★板を 足して 保存した 物を 実Excel に 開かせる★（97）（2026-09-21）
#
#  ★★なぜ★★
#    Exally1 が ア①（足した 板も 書き出す）を 書きました。★まだ 押して いません★。
#    ⇒★作る 人と 数える 人を 分ける★＝私が 実Excel に 開かせて 数えます。
#
#  ★★数える 物（Exally1 の 注文 ＋ 私から）★★
#    ①`Sheet2` が 在るか（A1=123 ／ B1=tashita）
#    ②★元の 判子・罫線・塗り・図形が 1つも 減って いないか★
#    ③元の 板（Sheet1）の 値が 1つも 変わって いないか
#    ④★`Open` が 投げないか★（93 の 測り）
#    ⑤★`calcChain` を 残した ままで 計算が 壊れて いないか★
#       ＝Sheet1 の `=SUM(A1:A3)` が ★4.25★ の まま か
#    ★私から 足す★
#    ⑥★元も 同じ やり方で 開いて 並べる★（★後だけ 見ても「減った」は 分からない★）
#    ⑦★板の 並び★（足した 板が 後ろに 入ったか）
#
#  ★★読むだけ★★（★1バイトも 書きません★・`SaveAs` を 1回も 呼びません）
#
#  ★門★
#    ①貝殻が 5.1（exit 8）／②走らせる 前の Excel が 0個（exit 3）
#    ③★2本 とも 在るか★（exit 4）／④★2本 とも 開けたか★（exit 5）
#
#  使い方: powershell.exe -NoProfile -ExecutionPolicy Bypass -File <この道具>

$版 = $PSVersionTable.PSVersion
Write-Host ('★走らせて いる 貝殻 ... PowerShell ' + $版.ToString() + '★')
if ($版.Major -ne 5) { Write-Host '★★powershell.exe（5.1）で 走らせて ください★★'; exit 8 }

$前 = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'tests\fixtures\kazari-hiraku3.xlsx'
$後 = Join-Path $env:TEMP 'exally-tashita-ita.xlsx'
foreach ($f in $前, $後) {
  if (-not (Test-Path -LiteralPath $f)) { Write-Host ('★★在りません★★ ' + $f); exit 4 }
  Write-Host ('★見る★ ' + $f + ' ／ ' + (Get-Item $f).Length + ' バイト ／ sha256 ' + (Get-FileHash $f -Algorithm SHA256).Hash.ToLower())
}

$数1 = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue).Count
$数2 = @(Get-CimInstance Win32_Process -Filter "Name='EXCEL.EXE'" -ErrorAction SilentlyContinue).Count
Write-Host ('★走らせる 直前の Excel ... ' + $数1 + '個 ／ ' + $数2 + '個★')
if ($数1 -ne 0 -or $数2 -ne 0) { Write-Host '★★Excel が 動いて います＝走らせません★★'; exit 3 }

# ★見る マス★（★元の 材料の 中身は `tsukuru-tameshi-hiraku3-kazari-to-kobore3.ps1` に 書いて あります★）
$見るマス = 'A1', 'A2', 'A3', 'B1', 'C1', 'C2', 'C3', 'D1', 'D5', 'E1', 'A5', 'A10', 'B10', 'C10'

$結果 = @{}
$開けた = 0
foreach ($組 in @(@('mae', $前), @('ato', $後))) {
  $札 = $組[0]; $道 = $組[1]
  Write-Host ''
  Write-Host ('★★' + $札 + '★★ ... ' + (Split-Path $道 -Leaf))
  $xl = New-Object -ComObject Excel.Application
  $bk = $null; $sh = $null
  $投げた = ''
  $出 = @{ 投げた = ''; 板 = @(); 図形 = 0; 値 = @{}; 繋げた = ''; 塗り = 0; 線 = 0 }
  try {
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    try { $bk = $xl.Workbooks.Open($道, $false, $true) }
    catch { $投げた = $_.Exception.Message }
    $出.投げた = $投げた
    if ($null -ne $bk) {
      $開けた++
      for ($i = 1; $i -le [int]$bk.Sheets.Count; $i++) { $出.板 += [string]$bk.Sheets.Item($i).Name }
      $sh = $bk.Sheets.Item(1)
      $出.図形 = [int]$sh.Shapes.Count
      foreach ($m in $見るマス) {
        $c = $sh.Range($m)
        $v = $c.Value2
        $出.値[$m] = if ($null -eq $v) { '(kara)' } else { [string]$v }
      }
      $出.繋げた = [string]$sh.Range('A5').MergeCells
      $出.塗り = [int]$sh.Range('B1').Interior.Color
      $出.線 = [int]$sh.Range('B2').Borders.Item(9).Weight
      # ★足した 板の 中身★
      if ([int]$bk.Sheets.Count -ge 2) {
        $s2 = $bk.Sheets.Item(2)
        $出.板2A1 = [string]$s2.Range('A1').Value2
        $出.板2B1 = [string]$s2.Range('B1').Value2
        $s2 = $null
      }
      $bk.Close($false); $bk = $null
    }
  } finally {
    $sh = $null
    if ($null -ne $bk) { $bk.Close($false) }
    $bk = $null
    $xl.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
    $xl = $null
    $t = [Diagnostics.Stopwatch]::StartNew()
    while ((@(Get-Process -Name EXCEL -ErrorAction SilentlyContinue).Count -gt 0) -and ($t.Elapsed.TotalSeconds -lt 300)) { Start-Sleep -Milliseconds 250 }
  }
  $結果[$札] = $出
  if ($投げた) { Write-Host ('  ★★投げました★★ ' + $投げた) }
  else {
    Write-Host ('  板 ....... ' + ($出.板 -join ' / '))
    Write-Host ('  図形 ..... ' + $出.図形 + '個')
    Write-Host ('  繋げた A5  ' + $出.繋げた + ' ／ 塗り B1 ' + $出.塗り + ' ／ 線 B2 ' + $出.線)
    if ($出.ContainsKey('板2A1')) { Write-Host ('  2枚目 ... A1=' + $出.板2A1 + ' ／ B1=' + $出.板2B1) }
  }
}
if ($開けた -ne 2) { Write-Host ''; Write-Host ('★★開けたのは ' + $開けた + ' / 2 本★★'); exit 5 }

# ══ ★★並べて 数えます★★ ══
Write-Host ''
Write-Host '★★★前と 後を 並べる★★★'
$赤 = 0
$見 = {
  param($札, $前値, $後値, $待ち)
  $合 = if ($待ち -eq 'onaji') { $前値 -eq $後値 } else { $後値 -eq $待ち }
  $印 = if ($合) { 'ok  ' } else { '★赤★' }
  if (-not $合) { $script:赤++ }
  Write-Host ('  ' + $印 + ' ' + $札.PadRight(22) + ' 前 ' + ([string]$前値).PadRight(14) + ' 後 ' + [string]$後値)
}
& $見 '①2枚目が 在る' $結果['mae'].板.Count $結果['ato'].板.Count 2
& $見 '①2枚目 A1' '-' $結果['ato'].板2A1 '123'
& $見 '①2枚目 B1' '-' $結果['ato'].板2B1 'tashita'
& $見 '②図形の 数' $結果['mae'].図形 $結果['ato'].図形 'onaji'
& $見 '②繋げた マス A5' $結果['mae'].繋げた $結果['ato'].繋げた 'onaji'
& $見 '②塗り B1' $結果['mae'].塗り $結果['ato'].塗り 'onaji'
& $見 '②線 B2' $結果['mae'].線 $結果['ato'].線 'onaji'
foreach ($m in $見るマス) { & $見 ('③値 ' + $m) $結果['mae'].値[$m] $結果['ato'].値[$m] 'onaji' }
& $見 '④投げなかった' '(なし)' $結果['ato'].投げた ''
& $見 '⑦1枚目の 名' $結果['mae'].板[0] $結果['ato'].板[0] 'onaji'

Write-Host ''
Write-Host ('★★赤 ... ' + $赤 + '件★★')
if ($赤 -ne 0) { exit 1 }
