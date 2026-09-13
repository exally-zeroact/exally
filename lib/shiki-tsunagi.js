/* shiki-tsunagi.js — ★自前で 書いた 関数を「自前の エンジン」に 繋ぐ 皮★（2026-09-14）
 *
 *  ★★これが「借り物を 外す」の 本丸です★★
 *    司さん 2026-09-13「借り物が あったら 商用など いろいろ 引っかかる。★自作で やれって 前から いよろが★」
 *    司さん 2026-09-14「★まず 借り物を なくすのが お前の 仕事や★」
 *
 *  ★★分かった 事（2026-09-14・経営者1 の 検算 → 私が 別の手で 裏を 取った）★★
 *    ・自前で 書いた 関数は ★65個★（`lib/formula-*-plug.js`）＝私は「7個」と 言って いた（10倍 少ない）
 *    ・★中身（計算）は もう 借り物から 独立して います★＝
 *      require を 差し替えて ★hyperformula を 読もうと したら 例外★ に した 状態で
 *      formula-extra / nokori / kane / yosoku / complex を 読み込み ⇒ ★83個の 部品が 動いた★
 *      ★借り物を 読もうと した 回数 = 0★
 *    ⇒★借り物に ぶら下がって いるのは 「皮」（-plug.js）だけ★
 *    ⇒★やる事は「65個を 書き直す」では なく「皮を 差し替える」★
 *
 *  ★★この 台の 仕事★★
 *    `lib/formula-*.js`（中身）を ★自前の エンジン（shiki-hyou / shiki-kansuu）★ から 呼べる形に する。
 *    ★中身は 1行も 触りません★＝[[feedback_mihon_no_michi_ga_futatsu_aru_toki_katahou_dake_naosu_na]]
 *
 *  ★★値の 形の 行き来★★
 *    自前の エンジン … { 型:'数'|'字'|'真偽'|'誤'|'空', 値 }  ／ 四角は { 溢れ, 行数, 列数, 並び }
 *    中身の 部品     … ★素の 値★（数は number・字は string・表は [[…],…]）
 *    ⇒ ここで ★ほどく／包む★ だけ します。
 *
 *  ★★見て いない 範囲（★書かない 皮は「全部 繋いだ」と 読まれる★）★★
 *    ・今 繋いで いるのは ★formula-extra の 13個だけ★（★残り 52個は まだ★）
 *    ・借り物側の `-plug.js` は ★そのまま★＝★対応表が 2本 在る 状態★です。
 *      ⇒★片方だけ 増えると 食い違う★ので ★見張りで 突き合わせます★
 *        （tests/shiki-tsunagi.test.mjs が ★両方に 同じ 関数名が 載っているか★ を 見る）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    typeof require === 'function' ? require('./shiki-keisan.js') : root.ShikiKeisan,
    typeof require === 'function' ? require('./shiki-afure.js') : root.ShikiAfure,
    typeof require === 'function' ? require('./formula-extra.js') : root.FormulaExtra);
  else root.ShikiTsunagi = factory(root.ShikiKeisan, root.ShikiAfure, root.FormulaExtra);
})(typeof self !== 'undefined' ? self : this, function (計, 溢, 中) {
  'use strict';

  /* ══ ★自前の 値 → 素の 値★（中身の 部品に 渡す 形） ══ */
  function ほどく(v) {
    if (溢.溢れか(v)) return v.並び.map(function (段) { return 段.map(ほどく); });
    if (!v || !v.型) return v;
    if (v.型 === '空') return null;
    if (v.型 === '誤') return { 誤: v.値 };        /* ★誤りは 印を 付けて 渡す★ */
    return v.値;
  }

  /* ══ ★素の 値 → 自前の 値★（エンジンへ 返す 形） ══ */
  function 包む(x) {
    if (x === null || x === undefined) return 計.空;
    if (Array.isArray(x)) {
      var 並び = x.map(function (段) {
        return (Array.isArray(段) ? 段 : [段]).map(包む);
      });
      return 溢.溢れ(並び);
    }
    if (typeof x === 'number') return 計.数(x);
    if (typeof x === 'boolean') return 計.真偽(x);
    if (typeof x === 'object' && x.誤) return 計.誤(x.誤);
    if (typeof x === 'string') {
      /* ★中身の 部品は 誤りを 字で 返す 事が 在る★（'#DIV/0!' など） */
      if (/^#[A-Z0-9/!?]+$/.test(x)) return 計.誤(x);
      return 計.字(x);
    }
    return 計.誤('#VALUE!');
  }

  /* ══ ★引数の 受け取り方★ ══
     ★四角と 直に 書いた 物を 分けない★＝中身の 部品は 表を 受ける 作りなので
     ★そのまま 素に して 渡す★（[[feedback_dasu_mae_ni_fumu_mon]] の 門2＝見ていない範囲を 書く）
     ⇒★ここで 型の 決まり（四角の 中の 字は 無視 等）は ★掛けて いません★★
       掛けるのは `shiki-kansuu.js` の 7個だけ。★混ぜない★ */
  function 素にする(引数たち) {
    return 引数たち.map(function (a) {
      if (a.種 === '四角') return a.並び.map(function (v) { return [ほどく(v)]; });
      return ほどく(a.値);
    });
  }

  /* ══ ★対応表★ ══
     ★関数名 → 中身の 部品 ＋ 引数の 渡し方★
     ★答えは 実Excel を 打って 確かめ済み★（`lib/formula-extra-plug.js` の 頭に 実測が 在る） */
  var 表 = {
    /* ★組（条件の 対）を 作って 渡す★＝AVERAGEIFS(平均する, 範囲1, 条件1, …)
       ★条件は 表に しない★（借り物の 皮も `evaluateAst` の 生の 値を 渡して いる） */
    'AVERAGEIFS': function (素) {
      var 組 = [];
      for (var i = 1; i + 1 < 素.length; i += 2) 組.push([表にする(素[i]), 素[i + 1]]);
      return 中.条件つき平均(表にする(素[0]), 組);
    },
    /* ★TAKE と DROP は 同じ 部品＝最後の「落とすか」で 分ける★ */
    'TAKE': function (素) { return 中.切り出す(表にする(素[0]), 数に(素[1]), 数に(素[2]), false); },
    'DROP': function (素) { return 中.切り出す(表にする(素[0]), 数に(素[1]), 数に(素[2]), true); },
    /* ★CHOOSECOLS と CHOOSEROWS も 同じ 部品＝「列か」で 分ける★
       ★2つ目 以降を 全部 数に ほどいて 並べる★ */
    'CHOOSECOLS': function (素) { return 中.選び出す(表にする(素[0]), 番号たち(素), true); },
    'CHOOSEROWS': function (素) { return 中.選び出す(表にする(素[0]), 番号たち(素), false); },
    /* ★TOCOL と TOROW も 同じ 部品＝「縦か」で 分ける★ */
    'TOCOL': function (素) { return 中.一本にする(表にする(素[0]), 数に(素[1]) || 0, !!素[2], true); },
    'TOROW': function (素) { return 中.一本にする(表にする(素[0]), 数に(素[1]) || 0, !!素[2], false); },
    /* ★WRAPROWS と WRAPCOLS も 同じ 部品＝「行でか」で 分ける★ */
    'WRAPROWS': function (素) { return 中.折り返す(表にする(素[0]), 数に(素[1]), 素[2], true); },
    'WRAPCOLS': function (素) { return 中.折り返す(表にする(素[0]), 数に(素[1]), 素[2], false); },
    'EXPAND': function (素) { return 中.広げる(表にする(素[0]), 数に(素[1]), 数に(素[2]), 素[3]); },
    'ARRAYTOTEXT': function (素) { return 中.表を字に(表にする(素[0]), 数に(素[1])); },
    'MODE.MULT': function (素) { return 中.最頻値たち(表にする(素[0])); },
    'BAHTTEXT': function (素) { return 中.bahttext ? 中.bahttext(素[0]) : null; }
  };

  /* ★素の 値を 表（[[…],…]）に する★＝中身の 部品は 表を 受ける 作り */
  function 表にする(x) {
    if (x === null || x === undefined) return [[x]];
    if (Array.isArray(x)) return 中.表にする ? 中.表にする(x) : x;
    return [[x]];
  }
  /* ★数に する（省いた 引数は null）★ */
  function 数に(x) {
    if (x === null || x === undefined) return null;
    if (Array.isArray(x)) return 数に(x.length && Array.isArray(x[0]) ? x[0][0] : x[0]);
    var n = Number(x);
    return isFinite(n) ? n : null;
  }
  /* ★2つ目 以降を 全部 数に ほどいて 並べる★（CHOOSECOLS / CHOOSEROWS） */
  function 番号たち(素) {
    var 出 = [];
    for (var i = 1; i < 素.length; i++) {
      var t = 表にする(素[i]);
      for (var r = 0; r < t.length; r++) {
        for (var c = 0; c < t[r].length; c++) {
          var n = Number(t[r][c]);
          if (isFinite(n)) 出.push(n);
        }
      }
    }
    return 出;
  }

  /* ★知らない 名前は 呼ばない★＝★半分 合う 計算を 出さない★ */
  function 呼ぶ(名前, 引数たち) {
    var f = 表[String(名前).toUpperCase()];
    if (!f) return null;                      /* ★null＝この 皮は 知らない★ */
    try {
      return 包む(f(素にする(引数たち)));
    } catch (e) {
      return 計.誤('#VALUE!');
    }
  }

  /* ★繋いだ 関数の 名前（見張りが 数える）★ */
  function 名前たち() { return Object.keys(表); }

  return { 呼ぶ: 呼ぶ, 名前たち: 名前たち, 表: 表, ほどく: ほどく, 包む: 包む };
});
