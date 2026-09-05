/* formula-extra.js — ★実Excel に 在って 計算エンジンに 無い 関数★ 2026-08-31
 *
 *  ★司さんの 方針（2026-08-30）★
 *    「Excel を 細胞分解レベルまで 網羅して 把握した上で 持ち込み パクる」
 *
 *  ★実測（2026-08-31・実ブラウザで 数えた）★
 *    計算エンジン（HyperFormula）に 登録されている 関数 … ★457個★
 *    ★事務で 使う 物を 98個 見て、62個が 無かった★
 *
 *  ★ここで 足す 物★＝★うちだけで 作れて、答えが 決まっている 物★
 *    ・AVERAGEIFS      … 条件つきの 平均（毎日 使う）
 *    ・TAKE / DROP     … 表の 頭・尻を 取る／落とす
 *    ・CHOOSECOLS / CHOOSEROWS … 列・行を 選ぶ
 *    ・TOCOL / TOROW   … 表を 1列／1行に する
 *    ・WRAPROWS / WRAPCOLS … 1列を 表に 折り返す
 *    ・EXPAND          … 表を 広げる
 *    ・ARRAYTOTEXT     … 表を 字に する
 *    ・MODE.MULT       … 最頻値（複数）
 *
 *  ★足さない 物と その 理由★（★「これから」とも 書かない★）
 *    ・LAMBDA / LET / MAP / REDUCE / BYROW / BYCOL / SCAN / MAKEARRAY
 *        … ★式を 値として 渡す 仕組み★が エンジンに 無い（作るなら エンジン側）
 *    ・STOCKHISTORY / FIELDVALUE / WEBSERVICE / RTD / IMAGE
 *        … ★外の データ配信が 要る★
 *    ・PHONETIC … ★ふりがなは セルに 付いた データ★＝エンジンでは 見えない
 *        （うちは 画面側に「ふりがなを入れる」が 在る）
 *    ・BAHTTEXT … ★2026-09-04 に 足した★（lib/bahttext.js）
 *        ★前は「タイ語専用」と 書いて 足していなかった★＝★理由に なっていなかった★
 *        （司さん「Excelが 出来て うちが 出来んって事は 絶対に 無い」）
 *        ★答えは 実Excel に 116通り 打たせて 合わせた★
 *    ・YEN … ★日本語版の 画面の 名前★（2026-09-05 実Excel 16.0 build 20326・UI 1041 で 実測）
 *          `=YEN(1234)`（英語名）＝#NAME? ／ ★FormulaLocal `=YEN(1234)` ＝ ¥1,234★
 *          ⇒★中身は DOLLAR と 同じ★。★お客さんの 画面には YEN と 出る★
 *          ⇒★08-31 に「存在しない」と 書いたのは ★英語名しか 見ていなかった★から
 *        円は `DOLLAR` が 出す（実測＝DOLLAR(-1234.5,1) → ¥-1,234.5）。
 *        ★作りかけた が 実物を 打って 止めた★＝★無い 関数を 足すのは 捏造★。
 *
 *  ★形（spill）を 保つ★
 *    2026-08-29 に ★FILTER が 縦1列しか 返せず 月別合計が 全部 0★に なった。
 *    ⇒ ★2列以上でも 形を 保つ★事を 見張りで 確かめる。
 *
 *  見張り: tests/formula-extra.test.mjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FormulaExtra = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ══ ここは ★純粋な 計算★ だけ ══════════════════════
     エンジンに 繋ぐ 所（登録）は 下の つなぐ() で やる。
     ★分けてある理由★＝node で そのまま 試験できる。 */

  function 数か(v) { return typeof v === 'number' && isFinite(v); }

  /** 表（2次元の 配列）に そろえる */
  function 表にする(v) {
    if (!Array.isArray(v)) return [[v]];
    if (!v.length) return [[]];
    if (!Array.isArray(v[0])) return [v.slice()];
    return v.map(function (r) { return r.slice(); });
  }

  /** ★条件つきの 平均★（AVERAGEIFS）
   *  @param 平均する  数の 表
   *  @param 組        [条件の表, 条件] を 並べた 物
   *  ★1つも 当たらなければ #DIV/0!★（実Excel と 同じ）
   */
  function 条件つき平均(平均する, 組) {
    var A = 表にする(平均する);
    var 足 = 0, 数 = 0;
    for (var r = 0; r < A.length; r++) {
      for (var c = 0; c < A[r].length; c++) {
        var 当たる = true;
        for (var k = 0; k < 組.length; k++) {
          var B = 表にする(組[k][0]);
          var v = (B[r] === undefined) ? undefined : B[r][c];
          if (!条件に合うか(v, 組[k][1])) { 当たる = false; break; }
        }
        if (!当たる) continue;
        var x = A[r][c];
        if (!数か(x)) continue;
        足 += x; 数++;
      }
    }
    if (!数) return { 誤り: 'DIV_BY_ZERO' };
    return 足 / 数;
  }

  /** 条件の 見方（実Excel と 同じ＝">=10" や "*円" が 使える） */
  function 条件に合うか(v, 条件) {
    if (条件 === null || 条件 === undefined) return v === null || v === undefined || v === '';
    if (typeof 条件 === 'number') return Number(v) === 条件;
    var s = String(条件);
    var m = s.match(/^(<=|>=|<>|<|>|=)(.*)$/);
    if (m) {
      var 印 = m[1], 右 = m[2];
      var a = 数か(v) ? v : (String(v) === '' ? null : (isNaN(Number(v)) ? String(v) : Number(v)));
      var b = (右 === '') ? null : (isNaN(Number(右)) ? 右 : Number(右));
      if (印 === '=') return 等しいか(a, b);
      if (印 === '<>') return !等しいか(a, b);
      if (a === null || b === null) return false;
      if (typeof a !== typeof b) return false;
      if (印 === '<') return a < b;
      if (印 === '>') return a > b;
      if (印 === '<=') return a <= b;
      if (印 === '>=') return a >= b;
      return false;
    }
    /* ★* と ? が 使える★（実Excel と 同じ） */
    if (/[*?]/.test(s)) {
      var 型 = '^' + s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .split('*').join('[\\s\\S]*').split('?').join('[\\s\\S]') + '$';
      return new RegExp(型, 'i').test(String(v === null || v === undefined ? '' : v));
    }
    return 等しいか(v, isNaN(Number(s)) ? s : Number(s));
  }
  function 等しいか(a, b) {
    if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase();
    return a === b;
  }

  /** ★頭から N個★（TAKE）／★落とす★（DROP）
   *  ★マイナスなら 尻から★（実Excel と 同じ） */
  function 切り出す(表, 行数, 列数, 落とすか) {
    var A = 表にする(表);
    var 行 = A.length, 列 = A[0] ? A[0].length : 0;
    function 幅(n, 全) {
      if (n === null || n === undefined) return [0, 全];
      n = Math.trunc(n);
      if (落とすか) {
        if (n >= 0) return [Math.min(n, 全), 全];
        return [0, Math.max(0, 全 + n)];
      }
      if (n >= 0) return [0, Math.min(n, 全)];
      return [Math.max(0, 全 + n), 全];
    }
    var r = 幅(行数, 行), c = 幅(列数, 列);
    var 出 = [];
    for (var i = r[0]; i < r[1]; i++) {
      var 行の物 = [];
      for (var j = c[0]; j < c[1]; j++) 行の物.push(A[i][j]);
      出.push(行の物);
    }
    if (!出.length || !出[0].length) return { 誤り: 'VALUE' };
    return 出;
  }

  /** ★列を 選ぶ★（CHOOSECOLS）／★行を 選ぶ★（CHOOSEROWS）
   *  ★1から 数える／マイナスは 尻から★（実Excel と 同じ） */
  function 選び出す(表, 番号たち, 列か) {
    var A = 表にする(表);
    var 全 = 列か ? (A[0] ? A[0].length : 0) : A.length;
    var 番 = [];
    for (var i = 0; i < 番号たち.length; i++) {
      var n = Math.trunc(番号たち[i]);
      if (n === 0) return { 誤り: 'VALUE' };
      var k = n > 0 ? n - 1 : 全 + n;
      if (k < 0 || k >= 全) return { 誤り: 'VALUE' };
      番.push(k);
    }
    if (!番.length) return { 誤り: 'VALUE' };
    if (列か) {
      return A.map(function (r) { return 番.map(function (k) { return r[k]; }); });
    }
    return 番.map(function (k) { return A[k].slice(); });
  }

  /** ★1列／1行に する★（TOCOL / TOROW）
   *  @param 無視 0＝全部 / 1＝空を とばす / 2＝誤りを とばす / 3＝両方
   *  @param 列で読むか true＝列の順に 読む（実Excel の 3つ目の 引数） */
  function 一本にする(表, 無視, 列で読むか, 縦か) {
    var A = 表にする(表);
    var 行 = A.length, 列 = A[0] ? A[0].length : 0;
    var 出 = [];
    function 入れる(v) {
      var 空 = (v === null || v === undefined || v === '');
      var 誤 = !!(v && v.誤り);
      if ((無視 === 1 || 無視 === 3) && 空) return;
      if ((無視 === 2 || 無視 === 3) && 誤) return;
      出.push(v);
    }
    if (列で読むか) {
      for (var c = 0; c < 列; c++) for (var r = 0; r < 行; r++) 入れる(A[r][c]);
    } else {
      for (var r2 = 0; r2 < 行; r2++) for (var c2 = 0; c2 < 列; c2++) 入れる(A[r2][c2]);
    }
    if (!出.length) return { 誤り: 'VALUE' };
    /* ★形を 保つ★＝縦は 1列の 表・横は 1行の 表（2026-08-29 の FILTER の 失敗を 繰り返さない） */
    return 縦か ? 出.map(function (v) { return [v]; }) : [出];
  }

  /** ★1本を 表に 折り返す★（WRAPROWS / WRAPCOLS） */
  function 折り返す(表, 幅, 埋め, 行でか) {
    var A = 表にする(表);
    var 平 = [];
    for (var r = 0; r < A.length; r++) for (var c = 0; c < A[r].length; c++) 平.push(A[r][c]);
    var w = Math.trunc(幅);
    if (!(w >= 1)) return { 誤り: 'VALUE' };
    var 本数 = Math.ceil(平.length / w);
    var 出 = [];
    for (var i = 0; i < 本数; i++) {
      var 一本 = [];
      for (var j = 0; j < w; j++) {
        var k = i * w + j;
        一本.push(k < 平.length ? 平[k] : (埋め === undefined ? { 誤り: 'NA' } : 埋め));
      }
      出.push(一本);
    }
    if (行でか) return 出;
    /* 列で 折り返す＝行と列を 入れ替える */
    var 転 = [];
    for (var y = 0; y < w; y++) {
      var 行の物 = [];
      for (var x = 0; x < 出.length; x++) 行の物.push(出[x][y]);
      転.push(行の物);
    }
    return 転;
  }

  /** ★表を 広げる★（EXPAND） */
  function 広げる(表, 行数, 列数, 埋め) {
    var A = 表にする(表);
    var 行 = A.length, 列 = A[0] ? A[0].length : 0;
    var R = (行数 === null || 行数 === undefined) ? 行 : Math.trunc(行数);
    var C = (列数 === null || 列数 === undefined) ? 列 : Math.trunc(列数);
    if (R < 行 || C < 列) return { 誤り: 'VALUE' };
    var 埋 = (埋め === undefined) ? { 誤り: 'NA' } : 埋め;
    var 出 = [];
    for (var r = 0; r < R; r++) {
      var 行の物 = [];
      for (var c = 0; c < C; c++) {
        行の物.push((r < 行 && c < 列) ? A[r][c] : 埋);
      }
      出.push(行の物);
    }
    return 出;
  }

  /** ★表を 字に する★（ARRAYTOTEXT）
   *  @param 形 0＝簡単（カンマ区切り）／1＝きっちり（{}付き・実Excel と 同じ） */
  function 表を字に(表, 形) {
    var A = 表にする(表);
    function 一つ(v) {
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return 形 === 1 ? '"' + v + '"' : v;
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      return String(v);
    }
    if (形 !== 1) {
      var 平 = [];
      for (var r = 0; r < A.length; r++) for (var c = 0; c < A[r].length; c++) 平.push(一つ(A[r][c]));
      return 平.join(', ');
    }
    return '{' + A.map(function (row) {
      return row.map(一つ).join(',');
    }).join(';') + '}';
  }

  /** ★最頻値（複数）★（MODE.MULT）＝★縦1列で 返す★（実Excel と 同じ） */
  function 最頻値たち(表) {
    var A = 表にする(表);
    var 数え = [], 順 = [];
    for (var r = 0; r < A.length; r++) {
      for (var c = 0; c < A[r].length; c++) {
        var v = A[r][c];
        if (!数か(v)) continue;
        var i = 順.indexOf(v);
        if (i < 0) { 順.push(v); 数え.push(1); } else 数え[i]++;
      }
    }
    var 最大 = 0;
    for (var k = 0; k < 数え.length; k++) if (数え[k] > 最大) 最大 = 数え[k];
    if (最大 < 2) return { 誤り: 'NA' };          /* ★1回ずつなら #N/A★（実Excel と 同じ） */
    var 出 = [];
    for (var m = 0; m < 順.length; m++) if (数え[m] === 最大) 出.push([順[m]]);
    return 出;
  }

  /** 数える（見張り用） */
  function 数える() {
    return {
      足す: ['AVERAGEIFS', 'TAKE', 'DROP', 'CHOOSECOLS', 'CHOOSEROWS',
        'TOCOL', 'TOROW', 'WRAPROWS', 'WRAPCOLS', 'EXPAND',
        'ARRAYTOTEXT', 'MODE.MULT'],
      /* ★ここ（このファイル）では 計算していないが、繋いである 物★
         ＝★別の lib に 中身が 在る 物★。★繋ぐ 数と 合わせる 為に 数える★
         （書かないと「繋ぐ 数が 1つ 多い」と 見えて、見張りが 嘘に なる） */
      別のlibで足す: { 'BAHTTEXT': 'lib/bahttext.js（実Excel に 116通り 打たせて 合わせた）' },
      足さない: {
        'LAMBDA': '式を 値として 渡す 仕組みが エンジンに 無い',
        'LET': '同上',
        'MAP': '同上', 'REDUCE': '同上', 'SCAN': '同上',
        'BYROW': '同上', 'BYCOL': '同上', 'MAKEARRAY': '同上',
        'STOCKHISTORY': '外の データ配信が 要る',
        'FIELDVALUE': '同上', 'WEBSERVICE': '同上', 'RTD': '同上', 'IMAGE': '同上',
        'PHONETIC': 'ふりがなは セルに 付いた データ＝エンジンでは 見えない',
        'YEN': '★日本語版の 画面の 名前★＝ファイル／英語の 構文では ★DOLLAR★（Excel 自身が .FormulaLocal ↔ .Formula で 相互に 直す・2026-09-05 実Excel 実測）。★お客さんが YEN( と 打っても そのまま 動く★＝exally-formula.js の convertFormula が YEN( → DOLLAR( に 直している（実測 =YEN(1234.5) → ¥1,235）。だから ★別名を 増やさない★',
      }
    };
  }

  return {
    条件つき平均: 条件つき平均, 条件に合うか: 条件に合うか,
    切り出す: 切り出す, 選び出す: 選び出す, 一本にする: 一本にする,
    折り返す: 折り返す, 広げる: 広げる, 表を字に: 表を字に,
    最頻値たち: 最頻値たち,
    表にする: 表にする, 数える: 数える
  };
}));
