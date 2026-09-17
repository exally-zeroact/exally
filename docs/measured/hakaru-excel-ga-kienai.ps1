# hakaru-excel-ga-kienai.ps1 — ★Excel が 終われない 訳を 測る★（2026-09-18）
#
#  ★★なぜ 要るか（★数で★）★★
#    7枠目 … ★押すのに 0.35秒／全体 304秒★ ＝★★仕事は 0.1%★★
#    今日 実Excel の 枠を ★7回★ 使いました ＝★2,100秒の うち 約 2,098秒が 待ち★
#    ★まだ 枠が 要る 物が 名指しで 残って います★
#      ASC/DBCS の 全部の 字／AGGREGATE の 19×8／XMATCH の 字の 型紙／TEXTAFTER の 残り
#    ⇒★★先に 直す 方が 安い★★（経営者1 と 私の 判じが 一致）
#
#  ★★repo を 先に 探しました（★作る前に 探せ★）★★
#    `toru-*.ps1` は ★34本★。★放し方を 数えました★:
#      ★33本★ … `ReleaseComObject($xl)` だけ／`$null` 0／`GC` 0
#      ★1本だけ 違う★ … `toru-jitsubutsu-shoshiki.ps1`
#        ＝`Quit` → `ReleaseComObject($xl)` → ★finally の 外で★ `GC::Collect` ＋
#          `WaitForPendingFinalizers` ／ 待ちは ★10秒で 諦める★
#        ＝★★`.Range(` を 1回も 使って いません★★
#    ★記憶に 在る 数★ `reference_excel_com_kieru_made_59byou`
#      ＝★26件 押した 後に ★59秒で 消えた★★（2026-09-15 実測）
#    ⇒★★見立て … 掴んだ Range の 数が 増えると 消えるのに かかる 時間が 延びる★★
#      26件 → 59秒 ／ 91件×2窓 → ★300秒 超でも 消えない★
#
#  ★★★経営者1 の 注文から 1つ 変えました（★先に 断ります★）★★★
#    ★注文★ … 「★式 1本だけ★ の 小さい `.ps1` で 4通りを 測る」
#    ★変えた 訳★ … ★★式 1本では 300秒に ならない かも しれません★★
#      ＝★問題は「掴んだ Range の 数」だと 見て います★
#      ＝★1本で 全部 5秒なら ★何も 測れて いません★★
#    ⇒★★本数も 動かします★★
#      回0 … ★1本★・今の まま …………★対照（★これが 速ければ 本数が 効いて いる★）
#      回1 … ★91本★・今の まま ………★これが 300秒に なる はず★
#      回2 … 91本・＋Range を 1本ずつ `$null`
#      回3 … 91本・＋`$sh`／`$bk`／`$xl` も `$null`
#      回4 … 91本・＋`ReleaseComObject` を 掴んだ物ごと ＋ `GC` 2回
#    ⇒★★1つずつ 足します＝どれが 効いたかを 残す★★（経営者1 の 注文どおり）
#
#  ★★門★★
#    ①★式は `=1+1`★（★何も 呼ばない＝測って いるのは 消え方だけ★）
#    ②★走らせる たびに Excel を 2つの 道具で 数える★
#    ③★★60秒で 諦める★★（300秒 × 5回＝25分を 使わない）
#    ④★★消えなければ ★自分が 起こした PID だけ★ を 止める★★
#        ＝開く 前後の PID を 数えて ★差だけ★ を 止めます
#        ＝★司さんが 開いて いる Excel には 触りません★
#    ⑤★BOM★
#    ⑥★★司さんの ブックを 開く 字 0件★★（新しい 空の ブックだけ）
#    ⑦★押した 秒と 消えるまでの 秒を ★別々に★ 書く★
#
#  使い方: pwsh -NoProfile -File docs/measured/hakaru-excel-ga-kienai.ps1

$ErrorActionPreference = 'Stop'
$ここ = Split-Path -Parent $MyInvocation.MyCommand.Path
$出 = Join-Path $ここ 'golden-excel-kienai-2026-09-18.tsv'

function 今のPID { return @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }) }

