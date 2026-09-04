/* encodeurl.js — ★ENCODEURL＝字を URL の 形に 直す★ 2026-09-04
 *
 *  ★なぜ 作ったか★
 *    司さん（2026-09-04）「★Excelが 出来て うちが 出来んって事は 絶対に 無い★」
 *    ⇒ 指示役の 順番 ②。★外に 出ない★（字を 変えるだけ・通信は しない）。
 *
 *  ★★この 表は 誰が 決めたのか★★
 *    ★決めたのは 私では ありません★＝★この機械の 実Excel★です。
 *      版 ……… Excel 365（この機械）
 *      打った日 … ★2026-09-04★
 *      打ち方 … COM で 新規ブックに =ENCODEURL(A1) を 入れて .Text を 読む
 *      道具 ……… tools/encodeurl-golden.ps1（55通り）
 *      台帳 ……… tests/fixtures/encodeurl-golden.json
 *      ★司さんの 実物は 1バイトも 触っていません★
 *    ★台帳を 変えてよいのは 実Excel に 打ち直した 時だけ★
 *
 *  ★実Excel から 読み取った 決まり★（★全部 台帳に 実物が 在る★）
 *    ・そのまま 残る 字 … ★A-Z a-z 0-9 - _ .★（★これだけ★）
 *    ・それ以外は 全部 ★%XX★（UTF-8 の バイトごと・★大文字★）
 *    ・★空白は %20★（+ では ない）／改行は %0A
 *    ・★~ ! * ' ( ) も 全部 %XX★
 *        ⇒★JS の encodeURIComponent とは 違う★（あちらは この 6文字を 残す）
 *        ⇒★だから 借りずに 自分で 書いた★（借りると 6文字 ずれる）
 *    ・日本語・絵文字も UTF-8 の バイトに して %XX（🙂 → %F0%9F%99%82）
 *    ・空の 字／空の セル … ★空★（#VALUE! では ない）
 *    ・数 … その まま 字に する（1.5 → 1.5）／TRUE → TRUE
 *    ・エラーは そのまま 素通り（エンジン側で 止める）
 *
 *  ★外に 出ません★＝★字を 変えるだけ／通信は 1回も しません★
 *    （WEBSERVICE や RTD とは 別物＝あちらは 外へ 出る）
 *
 *  見張り … tests/encodeurl.test.mjs（★台帳 55通り 全部★）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EncodeUrl = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** ★そのまま 残る 字★（実Excel 実測＝これ以外は 全部 %XX） */
  function 残すか(c) {
    return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
      || c === '-' || c === '_' || c === '.';
  }

  /** 1文字を UTF-8 の バイトに して %XX に する */
  function 逃がす(s) {
    var 出 = '';
    /* encodeURIComponent は ~ ! * ' ( ) を 残す＝実Excel と 違う。
       ★バイトに するのだけ 借りて、どの字を 残すかは 自分で 決める★ */
    var b = encodeURIComponent(s);
    for (var i = 0; i < b.length; i++) {
      var c = b.charAt(i);
      if (c === '%') { 出 += b.substr(i, 3).toUpperCase(); i += 2; continue; }
      /* ここに 来るのは encodeURIComponent が 残した 字＝自分で バイトに する */
      出 += 一文字を(c);
    }
    return 出;
  }

  /** ASCII 1文字を %XX に する */
  function 一文字を(c) {
    var n = c.charCodeAt(0);
    return '%' + (n < 16 ? '0' : '') + n.toString(16).toUpperCase();
  }

  /** ★本体★ ENCODEURL(字) → URL の 形 */
  function 直す(x) {
    if (x === null || x === undefined) return '';        /* ★空の セルは 空★（実測） */
    var s;
    if (typeof x === 'boolean') s = x ? 'TRUE' : 'FALSE'; /* ★TRUE→TRUE★（実測） */
    else s = String(x);
    var 出 = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (残すか(c)) { 出 += c; continue; }
      /* ★サロゲートペア（絵文字）は 2文字で 1つ★＝切ると 壊れる */
      var cc = s.charCodeAt(i);
      if (cc >= 0xD800 && cc <= 0xDBFF && i + 1 < s.length) {
        出 += 逃がす(s.substr(i, 2)); i++; continue;
      }
      出 += 逃がす(c);
    }
    return 出;
  }

  return { 直す: 直す, _残すか: 残すか };
}));
