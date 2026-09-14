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
    typeof require === 'function' ? require('./shiki-afure.js') : root.ShikiAfure);
  else root.ShikiHyou = factory(root.ShikiKiru, root.ShikiKatachi, root.ShikiSansho,
    root.ShikiKeisan, root.ShikiKansuu, root.ShikiTsunagi, root.ShikiAfure);
})(typeof self !== 'undefined' ? self : this, function (切, 形, 参, 計, 関, 皮, 溢) {
  'use strict';

  /* ★どちらが 答えたかを 1本ずつ 数える★（2026-09-14・経営者1 と 決めた 見張り①）
     ★訳★＝377個を 書いて いく 間、★借り物の 出番が 減る様子を 数で 見る★為。
       数が 減らなければ ★「書いたのに 誰も 呼んで いない」★と すぐ 分かる。 */
  var 答えた = {};
  function 数える(誰) { 答えた[誰] = (答えた[誰] || 0) + 1; }

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

    /* ★木を 歩いて 計算する★（★輪は 呼ぶ側が 見つける★） */
    function 歩く(木, 手, 通り道) {
      switch (木.種) {
        case '数': return 計.数(計.打った数(木.値));
        case '字': return 計.字(String(木.値).slice(1, -1).split('""').join('"'));
        case '誤': return 計.誤(木.値);
        case '括': return 歩く(木.子, 手, 通り道);
        /* ★溢れ（土台⑤）★＝四角や 溢れに 演算子を 掛けると ★1つずつ★ 効く
           実測 `=-A1:A3` → -1／-2／-3 ／ `=A1:A3&"x"` → 1x／2x／3x */
        case '前': return 溢.ひとつずつ(歩く(木.子, 手, 通り道), function (x) { return 計.前置き(木.記, x, 手); });
        case '後': return 溢.ひとつずつ(歩く(木.子, 手, 通り道), function (x) { return 計.後置き(木.記, x, 手); });
        case '二':
          /* ★`A1:A3` を そのまま 打つと 四角が 値に なる★（実測＝下へ 広がる）
             ★`@` を 付けると 1マスに なる★（暗黙の交差）＝`=@A1:A3` → 1
               （字に 切る 台は `@A1` を 1つの 名前に します＝ここで 外す） */
          if (木.記 === ':') {
            var 左字 = String(木.左 && 木.左.値 || '');
            var 交差 = 左字.charAt(0) === '@';
            var 四 = 四角を読む(交差 ? 左字.slice(1) : 左字, String(木.右 && 木.右.値 || ''), 通り道);
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
          return 溢.重ねる(歩く(木.左, 手, 通り道), 歩く(木.右, 手, 通り道),
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
              var 四 = 四角を読む(String(子.左.値), String(子.右.値), 通り道);
              return { 種: '四角', 並び: 四.並び, 行数: 四.行数, 列数: 四.列数 };
            }
            if (子.種 === '名') {
              var nn = String(子.値).toUpperCase();
              var ば = 名から番地(nn);
              if (nn !== 'TRUE' && nn !== 'FALSE' && ば) {
                /* ★どの マスかも 渡す★（2026-09-14）
                   ＝`=CELL("row",B7)` は ★中身では なく 番地★が 要ります。
                     前は 値しか 渡さず、自前の 皮の CELL が ★#VALUE!★ を 返して いました。
                   ★足すだけ★＝今まで 読んで いた `値` は そのまま。 */
                return { 種: 'マス', 値: 読む(nn, 通り道), 名前: nn, 番地: { 行: ば.行, 列: ば.列 } };
              }
            }
            return { 種: '直', 値: 歩く(子, 手, 通り道) };
          });
          var 出 = 関.呼ぶ(木.名, 引数たち, 手);
          if (出 !== null) { 数える('土台'); return 出; }
          /* ★土台が 知らない 物は 皮に 回す★（2026-09-14／B-3）
             ＝`lib/shiki-tsunagi.js` が 持つ ★61個★（借り物に 無い 物を 自前で 書いた 分）
             ★皮も 知らなければ null★ ⇒ ★#NAME?★（★半分 合う 答えを 出さない★） */
          if (皮 && typeof 皮.呼ぶ === 'function') {
            var 皮の出 = 皮.呼ぶ(木.名, 引数たち);
            if (皮の出 !== null && 皮の出 !== undefined) {
              /* ★溢れは まだ 置けません（土台⑤）★
                 ★左上だけ 返して 誤魔化す事は しません★＝答えは 溢れの まま 持たせ、
                 ★並べるのは ⑤の 仕事★。数だけ 別に 取って「出来て いない」を 隠さない。 */
              数える(皮の出 && 皮の出.溢れ === true ? '皮（溢れ待ち）' : '皮');
              return 皮の出;
            }
          }
          数える('知らない');
          /* ★知らない 関数は ★#NAME?★ と 言う＝半分 合う 答えを 出さない★ */
          return 計.誤('#NAME?');
        }
        default: return 計.誤('#VALUE!');
      }
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
      var v = 歩く(m.形, m.手 || {}, 通り道 || [名]);
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
      var 待ち = Object.keys(見られている[変わった] || {});
      var 済 = {};
      while (待ち.length) {
        var n = 待ち.shift();
        if (済[n]) continue;
        済[n] = true;
        var m = 中身[n];
        if (m && m.形) { m.値 = undefined; 計算する(n, [n]); }
        var 次 = Object.keys(見られている[n] || {});
        for (var i = 0; i < 次.length; i++) if (!済[次[i]]) 待ち.push(次[i]);
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
