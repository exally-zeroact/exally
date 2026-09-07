# toru-text.ps1 — ★実Excel の ★画面に 出る 字★（.Text）を 取る★（2026-09-08）
#
#  ★★なぜ★★
#    金の紙は ★.Value2＝中の 値★で 取っている。
#    ⇒★数を 返す 関数では ★画面に 出る 字★を ★1度も 測っていません★★
#    ⇒ だから「合った 3,968本の うち 字が 違う 995本」の うち
#      ★Double 708本は ★defect とは 限らない★★
#      （比べているのが ★中の 値★ と ★うちの 画面の 字★＝別の 物どうし）
#
#  ★★これを 確かめる★★
#    実Excel の `.Text`（★セルに 出ている 字★）を 取り、
#    ★うちの 画面の 字★と 比べれば ★同じ物どうし★に なる。
#
#  ★注意★ `.Text` は ★列の 幅★で #### に なる ⇒ ★列を 広げてから★ 読む
#
#  使い方: powershell -File toru-text.ps1

$ErrorActionPreference = 'Stop'
$候補 = @(
  '=CONVERT(1,"u","g")',
  '=MULTINOMIAL(A1:A5)',
  '=GEOMEAN(A1:A5)',
  '=LINEST(A1:A5,B1:B5)',
  '=IMCOS(A1)',
  '=SQRT(2)',
  '=1/3',
  '=A1/7'
)

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
  $bk = $xl.Workbooks.Add()
  $sh = $bk.Worksheets.Item(1)
  for ($r = 1; $r -le 5; $r++) {
    $sh.Cells.Item($r, 1).Value2 = $r
    $sh.Cells.Item($r, 2).Value2 = $r * 2
  }
  $sh.Columns.Item(20).ColumnWidth = 60      # ★列を 広げる（#### を 避ける）★

  Write-Host ''
  Write-Host '  式                          .Value2（中の 値）              .Text（★画面の 字★）'
  foreach ($f in $候補) {
    $sh.Range('T1').Formula = $f
    $v2 = [string]$sh.Range('T1').Value2
    $tx = [string]$sh.Range('T1').Text
    Write-Host ('  ' + $f.PadRight(26) + $v2.PadRight(30) + $tx)
  }
  $bk.Close($false)
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
}
