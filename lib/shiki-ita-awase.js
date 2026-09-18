/* shiki-ita-awase.js — ★台の 板と 画面の `data` が 合って いるかを 数える★（2026-09-18）
 *
 *  ★★なぜ 要るか★★
 *    ㋑（計算を 台に 回す）では ★台が 板を 1つ 持ちます★。
 *    ＝★マスを 打つ たびに 台にも 打つ★（`book.html` の 5か所）
 *    ⇒★★1つ 忘れると ★黙って 古い 値★が 出ます★★
 *      ＝★誤りに ならない／画面も 崩れない／数だけ 違う★
 *      ＝★一番 見つけにくい 形★
 *    ⇒★★だから 先に 門を 作ります★★（★書く 前に★）
 *
 *  ★★3つとも 出します★★（経営者1 の 注文）
 *    ・★式の 数★（`data` の 側 ／ 台の 側）
 *    ・★値の 数★（同上）
 *    ・★★食い違った マスの 数★★
 *
 *  ★★この 台が 見て いない 事★★
 *    ・★答え（`d`）は 見て いません★＝★打った 物（`f` / `v`）だけ★
 *      ＝★答えが 違うのは 別の 話★（計算の 話／ここは ★写しの 話★）
 *    ・★書式・罫線・判子は 見て いません★
 *    ・★溢れで 埋まった マスは 数えません★（★打った 物では ない★）
 *
 *  ★★呼び方★★
 *    const 出 = ShikiItaAwase.数える(板, data);
 *    ⇒ { 式: {紙, 台}, 値: {紙, 台}, 食い違い: 0, 中身: [...] }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShikiItaAwase = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** ★行・列（0から）を マスの 名前に★（A1 の 形） */
  function 番地から名(行, 列) {
    var s = '', n = 列 + 1;
    while (n > 0) { var t = (n - 1) % 26; s = String.fromCharCode(65 + t) + s; n = (n - t - 1) / 26; }
    return s + (行 + 1);
  }

  /** ★打った 物を 字に する★（★答えでは なく 打った 物★）
   *    ★式は `f`／値は `v`★（`book.html` の `data` の 形）
   *    ★空は 空の 字★ */
  function 打った物(セル) {
    if (!セル) return '';
    if (セル.f !== undefined && セル.f !== null && セル.f !== '') return String(セル.f);
    if (セル.v !== undefined && セル.v !== null) return String(セル.v);
    return '';
  }

  /**
   * ★★台の 板と 画面の `data` を 数える★★
   * @param 板 `ShikiHyou.表()` が 返した 物（`打った字` を 持つ）
   * @param data `book.html` の `sheets[i].data`（鍵は "行,列"）
   * @returns {{式:{紙:number,台:number}, 値:{紙:number,台:number}, 食い違い:number, 中身:Array}}
   */
  function 数える(板, data) {
    var 出 = { 式: { 紙: 0, 台: 0 }, 値: { 紙: 0, 台: 0 }, 食い違い: 0, 中身: [] };
    if (!板 || !data) { 出.読めない = true; return 出; }
    var 見た = {};

    /* ── ①画面の 側から 見る ── */
    for (var k in data) {
      if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
      var 番 = k.split(',');
      var r = Number(番[0]), c = Number(番[1]);
      if (!(r >= 0) || !(c >= 0)) continue;
      var 名 = 番地から名(r, c);
      見た[名] = true;
      var 紙字 = 打った物(data[k]);
      if (紙字 === '') continue;
      if (紙字.charAt(0) === '=') 出.式.紙++; else 出.値.紙++;

      var 台字 = '';
      try { 台字 = String(板.打った字 ? (板.打った字(名) || '') : ''); } catch (e) { 台字 = '★読めません★'; }
      if (台字.charAt(0) === '=') 出.式.台++; else if (台字 !== '') 出.値.台++;

      if (台字 !== 紙字) {
        出.食い違い++;
        if (出.中身.length < 20) 出.中身.push({ マス: 名, 画面: 紙字, 台: 台字 });
      }
    }

    /* ── ②台の 側に だけ 在る 物 ──
         ★★台の 鍵は `板1!A1` の 形です★★（★板の 名前が 頭に 付きます★）
           ＝`h.中身` の 鍵を 見て 確かめました（2026-09-18）
           ＝★`打った字('A1')` は 板の 名前 無しで 引けます★
         ⇒★鍵から 板の 名前を 外して 比べます★
         ★1枚の 板だけ 見ます★（★`book.html` は 板ごとに 板を 1つ 持つ 積もり★） */
    var 台の名 = [];
    try {
      var 中 = 板.中身 || {};
      for (var kk in 中) {
        if (!Object.prototype.hasOwnProperty.call(中, kk)) continue;
        var i2 = kk.indexOf('!');
        台の名.push(i2 >= 0 ? kk.slice(i2 + 1) : kk);
      }
    } catch (e) { 台の名 = []; }
    for (var i = 0; i < 台の名.length; i++) {
      var n2 = 台の名[i];
      if (見た[n2]) continue;
      var t2 = '';
      try { t2 = String(板.打った字 ? (板.打った字(n2) || '') : ''); } catch (e) { t2 = ''; }
      if (t2 === '') continue;
      if (t2.charAt(0) === '=') 出.式.台++; else 出.値.台++;
      出.食い違い++;
      if (出.中身.length < 20) 出.中身.push({ マス: n2, 画面: '(無い)', 台: t2 });
    }
    return 出;
  }

  return { 数える: 数える, 番地から名: 番地から名, 打った物: 打った物 };
}));
