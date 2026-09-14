# ★借り物（HyperFormula）を 消すのに 何が 要るか★（2026-09-14 実測）

> ★どの 版を 測ったか★ … `hyperformula.full.min.js` ／ ★版 3.4.0★ ／ ビルド 10/08/2026 18:09:27
> ★944,675バイト・GPLv3★（licenseKey は gpl-v3 で 使って います）
> ★版を 必ず 書く★＝版が 上がると 関数の 数が 変わります
>   （記憶の「エンジン 394個」は ★2.6.1 の 時の 数★・実Excel 507個 の 時点。★上書きしないで ください★）

## ★名簿の 出どころ★（手で 選んで いません）
  借り物 … `hyperformula.full.min.js` を そのまま 読み込んで getRegisteredFunctionNames
  実Excel … `docs/measured/excel-functions-2026-09-06.txt`（519個）
  うち … `lib/shiki-kansuu.js` の 表 ＋ 自前の 皮 `shiki-tsunagi.js`

## ★数★
```
  借り物が 素で 出す ………………………………… 423個
    ★うち 実Excel にも 在る★ …………………… 384個
    ★実Excel に 無い（要らない）★ …………… 39個
        = ARRAYFORMULA ARRAY_CONSTRAIN CHIDISTRT CHIINVRT COUNTUNIQUE COVARIANCEP COVARIANCES FDISTRT FINVRT HF.ADD HF.CONCAT HF.DIVIDE HF.EQ HF.GT HF.GTE HF.LT HF.LTE HF.MINUS HF.MULTIPLY HF.NE HF.POW HF.UMINUS HF.UNARY_PERCENT HF.UPLUS INTERVAL ISBINARY LOGNORMINV MAXPOOL MEDIANPOOL POISSONDIST SKEWP SPLIT STDEVS TDIST2T TDISTRT TINV2T VARS VERSION WEIBULLDIST

  ★★借り物を 消す のに 自分で 書く 要が 在る … 377個★★
      ★実Excel の 実測が 紙に 在る … 332個★
      ★実測が まだ 無い ………………… 45個★

  （参考）実Excel に 在って ★借り物も うちも 出せない★ … 74個
```

## ★別枠＝OFFSET（1個）★

  ★OFFSET は 計算する 関数では ありません★＝★式を 組み立て直す 仕掛け★です。
  借り物の 中では `ParsingErrorType.StaticOffsetError`＝★式を 読む 段階★で 扱われ、
  名簿（implementedFunctions）には 出て 来ません（★動かすと 名前としては 出る★）。
  ⇒★普通の 関数と 同じ 組に 入れると 必ず 詰まります★＝soto 4個と 同じ「土台の 仕事」。
  （2026-09-14・経営者1 が 束ねた 1本の 中を 読んで 見つけた）

## ★実測が まだ 無い 45個（先に 測る 要が 在る）★
  BINOM.DIST BINOM.INV BINOMDIST COUNTIF CRITBINOM CUMIPMT CUMPRINC DATEDIF
  DATEVALUE DAVERAGE DAY DCOUNT DCOUNTA DGET DMAX DMIN
  DPRODUCT DSTDEV DSTDEVP DSUM DVAR DVARP EOMONTH FILTER
  HLOOKUP IFERROR IFNA IFS MATCH MOD NEGBINOM.DIST NEGBINOMDIST
  NOT PERCENTILE PERCENTILE.EXC QUARTILE QUARTILE.EXC RATE ROUNDDOWN SUBTOTAL
  T.TEST TEXTJOIN TTEST VLOOKUP XLOOKUP

## ★作り直し方★

```
  node karimono-keshi-no-ookisa.mjs   （scratchpad の 道具／名簿は 全部 機械が 取る）
```

> ★この 紙は 機械が 出しました★。手で 名前を 並べて いません。
