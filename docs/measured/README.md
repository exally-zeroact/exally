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

## `exally-missing-2026-09-06.txt` … ★Exally で 動かない 69個★

```
 ★測り方★＝★本番と 同じ道★で 押す（book.html:2290 と 同じ 3段）
   ①`_jsComputeFormula`（JS層）… `_jsSet` に 在る 名前は ★ここが 答える★
     ⇒★これを 飛ばすと DSUM・OFFSET・LINEST 等を「無い」と 誤判定する★（★実際に やった★）
   ②`exally-formula.js` の プラグイン ＋ `lib/formula-extra-plug.js`（13本）
     ＋ ★`lib/formula-nokori-plug.js`（14本・2026-09-06 に 足した）★
     ⇒★1つでも 積み忘れると その分が「無い」と 出る★
       （[[feedback_measure_harness_must_load_the_real_plugins]]）
   ③`convertFormula` を 通してから engine に 渡す
   ④引数は ★決め打たない★＝11通り 試して ★1つでも #NAME? 以外なら 通る★

 ★実測の 移り変わり（2026-09-06 の 1日）★
   ①engine だけ 押した ………………… 動く 419個（80.7%）★測り台が 足りない★
   ②formula-extra-plug も 積んだ …… 動く 432個（83.2%）
   ③★JS層も 通した（本番の 道）★ … 動く ★436個（84.0%）★
   ④★足りない 14個を 作った★ ……… 動く ★450個（86.7%）／動かない 69個★

### ★動かない 69個の 内訳（人が 分けた）★

```
 ★外の データが 要る（作れない）★ … 14個
   CUBE系 7／STOCKHISTORY／WEBSERVICE／RTD／IMAGE／FILTERXML／
   DETECTLANGUAGE／TRANSLATE
 ★式を 値として 渡す 仕組みが 要る（エンジン側）★ … 7個
   LAMBDA／MAP／REDUCE／SCAN／BYROW／BYCOL／MAKEARRAY
 ★画面の 物（セルの 外）★ … 4個
   PHONETIC／GETPIVOTDATA／PIVOTBY／GROUPBY
 ★昔からの 仕組みで 今は 使わない★ … 2個
   CALL／REGISTER.ID
 ★★作れる（うちで 作れば 動く）★★ … ★42個★
   ・お金の 計算 …………… 24個（ACCRINT/PRICE/YIELD/COUP系/DISC/DURATION/VDB 等）
   ・統計・予測 …………… 9個（LOGEST/TREND/GROWTH/FORECAST.ETS 4本/ERF.PRECISE/ERFC.PRECISE）
   ・その他 ………………… 9個（AREAS/CELL/INFO/CONVERT/RANDARRAY/PERCENTOF/TRIMRANGE 等）
 ⇒★★「Excel の 最上級」に するなら この 42個も 作る★★（司さんの 方針）

 ★★2026-09-06 に 作った 14個（もう 動く）★★
   FINDB／SEARCHB／REPLACEB … ★バイトで 数える★（全角＝2）
   TEXTSPLIT ……………………… 区切って 分ける（形を 保つ）
   REGEXTEST／REGEXEXTRACT／REGEXREPLACE … 正規表現の 3つ
   SORTBY ………………………… 別の 列で 並べ替える
   MUNIT／MINVERSE ……………… 行列（逆が 無ければ #VALUE!）
   PERCENTRANK.INC／.EXC ……… ★3桁で 切り捨て★（四捨五入では ない・実測）
   PROB ／ ERROR.TYPE
   ⇒ 中身＝`lib/formula-nokori.js`（純粋な 計算）
     繋ぐ＝`lib/formula-nokori-plug.js`
     ★答えは 全部 実Excel の 実測★＝`golden-2026-09-06.tsv`（30通り 一致）
```

## ★この 数字の 使い方★

```
 ★「507個」「394個」「70%」は もう 使わない★（元の 一覧が 消えている）
 ⇒★今の 正は ここ★＝★519個中 450個＝86.7%★（2026-09-06 実測・本番の 道）
 ★次に 測る時★ … 同じ 手順で 数え直して ★この 2本を 上書きする★
```

## `golden-2026-09-06.tsv` … ★実Excel に 打たせた 答え 35通り★

```
 ★私が 考えた 値は 1つも 入っていない★
 ★取り方★ … COM で `.Formula` に 入れて `.Text` を 読んだ
   Excel 16.0 build 20326（日本語UI 1041）
 ★使う所★ … tests/formula-nokori.test.mjs が ★この 字と 突き合わせる★
   ⇒★紙に 無い 式を 聞いたら 落ちる★（期待値を その場で 作らせない）
```
