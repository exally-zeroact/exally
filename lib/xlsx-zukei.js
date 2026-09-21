/* xlsx-zukei.js — ★図形（判子）を ★自前で★ 読む★（2026-09-21）
 *
 *  ★★なぜ 要るか★★
 *    実Excel が 作った ファイルを お客さんの 道で 開いて 数えたら
 *    ★図形が 画面に 1つも 出て いません★でした
 *    （`docs/measured/golden-kazari-gamen-made-2026-09-21.tsv`）。
 *    因 ＝ ★`xl/drawings/drawing1.xml` を 読む 所が 1つも 在りません★。
 *    借り物（SheetJS 0.20.3）も ★図形を くれません★。
 *
 *  ★★何を 読むか★★（`tests/fixtures/kazari-hiraku3.xlsx` の 生の字・実測）
 *    <xdr:twoCellAnchor>
 *      <xdr:from><xdr:col>5</xdr:col><xdr:colOff>635000</xdr:colOff>
 *                <xdr:row>1</xdr:row><xdr:rowOff>30162</xdr:rowOff></xdr:from>
 *      <xdr:to>  <xdr:col>7</xdr:col>...</xdr:to>
 *      <xdr:sp><xdr:nvSpPr><xdr:cNvPr id="2" name="hanko"/>...
 *        <xdr:spPr><a:xfrm><a:off x="4064000" y="254000"/>
 *                          <a:ext cx="762000" cy="762000"/></a:xfrm>
 *                  <a:prstGeom prst="rect"/></xdr:spPr>
 *
 *  ★★EMU★★ ＝ 914400 で 1インチ。★画面の 点は 96dpi★ ⇒ ★9525 EMU で 1点★
 *    762000 EMU ÷ 9525 ＝ ★80点★（＝60pt × 4/3・実Excel の Width 60 と 合う）
 *
 *  ★★★位置は `xfrm` では なく `twoCellAnchor` で 決めます★★★
 *    この ファイルの `xfrm` は `x=4064000`（＝320pt）ですが、
 *    ★実Excel に 聞くと Left は 449.375pt★ です（経営者1 の 実測・09-21）。
 *    ⇒★図形が `Placement 1`（マスと 一緒に 動く）で、A列の 幅を 30 に 広げた から★
 *    ⇒★`xfrm` は 置いた 時の 古い 数★＝★これを 使うと 左に ずれます★
 *    ⇒★マスと ずれ（`from`）から 出します★＝★うちの 列幅で そのまま 正しく なります★
 *    ★これは 往復の 穴では ありません★（元の ファイルでも 449.375・同じ 実測）
 *
 *  ★★形の 名前★★（`prstGeom prst=`）＝`lib/objects.js` の `形たち` に 合わせます
 *    rect→四角 ／ roundRect→角丸四角 ／ ellipse→丸 ／ triangle→三角
 *    rightArrow→右矢印 ／ star5→星
 *    ★名簿に 無い 形は `種類` を 付けません★
 *      ⇒`lib/objects.js:描く` は ★知らない 種類を 四角で 描きます★
 *      ⇒★消えるより 四角で 出る 方が まし★（★見えない のが 一番 悪い★）
 *
 *  ★★測って いない 事★★
 *    ・★色は 付けません★
 *        この ファイルの 図形は `<a:schemeClr val="accent1"/>`＝★テーマの 色★です。
 *        ★テーマの 色を 決め打ちに できるかは 未測定★（経営者1・09-21）
 *        ⇒★当て推量で 色を 作りません★＝`lib/objects.js` の 既定の 色で 出ます
 *        ⇒`<a:srgbClr val="FF0000"/>` の ように ★字で 書いて あれば★ 使います
 *    ・`oneCellAnchor` / `absoluteAnchor` は ★まだ★（この 材料に 在りません）
 *    ・回転（`a:xfrm rot=`）は 読みますが ★実Excel と 合うかは 未測定★
 *    ・図形の 中の 字（`txBody`）は ★まだ★
 *    ・線の 太さ（`a:ln w=`）は ★まだ★
 *
 *  ★★正規表現を 使いません★★（`indexOf` だけ）
 *    ＝2026-09-21 に ★逆斜線の 逃がしが 落ちる★のを 8回 踏みました。
 *
 *  見張り: tests/xlsx-zukei.test.mjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.XlsxZukei = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EMU = 9525;          /* ★9525 EMU ＝ 1点（96dpi）★ */

  /** ★`<名 ＝>＝</名>` と `<名 ＝/>` を 順に 取り出す★（`lib/xlsx-kazari.js` と 同じ 手） */
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

  function 属(字, 名) {
    var s = String(字 || '');
    var k = ' ' + 名 + '="';
    var a = s.indexOf(k);
    if (a < 0) return null;
    var b = s.indexOf('"', a + k.length);
    if (b < 0) return null;
    return s.slice(a + k.length, b);
  }

  /** ★`<xdr:col>5</xdr:col>` の 中の 数★（無ければ 0） */
  function 数を取る(中, 名) {
    var t = 札たち(中, 名);
    if (!t.length) return 0;
    var n = parseInt(String(t[0].中).trim(), 10);
    return isFinite(n) ? n : 0;
  }

  /* ★実Excel の 形の 名前 → うちの 形の 名前★
       ★`lib/objects.js` の `形たち` に 在る 物だけ★（★無い 物は 作らない★） */
  var 形の名 = {
    rect: '四角', roundRect: '角丸四角', ellipse: '丸',
    triangle: '三角', rightArrow: '右矢印', star5: '星',
  };

  /** ★色を 取る★（★字で 書いて ある 時だけ★＝テーマの 色は 付けません） */
  function 色を取る(中) {
    var c = 札たち(中, 'a:srgbClr');
    if (!c.length) return null;
    var v = String(属(c[0].属, 'val') || '').trim();
    if (v.length !== 6) return null;
    for (var i = 0; i < 6; i++) {
      var ch = v.charAt(i).toUpperCase();
      if (!((ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'F'))) return null;
    }
    return '#' + v.toUpperCase();
  }

  /** ★★口①★★ ＝ `xl/drawings/drawingN.xml` を 読む
   *    返す 物 ＝ `[{ 名, 種類, 列, 列ずれ, 行, 行ずれ, w, h, 回転, 塗り, 線 }]`
   *    ・`列ずれ` `行ずれ` `w` `h` は ★点（px）★（EMU から 直して あります）
   *    ・★場所は まだ 決まって いません★＝`場所を決める()` に 列幅を 渡して ください */
  function 読む(drawingXml) {
    var 出 = [];
    var s = String(drawingXml || '');
    /* ★`twoCellAnchor` だけ★（他は まだ＝上の 注を 見て ください） */
    札たち(s, 'xdr:twoCellAnchor').forEach(function (止) {
      var 頭 = 札たち(止.中, 'xdr:from');
      if (!頭.length) return;
      var sp = 札たち(止.中, 'xdr:sp');
      if (!sp.length) return;                       /* ★絵や グラフは ここでは 扱いません★ */

      var 名札 = 札たち(sp[0].中, 'xdr:cNvPr');
      var 名 = 名札.length ? (属(名札[0].属, 'name') || '') : '';

      var 形 = 札たち(sp[0].中, 'a:prstGeom');
      var prst = 形.length ? String(属(形[0].属, 'prst') || '') : '';

      var xf = 札たち(sp[0].中, 'a:xfrm');
      var 幅 = 0, 高 = 0, 回転 = 0;
      if (xf.length) {
        var 大 = 札たち(xf[0].中, 'a:ext');
        if (大.length) {
          幅 = Math.round((parseInt(属(大[0].属, 'cx'), 10) || 0) / EMU);
          高 = Math.round((parseInt(属(大[0].属, 'cy'), 10) || 0) / EMU);
        }
        /* ★実Excel は 60000分の1度で 書きます★（90度 ＝ 5400000） */
        var r = parseInt(属(xf[0].属, 'rot'), 10);
        if (isFinite(r) && r) 回転 = r / 60000;
      }
      if (!幅 || !高) return;                       /* ★大きさが 無い 物は 出しません★ */

      var o = {
        名: 名,
        列: 数を取る(頭[0].中, 'xdr:col'),
        列ずれ: Math.round(数を取る(頭[0].中, 'xdr:colOff') / EMU),
        行: 数を取る(頭[0].中, 'xdr:row'),
        行ずれ: Math.round(数を取る(頭[0].中, 'xdr:rowOff') / EMU),
        w: 幅, h: 高,
      };
      if (形の名[prst]) o.種類 = 形の名[prst];
      if (回転) o.回転 = 回転;
      /* ★色は 字で 書いて ある 時だけ★（テーマの 色は 付けません） */
      var 塗 = 札たち(sp[0].中, 'a:solidFill');
      if (塗.length) {
        var c = 色を取る(塗[0].中);
        if (c) o.塗り = c;
      }
      出.push(o);
    });
    return 出;
  }

  /** ★★口②★★ ＝ ★マスと ずれ★ から ★板の 中の 場所★を 出す
   *    `colW` ＝ `{ 列番号: 点 }` ／ `既定列幅` ＝ 書いて いない 列の 点
   *    `rowH`  ＝ `{ 行番号: 点 }` ／ `既定行高` ＝ 書いて いない 行の 点
   *    ★`xfrm` の `off` を 使いません★（上の 注＝置いた 時の 古い 数で ずれます） */
  function 場所を決める(図, colW, 既定列幅, rowH, 既定行高) {
    var w = colW || {}, h = rowH || {};
    var 幅 = (既定列幅 > 0) ? 既定列幅 : 72;
    var 高 = (既定行高 > 0) ? 既定行高 : 24;
    var x = 0;
    for (var c = 0; c < (図.列 || 0); c++) x += (w[c] > 0 ? w[c] : 幅);
    var y = 0;
    for (var r = 0; r < (図.行 || 0); r++) y += (h[r] > 0 ? h[r] : 高);
    return { x: x + (図.列ずれ || 0), y: y + (図.行ずれ || 0) };
  }

  /** ★★口③★★ ＝ ★台に 載せる 形★に する（`sheets[i].objects` と 同じ 形）
   *    `lib/objects.js:描く` が そのまま 描けます。 */
  function 台に載せる形(図たち, colW, 既定列幅, rowH, 既定行高) {
    return (図たち || []).map(function (図, i) {
      var 場 = 場所を決める(図, colW, 既定列幅, rowH, 既定行高);
      var o = { x: 場.x, y: 場.y, w: 図.w, h: 図.h, z: i + 1, 名: 図.名 || ('図形 ' + (i + 1)) };
      if (図.種類) o.種類 = 図.種類;
      if (図.回転) o.回転 = 図.回転;
      if (図.塗り) o.塗り = 図.塗り;
      if (図.線) o.線 = 図.線;
      return o;
    });
  }

  /** ★シートの rels から 図形の 部品名を 出す★
   *    `xl/worksheets/sheet1.xml` の `<drawing r:id="rId1"/>` と
   *    `xl/worksheets/_rels/sheet1.xml.rels` の `Target` を 突き合わせます。
   *    ★板の 順番で 当てません★＝★rels で 正しく 解きます★ */
  function 図形の部品名(sheetXml, relsXml, 板の道) {
    var d = 札たち(String(sheetXml || ''), 'drawing');
    if (!d.length) return null;
    var rid = 属(d[0].属, 'r:id');
    if (!rid) return null;
    var 出 = null;
    札たち(String(relsXml || ''), 'Relationship').forEach(function (r) {
      if (出) return;
      if (属(r.属, 'Id') !== rid) return;
      var t = String(属(r.属, 'Target') || '');
      if (!t) return;
      if (t.charAt(0) === '/') { 出 = t.slice(1); return; }
      /* ★`../drawings/drawing1.xml` を 板の 道から 解きます★ */
      var 元 = String(板の道 || 'xl/worksheets/sheet1.xml').split('/');
      元.pop();
      var 足 = t.split('/');
      for (var i = 0; i < 足.length; i++) {
        if (足[i] === '..') 元.pop();
        else if (足[i] !== '.') 元.push(足[i]);
      }
      出 = 元.join('/');
    });
    return 出;
  }

  return {
    読む: 読む, 場所を決める: 場所を決める, 台に載せる形: 台に載せる形,
    図形の部品名: 図形の部品名, EMU: EMU, 形の名: 形の名,
  };
}));
