/* xlsx-kazari.js — ★マスの 飾り（太字・字の色・塗り・罫線）を ★自前で★ 読む★（2026-09-21）
 *
 *  ★★なぜ 自前か★★
 *    ★借り物（SheetJS 0.20.3）は 飾りを ほとんど 捨てます★（2026-09-21 実測）
 *      `cellStyles: true` を 付けても
 *        ・`c.s` ＝ ★塗りだけ★（`{patternType:'solid', fgColor:{rgb:'FFFF00'}}`）
 *        ・`wb.Styles.Borders` ＝ ★10個 とも `{}`★（★罫線が 空★）
 *        ・マスが どの `cellXf` を 指すかの ★番号を 捨てます★
 *      ⇒★太字・字の色・罫線は 1つも 来ません★
 *    ⇒生の `xl/styles.xml` には ★ちゃんと 在ります★（同じ日 実測）
 *        `<font><b/><sz val="11"/><color rgb="FFFF0000"/>＝`
 *        `<border><left style="medium">＝<bottom style="thick">＝`
 *    ⇒★借り物を 増やさず 外す 向きに 進みます★
 *
 *  ★★何が 出来て いなかったか★★（`golden-kazari-gamen-made-2026-09-21.tsv`）
 *    実Excel が 作った 飾り付きの ファイルを お客さんの 道で 開いて 数えたら
 *    ★届いた 7 / 13★ で、★太字・字の色・罫線2つ・塗り・図形★ が 画面に 出て いませんでした。
 *
 *  ★★この 本が する 事★★
 *    `読む(シートのxml, stylesのxml)` ⇒ `{ 'A1': { bold, color, bgColor, border }, ＝ }`
 *    ・`bold`    ＝ true/false
 *    ・`color`   ＝ `'#FF0000'`（字の 色）
 *    ・`bgColor` ＝ `'#FFFF00'`（塗り）
 *    ・`border`  ＝ `{ top:1|2, bottom:1|2, left:1|2, right:1|2 }`
 *                  ★1＝細い ／ 2＝太い★（`book.html:drawBorder` が そう 描きます）
 *    ★台（`sheets[].data`）が 前から 持って いる 形に 合わせて います★
 *      ＝★新しい 持ち方を 作りません★（画面の 描き手を 1行も 変えずに 出ます）
 *
 *  ★★正規表現を 使いません★★
 *    `indexOf` だけで 切ります。
 *    ＝2026-09-21 に ★逆斜線の 逃がしが 途中で 落ちる★のを 8回 踏みました。
 *    ＝★この 本は 貝殻を 通して 直す 事が 有り得る★ので 最初から 避けます。
 *
 *  ★★測って いない 事★★
 *    ・`<color theme="＝"/>` ＝ ★テーマの 色表を 読んで いません★
 *        ⇒`rgb` が 一緒に 書いて あれば そちらを 使い、無ければ ★付けません★
 *        ⇒★当て推量で 黒を 入れません★（間違った 色より 色なしの 方が まし）
 *    ・`<color indexed="＝"/>` ＝ ★64 は 「自動」★＝★付けません★
 *        ⇒それ以外の 番号は ★未測定★＝付けません
 *    ・斜めの 罫線（`<diagonal>`）＝ ★台に 持ち方が 有りません★＝読みません
 *    ・`applyFont` / `applyFill` / `applyBorder` ＝ ★見て いません★
 *        ⇒`cellXfs` の `fontId`/`fillId`/`borderId` を そのまま 使って います
 *        ⇒★実Excel が これらを どう 使い分けるかは 測って いません★
 *
 *  見張り: tests/xlsx-kazari.test.mjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.XlsxKazari = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** ★`<名 ＝>＝</名>` と `<名 ＝ />` を 順に 取り出す★（正規表現を 使わない）
   *    返す 物 ＝ `[{ 属: '<名 ＝', 中: '＝' }, ＝]`
   *    ★`<名` の 次が 字なら 別の 札★（`<border` が `<borders` に 当たらない為） */
  function 札たち(xml, 名) {
    var 出 = [], i = 0, 開 = '<' + 名;
    var s = String(xml || '');
    while (true) {
      var a = s.indexOf(開, i);
      if (a < 0) break;
      var 次 = s.charAt(a + 開.length);
      if (次 !== ' ' && 次 !== '>' && 次 !== '/' && 次 !== '\t' && 次 !== '\n' && 次 !== '\r') {
        i = a + 開.length; continue;
      }
      var g = s.indexOf('>', a);
      if (g < 0) break;
      if (s.charAt(g - 1) === '/') { 出.push({ 属: s.slice(a, g), 中: '' }); i = g + 1; continue; }
      var 閉 = '</' + 名 + '>';
      var e = s.indexOf(閉, g);
      if (e < 0) { 出.push({ 属: s.slice(a, g), 中: '' }); i = g + 1; continue; }
      出.push({ 属: s.slice(a, g), 中: s.slice(g + 1, e) });
      i = e + 閉.length;
    }
    return 出;
  }

  /** ★`名="＝"` の 中身★（無ければ null） */
  function 属(字, 名) {
    var s = String(字 || '');
    var k = ' ' + 名 + '="';
    var a = s.indexOf(k);
    if (a < 0) return null;
    var b = s.indexOf('"', a + k.length);
    if (b < 0) return null;
    return s.slice(a + k.length, b);
  }

  /** ★中に `<名` が 在るか★（`<b/>` の ような 印） */
  function 印が在る(中, 名) {
    var s = String(中 || '');
    var 開 = '<' + 名;
    var a = s.indexOf(開);
    if (a < 0) return false;
    var 次 = s.charAt(a + 開.length);
    return 次 === ' ' || 次 === '>' || 次 === '/';
  }

  /** ★`FFFF0000`（ARGB）⇒ `'#FF0000'`★
   *    ★8桁なら 頭の 2桁は 透け具合★＝色では ありません。
   *    ★6桁なら そのまま★。★それ以外は null★（★当て推量で 色を 作らない★） */
  function 色にする(rgb) {
    var s = String(rgb || '').trim();
    if (s.length === 8) s = s.slice(2);
    if (s.length !== 6) return null;
    for (var i = 0; i < 6; i++) {
      var c = s.charAt(i).toUpperCase();
      if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F'))) return null;
    }
    return '#' + s.toUpperCase();
  }

  /** ★`<color ＝/>` から 色を 取る★（★取れなければ null＝付けません★） */
  function 色を取る(中) {
    var c = 札たち(中, 'color');
    if (!c.length) return null;
    return 色にする(属(c[0].属, 'rgb'));
  }

  /* ★★罫線の 太さ★★（`book.html:drawBorder` は 1＝細い ／ 2＝太い の 2段だけ）
       ★実Excel の 名前は 14通り 在ります★。★太い 側を 名指しで 並べます★
       ＝★名簿に 無い 物は 細い★に します（★見えなく するより 細く 出す★）
       ★測って いない 事★ ＝ ★この 振り分けが 実Excel の 見た目と 合うかは 未測定★ */
  var 太い側 = {
    medium: 1, thick: 1, double: 1,
    mediumDashed: 1, mediumDashDot: 1, mediumDashDotDot: 1,
  };
  function 太さ(style) {
    var s = String(style || '');
    if (!s || s === 'none') return 0;
    return 太い側[s] ? 2 : 1;
  }

  /** ★`xl/styles.xml` を 読んで 表に する★ */
  function 型を読む(stylesXml) {
    var s = String(stylesXml || '');

    var 字体 = 札たち(切り出す(s, 'fonts'), 'font').map(function (f) {
      var o = {};
      if (印が在る(f.中, 'b')) o.bold = true;
      if (印が在る(f.中, 'i')) o.italic = true;
      if (印が在る(f.中, 'u')) o.underline = true;
      var c = 色を取る(f.中);
      if (c) o.color = c;
      return o;
    });

    var 塗り = 札たち(切り出す(s, 'fills'), 'fill').map(function (f) {
      var p = 札たち(f.中, 'patternFill');
      if (!p.length) return {};
      if (属(p[0].属, 'patternType') !== 'solid') return {};
      var fg = 札たち(p[0].中, 'fgColor');
      if (!fg.length) return {};
      var c = 色にする(属(fg[0].属, 'rgb'));
      return c ? { bgColor: c } : {};
    });

    var 罫 = 札たち(切り出す(s, 'borders'), 'border').map(function (b) {
      var o = {};
      ['top', 'bottom', 'left', 'right'].forEach(function (向) {
        var t = 札たち(b.中, 向);
        if (!t.length) return;
        var w = 太さ(属(t[0].属, 'style'));
        if (w) o[向] = w;
      });
      return o;
    });

    /* ★`cellXfs` です★（`cellStyleXfs` では ありません＝名前付きの 型の 方） */
    var 組 = 札たち(切り出す(s, 'cellXfs'), 'xf').map(function (x) {
      return {
        字体: parseInt(属(x.属, 'fontId'), 10) || 0,
        塗り: parseInt(属(x.属, 'fillId'), 10) || 0,
        罫: parseInt(属(x.属, 'borderId'), 10) || 0,
      };
    });

    return { 字体: 字体, 塗り: 塗り, 罫: 罫, 組: 組 };
  }

  /** ★`<名 ＝>` から `</名>` までを 中身ごと 取る★（無ければ 空） */
  function 切り出す(xml, 名) {
    var t = 札たち(xml, 名);
    return t.length ? t[0].中 : '';
  }

  /** ★シートの xml から ★マス ⇒ cellXfs の 番号★ を 作る★
   *    `<c r="A1" s="7">` の `r` と `s` だけ 見ます（★中身は 読みません★） */
  function マスの型番(sheetXml) {
    var 出 = {};
    var s = String(sheetXml || '');
    var i = 0;
    while (true) {
      var a = s.indexOf('<c ', i);
      if (a < 0) break;
      var g = s.indexOf('>', a);
      if (g < 0) break;
      var 札 = s.slice(a, g);
      var r = 属(札, 'r');
      var n = 属(札, 's');
      if (r && n !== null) {
        var v = parseInt(n, 10);
        if (isFinite(v)) 出[r] = v;
      }
      i = g + 1;
    }
    return 出;
  }

  /** ★★口★★ ＝ シートの xml と styles の xml から 飾りを 作る
   *    返す 物 ＝ `{ 'A1': { bold, color, bgColor, border }, ＝ }`
   *    ★飾りが 1つも 無い マスは 入れません★（★空の 物を 増やさない★） */
  function 読む(sheetXml, stylesXml) {
    var 型 = 型を読む(stylesXml);
    var 番 = マスの型番(sheetXml);
    var 出 = {};
    Object.keys(番).forEach(function (ま) {
      var x = 型.組[番[ま]];
      if (!x) return;
      var o = {};
      var f = 型.字体[x.字体];
      if (f) {
        if (f.bold) o.bold = true;
        if (f.italic) o.italic = true;
        if (f.underline) o.underline = true;
        if (f.color) o.color = f.color;
      }
      var g = 型.塗り[x.塗り];
      if (g && g.bgColor) o.bgColor = g.bgColor;
      var b = 型.罫[x.罫];
      if (b && Object.keys(b).length) o.border = b;
      if (Object.keys(o).length) 出[ま] = o;
    });
    return 出;
  }

  return { 読む: 読む, 型を読む: 型を読む, マスの型番: マスの型番, 色にする: 色にする, 太さ: 太さ };
}));
