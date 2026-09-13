/* shiki-hyou.js — ★表を 持ち・依存を 追い・変わった所だけ 計算し直す★（2026-09-13）
 *
 *  ★★土台を 自分で 作る ⑥枚目＝★本体★★★
 *    土台は ①字に切る ②形にする ③頼りの地図 ④順番と計算 ⑤溢れ、
 *    そして ★この 本体（表を 持つ・変わったら 直す）★です。
 *
 *  ★★なぜ ここを 先に やるか（2026-09-13 実測）★★
 *    借り物（HyperFormula・944,635字・GPLv3）の 中身を 2人で 別々に 測ったら：
 *      ★関数の 実装 … 423,496字 ＝ 44.8%★
 *      ★本体       … 521,139字 ＝ 55.2%★
 *    ⇒★関数を 519個 全部 作っても まだ 半分★。★本体の 方が 大きい★。
 *    ⇒ だから ★本体の 一番 小さい 一周★ を 先に 作って ★規模を 測ります★。
 *
 *  ★★この 台が やる 事（★見ていない範囲も 先に 書く★）★★
 *    やる  … ①マスに 値／式を 置く ②式を 計算する ③★誰が 誰を 見ているか 覚える★
 *            ④★1マス 変えたら その マスを 見ている 式だけ★ 計算し直す
 *            ⑤★輪（A1→A2→A1）を 見つけて #REF! に する★
 *    ★やらない★ … 溢れ（土台⑤）／行の 挿入で 式を 追従させる／元に 戻す／
 *                  複数の 板（シート）／関数は ★shiki-kansuu.js が 知っている 7個だけ★
 *    ⇒★出来て いない 物を 出来た 顔で 混ぜない★
 *
 *  ★値の 形★ `shiki-keisan.js` と 同じ { 型:'数'|'字'|'真偽'|'誤'|'空', 値 }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    typeof require === 'function' ? require('./shiki-kiru.js') : root.ShikiKiru,
    typeof require === 'function' ? require('./shiki-katachi.js') : root.ShikiKatachi,
    typeof require === 'function' ? require('./shiki-sansho.js') : root.ShikiSansho,
    typeof require === 'function' ? require('./shiki-keisan.js') : root.ShikiKeisan,
    typeof require === 'function' ? require('./shiki-kansuu.js') : root.ShikiKansuu);
  else root.ShikiHyou = factory(root.ShikiKiru, root.ShikiKatachi, root.ShikiSansho,
    root.ShikiKeisan, root.ShikiKansuu);
})(typeof self !== 'undefined' ? self : this, function (切, 形, 参, 計, 関) {
  'use strict';

  /* ══ ★マスの 名前（A1）と 番地（行,列）を 行き来する★ ══ */
  function 名から番地(名) {
    var m = /^\$?([A-Z]+)\$?([0-9]+)$/.exec(String(名).toUpperCase());
    if (!m) return null;
    var 列 = 0;
    for (var i = 0; i < m[1].length; i++) 列 = 列 * 26 + (m[1].charCodeAt(i) - 64);
    return { 行: +m[2] - 1, 列: 列 - 1 };
  }
  function 番地から名(行, 列) {
    var s = '', c = 列 + 1;
    while (c > 0) { var r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = ((c - r) / 26) | 0; }
    return s + (行 + 1);
  }

  function 表() {
    /* ★マスの 中身★ … 名前 → { 打った字, 値, 形 } */
    var 中身 = {};
    /* ★頼り の 向き★ … 「A2 は A1 を 見ている」を 2つの 向きで 持つ
       ★なぜ 2つ 持つか★＝A1 が 変わった時に ★A1 を 見ている 者★を すぐ 引ける様に */
    var 見ている = {};   /* A2 → [A1, B1]（A2 が 見ている 先） */
    var 見られている = {}; /* A1 → [A2]（A1 を 見ている 者） */

    function 空に() { return 計.空; }

    /* ★式の 木から「見ている マス」を 全部 拾う★（四角は ほどいて 1つずつ） */
    function 頼りを拾う(木, 出) {
      if (!木 || typeof 木 !== 'object') return out(出);
      if (木.種 === '名') {
        var n = String(木.値).toUpperCase();
        if (n !== 'TRUE' && n !== 'FALSE' && 名から番地(n)) 出.push(n);
        return 出;
      }
      if (木.種 === '二' && 木.記 === ':') {
        var a = 名から番地(String(木.左.値).toUpperCase());
        var b = 名から番地(String(木.右.値).toUpperCase());
        if (a && b) {
          for (var r = Math.min(a.行, b.行); r <= Math.max(a.行, b.行); r++)
            for (var c = Math.min(a.列, b.列); c <= Math.max(a.列, b.列); c++)
              出.push(番地から名(r, c));
        }
        return 出;
      }
      for (var k in 木) {
        if (!Object.prototype.hasOwnProperty.call(木, k)) continue;
        var v = 木[k];
        if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) 頼りを拾う(v[i], 出); }
        else if (v && typeof v === 'object') 頼りを拾う(v, 出);
      }
      return 出;
      function out(x) { return x; }
    }

    /* ★木を 歩いて 計算する★（★輪は 呼ぶ側が 見つける★） */
    function 歩く(木, 手, 通り道) {
      switch (木.種) {
        case '数': return 計.数(計.打った数(木.値));
        case '字': return 計.字(String(木.値).slice(1, -1).split('""').join('"'));
        case '誤': return 計.誤(木.値);
        case '括': return 歩く(木.子, 手, 通り道);
        case '前': return 計.前置き(木.記, 歩く(木.子, 手, 通り道), 手);
        case '後': return 計.後置き(木.記, 歩く(木.子, 手, 通り道), 手);
        case '二':
          if (木.記 === ':') return 計.誤('#VALUE!');   /* ★四角は 関数の 引数の 所だけ★ */
          return 計.つなぎ(木.記, 歩く(木.左, 手, 通り道), 歩く(木.右, 手, 通り道), 手);
        case '名': {
          var n = String(木.値).toUpperCase();
          if (n === 'TRUE') return 計.真偽(true);
          if (n === 'FALSE') return 計.真偽(false);
          if (名から番地(n)) return 読む(n, 通り道);
          return 計.誤('#NAME?');
        }
        case '呼': {
          var 引数たち = 木.引数.map(function (子) {
            if (子.種 === '二' && 子.記 === ':') {
              return { 種: '四角', 並び: 四角を読む(String(子.左.値), String(子.右.値), 通り道) };
            }
            if (子.種 === '名') {
              var nn = String(子.値).toUpperCase();
              if (nn !== 'TRUE' && nn !== 'FALSE' && 名から番地(nn)) {
                return { 種: 'マス', 値: 読む(nn, 通り道) };
              }
            }
            return { 種: '直', 値: 歩く(子, 手, 通り道) };
          });
          var 出 = 関.呼ぶ(木.名, 引数たち, 手);
          /* ★知らない 関数は ★#NAME?★ と 言う＝半分 合う 答えを 出さない★ */
          if (出 === null) return 計.誤('#NAME?');
          return 出;
        }
        default: return 計.誤('#VALUE!');
      }
    }

    function 四角を読む(左, 右, 通り道) {
      var a = 名から番地(左), b = 名から番地(右), 並び = [];
      if (!a || !b) return 並び;
      for (var r = Math.min(a.行, b.行); r <= Math.max(a.行, b.行); r++)
        for (var c = Math.min(a.列, b.列); c <= Math.max(a.列, b.列); c++)
          並び.push(読む(番地から名(r, c), 通り道));
      return 並び;
    }

    /* ★1つの マスの 値を 読む★（★輪を ここで 見つける★） */
    function 読む(名, 通り道) {
      var n = String(名).toUpperCase();
      var m = 中身[n];
      if (!m) return 空に();
      if (m.形) {
        if (通り道 && 通り道.indexOf(n) >= 0) return 計.誤('#REF!');  /* ★輪★ */
        if (m.値 === undefined) 計算する(n, (通り道 || []).concat([n]));
      }
      return m.値 === undefined ? 空に() : m.値;
    }

    function 計算する(名, 通り道) {
      var m = 中身[名];
      if (!m || !m.形) return;
      m.値 = 歩く(m.形, m.手 || {}, 通り道 || [名]);
    }

    /* ══ ★外に 出す 物★ ══ */
    return {
      /* ★マスに 打つ★（`=` で 始まれば 式） */
      打つ: function (名, 字) {
        var n = String(名).toUpperCase();
        var s = String(字 == null ? '' : 字);
        /* ★前に 見ていた 先から 自分を 外す★ */
        var 前 = 見ている[n] || [];
        for (var i = 0; i < 前.length; i++) {
          var 者 = 見られている[前[i]];
          if (者) { var k = 者.indexOf(n); if (k >= 0) 者.splice(k, 1); }
        }
        見ている[n] = [];

        if (s.charAt(0) === '=') {
          var か = 切.切る(s.slice(1));
          if (!か.ok) { 中身[n] = { 打った字: s, 形: null, 値: 計.誤('#VALUE!') }; return; }
          var y = 形.形にする(か.出);
          if (!y.ok) { 中身[n] = { 打った字: s, 形: null, 値: 計.誤('#VALUE!') }; return; }
          中身[n] = { 打った字: s, 形: y.形, 値: undefined };
          var 先 = 頼りを拾う(y.形, []);
          見ている[n] = 先;
          for (var j = 0; j < 先.length; j++) {
            if (!見られている[先[j]]) 見られている[先[j]] = [];
            if (見られている[先[j]].indexOf(n) < 0) 見られている[先[j]].push(n);
          }
        } else if (s === '') {
          中身[n] = { 打った字: '', 形: null, 値: 計.空 };
        } else {
          var d = 計.字を数に(s, {});
          中身[n] = { 打った字: s, 形: null,
            値: (d === null) ? 計.字(s) : 計.数(計.打った数(String(d))) };
        }
        /* ★このマスを 見ている 式だけ★ 計算し直す */
        直す(n);
      },

      /* ★読む★（値の 形の まま） */
      値: function (名) { return 読む(名, []); },

      /* ★画面に 出す 字★ */
      字: function (名) {
        var v = 読む(名, []);
        if (v.型 === '誤') return v.値;
        if (v.型 === '真偽') return v.値 ? 'TRUE' : 'FALSE';
        if (v.型 === '数') return 計.数を字に(v.値);
        if (v.型 === '空') return '';
        return v.値;
      },

      /* ★誰が 誰を 見ているか（測る為に 外へ 出す）★ */
      見ている: function (名) { return (見ている[String(名).toUpperCase()] || []).slice(); },
      見られている: function (名) { return (見られている[String(名).toUpperCase()] || []).slice(); },

      /* ★数えた 回数（★変わった所だけ 直したか★を 測る為）★ */
      直した回数: 0,
      中身: 中身
    };

    /* ★変わった マスを 見ている 式を たどって 計算し直す★
       ★全部 計算し直さない★＝ここが 本体の 肝 */
    function 直す(変わった) {
      var 待ち = (見られている[変わった] || []).slice();
      var 済 = {};
      while (待ち.length) {
        var n = 待ち.shift();
        if (済[n]) continue;
        済[n] = true;
        var m = 中身[n];
        if (m && m.形) { m.値 = undefined; 計算する(n, [n]); }
        var 次 = 見られている[n] || [];
        for (var i = 0; i < 次.length; i++) if (!済[次[i]]) 待ち.push(次[i]);
      }
    }
  }

  return { 表: 表, 名から番地: 名から番地, 番地から名: 番地から名 };
});
