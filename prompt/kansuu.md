# ★Exally で 使える 関数・使えない 関数★

> ★この ファイルは 機械が 作ります。手で 書かないで ください★
> 作り方 … `node scripts/make-prompt.mjs`
> 正本 …… `lib/formula-extra.js` の `数える()`
> ★手で 写していた 頃は 22個中 17個 間違っていました（2026-09-05 実測）★

> ★★AIへ 渡るのは 下の ``` の 中だけ★★（日付を 中に 入れない＝置き賃が 毎回 かかる）

```
## ★足した 関数（Exally で 動く）★

ARRAYTOTEXT / AVERAGEIFS / CHOOSECOLS / CHOOSEROWS / DROP / EXPAND / MODE.MULT / TAKE / TOCOL / TOROW / WRAPCOLS / WRAPROWS

★別の 部品で 足した 物★
- BAHTTEXT … lib/bahttext.js（実Excel に 116通り 打たせて 合わせた）

★別の 名前で 動く 物（★打たれたら そのまま 動く＝断っては いけない★）★
- BETADIST … ★打てば そのまま 動く★＝古い 名前。Exally が BETA.DIST(…,TRUE()) に 直して 答える（=BETADIST(0.5,1,2) → 0.75）（直している 場所＝convertFormula）
- HYPGEOMDIST … ★打てば そのまま 動く★＝古い 名前。Exally が 4つ目の 引数に FALSE() を 足して 答える（=HYPGEOMDIST(1,2,3,4) → 0.5）（直している 場所＝convertFormula）
- ISREF … ★打てば そのまま 動く★＝参照かどうかを 見る。Exally が 式を 読んで TRUE()/FALSE() に 直して 答える（直している 場所＝convertFormula）
- JIS … ★打てば そのまま 動く★＝Exally が ★DBCS★（本名）に 直して 答える。=JIS("あ") → あ。JIS は 日本語UIの 表示名で、ファイル／英語の 構文では DBCS（YEN と 同じ 家／直している 場所＝exally-formula.js の convertFormula）
- LET … ★打てば そのまま 動く★＝=LET(x,2,x*3) → 6（実測）。名前を 付けて 使い回す 書き方が そのまま 通る
- MAKEARRAY … ★打てば そのまま 動く★＝=MAKEARRAY(2,2,LAMBDA(r,c,r*c)) が 答える（実測）
- MAP … ★打てば そのまま 動く★＝=MAP(A1:A3,LAMBDA(v,v*2)) が 答える（実測）
- NEGBINOMDIST … ★打てば そのまま 動く★＝古い 名前。Exally が 引数を 足して 答える（=NEGBINOMDIST(1,2,0.5) → 0.25）（直している 場所＝convertFormula）
- NORMSDIST … ★打てば そのまま 動く★＝古い 名前。Exally が NORMSDIST(x,TRUE()) に 直して 答える（=NORMSDIST(1) → 0.8413…）。新しい 名前は NORM.S.DIST（直している 場所＝convertFormula）
- REDUCE … ★打てば そのまま 動く★＝=REDUCE(0,A1:A3,LAMBDA(a,b,a+b)) → 9（実測）
- SCAN … ★打てば そのまま 動く★＝途中の 計算を 並べて 返す（実測）
- YEN … ★打てば そのまま 動く★＝Exally が ★DOLLAR★（本名）に 直して 答える。=YEN(1234.5) → ¥1,235。★YEN は 日本語UIの 表示名★で、ファイル／英語の 構文では DOLLAR

## ★★Exally で 動かない 関数（★勧めては いけない★）★★

★聞かれたら「Exally内では まだ 動かない」と はっきり 言う。★
★代わりの やり方を 出す。★★黙って 勧めない★★

