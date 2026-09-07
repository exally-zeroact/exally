# toru-okane4.ps1 — ★IRR・XIRR・DGET・BINOM を ★呼び方を 変えて★ 聞き直す★（2026-09-08）
#
#  ★★なぜ★★
#    36個を 聞いた 時、この 4個だけ ★呼び方が 見つからない★だった。
#    ⇒★『動く』でも『動かない』でも ない＝★まだ★★
#    ⇒★★IRR・XIRR は ★お金の 関数★＝『まだ』の まま 置かない★★（指示役 2026-09-08）
#    ⇒★『1回目で 出来ないと 出たら ★聞き方を 変える★』（ISOMITTED で 学んだ）
#
#  ★1回目が なぜ 見つからなかったか（★見立て★／これから 確かめる）★
#    IRR … ★出て行く お金（マイナス）と 入る お金（プラス）が 要る★
#          全部 プラス（A1:A5=1..5）だと 実Excel も 断る
#    XIRR … ★日付の 列も 要る★
#    DGET … ★条件に 合う 行が ★ちょうど 1つ★ でないと #NUM!★
#    BINOM … ★BINOM.DIST / BINOM.INV が 本名★（BINOM 単体は 無い かもしれない）
#
#  ★司さんの 実物には 触りません★＝新しい ブック・保存せず
#
#  使い方: powershell -File toru-okane4.ps1

$ErrorActionPreference = 'Stop'
$誤りの番号 = @{
  -2146826288 = '#NULL!'; -2146826281 = '#DIV/0!'; -2146826273 = '#VALUE!';
  -2146826265 = '#REF!';  -2146826259 = '#NAME?';  -2146826252 = '#NUM!';
  -2146826246 = '#N/A';
  -2146826243 = '#SPILL!';   -2146826242 = '#CONNECT!'; -2146826241 = '#BLOCKED!';
  -2146826240 = '#UNKNOWN!'; -2146826239 = '#FIELD!';   -2146826238 = '#CALC!'
}

# ★聞く 式★（★人が 決めるのは ここだけ★）
$候補 = @(
  # ★IRR★ … P1:P5 に -100,30,40,50,20（出て行く／入る）
  '=IRR(P1:P5)',
  '=IRR(P1:P5,0.1)',
  '=IRR(P1:P4)',
  # ★XIRR★ … P列の お金 ＋ Q列の 日付
  '=XIRR(P1:P5,Q1:Q5)',
  '=XIRR(P1:P5,Q1:Q5,0.1)',
  # ★MIRR★（ついで・同じ 家）
  '=MIRR(P1:P5,0.1,0.12)',
  # ★DGET★ … 条件に 合う 行が ★ちょうど 1つ★に なるように
  '=DGET(F1:I3,"数",M1:M2)',
  '=DGET(F1:I3,3,M1:M2)',
  '=DGET(F1:I3,"数",K1:K2)',
  # ★BINOM★ … 本名を 試す
  '=BINOM.DIST(2,5,0.5,TRUE)',
  '=BINOM.DIST(2,5,0.5,FALSE)',
  '=BINOM.INV(5,0.5,0.5)',
  '=BINOM.DIST.RANGE(5,0.5,1,3)',
  '=BINOM(2,5,0.5,TRUE)'
)

Write-Host '★実Excel を 開きます（新しい ブック・保存しません）★'
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
  $bk = $xl.Workbooks.Add()
  $sh = $bk.Worksheets.Item(1)

  # ★台★（36個の 時と 同じ）
  for ($r = 1; $r -le 5; $r++) {
    $sh.Cells.Item($r, 1).Value2 = $r
    $sh.Cells.Item($r, 2).Value2 = $r * 2
  }
  $sh.Range('F1').Value2 = '名'; $sh.Range('G1').Value2 = '組'; $sh.Range('H1').Value2 = '数'; $sh.Range('I1').Value2 = '日'
  $sh.Range('F2').Value2 = 'あ'; $sh.Range('G2').Value2 = 'X'; $sh.Range('H2').Value2 = 10; $sh.Range('I2').Value2 = 1
  $sh.Range('F3').Value2 = 'い'; $sh.Range('G3').Value2 = 'X'; $sh.Range('H3').Value2 = 20; $sh.Range('I3').Value2 = 2
  $sh.Range('K1').Value2 = '組'; $sh.Range('K2').Value2 = 'X'      # 2行 当たる（DGET は #NUM!）
  $sh.Range('M1').Value2 = '名'; $sh.Range('M2').Value2 = 'あ'     # ★1行だけ 当たる★

  # ★お金の 並び★（出て行く マイナス ＋ 入る プラス）
  $sh.Range('P1').Value2 = -100
  $sh.Range('P2').Value2 = 30
  $sh.Range('P3').Value2 = 40
  $sh.Range('P4').Value2 = 50
  $sh.Range('P5').Value2 = 20
  # ★日付★（XIRR 用）
  $sh.Range('Q1').Formula = '=DATE(2024,1,1)'
  $sh.Range('Q2').Formula = '=DATE(2024,4,1)'
  $sh.Range('Q3').Formula = '=DATE(2024,7,1)'
  $sh.Range('Q4').Formula = '=DATE(2024,10,1)'
  $sh.Range('Q5').Formula = '=DATE(2025,1,1)'

  Write-Host ''
  Write-Host '  式                                   実Excel'
  foreach ($f in $候補) {
    $値 = ''
    try {
      $sh.Range('T1').Formula = $f
      $v = $sh.Range('T1').Value2
      if ($null -eq $v) { $値 = '(空)' }
      elseif (($v -is [int] -or $v -is [long]) -and $誤りの番号.ContainsKey([int]$v)) { $値 = $誤りの番号[[int]$v] }
      elseif ($v -is [bool]) { $値 = if ($v) { 'TRUE' } else { 'FALSE' } }
      else { $値 = [string]$v }
    } catch { $値 = '★式ごと 受け付けない★' }
    Write-Host ('  ' + $f.PadRight(36) + $値)
  }
  $bk.Close($false)
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
}
