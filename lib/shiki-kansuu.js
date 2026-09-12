/* shiki-kansuu.js — ★四角（A1:A3）と 関数を 計算する★（2026-09-13）
 *
 *  ★★土台を 自分で 作る ④枚目の 後半★★
 *    土台は 5つ … ①字に 切る ②形に する ③頼りの 地図 ④★順番と 計算★ ⑤溢れ
 *    ④の 前半（＋−×÷＾＆ 大小 ％）は `shiki-keisan.js`。
 *    ここは ★四角と 関数★ だけ です。
 *
 *  ★★借り物の 中は 1文字も 読んで いません★★
 *  ★★答えは 全部 実Excel に 打って 測りました★★
 *    （2026-09-13・★40通り★／道具 `docs/measured/toru-shikaku-kansuu.ps1`
 *      紙 `docs/measured/golden-shikaku-kansuu-2026-09-13.tsv`／Excel 16.0 build 20326）
 *
 *  ★★★一番 大きい 分かれ目＝★値が どこから 来たか★★★★
 *    ★同じ SUM なのに 中身の 扱いが 違います★
 *      `=SUM(A1:A5)`       → ★3★   … 四角の 中の 字 "2" と TRUE は ★無視★（1＋2）
 *      `=SUM(A1,"2",TRUE)` → ★4★   … 直に 書いた 字と 真偽は ★数に なる★（1＋2＋1）
 *      `=SUM(A2)`          → ★0★   … ★1マスだけ 指した 字も 無視★（直に 書いた のとは 違う）
 *    ⇒★マスから 来た 物は 飛ばす／直に 書いた 物は 数に する★
 *      ★これを 知らずに 作ると 全部 外します★
 *
 *  ★★当て推量なら 外して いた 物（実Excel に 聞いて 初めて 分かった）★★
 *    `=PRODUCT(B1:B3)`  → ★0★（全部 空。★1 では ない★＝掛け算の 元は 1 なのに）
 *    `=COUNTA(A1:A6)`   → ★5★（★誤りも 数える★）
 *    `=COUNT(A1:A6)`    → ★2★（★誤りは 数えない★＝COUNTA と 違う）
 *    `=MAX(B1:B3)`      → ★0★（全部 空）／`=MAX(C5:C6)` → ★-1★（負だけ＝★0は 混ざらない★）
 *    `=MAX(A1:A6)`      → ★#DIV/0!★（★MAXにも 誤りは 伝わる★）
 *    `=AVERAGE(B1:B3)`  → ★#DIV/0!★（★SUMは 0 なのに 平均は 誤り★）
 *    `=AVERAGE(A1,A3)`  → ★1★（1マス指しの TRUE は ★分母に 入らない★）
 *    `=SUM(0.1,0.2,-0.3)`→★0★（★SUMの 中でも 消え残りを 0に する★＝＋と 同じ／窓２で 裏取り）
 *
 *  ★値の 形★ `shiki-keisan.js` と 同じ { 型:'数'|'字'|'真偽'|'誤'|'空', 値 }
 *
 *  ★引数の 形★（★どこから 来たかを 必ず 付ける★）
 *    { 種:'直',   値: <値> }          … 式に 直に 書いた 物（"2" や TRUE や 1）
 *    { 種:'マス', 値: <値> }          … 1マスを 指した 物（A2）
 *    { 種:'四角', 並び: [<値>, …] }   … A1:A3
 *
 *  ★★入れて いない 物（出来て いない 物を 出来た 顔で 混ぜない）★★
 *    ・SUMPRODUCT … ★形の 違う 四角の 決まりが 未測定★
 *    ・溢れ（`=A1:A3` を そのまま 打つと 下に 広がる）… ★土台⑤★
 *      ★実測では 溢れました★（E1=1・E2=2）が、ここでは 扱いません。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    typeof require === 'function' ? require('./shiki-keisan.js') : root.ShikiKeisan);
  else root.ShikiKansuu = factory(root.ShikiKeisan);
})(typeof self !== 'undefined' ? self : this, function (計) {
  'use strict';

  var 数 = 計.数, 誤 = 計.誤;

  /* ══ ★引数を 1つずつ ほどく★ ══
     ★四角は 中身を 順に／マスと 直は そのまま★
     ★どこから 来たかを 落とさない★のが この 台の 肝 */
  function ほどく(引数たち, 続き) {
    for (var i = 0; i < 引数たち.length; i++) {
      var a = 引数たち[i];
      if (a.種 === '四角') {
        for (var j = 0; j < a.並び.length; j++) {
          if (続き(a.並び[j], 'マス') === false) return;
        }
      } else {
        if (続き(a.値, a.種 === '直' ? '直' : 'マス') === false) return;
      }
    }
  }

  /* ══ ★数を 拾う★（SUM／AVERAGE／MAX／MIN／PRODUCT／COUNT が 使う）══
     ★マスから 来た … 数だけ 拾う。字・真偽・空は 飛ばす★
     ★直に 書いた … 数に する（字が 数に ならなければ #VALUE!）★
     ★誤りは どちらでも 伝わる（左から 最初の 1つ）★ */
  function 数を拾う(引数たち, 手) {
    var 出 = { 数たち: [], 誤: null };
    ほどく(引数たち, function (v, 元) {
      if (v.型 === '誤') { 出.誤 = v; return false; }
      if (元 === 'マス') {
        if (v.型 === '数') 出.数たち.push(v.値);
        return true;                       /* ★字・真偽・空は 飛ばす★ */
      }
      var n = 計.数にする(v, 手);           /* ★直に 書いた 物は 数に する★ */
      if (n.型 === '誤') { 出.誤 = n; return false; }
      出.数たち.push(n.値);
      return true;
    });
    return 出;
  }

  /* ══ ★足す★ ══
     ★消え残りを 0に する所は `shiki-keisan.js` の ＋ に 任せます★
     ＝★同じ 決まりを 2か所に 書かない★（実測 `=SUM(0.1,0.2,-0.3)` → 0） */
  function 足しあげる(数たち, 手) {
    var 合 = 数(0);
    for (var i = 0; i < 数たち.length; i++) {
      合 = 計.つなぎ('+', 合, 数(数たち[i]), 手);
      if (合.型 === '誤') return 合;
    }
    return 合;
  }

  function 掛けあげる(数たち, 手) {
    if (数たち.length === 0) return 数(0);   /* ★実測＝全部空の PRODUCT は 0（1 では ない）★ */
    var 積 = 数(数たち[0]);
    for (var i = 1; i < 数たち.length; i++) {
      積 = 計.つなぎ('*', 積, 数(数たち[i]), 手);
      if (積.型 === '誤') return 積;
    }
    return 積;
  }

  /* ══ ★関数たち★ ══ */
  var 表 = {
    /* 数が 1つも 無ければ 0（実測 `=SUM(B1:B3)` → 0） */
    SUM: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      return 足しあげる(拾.数たち, 手);
    },
    /* ★数が 1つも 無ければ #DIV/0!★（SUM は 0 なのに 平均は 誤り＝実測） */
    AVERAGE: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      if (拾.数たち.length === 0) return 誤('#DIV/0!');
      var 合 = 足しあげる(拾.数たち, 手);
      if (合.型 === '誤') return 合;
      return 計.つなぎ('/', 合, 数(拾.数たち.length), 手);
    },
    PRODUCT: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      return 掛けあげる(拾.数たち, 手);
    },
    /* ★数が 1つも 無ければ 0★。★在れば その中の 一番★（負だけでも 0は 混ざらない＝実測） */
    MAX: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      if (拾.数たち.length === 0) return 数(0);
      var m = 拾.数たち[0];
      for (var i = 1; i < 拾.数たち.length; i++) if (拾.数たち[i] > m) m = 拾.数たち[i];
      return 数(m);
    },
    MIN: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      if (拾.数たち.length === 0) return 数(0);
      var m = 拾.数たち[0];
      for (var i = 1; i < 拾.数たち.length; i++) if (拾.数たち[i] < m) m = 拾.数たち[i];
      return 数(m);
    },
    /* ★COUNT は 誤りを 数えない★（実測 `=COUNT(A1:A6)` → 2）
       ★誤りが 在っても 誤りを 返さない★＝数を 拾う 道とは 別（だから ここは 自分で 回す） */
    COUNT: function (引数たち, 手) {
      var n = 0;
      ほどく(引数たち, function (v, 元) {
        if (v.型 === '誤') return true;               /* ★飛ばす（伝えない）★ */
        if (元 === 'マス') { if (v.型 === '数') n++; return true; }
        var x = 計.数にする(v, 手);                    /* 直に 書いた 物は 数に して みる */
        if (x.型 === '数') n++;
        return true;
      });
      return 数(n);
    },
    /* ★COUNTA は 誤りを 数える★（実測 `=COUNTA(A1:A6)` → 5＝COUNT と 違う） */
    COUNTA: function (引数たち) {
      var n = 0;
      ほどく(引数たち, function (v) {
        if (v.型 !== '空') n++;
        return true;
      });
      return 数(n);
    }
  };

  /* ★知らない 名前は 呼ばない★＝★半分 合う 計算を 出さない★ */
  function 呼ぶ(名前, 引数たち, 手) {
    var f = 表[String(名前).toUpperCase()];
    if (!f) return null;              /* ★null＝この 台は 知らない（借り物に 回す）★ */
    return f(引数たち, 手);
  }

  return {
    呼ぶ: 呼ぶ, 表: 表,
    数を拾う: 数を拾う, ほどく: ほどく,
    足しあげる: 足しあげる, 掛けあげる: 掛けあげる
  };
});