- ★AREAS★ … とびとびの 範囲（A1:B3,D1:D2 のように カンマで つないだ 物）を エンジンが まだ 受け取れない。1つの 範囲なら 数えられるが とびとびだと 答えが 出ない ⇒ 半分 合う 物は 出さないと 決めた
- ★BYCOL★ … 列ごとに まとめる 物＝まだ 作っていない（MAP・REDUCE・SCAN は 動く）
- ★BYROW★ … 行ごとに まとめる 物＝まだ 作っていない（MAP・REDUCE・SCAN は 動く）
- ★CALL★ … パソコンの 中の 外部の 部品を 呼ぶ 物。ブラウザの 中には その 仕組みが 無い
- ★CELL★ … 行・列・番地は 出せるが、幅・書式・保護は ★画面の 見た目や ブックの 設定★を 見に 行く 物で、計算の 所からは 見えない。 一部だけ 返すと どれが 本物か 分からない ので 出していない
- ★CUBEKPIMEMBER★ … 分析用の 倉庫の 目標の 値を 取る 物。繋ぐ 相手が 無い
- ★CUBEMEMBER★ … 分析用の 倉庫（キューブ）の 項目を 指す 物。繋ぐ 相手が 無い
- ★CUBEMEMBERPROPERTY★ … 分析用の 倉庫の 項目の 中身を 取る 物。繋ぐ 相手が 無い
- ★CUBERANKEDMEMBER★ … 分析用の 倉庫から 順位で 項目を 選ぶ 物。繋ぐ 相手が 無い
- ★CUBESET★ … 分析用の 倉庫の 項目の まとまりを 作る 物。繋ぐ 相手が 無い
- ★CUBESETCOUNT★ … 分析用の 倉庫の まとまりの 数を 数える 物。繋ぐ 相手が 無い
- ★CUBEVALUE★ … 分析用の 倉庫（キューブ）に 繋いで 値を 取る 物。繋ぐ 相手が 無い
- ★FIELDVALUE★ … 株価や 地図の カードから 項目を 引く 物。そのカードの 仕組みが 無い
- ★FORECAST.ETS★ … 季節を 見つけて 先を 読む 物。 実Excel と 同じ 答えに するには 季節の 見つけ方まで 揃える 必要が 有り、 まだ 揃っていない。近い 答えを 出すと ★予測が 少し ずれる★ ので 出さない
- ★FORECAST.ETS.CONFINT★ … 先を 読んだ 時の 幅。季節の 見つけ方まで 揃わないと ずれる
- ★FORECAST.ETS.SEASONALITY★ … 季節の 長さを 見つける 物。見つけ方が 実Excel と 揃っていない
- ★FORECAST.ETS.STAT★ … 先を 読む 時の 中の 数値。季節の 見つけ方まで 揃わないと ずれる
- ★GETPIVOTDATA★ … ピボットテーブルから 値を 引く 物。ピボットテーブル 自体が まだ 無い
- ★GROUPBY★ … まとめて 集計する 表を 式で 作る 物。ピボットテーブル 自体が まだ 無い
- ★IMAGE★ … ウェブの 住所の 絵を セルに 出す 物。★絵を セルの 上に 置く 仕組み★が まだ 無い
- ★LAMBDA★ … ★その場で 呼ぶ 書き方（=LAMBDA(x,x+1)(4)）は 動く★。セルに 名前として しまう 使い方は まだ 出来ない
- ★ODDFPRICE★ … 端数の 初回が 1期に 収まる 形なら 実Excel と 合うが、日数の 数え方 2・3 や 準期間 3つ以上で ずれる。半分 合う 答えは 出さないと 決めた。合う 形だけ 切り出せるように なったら 出す
- ★ODDFYIELD★ … 端数の 初回が 有る 債券の 利回り。ODDFPRICE と 同じ 訳で 出していない
- ★ODDLPRICE★ … 端数の 最後が 2期までなら 実Excel と 合うが、3期以上で ずれる。半分 合う 答えは 出さないと 決めた。合う 形だけ 切り出せるように なったら 出す
- ★ODDLYIELD★ … 端数の 最後が 有る 債券の 利回り。ODDLPRICE と 同じ 訳で 出していない
- ★PHONETIC★ … ふりがなは セルに 付いた データ＝エンジンでは 見えない
- ★PIVOTBY★ … ピボットの 表を 式で 作る 物。ピボットテーブル 自体が まだ 無い
- ★REGISTER.ID★ … パソコンの 中の 外部の 部品の 番号を 取る 物。ブラウザには その 仕組みが 無い
- ★RTD★ … 向こうから 押してくる 相手に 繋ぐ 物。★その 相手（配信の 元）が うちには 無い★＝繋ぐ 先が 無い
- ★TRIMRANGE★ … 範囲の 端の 空きを 落とす 物。 範囲の 大きさを その場で 変える 作りが エンジンに まだ 無い
```
