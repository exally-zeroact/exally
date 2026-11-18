/* table-open.js — ★式の中の表の字（Tbl[列]）をエンジンへ入れる前に開く入口①★（表① 1b・設計 exally-hyou-dougu/sekkei-1b-6.md）
 *   α＝旗が切れている＝★恒等（どの式も同じ字を返す）★。客の答えは変わらない。
 *   β で旗を入れる（関所＋TableRefs.rewriteTextFormula）。全部の口はこの1本を通す（tests/table-open-gate.test.mjs が口を数える）。
 *   ★投げない★（失敗した時は字をそのまま返す＝α／β では表の字を持つ式だけ =#REF!）
 *   使い方 開く(f, {sheet, r, c}) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TableOpen = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var 旗 = false;
  function 旗を立てる(b) { 旗 = !!b; }
  function 開く(f, 場所) {
    try {
      if (typeof f !== 'string' || f.charAt(0) !== '=') return f;
      if (!旗) return f;
      return f;               /* β で関所＋rewrite をここへ入れる */
    } catch (e) { return f; }
  }
  return { 開く: 開く, 旗を立てる: 旗を立てる };
}));
