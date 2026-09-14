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
/* ★どちらが 答えたかの 数★（台ごと 1つ。`答えた数()` で 見る） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    typeof require === 'function' ? require('./shiki-kiru.js') : root.ShikiKiru,
    typeof require === 'function' ? require('./shiki-katachi.js') : root.ShikiKatachi,
    typeof require === 'function' ? require('./shiki-sansho.js') : root.ShikiSansho,
    typeof require === 'function' ? require('./shiki-keisan.js') : root.ShikiKeisan,
    typeof require === 'function' ? require('./shiki-kansuu.js') : root.ShikiKansuu,
    typeof require === 'function' ? require('./shiki-tsunagi.js') : root.ShikiTsunagi,
    typeof require === 'function' ? require('./shiki-afure.js') : root.ShikiAfure,
    typeof require === 'function' ? require('./shiki-basho.js') : root.ShikiBasho);
  else root.ShikiHyou = factory(root.ShikiKiru, root.ShikiKatachi, root.ShikiSansho,
    root.ShikiKeisan, root.ShikiKansuu, root.ShikiTsunagi, root.ShikiAfure, root.ShikiBasho);
})(typeof self !== 'undefined' ? self : this, function (切, 形, 参, 計, 関, 皮, 溢, 場) {
  'use strict';

  /* ★どちらが 答えたかを 1本ずつ 数える★（2026-09-14・経営者1 と 決めた 見張り①）
     ★訳★＝377個を 書いて いく 間、★借り物の 出番が 減る様子を 数で 見る★為。
       数が 減らなければ ★「書いたのに 誰も 呼んで いない」★と すぐ 分かる。 */
  var 答えた = {};
  /* ★名前を わざと 長く して います★（2026-09-14）
     ＝`数える` という 名前は ★repo に 既に 4つ 在ります★
       （ribbon.js／ribbon-keytips.js／ribbon-launcher.js／ribbon-context-spec.js）
     ★`tools/unused-param.mjs` は「名前で 呼ぶ」形も 見ます★ので、
     ここで `数える(誰)` と 呼ぶと ★向こうの 4つが「渡されている」ように 見え★、
     ★見張りの 候補 15個 → 11個★に なって いました＝★穴を 隠した★。
     ⇒ ★repo に 在る 名前を そのまま 使わない★ */
  function 答えた者を数える(誰) { 答えた[誰] = (答えた[誰] || 0) + 1; }

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
    /* ★A1 → { A2:true }（A1 を 見ている 者）★
       ★並びでは なく 名札の 束★＝2026-09-14 に 直した。
         前は 並びで `indexOf` して いて、皆が 同じ マスを 見ると ★N の 2乗★に なった
         （実測 `=A1+1` を N マスに 打つ … N=2000 33ms ／ 4000 125ms ／ ★8000 512ms★）。 */
    var 見られている = {};

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

    /* ══ ★参照（INDEX が 返す 物）の 受け口★ ══（2026-09-15）
       ★参照は「値」では ありません★＝★どのマスか★を 持って います。
       ★3つの 出口★しか 在りません。★ここ 以外に 漏らさない★のが 決めです。
         ①★1つの 値が 要る 所★（＋ − 大小・マスに 入れる）… ★暗黙の 交わり★
         ②★関数の 引数★                                  … ★四角と 同じ 顔★に する
         ③★`:` の 端★                                    … ★番地として 使う★
       ★実測★ `=SUM(INDEX(A1:B5,0,2))` → 30（②）／`=SUM(INDEX(A1:A5,2):A5)` → 14（③）
              `=INDEX(A1:B5,0,2)` を J1 に 打つと 2・J9 に 打つと #VALUE!（①） */
    function 値に(v) { return 場.参照か(v) ? 場.交わる(v, 今のマス) : v; }

    /* ★木を 歩いて 計算する★（★輪は 呼ぶ側が 見つける★） */
    function 歩く(木, 手, 通り道) {
      switch (木.種) {
        case '数': return 計.数(計.打った数(木.値));
        case '字': return 計.字(String(木.値).slice(1, -1).split('""').join('"'));
        case '誤': return 計.誤(木.値);
        /* ★省いた 引数★（`=IF(TRUE,,2)`）＝★空の 値★
           実測 `=IF(TRUE,,2)` → ★0★（空は 0 として 見える） */
        case '空': return 計.空;
        case '括': return 歩く(木.子, 手, 通り道);
        /* ★表を 直に 書いた 物★ `{3;5;7}` `{1,2;3,4}`（2026-09-15 に 入れた）
           ＝形に する 台は 前から `配` に して いましたが ★本体が 知らず #VALUE!★でした。
             実測 … `=TREND({3;5;7;9;11;13})` → ★2.9999999999999987★
                    `=PERCENTOF(2,{1;2;3;4})` → ★0.2★
           ⇒ ★溢れ（行×列）に する★＝四角と 同じ 扱いに なる */
        case '配': {
          var 並3 = 木.行.map(function (段) {
            return 段.map(function (子) { return 歩く(子, 手, 通り道); });
          });
          return 溢.溢れ(並3);
        }
        /* ★溢れ（土台⑤）★＝四角や 溢れに 演算子を 掛けると ★1つずつ★ 効く
           実測 `=-A1:A3` → -1／-2／-3 ／ `=A1:A3&"x"` → 1x／2x／3x */
        case '前': return 溢.ひとつずつ(値に(歩く(木.子, 手, 通り道)), function (x) { return 計.前置き(木.記, x, 手); });
        case '後': return 溢.ひとつずつ(値に(歩く(木.子, 手, 通り道)), function (x) { return 計.後置き(木.記, x, 手); });
        case '二':
          /* ★`A1:A3` を そのまま 打つと 四角が 値に なる★（実測＝下へ 広がる）
             ★`@` を 付けると 1マスに なる★（暗黙の交差）＝`=@A1:A3` → 1
               （字に 切る 台は `@A1` を 1つの 名前に します＝ここで 外す） */
          if (木.記 === ':') {
            /* ★端は「名前」とは 限りません★（2026-09-15）
               ★実測★ `=SUM(INDEX(A1:A5,2):A5)` → ★14★（A2:A5）
               ⇒★INDEX が 返した 参照も `:` の 端に なれます★＝AREAS／OFFSET も ここに 乗ります */
            var 左字 = 端の名(木.左, 手, 通り道, false);
            var 右字 = 端の名(木.右, 手, 通り道, true);
            if (左字 === null || 右字 === null) return 計.誤('#REF!');
            var 交差 = 左字.charAt(0) === '@';
            var 四 = 四角を読む(交差 ? 左字.slice(1) : 左字, 右字, 通り道);
            if (!四.行数 || !四.列数) return 計.誤('#REF!');
            var 並 = [];
            for (var r2 = 0; r2 < 四.行数; r2++) {
              var 段2 = [];
              for (var c2 = 0; c2 < 四.列数; c2++) 段2.push(四.並び[r2 * 四.列数 + c2]);
              並.push(段2);
            }
            var 出2 = 溢.溢れ(並);
            return 交差 ? 溢.先頭(出2) : 出2;
          }
          /* ★形が 違う 四角どうしは 足りない 所だけ #N/A★（実測 `=A1:A3+B1:B2` → 11／22／#N/A） */
          return 溢.重ねる(値に(歩く(木.左, 手, 通り道)), 値に(歩く(木.右, 手, 通り道)),
            function (a, b) { return 計.つなぎ(木.記, a, b, 手); });
        case '名': {
          var n = String(木.値).toUpperCase();
          if (n === 'TRUE') return 計.真偽(true);
          if (n === 'FALSE') return 計.真偽(false);
          /* ★1マスに `@` が 付いた 形★（`=@A1`）＝1マスなので そのまま */
          if (n.charAt(0) === '@' && 名から番地(n.slice(1))) return 読む(n.slice(1), 通り道);
          if (名から番地(n)) return 読む(n, 通り道);
          return 計.誤('#NAME?');
        }
        case '呼': {
          var 引数たち = 木.引数.map(function (子) {
            if (子.種 === '二' && 子.記 === ':') {
              /* ★端は 名前とは 限らない★（`SUM(INDEX(…):A5)`）＝`端の名` に 任せる */
              var 左名 = 端の名(子.左, 手, 通り道, false);
              var 右名 = 端の名(子.右, 手, 通り道, true);
              if (左名 === null || 右名 === null) return { 種: '直', 値: 計.誤('#REF!') };
              if (左名.charAt(0) === '@') 左名 = 左名.slice(1);
              var 四 = 四角を読む(左名, 右名, 通り道);
              /* ★四角の 左上の 番地も 渡す★（2026-09-15）
                 ＝`=CELL("row",A1:C3)` は ★左上（A1）の 事★（実測 … 1）。
                   前は 値だけ 渡して いたので ★#VALUE!★ に なって いた。 */
              var ば左 = 名から番地(左名), ば右 = 名から番地(右名);
              var 角 = (ば左 && ば右)
                ? { 行: Math.min(ば左.行, ば右.行), 列: Math.min(ば左.列, ば右.列) } : null;
              return {
                種: '四角', 並び: 四.並び, 行数: 四.行数, 列数: 四.列数, 番地: 角,
                /* ★★何番目の マスに 何と 打って 在るか★★（2026-09-15）
                   ＝SUBTOTAL は ★入れ子の SUBTOTAL を 数えません★（実測）
                     A6 に `=SUBTOTAL(9,A1:A5)` が 在る 時
                       `=SUBTOTAL(9,A1:A6)` → ★15★ ／ `=SUM(A1:A6)` → ★30★
                   ⇒★値だけでは 分かりません★＝★元の 字★が 要る。
                   ★呼ばれた 時だけ 作ります★＝★四角を 読む たびに 名前を 並べない★
                     （実物は 12,383回 INDEX/MATCH を 呼びます＝ここを 太らせない） */
                打った字: 角 ? function (i) {
                  var m = 中身[番地から名(角.行 + Math.floor(i / 四.列数), 角.列 + (i % 四.列数))];
                  return m ? String(m.打った字 || '') : '';
                } : null,
              };
            }
            if (子.種 === '名') {
              var nn = String(子.値).toUpperCase();
              var ば = 名から番地(nn);
              if (nn !== 'TRUE' && nn !== 'FALSE' && ば) {
                /* ★どの マスかも 渡す★（2026-09-14）
                   ＝`=CELL("row",B7)` は ★中身では なく 番地★が 要ります。
                     前は 値しか 渡さず、自前の 皮の CELL が ★#VALUE!★ を 返して いました。
                   ★足すだけ★＝今まで 読んで いた `値` は そのまま。 */
                return {
                  種: 'マス', 値: 読む(nn, 通り道), 名前: nn, 番地: { 行: ば.行, 列: ば.列 },
                  打った字: function () { return 中身[nn] ? String(中身[nn].打った字 || '') : ''; },
                };
              }
            }
            var 値 = 歩く(子, 手, 通り道);
            /* ★参照は 四角と 同じ 顔で 渡す★（2026-09-15）
               ＝`=SUM(INDEX(A1:B5,0,2))` → ★30★（実測）。★番地も 付いて いる★ので
                 中で もう1回 `暗黙の 交わり` が 要る 時にも 使えます。 */
            if (場.参照か(値)) return 場.引数にする(値);
            /* ★表を 直に 書いた 物は 四角として 渡す★（`{1;2}` は 1列の 四角） */
            if (溢.溢れか(値)) {
              return { 種: '四角', 並び: 値.並び.reduce(function (a, 段) { return a.concat(段); }, []),
                行数: 値.行数, 列数: 値.列数 };
            }
            return { 種: '直', 値: 値 };
          });
          /* ★今 いる マスも 渡す★（★暗黙の 交わり★に 要る＝INDEX/MATCH が 使う） */
          var 出 = 関.呼ぶ(木.名, 引数たち, 手, { 今のマス: 今のマス });
          if (出 !== null) { 答えた者を数える('土台'); return 出; }
          /* ★土台が 知らない 物は 皮に 回す★（2026-09-14／B-3）
             ＝`lib/shiki-tsunagi.js` が 持つ ★61個★（借り物に 無い 物を 自前で 書いた 分）
             ★皮も 知らなければ null★ ⇒ ★#NAME?★（★半分 合う 答えを 出さない★） */
          if (皮 && typeof 皮.呼ぶ === 'function') {
            /* ★今 いる マスも 渡す★（引数なしの CELL 等が 使う） */
            var 皮の出 = 皮.呼ぶ(木.名, 引数たち, { 今のマス: 今のマス });
            if (皮の出 !== null && 皮の出 !== undefined) {
              /* ★溢れは まだ 置けません（土台⑤）★
                 ★左上だけ 返して 誤魔化す事は しません★＝答えは 溢れの まま 持たせ、
                 ★並べるのは ⑤の 仕事★。数だけ 別に 取って「出来て いない」を 隠さない。 */
              答えた者を数える(皮の出 && 皮の出.溢れ === true ? '皮（溢れ待ち）' : '皮');
              return 皮の出;
            }
          }
          答えた者を数える('知らない');
          /* ★知らない 関数は ★#NAME?★ と 言う＝半分 合う 答えを 出さない★ */
          return 計.誤('#NAME?');
        }
        default: return 計.誤('#VALUE!');
      }
    }

    /* ★`:` の 端を 1つの マスの 名前に する★（2026-09-15）
       ★名前なら そのまま（`@` も 残す）／参照なら その 角★
       ★それ以外は null★＝`#REF!`（★半分 合う 答えを 出さない★） */
    function 端の名(子, 手, 通り道, 右か) {
      var s = String(子 && 子.値 != null ? 子.値 : '');
      if (子 && 子.種 === '名') {
        var t = s.charAt(0) === '@' ? s.slice(1) : s;
        if (名から番地(t)) return s;
      }
      var v = 歩く(子, 手, 通り道);
      if (場.参照か(v) && !v.番地なし) {      /* ★番地の 無い 参照は 端に なれません★ */
        var r = 右か ? v.行 + v.行数 - 1 : v.行;
        var c = 右か ? v.列 + v.列数 - 1 : v.列;
        return 番地から名(r, c);
      }
      return null;
    }

    /* ★四角は「形（行数×列数）」も 返す★（2026-09-14 に 足した）
       ★並びは 平らな まま★＝`shiki-kansuu.js` の `ほどく` が 平らに 舐めるので 壊さない。
       ★形が 要る 訳★＝横に 広がる 関数が 在る。実物で 出した（材料 A1:B3 = 1,2/3,4/5,6）：
         `=ARRAYTOTEXT(A1:B3,1)` … 実Excel `{1,2;3,4;5,6}`
            形が 無いと ★`{1;2;3;4;5;6}`★（★縦一列に 潰れる★）
         `=MINVERSE(D1:E2)` … 形が 無いと ★#VALUE!★（正方行列に ならない）
         `=LINEST(A1:A5,B1:B5)` … ★縦1列なので 形が 無くても 当たる★
       ⇒★「今 動いて いる」は「形が 要らない」では ない★ */
    function 四角を読む(左, 右, 通り道) {
      var a = 名から番地(左), b = 名から番地(右), 並び = [];
      if (!a || !b) return { 並び: 並び, 行数: 0, 列数: 0 };
      var r0 = Math.min(a.行, b.行), r1 = Math.max(a.行, b.行);
      var c0 = Math.min(a.列, b.列), c1 = Math.max(a.列, b.列);
      for (var r = r0; r <= r1; r++)
        for (var c = c0; c <= c1; c++)
          並び.push(読む(番地から名(r, c), 通り道));
      return { 並び: 並び, 行数: r1 - r0 + 1, 列数: c1 - c0 + 1 };
    }

    /* ★1つの マスの 値を 読む★（★輪を ここで 見つける★） */
    function 読む(名, 通り道) {
      var n = String(名).toUpperCase();
      var m = 中身[n];
      if (!m) {
        /* ★溢れで 埋まった マスか★（土台⑤）＝式は 無いが 値は 在る */
        var 覆 = 覆い[n];
        if (覆) {
          var 元m = 中身[覆.元];
          if (元m && 溢.溢れか(元m.値)) return 元m.値.並び[覆.行][覆.列];
        }
        return 空に();
      }
      if (m.形) {
        if (通り道 && 通り道.indexOf(n) >= 0) return 計.誤('#REF!');  /* ★輪★ */
        if (m.値 === undefined) 計算する(n, (通り道 || []).concat([n]));
      }
      if (m.値 === undefined) return 空に();
      /* ★1マスとして 読む時は 溢れの 左上★（実Excel の 暗黙の交差） */
      return 溢.溢れか(m.値) ? 溢.先頭(m.値) : m.値;
    }

    /* ★溢れの 覆い★＝どの マスが どの 式の 溢れで 埋まって いるか
       { 埋まった マス名: { 元: 式の マス名, 行: i, 列: j } } */
    /* ★今 計算して いる マス★（`=CELL("row")` の ような 引数なしの 物が 使う） */
    var 今のマス = null;

    /* ★★字の 日付・時刻を 数に する★★（2026-09-15 に 足した）
       `lib/shiki-keisan.js` は ★口だけ 開けて 待って いました★
         「★日付の 字（"2026/1/1"→46023）は この 台では 読みません★」（139行）
       ★実測★（golden-346-2026-09-08.tsv）
         `=ABS("12:30")`      … ★0.52083333333333337★（1日を 1 と する 割合）
         `=ABS("2024-01-15")` … ★45306★（1900年からの 通し番号）
         `=AVERAGE("12:30")` `=MIN(…)` `=PRODUCT(…)` … ★0.5208333333333333★
       ★読む 形は 測った 物だけ★＝それ以外は null（＝今までどおり #VALUE!）
         ★`2024-01-15 12:30` の ような 組み合わせは 測って いません★＝読みません
       ★通し番号の 出し方は `lib/formula-soto.js` の `日から数` と 同じ 形★です。
         ★2か所に 在ります★＝`tests/shiki-hyou-hidzuke.test.mjs` が
         ★両方が 同じ 数を 返す事★を 見張ります（ずれたら 赤）。 */
    function 日付の通し番号(y, m, d) {
      var n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
      return (n < 61) ? n + 1 : n;          /* ★1900年の うるう日の 分★（実Excel の 癖） */
    }
    var 既定の手 = {
      字を日付に: function (字) {
        var t = String(字).trim();
        var 時 = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
        if (時) {
          var h = +時[1], mi = +時[2], se = 時[3] ? +時[3] : 0;
          if (mi > 59 || se > 59) return null;
          return (h * 3600 + mi * 60 + se) / 86400;
        }
        var 日 = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(t);
        if (日) {
          var y = +日[1], mo = +日[2], da = +日[3];
          if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
          var v = new Date(Date.UTC(y, mo - 1, da));
          if (v.getUTCMonth() !== mo - 1 || v.getUTCDate() !== da) return null;  /* 2月30日 等 */
          return 日付の通し番号(y, mo, da);
        }
        return null;                         /* ★測って いない 形は 読まない★ */
      },
    };

    var 覆い = {};
    /* ★元ごとに「どこを 覆ったか」も 覚える★
       ＝前は 消す たびに ★覆い 全部を なめて★ いました。
         ★実測（2026-09-14）★ 溢れる 式を N 個 打つ … N=1000 ★198.5ms★／N=2000 ★911.3ms★
           ＝★N の 2乗より 悪い★（2倍の N で 4.6倍）
         ⇒ 元ごとの 一覧を 持てば ★覆った 数だけ★で 消せる */
    var 覆った先 = {};

    function 覆いを消す(元) {
      var 先 = 覆った先[元];
      if (!先) return;
      for (var i = 0; i < 先.length; i++) {
        if (覆い[先[i]] && 覆い[先[i]].元 === 元) delete 覆い[先[i]];
      }
      delete 覆った先[元];
    }

    function 計算する(名, 通り道) {
      var m = 中身[名];
      if (!m || !m.形) return;
      覆いを消す(名);
      /* ★今 どの マスを 計算して いるかを 皮に 教える★（2026-09-15）
         ＝`=CELL("row")`（引数 1つ）は ★今 いる マス★の 事（実測 … 1）。
         ★入れ子で 別の マスを 読む 事が 在る★（読む → 計算する）ので
         ★前の 物を 覚えて おいて 必ず 戻します★。 */
      var 前のマス = 今のマス;
      今のマス = 名から番地(名);
      var v;
      try {
        /* ★マスに 入れる 前に 参照を 1つの 値に する★（★暗黙の 交わり★）
           ＝`=INDEX(A1:B5,0,2)` は 打った マスの 行と 交わる（実測 J1→2・J3→6・J9→#VALUE!） */
        v = 値に(歩く(m.形, m.手 || 既定の手, 通り道 || [名]));
        /* ★★式の 答えが「空」なら 0★★（2026-08-29 に 実物 2,918本で 決まって いた 事）
           ＝`tests/empty-ref-zero.test.mjs` … `=C2`（C2 は 空）→ ★0★
             ★`=IF(C2="","",1)` の "" は 空の まま★（字なので ここに 来ません）
           ★2026-09-15 の 実測でも 同じ★
             `=IFERROR(A9,"x")` → ★0★ ／ `=IF(TRUE,,2)` → ★0★ ／ `=INDEX(E1:E5,4)` → ★0★
           ⇒★土台は ここを 入れて いませんでした★（借り物の 側だけ 入って いた＝道が 2本） */
        if (v && v.型 === '空') v = 計.数(0);
      } finally {
        今のマス = 前のマス;
      }
      /* ★溢れ（土台⑤）★＝広がる 先が 空いて いるかを 見る
         ★実測★ 溢れる先に 物が 在れば ★#SPILL!★（`=""` の ★見た目は 空★ でも 駄目） */
      if (溢.溢れか(v)) {
        var 元 = 名から番地(名);
        if (!元) { m.値 = 計.誤('#REF!'); return; }
        var 判 = 溢.溢れられるか(中身, 名, v, function (i, j) {
          return 番地から名(元.行 + i, 元.列 + j);
        });
        if (!判.よい) { m.値 = 計.誤('#SPILL!'); return; }
        var 先一覧 = [];
        for (var i = 0; i < v.行数; i++) {
          for (var j = 0; j < v.列数; j++) {
            if (i === 0 && j === 0) continue;
            var なま = 番地から名(元.行 + i, 元.列 + j);
            覆い[なま] = { 元: 名, 行: i, 列: j };
            先一覧.push(なま);
          }
        }
        覆った先[名] = 先一覧;
      }
      m.値 = v;
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
          if (者) delete 者[n];
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
            if (!見られている[先[j]]) 見られている[先[j]] = {};
            見られている[先[j]][n] = true;
          }
        } else if (s === '') {
          中身[n] = { 打った字: '', 形: null, 値: 計.空 };
        } else {
          var d = 計.字を数に(s, {});
          中身[n] = { 打った字: s, 形: null,
            値: (d === null) ? 計.字(s) : 計.数(計.打った数(String(d))) };
        }
        /* ★打った マスの 覆いを 消す★（前の 溢れが 残らない ように・土台⑤） */
        覆いを消す(n);
        /* ★溢れる 式は 打った その場で 計算する★（2026-09-14／土台⑤）
           ＝溢れが どこまで 広がるかは ★計算しないと 分からない★。
             後回しに すると `=E2+E3` の ような 式が ★まだ 覆いが 無い★ので 0 に なる
             （実測 2026-09-14＝`=A1:A3` の 後に `=E2+E3` を 打つと ★0★ に なって いた）。 */
        /* ★このマスを 見ている 式だけ★ 計算し直す */
        直す(n);
        /* ★順番が 大事★＝★`直す` の 後★に 読む。
             先に 計算すると ★輪（A1→A2→A1）が 見つからなく なります★
             （2026-09-14 実測＝先に 計算したら `#REF!` では なく `3` に なった）。
           `読む` は ★まだ 計算して いない時だけ★ 計算します。 */
        if (中身[n] && 中身[n].形) 読む(n, []);
      },

      /* ★読む★（値の 形の まま） */
      /* ★マスが 持って いる 物を そのまま★ 返す（溢れなら 溢れの まま）
         ＝`読む()` は ★1マスとして 読む時に 左上★を 返すので、
           外から 広がりを 見たい 時に 使えません（2026-09-14 実測）。 */
      値: function (名) {
        var n = String(名).toUpperCase();
        var m = 中身[n];
        if (!m) { 読む(n, []); m = 中身[n]; }
        if (m && m.形 && m.値 === undefined) 読む(n, []);
        if (m && m.値 !== undefined) return m.値;
        return 読む(n, []);
      },

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
      /* ★外に 出す 形は 今までどおり 並び★（中の 持ち方だけ 変えた） */
      見られている: function (名) { return Object.keys(見られている[String(名).toUpperCase()] || {}); },

      /* ★数えた 回数（★変わった所だけ 直したか★を 測る為）★ */
      直した回数: 0,
      中身: 中身
    };

    /* ★変わった マスを 見ている 式を たどって 計算し直す★
       ★全部 計算し直さない★＝ここが 本体の 肝 */
    function 直す(変わった) {
      /* ══ ★★頼りの 順に 直す★★ ══（2026-09-15 に 直した）
         ★★前は「先に 着いた 順」で 直して いました★★＝★菱形で 古い 答えが 残ります★
           K1=10 ／ Q1=`=K1*2` ／ M1=`=K1-Q1`（★M も Q も K を 見る／M は Q も 見る★）
           ⇒ K が 変わると ★M と Q の 両方★に 報せが 行く
           ⇒ ★M を 先に 直すと 古い Q を 使う★／その後 Q を 直しても
             ★M は「済」印が 付いて いて もう 直らない★
           ★実測（2026-09-15・司さんの実物）★
             `=IFERROR((K14-Q14)/L14,…)` が ★古い 答えの まま★
             ⇒ そこから V／X／Z／AB → AN14 → SUBTOTAL と ★鎖で 広がって いた★
             ⇒ 押す順で 合わない マスが 変わる（順 37本／逆 176本／共通 6本）
         ★直し★＝★自分が 見て いる 物を 全部 直してから 自分を 直す★（頼りの 順）
           ・★数え上げで 回します★（O(マス＋線)）＝★2乗に しません★
             （`tests/shiki-hyou-omosa.test.mjs` が 2乗を 赤に します）
           ・★輪は 順番では 解けません★⇒★残った 物は そのまま 直す★
             （輪の 見つけ方は `計算する` の 通り道が 持って います） */
      /* ①★届く 先を 全部 集める★ */
      var 要る = {}, 積 = Object.keys(見られている[変わった] || {}), i;
      while (積.length) {
        var n = 積.pop();
        if (要る[n]) continue;
        要る[n] = true;
        var 次 = Object.keys(見られている[n] || {});
        for (i = 0; i < 次.length; i++) if (!要る[次[i]]) 積.push(次[i]);
      }
      var 名ら = Object.keys(要る);
      if (!名ら.length) return;
      /* ②★自分より 先に 直す物が いくつ 在るか 数える★ */
      var 待ち数 = {}, 順番 = [];
      for (i = 0; i < 名ら.length; i++) {
        var x = 名ら[i], 先 = 見ている[x] || [], c = 0;
        for (var k = 0; k < 先.length; k++) if (要る[先[k]] && 先[k] !== x) c++;
        待ち数[x] = c;
        if (c === 0) 順番.push(x);
      }
      /* ③★0 に なった 物から 直す★ */
      var 直した = 0;
      while (順番.length) {
        var y = 順番.pop();
        直した++;
        var m = 中身[y];
        if (m && m.形) { m.値 = undefined; 計算する(y, [y]); }
        var 見て = Object.keys(見られている[y] || {});
        for (i = 0; i < 見て.length; i++) {
          var w = 見て[i];
          if (!要る[w] || w === y) continue;
          if (--待ち数[w] === 0) 順番.push(w);
        }
      }
      /* ④★輪で 残った 物★＝順番では 解けない ⇒ そのまま 直す */
      if (直した < 名ら.length) {
        for (i = 0; i < 名ら.length; i++) {
          var z = 名ら[i];
          if (待ち数[z] === 0) continue;         /* もう 直した */
          待ち数[z] = 0;
          var m2 = 中身[z];
          if (m2 && m2.形) { m2.値 = undefined; 計算する(z, [z]); }
        }
      }
    }
  }

  return {
    表: 表, 名から番地: 名から番地, 番地から名: 番地から名,
    /* ★どちらが 答えたか★（経営者1 と 決めた 見張り①・2026-09-14）
       ＝★借り物の 出番が 減る様子を 数で 見る★為。
         `土台` … `lib/shiki-kansuu.js` の 7個
         `皮`   … `lib/shiki-tsunagi.js` の 61個
         `皮（溢れ待ち）` … 皮が 答えたが ★溢れなので まだ マスに 並べられない★（土台⑤ 待ち）
         `知らない` … どちらも 知らない ⇒ #NAME?（★今は 借り物が 出して いる 物★） */
    答えた数: function () { return JSON.parse(JSON.stringify(答えた)); },
    答えた数を消す: function () { for (var k in 答えた) if (Object.prototype.hasOwnProperty.call(答えた, k)) delete 答えた[k]; }
  };
});
