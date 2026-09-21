/* hon-no-nakami.js — ★持ち込んだ 本に 何が 組まれて いるかを 数えて 言葉に する★（2026-09-21）
 *
 *  ★★なぜ 要るか（司さん 2026-09-21・ア）★★
 *    「ユーザーが 持ってきた ファイルは 別ページで 保存
 *      （どんな 関数や マクロが 組まれてるか 説明、★ドロップダウンで 詳しく★）」
 *
 *  ★★ここで する事＝数えて 言葉に するだけ★★
 *    ・★本を 1バイトも 触りません★（読むだけ）
 *    ・★AIを 1回も 呼びません★（0円）
 *    ・★画面を 触りません★＝純粋な 計算だけ ⇒ node で そのまま 試験できる
 *
 *  ★★作り直して いない 事★★（`find-existing` を 走らせて 数えました）
 *    式から 関数名を 拾う  ... ★`lib/excel-version.js` の `functionsIn`★ を 呼ぶ
 *    マクロを 読む         ... ★`lib/vba.js`★（呼ぶ側が 読んで 渡す）
 *    マクロを 分ける       ... ★`lib/vba-mikata.js` の `見立てる`★（呼ぶ側が 渡す）
 *    ⇒★この 台は 1つも 自前で 解きません★＝★数えて 並べるだけ★
 *
 *  ★★一番 気を つけた 事＝「無い」と「読んで いない」を 混ぜない★★
 *    マクロの 欄が 3つ 在ります。
 *      ★在りません★ ... 本に マクロの 部品が 無い（`.xlsx` 等）
 *      ★読めません★ ... 部品は 在るが 開けなかった（★0本と 言わない★）
 *      ★N本★        ... 読めた
 *    ⇒★読んで いない 物を 0件と 言わない★（記憶の 決まり）
 *
 *  見張り: tests/hon-no-nakami.test.mjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HonNoNakami = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** ★式を 持つ マスを 1つずつ 渡す★（`sheets[].data[key] = {f:'=...'}`） */
  function 式のマスを回す(sheets, する) {
    (sheets || []).forEach(function (sh) {
      var d = (sh && sh.data) || {};
      Object.keys(d).forEach(function (key) {
        var c = d[key];
        if (!c || typeof c.f !== 'string' || c.f.charAt(0) !== '=') return;
        する(sh, key, c.f);
      });
    });
  }

  /** ★関数を 数える★
   *  @param sheets   画面の sheets（[{name, data}]）
   *  @param 拾う     式 ⇒ 関数名の 配列（★`ExcelVersion.functionsIn` を 渡す★）
   *  ★拾う を 省いたら 数えません★＝★自前で 式を 解かない★（0件と 言わずに 未測定に する）
   */
  function 関数を数える(sheets, 拾う) {
    if (typeof 拾う !== 'function') {
      return { 測った: false, 種類: 0, 数: 0, 式の在るマス: 0, 一覧: [] };
    }
    var 数 = {}, マス = 0;
    式のマスを回す(sheets, function (sh, key, f) {
      マス += 1;
      拾う(f).forEach(function (な) {
        var n = String(な || '').toUpperCase();
        if (!n) return;
        数[n] = (数[n] || 0) + 1;
      });
    });
    var 一覧 = Object.keys(数).map(function (n) { return { 名: n, 数: 数[n] }; })
      .sort(function (a, b) { return b.数 - a.数 || (a.名 < b.名 ? -1 : 1); });
    var 合計 = 0;
    一覧.forEach(function (x) { 合計 += x.数; });
    return { 測った: true, 種類: 一覧.length, 数: 合計, 式の在るマス: マス, 一覧: 一覧 };
  }

  /** ★マクロを 言葉に する★
   *  @param 読み   `Vba.読む()` の 返り（`null` ＝ ★本に 部品が 無い★）
   *  @param 見立て `VbaMikata.見立てる()` の 返り（省略可）
   *  ★★`null` と `{ok:false}` を 分けます★★
   */
  function マクロを数える(読み, 見立て) {
    if (読み === null || 読み === undefined) {
      return { ありさま: '無し', 本数: 0, なぜ: '', 手続き: [] };
    }
    if (!読み.ok) {
      return { ありさま: '読めません', 本数: -1, なぜ: String(読み.なぜ || ''), 手続き: [] };
    }
    var 手 = ((見立て && 見立て.手続き) || []).map(function (t) {
      return {
        名: String(t.名 || ''),
        分類: (t.分類 || []).slice(0, 3),
        行数: Number(t.行数 || 0),
      };
    });
    return {
      ありさま: '在ります',
      本数: (読み.モジュール || []).length,
      なぜ: String(読み.なぜ || ''),
      手続き: 手,
      手続きの本数: (見立て && 見立て.本数) || 0,
    };
  }

  /** ★1つに まとめる★ */
  function 数える(本) {
    var b = 本 || {};
    return {
      形: String(b.形 || ''),                 /* xlsx / xlsm / xlsb / xls */
      板: ((b.sheets) || []).length,
      関数: 関数を数える(b.sheets, b.関数を拾う),
      マクロ: マクロを数える(b.マクロの読み, b.マクロの見立て),
    };
  }

  /** ★★簡潔に 1文★★（★ドロップダウンの 頭に 出す 字★）
   *  ★「分かりません」を 飲み込まない★＝読めて いない 物は そう 書く
   */
  function 一文(数え) {
    var d = 数え || {};
    var 出 = [];
    出.push('板が ' + (d.板 || 0) + '枚');
    if (d.関数 && d.関数.測った) {
      出.push(d.関数.種類 === 0
        ? '式は 1つも ありません'
        : ('関数が ' + d.関数.種類 + '種類（' + d.関数.数 + '回）'));
    } else {
      出.push('関数は 数えていません');
    }
    var m = d.マクロ || {};
    if (m.ありさま === '無し') 出.push('マクロは ありません');
    else if (m.ありさま === '読めません') 出.push('マクロは 入っていますが 読めませんでした');
    else 出.push('マクロが ' + m.本数 + '本');
    return 出.join('／') + '。';
  }

  /** ★★詳しく（ドロップダウンの 中）★★
   *  ★画面を 作らない★＝★出すのは 行の 並びだけ★（絵は 呼ぶ側）
   */
  function 詳しく(数え) {
    var d = 数え || {};
    var 出 = [];
    if (d.関数 && d.関数.測った) {
      出.push({
        見出し: '関数（多い 順）',
        行: d.関数.一覧.map(function (x) { return x.名 + ' ... ' + x.数 + '回'; }),
        注: '式の 入った マス ' + d.関数.式の在るマス + '個から 数えました。',
      });
    } else {
      出.push({ 見出し: '関数', 行: [], 注: '★数えていません★（式を 読む 台を 渡していません）' });
    }
    var m = d.マクロ || {};
    if (m.ありさま === '在ります') {
      出.push({
        見出し: 'マクロ',
        行: m.手続き.map(function (t) {
          return t.名 + ' ... ' + (t.分類.length ? t.分類.join('／') : '分かりません')
            + '（' + t.行数 + '行）';
        }),
        注: m.なぜ ? ('読んだ 時の 断り ... ' + m.なぜ) : '',
      });
    } else if (m.ありさま === '読めません') {
      出.push({ 見出し: 'マクロ', 行: [], 注: '入っていますが 読めませんでした ... ' + m.なぜ });
    } else {
      出.push({ 見出し: 'マクロ', 行: [], 注: 'この 本に マクロは 入っていません。' });
    }
    return 出;
  }

  return {
    数える: 数える,
    関数を数える: 関数を数える,
    マクロを数える: マクロを数える,
    一文: 一文,
    詳しく: 詳しく,
  };
}));
