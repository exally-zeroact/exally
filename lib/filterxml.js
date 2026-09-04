/* filterxml.js — ★FILTERXML＝XML の 字から XPath で 取り出す★ 2026-09-04
 *
 *  ★なぜ 作ったか★
 *    司さん（2026-09-04）「★Excelが 出来て うちが 出来んって事は 絶対に 無い★」
 *    ⇒ 指示役の 順番 ②の 後半。★外に 出ない★（手元の 字を 読むだけ・通信は しない）。
 *      ※WEBSERVICE（外へ 取りに 行く）とは ★別物★。こちらは ★渡された 字を 読むだけ★。
 *
 *  ★★この 決まりは 誰が 決めたのか★★
 *    ★決めたのは 私では ありません★＝★この機械の 実Excel★です。
 *      版 ……… Excel 365（この機械）
 *      打った日 … ★2026-09-04★
 *      打ち方 … COM で 新規ブックに ★.Formula2★ で =FILTERXML(A1,B1) を 入れて
 *                ★こぼれた 下 20行★の .Text と .Value2 の 型を 読む
 *                （★.Formula だと 1つしか 返らない＝暗黙の 交差★・2026-09-04 実測）
 *      道具 ……… tools/filterxml-golden.ps1 ／ tools/filterxml-golden2.ps1（29通り）
 *      台帳 ……… tests/fixtures/filterxml-golden.json
 *      ★司さんの 実物は 1バイトも 触っていません★
 *    ★台帳を 変えてよいのは 実Excel に 打ち直した 時だけ★
 *
 *  ★実Excel から 読み取った 決まり★（★全部 台帳に 実物が 在る★）
 *    ①★取るのは「その 要素の 直の 字」だけ★
 *        <a>x<b>y</b>z</a> → ★"xz"★（★y は 取らない★）
 *        <r><a>1</a></r> に /r  → ★#VALUE!★（r に 直の 字が 無い）
 *    ②★字は 前後を 削る／CDATA は 削らない★
 *        <a> ふ た つ </a> → ★"ふ た つ"★
 *        <a><![CDATA[ CD ]]></a> → ★" CD "★（★空白が 残る★）
 *    ③★中身が 空／空白だけ なら その 1つが #VALUE!★
 *        <a>1</a><a></a><a>3</a> → ★1 / #VALUE! / 3★（★途中だけ エラー★）
 *    ④★数に 見える 字は 数に なる★（0001→1／1e3→1000／TRUE→真偽）
 *    ⑤★既定の 名前空間は 無視される★（xmlns="…" の 中でも //a が 当たる）
 *      ★接頭辞は そのまま 要る★（//a は 当たらない／//p:a なら 当たる）
 *    ⑥★大文字小文字は 区別する★（//A と //a は 別）
 *    ⑦★#VALUE! に なる 物★
 *        見つからない ／ XML が 壊れている ／ XML が 空 ／ XPath が 空・でたらめ ／
 *        ★節を 返さない XPath（count(//a) など）★
 *
 *  ★外に 出ません★＝★渡された 字を 読むだけ／通信は 1回も しません★
 *    （見張り tests/filterxml-webkit.mjs が ★実ブラウザで 通信 0本★を 数える）
 *
 *  ★XML を 読む 道具は 借りる★＝★DOMParser と XPath は 台（ブラウザ／jsdom）の 物★
 *    ★借りてよいのは 道具★／★答えは 実Excel で 確かめる★（会社の 決まり）
 *
 *  見張り … tests/filterxml.test.mjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FilterXml = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var 誤り = { 誤り: 'VALUE' };

  /** ★既定の 名前空間だけ 外す★（実Excel は 既定の 名前空間を 見ない・実測）
   *  ★接頭辞つき（xmlns:p="…"）は 残す★＝//p:a が 当たる 為。 */
  function 既定の名前空間を外す(s) {
    return String(s).replace(/\sxmlns\s*=\s*(["'])[\s\S]*?\1/g, '');
  }

  /** その 台（ブラウザ／jsdom）の 道具を 取る */
  function 台(窓) {
    var w = 窓 || (typeof self !== 'undefined' ? self : null);
    if (!w || typeof w.DOMParser !== 'function') return null;
    var doc = w.document;
    if (!doc || typeof doc.evaluate !== 'function') return null;
    return { DOMParser: w.DOMParser, doc: doc, R: w.XPathResult };
  }

  /** ★その 要素の 直の 字★（子の 要素の 中は 取らない・実測） */
  function 直の字(node) {
    /* 属性は その 値 */
    if (node.nodeType === 2) return String(node.value === undefined ? node.nodeValue : node.value);
    var 出 = '';
    var c = node.firstChild;
    while (c) {
      if (c.nodeType === 3) 出 += String(c.data).replace(/^\s+|\s+$/g, ''); /* 字は 前後を 削る */
      else if (c.nodeType === 4) 出 += String(c.data);                      /* CDATA は 削らない */
      c = c.nextSibling;
    }
    return 出;
  }

  /** ★数に 見える 字は 数に する★（実Excel と 同じ・実測 0001→1／1e3→1000／TRUE→真偽） */
  function 値にする(s) {
    var t = String(s);
    if (t === '') return null;
    var u = t.replace(/^\s+|\s+$/g, '');
    if (u.toUpperCase() === 'TRUE') return true;
    if (u.toUpperCase() === 'FALSE') return false;
    if (u !== '' && isFinite(Number(u)) && /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(u)) {
      return Number(u);
    }
    return t;
  }

  /** ★本体★ FILTERXML(XMLの字, XPath) → 値の 並び（縦1列）／{誤り:'VALUE'}
   *  @param 窓 … DOMParser と document.evaluate を 持つ 物（省くと その場の window）
   */
  function 取り出す(xml, xpath, 窓) {
    var T = 台(窓);
    if (!T) return 誤り;                                   /* 道具が 無い＝直さない */
    if (xml === null || xml === undefined) return 誤り;
    var 字 = String(xml);
    if (字.replace(/^\s+|\s+$/g, '') === '') return 誤り;    /* ★XML が 空★（実測） */
    var 道 = (xpath === null || xpath === undefined) ? '' : String(xpath);
    if (道.replace(/^\s+|\s+$/g, '') === '') return 誤り;    /* ★XPath が 空★（実測） */

    var doc;
    try { doc = new T.DOMParser().parseFromString(既定の名前空間を外す(字), 'text/xml'); }
    catch (e) { return 誤り; }
    if (!doc || !doc.documentElement) return 誤り;
    /* ★壊れた XML は parsererror が 入る★（実測＝#VALUE!） */
    if (doc.getElementsByTagName('parsererror').length) return 誤り;

    /* ★接頭辞は 元の 字から 拾う★（既定の 名前空間だけ 外したので 接頭辞は 生きている） */
    var 名前空間 = {};
    var re = /xmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])([\s\S]*?)\2/g, m;
    while ((m = re.exec(字))) 名前空間[m[1]] = m[3];
    var 解く = function (p) { return 名前空間[p] || null; };

    var 節 = [];
    try {
      var r = doc.evaluate(道, doc, 解く, T.R.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (var i = 0; i < r.snapshotLength; i++) 節.push(r.snapshotItem(i));
    } catch (e) {
      return 誤り;                                          /* ★でたらめ／節を 返さない★（実測） */
    }
    if (!節.length) return 誤り;                            /* ★見つからない★（実測） */

    var 出 = [];
    for (var j = 0; j < 節.length; j++) {
      var v = 値にする(直の字(節[j]));
      /* ★中身が 空の 物は その 1つだけ #VALUE!★（実測＝途中だけ エラーに なる） */
      出.push([v === null ? { 誤り: 'VALUE' } : v]);
    }
    return 出;                                              /* ★縦1列★（実Excel と 同じ） */
  }

  return { 取り出す: 取り出す, _直の字: 直の字, _値にする: 値にする,
    _既定の名前空間を外す: 既定の名前空間を外す };
}));
