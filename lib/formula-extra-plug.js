/* formula-extra-plug.js — ★足りない 関数を 計算エンジンに 繋ぐ★ 2026-08-31
 *
 *  ★中身（計算）は lib/formula-extra.js★（純粋＝node で 試験できる）。
 *  ★ここは 繋ぐだけ★＝HyperFormula の 決まりに 合わせる 所。
 *  ★同じ 計算を 2つ 書かない★（ずれの 元）。
 *
 *  ★足す 関数（14個）★
 *    AVERAGEIFS / TAKE / DROP / CHOOSECOLS / CHOOSEROWS /
 *    TOCOL / TOROW / WRAPROWS / WRAPCOLS / EXPAND /
 *    ARRAYTOTEXT / MODE.MULT / ★BAHTTEXT・ENCODEURL（2026-09-04 足した）★
 *
 *  ★答えは 実Excel を 打って 確かめた★（2026-08-31・全部 一致）
 *      AVERAGEIFS(E1:E3,D1:D3,"A")   → 20
 *      AVERAGEIFS(E1:E3,D1:D3,"Z")   → #DIV/0!
 *      TAKE(A1:B3,-1)                → 5,6
 *      DROP(A1:B3,0,1)               → 2,4,6（★`,,` は うちでは 通らない★＝下に 記録）
 *      CHOOSECOLS(A1:B3,3)           → #VALUE!
 *      TOROW({1,2;3,4},0,TRUE)       → 1,3,2,4
 *      WRAPROWS({1;2;3;4;5},2,0)     → 1,2,3,4,5,0
 *      EXPAND(A1:B3,4,3,0)           → 1,2,0,3,4,0,5,6,0,0,0,0
 *      EXPAND(A1:B3,2,2,0)           → #VALUE!（小さくは できない）
 *      ARRAYTOTEXT({1,2;3,4},1)      → {1,2;3,4}
 *      MODE.MULT({1;2;2;3;3})        → 2,3
 *
 *  ★足しかけて 止めた 物★
 *    ★YEN は 実Excel に 無い★（2026-08-31 実測＝#NAME?）。
 *    円は `DOLLAR` が 出す（DOLLAR(-1234.5,1) → ¥-1,234.5）。
 *    ★無い 関数を 足すのは 捏造★なので 止めた。
 *
 *  ★HyperFormula の FunctionPlugin は ★class★★（実測）
 *    ＝`Object.create(prototype)` では 中身が 繋がらず
 *    ★this.evaluateAst が undefined★に なる（2026-08-31 実際に 踏んだ）。
 *    ⇒ ★extends で 作る★。
 *
 *  見張り: tests/formula-extra.test.mjs（計算）＋ 実ブラウザで 実際に 打つ
 */
