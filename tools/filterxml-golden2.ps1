# ★FILTERXML の 答えを 実Excel に 出させる★（読むだけ・新規ブック・保存しない）
#   ★こぼれる（複数 返る）ので、下へ 20行 読む★
#   ★指示役が 名指しした 所を 全部 入れる★
#     XMLが壊れている／見つからない／複数返る／名前空間／大文字小文字／空の要素
param([string]$Out)
$ErrorActionPreference='Stop'

$X1 = '<r><a>x<b>y</b>z</a></r>'
$X2 = '<p:r xmlns:p="http://x"><p:a>1</p:a></p:r>'
$X3 = '<r><a><![CDATA[ CD ]]></a></r>'
$X4 = '<r><!-- c --><a>1</a></r>'
$X5 = '<r><a>1</a><a></a><a>3</a></r>'
$X6 = '<r xmlns="http://x"><a>1</a><a>2</a></r>'
$X7 = '<r><a b="1" c="2"/></r>'
$X8 = '<r><a>  </a></r>'
$X9 = '<r><a>0001</a><a>1e3</a><a>TRUE</a></r>'
$X10 = '<?xml version="1.0" encoding="UTF-8"?><r><a>1</a></r>'

$組 = @(
  @{ な='字と 要素が 混ざる';       xml=$X1; xp='//a' },
  @{ な='接頭辞つき 名前空間';       xml=$X2; xp='//a' },
  @{ な='接頭辞つき（そのまま書く）';  xml=$X2; xp='//p:a' },
  @{ な='CDATA';                 xml=$X3; xp='//a' },
  @{ な='注記が 在る';             xml=$X4; xp='//a' },
  @{ な='途中に 空の 要素';         xml=$X5; xp='//a' },
  @{ な='既定の 名前空間で 2つ';     xml=$X6; xp='//a' },
  @{ な='属性 2つ';               xml=$X7; xp='//a/@b' },
  @{ な='空白だけ';               xml=$X8; xp='//a' },
  @{ な='0001 / 1e3 / TRUE';     xml=$X9; xp='//a' },
  @{ な='宣言つき';               xml=$X10; xp='//a' }
)

$xl=$null
try{
  $xl=New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
  $wb=$xl.Workbooks.Add(); $sh=$wb.Worksheets.Item(1)
  $出=@()
  $行=1
  foreach($k in $組){
    $sh.Cells($行,1).NumberFormat='@'; $sh.Cells($行,1).Value2=[string]$k.xml
    $sh.Cells($行,2).NumberFormat='@'; $sh.Cells($行,2).Value2=[string]$k.xp
    # ★式は 別の 所に 置いて 下へ こぼれさせる★
    # ★.Formula だと 1つしか 返らない（暗黙の 交差）★＝★.Formula2 で こぼれさせる★
    $sh.Cells(1,(4+$行)).Formula2 = "=FILTERXML(A$行,B$行)"
    $行++
  }
  Start-Sleep -Milliseconds 800
  $行=1
  foreach($k in $組){
    $col = 4 + $行
    $答=@()
    for($r=1; $r -le 20; $r++){
      $t = $sh.Cells($r,$col).Text
      if([string]::IsNullOrEmpty($t) -and $r -gt 1){ break }
      $v = $sh.Cells($r,$col).Value2
      $型 = if($v -eq $null){'空'} elseif($v -is [double]){'数'} elseif($v -is [string]){'字'} else{$v.GetType().Name}
      $答 += [pscustomobject]@{ text=[string]$t; 型=$型 }
      if($r -eq 1 -and [string]::IsNullOrEmpty($t)){ break }
    }
    $出 += [pscustomobject]@{ な=$k.な; xml=$k.xml; xpath=$k.xp; 答=$答 }
    $行++
  }
  $出 | ConvertTo-Json -Depth 5 | Out-File -FilePath $Out -Encoding utf8
  "書いた … $Out（$($出.Count)件）"
  foreach($x in $出){ "  $($x.な.PadRight(22)) → [$($x.答 -join ' | ')]" }
}catch{ "★落ちた★ $($_.Exception.Message)" }
finally{ if($xl){ try{foreach($z in @($xl.Workbooks)){$z.Close($false)}}catch{}; try{$xl.Quit()}catch{} } }
