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
- NEGBINOMDIST … ★打てば そのまま 動く★＝古い 名前。Exally が 引数を 足して 答える（=NEGBINOMDIST(1,2,0.5) → 0.25）（直している 場所＝convertFormula）
- NORMSDIST … ★打てば そのまま 動く★＝古い 名前。Exally が NORMSDIST(x,TRUE()) に 直して 答える（=NORMSDIST(1) → 0.8413…）。新しい 名前は NORM.S.DIST（直している 場所＝convertFormula）
- YEN … ★打てば そのまま 動く★＝Exally が ★DOLLAR★（本名）に 直して 答える。=YEN(1234.5) → ¥1,235。★YEN は 日本語UIの 表示名★で、ファイル／英語の 構文では DOLLAR

## ★★Exally で 動かない 関数（★勧めては いけない★）★★

★聞かれたら「Exally内では まだ 動かない」と はっきり 言う。★
★代わりの やり方を 出す。★★黙って 勧めない★★

- ★BYCOL★ … 同上
- ★BYROW★ … 同上
- ★FIELDVALUE★ … 同上
- ★IMAGE★ … 同上
- ★LAMBDA★ … 式を 値として 渡す 仕組みが エンジンに 無い
- ★LET★ … 同上
- ★MAKEARRAY★ … 同上
- ★MAP★ … 同上
- ★PHONETIC★ … ふりがなは セルに 付いた データ＝エンジンでは 見えない
- ★REDUCE★ … 同上
- ★RTD★ … 同上
- ★SCAN★ … 同上
- ★STOCKHISTORY★ … 外の データ配信が 要る
- ★WEBSERVICE★ … 同上
```