(function (root) {
  'use strict';

  /** ★エンジンに 繋ぐ★（画面から 1回だけ 呼ぶ）
   *  @return 繋いだ 関数の 数（0＝繋げなかった）
   */
  function つなぐ(H, F) {
    if (!H || !F || typeof H.registerFunctionPlugin !== 'function') return 0;
    if (つなぐ.済み) return つなぐ.数;                 /* ★2回 繋がない★ */

    var T = H.FunctionArgumentType;
    var CellError = H.CellError, ErrorType = H.ErrorType;
    var SRV = H.SimpleRangeValue;

    /** うちの 返り値（{誤り:'VALUE'} など）を エンジンの 形に 直す */
    function 直す(v) {
      if (v && typeof v === 'object' && !Array.isArray(v) && v.誤り) {
        return new CellError(ErrorType[v.誤り] || ErrorType.VALUE);
      }
      return v;
    }
    /** 表の 中の 誤りも 直す */
    function 表を直す(t) {
      return t.map(function (r) {
        return r.map(function (v) { return 直す(v); });
      });
    }
    /** 引数の 範囲を 表（2次元）に する */
    function 表に(a) {
      if (a === null || a === undefined) return [[a]];
      if (a instanceof CellError) return [[a]];
      if (typeof a.data !== 'undefined') return a.data;          /* SimpleRangeValue */
      if (typeof a.rawData === 'function') return a.rawData();
      if (Array.isArray(a)) return F.表にする(a);
      return [[a]];
    }
    /** 表を エンジンの 範囲の 形に する（★形を 保つ★
        ＝2026-08-29 に FILTER が 縦1列しか 返せず 月別合計が 全部 0に なった） */
    function 範囲に(v) {
      var d = 直す(v);
      if (d instanceof CellError) return d;
      if (!Array.isArray(d)) return d;
      return SRV ? SRV.onlyValues(表を直す(d)) : 表を直す(d);
    }
    /** 数の 引数（無ければ null） */
    function 数(自, ast, state, i) {
      if (!ast.args[i]) return null;
      var v = 自.evaluateAst(ast.args[i], state);
      if (v instanceof CellError) return v;
      if (v === null || v === undefined || v === '') return null;
      return Number(v);
    }

    var Plug = class extends H.FunctionPlugin {
      averageifs(ast, state) {
        var a = ast.args;
        if (a.length < 3 || a.length % 2 === 0) return new CellError(ErrorType.NA);
        var 平均 = 表に(this.evaluateAst(a[0], state));
        var 組 = [];
        for (var i = 1; i + 1 < a.length; i += 2) {
          組.push([表に(this.evaluateAst(a[i], state)), this.evaluateAst(a[i + 1], state)]);
        }
        return 直す(F.条件つき平均(平均, 組));
      }
      take(ast, state) { return this._切る(ast, state, false); }
      drop(ast, state) { return this._切る(ast, state, true); }
      _切る(ast, state, 落とすか) {
        var 表 = 表に(this.evaluateAst(ast.args[0], state));
        var r = 数(this, ast, state, 1), c = 数(this, ast, state, 2);
        if (r instanceof CellError) return r;
        if (c instanceof CellError) return c;
        return 範囲に(F.切り出す(表, r, c, 落とすか));
      }
      choosecols(ast, state) { return this._選ぶ(ast, state, true); }
      chooserows(ast, state) { return this._選ぶ(ast, state, false); }
      _選ぶ(ast, state, 列か) {
        var 表 = 表に(this.evaluateAst(ast.args[0], state));
        var 番 = [];
        for (var i = 1; i < ast.args.length; i++) {
          var t = 表に(this.evaluateAst(ast.args[i], state));
          for (var r = 0; r < t.length; r++) {
            for (var c = 0; c < t[r].length; c++) {
              var n = Number(t[r][c]);
              if (!isFinite(n)) return new CellError(ErrorType.VALUE);
              番.push(n);
            }
          }
        }
        return 範囲に(F.選び出す(表, 番, 列か));
      }
      tocol(ast, state) { return this._一本(ast, state, true); }
      torow(ast, state) { return this._一本(ast, state, false); }
      _一本(ast, state, 縦か) {
        var 表 = 表に(this.evaluateAst(ast.args[0], state));
        var 無視 = 数(this, ast, state, 1);
        if (無視 instanceof CellError) return 無視;
        var 列で = ast.args[2] ? !!this.evaluateAst(ast.args[2], state) : false;
        return 範囲に(F.一本にする(表, 無視 === null ? 0 : 無視, 列で, 縦か));
      }
      wraprows(ast, state) { return this._折る(ast, state, true); }
      wrapcols(ast, state) { return this._折る(ast, state, false); }
      _折る(ast, state, 行でか) {
        var 表 = 表に(this.evaluateAst(ast.args[0], state));
        var 幅 = 数(this, ast, state, 1);
        if (幅 instanceof CellError) return 幅;
        var 埋 = ast.args[2] ? this.evaluateAst(ast.args[2], state) : undefined;
        return 範囲に(F.折り返す(表, 幅, 埋, 行でか));
      }
      expand(ast, state) {
        var 表 = 表に(this.evaluateAst(ast.args[0], state));
        var r = 数(this, ast, state, 1), c = 数(this, ast, state, 2);
        if (r instanceof CellError) return r;
        if (c instanceof CellError) return c;
        var 埋 = ast.args[3] ? this.evaluateAst(ast.args[3], state) : undefined;
        return 範囲に(F.広げる(表, r, c, 埋));
      }
      arraytotext(ast, state) {
        var 表 = 表に(this.evaluateAst(ast.args[0], state));
        var 形 = 数(this, ast, state, 1);
        if (形 instanceof CellError) return 形;
        return F.表を字に(表, 形 === null ? 0 : 形);
      }
      bahttext(ast, state) {
        /* ★中身は lib/bahttext.js★（純粋＝node で 試験できる）。ここは 繋ぐだけ。
           ★答えは 実Excel に 打たせた 物★（tests/fixtures/bahttext-golden.json） */
        var v = this.evaluateAst(ast.args[0], state);
        if (v instanceof CellError) return v;
        var BT = (typeof require === 'function' && typeof module === 'object')
          ? require('./bahttext.js')
          : (typeof self !== 'undefined' ? self.BahtText : null);
        if (!BT) return new CellError(ErrorType.VALUE);
        /* ★空の セルは 0★（実Excel と 同じ・実測 =BAHTTEXT(Z99) → ศูนย์บาทถ้วน）
           ★エンジンは 空を ★Symbol（EmptyValue）★で 渡す★（2026-09-04 実測）
           ⇒ Number(Symbol) は ★その場で 落ちる★＝★式だけでなく 画面ごと 危ない★
           ⇒ ★2つ 並べて 守る★
              ①typeof v === 'symbol' … ★EmptyValue に 手が 届かない 時でも 効く★
              ②v === H.EmptyValue …… ★エンジンが 名前で 出している 時に 効く★
           ★どちらか 片方でも 今は 通る★＝★片方だけ 消しても 赤に ならない★
           ⇒★見張りは 2つ まとめて 外して 赤に なる事を 見る★（片方ずつでは 嘘に なる） */
        var 空か = (v === null || v === undefined || typeof v === 'symbol'
          || (H.EmptyValue !== undefined && v === H.EmptyValue));
        var x = 空か ? 0 : v;
        var 出 = BT.字にする(x);
        if (出 === null) return new CellError(ErrorType.VALUE);
        return 出;
      }
      encodeurl(ast, state) {
        /* ★中身は lib/encodeurl.js★／★外に 出ない（字を 変えるだけ）★
           ★答えは 実Excel に 75通り 打たせた 物★（tests/fixtures/encodeurl-golden.json） */
        var v = this.evaluateAst(ast.args[0], state);
        if (v instanceof CellError) return v;
        var EU = (typeof self !== 'undefined' && self.EncodeUrl) ? self.EncodeUrl
          : ((typeof require === 'function' && typeof module === 'object') ? require('./encodeurl.js') : null);
        if (!EU) return new CellError(ErrorType.VALUE);
        /* ★空の セルは Symbol で 来る★（BAHTTEXT で 踏んだ 型・2026-09-04）
           ⇒ String(Symbol) も ★落ちる★＝同じ 守りを 並べる */
        var 空か = (v === null || v === undefined || typeof v === 'symbol'
          || (H.EmptyValue !== undefined && v === H.EmptyValue));
        return EU.直す(空か ? '' : v);
      }
      modemult(ast, state) {
        var 表 = [];
        for (var i = 0; i < ast.args.length; i++) {
          var t = 表に(this.evaluateAst(ast.args[i], state));
          for (var r = 0; r < t.length; r++) 表.push(t[r]);
        }
        return 範囲に(F.最頻値たち(表));
      }
    };

    /* ★省略できる 引数は optionalArg を 付ける★
       ＝`TAKE(A1:B3,2)` のように ★後ろを 省く★書き方は これで 通る。

       ★★出来ない事（隠さない）★★
       ★`DROP(A1:B3,,1)` のように ★真ん中を 空ける★ 書き方は 通らない★。
       　実Excel は 通る（実測＝2,4,6）。うちは 式のまま 残る。
       　★`SUM(1,,2)` は 通る★＝★エンジンが 元から 持つ 関数だけ★の 扱い。
       　`optionalArg` も `defaultValue` も 試したが 変わらなかった（2026-08-31 実測）。
       　⇒ ★エンジン側の 決まり★。直すなら エンジンの 読み取り部を 触る事に なる。
       　★逃げ道★＝空ける 代わりに ★0 と 書く★（`DROP(A1:B3,0,1)` は 通る＝実測）。 */
    var 何でも = { argumentType: T.ANY };
    var 任意 = { argumentType: T.ANY, optionalArg: true };
    Plug.implementedFunctions = {
      'AVERAGEIFS':  { method: 'averageifs',  parameters: [何でも, 何でも, 何でも], repeatLastArgs: 2 },
      'TAKE':        { method: 'take',        parameters: [何でも, 任意, 任意] },
      'DROP':        { method: 'drop',        parameters: [何でも, 任意, 任意] },
      'CHOOSECOLS':  { method: 'choosecols',  parameters: [何でも, 何でも], repeatLastArgs: 1 },
      'CHOOSEROWS':  { method: 'chooserows',  parameters: [何でも, 何でも], repeatLastArgs: 1 },
      'TOCOL':       { method: 'tocol',       parameters: [何でも, 任意, 任意] },
      'TOROW':       { method: 'torow',       parameters: [何でも, 任意, 任意] },
      'WRAPROWS':    { method: 'wraprows',    parameters: [何でも, 何でも, 任意] },
      'WRAPCOLS':    { method: 'wrapcols',    parameters: [何でも, 何でも, 任意] },
      'EXPAND':      { method: 'expand',      parameters: [何でも, 任意, 任意, 任意] },
      'ARRAYTOTEXT': { method: 'arraytotext', parameters: [何でも, 任意] },
      'MODE.MULT':   { method: 'modemult',    parameters: [何でも], repeatLastArgs: 1 },
      'BAHTTEXT':    { method: 'bahttext',    parameters: [何でも] },
      'ENCODEURL':   { method: 'encodeurl',   parameters: [何でも] }
    };

    var 訳 = {};
    for (var k in Plug.implementedFunctions) {
      if (Object.prototype.hasOwnProperty.call(Plug.implementedFunctions, k)) 訳[k] = k;
    }

    try {
      H.registerFunctionPlugin(Plug, { enGB: 訳 });
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('関数を 足せませんでした', e);
      return 0;
    }
    つなぐ.済み = true;
    つなぐ.数 = Object.keys(Plug.implementedFunctions).length;
    return つなぐ.数;
  }
  つなぐ.済み = false;
  つなぐ.数 = 0;

  var api = { つなぐ: つなぐ };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FormulaExtraPlug = api;
}(typeof self !== 'undefined' ? self : this));
