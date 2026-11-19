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

  /* ★列名替え（β2b）★＝括弧 seg（[ ] 丸ごと）の 一番内側の 部品で 列の字が 旧（大小無視・' の逃がしを解いて）なら 新 に替える。
     [#見出し] 等の 指定子は 触らない。@ 付きで 英数_ 以外を含む新しい名は [@[新]] にする */
  function 逃がす(名) { return String(名).replace(/(['\[\]#])/g, "'$1"); }
  function 解く(名) { return String(名).replace(/'([\[\]#'])/g, '$1'); }
  function 括弧の中を替える(seg, 旧, 新) {
    var 旧小 = String(旧).toLowerCase(), 数 = 0, out = '', i = 0, n = seg.length;
    while (i < n) {
      var ch = seg.charAt(i);
      if (ch === "'") { out += seg.slice(i, i + 2); i += 2; continue; }
      if (ch === '[') {
        /* 一番内側か＝次の ] までに（逃がしを除いて）[ が無い */
        var j = i + 1, 内側 = true;
        while (j < n) {
          var cj = seg.charAt(j);
          if (cj === "'") { j += 2; continue; }
          if (cj === '[') { 内側 = false; break; }
          if (cj === ']') break;
          j++;
        }
        if (内側 && j < n) {
          var 中 = seg.slice(i + 1, j);
          var 前 = 中.charAt(0) === '@' ? '@' : '';
          var 名 = 前 ? 中.slice(1) : 中;
          if (名 && 名.charAt(0) !== '#' && 解く(名).toLowerCase() === 旧小) {
            var 書く = 逃がす(新);
            if (前 && !/^[A-Za-z0-9_\u0080-\uffff]+$/.test(新)) 書く = '[' + 書く + ']';
            out += '[' + 前 + 書く + ']'; 数++; i = j + 1; continue;
          }
          out += seg.slice(i, j + 1); i = j + 1; continue;
        }
      }
      out += ch; i++;
    }
    return { seg: out, 数: 数 };
  }
  /* 式 f の 表名[列] と（自分の表の中なら）[@列] の 列名 旧 を 新 に替える。文字列（" と ' で囲んだ所）の中は触らない。替えなければ 同じ字 */
  function 列名を替える(f, 表名, 旧, 新, 自分の表か) {
    if (typeof f !== 'string' || f.charAt(0) !== '=' || f.indexOf('[') < 0) return f;
    var 表小 = String(表名).toLowerCase(), out = '', i = 0, n = f.length, 数 = 0;
    while (i < n) {
      var ch = f.charAt(i);
      if (ch === '"' || ch === "'") {
        var q = ch, k = i + 1;
        while (k < n) { if (f.charAt(k) === q) { if (f.charAt(k + 1) === q) { k += 2; continue; } k++; break; } k++; }
        out += f.slice(i, k); i = k; continue;
      }
      if (ch === '[') {
        var e0 = 括弧の終わり(f, i);
        if (自分の表か && f.charAt(i + 1) === '@') { var r0 = 括弧の中を替える(f.slice(i, e0), 旧, 新); out += r0.seg; 数 += r0.数; }
        else out += f.slice(i, e0);
        i = e0; continue;
      }
      if (/[A-Za-z_\\\u0080-￿]/.test(ch)) {
        var j = i;
        while (j < n && /[A-Za-z0-9_.\\\u0080-￿]/.test(f.charAt(j))) j++;
        var 語 = f.slice(i, j);
        if (f.charAt(j) === '[') {
          var e1 = 括弧の終わり(f, j);
          if (語.toLowerCase() === 表小) { var r1 = 括弧の中を替える(f.slice(j, e1), 旧, 新); out += 語 + r1.seg; 数 += r1.数; }
          else out += f.slice(i, e1);
          i = e1; continue;
        }
        out += 語; i = j; continue;
      }
      out += ch; i++;
    }
    return 数 ? out : f;
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
  return { 開く: 開く, 旗を立てる: 旗を立てる, 設定: 設定, 旗は: 旗は, _表の字を拾う: 表の字を拾う, 列名を替える: 列名を替える };
}));
