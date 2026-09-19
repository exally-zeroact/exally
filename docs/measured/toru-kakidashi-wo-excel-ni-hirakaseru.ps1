# toru-kakidashi-wo-excel-ni-hirakaseru.ps1
#   -- ★うちが 書き出した .xlsx を 実Excel に 開かせる★（㊶）（2026-09-20）
#
#  ★★なぜ★★
#    司さん（2026-09-16）「Exally と Excel に 引き渡しても ちゃんと 動くか
#      ★実際に 動作確認しながら★ やれよ」
#    ⇒★溢れ（スピル）を 書き出した ファイルを ★実Excel が どう 読むか★ は 未測定★
#
#  ★★先に 分かって いる 差（XML を 直に 読んだ）★★
#    ★実Excel★ `<c r="D1" cm="1"><f t="array" ref="D1:D3">_xlfn.SEQUENCE(3)</f><v>1</v></c>`
#    ★うち★   `<c r="D1"><f>_xlfn.SEQUENCE(3)</f><v>1</v></c>`
#    ⇒★`cm=` `t="array"` `ref=` が ★3つとも 在りません★★
#    ⇒★でも D2 D3 には ★値だけ★ 書いて ある★
#    ⇒★★だから 開いた 時に ★溢れ先が 塞がって #SPILL!★ に なる 恐れが 在ります★★
#
#  ★★開く 門（★ここが 大事★）★★
#    ★この 道具は ★1本の ファイルしか 開けません★★
#      `%TEMP%\exally-kakidashi.xlsx`（★うちの 画面が 書き出した 物★）
#    ・★名前が 1文字でも 違えば 走りません（exit 7）★
#    ・★`.xlsb` や 司さんの 実物の 名は 1文字も 在りません★
#    ・★読むだけ★（★保存しません／`$bk.Close($false)`★）
#
#  ★他の 門★
#    ①走らせる 前の Excel が 0個（exit 3）／②貝殻が powershell.exe（5.1）（exit 8）
#    ③開く ファイルが 無ければ 走らない（exit 6）
#
#  使い方: powershell.exe -NoProfile -ExecutionPolicy Bypass -File <この道具>

$ここ = Split-Path -Parent $MyInvocation.MyCommand.Path
$出 = Join-Path $ここ 'golden-kakidashi-excel-2026-09-20.tsv'

# ══ ★開いて よい ただ 1本★ ══
$許す名 = 'exally-kakidashi.xlsx'
$開く = Join-Path $env:TEMP $許す名

$版 = $PSVersionTable.PSVersion
Write-Host ('★走らせて いる 貝殻 ... PowerShell ' + $版.ToString() + '★')
if ($版.Major -ne 5) { Write-Host '★★powershell.exe（5.1）で 走らせて ください★★'; exit 8 }

# ★★開く 相手を 1本に 縛る★★（★名前が 違えば 走りません★）
if ((Split-Path $開く -Leaf) -ne $許す名) {
  Write-Host '★★開いて よい ファイルは 1本だけです★★'
  exit 7
}
if (-not (Test-Path $開く)) {
  Write-Host ('★★書き出した ファイルが 在りません ... ' + $開く + '★★')
  Write-Host '  ⇒★先に 画面から 書き出して ください★'
  exit 6
}
Write-Host ('★開く 物 ... ' + $開く + '（' + (Get-Item $開く).Length + ' バイト）★')

$数1 = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue).Count
$数2 = @(Get-CimInstance Win32_Process -Filter "Name='EXCEL.EXE'" -ErrorAction SilentlyContinue).Count
Write-Host ('★走らせる 直前の Excel ... ' + $数1 + '個 ／ ' + $数2 + '個★')
if ($数1 -ne 0 -or $数2 -ne 0) { Write-Host '★★Excel が 動いて います＝走らせません★★'; exit 3 }

$xl = New-Object -ComObject Excel.Application
$bk = $null
$sh = $null
$c = $null
$w = $null
try {
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  # ★読むだけ★（`ReadOnly` を 立てる）
  $bk = $xl.Workbooks.Open($開く, 0, $true)
  $sh = $bk.Sheets.Item(1)

  $行 = New-Object System.Collections.Generic.List[string]
  $行.Add('# ★うちが 書き出した .xlsx を 実Excel に 開かせた★（2026-09-20）')
  $行.Add('# ★開いた 物★ ... ' + $開く)
  $行.Add('# ★読むだけ★（保存して いません）')
  $行.Add('# ★どの Excel か★ ... 版 ' + $xl.Version + ' ／ build ' + $xl.Build)
  $行.Add('# ★どの 貝殻か★ ... PowerShell ' + $版.ToString())
  $行.Add('# マス' + "`t" + '値' + "`t" + '出る字' + "`t" + '式' + "`t" + '型' + "`t" + '=(マス)=0')

  for ($r = 1; $r -le 5; $r++) {
    $c = $sh.Cells.Item($r, 4)
    $v = $c.Value2
    $値 = if ($null -eq $v) { '(kara)' } elseif ($v -is [double]) { $v.ToString('R', [Globalization.CultureInfo]::InvariantCulture) } else { [string]$v }
    $型 = if ($null -eq $v) { '(kara)' } elseif ($v -is [double]) { 'Double' } elseif ($v -is [string]) { 'String' } elseif ($v -is [bool]) { 'Boolean' } else { 'Other' }
    $字 = [string]$c.Text
    $式 = [string]$c.Formula
    # ★2つ目の 窓★（★他の 道具と 同じ 書き方★）
    $見る = 'D' + $r
    $ゼロか = '(★窓2が 打てません★)'
    try { $w = $sh.Range('J' + $r); $w.Formula2 = '=(' + $見る + ')=0'; $ゼロか = [string]$w.Value2 } catch { }
    $行.Add(('D' + $r) + "`t" + $値 + "`t" + $字 + "`t" + $式 + "`t" + $型 + "`t" + $ゼロか)
  }

  [System.IO.File]::WriteAllText($出, ($行 -join "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ('★書いた ... ' + $出 + '★')
  $bk.Close($false)
} finally {
  $c = $null
  $w = $null
  $sh = $null
  $bk = $null
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  $xl = $null
  $t = [Diagnostics.Stopwatch]::StartNew()
  while ((@(Get-Process -Name EXCEL -ErrorAction SilentlyContinue).Count -gt 0) -and ($t.Elapsed.TotalSeconds -lt 120)) {
    Start-Sleep -Milliseconds 250
  }
  $t.Stop()
  $残り = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue).Count
  if ($残り -eq 0) {
    Write-Host ('★Excel は ' + [math]::Round($t.Elapsed.TotalSeconds, 1) + '秒で ★消えました★★')
  } else {
    Write-Host ('★★Excel は 消えませんでした★★ ／ 残り ' + $残り + '個')
  }
}
