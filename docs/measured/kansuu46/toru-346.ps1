# toru-346.ps1 — ★答えを 1度も 確かめていない 346個を 実Excel に 聞く★（2026-09-08）
#
#  ★★司さん 2026-09-08「答え確かめて」★★
#
#  ★★やり方★★
#    ★346個ぶんの「正しい 呼び方」を 私が 手で 書いては いけません★
#    ⇒ 今日 70個の 名簿を 手で 写して ★10個 落としました★
#    ⇒★★手で 写す 作りに した のが 悪い★★（指示役 2026-09-08）
#    ⇒ だから ★実Excel 自身に 選ばせます★
#      ①引数の 形を 何通りか 用意する（★人が 決めるのは ここだけ★）
#      ②★実Excel が 誤りに しなかった 形★を その 関数の「正しい 呼び方」に する
#      ③その 式と 答えを 紙に 書く
#
#  ★★試し打ち（20個）で 分かった 事★★
#    ・19/20 で 呼び方が 見つかった ⇒ やり方は 効く
#    ・★でも 最初に 当たった 形 1本だけだと 弱い★
#      `=AVEDEV(A1)` → 0 の ような ★当たり前の 答え★に なり、
#      ★間違った 作りでも 通ってしまう★
#    ⇒★★当たった 形を ★全部★ 集める★★（1つの 関数に 何本も 答えを 持たせる）
#    ・ARABIC は 見つからなかった ⇒ ローマ数字の 形を 足した
#
#  ★★これは「答えが 合っているか」を 測る 紙です★★
#    ⇒ この 後 `tests/kansuu-346.test.mjs` が
#      ★同じ 式を Exally に 打たせて 1本ずつ 突き合わせます★
#
#  使い方: powershell -File docs/measured/kansuu46/toru-346.ps1

$ErrorActionPreference = 'Stop'
$ここ = Split-Path -Parent $MyInvocation.MyCommand.Path
$出 = Join-Path $ここ 'golden-346-2026-09-08.tsv'

# ★★2026-09-08 に 足した＝★この 表に 無い 番号は「数」として 紙に 載ってしまう★★
#   ⇒ 実際に 起きた … =SEQUENCE(0.5) の 答えが ★-2146826238★ の まま 6本 載っていた
#   ⇒ ★それを「実Excel は 答えを 返すのに うちは 誤り」の 山に 数えていた★＝★偽の 赤★
#   ⇒ 訳 … 古い 7つしか 書いていなかった（新しい #SPILL! 系は 2021年 以降の 物）
#   ⇒★見つけ方★ 金の 紙を「-20億より 小さい 数」で 洗った（誤りの 番号は 全部 -21億台）
#   ★数え方★ 番号 = 2000 + (2146826288 - |値|)  ⇒ 2050 は #CALC!
$誤りの番号 = @{
  -2146826288 = '#NULL!'; -2146826281 = '#DIV/0!'; -2146826273 = '#VALUE!';
  -2146826265 = '#REF!';  -2146826259 = '#NAME?';  -2146826252 = '#NUM!';
  -2146826246 = '#N/A';
  # ★★ここから 下が 2026-09-08 に 足した 分★★
  -2146826243 = '#SPILL!';   -2146826242 = '#CONNECT!'; -2146826241 = '#BLOCKED!';
  -2146826240 = '#UNKNOWN!'; -2146826239 = '#FIELD!';   -2146826238 = '#CALC!'
}

# ★引数の 形の 候補★（★人が 決めるのは ここだけ★）
$候補 = @(
  '()', '(A1)', '(A2)', '(A1:A5)', '(B1:B5)', '(A1:B5)',
  '(2)', '(2,3)', '(2,3,4)', '(2,3,4,5)', '(1,2,3,4,5)', '(1,2,3,4,5,6)', '(1,2,3,4,5,6,7)',
  '(0.5)', '(0.5,1)', '(0.5,1,2)', '(0.5,1,2,3)', '(0.5,1,2,3,4)',
  '("あ")', '("あ","い")', '("あ",1)', '("あ",1,2)', '("あいう",2)', '("あいう",2,1)',
  '("IV")', '("MMXXIV")', '("2024-01-15")', '("12:30")', '("101",2)',
  '(A1:A5,B1:B5)', '(A1:A5,2)', '(A1:A5,2,3)', '(A1:B5,2,FALSE)', '(A1:A5,A1)',
  '(A1:A5,"<3")', '(A1:A5,"<3",B1:B5)', '(A1:A5,1,B1:B5,1)',
  '(D1)', '(D1,D2)', '(D1,2)', '(D1,D2,1)', '(D1,D2,0)',
  '(D1,D2,0.05,0.1,100,2,0)', '(D1,D2,0.05,0.1,2)', '(D1,D2,0.05,100,2)',
  '(TRUE)', '(FALSE)', '(2,TRUE)', '(2,3,TRUE)',
  '(A1:A5,B1:B5,1)', '(2,3,4,5,6)', '(-2)', '(2.5,1)'
)

