# ★測った 物を ここに 置く★（2026-09-06）

> ★なぜ この フォルダを 作ったか★
> 2026-08-29 に 実Excel を 測って「★507個★」と 報告したが、
> ★一覧を scratchpad に 置いた★ ⇒ ★消えた★
> ⇒ 09-05 に 指示役から「507個の 中に YEN は 居るか」と 聞かれて ★答えられなかった★
> ⇒ ★「507個」は 中身の 無い 数字に なった★
> ⇒ ★測った 物は repo に 置く★（[[feedback_shouko_wa_repo_ni_oke]]）

## `excel-functions-2026-09-06.txt` … ★実Excel が 知っている 関数 519個★

```
 ★測り方★
   ①一次情報の 一覧（Microsoft の 関数一覧）を 取る … 521個
   ②★実Excel に 1つずつ 打たせる★（COM・.Formula）
      Excel 16.0 build 20326（日本語UI 1041）
   ③判定
      ・#NAME? に なった ⇒ ★その 名前は 無い★
      ・値／別の 誤り（#VALUE! 等）が 出た ⇒ ★在る★
      ・★引数の 数が 違って 例外が 出た ⇒ 在る★
        （Excel が 関数と 認めて 引数を 見た 証拠）
   ④★物差しの 確かめ★ … 出鱈目な 名前 `ZZQQNOTAFUNC(1)` ⇒ ★#NAME?★
 ★実測★ … 521個中 ★519個が 在る★
   ★無い 2個★ … `EUROCONVERT`（アドイン）／`JIS`
     ⇒ JIS は ★日本語UIの 表示名★＝英語の 構文では `DBCS`
       （`.FormulaLocal` なら 通る＝2026-09-05 に 実測ずみ）

 ★★私は ここで 2回 物差しを 間違えた（隠さず 書く）★★
   1回目 … `=ISFORMULA(ABS)` で 試した ⇒ 構文が 不正 ⇒ ★519個中 514個を「無い」と 出した★
   2回目 … 引数の 例外を「無い」と 数えた ⇒ ★SUMIF・COUNTIF・OFFSET まで「無い」に なった★
   ⇒★★合わない時は まず 自分の 物差しを 疑う★★
```

## `exally-missing-2026-09-06.txt` … ★Exally で 動かない 86個★

```
 ★測り方★＝★本番と 同じ道★で 押す
   ①`exally-formula.js` の プラグインを 積む（442本）
   ②★`lib/formula-extra-plug.js` も 積む（13本）★
     ⇒★これを 忘れると AVERAGEIFS/TAKE/DROP… 13個が「無い」と 出る★（実際に 出た）
       （[[feedback_measure_harness_must_load_the_real_plugins]]）
   ③`convertFormula` を 通してから engine に 渡す（★本番と 同じ★）
   ④引数は ★決め打たない★＝9通り 試して ★1つでも #NAME? 以外なら 通る★

 ★実測（2026-09-06）★
   実Excel に 在る ………… ★519個★
   ★Exally で 動く ……… 432個（83.2%）★
   ★動かない ……………… 87個★
     （この ファイルには 86行＝末尾の 改行の 分）
```

### ★動かない 87個の 内訳（人が 分けた）★

```
 ★外の データが 要る（作れない）★ … 14個
   CUBE系 7／STOCKHISTORY／WEBSERVICE／RTD／IMAGE／FILTERXML／
   DETECTLANGUAGE／TRANSLATE
 ★式を 値として 渡す 仕組みが 要る（エンジン側）★ … 7個
   LAMBDA／MAP／REDUCE／SCAN／BYROW／BYCOL／MAKEARRAY
 ★画面の 物（セルの 外）★ … 4個
   PHONETIC／GETPIVOTDATA／PIVOTBY／GROUPBY
 ★昔からの 仕組みで 今は 使わない★ … 3個
   CALL／REGISTER.ID／ISOMITTED
 ★★作れる（うちで 作れば 動く）★★ … ★59個★
   ・お金の 計算 …………… 24個（ACCRINT/PRICE/YIELD/COUP系/DISC/DURATION 等）
   ・統計・行列 …………… 12個（LINEST/LOGEST/TREND/GROWTH/MINVERSE/MUNIT/FREQUENCY 等）
   ・新しい 文字の 関数 … 4個（REGEXEXTRACT/REGEXREPLACE/REGEXTEST/TEXTSPLIT）
   ・その他 ………………… 19個（CELL/INFO/AREAS/CONVERT/SORTBY/RANDARRAY/
                              PERCENTRANK系/ERROR.TYPE/FINDB/SEARCHB/REPLACEB 等）
 ⇒★★「Excel の 最上級」に するなら 59個は 作る★★（司さんの 方針）
```

## ★この 数字の 使い方★

```
 ★「507個」「394個」「70%」は もう 使わない★（元の 一覧が 消えている）
 ⇒★今の 正は ここ★＝519 / 432 / ★83.2%★（2026-09-06 実測）
 ★次に 測る時★ … 同じ 手順で 数え直して ★この 2本を 上書きする★
```
