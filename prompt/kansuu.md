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
- ★YEN★ … ★実Excel に 存在しない★。円は DOLLAR が 出す
```
