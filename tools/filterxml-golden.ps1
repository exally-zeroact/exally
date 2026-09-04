# ★FILTERXML の 答えを 実Excel に 出させる★（読むだけ・新規ブック・保存しない）
#   ★こぼれる（複数 返る）ので、下へ 20行 読む★
#   ★指示役が 名指しした 所を 全部 入れる★
#     XMLが壊れている／見つからない／複数返る／名前空間／大文字小文字／空の要素
param([string]$Out)
$ErrorActionPreference='Stop'

$XML1 = '<r><a>1</a><a>2</a><a>3</a></r>'
$XML2 = '<r><a x="9">1</a><a x="8">2</a></r>'
$XML3 = '<r><a></a><a>2</a></r>'
$XML4 = '<r><A>1</A><a>2</a></r>'
$XML5 = '<r xmlns="http://x"><a>1</a></r>'
$XML6 = '<r><a>1</a>'                      # ★壊れている（閉じていない）★
$XML7 = ''                                  # ★空★
$XML8 = '<r><a> ふ た つ </a><a>&amp;&lt;&gt;</a></r>'
$XML9 = '<r><a><b>1</b></a><a><b>2</b></a></r>'
$XML10 = '<r><a>1.5</a><a>-2</a><a>0</a></r>'

$組 = @(
  @{ な='ふつう（3つ こぼれる）'; xml=$XML1; xp='//a' },
  @{ な='1つだけ';               xml=$XML1; xp='//a[1]' },
  @{ な='見つからない';           xml=$XML1; xp='//z' },
  @{ な='属性';                  xml=$XML2; xp='//a/@x' },
  @{ な='空の 要素';              xml=$XML3; xp='//a' },
  @{ な='大文字小文字（A）';       xml=$XML4; xp='//A' },
  @{ な='大文字小文字（a）';       xml=$XML4; xp='//a' },
  @{ な='名前空間（そのまま）';     xml=$XML5; xp='//a' },
  @{ な='名前空間（ローカル名）';   xml=$XML5; xp="//*[local-name()='a']" },
  @{ な='★XMLが 壊れている★';     xml=$XML6; xp='//a' },
  @{ な='★XMLが 空★';           xml=$XML7; xp='//a' },
  @{ な='XPath が 空';           xml=$XML1; xp='' },
  @{ な='XPath が でたらめ';      xml=$XML1; xp='//[' },
  @{ な='前後の 空白・実体参照';    xml=$XML8; xp='//a' },
  @{ な='入れ子';                xml=$XML9; xp='//a/b' },
  @{ な='数に 見える 字';          xml=$XML10; xp='//a' },
  @{ な='根そのもの';             xml=$XML1; xp='/r' },
  @{ な='数を 数える';            xml=$XML1; xp='count(//a)' }
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