$名簿 = Get-Content (Join-Path (Split-Path -Parent $ここ) 'ugoku-tana-mikakunin.txt') -Encoding UTF8 |
  Where-Object { $_ -and -not $_.StartsWith('#') -and -not $_.StartsWith('★') } |
  ForEach-Object { $_ -split '\s+' } | Where-Object { $_ -match '^[A-Z][A-Z0-9._]*$' } |
  Sort-Object -Unique

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
$xl.ScreenUpdating = $false
$版 = $xl.Version; $ビルド = $xl.Build
$wb = $xl.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)

# ★材料★
$ws.Range('A1').Value2 = 1;  $ws.Range('A2').Value2 = 2
$ws.Range('A3').Value2 = 3;  $ws.Range('A4').Value2 = 4;  $ws.Range('A5').Value2 = 5
$ws.Range('B1').Value2 = 2;  $ws.Range('B2').Value2 = 4
$ws.Range('B3').Value2 = 6;  $ws.Range('B4').Value2 = 8;  $ws.Range('B5').Value2 = 10
$ws.Range('D1').Formula = '=DATE(2024,1,1)'
$ws.Range('D2').Formula = '=DATE(2026,1,1)'

$結果 = New-Object System.Collections.ArrayList
$呼び方あり = 0; $呼び方なし = 0; $本数 = 0
$見つからない名 = New-Object System.Collections.ArrayList
$i = 0
foreach ($f in $名簿) {
  $i++
  if ($i % 25 -eq 0) { Write-Host "  … $i / $($名簿.Count)" }
  $当たり = 0
  foreach ($a in $候補) {
    $式 = '=' + $f + $a
    try {
      $ws.Range('H1').Formula = $式
      $v = $ws.Range('H1').Value2
      if ($null -eq $v) { continue }
      if ($v -is [int] -and $誤りの番号.ContainsKey([int]$v)) { continue }  # 誤り＝呼び方が 違う
      $型 = $v.GetType().Name
      if ($型 -eq 'Object[,]') { continue }                                  # こぼれる 物は 別の 話
      $答 = if ($v -is [double]) { $v.ToString('R', [System.Globalization.CultureInfo]::InvariantCulture) } else { [string]$v }
      [void]$結果.Add(("{0}`t{1}`t{2}`t{3}" -f $f, $式, $答, $型))
      $当たり++; $本数++
    } catch { continue }
  }
  if ($当たり) { $呼び方あり++ } else { $呼び方なし++; [void]$見つからない名.Add($f) }
}

$wb.Close($false); $xl.Quit()
foreach ($o in @($ws, $wb, $xl)) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($o) | Out-Null }

$頭 = @(
  "# ★答えを 1度も 確かめていない 関数を 実Excel に 聞いた★",
  "# 取った 日 … 2026-09-08 ／ ★司さん「答え確かめて」★",
  "# ★どの Excel で 打ったか★ … 版 $版 ／ build $ビルド",
  "# ★やり方★ 引数の 形を $($候補.Count) 通り 用意し、★実Excel が 誤りに しなかった 形を 全部★ 採る",
  "#   ⇒★人が 決めるのは 形の 候補だけ／どれが 正しいかは 実Excel が 決める★",
  "#   ⇒★1本だけだと『当たり前の 答え』で 通ってしまう★ので ★当たった 形は 全部 残す★",
  "# ★材料★ A1:A5=1..5 ／ B1:B5=2,4,6,8,10 ／ D1=2024/1/1 ／ D2=2026/1/1",
  "# ★数★ 関数 $($名簿.Count)個 ／ 呼び方が 見つかった $呼び方あり 個 ／ 見つからない $呼び方なし 個 ／ 式 $本数 本",
  "# ★呼び方が 見つからない★ … " + ($見つからない名 -join ' '),
  "# 関数`t式`t実Excel の 答え`t型"
)
[System.IO.File]::WriteAllText($出, ((($頭 + $結果) -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
Write-Host "★書いた … $出★"
Write-Host "★関数 $($名簿.Count)個 ／ 呼び方あり $呼び方あり 個 ／ なし $呼び方なし 個 ／ ★式 $本数 本★★"