function 一回測る {
  param([string]$名, [int]$本数, [bool]$RangeをNull, [bool]$入れ物もNull, [bool]$ReleaseとGC)

  $数1 = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue).Count
  $数2 = @(Get-CimInstance Win32_Process -Filter "Name='EXCEL.EXE'" -ErrorAction SilentlyContinue).Count
  if ($数1 -ne 0 -or $数2 -ne 0) {
    Write-Host ('★★' + $名 + ' … Excel が 動いて います（' + $数1 + '／' + $数2 + '）＝測りません★★')
    return [pscustomobject]@{ 名 = $名; 本数 = $本数; 押し秒 = -1; 消え秒 = -1; 消えた = '(測れず)'; 止めた = 0 }
  }

  $前PID = 今のPID
  $xl = New-Object -ComObject Excel.Application
  $後PID = 今のPID
  $自分のPID = @($後PID | Where-Object { $前PID -notcontains $_ })

  $押し時計 = [Diagnostics.Stopwatch]::StartNew()
  try {
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    $bk = $xl.Workbooks.Add()
    $sh = $bk.Sheets.Item(1)
    for ($i = 1; $i -le $本数; $i++) {
      $c = $sh.Range('A' + $i)
      $c.Formula = '=1+1'
      $null = $c.Value2
      if ($ReleaseとGC) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($c) }
      if ($RangeをNull) { $c = $null }
    }
    $bk.Close($false)
  } finally {
    $押し時計.Stop()
    if ($ReleaseとGC) {
      foreach ($o in @($sh, $bk)) { if ($null -ne $o) { try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($o) } catch {} } }
    }
    if ($入れ物もNull) { $sh = $null; $bk = $null }
    $xl.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
    if ($入れ物もNull) { $xl = $null }
    if ($ReleaseとGC) {
      [System.GC]::Collect()
      [System.GC]::WaitForPendingFinalizers()
      [System.GC]::Collect()
    }
  }

  # ★③60秒で 諦める★
  $消え時計 = [Diagnostics.Stopwatch]::StartNew()
  while ((@(Get-Process -Id $自分のPID -ErrorAction SilentlyContinue).Count -gt 0) -and ($消え時計.Elapsed.TotalSeconds -lt 60)) {
    Start-Sleep -Milliseconds 250
  }
  $消え時計.Stop()
  $残り = @(Get-Process -Id $自分のPID -ErrorAction SilentlyContinue)
  $消えた = if ($残り.Count -eq 0) { '★消えた★' } else { '★★消えなかった★★' }
  $止めた = 0
  # ★④自分が 起こした PID だけ 止める★
  foreach ($p in $残り) { try { Stop-Process -Id $p.Id -Force -ErrorAction Stop; $止めた++ } catch {} }
  Start-Sleep -Milliseconds 500

  $押し秒 = [math]::Round($押し時計.Elapsed.TotalSeconds, 2)
  $消え秒 = [math]::Round($消え時計.Elapsed.TotalSeconds, 2)
  Write-Host ('  ' + $名.PadRight(34) + ' 本数 ' + ([string]$本数).PadLeft(3) +
    ' ／ 押し ' + ([string]$押し秒).PadLeft(6) + '秒 ／ 消えるまで ' + ([string]$消え秒).PadLeft(6) + '秒 ／ ' +
    $消えた + $(if ($止めた) { ' ／ ★' + $止めた + '個 止めました★' } else { '' }))
  return [pscustomobject]@{ 名 = $名; 本数 = $本数; 押し秒 = $押し秒; 消え秒 = $消え秒; 消えた = $消えた; 止めた = $止めた }
}

Write-Host ''
Write-Host '★★Excel が 終われない 訳を 測ります★★（★1つずつ 足します★）'
Write-Host ''

$結果 = New-Object System.Collections.Generic.List[object]
$結果.Add((一回測る -名 '回0 対照（1本・今のまま）'          -本数 1  -RangeをNull $false -入れ物もNull $false -ReleaseとGC $false))
$結果.Add((一回測る -名 '回1 今のまま'                        -本数 91 -RangeをNull $false -入れ物もNull $false -ReleaseとGC $false))
$結果.Add((一回測る -名 '回2 ＋Range を 1本ずつ null'          -本数 91 -RangeをNull $true  -入れ物もNull $false -ReleaseとGC $false))
$結果.Add((一回測る -名 '回3 ＋sh/bk/xl も null'               -本数 91 -RangeをNull $true  -入れ物もNull $true  -ReleaseとGC $false))
$結果.Add((一回測る -名 '回4 ＋Release と GC 2回'              -本数 91 -RangeをNull $true  -入れ物もNull $true  -ReleaseとGC $true))

$行 = New-Object System.Collections.Generic.List[string]
$行.Add('# ★Excel が 終われない 訳を 測る★（2026-09-18）')
$行.Add('#')
$行.Add('# ★式は =1+1★（何も 呼ばない＝測って いるのは ★消え方だけ★）')
$行.Add('# ★60秒で 諦める★／★消えなければ 自分が 起こした PID だけ 止める★')
$行.Add('# ★1つずつ 足す★＝★どれが 効いたかを 残す★')
$行.Add('#')
$行.Add('# ★記憶に 在る 数★ 26件 押した 後に ★59秒で 消えた★（2026-09-15）')
$行.Add('# ★7枠目★ 91本×2窓 ⇒ ★300.2秒 待っても 消えなかった★')
$行.Add('#')
$行.Add('# 名' + "`t" + '本数' + "`t" + '押し秒' + "`t" + '消え秒' + "`t" + '消えたか' + "`t" + '止めた個数')
foreach ($r in $結果) {
  $行.Add($r.名 + "`t" + $r.本数 + "`t" + $r.押し秒 + "`t" + $r.消え秒 + "`t" + $r.消えた + "`t" + $r.止めた)
}
[System.IO.File]::WriteAllText($出, ($行 -join "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Host ''
Write-Host ('★書いた … ' + $出 + '（' + $結果.Count + '行）★')
Write-Host ''
Write-Host '★★秒が 毎回 同じなら ★上限に 当てて いる★ か ★空振り★ を 疑う★★'
Write-Host ''
$のこり = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue).Count
Write-Host ('★終わりの Excel … ' + $のこり + '個★（0で あるべき）')
