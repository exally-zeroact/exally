/* shiki-kansuu.js — ★四角（A1:A3）と 関数を 計算する★（2026-09-13）
 *
 *  ★★土台を 自分で 作る ④枚目の 後半★★
 *    土台は 5つ … ①字に 切る ②形に する ③頼りの 地図 ④★順番と 計算★ ⑤溢れ
 *    ④の 前半（＋−×÷＾＆ 大小 ％）は `shiki-keisan.js`。
 *    ここは ★四角と 関数★ だけ です。
 *
 *  ★★借り物の 中は 1文字も 読んで いません★★
 *  ★★答えは 全部 実Excel に 打って 測りました★★
 *    （2026-09-13・★40通り★／道具 `docs/measured/toru-shikaku-kansuu.ps1`
 *      紙 `docs/measured/golden-shikaku-kansuu-2026-09-13.tsv`／Excel 16.0 build 20326）
 *
 *  ★★★一番 大きい 分かれ目＝★値が どこから 来たか★★★★
 *    ★同じ SUM なのに 中身の 扱いが 違います★
 *      `=SUM(A1:A5)`       → ★3★   … 四角の 中の 字 "2" と TRUE は ★無視★（1＋2）
 *      `=SUM(A1,"2",TRUE)` → ★4★   … 直に 書いた 字と 真偽は ★数に なる★（1＋2＋1）
 *      `=SUM(A2)`          → ★0★   … ★1マスだけ 指した 字も 無視★（直に 書いた のとは 違う）
 *    ⇒★マスから 来た 物は 飛ばす／直に 書いた 物は 数に する★
 *      ★これを 知らずに 作ると 全部 外します★
 *
 *  ★★当て推量なら 外して いた 物（実Excel に 聞いて 初めて 分かった）★★
 *    `=PRODUCT(B1:B3)`  → ★0★（全部 空。★1 では ない★＝掛け算の 元は 1 なのに）
 *    `=COUNTA(A1:A6)`   → ★5★（★誤りも 数える★）
 *    `=COUNT(A1:A6)`    → ★2★（★誤りは 数えない★＝COUNTA と 違う）
 *    `=MAX(B1:B3)`      → ★0★（全部 空）／`=MAX(C5:C6)` → ★-1★（負だけ＝★0は 混ざらない★）
 *    `=MAX(A1:A6)`      → ★#DIV/0!★（★MAXにも 誤りは 伝わる★）
 *    `=AVERAGE(B1:B3)`  → ★#DIV/0!★（★SUMは 0 なのに 平均は 誤り★）
 *    `=AVERAGE(A1,A3)`  → ★1★（1マス指しの TRUE は ★分母に 入らない★）
 *    `=SUM(0.1,0.2,-0.3)`→★0★（★SUMの 中でも 消え残りを 0に する★＝＋と 同じ／窓２で 裏取り）
 *
 *  ★値の 形★ `shiki-keisan.js` と 同じ { 型:'数'|'字'|'真偽'|'誤'|'空', 値 }
 *
 *  ★引数の 形★（★どこから 来たかを 必ず 付ける★）
 *    { 種:'直',   値: <値> }          … 式に 直に 書いた 物（"2" や TRUE や 1）
 *    { 種:'マス', 値: <値> }          … 1マスを 指した 物（A2）
 *    { 種:'四角', 並び: [<値>, …] }   … A1:A3
 *
 *  ★★入れて いない 物（出来て いない 物を 出来た 顔で 混ぜない）★★
 *    ・SUMPRODUCT … ★形の 違う 四角の 決まりが 未測定★
 *    ・溢れ（`=A1:A3` を そのまま 打つと 下に 広がる）… ★土台⑤★
 *      ★実測では 溢れました★（E1=1・E2=2）が、ここでは 扱いません。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    typeof require === 'function' ? require('./shiki-keisan.js') : root.ShikiKeisan,
    typeof require === 'function' ? require('./shiki-basho.js') : root.ShikiBasho);
  else root.ShikiKansuu = factory(root.ShikiKeisan, root.ShikiBasho);
})(typeof self !== 'undefined' ? self : this, function (計, 場) {
  'use strict';

  var 数 = 計.数, 誤 = 計.誤;

  /* ══ ★引数を 1つずつ ほどく★ ══
     ★四角は 中身を 順に／マスと 直は そのまま★
     ★どこから 来たかを 落とさない★のが この 台の 肝 */
  function ほどく(引数たち, 続き) {
    for (var i = 0; i < 引数たち.length; i++) {
      var a = 引数たち[i];
      if (a.種 === '四角') {
        for (var j = 0; j < a.並び.length; j++) {
          if (続き(a.並び[j], 'マス') === false) return;
        }
      } else {
        if (続き(a.値, a.種 === '直' ? '直' : 'マス') === false) return;
      }
    }
  }

  /* ══ ★数を 拾う★（SUM／AVERAGE／MAX／MIN／PRODUCT／COUNT が 使う）══
     ★マスから 来た … 数だけ 拾う。字・真偽・空は 飛ばす★
     ★直に 書いた … 数に する（字が 数に ならなければ #VALUE!）★
     ★誤りは どちらでも 伝わる（左から 最初の 1つ）★ */
  function 数を拾う(引数たち, 手) {
    var 出 = { 数たち: [], 誤: null };
    ほどく(引数たち, function (v, 元) {
      if (v.型 === '誤') { 出.誤 = v; return false; }
      if (元 === 'マス') {
        if (v.型 === '数') 出.数たち.push(v.値);
        return true;                       /* ★字・真偽・空は 飛ばす★ */
      }
      var n = 計.数にする(v, 手);           /* ★直に 書いた 物は 数に する★ */
      if (n.型 === '誤') { 出.誤 = n; return false; }
      出.数たち.push(n.値);
      return true;
    });
    return 出;
  }

  /* ══ ★足す★ ══
     ★消え残りを 0に する所は `shiki-keisan.js` の ＋ に 任せます★
     ＝★同じ 決まりを 2か所に 書かない★（実測 `=SUM(0.1,0.2,-0.3)` → 0） */
  function 足しあげる(数たち, 手) {
    var 合 = 数(0);
    for (var i = 0; i < 数たち.length; i++) {
      合 = 計.つなぎ('+', 合, 数(数たち[i]), 手);
      if (合.型 === '誤') return 合;
    }
    return 合;
  }

  function 掛けあげる(数たち, 手) {
    if (数たち.length === 0) return 数(0);   /* ★実測＝全部空の PRODUCT は 0（1 では ない）★ */
    var 積 = 数(数たち[0]);
    for (var i = 1; i < 数たち.length; i++) {
      積 = 計.つなぎ('*', 積, 数(数たち[i]), 手);
      if (積.型 === '誤') return 積;
    }
    return 積;
  }

  /* ══ ★MATCH と INDEX★（2026-09-15 に 書いた）══
     ★★なぜ この 2つが 先か★★
       司さんの 実物 1冊（代行計算表2026.xlsb）を 数えたら
       ★出てくる 関数は 8個だけ★／その うち ★INDEX と MATCH で のべの 68%★。
       ⇒★借り物を 外す 道の 一番 太い 所★。
     ★★答えは 全部 実Excel に 打って 測りました★★
       `docs/measured/kansuu46/golden-index-match2-2026-09-15.tsv`       … 138本（誤り 100本）
       `docs/measured/kansuu46/golden-index-match-kimari-2026-09-15.tsv` … 55本（★字の 表★）
     ★★当て推量なら 外して いた 物★★
       ・MATCH の 型は ★符号だけ★（2 も 1.9 も 0.5 も「1」／-2 も -0.5 も「-1」）
       ・型 1 は ★なめるのでは なく 二分探索★（降順 C1:C5 に 型1 で ★3★。なめれば 5）
       ・字は ★大文字小文字を 区別しない★・★ワイルドカードが 効く★
       ・INDEX は ★値では なく 参照★（`=ISBLANK(INDEX(E1:E5,4))` → TRUE）
       ・INDEX の 転け方は ★2種類★（行/列が 外＝#REF! ／ 負・字＝#VALUE!）
       ・★字の 誤りは 場所の 誤りより 先★（`=INDEX(D1,D2,"D")` → #REF! では なく #VALUE!） */

  /* ★数の 引数を 1つの 数に する★（暗黙の 交わり → 数に する）
     ★切り捨てません★＝MATCH の 型は ★符号だけ★ 使うので、ここでは 生の 数の まま */
  function 数の引数(引数, 手, 所) {
    var v = 場.ひとつに(引数, 所 && 所.今のマス);
    if (!v) return { 誤: 誤('#VALUE!') };
    if (v.型 === '誤') return { 誤: v };
    var n = 計.数にする(v, 手);
    if (n.型 === '誤') return { 誤: 誤('#VALUE!') };
    return { 数: n.値 };
  }
  /* ★INDEX の 行番号・列番号は 切り捨て★（実測 `=INDEX(A1:A5,1.9)` → ★1★） */
  function 切り捨て(x) { return x < 0 ? Math.ceil(x) : Math.floor(x); }

  /* ★当たるか★＝MATCH の「ぴたり」
     ★字どうしで 型紙（* ?）が 入って いれば 型紙として 見る★
     ★それ以外は 大小くらべの 0★（＝型が 違えば 当たらない
       実測 `=MATCH("3",A1:A5,0)` → #N/A ／ `=MATCH(3,"3",0)` → #N/A） */
  function 当たるか(探, v) {
    if (探 && 探.型 === '字' && v && v.型 === '字' && 場.型紙か(String(探.値))) {
      return 場.型紙に合うか(String(探.値), String(v.値));
    }
    return 場.比べる(探, v) === 0;
  }

  /* ★型 1（以下で 一番 後ろ）＝★二分探索★★
     ★実測で「なめるのでは ない」と 分かりました★
       `=MATCH(3,C1:C5,1)`（C＝5,4,3,2,1）→ ★3★
        なめて「探す値 以下の 最後」を 採ると ★5★ に なる ⇒ なめて いない
     ★空・比べられない 物は 左へ★（★未測定★＝後ろが 空の 列で 正しく なる 方を 選んだ） */
  function 二分で探す(並び, 探) {
    var lo = 1, hi = 並び.length, 当 = 0;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      var c = 場.比べる(並び[mid - 1], 探);
      if (c === 0) return mid;
      if (c !== null && c < 0) { 当 = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return 当;
  }

  /* ★型 -1（以上で 一番 後ろ・降順）★
     ★実測 3本に 合う 形★（★これは「実Excel の 中身」では なく 実測に 合う 模型★です）
       `=MATCH(3,C1:C5,-1)` → ★3★  （C＝5,4,3,2,1＝ちゃんと 降順）
       `=MATCH(3,A1:A5,-1)` → ★#N/A★（A＝1,2,3,4,5＝降順で ない）
       `=MATCH(1,A1:A5,-1)` → ★1★  （先頭だけ 当たる）
     ⇒★頭から 見て「探す値 以上」で かつ「降順が 崩れて いない」所まで★
       ★ちゃんと 降順に 並んで いれば これは 正しい 答えと 同じ★です。 */
  function 降順で探す(並び, 探) {
    var 当 = 0;
    for (var i = 0; i < 並び.length; i++) {
      if (i > 0 && 場.比べる(並び[i], 並び[i - 1]) > 0) break;   /* 降順が 崩れた */
      var c = 場.比べる(並び[i], 探);
      if (c === null || c < 0) break;
      当 = i + 1;
    }
    return 当;
  }

  /* ══ ★関数たち★ ══ */
  var 表 = {
    /* ★#N/A を 作るだけ の 関数★（2026-09-15 に 入れた）
       ★実測★ `=NA()+1` → ★#N/A★／`=NA()+1/0` → ★#N/A★／`=NA()=NA()` → ★#N/A★
               （golden-zero-torinaoshi-2026-09-08.tsv ／ .Value2 は -2146826246）
               `=ERROR.TYPE(NA())` → ★7★（golden-2026-09-06.tsv）
       ★入れた 訳★＝2026-09-15 の 突き合わせで
         ★借り物だけが 正しく 答える 10通り★の 1本が `=ERROR.TYPE(NA())` でした
         （紙 7 ／ うち ★5★＝`NA()` を 知らず #NAME? に なって いた）
       ★引数は 取りません★（実Excel も `NA()` は 引数なし） */
    NA: function () { return 誤('#N/A'); },

    /* ★MATCH★ … 並びの 中で 何番目か（1 から）
       ★型★ … 0＝ぴたり ／ ＞0＝以下で 一番 後ろ（二分探索） ／ ＜0＝以上で 一番 後ろ（降順）
       ★見つからなければ #N/A★（★これが MATCH の 本番★＝客は 探して 無い事の 方が 多い） */
    MATCH: function (引数たち, 手, 所) {
      var 今 = 所 && 所.今のマス;
      if (引数たち.length < 2) return 誤('#VALUE!');
      var 探 = 場.ひとつに(引数たち[0], 今);
      if (!探) return 誤('#VALUE!');
      if (探.型 === '誤') return 探;                    /* 実測 `=MATCH(1/0,2)` → #DIV/0! */
      var 型 = 1;
      if (引数たち.length > 2) {
        var t = 数の引数(引数たち[2], 手, 所);
        if (t.誤) return t.誤;                          /* 実測 `=MATCH(3,A1:A5,"x")` → #VALUE! */
        型 = t.数;
      }
      var 向 = 型 > 0 ? 1 : (型 < 0 ? -1 : 0);          /* ★符号だけ★（実測 2→1・-0.5→-1） */
      var 元 = 引数たち[1];
      if (元.種 === '四角') {
        /* ★2次元の 表は 探せません★（★未測定★＝棚。実Excel が 何を 返すか 見て いない） */
        if ((元.行数 || 0) > 1 && (元.列数 || 0) > 1) return 誤('#N/A');
        var 並び = 元.並び;
        if (向 === 0) {
          for (var i = 0; i < 並び.length; i++) if (当たるか(探, 並び[i])) return 数(i + 1);
          return 誤('#N/A');
        }
        var n = (向 > 0) ? 二分で探す(並び, 探) : 降順で探す(並び, 探);
        return n ? 数(n) : 誤('#N/A');
      }
      /* ★式に 直に 書いた 1つの 値を 表として 渡した 時★
         ★実測 10本＝「ぴたり」以外は 当たりません★（型 1 でも 以下で 拾わない）
           `=MATCH(2.5,1)` → #N/A ／ `=MATCH(D1,2)` → #N/A ／ `=MATCH(12,-10,100)` → #N/A
         ★字を 表に して 大小を 比べると #VALUE!★（実測 3本）
           `=MATCH("あ","い")` → #VALUE! ／ `=MATCH(A1:A5,"<3")` → #VALUE!
         ★合わない 1本を 隠しません★ … `=MATCH(A1:A5,1,0)` は 実Excel ★#N/A★／うち ★1★
           （★探す値が 表の 時＝溢れの 話＝土台⑤ の 先★。棚に 書いて 在ります） */
      if (元.種 === '直' && 元.値 && 元.値.型 === '字' && 向 !== 0) return 誤('#VALUE!');
      if (元.種 === '直') return 当たるか(探, 元.値) ? 数(1) : 誤('#N/A');
      /* 1マスを 指した 物（A1）は ★1つだけの 表★として ふつうに 探す */
      var ひとつ = [元.値];
      if (向 === 0) return 当たるか(探, ひとつ[0]) ? 数(1) : 誤('#N/A');
      var m = (向 > 0) ? 二分で探す(ひとつ, 探) : 降順で探す(ひとつ, 探);
      return m ? 数(m) : 誤('#N/A');
    },

    /* ★INDEX★ … ★値では なく 参照を 返します★（実測 `=ISBLANK(INDEX(E1:E5,4))` → TRUE）
       ★0 は「まるごと」★（行 0＝その 列 全部／列 0＝その 行 全部）
       ★転け方は 2種類★ 行/列が 外＝#REF! ／ 負・字＝#VALUE! */
    INDEX: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');   /* 実Excel は 式として 受け付けない */
      var 元 = 引数たち[0], R, C, 並び, 番地;
      if (元.種 === '四角') {
        R = 元.行数 || 0; C = 元.列数 || 0; 並び = 元.並び; 番地 = 元.番地 || null;
      } else {
        R = 1; C = 1; 並び = [元.値]; 番地 = 元.番地 || null;
      }
      if (!R || !C) return 誤('#REF!');
      if (R === 1 && C === 1 && 並び[0] && 並び[0].型 === '誤') return 並び[0];

      /* ★数に ならない 引数が 先★（実測 `=INDEX(D1,D2,"D")` → #REF! では なく ★#VALUE!★） */
      var g = 数の引数(引数たち[1], 手, 所); if (g.誤) return g.誤;
      var 行 = 切り捨て(g.数), 列 = null;
      if (引数たち.length > 2) {
        var h = 数の引数(引数たち[2], 手, 所); if (h.誤) return h.誤;
        列 = 切り捨て(h.数);
      }
      if (引数たち.length > 3) {
        var k = 数の引数(引数たち[3], 手, 所); if (k.誤) return k.誤;
        var 区 = 切り捨て(k.数);
        if (区 < 1) return 誤('#VALUE!');              /* 実測 `=INDEX(A1,A1:B5,2,FALSE)` → #VALUE! */
        if (区 > 1) return 誤('#REF!');                /* 実測 `=INDEX(A1:B5,1,1,2)` → #REF! */
      }
      if (列 === null) {
        if (C === 1) 列 = 1;
        else if (R === 1) { 列 = 行; 行 = 1; }         /* 横1本の 表＝番号は 列の 事 */
        else return 誤('#REF!');                       /* 実測 `=INDEX(A1:B5,3)` → #REF! */
      }
      if (行 < 0 || 列 < 0) return 誤('#VALUE!');       /* 実測 `=INDEX(A1:A5,-1)` → #VALUE! */
      if (行 > R || 列 > C) return 誤('#REF!');         /* 実測 `=INDEX(A1:A5,6)` → #REF! */

      var r0 = (行 === 0) ? 1 : 行, 行数 = (行 === 0) ? R : 1;
      var c0 = (列 === 0) ? 1 : 列, 列数 = (列 === 0) ? C : 1;
      var 出 = [];
      for (var i = 0; i < 行数; i++)
        for (var j = 0; j < 列数; j++)
          出.push(並び[(r0 - 1 + i) * C + (c0 - 1 + j)] || 計.空());
      if (!番地) {
        /* ★番地が 無い＝参照に できない★（式に 直に 書いた 値・式が 作った 表）
           実測 `=INDEX("あ",1)` → あ ／ `=INDEX(0.5,1)` → 0.5 */
        if (行数 === 1 && 列数 === 1) return 出[0];
        return 誤('#VALUE!');                          /* ★未測定★（棚）＝当て推量で 広げない */
      }
      return 場.参照(番地.行 + r0 - 1, 番地.列 + c0 - 1, 行数, 列数, 出);
    },

    /* 数が 1つも 無ければ 0（実測 `=SUM(B1:B3)` → 0） */
    SUM: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      return 足しあげる(拾.数たち, 手);
    },
    /* ★数が 1つも 無ければ #DIV/0!★（SUM は 0 なのに 平均は 誤り＝実測） */
    AVERAGE: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      if (拾.数たち.length === 0) return 誤('#DIV/0!');
      var 合 = 足しあげる(拾.数たち, 手);
      if (合.型 === '誤') return 合;
      return 計.つなぎ('/', 合, 数(拾.数たち.length), 手);
    },
    PRODUCT: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      return 掛けあげる(拾.数たち, 手);
    },
    /* ★数が 1つも 無ければ 0★。★在れば その中の 一番★（負だけでも 0は 混ざらない＝実測） */
    MAX: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      if (拾.数たち.length === 0) return 数(0);
      var m = 拾.数たち[0];
      for (var i = 1; i < 拾.数たち.length; i++) if (拾.数たち[i] > m) m = 拾.数たち[i];
      return 数(m);
    },
    MIN: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      if (拾.数たち.length === 0) return 数(0);
      var m = 拾.数たち[0];
      for (var i = 1; i < 拾.数たち.length; i++) if (拾.数たち[i] < m) m = 拾.数たち[i];
      return 数(m);
    },
    /* ★COUNT は 誤りを 数えない★（実測 `=COUNT(A1:A6)` → 2）
       ★誤りが 在っても 誤りを 返さない★＝数を 拾う 道とは 別（だから ここは 自分で 回す） */
    COUNT: function (引数たち, 手) {
      var n = 0;
      ほどく(引数たち, function (v, 元) {
        if (v.型 === '誤') return true;               /* ★飛ばす（伝えない）★ */
        if (元 === 'マス') { if (v.型 === '数') n++; return true; }
        var x = 計.数にする(v, 手);                    /* 直に 書いた 物は 数に して みる */
        if (x.型 === '数') n++;
        return true;
      });
      return 数(n);
    },
    /* ★COUNTA は 誤りを 数える★（実測 `=COUNTA(A1:A6)` → 5＝COUNT と 違う） */
    COUNTA: function (引数たち) {
      var n = 0;
      ほどく(引数たち, function (v) {
        if (v.型 !== '空') n++;
        return true;
      });
      return 数(n);
    }
  };

  /* ★知らない 名前は 呼ばない★＝★半分 合う 計算を 出さない★ */
  function 呼ぶ(名前, 引数たち, 手, 所) {
    var f = 表[String(名前).toUpperCase()];
    if (!f) return null;              /* ★null＝この 台は 知らない（借り物に 回す）★ */
    return f(引数たち, 手, 所 || {});
  }

  return {
    呼ぶ: 呼ぶ, 表: 表,
    数を拾う: 数を拾う, ほどく: ほどく,
    足しあげる: 足しあげる, 掛けあげる: 掛けあげる
  };
});
