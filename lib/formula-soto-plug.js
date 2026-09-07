/* formula-soto-plug.js — ★外へ 出る 関数を エンジンに 繋ぐ★（2026-09-07）
 *
 *  ★★エンジンの 関数は「待てない」★★
 *    計算エンジン（HyperFormula）の 関数は ★その場で 答えを 返す★決まりです。
 *    でも 外へ 取りに 行くのは ★時間が かかります★。
 *    ⇒★★1回目は「取りに 行っています」を 返し、届いたら もう一度 計算する★★
 *      ①式を 押す → 覚え書きに 無い → ★取りに 行き始める★ → `#N/A` を 返す
 *      ②届く → 覚え書きに しまう → ★再計算を お願いする★
 *      ③もう一度 計算される → 覚え書きに 在る → ★答えが 出る★
 *    ⇒★実Excel は その場で 止まって 待ちます★＝★ここが 実Excel と 違う 所★
 *    ⇒★でも「答えが 出ない」のでは なく「少し 遅れて 出る」★
 *
 *  ★★同じ 住所は 1回しか 取りに 行かない★★
 *    ＝1000行 同じ 式が 在っても 外へ 出るのは 1回（お金と 待ち時間）
 *
 *  ★★外へ 出るのは `api/soto.js` 経由だけ★★
 *    画面から 直に 外へ 出しません（実測で「送るのは 通る」事が 分かっている）
 *
 *  見張り: tests/formula-soto.test.mjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FormulaSotoPlug = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ★覚え書き★ … 住所（か 頼み文）→ { 状態, 値, 訳 } */
  var 覚え = new Map();
  var 便 = null;          /* 外と やり取りする 道具（画面が 入れる／試験は 作り物を 入れる） */

  function 覚えを消す() { 覚え.clear(); }
  function 覚えの数() { return 覚え.size; }

  /** ★1回だけ 取りに 行く★（同じ 鍵で 2回 走らせない） */
  function 頼む(鍵, 走る) {
    var 今 = 覚え.get(鍵);
    if (今) return 今;
    var 札 = { 状態: '取得中', 値: null, 訳: '' };
    覚え.set(鍵, 札);
    Promise.resolve()
      .then(走る)
      .then(function (v) { 札.状態 = '済'; 札.値 = v; })
      .catch(function (e) { 札.状態 = 'だめ'; 札.訳 = (e && e.message) || '取りに 行けませんでした'; })
      .then(function () { if (便 && typeof 便.再計算 === 'function') { try { 便.再計算(); } catch (e2) { /* 続ける */ } } });
    return 札;
  }

  function つなぐ(H, F, 道具) {
    if (!H || !H.FunctionPlugin) return 0;
    便 = 道具 || 便;
    if (つなぐ.済み) return つなぐ.数;
    var CellError = H.CellError, ErrorType = H.ErrorType;
    var T = H.FunctionArgumentType || {};
    if (!CellError || !ErrorType || !T.ANY) return 0;

    function 値(自, ast, state, i) {
      if (!ast.args[i]) return null;
      var v = 自.evaluateAst(ast.args[i], state);
      if (v instanceof CellError) return v;
      return (v === null || v === undefined) ? null : v;
    }
    function 字(自, ast, state, i) {
      var v = 値(自, ast, state, i);
      if (v instanceof CellError) return v;
      return v === null ? '' : String(v);
    }
    function 数(自, ast, state, i) {
      var v = 値(自, ast, state, i);
      if (v instanceof CellError) return v;
      if (v === null || v === '') return null;
      var n = Number(v);
      return isFinite(n) ? n : null;
    }
    /** ★札を 答えに 直す★＝取得中は #N/A・だめは #VALUE! */
    function 札を答えに(札, 直す) {
      if (札.状態 === '取得中') return new CellError(ErrorType.NA);
      if (札.状態 === 'だめ') return new CellError(ErrorType.VALUE);
      var v = 直す ? 直す(札.値) : 札.値;
      if (v && v.誤り) return new CellError(ErrorType[v.誤り] || ErrorType.VALUE);
      return v;
    }
    function 取る(url) {
      if (!便 || typeof 便.取る !== 'function') throw new Error('外へ 出る 道具が 入っていません');
      return 便.取る(url);
    }
    function 聞く(文) {
      if (!便 || typeof 便.聞く !== 'function') throw new Error('AI に 聞く 道具が 入っていません');
      return 便.聞く(文);
    }

    var Plug = class extends H.FunctionPlugin {
      webservice(ast, state) {
        /* ★★住所は「式の 中に 直に 書いた 字」だけ★★（2026-09-07 指示役の 問いで 直した）
           ★なぜ★
             許した 相手だけに しても、`="https://許した相手/?q=" & A1` と 書けたら
             ★A1 の 中身は 相手に 届きます★（行き先は 安全でも ★中身が 出る★）
             ⇒★もらった ファイルに その 式が 仕込まれていたら 同じ事★
           ★直し★
             住所の 所が ★字そのもの（STRING）★で なければ 断る
             ⇒ セルを 指す／つなげる／関数で 作る … 全部 断る
             ⇒★★式を 書いた 時に 決まっている 住所しか 使えない★★
             ⇒★★だから 開いた 人の 中身は 出て行きようが ない★★ */
        var 一 = ast.args && ast.args[0];
        if (!一 || 一.type !== 'STRING') return new CellError(ErrorType.VALUE);
        var u = 字(this, ast, state, 0);
        if (u instanceof CellError) return u;
        if (!F.住所の形か(u)) return new CellError(ErrorType.VALUE);
        var 札 = 頼む('web|' + u, function () { return 取る(u); });
        return 札を答えに(札, function (v) { return String(v == null ? '' : v); });
      }
      stockhistory(ast, state) {
        var s = 字(this, ast, state, 0);
        if (s instanceof CellError) return s;
        var 始 = 数(this, ast, state, 1), 終 = 数(this, ast, state, 2);
        var 何を = 数(this, ast, state, 4);
        var 見出し = 数(this, ast, state, 3);
        var url = F.株の住所(s, 始, 終);
        if (!url) return new CellError(ErrorType.VALUE);
        var 札 = 頼む('stock|' + url, function () { return 取る(url); });
        var 出 = 札を答えに(札, function (v) {
          return F.株の表(v, 何を === null ? 0 : Math.floor(何を), 見出し === null ? 1 : (見出し ? 1 : 0));
        });
        if (出 instanceof CellError) return 出;
        return H.SimpleRangeValue ? H.SimpleRangeValue.onlyValues(出) : 出;
      }
      translate(ast, state) {
        var 文 = 字(this, ast, state, 0);
        if (文 instanceof CellError) return 文;
        var 元 = 字(this, ast, state, 1), 先 = 字(this, ast, state, 2);
        if (元 instanceof CellError) return 元;
        if (先 instanceof CellError) return 先;
        if (文 === '') return '';
        var 頼み = F.訳す頼み(文, 元, 先);
        var 札 = 頼む('ai|' + 頼み, function () { return 聞く(頼み); });
        return 札を答えに(札, function (v) { return F.訳を整える(v); });
      }
      detectlanguage(ast, state) {
        var 文 = 字(this, ast, state, 0);
        if (文 instanceof CellError) return 文;
        if (文 === '') return new CellError(ErrorType.VALUE);
        var 頼み = F.何語か頼み(文);
        var 札 = 頼む('ai|' + 頼み, function () { return 聞く(頼み); });
        return 札を答えに(札, function (v) { return F.言語コードを拾う(v); });
      }
    };

    var ArraySize = H.ArraySize;
    Plug.prototype.大きさSTOCK = function (ast, state) {
      var 高 = 1, 幅 = 2;
      try {
        var v = this.stockhistory(ast, state);
        if (!(v instanceof CellError)) {
          var d = (v && v.data) || v;
          if (Array.isArray(d)) { 高 = d.length || 1; 幅 = (d[0] && d[0].length) || 1; }
        }
      } catch (e) { /* 取れない時は 1×2 */ }
      return ArraySize ? new ArraySize(幅, 高) : { width: 幅, height: 高 };
    };

    var 何でも = { argumentType: T.ANY };
    var 任意 = { argumentType: T.ANY, optionalArg: true };
    Plug.implementedFunctions = {
      'WEBSERVICE':     { method: 'webservice',     parameters: [何でも] },
      'STOCKHISTORY':   { method: 'stockhistory',   sizeOfResultArrayMethod: '大きさSTOCK',
        parameters: [何でも, 任意, 任意, 任意, 任意, 任意, 任意] },
      'TRANSLATE':      { method: 'translate',      parameters: [何でも, 任意, 任意] },
      'DETECTLANGUAGE': { method: 'detectlanguage', parameters: [何でも] }
    };

    var 訳 = {};
    for (var k in Plug.implementedFunctions) {
      if (Object.prototype.hasOwnProperty.call(Plug.implementedFunctions, k)) 訳[k] = k;
    }
    try {
      H.registerFunctionPlugin(Plug, { enGB: 訳 });
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('関数を 足せませんでした（外）', e);
      return 0;
    }
    つなぐ.済み = true;
    つなぐ.数 = Object.keys(Plug.implementedFunctions).length;
    return つなぐ.数;
  }
  つなぐ.済み = false;
  つなぐ.数 = 0;

  return { つなぐ: つなぐ, 覚えを消す: 覚えを消す, 覚えの数: 覚えの数, 道具を入れる: function (d) { 便 = d; } };
}));
