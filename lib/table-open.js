/* table-open.js — ★式の中の表の字（Tbl[列]）をエンジンへ入れる前に開く入口①★（表① 1b・設計 exally-hyou-dougu/sekkei-1b-6.md）
 *   旗が切れている＝★恒等（どの式も同じ字を返す）★（α）。旗が立つ（β1）＝関所＋TableRefs の書き換え。
 *   ★関所★（式の文字列・'シート名' の外だけを見る）：
 *     ・語[ の語が どの表の名前（大小無視）にも当たらない → 式全体を =#REF!（Xyz[b] が XyzB2:B3 に化けない）
 *     ・同じ名前の表が2つ以上在る → =#REF!（どちらか黙って選ばない）
 *     ・書き換えが null（未知の列・表の外の [@a]）→ =#REF!（黙って空・0にしない）
 *     ・設定が無い／書き換えが投げる → 表の字を持つ式だけ =#REF!（fail-closed）
 *   表の字を持たない式（外の本 [1]Sheet!A1・"[h]:mm"・CUBE…）は同じ字をそのまま返す。
 *   ★投げない★。使い方 設定({表たち, 板名, 書き換え}); 旗を立てる(true); 開く(f, {sheet, r, c}) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TableOpen = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var 旗 = false;
  var 設 = null;
  var 壊 = '=#REF!';
  function 旗を立てる(b) { 旗 = !!b; }
  function 設定(o) { 設 = o || null; }
  function 旗は() { return 旗; }

  function 括弧の終わり(f, pos) {
    var depth = 0, inQ = false;
    for (var i = pos; i < f.length; i++) {
      var ch = f.charAt(i);
      if (inQ) { inQ = false; continue; }
      if (ch === "'") { inQ = true; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (!depth) return i + 1; }
    }
    return f.length;
  }

  /* 文字列 "…" と '…' の外で 語[ と [@ を拾う */
  function 表の字を拾う(f) {
    var 出 = { 語: [], 裸at: false };
    var i = 0, n = f.length;
    while (i < n) {
      var ch = f.charAt(i);
      if (ch === '"') { i++; while (i < n) { if (f.charAt(i) === '"') { if (f.charAt(i + 1) === '"') { i += 2; continue; } i++; break; } i++; } continue; }
      if (ch === "'") { i++; while (i < n) { if (f.charAt(i) === "'") { if (f.charAt(i + 1) === "'") { i += 2; continue; } i++; break; } i++; } continue; }
      if (ch === '[') {
        /* 語に付かない [ ＝ [@列] は表の中の省略形。それ以外（外の本 [1]Sheet! など）は触らない */
        if (f.charAt(i + 1) === '@') 出.裸at = true;
        i = 括弧の終わり(f, i); continue;
      }
      if (/[A-Za-z_\\\u0080-￿]/.test(ch)) {
        var j = i;
        while (j < n && /[A-Za-z0-9_.\\\u0080-￿]/.test(f.charAt(j))) j++;
        if (f.charAt(j) === '[') { 出.語.push(f.slice(i, j)); i = 括弧の終わり(f, j); continue; }
        i = j; continue;
      }
      i++;
    }
    return 出;
  }

  function 開く(f, 場所) {
    try {
      if (typeof f !== 'string' || f.charAt(0) !== '=') return f;
      if (!旗) return f;
      if (f.indexOf('[') < 0) return f;
      var 拾 = 表の字を拾う(f);
      if (!拾.語.length && !拾.裸at) return f;            /* 表の字を持たない＝同じ字（外の本・"[h]:mm"・CUBE） */
      if (!設 || typeof 設.表たち !== 'function' || typeof 設.書き換え !== 'function') return 壊;
      var 表たち = 設.表たち() || [];
      var 板名 = (typeof 設.板名 === 'function') ? 設.板名(場所 && 場所.sheet) : (場所 && 場所.sheet);
      var r = 場所 ? 場所.r : 0, c = 場所 ? 場所.c : 0;
      var 数 = {};
      for (var a = 0; a < 表たち.length; a++) { var k = String(表たち[a].name).toLowerCase(); 数[k] = (数[k] || 0) + 1; }
      for (var w = 0; w < 拾.語.length; w++) {
        var low = 拾.語[w].toLowerCase();
        if (!数[low]) return 壊;                           /* 未知の表名 */
        if (数[low] > 1) return 壊;                        /* 同名の表 */
      }
      var 自分 = null;
      for (var b = 0; b < 表たち.length; b++) {
        var t = 表たち[b];
        if (t.sheet === 板名 && r >= t.rw1 && r <= t.rw2 && c >= t.cl1 && c <= t.cl2) { 自分 = t; break; }
      }
      var 答 = 設.書き換え(f, 表たち, { row: r, col: c, sheet: 板名, tables: 表たち }, 自分);
      if (typeof 答 !== 'string' || 答.charAt(0) !== '=') return 壊;
      return 答;
    } catch (e) {
      try {
        if (typeof f === 'string' && f.charAt(0) === '=' && 旗 && f.indexOf('[') >= 0) {
          var 拾2 = 表の字を拾う(f);
          if (拾2.語.length || 拾2.裸at) return 壊;
        }
      } catch (e2) { /* 下へ */ }
      return f;
    }
  }
  return { 開く: 開く, 旗を立てる: 旗を立てる, 設定: 設定, 旗は: 旗は, _表の字を拾う: 表の字を拾う };
}));
