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
    typeof require === 'function' ? require('./shiki-basho.js') : root.ShikiBasho,
    typeof require === 'function' ? require('./shoshiki.js') : root.Shoshiki);
  else root.ShikiKansuu = factory(root.ShikiKeisan, root.ShikiBasho, root.Shoshiki);
})(typeof self !== 'undefined' ? self : this, function (計, 場, 書) {
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

  /** ★★A の 付く 一族の 拾い方★★（AVERAGEA MAXA MINA VARA VARPA STDEVA STDEVPA）
        ★A の 無い 方との 違い＝★マスの 中の 字と 真偽を 飛ばさない★★
          ・マスの 真偽 … TRUE＝1 ／ FALSE＝0
          ・マスの 字   … ★0 として 数える★（★数に 読める 字でも 0★）
          ・マスの 空   … ★飛ばす★（A の 無い 方と 同じ）
        ★直に 書いた 物は A の 有無に かかわらず 数に する★（`=AVERAGEA("101",2)` → 51.5）
        ★物差し★ `golden-346-2026-09-08.tsv`
          `=AVERAGEA(A1:B5,2,FALSE)` → ★3.9166666666666665★（＝45＋2＋0 を 12個で 割る） */
  function Aで数を拾う(引数たち, 手) {
    var 出 = { 数たち: [], 誤: null };
    ほどく(引数たち, function (v, 元) {
      if (v.型 === '誤') { 出.誤 = v; return false; }
      if (元 === 'マス') {
        if (v.型 === '数') 出.数たち.push(v.値);
        else if (v.型 === '真偽') 出.数たち.push(v.値 ? 1 : 0);
        else if (v.型 === '字') 出.数たち.push(0);      /* ★数に 読める 字でも 0★ */
        return true;                                    /* ★空は 飛ばす★ */
      }
      var n = 計.数にする(v, 手);
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

  /* ══ ★残り 4個の うち 3個★（IF／IFERROR／SUBTOTAL）══（2026-09-15 に 書いた）
     ★司さんの 実物 1冊★ … IFERROR 4,329回 ／ IF 2,884回 ／ SUBTOTAL 496回
     ★紙★ `docs/measured/kansuu46/golden-nokori4-kimari-2026-09-15.tsv`（99本）
     ★TEXT は まだ 書いて いません★＝★書式の 台が 要ります★（棚 ⑮） */

  /* ★真か 偽か★（IF の 条件）
     ★実測★ 1→真 ／ 0→偽 ／ -1→真 ／ 0.5→真 ／ 空マス→偽
             ★字の "TRUE" は 真★／★"あ" と "" は #VALUE!★（★当て推量なら 全部 真に して いた★） */
  function 真偽にする(v) {
    if (!v) return { 誤: 誤('#VALUE!') };
    if (v.型 === '誤') return { 誤: v };
    if (v.型 === '真偽') return { 真: !!v.値 };
    if (v.型 === '数') return { 真: v.値 !== 0 };
    if (v.型 === '空') return { 真: false };
    if (v.型 === '字') {
      var u = String(v.値).trim().toUpperCase();
      if (u === 'TRUE') return { 真: true };
      if (u === 'FALSE') return { 真: false };
    }
    return { 誤: 誤('#VALUE!') };
  }

  /* ★SUBTOTAL の 11個★ … 1 AVERAGE ／ 2 COUNT ／ 3 COUNTA ／ 4 MAX ／ 5 MIN ／ 6 PRODUCT
                            7 STDEV ／ 8 STDEVP ／ 9 SUM ／ 10 VAR ／ 11 VARP
     ★101〜111 は「隠した 行を 抜く」★＝★今は 隠す 仕掛けが 無いので 同じ★（実測でも 同じ） */
  function 散らばり(数たち, 母集団か) {
    var n = 数たち.length;
    if (n < (母集団か ? 1 : 2)) return 誤('#DIV/0!');   /* ★n が 足りない時は 未測定★（棚） */
    var 和 = 0, i;
    for (i = 0; i < n; i++) 和 += 数たち[i];
    var 平 = 和 / n, 二乗 = 0;
    for (i = 0; i < n; i++) 二乗 += (数たち[i] - 平) * (数たち[i] - 平);
    return 数(二乗 / (母集団か ? n : n - 1));
  }

  /* ══ ★D系（DSUM ほか）の 土台★ ══（2026-09-15に 書いた）
     ★★これは 「移すだけ」では ありませんでした★★
       今の 製品の DSUM は `exally-formula.js` の `_jsDbFunc`。
       ★計算は 自前★ですが ★読む 先が `_hf.getCellValue`（★借り物の 表★）★
       ⇒★★台へ 持って 来るには 読む 所を 全部 書き直す事に なります★★
       ⇒★だから ここは ★台の 四角（並び／行数／列数）を 直に 見る形★ で 書きました★

     ★物差し★ … `docs/measured/kansuu46/golden-mada-2026-09-14.tsv`（実Excel 16.0 build 20326）
       `=DSUM(A1:B5,1,D1:D2)` → ★14★  … ★見出しが 合わない 条件は ★効かない★★
       `=DSUM(A1:B5,1,A1:A2)` → ★2★
     ★★今の 製品は 前者を ★0★ と 答えます★★＝★客に 出る 欠陥（棚）★

     ★★見て いない 事★★
       ・★ふたつ以上の 条件の 行（OR）／列（AND）は ★未測定★★（形だけ 入れて あります）
       ・★記号（`>2` など）も ★未測定★★
       ・★選ばなかった 行に 誤りが ある 時は ★未測定★★（今は 選んだ 行だけ 見ます） */

  var 較べ記号 = /^(>=|<=|<>|>|<|=)([\s\S]*)$/;

  /** ★条件の マス 1つに 実の 値が 当てはまるか★ */
  function 当てはまるか(条, 実) {
    if (条 && 条.型 === '字') {
      var m = 較べ記号.exec(String(条.値));
      if (m) {
        var 右 = m[2].trim();
        var n = Number(右);
        var 相 = (右 !== '' && isFinite(n)) ? 計.数(n) : 計.字(右);
        var d = 場.比べる(実, 相);
        if (d === null || d === undefined) return false;
        if (m[1] === '>') return d > 0;
        if (m[1] === '<') return d < 0;
        if (m[1] === '>=') return d >= 0;
        if (m[1] === '<=') return d <= 0;
        if (m[1] === '<>') return d !== 0;
        return d === 0;
      }
    }
    return 場.比べる(実, 条) === 0;
  }

  /** ★D系の 共通★… 台・列番・条件 から ★選んだ 行の 値たち★ を 返す */
  function D系の値たち(引数たち, 手, 所) {
    if (引数たち.length < 3) return { 誤: 誤('#VALUE!') };
    var 台 = 引数たち[0], 条 = 引数たち[2];
    if (台.種 !== '四角' || 条.種 !== '四角') return { 誤: 誤('#VALUE!') };
    if (!(台.行数 > 1) || !(台.列数 > 0)) return { 誤: 誤('#VALUE!') };

    var 見 = [], c;
    for (c = 0; c < 台.列数; c++) 見.push(台.並び[c]);

    /* ★field★ … 数なら 何列目（１から）／字なら 見出しの 名前 */
    var f = 場.ひとつに(引数たち[1], 所 && 所.今のマス);
    if (!f) return { 誤: 誤('#VALUE!') };
    if (f.型 === '誤') return { 誤: f };
    var 列番 = -1;
    if (f.型 === '数') 列番 = 切り捨て(f.値) - 1;
    else for (c = 0; c < 見.length; c++) if (場.比べる(f, 見[c]) === 0) { 列番 = c; break; }
    if (列番 < 0 || 列番 >= 台.列数) return { 誤: 誤('#VALUE!') };

    /* ★条件の 見出しを 台の 見出しに 紐付ける★
       ★★紐付かなければ その 列は 縛らない★★（実測 … `D1:D2` で 14） */
    var 条列 = [];
    for (c = 0; c < 条.列数; c++) {
      var 先 = -1;
      for (var k = 0; k < 見.length; k++) if (場.比べる(条.並び[c], 見[k]) === 0) { 先 = k; break; }
      条列.push(先);
    }

    var 値たち = [];
    for (var r = 1; r < 台.行数; r++) {
      var 合うか = !(条.行数 > 1);          /* ★条件の 行が 無ければ 全部★ */
      for (var cr = 1; cr < 条.行数 && !合うか; cr++) {
        var 全部 = true;
        for (var c3 = 0; c3 < 条.列数 && 全部; c3++) {
          if (条列[c3] < 0) continue;                       /* ★縛らない★ */
          var 条値 = 条.並び[cr * 条.列数 + c3];
          if (!条値 || 条値.型 === '空') continue;          /* ★空の 条件は 縛らない★ */
          if (!当てはまるか(条値, 台.並び[r * 台.列数 + 条列[c3]])) 全部 = false;
        }
        if (全部) 合うか = true;
      }
      if (合うか) 値たち.push(台.並び[r * 台.列数 + 列番]);
    }
    return { 値たち: 値たち };
  }

  /** ★D系の 共通★… 選んだ 行から ★数だけ★ 拾って 続きへ 渡す
        ★誤りは 素通り★（どの 関数でも 同じ 決め）／★字・真偽・空は 飛ばす★ */
  function D系の数で(引数たち, 手, 所, 続き) {
    var 拾 = D系の値たち(引数たち, 手, 所);
    if (拾.誤) return 拾.誤;
    var 数たち = [];
    for (var i = 0; i < 拾.値たち.length; i++) {
      var v = 拾.値たち[i];
      if (!v) continue;
      if (v.型 === '誤') return v;
      if (v.型 === '数') 数たち.push(v.値);
    }
    return 続き(数たち);
  }

  /** ★字の 引数★ … 暗黙の 交わり → ★字に する★（`&` と 同じ 台を 使う） */
  function 字の引数(引数, 手, 所) {
    var v = 場.ひとつに(引数, 所 && 所.今のマス);
    if (!v) return { 誤: 誤('#VALUE!') };
    if (v.型 === '誤') return { 誤: v };
    var t = 計.字にする(v);
    if (t.型 === '誤') return { 誤: t };
    return { 字: String(t.値) };
  }
  /** ★字を 1つ 取って 1つ 返す★ */
  function 字ひとつ(引数たち, 手, 所, 続き) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 字の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    return 計.字(続き(t.字));
  }
  /** ★LEFT／RIGHT★（`長さ` を 省くと 1） */
  function 端を取る(引数たち, 手, 所, 左か) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 字の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    var n = 1;
    if (引数たち.length > 1) {
      var d = 数の引数(引数たち[1], 手, 所);
      if (d.誤) return d.誤;
      n = 切り捨て(d.数);
      if (n < 0) return 誤('#VALUE!');
    }
    return 計.字(左か ? t.字.slice(0, n) : (n === 0 ? '' : t.字.slice(-n)));
  }
  /** ★FIND／SEARCH★（FIND は 大小を 見る／SEARCH は 見ない・見つからなければ #VALUE!） */
  function 探す(引数たち, 手, 所, 大小か) {
    if (引数たち.length < 2) return 誤('#VALUE!');
    var a = 字の引数(引数たち[0], 手, 所);
    if (a.誤) return a.誤;
    var b = 字の引数(引数たち[1], 手, 所);
    if (b.誤) return b.誤;
    var 頭 = 1;
    if (引数たち.length > 2) {
      var d = 数の引数(引数たち[2], 手, 所);
      if (d.誤) return d.誤;
      頭 = 切り捨て(d.数);
      if (頭 < 1) return 誤('#VALUE!');
    }
    var 的 = 大小か ? b.字 : b.字.toLowerCase();
    var 探 = 大小か ? a.字 : a.字.toLowerCase();
    var i = 的.indexOf(探, 頭 - 1);
    if (i < 0) return 誤('#VALUE!');
    return 数(i + 1);
  }

  /** ★丸めの 共通★（ROUND／ROUNDUP／ROUNDDOWN）
        ★半分は 0から 遠い 方へ★＝JS の `Math.round` は 負で 違う（-2.5 → -2）ので 自分で 書く */
  function 丸める(引数たち, 手, 所, 向) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 数の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    var 桁 = 0;
    if (引数たち.length > 1) {
      var d = 数の引数(引数たち[1], 手, 所);
      if (d.誤) return d.誤;
      桁 = 切り捨て(d.数);
    }
    var p = Math.pow(10, 桁);
    if (!isFinite(p)) return 数(桁 > 0 ? t.数 : 0);
    var x = t.数 * p;
    if (!isFinite(x)) return 数(t.数);
    var 符 = x < 0 ? -1 : 1, a = Math.abs(x), r;
    if (向 === 'U') r = Math.ceil(a);
    else if (向 === 'D') r = Math.floor(a);
    else r = Math.floor(a + 0.5);          /* ★半分は 外へ★ */
    return 数(符 * r / p);
  }

  /** ★CEILING.MATH／FLOOR.MATH★
        `上か` true＝CEILING／false＝FLOOR
        ★3つ目（向き）は ★負の 数の 時だけ★ 効く★（0 以外＝0から 遠い 方へ） */
  function 数学丸め(引数たち, 手, 所, 上か) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 数の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    var k = 1;
    if (引数たち.length > 1) {
      var m = 数の引数(引数たち[1], 手, 所);
      if (m.誤) return m.誤;
      k = m.数;
    }
    var 向 = 0;
    if (引数たち.length > 2) {
      var d = 数の引数(引数たち[2], 手, 所);
      if (d.誤) return d.誤;
      向 = d.数;
    }
    if (k === 0) return 数(0);
    var x = t.数;
    if (x >= 0) return 数((上か ? Math.ceil(x / Math.abs(k)) : Math.floor(x / Math.abs(k))) * Math.abs(k));
    var 外へ = 向 !== 0;
    var 上げる = 上か ? !外へ : 外へ;      /* 負の 時 … 向き 0＝0に 近い 方／0以外＝遠い 方 */
    var q = x / Math.abs(k);
    return 数((上げる ? Math.ceil(q) : Math.floor(q)) * Math.abs(k));
  }

  /** ★GCD／LCM の 共通★（★切り捨ててから★・負は #NUM!） */
  function 整数の組(引数たち, 手, 続き, 元) {
    var 拾 = 数を拾う(引数たち, 手);
    if (拾.誤) return 拾.誤;
    var 出 = 元;
    for (var i = 0; i < 拾.数たち.length; i++) {
      var n = 切り捨て(拾.数たち[i]);
      if (n < 0) return 誤('#NUM!');
      出 = 続き(出, n);
      if (!isFinite(出)) return 誤('#NUM!');
    }
    return 数(出);
  }

  /** ★数を 1つ 取って 1つ 返す★（`続き` が null を 返したら #NUM!） */
  function 数ひとつ(引数たち, 手, 所, 続き) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 数の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    var 出 = 続き(t.数);
    if (出 === null || !isFinite(出)) return 誤('#NUM!');
    return 数(出);
  }
  /** ★数を 2つ 取って 1つ 返す★ */
  function 数ふたつ(引数たち, 手, 所, 続き) {
    if (引数たち.length < 2) return 誤('#VALUE!');
    var a = 数の引数(引数たち[0], 手, 所);
    if (a.誤) return a.誤;
    var b = 数の引数(引数たち[1], 手, 所);
    if (b.誤) return b.誤;
    var 出 = 続き(a.数, b.数);
    if (出 === null || !isFinite(出)) return 誤('#NUM!');
    return 数(出);
  }

  /** ★OR／XOR／AND の 共通★
        ★拾い方★ 数は ≠0／真偽は そのまま／★直の 字は TRUE FALSE と 数に 読める 物だけ★
                  ★マスの 字・真偽・空は 飛ばす★（四角の 決めと 同じ）
        ★1つも 拾えなければ #VALUE!★ */
  function 真偽の一族(引数たち, 手, 種) {
    var 並び = [], 誤り = null;
    ほどく(引数たち, function (v, 元) {
      if (v.型 === '誤') { 誤り = v; return false; }
      if (元 === 'マス') {
        if (v.型 === '数') 並び.push(v.値 !== 0);
        else if (v.型 === '真偽') 並び.push(!!v.値);
        return true;                                   /* ★字・空は 飛ばす★ */
      }
      if (v.型 === '真偽') { 並び.push(!!v.値); return true; }
      if (v.型 === '数') { 並び.push(v.値 !== 0); return true; }
      if (v.型 === '字') {
        var u = String(v.値).trim().toUpperCase();
        if (u === 'TRUE') { 並び.push(true); return true; }
        if (u === 'FALSE') { 並び.push(false); return true; }
        /* ★★数に 読める 字も 飛ばします★★（2026-09-15・実Excel の 実測）
             `=XOR("101",2)` … ★実Excel TRUE★
             ⇒ "101" を 数に すると 真が 2つ ⇒ XOR は FALSE に なって しまう
             ⇒★実Excel は "101" を ★数えて いません★★
             ★`=OR("101",2)` は どちらでも TRUE★＝★OR では 見分けが 付かない★
             ⇒★★XOR が 1本で 正体を 出しました★★ */
        return true;                                   /* ★字は 全部 飛ばす★ */
      }
      return true;                                     /* 空は 飛ばす */
    });
    if (誤り) return 誤り;
    if (!並び.length) return 誤('#VALUE!');
    var i;
    if (種 === 'AND') {
      for (i = 0; i < 並び.length; i++) if (!並び[i]) return 計.真偽(false);
      return 計.真偽(true);
    }
    if (種 === 'OR') {
      for (i = 0; i < 並び.length; i++) if (並び[i]) return 計.真偽(true);
      return 計.真偽(false);
    }
    var 数え = 0;
    for (i = 0; i < 並び.length; i++) if (並び[i]) 数え++;
    return 計.真偽(数え % 2 === 1);
  }

  /** ★A の 付く 散らばり★（VARA VARPA STDEVA STDEVPA） */
  function A散らばりで(引数たち, 手, 母集団か, 根か) {
    var 拾 = Aで数を拾う(引数たち, 手);
    if (拾.誤) return 拾.誤;
    var 分 = 散らばり(拾.数たち, 母集団か);
    if (分.型 === '誤') return 分;
    return 根か ? 数(Math.sqrt(分.値)) : 分;
  }

  /** ★散らばりの 一族の 共通★
        `母集団か` … true＝n で 割る（`.P`）／false＝n−1（`.S`）
        `根か`     … true＝平方根を 取る（STDEV系）／false＝そのまま（VAR系） */
  function 散らばりで(引数たち, 手, 母集団か, 根か) {
    var 拾 = 数を拾う(引数たち, 手);
    if (拾.誤) return 拾.誤;
    var 分 = 散らばり(拾.数たち, 母集団か);
    if (分.型 === '誤') return 分;
    return 根か ? 数(Math.sqrt(分.値)) : 分;
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

    /* ★TEXT★ … ★書式の 台（`lib/shoshiki.js`）を 呼ぶだけ★
       ★★台は 1つ★★（指示役1 の 決め 2026-09-15）＝★画面（`js/book-open.js`）も 同じ 台★
       ★司さんの 実物では 740回★／★使う 書式は 2種類だけ★（aaa 731 ／ m/d 9）
       ★実測★（`docs/measured/kansuu46/golden-nokori4-kimari-2026-09-15.tsv` ほか）
         `=TEXT("あ","0")`        → ★あ★     （字は 素通り）
         `=TEXT(TRUE,"0")`        → ★TRUE★   （真偽も 素通り）
         `=TEXT(A9,"0")`          → ★0★      （空マスは 0）
         `=TEXT(1/0,"0")`         → ★#DIV/0!★（誤りは 通り抜ける）
         `=TEXT(1234.5,"")`       → ★空★
         `=TEXT(1234.5,"General")`→ ★#VALUE!★（★この国の Excel では 通らない★）
         `=TEXT(-0.004,"#,##0_ ")`→ ★"0 "★   （★-0 に しない★） */
    TEXT: function (引数たち, 手, 所) {
      var 今 = 所 && 所.今のマス;
      if (引数たち.length < 2) return 誤('#VALUE!');
      var v = 場.ひとつに(引数たち[0], 今);
      if (!v) return 誤('#VALUE!');
      if (v.型 === '誤') return v;
      var f = 場.ひとつに(引数たち[1], 今);
      if (!f) return 誤('#VALUE!');
      if (f.型 === '誤') return f;
      var 素 = (v.型 === '空') ? 0 : v.値;
      if (v.型 === '真偽') 素 = !!v.値;
      var 出 = 書.字にする(素, (f.型 === '空') ? '' : String(f.値));
      if (出 === null) return 誤('#VALUE!');
      return 計.字(出);
    },


    /* ★IF★
       ★実測で 分かった 事★（当て推量なら 4つ 外して いた）
         `=IF("TRUE",1,2)` → ★1★   （★字の TRUE は 真に なる★）
         `=IF("あ",1,2)`   → ★#VALUE!★ ／ `=IF("",1,2)` → ★#VALUE!★
         `=IF(FALSE,1)`    → ★FALSE★（★引数 2つの 時の 偽は FALSE★）
         `=IF(TRUE,,2)`    → ★0★   （★枝を 省くと 0★）
         `=IF(FALSE,1/0,2)`→ ★2★   （★選ばない 枝の 誤りは 見ない★）
       ★選ばない 枝も 計算して います★＝★答えは 同じ★（返さないので）。
         違うのは ★速さ★だけ。★遅さが 出たら そこで 直します★（今は 測って いません）。 */
    IF: function (引数たち, 手, 所) {
      var 今 = 所 && 所.今のマス;
      if (引数たち.length < 2) return 誤('#VALUE!');
      var 判 = 真偽にする(場.ひとつに(引数たち[0], 今));
      if (判.誤) return 判.誤;
      if (!判.真 && 引数たち.length < 3) return 計.真偽(false);   /* 実測 `=IF(FALSE,1)` → FALSE */
      var 枝 = 判.真 ? 引数たち[1] : 引数たち[2];
      var v = 場.ひとつに(枝, 今);
      return v || 計.空;
    },

    /* ★IFERROR★
       ★実測★ `=IFERROR("","x")` → ★空の 字★（★空の 字は 誤りでは ない★）
               `=IFERROR(A9,"x")` → ★0★（★空マスは 誤りでは ない★）
               `=IFERROR(1/0,)`   → ★0★（★2つ目を 省くと 0★）
               `=IFERROR(1)`      → ★実Excel が 式として 受け付けない★ */
    IFERROR: function (引数たち, 手, 所) {
      var 今 = 所 && 所.今のマス;
      if (引数たち.length < 2) return 誤('#VALUE!');   /* 実Excel は 式として 受け付けない */
      var v = 場.ひとつに(引数たち[0], 今);
      if (!v || v.型 !== '誤') return v || 計.空;
      var w = 場.ひとつに(引数たち[1], 今);
      return w || 計.空;
    },

    /* ★SUBTOTAL★ … ★本体は「入れ子の SUBTOTAL を 数えない」事★
       ★実測★ A6 に `=SUBTOTAL(9,A1:A5)` を 置いて
                 `=SUBTOTAL(9,A1:A6)` → ★15★ ／ `=SUM(A1:A6)` → ★30★
                 `=SUBTOTAL(2,A1:A6)` → ★5★（個数でも 数えない）
       ★実測（呼び方）★ `"9"` の 字でも 通る ／ `9.5` は 切り捨て
                         `0` と `12` は ★#VALUE!★ ／ 範囲で なく 数は ★式として 受け付けない★ */
    SUBTOTAL: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var t = 数の引数(引数たち[0], 手, 所);
      if (t.誤) return t.誤;
      var 番 = 切り捨て(t.数);
      if (番 >= 101 && 番 <= 111) 番 -= 100;   /* ★隠した 行を 抜く 形★＝今は 同じ（実測でも 同じ） */
      if (番 < 1 || 番 > 11) return 誤('#VALUE!');

      /* ★入れ子の SUBTOTAL を 外す★（★値だけでは 分からない＝打った 字を 見る★） */
      var 中 = [];
      for (var i = 1; i < 引数たち.length; i++) {
        var a = 引数たち[i];
        /* ★誤りは そのまま 返す★（2026-09-15＝実物で 1本 見つけた）
           ＝ は ★#REF!★（★#VALUE! では ない★）
           ★誤りは どの 関数でも 素通りする★＝SUBTOTAL の 決まりでは なく 誤りの 決まり */
        if (a.種 === '直' && a.値 && a.値.型 === '誤') return a.値;
        if (a.種 === '直') return 誤('#VALUE!');       /* 実Excel は 式として 受け付けない */
        if (a.種 !== '四角' || typeof a.打った字 !== 'function') { 中.push(a); continue; }
        var 残 = [];
        for (var j = 0; j < a.並び.length; j++) {
          if (/^=\s*SUBTOTAL\s*\(/i.test(a.打った字(j))) continue;
          残.push(a.並び[j]);
        }
        中.push({ 種: '四角', 並び: 残, 行数: 残.length, 列数: 1 });
      }

      if (番 === 1) return 表.AVERAGE(中, 手);
      if (番 === 2) return 表.COUNT(中, 手);
      if (番 === 3) return 表.COUNTA(中, 手);
      if (番 === 4) return 表.MAX(中, 手);
      if (番 === 5) return 表.MIN(中, 手);
      if (番 === 6) return 表.PRODUCT(中, 手);
      if (番 === 9) return 表.SUM(中, 手);
      var 拾 = 数を拾う(中, 手);
      if (拾.誤) return 拾.誤;
      var 分 = 散らばり(拾.数たち, 番 === 8 || 番 === 11);
      if (分.型 === '誤') return 分;
      return (番 === 10 || 番 === 11) ? 分 : 数(Math.sqrt(分.値));
    },


    /* ★★DSUM★★ … ★417個の うち ★最初の 1個★★（2026-09-15）
       ★指示役1「まず 1個 移して 手間を 出せ」★
       ★実測★ `=DSUM(A1:B5,1,D1:D2)` → ★14★ ／ `=DSUM(A1:B5,1,A1:A2)` → ★2★
       ★誤りは 素通り★（★未測定★＝台の 決め。SUM／MAX／AVERAGE は 実測で そう） */
    DSUM: function (引数たち, 手, 所) {
      var 拾 = D系の値たち(引数たち, 手, 所);
      if (拾.誤) return 拾.誤;
      var 和 = 0;
      for (var i = 0; i < 拾.値たち.length; i++) {
        var v = 拾.値たち[i];
        if (!v) continue;
        if (v.型 === '誤') return v;
        if (v.型 === '数') 和 += v.値;
      }
      return 数(和);
    },

    /* ★★D系の 残り 11個★★（2026-09-15）
       ★土台（`D系の値たち`）は DSUM の 時に 書きました★＝ここは ★拾い方だけ★
       ★物差し★ … 実Excel（`tests/shiki-kansuu-dkei.test.mjs`＝紙 21行＋17行）
       ★実Excel に 聞いて 初めて 分かった 物（★当て推量なら 外して いた★）★
         `=DPRODUCT(…)` 当たる 行 0件 → ★0★（★掛け算の 元は 1 なのに★）
         `=DGET(…)`     0件 → ★#VALUE!★／2件以上 → ★#NUM!★（★別の 誤り★）
         `=DCOUNT(…)`   0件 → ★0★／`=DAVERAGE(…)` 0件 → ★#DIV/0!★
       ★COUNTA は 誤りも 数える★（`COUNTA` と 同じ 決め） */

    /** ★選んだ 行の 数だけ 拾う★（★字と 真偽と 空は 飛ばす★＝四角の 決めと 同じ） */
    DAVERAGE: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      if (!数たち.length) return 誤('#DIV/0!');
      var 和 = 0; for (var i = 0; i < 数たち.length; i++) 和 += 数たち[i];
      return 数(和 / 数たち.length);
    }); },

    DCOUNT: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      return 数(数たち.length);
    }); },

    /* ★DCOUNTA は 誤りも 数える★＝`数で` では なく ★値そのもの★を 見る */
    DCOUNTA: function (引数たち, 手, 所) {
      var 拾 = D系の値たち(引数たち, 手, 所);
      if (拾.誤) return 拾.誤;
      var n = 0;
      for (var i = 0; i < 拾.値たち.length; i++) {
        var v = 拾.値たち[i];
        if (v && v.型 !== '空') n++;
      }
      return 数(n);
    },

    /* ★DGET は 0件と 2件以上で ★誤りが 違う★★（実Excel の 実測） */
    DGET: function (引数たち, 手, 所) {
      var 拾 = D系の値たち(引数たち, 手, 所);
      if (拾.誤) return 拾.誤;
      var 生 = [];
      for (var i = 0; i < 拾.値たち.length; i++) {
        var v = 拾.値たち[i];
        if (v && v.型 !== '空') 生.push(v);
      }
      if (生.length === 0) return 誤('#VALUE!');
      if (生.length > 1) return 誤('#NUM!');
      if (生[0].型 === '誤') return 生[0];
      return 生[0];
    },

    DMAX: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      if (!数たち.length) return 数(0);          /* ★MAX と 同じ 決め★（実測 `=MAX(B1:B3)` → 0） */
      return 数(Math.max.apply(null, 数たち));
    }); },

    DMIN: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      if (!数たち.length) return 数(0);
      return 数(Math.min.apply(null, 数たち));
    }); },

    /* ★0件は ★0★★（実Excel の 実測・★1 では ない★） */
    DPRODUCT: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      if (!数たち.length) return 数(0);
      var 積 = 1; for (var i = 0; i < 数たち.length; i++) 積 *= 数たち[i];
      return 数(積);
    }); },

    DSTDEV: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      var 分 = 散らばり(数たち, false);
      return (分.型 === '誤') ? 分 : 数(Math.sqrt(分.値));
    }); },
    DSTDEVP: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      var 分 = 散らばり(数たち, true);
      return (分.型 === '誤') ? 分 : 数(Math.sqrt(分.値));
    }); },
    DVAR: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      return 散らばり(数たち, false);
    }); },
    DVARP: function (引数たち, 手, 所) { return D系の数で(引数たち, 手, 所, function (数たち) {
      return 散らばり(数たち, true);
    }); },

    /* ══ ★★散らばりの 一族★★ ══（2026-09-15）
       ★物差し★ … `docs/measured/kansuu46/golden-346-2026-09-08.tsv`（実Excel 16.0 build 20326）
       ★見張り★ … `tests/shiki-kansuu-kami.test.mjs`（★紙 60枚 全部で 押す★）
       ★土台は もう 在ります★ … `数を拾う`（★四角の 中の 字と 真偽は 飛ばす★）／`散らばり`
       ★★`.S` と `.P` の 違い★★ … `.S`（標本）は n−1／`.P`（母集団）は n
         ⇒`散らばり(数たち, 母集団か)` の 第2引数だけ 違います
       ★別名★ VAR＝VAR.S ／ VARP＝VAR.P ／ STDEV＝STDEV.S ／ STDEVP＝STDEV.P
         （★1つの 中身を 2つの 名前で 指す＝二重実装に しない★） */
    VAR: function (引数たち, 手, 所) { return 散らばりで(引数たち, 手, false, false); },
    'VAR.S': function (引数たち, 手, 所) { return 散らばりで(引数たち, 手, false, false); },
    VARP: function (引数たち, 手, 所) { return 散らばりで(引数たち, 手, true, false); },
    'VAR.P': function (引数たち, 手, 所) { return 散らばりで(引数たち, 手, true, false); },
    STDEV: function (引数たち, 手, 所) { return 散らばりで(引数たち, 手, false, true); },
    'STDEV.S': function (引数たち, 手, 所) { return 散らばりで(引数たち, 手, false, true); },
    STDEVP: function (引数たち, 手, 所) { return 散らばりで(引数たち, 手, true, true); },
    'STDEV.P': function (引数たち, 手, 所) { return 散らばりで(引数たち, 手, true, true); },

    /* ★MEDIAN★ … 真ん中（偶数なら 2つの 平均） */
    MEDIAN: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      var a = 拾.数たち.slice().sort(function (x, y) { return x - y; });
      if (!a.length) return 誤('#NUM!');
      var m = a.length >> 1;
      return 数(a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2);
    },

    /* ★SUMSQ★ … 二乗の 和 */
    SUMSQ: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      var 和 = 0;
      for (var i = 0; i < 拾.数たち.length; i++) 和 += 拾.数たち[i] * 拾.数たち[i];
      return 数(和);
    },

    /* ★DEVSQ★ … 平均からの ずれの 二乗の 和 */
    DEVSQ: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      var a = 拾.数たち;
      if (!a.length) return 誤('#NUM!');
      var 和 = 0, i;
      for (i = 0; i < a.length; i++) 和 += a[i];
      var 平 = 和 / a.length, 二 = 0;
      for (i = 0; i < a.length; i++) 二 += (a[i] - 平) * (a[i] - 平);
      return 数(二);
    },

    /* ★AVEDEV★ … 平均からの ずれ（絶対値）の 平均 */
    AVEDEV: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      var a = 拾.数たち;
      if (!a.length) return 誤('#NUM!');
      var 和 = 0, i;
      for (i = 0; i < a.length; i++) 和 += a[i];
      var 平 = 和 / a.length, 差 = 0;
      for (i = 0; i < a.length; i++) 差 += Math.abs(a[i] - 平);
      return 数(差 / a.length);
    },

    /* ★GEOMEAN★ … 掛けて n乗根（★0や 負が 混ざると #NUM!★） */
    GEOMEAN: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      var a = 拾.数たち;
      if (!a.length) return 誤('#NUM!');
      /* ★★形を 2つ 作って 測りました★★（2026-09-15・紙 37行）
           ㋐★掛けて n乗根★     … ★36/37★  ←★こちらを 採った★
           ㋑`EXP(LN の 平均)`  … 35/37
           ★実Excel 自身が 1つの 形では ありません★
             `=GEOMEAN(0.5,1)` … 実Excel `0.70710678118654757`＝★√0.5 そのもの★（㋐が 合う）
             `=GEOMEAN(2,TRUE)` … 実Excel `1.4142135623730949`＝★√2 より 1つ 下★（㋑が 合う）
           ⇒★★両方 合う 形は 作れません★★⇒★合う 本数の 多い 方を 採り、残り 1本は 名指しで 棚★
           ⇒`tests/shiki-kansuu-kami.test.mjs` の `まだ` に `=GEOMEAN(2,TRUE)` */
      var 積 = 1;
      for (var i = 0; i < a.length; i++) {
        if (a[i] <= 0) return 誤('#NUM!');
        積 *= a[i];
      }
      return 数(Math.pow(積, 1 / a.length));
    },

    /* ★HARMEAN★ … 逆数の 平均の 逆数（★0や 負が 混ざると #NUM!★） */
    HARMEAN: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      var a = 拾.数たち;
      if (!a.length) return 誤('#NUM!');
      /* ★`n ÷ Σ(1/x)` では なく ★`1 ÷ (Σ(1/x) ÷ n)`★★（2026-09-15 実測）
           `=HARMEAN(1,2,3,4,5,6)` … 前 `2.4489795918367347` ／実Excel `2.4489795918367352`
           ⇒★後の 形で ★同じ double★★（GEOMEAN と 同じ 型の 話） */
      var 逆 = 0;
      for (var i = 0; i < a.length; i++) {
        if (a[i] <= 0) return 誤('#NUM!');
        逆 += 1 / a[i];
      }
      return 数(1 / (逆 / a.length));
    },

    /* ══ ★★字の 一族★★ ══（2026-09-15）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★字に する 所は 1つに★ … `計.字にする()`（`&` と 同じ 台）
       ★実Excel に 聞いて 分かった 事★
         `=CODE(D1)` → ★52★（D1＝45292 ⇒ "45292" の 頭 `4`）
         `=CODE(TRUE)` → ★84★（`T`）＝★真偽も 字に なる★
         `=LEFT(A1)` → `1`（★型は 字★）／`=LEFT("101",2)` → `10`
         `=EXACT(A1:A5,A1)` → ★TRUE★（暗黙の 交わりで どちらも A1） */
    LEFT: function (引数たち, 手, 所) { return 端を取る(引数たち, 手, 所, true); },
    RIGHT: function (引数たち, 手, 所) { return 端を取る(引数たち, 手, 所, false); },
    LEN: function (引数たち, 手, 所) {
      var t = 字の引数(引数たち[0], 手, 所);
      if (!引数たち.length || t.誤) return t.誤 || 誤('#VALUE!');
      return 数(t.字.length);
    },
    MID: function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      var t = 字の引数(引数たち[0], 手, 所);
      if (t.誤) return t.誤;
      var a = 数の引数(引数たち[1], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[2], 手, 所);
      if (b.誤) return b.誤;
      var 頭 = 切り捨て(a.数), 長 = 切り捨て(b.数);
      if (頭 < 1 || 長 < 0) return 誤('#VALUE!');
      return 計.字(t.字.substr(頭 - 1, 長));
    },
    UPPER: function (引数たち, 手, 所) { return 字ひとつ(引数たち, 手, 所, function (x) { return x.toUpperCase(); }); },
    LOWER: function (引数たち, 手, 所) { return 字ひとつ(引数たち, 手, 所, function (x) { return x.toLowerCase(); }); },
    TRIM: function (引数たち, 手, 所) {
      /* ★間の 空きは 1つに する★（実Excel と 同じ） */
      return 字ひとつ(引数たち, 手, 所, function (x) { return x.replace(/ +/g, ' ').replace(/^ | $/g, ''); });
    },
    PROPER: function (引数たち, 手, 所) {
      /* ★字でない 物の 次を 大文字に する★（実Excel と 同じ） */
      return 字ひとつ(引数たち, 手, 所, function (x) {
        var 出 = '', 前が字 = false;
        for (var i = 0; i < x.length; i++) {
          var c = x[i], 字か = /[A-Za-zÀ-ɏ]/.test(c);
          出 += 字か ? (前が字 ? c.toLowerCase() : c.toUpperCase()) : c;
          前が字 = 字か;
        }
        return 出;
      });
    },
    CLEAN: function (引数たち, 手, 所) {
      /* eslint-disable-next-line no-control-regex */
      return 字ひとつ(引数たち, 手, 所, function (x) { return x.replace(/[ -]/g, ''); });
    },
    T: function (引数たち, 手, 所) {
      var v = 場.ひとつに(引数たち[0], 所 && 所.今のマス);
      if (!引数たち.length || !v) return 誤('#VALUE!');
      if (v.型 === '誤') return v;
      return 計.字(v.型 === '字' ? String(v.値) : '');
    },
    REPT: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var t = 字の引数(引数たち[0], 手, 所);
      if (t.誤) return t.誤;
      var n = 数の引数(引数たち[1], 手, 所);
      if (n.誤) return n.誤;
      var k = 切り捨て(n.数);
      if (k < 0) return 誤('#VALUE!');
      return 計.字(t.字.repeat(k));
    },
    EXACT: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 字の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = 字の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      return 計.真偽(a.字 === b.字);
    },
    CODE: function (引数たち, 手, 所) {
      var t = 字の引数(引数たち[0], 手, 所);
      if (!引数たち.length || t.誤) return t.誤 || 誤('#VALUE!');
      if (!t.字.length) return 誤('#VALUE!');
      return 数(t.字.charCodeAt(0));
    },
    UNICODE: function (引数たち, 手, 所) {
      var t = 字の引数(引数たち[0], 手, 所);
      if (!引数たち.length || t.誤) return t.誤 || 誤('#VALUE!');
      if (!t.字.length) return 誤('#VALUE!');
      return 数(t.字.codePointAt(0));
    },
    CHAR: function (引数たち, 手, 所) {
      var n = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length || n.誤) return n.誤 || 誤('#VALUE!');
      var k = 切り捨て(n.数);
      if (k < 1 || k > 255) return 誤('#VALUE!');
      return 計.字(String.fromCharCode(k));
    },
    UNICHAR: function (引数たち, 手, 所) {
      var n = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length || n.誤) return n.誤 || 誤('#VALUE!');
      var k = 切り捨て(n.数);
      if (k < 1 || k > 1114111) return 誤('#VALUE!');
      return 計.字(String.fromCodePoint(k));
    },
    SUBSTITUTE: function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      var t = 字の引数(引数たち[0], 手, 所);
      if (t.誤) return t.誤;
      var 古 = 字の引数(引数たち[1], 手, 所);
      if (古.誤) return 古.誤;
      var 新 = 字の引数(引数たち[2], 手, 所);
      if (新.誤) return 新.誤;
      if (古.字 === '') return 計.字(t.字);
      if (引数たち.length < 4) return 計.字(t.字.split(古.字).join(新.字));
      var k = 数の引数(引数たち[3], 手, 所);
      if (k.誤) return k.誤;
      var 何番 = 切り捨て(k.数);
      if (何番 < 1) return 誤('#VALUE!');
      var 場所 = -1, 数え = 0, i = 0;
      while ((i = t.字.indexOf(古.字, i)) >= 0) {
        数え++;
        if (数え === 何番) { 場所 = i; break; }
        i += 古.字.length;
      }
      if (場所 < 0) return 計.字(t.字);
      return 計.字(t.字.slice(0, 場所) + 新.字 + t.字.slice(場所 + 古.字.length));
    },
    REPLACE: function (引数たち, 手, 所) {
      if (引数たち.length < 4) return 誤('#VALUE!');
      var t = 字の引数(引数たち[0], 手, 所);
      if (t.誤) return t.誤;
      var a = 数の引数(引数たち[1], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[2], 手, 所);
      if (b.誤) return b.誤;
      var 新 = 字の引数(引数たち[3], 手, 所);
      if (新.誤) return 新.誤;
      var 頭 = 切り捨て(a.数), 長 = 切り捨て(b.数);
      if (頭 < 1 || 長 < 0) return 誤('#VALUE!');
      return 計.字(t.字.slice(0, 頭 - 1) + 新.字 + t.字.slice(頭 - 1 + 長));
    },
    FIND: function (引数たち, 手, 所) { return 探す(引数たち, 手, 所, true); },
    SEARCH: function (引数たち, 手, 所) { return 探す(引数たち, 手, 所, false); },

    /* ══ ★★三角と 丸めの 一族★★ ══（2026-09-15）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★実Excel に 聞いて 分かった 事★
         `=CEILING.MATH(2,3,4)` → 3（★3つ目は 負の 数の 時だけ 効く★）
         `=FLOOR.MATH(2,3)` → ★0★
         `=ROUND(2.5,0)` → ★3★（★半分は 0から 遠い 方へ★＝JS の `Math.round` とは 負で 違う） */
    SIN: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.sin); },
    COS: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.cos); },
    TAN: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.tan); },
    ASIN: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return (x < -1 || x > 1) ? null : Math.asin(x); });
    },
    ACOS: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return (x < -1 || x > 1) ? null : Math.acos(x); });
    },
    ATAN: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.atan); },
    ATAN2: function (引数たち, 手, 所) {
      /* ★実Excel は (x, y) の 順★＝JS の `Math.atan2(y, x)` と ★逆★ */
      return 数ふたつ(引数たち, 手, 所, function (x, y) {
        return (x === 0 && y === 0) ? null : Math.atan2(y, x);
      });
    },
    SINH: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.sinh); },
    COSH: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.cosh); },
    TANH: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.tanh); },
    ASINH: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.asinh); },
    ACOSH: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x < 1 ? null : Math.acosh(x); });
    },
    ATANH: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return (x <= -1 || x >= 1) ? null : Math.atanh(x); });
    },
    COT: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x === 0 ? null : 1 / Math.tan(x); });
    },
    SEC: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, function (x) { return 1 / Math.cos(x); }); },
    CSC: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x === 0 ? null : 1 / Math.sin(x); });
    },

    /* ★ROUND／ROUNDUP／ROUNDDOWN★ … ★半分は 0から 遠い 方へ★ */
    ROUND: function (引数たち, 手, 所) { return 丸める(引数たち, 手, 所, 'R'); },
    ROUNDUP: function (引数たち, 手, 所) { return 丸める(引数たち, 手, 所, 'U'); },
    ROUNDDOWN: function (引数たち, 手, 所) { return 丸める(引数たち, 手, 所, 'D'); },

    /* ★CEILING.MATH／FLOOR.MATH★ … ★3つ目（向き）は ★負の 数の 時だけ★ 効く★ */
    'CEILING.MATH': function (引数たち, 手, 所) { return 数学丸め(引数たち, 手, 所, true); },
    'FLOOR.MATH': function (引数たち, 手, 所) { return 数学丸め(引数たち, 手, 所, false); },

    /* ★GCD／LCM★ … ★切り捨ててから★（実Excel も そう） */
    GCD: function (引数たち, 手) { return 整数の組(引数たち, 手, function (a, b) {
      while (b) { var t = a % b; a = b; b = t; }
      return a;
    }, 0); },
    LCM: function (引数たち, 手) { return 整数の組(引数たち, 手, function (a, b) {
      if (a === 0 || b === 0) return 0;
      var x = a, y = b;
      while (y) { var t = x % y; x = y; y = t; }
      return a / x * b;
    }, 1); },

    ISEVEN: function (引数たち, 手, 所) {
      var t = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length || t.誤) return t.誤 || 誤('#VALUE!');
      return 計.真偽(Math.abs(切り捨て(t.数)) % 2 === 0);
    },
    ISODD: function (引数たち, 手, 所) {
      var t = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length || t.誤) return t.誤 || 誤('#VALUE!');
      return 計.真偽(Math.abs(切り捨て(t.数)) % 2 === 1);
    },

    /* ══ ★★数の 一族★★ ══（2026-09-15）
       ★物差し★ `golden-346-2026-09-08.tsv`（実Excel 16.0 build 20326）
       ★引数の 取り方は 1つに★ … `数の引数()`（暗黙の 交わり → 数に する）
       ★実Excel に 聞いて 分かった 事★
         `=EVEN(0.5)` → ★2★（★0 では ない＝必ず 外へ 逃がす★）
         `=EVEN(TRUE)` → 2 ／ `=EVEN(FALSE)` → ★0★
         `=CEILING(2,TRUE)` → 2 ／ `=FLOOR(2,3)` → ★0★
         `=COMBIN(2.5,1)` → 2（★切り捨ててから 数える★）
         `=TRUNC` は ★桁を 省ける★（既定 0） */
    ABS: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.abs); },
    SIGN: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.sign); },
    INT: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.floor); },
    SQRT: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x < 0 ? null : Math.sqrt(x); });
    },
    EXP: function (引数たち, 手, 所) { return 数ひとつ(引数たち, 手, 所, Math.exp); },
    LN: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x <= 0 ? null : Math.log(x); });
    },
    LOG10: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x <= 0 ? null : Math.log10(x); });
    },
    RADIANS: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x * Math.PI / 180; });
    },
    DEGREES: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x * 180 / Math.PI; });
    },
    PI: function (引数たち) { return 引数たち.length ? 誤('#VALUE!') : 数(Math.PI); },

    /* ★EVEN／ODD★ … ★0 から 外へ 逃がす★（`=EVEN(0.5)` → 2） */
    EVEN: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        if (x === 0) return 0;
        var 符 = x < 0 ? -1 : 1, a = Math.abs(x);
        return 符 * Math.ceil(a / 2) * 2;
      });
    },
    ODD: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        if (x === 0) return 1;
        var 符 = x < 0 ? -1 : 1, a = Math.abs(x);
        var k = Math.ceil((a + 1) / 2) * 2 - 1;
        return 符 * k;
      });
    },

    /* ★TRUNC★ … 桁を 省ける（既定 0）／★0 の 方へ 切る★ */
    TRUNC: function (引数たち, 手, 所) {
      var t = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length || t.誤) return t.誤 || 誤('#VALUE!');
      var 桁 = 0;
      if (引数たち.length > 1) {
        var d = 数の引数(引数たち[1], 手, 所);
        if (d.誤) return d.誤;
        桁 = 切り捨て(d.数);
      }
      /* ★★桁が 大きすぎると 10^桁 が 無限に なります★★（2026-09-15 実測）
           `=TRUNC(D1,D2)`（D1=45292 D2=46023）… 前 ★NaN★ ／実Excel ★45292★
           ＝`10^46023` → `Infinity` ⇒ `Infinity/Infinity` → `NaN`
           ⇒★桁が 十分 大きければ ★何も 切らない★★（元の 数を そのまま） */
      var p = Math.pow(10, 桁);
      if (!isFinite(p)) return 数(桁 > 0 ? t.数 : 0);
      if (p === 0) return 数(0);
      var x = t.数 * p;
      if (!isFinite(x)) return 数(t.数);
      return 数((x < 0 ? Math.ceil(x) : Math.floor(x)) / p);
    },

    POWER: function (引数たち, 手, 所) { return 数ふたつ(引数たち, 手, 所, Math.pow); },
    QUOTIENT: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (a, b) {
        if (b === 0) return null;
        var x = a / b;
        return x < 0 ? Math.ceil(x) : Math.floor(x);
      });
    },
    /* ★CEILING／FLOOR★ … ★刻みの 倍数に する★（刻み 0 は 0） */
    CEILING: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (x, k) {
        if (k === 0) return 0;
        return Math.ceil(x / k) * k;
      });
    },
    FLOOR: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (x, k) {
        if (k === 0) return 0;
        return Math.floor(x / k) * k;
      });
    },
    MROUND: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (x, k) {
        if (k === 0) return 0;
        if ((x < 0) !== (k < 0) && x !== 0) return null;   /* 実Excel は 符号違いで #NUM! */
        return Math.round(x / k) * k;
      });
    },
    LOG: function (引数たち, 手, 所) {
      var t = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length || t.誤) return t.誤 || 誤('#VALUE!');
      var 底 = 10;
      if (引数たち.length > 1) {
        var b = 数の引数(引数たち[1], 手, 所);
        if (b.誤) return b.誤;
        底 = b.数;
      }
      if (t.数 <= 0 || 底 <= 0 || 底 === 1) return 誤('#NUM!');
      /* ★★自然対数の 比では ありません★★（2026-09-15 実測）
           `=LOG(2,3)` … 実Excel `0.63092975357145742`
             `ln2/ln3`   … `0.6309297535714575`  ←★1つ 上★
             `log2/log2` … `0.6309297535714575`  ←★同じく 違う★
             ★`log10(2)/log10(3)` … `0.6309297535714574`★ ＝★実Excel と 同じ double★
           ⇒★実Excel は ★常用対数の 比★で 出して います★
           ⇒★算数では どれも 同じ／機械の 中では 別★（HARMEAN と 同じ 型）
         ★★但し 実Excel 自身が 1つの 形では ありません★★
           `=LOG("101",2)` … 実Excel `6.6582114827517955`＝★自然対数の 比が 合う★
           ⇒★両方 合う 形は 作れない★／★16行 中 15行 合う 常用対数の 比を 採った★
           ⇒残り 1本は ★名指しで まだ★（GEOMEAN と 同じ 形の 話・棚㊲） */
      return 数(Math.log10(t.数) / Math.log10(底));
    },
    FACT: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        var n = 切り捨て(x);
        if (n < 0) return null;
        var r = 1;
        for (var i = 2; i <= n; i++) r *= i;
        return r;
      });
    },
    COMBIN: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (a, b) {
        var n = 切り捨て(a), k = 切り捨て(b);
        if (n < 0 || k < 0 || k > n) return null;
        var r = 1;
        for (var i = 1; i <= k; i++) r = r * (n - k + i) / i;
        return Math.round(r);
      });
    },

    /* ══ ★★真偽の 一族★★ ══（2026-09-15）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★実Excel に 聞いて 初めて 分かった 事★
         `=OR("あ",1)` → ★TRUE★（★数に 読めない 字は ★飛ばす★＝#VALUE! に しない★）
         `=OR("101",2)` → TRUE（数に 読める 字は 数に する）
         `=OR(A1:B5,2,FALSE)` → TRUE
       ★マスの 字・真偽・空は 飛ばす★（四角の 決めと 同じ）
       ★1つも 拾えなければ #VALUE!★ */
    OR: function (引数たち, 手) { return 真偽の一族(引数たち, 手, 'OR'); },
    XOR: function (引数たち, 手) { return 真偽の一族(引数たち, 手, 'XOR'); },
    AND: function (引数たち, 手) { return 真偽の一族(引数たち, 手, 'AND'); },
    NOT: function (引数たち, 手, 所) {
      if (引数たち.length !== 1) return 誤('#VALUE!');
      var 判 = 真偽にする(場.ひとつに(引数たち[0], 所 && 所.今のマス));
      if (判.誤) return 判.誤;
      return 計.真偽(!判.真);
    },

    /* ══ ★★A の 付く 一族★★ ══（2026-09-15）
       ★マスの 字と 真偽を 飛ばさない★＝`Aで数を拾う`（上） */
    AVERAGEA: function (引数たち, 手) {
      var 拾 = Aで数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      var a = 拾.数たち;
      if (!a.length) return 誤('#DIV/0!');
      var 和 = 0;
      for (var i = 0; i < a.length; i++) 和 += a[i];
      return 数(和 / a.length);
    },
    MAXA: function (引数たち, 手) {
      var 拾 = Aで数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      return 数(拾.数たち.length ? Math.max.apply(null, 拾.数たち) : 0);
    },
    MINA: function (引数たち, 手) {
      var 拾 = Aで数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      return 数(拾.数たち.length ? Math.min.apply(null, 拾.数たち) : 0);
    },
    VARA: function (引数たち, 手) { return A散らばりで(引数たち, 手, false, false); },
    VARPA: function (引数たち, 手) { return A散らばりで(引数たち, 手, true, false); },
    STDEVA: function (引数たち, 手) { return A散らばりで(引数たち, 手, false, true); },
    STDEVPA: function (引数たち, 手) { return A散らばりで(引数たち, 手, true, true); },

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
          出.push(並び[(r0 - 1 + i) * C + (c0 - 1 + j)] || 計.空);
      if (!番地) {
        /* ★番地が 無い＝式が 作った 表★（`{1;2;3}` や 直に 書いた 値）
           実測 `=INDEX("あ",1)` → あ ／ `=INDEX(0.5,1)` → 0.5
           ★まるごと 取った 時★（2026-09-15 に 測って 埋めた＝棚 ⑬④）
             `=INDEX({1;2;3},0)` → ★1★（先頭） ／ `=SUM(INDEX({1;2;3},0))` → ★6★（全部）
           ⇒★行・列を 0 に した 参照★＝★1つの 値が 要る 所では 先頭・関数へは まるごと★ */
        if (行数 === 1 && 列数 === 1) return 出[0];
        return 場.参照(0, 0, 行数, 列数, 出, true);   /* ★番地なし★（0 は A1 の 事なので 印で 持つ） */
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
