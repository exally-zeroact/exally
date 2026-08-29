/* cell-styles.js — ★セルのスタイル（ホーム→スタイル）★ 2026-08-29
 *
 *  ★真値（実Excel 16.0 を COM で 読んだ 2026-08-29）★
 *    Excelの 標準スタイルは ★47個★。よく使う 9つを 中身ごと 測った。
 *    ★COM の Color は BGR★（0xBBGGRR）なので RGB に 直してある。
 *
 *      見出し 1        太字 15pt  字 #0E2841
 *      見出し 2        太字 13pt  字 #0E2841
 *      見出し 3        太字 11pt  字 #0E2841
 *      タイトル        18pt      字 #0E2841
 *      良い            11pt      字 #006100  塗り #C6EFCE
 *      悪い            11pt      字 #9C0006  塗り #FFC7CE
 *      どちらでもない  11pt      字 #9C5700  塗り #FFEB9C
 *      メモ            11pt      字 #000000  塗り #FFFFCC
 *      集計            太字 11pt  字 #000000
 *
 *  ★色は 実Excelの 値を そのまま 使う★＝ここは「見た目を 借りる」ではなく
 *  ★同じ書類を 開いた時に 同じに 見える★ための 相互運用。
 *  （うちの緑は うちの画面の色。セルの中身の 色は ファイルの 中身）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CellStyles = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* BGR → RGB（COM が 返す 形を 直す） */
  function bgr(n) {
    var b = (n >> 16) & 0xff, g = (n >> 8) & 0xff, r = n & 0xff;
    return '#' + [r, g, b].map(function (x) {
      var s = x.toString(16).toUpperCase();
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  var 一覧 = [
    { 名: '標準',           形: {} },
    { 名: '見出し 1',       形: { bold: true, fontSize: 15, color: '#0E2841' } },
    { 名: '見出し 2',       形: { bold: true, fontSize: 13, color: '#0E2841' } },
    { 名: '見出し 3',       形: { bold: true, fontSize: 11, color: '#0E2841' } },
    { 名: 'タイトル',       形: { fontSize: 18, color: '#0E2841' } },
    { 名: '良い',           形: { fontSize: 11, color: '#006100', bg: '#C6EFCE' } },
    { 名: '悪い',           形: { fontSize: 11, color: '#9C0006', bg: '#FFC7CE' } },
    { 名: 'どちらでもない', 形: { fontSize: 11, color: '#9C5700', bg: '#FFEB9C' } },
    { 名: 'メモ',           形: { fontSize: 11, color: '#000000', bg: '#FFFFCC' } },
    { 名: '集計',           形: { bold: true, fontSize: 11, color: '#000000' } },
  ];

  /* ★スタイルを 当てた時に 触る所★＝ここに 無い書式は 残す（Excelと 同じ）
     「標準」は ★この4つを 外す★＝元に戻す */
  var 触るキー = ['bold', 'fontSize', 'color', 'bg'];

  function 探す(名) {
    for (var i = 0; i < 一覧.length; i++) if (一覧[i].名 === 名) return 一覧[i];
    return null;
  }

  /** セル1つに 当てる（当てた物の 一覧を 返す＝元に戻す為） */
  function 当てる(cell, 名) {
    var st = 探す(名);
    if (!st || !cell) return null;
    var 控え = [];
    for (var i = 0; i < 触るキー.length; i++) {
      var k = 触るキー[i];
      var 新 = st.形[k];
      if (cell[k] === 新) continue;
      控え.push({ prop: k, old: cell[k], nw: 新 });
      if (新 === undefined) delete cell[k];
      else cell[k] = 新;
    }
    return 控え;
  }

  return { 一覧: 一覧, 探す: 探す, 当てる: 当てる, 触るキー: 触るキー, _bgr: bgr };
}));
