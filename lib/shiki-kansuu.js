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

  /** ★誤差関数★（★Abramowitz-Stegun 7.1.26 では 桁が 足りません★⇒級数と 連分数） */
  function 誤差関数(x) {
    if (x === 0) return 0;
    var 符 = x < 0 ? -1 : 1, a = Math.abs(x);
    if (a < 3) {
      /* ★級数★ erf(x) = 2/√π × Σ (-1)^n x^(2n+1) / (n!(2n+1)) */
      var 和 = 0, 項 = a;
      for (var n = 0; n < 200; n++) {
        和 += 項 / (2 * n + 1);
        項 *= -a * a / (n + 1);
        if (Math.abs(項) < 1e-300) break;
      }
      return 符 * 2 / Math.sqrt(Math.PI) * 和;
    }
    /* ★大きい 所は 連分数★ */
    var t = 0;
    for (var k = 60; k >= 1; k--) t = k / 2 / (a + t);
    var erfc = Math.exp(-a * a) / Math.sqrt(Math.PI) / (a + t);
    return 符 * (1 - erfc);
  }
  /** ★十進 → 他の 進数★（★負は 10桁の 補数★） */
  function 十進から(引数たち, 手, 所, 基) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 数の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    var n = 切り捨て(t.数);
    var 幅 = { 2: 512, 8: 536870912, 16: 549755813888 }[基];
    if (n < -幅 || n >= 幅) return 誤('#NUM!');
    var 字;
    if (n < 0) {
      var 桁 = { 2: 10, 8: 10, 16: 10 }[基];
      var 周 = Math.pow(基, 桁);
      字 = (周 + n).toString(基).toUpperCase();
    } else {
      字 = n.toString(基).toUpperCase();
    }
    if (引数たち.length > 1) {
      var d = 数の引数(引数たち[1], 手, 所);
      if (d.誤) return d.誤;
      var 桁数 = 切り捨て(d.数);
      if (桁数 < 0) return 誤('#NUM!');
      if (n >= 0) {
        if (桁数 && 字.length > 桁数) return 誤('#NUM!');
        while (桁数 && 字.length < 桁数) 字 = '0' + 字;
      }
    }
    return 計.字(字);
  }
  /** ★他の 進数 → 十進★（★10桁の 補数は 負★） */
  function 十進へ(引数たち, 手, 所, 基) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 字の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    var x = t.字.trim().toUpperCase();
    if (x === '') return 数(0);
    if (x.length > 10) return 誤('#NUM!');
    var 別 = { 2: /^[01]+$/, 8: /^[0-7]+$/, 16: /^[0-9A-F]+$/ }[基];
    if (!別.test(x)) return 誤('#NUM!');
    var n = parseInt(x, 基);
    var 周 = Math.pow(基, 10);
    if (x.length === 10 && n >= 周 / 2) n -= 周;
    return 数(n);
  }

  /* ══ ★複素数の 台★ ══（2026-09-16）
       ★字 → 数の 組★／★数の 組 → 字★ … ★ここだけ★（作る道を 2本に しない） */
  var 複素の形 = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)?([+-](?:\d+\.?\d*|\.\d+)?(?:[eE][-+]?\d+)?)?([ij])?$/;
  /** ★字を 複素数に する★ */
  function 字を複素に(t) {
    var x = String(t).trim();
    if (x === '') return { re: 0, im: 0, 印: 'i' };
    var m = 複素の形.exec(x);
    if (!m) return null;
    if (!m[3]) {
      var n = Number(x);
      if (!isFinite(n)) return null;
      return { re: n, im: 0, 印: 'i' };
    }
    var 印 = m[3];
    var re = 0, im = 0;
    if (m[2] !== undefined && m[2] !== '') {
      re = (m[1] === undefined || m[1] === '') ? 0 : Number(m[1]);
      im = (m[2] === '+' || m[2] === '-') ? Number(m[2] + '1') : Number(m[2]);
    } else if (m[1] !== undefined && m[1] !== '') {
      im = Number(m[1]);
    } else {
      im = 1;
    }
    if (!isFinite(re) || !isFinite(im)) return null;
    return { re: re, im: im, 印: 印 };
  }
  /** ★実 Excel と 同じく 15桁に 丸めて 字に する★ */
  function 十五桁の字(n) {
    if (!isFinite(n)) return null;
    if (n === 0) return '0';
    return String(Number(n.toPrecision(15))).replace('e', 'E');
  }
  /** ★数の 組を 字に する★（`0.5+i` の ように ★1 は 書きません★） */
  function 複素を字に(re, im, 印) {
    印 = 印 || 'i';
    var R = 十五桁の字(re), I = 十五桁の字(im);
    if (R === null || I === null) return null;
    if (Number(I) === 0) return R;
    var 虚 = (Math.abs(Number(I)) === 1) ? 印 : (I.replace(/^-/, '') + 印);
    var 符 = Number(I) < 0 ? '-' : '+';
    if (Number(R) === 0) return (符 === '-' ? '-' : '') + 虚;
    return R + 符 + 虚;
  }
  function 複素を割る(a, b) {
    var d = b.re * b.re + b.im * b.im;
    if (d === 0) return null;
    /* ★★割る 方が 無限なら 0★★（2026-09-16 実測）
         `=IMSECH(D1)`（D1＝45292）… `cosh(45292)` は ★無限★
         ⇒ 前は `Infinity/Infinity` で `NaN` ⇒ #NUM!／実Excel は ★0★
       ⇒★`NaN` は これで 3つ目★（TRUNC／PMT／ここ）＝★大きい 数の 無限は 型で 出る★ */
    if (!isFinite(d)) {
      if (isFinite(a.re) && isFinite(a.im)) return { re: 0, im: 0 };
      return null;
    }
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  }
  function 複素の対数(z) {
    var r = Math.sqrt(z.re * z.re + z.im * z.im);
    if (r === 0) return null;
    return { re: Math.log(r), im: Math.atan2(z.im, z.re) };
  }
  function 複素の正接(z) {
    var c = { re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) };
    var s2 = { re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) };
    return 複素を割る(s2, c);
  }
  /** ★引数を 複素数に する★（数でも 字でも） */
  function 複素にする(引数, 手, 所) {
    var v = 場.ひとつに(引数, 所 && 所.今のマス);
    if (!v) return { 誤: 誤('#VALUE!') };
    if (v.型 === '誤') return { 誤: v };
    if (v.型 === '数') return { z: { re: v.値, im: 0 }, 印: 'i' };
    if (v.型 === '真偽') return { 誤: 誤('#VALUE!') };
    if (v.型 === '空') return { z: { re: 0, im: 0 }, 印: 'i' };
    var z = 字を複素に(v.値);
    if (!z) {
      /* ★★複素数の 形で なければ ★数として★ 読み直します★★（2026-09-16 実測）
           `=IMSUM("12:30")` … 実Excel ★0.520833333333333★（★時刻の 字を 数に した★）
           ⇒★前は #NUM! を 返して いました★（22本 赤）
           ⇒★他の 関数と 同じ 決め★＝★直に 書いた 字は 数に する★ */
      var n2 = 計.数にする(v, 手);
      if (n2 && n2.型 !== '誤') return { z: { re: n2.値, im: 0 }, 印: 'i' };
      return { 誤: 誤('#NUM!') };
    }
    return { z: { re: z.re, im: z.im }, 印: z.印 };
  }
  /** ★複素数を 1つ 取って ★数★を 返す★ */
  function 複素ひとつ(引数たち, 手, 所, 続き) {
    if (!引数たち.length) return 誤('#VALUE!');
    var z = 複素にする(引数たち[0], 手, 所);
    if (z.誤) return z.誤;
    return 続き(z.z);
  }
  /** ★複素数を 1つ 取って ★複素数★を 返す★ */
  function 複素で(引数たち, 手, 所, 続き) {
    if (!引数たち.length) return 誤('#VALUE!');
    var z = 複素にする(引数たち[0], 手, 所);
    if (z.誤) return z.誤;
    var 出 = 続き(z.z);
    if (!出) return 誤('#NUM!');
    var t = 複素を字に(出.re, 出.im, z.印);
    if (t === null) return 誤('#NUM!');
    return 計.字(t);
  }
  /** ★複素数を 2つ★ */
  function 複素ふたつ(引数たち, 手, 所, 続き) {
    if (引数たち.length < 2) return 誤('#VALUE!');
    var a = 複素にする(引数たち[0], 手, 所);
    if (a.誤) return a.誤;
    var b = 複素にする(引数たち[1], 手, 所);
    if (b.誤) return b.誤;
    var 出 = 続き(a.z, b.z);
    if (!出) return 誤('#NUM!');
    var t = 複素を字に(出.re, 出.im, a.印);
    if (t === null) return 誤('#NUM!');
    return 計.字(t);
  }
  /** ★IMSUM／IMPRODUCT★（★何個でも★） */
  function 複素を重ねる(引数たち, 手, 所, 種) {
    if (!引数たち.length) return 誤('#VALUE!');
    var 出 = 種 === 'SUM' ? { re: 0, im: 0 } : { re: 1, im: 0 };
    var 印 = 'i', 誤り = null;
    ほどく(引数たち, function (v) {
      if (誤り) return false;
      if (v.型 === '誤') { 誤り = v; return false; }
      if (v.型 === '空') return true;
      var z;
      if (v.型 === '数') z = { re: v.値, im: 0, 印: 'i' };
      else if (v.型 === '字') {
        z = 字を複素に(v.値);
        if (!z) {                                  /* ★複素数の 形で なければ 数として 読む★（上と 同じ 決め） */
          var n3 = 計.数にする(v, 手);
          if (n3 && n3.型 !== '誤') z = { re: n3.値, im: 0, 印: 'i' };
          else { 誤り = 誤('#NUM!'); return false; }
        }
      }
      else { 誤り = 誤('#VALUE!'); return false; }
      if (z.印 === 'j') 印 = 'j';
      if (種 === 'SUM') { 出 = { re: 出.re + z.re, im: 出.im + z.im }; }
      else { 出 = { re: 出.re * z.re - 出.im * z.im, im: 出.re * z.im + 出.im * z.re }; }
      return true;
    });
    if (誤り) return 誤り;
    var t = 複素を字に(出.re, 出.im, 印);
    if (t === null) return 誤('#NUM!');
    return 計.字(t);
  }

  /** ★通し番号から 年月日を 取り出す★（★書式の 台を 呼ぶ★） */
  function 日から(引数たち, 手, 所, 続き) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 数の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    if (t.数 < 0) return 誤('#NUM!');
    return 数(続き(書.数から日(t.数)));
  }
  /** ★2次元の 表を 平らに する★（行から） */
  function 平らに(A) {
    if (!A || !A.length) return null;
    var 出 = [];
    for (var r = 0; r < A.length; r++) for (var c = 0; c < A[r].length; c++) 出.push(A[r][c]);
    return 出;
  }

  /** ★指数分布★（累積か 密度か） */
  function 指数の分布(引数たち, 手, 所) {
    if (引数たち.length < 3) return 誤('#VALUE!');
    var x = 数の引数(引数たち[0], 手, 所);
    if (x.誤) return x.誤;
    var l = 数の引数(引数たち[1], 手, 所);
    if (l.誤) return l.誤;
    var 判 = 真偽にする(場.ひとつに(引数たち[2], 所 && 所.今のマス));
    if (判.誤) return 判.誤;
    if (x.数 < 0 || l.数 <= 0) return 誤('#NUM!');
    if (判.真) return 数(1 - Math.exp(-l.数 * x.数));
    return 数(l.数 * Math.exp(-l.数 * x.数));
  }
  /** ★ポアソン分布★ */
  function ポアソンの分布(引数たち, 手, 所) {
    if (引数たち.length < 3) return 誤('#VALUE!');
    var x = 数の引数(引数たち[0], 手, 所);
    if (x.誤) return x.誤;
    var m = 数の引数(引数たち[1], 手, 所);
    if (m.誤) return m.誤;
    var 判 = 真偽にする(場.ひとつに(引数たち[2], 所 && 所.今のマス));
    if (判.誤) return 判.誤;
    var k = 切り捨て(x.数);
    if (k < 0 || m.数 < 0) return 誤('#NUM!');
    if (!判.真) {
      return 数(Math.exp(-m.数 + k * Math.log(m.数) - ガンマの対数(k + 1)));
    }
    var 和 = 0;
    for (var i = 0; i <= k; i++) 和 += Math.exp(-m.数 + i * Math.log(m.数) - ガンマの対数(i + 1));
    return 数(和);
  }

  /** ★NETWORKDAYS.INTL／WORKDAY.INTL★
        ★休みの 型★ … 1＝土日（2 から 順に ずれる）／11〜17＝1日だけ
        ★字で 渡す 形★ … `0000011` の ように 7桁（月から）
        ★`日数か` true＝NETWORKDAYS.INTL／false＝WORKDAY.INTL★ */
  function 営業日の国(引数たち, 手, 所, 日数か) {
    if (引数たち.length < 2) return 誤('#VALUE!');
    var a = 数の引数(引数たち[0], 手, 所);
    if (a.誤) return a.誤;
    var b = 数の引数(引数たち[1], 手, 所);
    if (b.誤) return b.誤;
    /* ★休みの 型★（既定 1＝土日） */
    var 休型 = [0, 0, 0, 0, 0, 1, 1];      /* 月 火 水 木 金 土 日 */
    if (引数たち.length > 2) {
      var v = 場.ひとつに(引数たち[2], 所 && 所.今のマス);
      if (!v) return 誤('#VALUE!');
      if (v.型 === '誤') return v;
      if (v.型 === '字' && /^[01]{7}$/.test(String(v.値))) {
        休型 = String(v.値).split('').map(Number);
      } else {
        var n = 計.数にする(v, 手);
        if (n.型 === '誤') return 誤('#VALUE!');
        var k = 切り捨て(n.値);
        休型 = [0, 0, 0, 0, 0, 0, 0];
        if (k >= 1 && k <= 7) {
          /* 1＝土日／2＝日月／…（順に ずれる） */
          休型[(k + 4) % 7] = 1;
          休型[(k + 5) % 7] = 1;
        } else if (k >= 11 && k <= 17) {
          休型[(k - 11 + 6) % 7] = 1;   /* 11＝日曜だけ */
        } else return 誤('#NUM!');
      }
    }
    var 休 = 休みを拾う(引数たち, 3, 手);
    if (休.誤) return 休.誤;
    var 休みか = function (d) {
      var w = 書.数から日(d).w;          /* 0＝日曜 */
      return 休型[(w + 6) % 7] === 1 || 休.日.indexOf(d) >= 0;
    };
    if (日数か) {
      var 始 = 切り捨て(a.数), 終 = 切り捨て(b.数), 符 = 1;
      if (始 > 終) { var w2 = 始; 始 = 終; 終 = w2; 符 = -1; }
      var n2 = 0;
      for (var d2 = 始; d2 <= 終; d2++) if (!休みか(d2)) n2++;
      return 数(符 * n2);
    }
    var d3 = 切り捨て(a.数), 残 = 切り捨て(b.数);
    var 向 = 残 < 0 ? -1 : 1;
    残 = Math.abs(残);
    while (残 > 0) {
      d3 += 向;
      if (d3 < 0) return 誤('#NUM!');
      if (!休みか(d3)) 残--;
    }
    return 数(d3);
  }

  /** ★IPMT／PPMT★ … ★その 期の 利息／元金★
        ★利息 ＝ その 期の 始めの 残りに 利を 掛ける★ */
  function 期の内訳(引数たち, 手, 所, 利息か) {
    var g = 金の引数(引数たち, 手, 所, 4, 6);
    if (g.誤) return g.誤;
    var r = g.数[0], 期 = 切り捨て(g.数[1]), n = g.数[2], pv = g.数[3];
    var fv = g.数.length > 4 ? g.数[4] : 0;
    var 期首 = g.数.length > 5 && g.数[5] !== 0;
    if (期 < 1 || 期 > n) return 誤('#NUM!');
    var 返 = 表.PMT([{ 種: '直', 値: 数(r) }, { 種: '直', 値: 数(n) },
      { 種: '直', 値: 数(pv) }, { 種: '直', 値: 数(fv) },
      { 種: '直', 値: 数(期首 ? 1 : 0) }], 手, 所);
    if (返.型 === '誤') return 返;
    var pmt = 返.値;
    /* ★その 期の 始めの 残り★ ＝ 期-1 回 払った 後の 値 */
    var 残;
    if (r === 0) 残 = pv + pmt * (期 - 1);
    else {
      var k = Math.pow(1 + r, 期 - 1);
      残 = pv * k + pmt * (1 + (期首 ? r : 0)) * (k - 1) / r;
    }
    /* ★★期首払いの 利息は (1+r) で 割ります★★（2026-09-16 実測）
         `=IPMT(1,2,3,4,5,6)`（型 6＝期首）… 実Excel ★-1.3571428571428577★
         ＝期末の ★-2.714…★ の ちょうど 半分（1+r ＝ 2）
       ★1回目の 期首は 利息 0★（まだ 1日も 経って いない） */
    var 利 = (期 === 1 && 期首) ? 0 : (-残 * r) / (期首 ? (1 + r) : 1);
    return 利息か ? 数(利) : 数(pmt - 利);
  }
  /** ★不完全ガンマ（上側）★ … 連分数と 級数 */
  function 上のガンマ(a, x) {
    if (x <= 0) return 1;
    if (x < a + 1) {
      /* ★下側を 級数で 出して 1 から 引く★ */
      var 和 = 1 / a, 項 = 和, ap = a;
      for (var i = 0; i < 500; i++) {
        ap++;
        項 *= x / ap;
        和 += 項;
        if (Math.abs(項) < Math.abs(和) * 1e-16) break;
      }
      return 1 - 和 * Math.exp(-x + a * Math.log(x) - ガンマの対数(a));
    }
    var b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (var j = 1; j < 500; j++) {
      var an = -j * (j - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      var 差 = d * c;
      h *= 差;
      if (Math.abs(差 - 1) < 1e-16) break;
    }
    return h * Math.exp(-x + a * Math.log(x) - ガンマの対数(a));
  }
  /** ★χ² の 右側★ */
  function カイ二乗の右(引数たち, 手, 所) {
    var g = 金の引数(引数たち, 手, 所, 2, 2);
    if (g.誤) return g.誤;
    var x = g.数[0], v = 切り捨て(g.数[1]);
    if (v < 1 || x < 0) return 誤('#NUM!');
    return 数(上のガンマ(v / 2, x / 2));
  }
  /** ★t の 右側★ … 不完全ベータを 連分数で */
  function tの右(t, v) {
    if (t < 0) return 1 - tの右(-t, v);
    var x = v / (v + t * t);
    return ベータの下(v / 2, 0.5, x) / 2;
  }
  /** ★不完全ベータ（下側・規格化）★ */
  function ベータの下(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var 頭 = Math.exp(ガンマの対数(a + b) - ガンマの対数(a) - ガンマの対数(b)
      + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return 頭 * ベータ連分(a, b, x) / a;
    return 1 - 頭 * ベータ連分(b, a, 1 - x) / b;
  }
  function ベータ連分(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= 300; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      var 差 = d * c;
      h *= 差;
      if (Math.abs(差 - 1) < 1e-16) break;
    }
    return h;
  }

  /** ★値を 真偽と 見る★（FILTER の 印） */
  function 真と見る(v) {
    if (!v) return false;
    if (v.型 === '真偽') return !!v.値;
    if (v.型 === '数') return v.値 !== 0;
    return false;
  }

  /** ★位の 一族の 共通★（★負は #NUM!★）
        `大きいまま` true なら 48ビットを 超えても 数で 計算する（ずらし） */
  function 位で(引数たち, 手, 所, 続き, 大きいまま) {
    if (引数たち.length < 2) return 誤('#VALUE!');
    var a = 数の引数(引数たち[0], 手, 所);
    if (a.誤) return a.誤;
    var b = 数の引数(引数たち[1], 手, 所);
    if (b.誤) return b.誤;
    var x = 切り捨て(a.数), y = 切り捨て(b.数);
    if (x < 0) return 誤('#NUM!');
    if (!大きいまま && y < 0) return 誤('#NUM!');
    var 上 = Math.pow(2, 48);
    if (x >= 上) return 誤('#NUM!');
    var 出;
    if (大きいまま) 出 = 続き(x, y);
    else {
      /* ★JS の ビット演算は 32ビットまで★＝★上と 下に 分けて 計算する★ */
      var 下 = 0x100000000;
      var 出下 = 続き(x % 下, y % 下) >>> 0;
      var 出上 = 続き(Math.floor(x / 下), Math.floor(y / 下)) >>> 0;
      出 = 出上 * 下 + 出下;
    }
    if (!isFinite(出) || 出 < 0 || 出 >= 上) return 誤('#NUM!');
    return 数(出);
  }
  /** ★一番 多く 出る 数★（MODE／MODE.SNGL） */
  function 最頑張り(引数たち, 手) {
    /* ★★数に 読めない 字は ★飛ばします★★★（2026-09-16 実測）
         `=MODE.SNGL(A1:A5,"<3",B1:B5)` … 実Excel ★2★ ／前は ★#VALUE!★
         ＝`数を拾う` は ★直に 書いた 字を 数に する★ので `"<3"` で 転ぶ
         ⇒★MODE は その 字を 数えて いません★ */
    var 拾 = { 数たち: [], 誤: null };
    ほどく(引数たち, function (v, 元) {
      if (v.型 === '誤') { 拾.誤 = v; return false; }
      if (元 === 'マス') { if (v.型 === '数') 拾.数たち.push(v.値); return true; }
      if (v.型 === '数') { 拾.数たち.push(v.値); return true; }
      if (v.型 === '真偽') { 拾.数たち.push(v.値 ? 1 : 0); return true; }
      if (v.型 === '字') {
        var n = 計.数にする(v, 手);
        if (n.型 !== '誤') 拾.数たち.push(n.値);
        return true;                           /* ★数に 読めなければ 飛ばす★ */
      }
      return true;
    });
    if (拾.誤) return 拾.誤;
    /* ★★同じ 数だけ 出る 物が 在る 時は ★先に 出た 方★★★（2026-09-16 実測）
         `=MODE.SNGL(A1:A5,B1:B5,1)` … 実Excel ★1★ ／前は ★2★
         ＝1 も 2 も 2回ずつ／★1 の 方が 並びの 先に 在る★
         ★前の 書き方★は「★先に 最多に 届いた 方★」を 採って いた
           ＝2 は 6番目で 2回目／1 は 11番目で 2回目 ⇒ 2 を 採って いた
         ⇒★★数え終わってから ★一番 先に 出た 物★を 選ぶ★★ */
    var a = 拾.数たち, 数え = {}, 初め = {}, i;
    for (i = 0; i < a.length; i++) {
      var k = String(a[i]);
      数え[k] = (数え[k] || 0) + 1;
      if (初め[k] === undefined) 初め[k] = i;
    }
    var 最 = 0, 出 = null, 出の場所 = Infinity;
    for (i = 0; i < a.length; i++) {
      var k2 = String(a[i]);
      if (数え[k2] > 最 || (数え[k2] === 最 && 初め[k2] < 出の場所)) {
        最 = 数え[k2]; 出 = a[i]; 出の場所 = 初め[k2];
      }
    }
    if (最 < 2) return 誤('#N/A');
    return 数(出);
  }
  /** ★ガンマ関数の 対数★（Lanczos） */
  function ガンマの対数(x) {
    /* ★★整数の 所は ★きっちり 0★★★（2026-09-16 実測）
         `=GAMMALN(2)` … Lanczos だと ★-4.44e-16★ ／実Excel ★0★
         ＝`GAMMALN(n)` は `ln((n-1)!)`＝★整数なら 足し算で きっちり 出ます★
         ⇒★近い 形で 出した 端数を 出さない★ */
    if (x === Math.floor(x) && x >= 1 && x <= 170) {
      var 和 = 0;
      for (var k = 2; k < x; k++) 和 += Math.log(k);
      return 和;
    }
    var g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5;
    t -= (x + 0.5) * Math.log(t);
    var s2 = 1.000000000190015;
    for (var j = 0; j < 6; j++) s2 += g[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s2 / x);
  }

  /** ★PERCENTILE／QUARTILE の 共通★（`四分か` true なら 0〜4 を 0〜1 に） */
  function 分位(引数たち, 手, 所, 四分か) {
    if (引数たち.length < 2) return 誤('#VALUE!');
    var 拾 = 数を拾う([引数たち[0]], 手);
    if (拾.誤) return 拾.誤;
    var t = 数の引数(引数たち[1], 手, 所);
    if (t.誤) return t.誤;
    var a = 拾.数たち.slice().sort(function (x, y) { return x - y; });
    if (!a.length) return 誤('#NUM!');
    var p = 四分か ? (切り捨て(t.数) / 4) : t.数;
    if (四分か && (切り捨て(t.数) < 0 || 切り捨て(t.数) > 4)) return 誤('#NUM!');
    if (p < 0 || p > 1) return 誤('#NUM!');
    if (a.length === 1) return 数(a[0]);
    var i = p * (a.length - 1);
    var 下 = Math.floor(i), 余 = i - 下;
    if (下 + 1 >= a.length) return 数(a[a.length - 1]);
    return 数(a[下] + (a[下 + 1] - a[下]) * 余);
  }
  /** ★休みの 日付を 拾う★（NETWORKDAYS／WORKDAY の 3つ目以降） */
  function 休みを拾う(引数たち, 頭, 手) {
    if (引数たち.length <= 頭) return { 日: [] };
    var 拾 = 数を拾う(引数たち.slice(頭), 手);
    if (拾.誤) return { 誤: 拾.誤 };
    var 出 = [];
    for (var i = 0; i < 拾.数たち.length; i++) 出.push(切り捨て(拾.数たち[i]));
    return { 日: 出 };
  }

  /** ★年月日 → 通し番号★（★1900年の 穴を 含む★・`書.数から日()` の 逆）
        ★実Excel には 1900-02-29 という 無い 日が 在ります★（通し 60）
        ⇒★通し 61 未満は 1日 ずらす★ */
  function 日から通し(y, m, d) {
    var 通 = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
    if (通 < 61 && 通 > 0) 通 -= 1;
    return 通;
  }

  /** ★EDATE／EOMONTH★（`月末か` true＝その 月の 終わり） */
  function 月をずらす(引数たち, 手, 所, 月末か) {
    var g = 金の引数(引数たち, 手, 所, 2, 2);
    if (g.誤) return g.誤;
    if (g.数[0] < 0) return 誤('#NUM!');
    var o = 書.数から日(切り捨て(g.数[0]));
    var ず = 切り捨て(g.数[1]);
    var y = o.y, m = o.m + ず;
    y += Math.floor((m - 1) / 12);
    m = ((m - 1) % 12 + 12) % 12 + 1;
    var 末 = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var d = 月末か ? 末 : Math.min(o.d, 末);
    /* ★1899-12-30 を 0 と する 数え方に 戻す★（★1900年の 穴は 書式の 台が 持つ★） */
    var 通 = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
    if (通 < 61 && 通 > 0) 通 -= 1;                 /* ★1900-02-29 の 分★ */
    return 数(通);
  }

  /** ★IRR／XIRR の 共通＝★探して 近づける★★
        `日` が null なら 期ごと（IRR）／並びなら 日づけ（XIRR）
        ★実Excel と 同じ 桁までは 揃いません★（★探し方が 違えば 末桁が 変わる★）
        ⇒★★合わない 行は 名指しで 棚に 出します★★ */
  function 探して近づける(金たち, 日たち, 見当) {
    if (!金たち.length) return 誤('#NUM!');
    var 負 = false, 正 = false, i;
    for (i = 0; i < 金たち.length; i++) {
      if (金たち[i] < 0) 負 = true;
      else if (金たち[i] > 0) 正 = true;
    }
    if (!負 || !正) return 誤('#NUM!');
    var 頭 = 日たち ? 日たち[0] : 0;
    var 値 = function (r) {
      var 和 = 0;
      for (var k = 0; k < 金たち.length; k++) {
        var t = 日たち ? (日たち[k] - 頭) / 365 : k;
        和 += 金たち[k] / Math.pow(1 + r, t);
      }
      return 和;
    };
    var r0 = 見当;
    if (!(r0 > -1)) r0 = 0.1;
    for (i = 0; i < 100; i++) {
      var f0 = 値(r0);
      var 刻 = Math.max(1e-7, Math.abs(r0) * 1e-7);
      var f1 = 値(r0 + 刻);
      var 傾 = (f1 - f0) / 刻;
      if (!isFinite(傾) || 傾 === 0) break;
      var 次 = r0 - f0 / 傾;
      if (!isFinite(次)) break;
      if (次 <= -1) 次 = (r0 - 1) / 2;
      if (Math.abs(次 - r0) < 1e-12) { r0 = 次; break; }
      r0 = 次;
    }
    if (!isFinite(r0) || Math.abs(値(r0)) > 1e-6) return 誤('#NUM!');
    return 数(r0);
  }

  /** ★引数を 2次元の 表に する★（1マス・直は 1×1） */
  function 表にする(引数, 所) {
    if (!引数) return null;
    if (引数.種 === '四角') {
      var 行 = 引数.行数 || 0, 列 = 引数.列数 || 0, 並 = 引数.並び || [];
      var 出 = [];
      for (var r = 0; r < 行; r++) {
        var 段 = [];
        for (var c = 0; c < 列; c++) 段.push(並[r * 列 + c] || 計.空);
        出.push(段);
      }
      return 出;
    }
    var v = 場.ひとつに(引数, 所 && 所.今のマス);
    return [[v || 計.空]];
  }
  /** ★2次元の 表を 溢れの 形に する★（`shiki-afure.js` と 同じ 形） */
  function 溢れに(表) {
    return { 溢れ: true, 行数: 表.length, 列数: 表.length ? 表[0].length : 0, 並び: 表 };
  }
  /** ★VSTACK／HSTACK★（★足りない 所は `#N/A`★＝実Excel と 同じ） */
  function 積む(引数たち, 所, 横か) {
    if (!引数たち.length) return 誤('#VALUE!');
    var 表たち = [], i;
    for (i = 0; i < 引数たち.length; i++) {
      var A = 表にする(引数たち[i], 所);
      if (!A || !A.length) return 誤('#VALUE!');
      表たち.push(A);
    }
    var 出 = [];
    if (横か) {
      var 高 = 0;
      for (i = 0; i < 表たち.length; i++) 高 = Math.max(高, 表たち[i].length);
      for (var r = 0; r < 高; r++) {
        var 段 = [];
        for (i = 0; i < 表たち.length; i++) {
          var A2 = 表たち[i], 幅 = A2[0].length;
          for (var c = 0; c < 幅; c++) 段.push(r < A2.length ? A2[r][c] : 計.誤('#N/A'));
        }
        出.push(段);
      }
      return 溢れに(出);
    }
    var 幅2 = 0;
    for (i = 0; i < 表たち.length; i++) 幅2 = Math.max(幅2, 表たち[i][0].length);
    for (i = 0; i < 表たち.length; i++) {
      var A3 = 表たち[i];
      for (var r2 = 0; r2 < A3.length; r2++) {
        var 段2 = [];
        for (var c2 = 0; c2 < 幅2; c2++) 段2.push(c2 < A3[r2].length ? A3[r2][c2] : 計.誤('#N/A'));
        出.push(段2);
      }
    }
    return 溢れに(出);
  }

  /** ★階乗★（MULTINOMIAL の 部品） */
  function 階乗(n) {
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }
  /** ★`.PRECISE` の 丸め★ … ★刻みの 符号を 見ない★（負でも 上へ／下へ） */
  function きっちり丸め(引数たち, 手, 所, 上か) {
    if (!引数たち.length) return 誤('#VALUE!');
    var t = 数の引数(引数たち[0], 手, 所);
    if (t.誤) return t.誤;
    var k = 1;
    if (引数たち.length > 1) {
      var m = 数の引数(引数たち[1], 手, 所);
      if (m.誤) return m.誤;
      k = Math.abs(m.数);
    }
    if (k === 0) return 数(0);
    return 数((上か ? Math.ceil(t.数 / k) : Math.floor(t.数 / k)) * k);
  }
  /** ★歪み★（SKEW／SKEW.P） */
  function 歪み(引数たち, 手, 母集団か) {
    var 拾 = 数を拾う(引数たち, 手);
    if (拾.誤) return 拾.誤;
    var a = 拾.数たち, n = a.length, i;
    if (n < (母集団か ? 1 : 3)) return 誤('#DIV/0!');
    var 和 = 0;
    for (i = 0; i < n; i++) 和 += a[i];
    var 平 = 和 / n, 二 = 0, 三 = 0;
    for (i = 0; i < n; i++) {
      var d = a[i] - 平;
      二 += d * d;
      三 += d * d * d;
    }
    if (二 === 0) return 誤('#DIV/0!');
    if (母集団か) {
      var σp = Math.sqrt(二 / n);
      return 数((三 / n) / (σp * σp * σp));
    }
    var σ = Math.sqrt(二 / (n - 1));
    return 数(n / ((n - 1) * (n - 2)) * (三 / (σ * σ * σ)));
  }

  /** ★四角を 平らな 並びに する★（無ければ null） */
  function 四角の並び(引数) {
    if (!引数) return null;
    if (引数.種 === '四角') return { 並び: 引数.並び || [], 行数: 引数.行数 || 0, 列数: 引数.列数 || 0 };
    /* ★★1マスも 1マスの 四角として 受けます★★（2026-09-16 実測）
         `=SUMIF(D1,D2)` → 実Excel ★0★／前は ★#VALUE!★
         ＝★実Excel は 1マスを 範囲として 受けます★
         ⇒ SUMIFS MAXIFS MINIFS も 同じ（6本 まとめて 赤に なった） */
    if (引数.種 === 'マス') return { 並び: [引数.値], 行数: 1, 列数: 1 };
    return null;
  }
  /** ★COUNTIF／SUMIF／AVERAGEIF の 共通★
        `合計の場所` … null＝数えるだけ／番号＝その 引数を 足す（無ければ 探す 四角そのもの） */
  function 条件で選ぶ(引数たち, 手, 所, 少なくとも, 合計の場所) {
    if (引数たち.length < 少なくとも) return { 誤: 誤('#VALUE!') };
    var 探 = 四角の並び(引数たち[0]);
    if (!探) return { 誤: 誤('#VALUE!') };
    var 条 = 場.ひとつに(引数たち[1], 所 && 所.今のマス);
    if (!条) return { 誤: 誤('#VALUE!') };
    if (条.型 === '誤') return { 誤: 条 };
    var 足す = 探;
    if (合計の場所 !== null && 引数たち.length > 合計の場所) {
      var f = 四角の並び(引数たち[合計の場所]);
      if (f) 足す = f;
    }
    var 当たり = [], 値 = [];
    for (var i = 0; i < 探.並び.length; i++) {
      if (!当てはまるか(条, 探.並び[i])) continue;
      当たり.push(i);
      値.push(足す.並び[i]);
    }
    return { 当たり: 当たり, 値: 値 };
  }
  /** ★COUNTIFS／SUMIFS の 共通＝★条件を 重ねる（かつ）★
        `頭` … 0＝(範囲,条件)… ／1＝(足す範囲, 範囲,条件…) */
  function 条件を重ねる(引数たち, 手, 所, 頭) {
    if (引数たち.length < 頭 + 2 || (引数たち.length - 頭) % 2) return { 誤: 誤('#VALUE!') };
    var 印 = null;
    for (var i = 頭; i + 1 < 引数たち.length; i += 2) {
      var 範 = 四角の並び(引数たち[i]);
      if (!範) return { 誤: 誤('#VALUE!') };
      var 条 = 場.ひとつに(引数たち[i + 1], 所 && 所.今のマス);
      if (!条) return { 誤: 誤('#VALUE!') };
      if (条.型 === '誤') return { 誤: 条 };
      if (印 === null) { 印 = []; for (var k = 0; k < 範.並び.length; k++) 印.push(true); }
      if (範.並び.length !== 印.length) return { 誤: 誤('#VALUE!') };
      for (var j = 0; j < 範.並び.length; j++) {
        if (印[j] && !当てはまるか(条, 範.並び[j])) 印[j] = false;
      }
    }
    return { 印: 印 || [] };
  }
  /** ★SUMIFS／MAXIFS／MINIFS★（★最初の 引数が 足す 範囲★） */
  function 重ねて集める(引数たち, 手, 所, 種) {
    var 足す = 四角の並び(引数たち[0]);
    if (!足す) return 誤('#VALUE!');
    var g = 条件を重ねる(引数たち, 手, 所, 1);
    if (g.誤) return g.誤;
    var 数たち = [];
    for (var i = 0; i < g.印.length; i++) {
      if (!g.印[i]) continue;
      var v = 足す.並び[i];
      if (v && v.型 === '数') 数たち.push(v.値);
    }
    if (種 === 'SUM') {
      var 和 = 0;
      for (var j = 0; j < 数たち.length; j++) 和 += 数たち[j];
      return 数(和);
    }
    if (!数たち.length) return 数(0);          /* ★MAXIFS／MINIFS は 0件で 0★ */
    return 数(種 === 'MAX' ? Math.max.apply(null, 数たち) : Math.min.apply(null, 数たち));
  }
  /** ★LARGE／SMALL★ */
  function 大小のk番(引数たち, 手, 所, 大きい方) {
    if (引数たち.length < 2) return 誤('#VALUE!');
    var 拾 = 数を拾う([引数たち[0]], 手);
    if (拾.誤) return 拾.誤;
    var t = 数の引数(引数たち[1], 手, 所);
    if (t.誤) return t.誤;
    var k = 切り捨て(t.数);
    var a = 拾.数たち.slice().sort(function (x, y) { return 大きい方 ? y - x : x - y; });
    if (k < 1 || k > a.length) return 誤('#NUM!');
    return 数(a[k - 1]);
  }
  /** ★VLOOKUP／HLOOKUP★（★既定は 近い 方（TRUE）★） */
  function 縦横で探す(引数たち, 手, 所, 縦か) {
    if (引数たち.length < 3) return 誤('#VALUE!');
    var 今 = 所 && 所.今のマス;
    var 探 = 場.ひとつに(引数たち[0], 今);
    if (!探) return 誤('#VALUE!');
    if (探.型 === '誤') return 探;
    var 表 = 四角の並び(引数たち[1]);
    if (!表) return 誤('#VALUE!');
    var t = 数の引数(引数たち[2], 手, 所);
    if (t.誤) return t.誤;
    var 番 = 切り捨て(t.数);
    var 近い = true;
    if (引数たち.length > 3) {
      var 判 = 真偽にする(場.ひとつに(引数たち[3], 今));
      if (判.誤) return 判.誤;
      近い = 判.真;
    }
    var 長 = 縦か ? 表.行数 : 表.列数;
    var 幅 = 縦か ? 表.列数 : 表.行数;
    if (番 < 1 || 番 > 幅) return 誤('#REF!');
    var 取る = function (i) { return 縦か ? 表.並び[i * 表.列数] : 表.並び[i]; };
    var 当 = -1;
    for (var i = 0; i < 長; i++) {
      var v = 取る(i);
      var d = 場.比べる(v, 探);
      if (d === 0) { 当 = i; break; }
      if (近い && d !== null && d < 0) 当 = i;      /* ★以下で 一番 後ろ★ */
    }
    if (当 < 0) return 誤('#N/A');
    var 出 = 縦か ? 表.並び[当 * 表.列数 + (番 - 1)] : 表.並び[(番 - 1) * 表.列数 + 当];
    return 出 || 計.空;
  }

  /** ★お金の 一族の 引数★ … ★暗黙の 交わり → 数★を 決まった 本数 取る
        （`少なくとも` 本 未満／`多くとも` 本 超過は #VALUE!） */
  function 金の引数(引数たち, 手, 所, 少なくとも, 多くとも) {
    if (引数たち.length < 少なくとも || 引数たち.length > 多くとも) return { 誤: 誤('#VALUE!') };
    var 出 = [];
    for (var i = 0; i < 引数たち.length; i++) {
      var t = 数の引数(引数たち[i], 手, 所);
      if (t.誤) return { 誤: t.誤 };
      出.push(t.数);
    }
    return { 数: 出 };
  }

  /** ★IS… の 共通★
        ★★IS… は ★どれも★ 誤りを 素通りさせません★★（2026-09-15 実測）
          ＝★誤りを「誤りとして」判じます★
          `=ISBLANK(A1:B5)` → ★FALSE★（★#VALUE! を 返すのでは ない★）
          `=ISNONTEXT(A1:B5)` → ★TRUE★ ／ `=ISERR(A1:B5)` → ★TRUE★
          ★2次元の 四角は 暗黙の 交わりが 出来ず 誤りに なる★＝その 誤りを 見る
        ⇒★他の 関数の「誤りは 素通り」とは ★逆の 決め★★ */
  function 見分け(引数たち, 所, 続き) {
    if (!引数たち.length) return 誤('#VALUE!');
    var v = 場.ひとつに(引数たち[0], 所 && 所.今のマス) || 計.誤('#VALUE!');
    return 計.真偽(続き(v));
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

    /* ══ ★★行列と 分布と お金の 続き★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv` */
    MMULT: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var A = 表にする(引数たち[0], 所), B = 表にする(引数たち[1], 所);
      if (!A || !B || !A.length || !B.length) return 誤('#VALUE!');
      if (A[0].length !== B.length) return 誤('#VALUE!');
      var 出 = [];
      for (var r = 0; r < A.length; r++) {
        var 段 = [];
        for (var c = 0; c < B[0].length; c++) {
          var 和 = 0;
          for (var k = 0; k < B.length; k++) {
            var x = A[r][k], y = B[k][c];
            if (!x || x.型 !== '数' || !y || y.型 !== '数') return 誤('#VALUE!');
            和 += x.値 * y.値;
          }
          段.push(数(和));
        }
        出.push(段);
      }
      return 溢れに(出);
    },
    /* ★指数分布★ */
    EXPONDIST: function (引数たち, 手, 所) { return 指数の分布(引数たち, 手, 所); },
    'EXPON.DIST': function (引数たち, 手, 所) { return 指数の分布(引数たち, 手, 所); },
    /* ★ポアソン分布★ */
    POISSON: function (引数たち, 手, 所) { return ポアソンの分布(引数たち, 手, 所); },
    'POISSON.DIST': function (引数たち, 手, 所) { return ポアソンの分布(引数たち, 手, 所); },
    /* ★χ²の 左側★ */
    'CHISQ.DIST': function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      var x = 数の引数(引数たち[0], 手, 所);
      if (x.誤) return x.誤;
      var v = 数の引数(引数たち[1], 手, 所);
      if (v.誤) return v.誤;
      var 判 = 真偽にする(場.ひとつに(引数たち[2], 所 && 所.今のマス));
      if (判.誤) return 判.誤;
      var k = 切り捨て(v.数);
      if (x.数 < 0 || k < 1) return 誤('#NUM!');
      if (判.真) return 数(1 - 上のガンマ(k / 2, x.数 / 2));
      return 数(Math.exp((k / 2 - 1) * Math.log(x.数) - x.数 / 2
        - (k / 2) * Math.LN2 - ガンマの対数(k / 2)));
    },
    /* ★t の 左側★ */
    'T.DIST': function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      var t = 数の引数(引数たち[0], 手, 所);
      if (t.誤) return t.誤;
      var v = 数の引数(引数たち[1], 手, 所);
      if (v.誤) return v.誤;
      var 判 = 真偽にする(場.ひとつに(引数たち[2], 所 && 所.今のマス));
      if (判.誤) return 判.誤;
      var k2 = 切り捨て(v.数);
      if (k2 < 1) return 誤('#NUM!');
      if (判.真) return 数(1 - tの右(t.数, k2));
      return 数(Math.exp(ガンマの対数((k2 + 1) / 2) - ガンマの対数(k2 / 2))
        / Math.sqrt(k2 * Math.PI) * Math.pow(1 + t.数 * t.数 / k2, -(k2 + 1) / 2));
    },
    /* ★分数の 値段★ */
    DOLLARDE: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (a, b) {
        var 分 = 切り捨て(b);
        if (分 < 0) return null;
        if (分 === 0) return null;
        if (分 === 1) return a;
        var 桁 = Math.ceil(Math.log(分) / Math.LN10);
        var 整 = 切り捨て(a);
        var 端 = (a - 整) * Math.pow(10, 桁);
        return 整 + 端 / 分;
      });
    },
    DOLLARFR: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (a, b) {
        var 分 = 切り捨て(b);
        if (分 < 0) return null;
        if (分 === 0) return null;
        if (分 === 1) return a;
        var 桁 = Math.ceil(Math.log(分) / Math.LN10);
        var 整 = 切り捨て(a);
        var 端 = (a - 整) * 分;
        return 整 + 端 / Math.pow(10, 桁);
      });
    },
    FVSCHEDULE: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var 拾 = 数を拾う([引数たち[1]], 手);
      if (拾.誤) return 拾.誤;
      var 出 = a.数;
      for (var i = 0; i < 拾.数たち.length; i++) 出 *= (1 + 拾.数たち[i]);
      return 数(出);
    },

    /* ══ ★★残りの 営業日と 枚数★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv` */
    'NETWORKDAYS.INTL': function (引数たち, 手, 所) { return 営業日の国(引数たち, 手, 所, true); },
    'WORKDAY.INTL': function (引数たち, 手, 所) { return 営業日の国(引数たち, 手, 所, false); },
    /* ★SHEET／SHEETS★ … ★この 台は 板を 1枚と 見ます★ */
    SHEET: function (引数たち) { return 数(1); },
    SHEETS: function (引数たち) { return 数(1); },

    /* ══ ★★利息と 分布の 続き★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv` */
    IPMT: function (引数たち, 手, 所) { return 期の内訳(引数たち, 手, 所, true); },
    PPMT: function (引数たち, 手, 所) { return 期の内訳(引数たち, 手, 所, false); },
    /* ★RRI★ … ★何倍に なったかから 利を 逆算★ */
    RRI: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 3, 3);
      if (g.誤) return g.誤;
      var n = g.数[0], pv = g.数[1], fv = g.数[2];
      if (n <= 0 || pv === 0) return 誤('#NUM!');
      return 数(Math.pow(fv / pv, 1 / n) - 1);
    },
    COMBINA: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (a, b) {
        var n = 切り捨て(a), k = 切り捨て(b);
        if (n < 0 || k < 0) return null;
        if (n === 0 && k > 0) return null;
        /* ★重複を 許す 選び方★ ＝ C(n+k-1, k) */
        var m = n + k - 1, r = 1;
        for (var i = 1; i <= k; i++) r = r * (m - k + i) / i;
        return Math.round(r);
      });
    },
    GAMMA: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        if (x === Math.floor(x) && x <= 0) return null;     /* ★負の 整数は 無い★ */
        if (x > 0) return Math.exp(ガンマの対数(x));
        /* ★反射の 式★ Γ(x)Γ(1-x) = π/sin(πx) */
        return Math.PI / (Math.sin(Math.PI * x) * Math.exp(ガンマの対数(1 - x)));
      });
    },
    /* ★χ²と t の 右側★ */
    CHIDIST: function (引数たち, 手, 所) { return カイ二乗の右(引数たち, 手, 所); },
    'CHISQ.DIST.RT': function (引数たち, 手, 所) { return カイ二乗の右(引数たち, 手, 所); },
    'T.DIST.RT': function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 2, 2);
      if (g.誤) return g.誤;
      var t = g.数[0], v = 切り捨て(g.数[1]);
      if (v < 1) return 誤('#NUM!');
      return 数(tの右(t, v));
    },
    'T.DIST.2T': function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 2, 2);
      if (g.誤) return g.誤;
      var t = g.数[0], v = 切り捨て(g.数[1]);
      if (v < 1 || t < 0) return 誤('#NUM!');
      return 数(2 * tの右(t, v));
    },

    /* ══ ★★ふるいと 並べ替えと 探し★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv` ほか
       ★実測★ `=FILTER(A1:A5,2)` → ★1★（★残った 先頭★）
             `=SORT(A1:A5,1,-1)` → ★5★ */
    FILTER: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var A = 表にする(引数たち[0], 所);
      if (!A || !A.length) return 誤('#VALUE!');
      var 印 = 表にする(引数たち[1], 所);
      if (!印 || !印.length) return 誤('#VALUE!');
      /* ★印は 縦に 並ぶ（行を 選ぶ）か 横に 並ぶ（列を 選ぶ）★ */
      var 縦か = 印.length > 1 || A.length === 1;
      var 出 = [];
      if (縦か) {
        for (var r = 0; r < A.length; r++) {
          var v = (印[Math.min(r, 印.length - 1)] || [])[0];
          if (真と見る(v)) 出.push(A[r].slice());
        }
      } else {
        var 段 = [];
        for (var c = 0; c < A[0].length; c++) {
          var w = (印[0] || [])[Math.min(c, (印[0] || []).length - 1)];
          if (真と見る(w)) 段.push(c);
        }
        for (var r2 = 0; r2 < A.length; r2++) {
          var 行 = [];
          for (var i = 0; i < 段.length; i++) 行.push(A[r2][段[i]]);
          出.push(行);
        }
        if (!段.length) 出 = [];
      }
      if (!出.length || !出[0].length) {
        if (引数たち.length > 2) return 場.ひとつに(引数たち[2], 所 && 所.今のマス) || 計.空;
        return 誤('#CALC!');
      }
      return 溢れに(出);
    },
    SORT: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var A = 表にする(引数たち[0], 所);
      if (!A || !A.length) return 誤('#VALUE!');
      var 鍵 = 1, 向 = 1;
      if (引数たち.length > 1) {
        var k = 数の引数(引数たち[1], 手, 所);
        if (k.誤) return k.誤;
        鍵 = 切り捨て(k.数);
      }
      if (引数たち.length > 2) {
        var d = 数の引数(引数たち[2], 手, 所);
        if (d.誤) return d.誤;
        向 = d.数 < 0 ? -1 : 1;
      }
      if (鍵 < 1 || 鍵 > A[0].length) return 誤('#VALUE!');
      var 並 = A.slice().sort(function (x, y) {
        var d2 = 場.比べる(x[鍵 - 1], y[鍵 - 1]);
        return (d2 === null || d2 === undefined ? 0 : d2) * 向;
      });
      return 溢れに(並);
    },
    UNIQUE: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var A = 表にする(引数たち[0], 所);
      if (!A || !A.length) return 誤('#VALUE!');
      var 見た = {}, 出 = [];
      for (var r = 0; r < A.length; r++) {
        var 鍵 = A[r].map(function (v) { return v ? (v.型 + ':' + v.値) : ''; }).join('\u0001');
        if (見た[鍵]) continue;
        見た[鍵] = true;
        出.push(A[r].slice());
      }
      return 溢れに(出);
    },
    /* ★XLOOKUP★ … ★見つからなければ 3つ目（無ければ #N/A）★ */
    XLOOKUP: function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      var 今 = 所 && 所.今のマス;
      var 探 = 場.ひとつに(引数たち[0], 今);
      if (!探) return 誤('#VALUE!');
      if (探.型 === '誤') return 探;
      /* ★★直に 書いた 数も 1つの 並びと して 受けます★★（2026-09-16 実測）
           `=XLOOKUP(2,3,4,5)` … 実Excel ★5★（2 は 3 の 中に 無い ⇒ 4つ目）
           ⇒★前は 四角しか 受けず ★#VALUE!★（8本 赤）★ */
      var 探す場 = 平らに(表にする(引数たち[1], 所));
      var 戻る場 = 平らに(表にする(引数たち[2], 所));
      if (!探す場 || !戻る場) return 誤('#VALUE!');
      for (var i = 0; i < 探す場.length; i++) {
        if (場.比べる(探す場[i], 探) === 0) {
          return 戻る場[Math.min(i, 戻る場.length - 1)] || 計.空;
        }
      }
      if (引数たち.length > 3) return 場.ひとつに(引数たち[3], 今) || 計.空;
      return 誤('#N/A');
    },
    /* ★HYPERLINK★ … ★見せる 字を 返すだけ★（2つ目が 無ければ 1つ目） */
    HYPERLINK: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var i = 引数たち.length > 1 ? 1 : 0;
      var v = 場.ひとつに(引数たち[i], 所 && 所.今のマス);
      if (!v) return 誤('#VALUE!');
      if (v.型 === '誤') return v;
      return v;
    },

    /* ══ ★★位と 進数と 分布★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★実測★ `=BASE(2,3,4)` → ★0002★（桁を 揃える）
             `=BITAND(D1,D2)` → ★45252★ */
    VALUE: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var v = 場.ひとつに(引数たち[0], 所 && 所.今のマス);
      if (!v) return 誤('#VALUE!');
      if (v.型 === '誤') return v;
      var n = 計.数にする(v, 手);
      if (n.型 === '誤') return 誤('#VALUE!');
      return 数(n.値);
    },
    /* ★BASE／DECIMAL★ … ★何進数でも★（2〜36） */
    BASE: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      var n = 切り捨て(a.数), 基 = 切り捨て(b.数);
      if (n < 0 || 基 < 2 || 基 > 36) return 誤('#NUM!');
      var 字 = n.toString(基).toUpperCase();
      if (引数たち.length > 2) {
        var d = 数の引数(引数たち[2], 手, 所);
        if (d.誤) return d.誤;
        var 桁 = 切り捨て(d.数);
        if (桁 < 0) return 誤('#NUM!');
        while (字.length < 桁) 字 = '0' + 字;
      }
      return 計.字(字);
    },
    DECIMAL: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var t = 字の引数(引数たち[0], 手, 所);
      if (t.誤) return t.誤;
      var b = 数の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      var 基数 = 切り捨て(b.数);
      if (基数 < 2 || 基数 > 36) return 誤('#NUM!');
      var x = t.字.trim().toUpperCase();
      if (x === '') return 数(0);
      var n = parseInt(x, 基数);
      if (!isFinite(n)) return 誤('#NUM!');
      return 数(n);
    },
    /* ★位の 一族★ … ★負と 2^48 以上は #NUM!★ */
    BITAND: function (引数たち, 手, 所) {
      return 位で(引数たち, 手, 所, function (a, b) { return a & b; });
    },
    BITOR: function (引数たち, 手, 所) {
      return 位で(引数たち, 手, 所, function (a, b) { return a | b; });
    },
    BITXOR: function (引数たち, 手, 所) {
      return 位で(引数たち, 手, 所, function (a, b) { return a ^ b; });
    },
    BITLSHIFT: function (引数たち, 手, 所) {
      return 位で(引数たち, 手, 所, function (a, b) { return b >= 0 ? a * Math.pow(2, b) : Math.floor(a / Math.pow(2, -b)); }, true);
    },
    BITRSHIFT: function (引数たち, 手, 所) {
      return 位で(引数たち, 手, 所, function (a, b) { return b >= 0 ? Math.floor(a / Math.pow(2, b)) : a * Math.pow(2, -b); }, true);
    },
    /* ★最頑張り★ */
    MODE: function (引数たち, 手) { return 最頑張り(引数たち, 手); },
    'MODE.SNGL': function (引数たち, 手) { return 最頑張り(引数たち, 手); },
    /* ★ガンマ関数の 対数★ … Lanczos */
    GAMMALN: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x <= 0 ? null : ガンマの対数(x); });
    },
    'GAMMALN.PRECISE': function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x <= 0 ? null : ガンマの対数(x); });
    },
    'NORM.S.DIST': function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var 判 = 真偽にする(場.ひとつに(引数たち[1], 所 && 所.今のマス));
      if (判.誤) return 判.誤;
      if (判.真) return 数((1 + 誤差関数(a.数 / Math.SQRT2)) / 2);
      return 数(Math.exp(-a.数 * a.数 / 2) / Math.sqrt(2 * Math.PI));
    },
    /* ★YEARFRAC★ … 型 0＝30/360（既定）／1＝実日数／2＝act/360／3＝act/365／4＝欧 */
    YEARFRAC: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      var 型 = 0;
      if (引数たち.length > 2) {
        var k = 数の引数(引数たち[2], 手, 所);
        if (k.誤) return k.誤;
        型 = 切り捨て(k.数);
      }
      if (型 < 0 || 型 > 4) return 誤('#NUM!');
      var 始 = 切り捨て(a.数), 終 = 切り捨て(b.数);
      if (始 > 終) { var w = 始; 始 = 終; 終 = w; }
      if (型 === 0 || 型 === 4) {
        var A = 書.数から日(始), B = 書.数から日(終);
        var d1 = A.d, d2 = B.d;
        if (型 === 4) { if (d1 > 30) d1 = 30; if (d2 > 30) d2 = 30; }
        else { if (d1 === 31) d1 = 30; if (d2 === 31) d2 = (d1 === 30 ? 30 : 31); }
        return 数(((B.y - A.y) * 360 + (B.m - A.m) * 30 + (d2 - d1)) / 360);
      }
      if (型 === 2) return 数((終 - 始) / 360);
      if (型 === 3) return 数((終 - 始) / 365);
      /* 型 1 … ★平均の 1年の 日数で 割る★ */
      var Y1 = 書.数から日(始).y, Y2 = 書.数から日(終).y;
      var 年数 = Y2 - Y1 + 1;
      var 日数 = 日から通し(Y2 + 1, 1, 1) - 日から通し(Y1, 1, 1);
      return 数((終 - 始) / (日数 / 年数));
    },

    /* ══ ★★参照・分位・営業日★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv` ほか
       ★実測★ `=ISREF(A1)` → TRUE ／ `=ISREF(A1&"")` → ★FALSE★
             （★引数が ★指した 場所★ か ★計算した 値★ かを 見ます★） */
    ISREF: function (引数たち) {
      if (!引数たち.length) return 誤('#VALUE!');
      var a = 引数たち[0];
      /* ★★値では なく ★どこから 来たか★ を 見ます★★
           ★この 台は 引数に 「種」を 付けて います★（土台の 決め）
           ⇒★`マス` と `四角` だけが 指した 場所★ */
      return 計.真偽(a.種 === 'マス' || a.種 === '四角');
    },
    /* ★PERCENTILE／QUARTILE★ … ★並べて 間を 埋める★ */
    PERCENTILE: function (引数たち, 手, 所) { return 分位(引数たち, 手, 所, false); },
    'PERCENTILE.INC': function (引数たち, 手, 所) { return 分位(引数たち, 手, 所, false); },
    QUARTILE: function (引数たち, 手, 所) { return 分位(引数たち, 手, 所, true); },
    'QUARTILE.INC': function (引数たち, 手, 所) { return 分位(引数たち, 手, 所, true); },
    /* ★NETWORKDAYS／WORKDAY★ … ★土日を 抜く★（休みの 一覧も 受ける） */
    NETWORKDAYS: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      var 休 = 休みを拾う(引数たち, 2, 手);
      if (休.誤) return 休.誤;
      var 始 = 切り捨て(a.数), 終 = 切り捨て(b.数);
      var 符 = 1;
      if (始 > 終) { var w = 始; 始 = 終; 終 = w; 符 = -1; }
      var n = 0;
      for (var d = 始; d <= 終; d++) {
        var 曜 = 書.数から日(d).w;
        if (曜 === 0 || 曜 === 6) continue;
        if (休.日.indexOf(d) >= 0) continue;
        n++;
      }
      return 数(符 * n);
    },
    WORKDAY: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      var 休 = 休みを拾う(引数たち, 2, 手);
      if (休.誤) return 休.誤;
      var d = 切り捨て(a.数), 残 = 切り捨て(b.数);
      var 向 = 残 < 0 ? -1 : 1;
      残 = Math.abs(残);
      while (残 > 0) {
        d += 向;
        if (d < 0) return 誤('#NUM!');
        var 曜 = 書.数から日(d).w;
        if (曜 === 0 || 曜 === 6) continue;
        if (休.日.indexOf(d) >= 0) continue;
        残--;
      }
      return 数(d);
    },
    /* ★DATEDIF★ … "D" 日／"M" 月／"Y" 年 */
    DATEDIF: function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      var t = 字の引数(引数たち[2], 手, 所);
      if (t.誤) return t.誤;
      var 始 = 切り捨て(a.数), 終 = 切り捨て(b.数);
      if (終 < 始) return 誤('#NUM!');
      var A = 書.数から日(始), B = 書.数から日(終);
      var 種 = t.字.toUpperCase();
      if (種 === 'D') return 数(終 - 始);
      var 月 = (B.y - A.y) * 12 + (B.m - A.m);
      if (B.d < A.d) 月--;
      if (種 === 'M') return 数(月);
      if (種 === 'Y') return 数(Math.floor(月 / 12));
      if (種 === 'MD') return 数(B.d >= A.d ? B.d - A.d : 終 - 日から通し(B.y, B.m - 1, A.d));
      if (種 === 'YM') return 数(月 % 12);
      if (種 === 'YD') return 数(終 - 日から通し(A.y + Math.floor(月 / 12), A.m, A.d));
      return 誤('#NUM!');
    },

    /* ══ ★★番地と 週と ローマ数字★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★実測★ `=ADDRESS(2,3)` → ★$C$2★ ／ `=ADDRESS(2,3,4)` → ★C2★
             `=ADDRESS(1,2,3,4,5)` → ★'5'!$B1★（★板の 名は 引用符で 囲む★） */
    ADDRESS: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var r = 数の引数(引数たち[0], 手, 所);
      if (r.誤) return r.誤;
      var c = 数の引数(引数たち[1], 手, 所);
      if (c.誤) return c.誤;
      var 行 = 切り捨て(r.数), 列 = 切り捨て(c.数);
      if (行 < 1 || 列 < 1) return 誤('#VALUE!');
      var 型 = 1;
      if (引数たち.length > 2) {
        var t = 数の引数(引数たち[2], 手, 所);
        if (t.誤) return t.誤;
        型 = 切り捨て(t.数);
        if (型 < 1 || 型 > 4) return 誤('#VALUE!');
      }
      /* ★4つ目（A1 か R1C1 か）は 読むだけ★＝実測では 答えが 変わりません */
      if (引数たち.length > 3) {
        var y = 真偽にする(場.ひとつに(引数たち[3], 所 && 所.今のマス));
        if (y.誤) return y.誤;
      }
      var 字 = '', x = 列;
      while (x > 0) { var z = (x - 1) % 26; 字 = String.fromCharCode(65 + z) + 字; x = Math.floor((x - 1) / 26); }
      var 列錠 = (型 === 1 || 型 === 3) ? '$' : '';
      var 行錠 = (型 === 1 || 型 === 2) ? '$' : '';
      var 番 = 列錠 + 字 + 行錠 + 行;
      if (引数たち.length > 4) {
        var n = 字の引数(引数たち[4], 手, 所);
        if (n.誤) return n.誤;
        if (n.字 !== '') return 計.字("'" + n.字 + "'!" + 番);
      }
      return 計.字(番);
    },
    /* ★ISOWEEKNUM★ … ★月曜始まり／木曜を 含む 週が 第1週★ */
    ISOWEEKNUM: function (引数たち, 手, 所) {
      var t = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length) return 誤('#VALUE!');
      if (t.誤) return t.誤;
      if (t.数 < 0) return 誤('#NUM!');
      /* ★★全部 通し番号で 数えます★★（2026-09-16 実測で 直した）
           ★前は 実の 暦（`Date.UTC`）と 通し番号を 混ぜて いました★
           ⇒`=ISOWEEKNUM(1)`（＝1900-01-01）… うち ★1★ ／実Excel ★52★
             ＝★実Excel の 1900-01-01 は ★日曜★★（実の 暦では 月曜）
             ＝★実Excel の 曜日を 使わないと 合いません★ */
      var 通 = 切り捨て(t.数);
      var 曜 = (書.数から日(通).w + 6) % 7;                /* 0＝月曜（★書式の 台の 曜日★） */
      var 木 = 通 + (3 - 曜);
      var 年 = 書.数から日(木).y;
      var 頂 = 日から通し(年, 1, 4);
      var 頂曜 = (書.数から日(頂).w + 6) % 7;
      var 頂木 = 頂 + (3 - 頂曜);
      return 数(Math.round((木 - 頂木) / 7) + 1);
    },
    /* ★WEEKNUM★ … ┅1月 1日を 含む 週が 第1週★（型 1＝日曜始まり／2＝月曜） */
    WEEKNUM: function (引数たち, 手, 所) {
      var t = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length) return 誤('#VALUE!');
      if (t.誤) return t.誤;
      if (t.数 < 0) return 誤('#NUM!');
      var 型 = 1;
      if (引数たち.length > 1) {
        var k = 数の引数(引数たち[1], 手, 所);
        if (k.誤) return k.誤;
        型 = 切り捨て(k.数);
      }
      if (型 === 21) return 表.ISOWEEKNUM([引数たち[0]], 手, 所);
      var 頂の曜 = { 1: 0, 2: 1, 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6, 17: 0 }[型];
      if (頂の曜 === undefined) return 誤('#NUM!');
      /* ★★通し 0 は 0★★（実測 `=WEEKNUM(0.5)` → ★0★）
           ＝★1900年 1月 0日＝年に 入って いない★ */
      var 通2 = 切り捨て(t.数);
      if (通2 === 0) return 数(0);
      /* ★ここも 全部 通し番号で★（ISOWEEKNUM と 同じ 訳） */
      var y = 書.数から日(通2).y;
      var 元日 = 日から通し(y, 1, 1);
      var 元日の曜 = 書.数から日(元日).w;
      var ずれ = (元日の曜 - 頂の曜 + 7) % 7;
      return 数(Math.floor((通2 - 元日 + ずれ) / 7) + 1);
    },
    /* ★ROMAN／ARABIC★ */
    ROMAN: function (引数たち, 手, 所) {
      var t = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length) return 誤('#VALUE!');
      if (t.誤) return t.誤;
      var n = 切り捨て(t.数);
      if (n < 0 || n > 3999) return 誤('#VALUE!');
      if (n === 0) return 計.字('');
      var 表の = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
        [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
      var 出 = '';
      for (var i = 0; i < 表の.length; i++) {
        while (n >= 表の[i][0]) { 出 += 表の[i][1]; n -= 表の[i][0]; }
      }
      return 計.字(出);
    },
    ARABIC: function (引数たち, 手, 所) {
      var t = 字の引数(引数たち[0], 手, 所);
      if (!引数たち.length) return 誤('#VALUE!');
      if (t.誤) return t.誤;
      var x = t.字.trim().toUpperCase();
      var 符 = 1;
      if (x[0] === '-') { 符 = -1; x = x.slice(1); }
      if (x === '') return 数(0);
      if (!/^[MDCLXVI]+$/.test(x)) return 誤('#VALUE!');
      var 値 = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
      var 出 = 0;
      for (var i = 0; i < x.length; i++) {
        var v = 値[x[i]], w = 値[x[i + 1]] || 0;
        出 += (v < w) ? -v : v;
      }
      return 数(符 * 出);
    },

    /* ══ ★★技術の 一族（進数・誤差関数・残りの 三角）★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★実測★ `=DEC2HEX(-2)` → ★FFFFFFFFFE★（★10桁の 補数★）
             `=DEC2HEX(2,3)` → ★002★（桁を 揃える） */
    MOD: function (引数たち, 手, 所) {
      return 数ふたつ(引数たち, 手, 所, function (a, b) {
        if (b === 0) return null;
        /* ★余りの 符号は ★割る 方★に 合わせる★（JS の % とは 違う） */
        return a - Math.floor(a / b) * b;
      });
    },
    DELTA: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = { 数: 0 };
      if (引数たち.length > 1) { b = 数の引数(引数たち[1], 手, 所); if (b.誤) return b.誤; }
      return 数(a.数 === b.数 ? 1 : 0);
    },
    GESTEP: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = { 数: 0 };
      if (引数たち.length > 1) { b = 数の引数(引数たち[1], 手, 所); if (b.誤) return b.誤; }
      return 数(a.数 >= b.数 ? 1 : 0);
    },
    ACOT: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return Math.PI / 2 - Math.atan(x); });
    },
    ACOTH: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        return Math.abs(x) <= 1 ? null : Math.atanh(1 / x);
      });
    },
    COTH: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x === 0 ? null : 1 / Math.tanh(x); });
    },
    SECH: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return 1 / Math.cosh(x); });
    },
    CSCH: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x === 0 ? null : 1 / Math.sinh(x); });
    },
    SQRTPI: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return x < 0 ? null : Math.sqrt(x * Math.PI); });
    },
    FISHER: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        return (x <= -1 || x >= 1) ? null : Math.log((1 + x) / (1 - x)) / 2;
      });
    },
    FISHERINV: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        /* ★★`e` が 無限に なると `NaN`★★（2026-09-16 実測）
             `=FISHERINV("2024-01-15")`（45306）… `exp(90612)` は ★無限★
             ⇒ `(Inf-1)/(Inf+1)` ⇒ ★`NaN`★／実Excel ★1★
           ★出口の 門が `#NUM!` に して 止めました★が ★正しい 答えは 極限の 1★
           ⇒★門は「悪い 物を 外に 出さない」だけ／★正しい 答えは 自分で 書く★★ */
        var e = Math.exp(2 * x);
        if (!isFinite(e)) return x > 0 ? 1 : -1;
        return (e - 1) / (e + 1);
      });
    },
    /* ★誤差関数★ … ★級数と 連分数で 出します★ */
    ERF: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      if (引数たち.length > 1) {
        var b = 数の引数(引数たち[1], 手, 所);
        if (b.誤) return b.誤;
        return 数(誤差関数(b.数) - 誤差関数(a.数));
      }
      return 数(誤差関数(a.数));
    },
    ERFC: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return 1 - 誤差関数(x); });
    },
    'ERF.PRECISE': function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, 誤差関数);
    },
    'ERFC.PRECISE': function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) { return 1 - 誤差関数(x); });
    },
    /* ★正規分布★ */
    PHI: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
      });
    },
    GAUSS: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        return 誤差関数(x / Math.SQRT2) / 2;
      });
    },
    NORMSDIST: function (引数たち, 手, 所) {
      return 数ひとつ(引数たち, 手, 所, function (x) {
        return (1 + 誤差関数(x / Math.SQRT2)) / 2;
      });
    },
    /* ★進数★ … ★負は 10桁の 補数★（実測 `=DEC2HEX(-2)` → FFFFFFFFFE） */
    DEC2HEX: function (引数たち, 手, 所) { return 十進から(引数たち, 手, 所, 16); },
    DEC2BIN: function (引数たち, 手, 所) { return 十進から(引数たち, 手, 所, 2); },
    DEC2OCT: function (引数たち, 手, 所) { return 十進から(引数たち, 手, 所, 8); },
    HEX2DEC: function (引数たち, 手, 所) { return 十進へ(引数たち, 手, 所, 16); },
    BIN2DEC: function (引数たち, 手, 所) { return 十進へ(引数たち, 手, 所, 2); },
    OCT2DEC: function (引数たち, 手, 所) { return 十進へ(引数たち, 手, 所, 8); },

    /* ══ ★★複素数（IM系）の 一族★★ ══（2026-09-16）
       ★★ここは 借り物を 継いで いた 所です★★
         `lib/formula-complex-plug.js` は `getFunctionPlugin` で
         ★借り物の 計算を そのまま 継ぎ、出た 字を 15桁に 丸めるだけ★でした（棚㎉）
         ⇒★★中身が 1行も 自前では ない★★＝ここを 書くのが 借り物外し
       ★物差し★ `golden-346-2026-09-08.tsv`（実 Excel）
       ★出す 字の 決め★ … ★実 Excel は 15桁に 丸めて 字に します★ */
    COMPLEX: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      var 印 = 'i';
      if (引数たち.length > 2) {
        var t = 字の引数(引数たち[2], 手, 所);
        if (t.誤) return t.誤;
        印 = t.字;
        if (印 !== 'i' && 印 !== 'j') return 誤('#VALUE!');
      }
      return 計.字(複素を字に(a.数, b.数, 印));
    },
    IMREAL: function (引数たち, 手, 所) { return 複素ひとつ(引数たち, 手, 所, function (z) { return 数(z.re); }); },
    IMAGINARY: function (引数たち, 手, 所) { return 複素ひとつ(引数たち, 手, 所, function (z) { return 数(z.im); }); },
    IMABS: function (引数たち, 手, 所) {
      return 複素ひとつ(引数たち, 手, 所, function (z) { return 数(Math.sqrt(z.re * z.re + z.im * z.im)); });
    },
    IMARGUMENT: function (引数たち, 手, 所) {
      return 複素ひとつ(引数たち, 手, 所, function (z) {
        if (z.re === 0 && z.im === 0) return 誤('#DIV/0!');
        return 数(Math.atan2(z.im, z.re));
      });
    },
    IMCONJUGATE: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) { return { re: z.re, im: -z.im }; });
    },
    IMEXP: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        var e = Math.exp(z.re);
        return { re: e * Math.cos(z.im), im: e * Math.sin(z.im) };
      });
    },
    IMLN: function (引数たち, 手, 所) { return 複素で(引数たち, 手, 所, 複素の対数); },
    IMLOG10: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        var L = 複素の対数(z);
        return L ? 複素を割る(L, { re: Math.LN10, im: 0 }) : null;
      });
    },
    IMLOG2: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        var L = 複素の対数(z);
        return L ? 複素を割る(L, { re: Math.LN2, im: 0 }) : null;
      });
    },
    IMSQRT: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        var r = Math.sqrt(Math.sqrt(z.re * z.re + z.im * z.im));
        var w = Math.atan2(z.im, z.re) / 2;
        return { re: r * Math.cos(w), im: r * Math.sin(w) };
      });
    },
    IMSIN: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        return { re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) };
      });
    },
    IMCOS: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        return { re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) };
      });
    },
    IMSINH: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        return { re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) };
      });
    },
    IMCOSH: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        return { re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) };
      });
    },
    IMTAN: function (引数たち, 手, 所) { return 複素で(引数たち, 手, 所, 複素の正接); },
    IMCOT: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        var t = 複素の正接(z);
        return t ? 複素を割る({ re: 1, im: 0 }, t) : null;
      });
    },
    IMSEC: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        return 複素を割る({ re: 1, im: 0 }, { re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) });
      });
    },
    IMCSC: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        return 複素を割る({ re: 1, im: 0 }, { re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) });
      });
    },
    IMSECH: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        return 複素を割る({ re: 1, im: 0 }, { re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) });
      });
    },
    IMCSCH: function (引数たち, 手, 所) {
      return 複素で(引数たち, 手, 所, function (z) {
        return 複素を割る({ re: 1, im: 0 }, { re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) });
      });
    },
    IMSUM: function (引数たち, 手, 所) { return 複素を重ねる(引数たち, 手, 所, 'SUM'); },
    IMPRODUCT: function (引数たち, 手, 所) { return 複素を重ねる(引数たち, 手, 所, 'PROD'); },
    IMSUB: function (引数たち, 手, 所) {
      return 複素ふたつ(引数たち, 手, 所, function (a, b) { return { re: a.re - b.re, im: a.im - b.im }; });
    },
    IMDIV: function (引数たち, 手, 所) { return 複素ふたつ(引数たち, 手, 所, 複素を割る); },
    IMPOWER: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var z = 複素にする(引数たち[0], 手, 所);
      if (z.誤) return z.誤;
      var n = 数の引数(引数たち[1], 手, 所);
      if (n.誤) return n.誤;
      var r = Math.sqrt(z.z.re * z.z.re + z.z.im * z.z.im);
      if (r === 0) return 計.字(複素を字に(0, 0, z.印));
      var w = Math.atan2(z.z.im, z.z.re);
      var R = Math.pow(r, n.数), W = w * n.数;
      return 計.字(複素を字に(R * Math.cos(W), R * Math.sin(W), z.印));
    },

    /* ══ ★★日付の 一族★★ ══（2026-09-16）
       ★通し番号 → 年月日は ★書式の 台★を 呼びます★（`書.数から日()`）
         ＝★1900年の 起点が 2つ 在る 話も そこに 在ります★（★作る道を 2本に しない★）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★実測★ `=DAY(0.5)` → ★0★（通し 0＝1900年1月0日）／`=DAY(TRUE)` → 1 */
    DAY: function (引数たち, 手, 所) { return 日から(引数たち, 手, 所, function (o) { return o.d; }); },
    MONTH: function (引数たち, 手, 所) { return 日から(引数たち, 手, 所, function (o) { return o.m; }); },
    YEAR: function (引数たち, 手, 所) { return 日から(引数たち, 手, 所, function (o) { return o.y; }); },
    HOUR: function (引数たち, 手, 所) { return 日から(引数たち, 手, 所, function (o) { return o.h; }); },
    MINUTE: function (引数たち, 手, 所) { return 日から(引数たち, 手, 所, function (o) { return o.mi; }); },
    SECOND: function (引数たち, 手, 所) { return 日から(引数たち, 手, 所, function (o) { return o.s; }); },
    /* ★WEEKDAY★ … 型 1（既定）＝日曜 1／型 2＝月曜 1／型 3＝月曜 0 */
    WEEKDAY: function (引数たち, 手, 所) {
      var t = 数の引数(引数たち[0], 手, 所);
      if (!引数たち.length || t.誤) return t.誤 || 誤('#VALUE!');
      if (t.数 < 0) return 誤('#NUM!');
      var 型 = 1;
      if (引数たち.length > 1) {
        var k = 数の引数(引数たち[1], 手, 所);
        if (k.誤) return k.誤;
        型 = 切り捨て(k.数);
      }
      var w = 書.数から日(切り捨て(t.数)).w;          /* 0＝日曜 */
      if (型 === 1 || 型 === 17) return 数(w + 1);
      if (型 === 2 || 型 === 11) return 数((w + 6) % 7 + 1);
      if (型 === 3) return 数((w + 6) % 7);
      if (型 >= 12 && 型 <= 16) return 数((w - (型 - 10) + 7) % 7 + 1);
      return 誤('#NUM!');
    },
    DAYS: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 2, 2);
      if (g.誤) return g.誤;
      return 数(切り捨て(g.数[0]) - 切り捨て(g.数[1]));
    },
    /* ★DAYS360★ … ★1年を 360日（1か月 30日）と 見る★／型 true＝ヨーロッパ式 */
    DAYS360: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var a = 数の引数(引数たち[0], 手, 所);
      if (a.誤) return a.誤;
      var b = 数の引数(引数たち[1], 手, 所);
      if (b.誤) return b.誤;
      var 欧 = false;
      if (引数たち.length > 2) {
        var 判 = 真偽にする(場.ひとつに(引数たち[2], 所 && 所.今のマス));
        if (判.誤) return 判.誤;
        欧 = 判.真;
      }
      var A = 書.数から日(切り捨て(a.数)), B = 書.数から日(切り捨て(b.数));
      var d1 = A.d, d2 = B.d;
      if (欧) { if (d1 > 30) d1 = 30; if (d2 > 30) d2 = 30; }
      else {
        if (d1 === 31) d1 = 30;
        if (d2 === 31) d2 = (d1 === 30 ? 30 : 1);
        if (d2 === 1 && B.d === 31) { B = { y: B.y, m: B.m + 1, d: 1 }; }
      }
      return 数((B.y - A.y) * 360 + (B.m - A.m) * 30 + (d2 - d1));
    },
    EDATE: function (引数たち, 手, 所) { return 月をずらす(引数たち, 手, 所, false); },
    EOMONTH: function (引数たち, 手, 所) { return 月をずらす(引数たち, 手, 所, true); },
    TIME: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 3, 3);
      if (g.誤) return g.誤;
      var h = 切り捨て(g.数[0]), m = 切り捨て(g.数[1]), s2 = 切り捨て(g.数[2]);
      if (h < 0 || m < 0 || s2 < 0) return 誤('#NUM!');
      var 秒 = ((h * 3600 + m * 60 + s2) % 86400 + 86400) % 86400;
      return 数(秒 / 86400);
    },

    /* ══ ★★お金の 流れの 一族★★ ══（2026-09-16）
       ★物差し★ `golden-okane-4kansuu-2026-09-09.tsv`
       ★NPV／XNPV／MIRR は 式が 1本★＝★答えが 決まります★
       ★IRR／XIRR は ★探して 近づける★★＝★始めの 見当で 末桁が 変わります★
         （実測 … `=IRR(A1:A3)` と `=IRR(A1:A3,0)` で ★11桁目から 違う★） */
    NPV: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var r = 数の引数(引数たち[0], 手, 所);
      if (r.誤) return r.誤;
      var 拾 = 数を拾う(引数たち.slice(1), 手);
      if (拾.誤) return 拾.誤;
      var 和 = 0;
      for (var i = 0; i < 拾.数たち.length; i++) 和 += 拾.数たち[i] / Math.pow(1 + r.数, i + 1);
      return 数(和);
    },
    XNPV: function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      var r = 数の引数(引数たち[0], 手, 所);
      if (r.誤) return r.誤;
      var 金 = 数を拾う([引数たち[1]], 手);
      if (金.誤) return 金.誤;
      var 日 = 数を拾う([引数たち[2]], 手);
      if (日.誤) return 日.誤;
      if (!金.数たち.length || 金.数たち.length !== 日.数たち.length) return 誤('#NUM!');
      /* ★★利率が 0以下は #NUM!★★（2026-09-16 実測・6本）
           `=XNPV(0,…)` `=XNPV(-0.001,…)` `=XNPV(-0.99,…)` … 実Excel ★どれも #NUM!★
           ⇒★計算は 出来る（0 でも 割れる）が 実Excel は 断ります★ */
      if (!(r.数 > 0)) return 誤('#NUM!');
      var 頭 = 日.数たち[0], 和 = 0;
      /* ★★1つ目の 日より 前が 在れば #NUM!★★（2026-09-16 実測）
           `=XNPV(0.1,R1:R3,S1:S3)` … 実Excel ★#NUM!★／前は 数を 返して いた
           ＝★実Excel は 1つ目を 一番 早い 日と 決めて います★ */
      for (var z = 1; z < 日.数たち.length; z++) if (日.数たち[z] < 頭) return 誤('#NUM!');
      for (var i = 0; i < 金.数たち.length; i++) {
        和 += 金.数たち[i] / Math.pow(1 + r.数, (日.数たち[i] - 頭) / 365);
      }
      return 数(和);
    },
    MIRR: function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      var 拾 = 数を拾う([引数たち[0]], 手);
      if (拾.誤) return 拾.誤;
      var f = 数の引数(引数たち[1], 手, 所);
      if (f.誤) return f.誤;
      var g = 数の引数(引数たち[2], 手, 所);
      if (g.誤) return g.誤;
      var a = 拾.数たち, n = a.length, i;
      if (n < 2) return 誤('#DIV/0!');
      var 出 = 0, 入 = 0, 何か負 = false, 何か正 = false;
      for (i = 0; i < n; i++) {
        if (a[i] < 0) { 何か負 = true; 出 += a[i] / Math.pow(1 + f.数, i); }
        else if (a[i] > 0) { 何か正 = true; 入 += a[i] * Math.pow(1 + g.数, n - 1 - i); }
      }
      /* ★★入りが 無ければ -1★★（2026-09-16 実測）
           `=MIRR(E1:E3,0.1,0.12)`（-100,-200,-300）… 実Excel ★-1★
           ＝入りの 終わり値が 0 ⇒ 0の (n-1)乗根 − 1 ＝ -1
         ★出が 無ければ 割れない＝#DIV/0!★
         ★再び 投げる 利が -1 なら 1+g が 0★＝#DIV/0!（実測 `=MIRR(A1:A3,0.1,-1)`） */
      if (!何か負) return 誤('#DIV/0!');
      if (1 + g.数 === 0) return 誤('#DIV/0!');
      if (!何か正) return 数(-1);
      /* ★★式を 1つ 余分に 掛けて いました★★（2026-09-16 実測）
           `=MIRR(A1:A3,0.1,0.12)`（-1000, 600, 700）
             前 ★0.0648400337706414★ ／実Excel ★0.17132403714770583★
           ★正しい 形★ … 入りを 終わりへ 運び／出を 頭へ 戻し／その 比の (n-1)乗根 − 1
             ＝ (600×1.12 ＋ 700) ÷ 1000 の 平方根 − 1 ＝ ★0.17132…★
           ⇒★`(1+f)^(n-1)` を 掛けるのは ★二重★でした★（出は もう 頭へ 戻して ある） */
      return 数(Math.pow(入 / -出, 1 / (n - 1)) - 1);
    },
    IRR: function (引数たち, 手, 所) {
      var 拾 = 数を拾う([引数たち[0]], 手);
      if (!引数たち.length || 拾.誤) return 拾.誤 || 誤('#VALUE!');
      var 見当 = 0.1;
      if (引数たち.length > 1) {
        var t = 数の引数(引数たち[1], 手, 所);
        if (t.誤) return t.誤;
        見当 = t.数;
      }
      return 探して近づける(拾.数たち, null, 見当);
    },
    XIRR: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var 金 = 数を拾う([引数たち[0]], 手);
      if (金.誤) return 金.誤;
      var 日 = 数を拾う([引数たち[1]], 手);
      if (日.誤) return 日.誤;
      if (金.数たち.length !== 日.数たち.length) return 誤('#NUM!');
      var 見当 = 0.1;
      if (引数たち.length > 2) {
        var t = 数の引数(引数たち[2], 手, 所);
        if (t.誤) return t.誤;
        見当 = t.数;
      }
      return 探して近づける(金.数たち, 日.数たち, 見当);
    },

    /* ══ ★★表を 返す 一族★★ ══（2026-09-16）
       ★返す 形★ … `{ 溢れ: true, 行数, 列数, 並び }`（★`shiki-afure.js` と 同じ 形★）
       ★並びは 2次元★（行の 並びの 並び）
       ★物差し★ `golden-346-2026-09-08.tsv`（★紙は 左上の 1マスだけ 焼いて います★）
       ★実測★ `=HSTACK("あ","い")` → ★あ★（＝左上）／`=TRANSPOSE(A1:A5)` → 1 */
    VSTACK: function (引数たち, 手, 所) { return 積む(引数たち, 所, false); },
    HSTACK: function (引数たち, 手, 所) { return 積む(引数たち, 所, true); },
    TRANSPOSE: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var A = 表にする(引数たち[0], 所);
      if (!A) return 誤('#VALUE!');
      if (!A.length || !A[0].length) return 誤('#VALUE!');
      var 出 = [];
      for (var c = 0; c < A[0].length; c++) {
        var 段 = [];
        for (var r = 0; r < A.length; r++) 段.push(A[r][c]);
        出.push(段);
      }
      return 溢れに(出);
    },
    SEQUENCE: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var 取 = function (i, 既定) {
        if (引数たち.length <= i) return { 数: 既定 };
        return 数の引数(引数たち[i], 手, 所);
      };
      var r = 取(0, 1); if (r.誤) return r.誤;
      var c = 取(1, 1); if (c.誤) return c.誤;
      var s0 = 取(2, 1); if (s0.誤) return s0.誤;
      var d = 取(3, 1); if (d.誤) return d.誤;
      var 行 = 切り捨て(r.数), 列 = 切り捨て(c.数);
      if (行 < 1 || 列 < 1) return 誤('#VALUE!');
      if (行 * 列 > 1048576) return 誤('#NUM!');
      var 出 = [], v = s0.数;
      for (var i = 0; i < 行; i++) {
        var 段 = [];
        for (var j = 0; j < 列; j++) { 段.push(数(v)); v += d.数; }
        出.push(段);
      }
      return 溢れに(出);
    },
    TEXTJOIN: function (引数たち, 手, 所) {
      if (引数たち.length < 3) return 誤('#VALUE!');
      /* ★★区切りは ★使う 時だけ★ 見ます★★（2026-09-16 実測）
           `=TEXTJOIN(A1:B5,2,FALSE)` … 実Excel ★FALSE★／前は ★#VALUE!★
           ＝区切り `A1:B5` は 2次元で 暗黙の 交わりが 出来ない ⇒ 誤り
           ⇒★でも 繋ぐ 物が 1つなら 区切りは ★1回も 使いません★★
           ⇒★★使わない 物の 誤りで 全体を 誤りに しない★★ */
      /* ★★区切りは ★並び★でも 受けます★★（2026-09-16 実測）
           `=TEXTJOIN(A1:A5,1,B1:B5,1)` … 実Excel ★214263841051★
             ＝2[1]4[2]6[3]8[4]10[5]1 ＝★A1:A5 を 順に 使い回して います★
           ⇒★1つの 字だと 思って いたら ★214161811011★（A1 だけ 使う）★
           ⇒★★知らなければ 一生 気づかない 形★★＝★紙 40行が 出しました★ */
      var 区たち = [];
      var 区の元 = 引数たち[0];
      if (区の元 && 区の元.種 === '四角') {
        for (var z = 0; z < (区の元.並び || []).length; z++) {
          var zv = 区の元.並び[z];
          if (!zv || zv.型 === '空') { 区たち.push(''); continue; }
          var zt = 計.字にする(zv);
          区たち.push(zt.型 === '誤' ? null : String(zt.値));
        }
      }
      var 区 = 字の引数(引数たち[0], 手, 所);
      var 判 = 真偽にする(場.ひとつに(引数たち[1], 所 && 所.今のマス));
      if (判.誤) return 判.誤;
      var 空を飛ばす = 判.真;
      var 並び = [], 誤り = null;
      ほどく(引数たち.slice(2), function (v) {
        if (v.型 === '誤') { 誤り = v; return false; }
        if (v.型 === '空') { if (!空を飛ばす) 並び.push(''); return true; }
        var t = 計.字にする(v);
        if (t.型 === '誤') { 誤り = t; return false; }
        並び.push(String(t.値));
        return true;
      });
      if (誤り) return 誤り;
      if (並び.length < 2) return 計.字(並び.length ? 並び[0] : '');
      if (区たち.length > 1) {
        var 出 = 並び[0];
        for (var w = 1; w < 並び.length; w++) {
          var d = 区たち[(w - 1) % 区たち.length];
          if (d === null) return 誤('#VALUE!');
          出 += d + 並び[w];
        }
        return 計.字(出);
      }
      if (区.誤) return 区.誤;                 /* ★2つ 以上 繋ぐ 時だけ 区切りが 要る★ */
      return 計.字(並び.join(区.字));
    },
    CONCAT: function (引数たち, 手) {
      var 出 = '', 誤り = null;
      ほどく(引数たち, function (v) {
        if (v.型 === '誤') { 誤り = v; return false; }
        if (v.型 === '空') return true;
        var t = 計.字にする(v);
        if (t.型 === '誤') { 誤り = t; return false; }
        出 += String(t.値);
        return true;
      });
      if (誤り) return 誤り;
      return 計.字(出);
    },

    /* ══ ★★丸めの 続きと 散らばりの 続き★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★`.PRECISE` と `ISO.CEILING` は ★刻みの 符号を 見ない★★（負でも 上へ）
       ★実測★ `=CEILING.PRECISE(-2)` → ★-2★／`=FLOOR.PRECISE(0.5)` → 0 */
    'CEILING.PRECISE': function (引数たち, 手, 所) { return きっちり丸め(引数たち, 手, 所, true); },
    'ISO.CEILING': function (引数たち, 手, 所) { return きっちり丸め(引数たち, 手, 所, true); },
    'FLOOR.PRECISE': function (引数たち, 手, 所) { return きっちり丸め(引数たち, 手, 所, false); },

    /* ★MULTINOMIAL★ … 全部 足した 階乗 ÷ それぞれの 階乗 */
    MULTINOMIAL: function (引数たち, 手) {
      var 拾 = 数を拾う(引数たち, 手);
      if (拾.誤) return 拾.誤;
      var a = 拾.数たち, 和 = 0, i;
      for (i = 0; i < a.length; i++) {
        var n = 切り捨て(a[i]);
        if (n < 0) return 誤('#NUM!');
        和 += n;
      }
      /* ★★階乗を 作ってから 割ると 桁が 落ちます★★（2026-09-16 実測）
           `=MULTINOMIAL(A1:B5)` … 割り算を 重ねる ★6.845116392948286e+35★
                                    実Excel      ★6.8451163929481654E+35★（★12桁目から 違う★）
         ⇒★二項係数を 掛けて 行く★＝★大きな 数を 作らずに 済む★
           multinomial(a,b,c…) ＝ C(a+b, b) × C(a+b+c, c) × … */
      var 出 = 1, 積み = 0;
      for (i = 0; i < a.length; i++) {
        var m = 切り捨て(a[i]);
        積み += m;
        for (var j = 1; j <= m; j++) 出 = 出 * (積み - m + j) / j;
      }
      if (!isFinite(出)) return 誤('#NUM!');
      return 数(出);
    },

    /* ★SKEW／SKEW.P★ … 歪み（★.P は 母集団★） */
    SKEW: function (引数たち, 手) { return 歪み(引数たち, 手, false); },
    'SKEW.P': function (引数たち, 手) { return 歪み(引数たち, 手, true); },

    /* ══ ★★条件つきの 一族★★ ══（2026-09-16）
       ★条件の 見方は D系と 同じ 台★＝`当てはまるか()`（★作る道を 2本に しない★）
       ★物差し★ `golden-346-2026-09-08.tsv` ほか
       ★実測★ `=COUNTIF(A1:A5,"<3")` → 2 ／ `=AVERAGEIF(A1:A5,"<3",B1:B5)` → ★3★
               `=COUNTIF(A1:A5,B1:B5)` → 1（★条件も 暗黙の 交わり★） */
    COUNTIF: function (引数たち, 手, 所) {
      var g = 条件で選ぶ(引数たち, 手, 所, 2, null);
      if (g.誤) return g.誤;
      return 数(g.当たり.length);
    },
    SUMIF: function (引数たち, 手, 所) {
      var g = 条件で選ぶ(引数たち, 手, 所, 2, 2);
      if (g.誤) return g.誤;
      var 和 = 0;
      for (var i = 0; i < g.値.length; i++) if (g.値[i] && g.値[i].型 === '数') 和 += g.値[i].値;
      return 数(和);
    },
    AVERAGEIF: function (引数たち, 手, 所) {
      var g = 条件で選ぶ(引数たち, 手, 所, 2, 2);
      if (g.誤) return g.誤;
      var 和 = 0, n = 0;
      for (var i = 0; i < g.値.length; i++) if (g.値[i] && g.値[i].型 === '数') { 和 += g.値[i].値; n++; }
      if (!n) return 誤('#DIV/0!');
      return 数(和 / n);
    },
    COUNTIFS: function (引数たち, 手, 所) {
      var g = 条件を重ねる(引数たち, 手, 所, 0);
      if (g.誤) return g.誤;
      return 数(g.印.filter(Boolean).length);
    },
    SUMIFS: function (引数たち, 手, 所) { return 重ねて集める(引数たち, 手, 所, 'SUM'); },
    MAXIFS: function (引数たち, 手, 所) { return 重ねて集める(引数たち, 手, 所, 'MAX'); },
    MINIFS: function (引数たち, 手, 所) { return 重ねて集める(引数たち, 手, 所, 'MIN'); },

    /* ★LARGE／SMALL★ … ★大きい／小さい 方から k番目★ */
    LARGE: function (引数たち, 手, 所) { return 大小のk番(引数たち, 手, 所, true); },
    SMALL: function (引数たち, 手, 所) { return 大小のk番(引数たち, 手, 所, false); },

    /* ★VLOOKUP／HLOOKUP★ … ★既定は 近い 方（TRUE）★ */
    VLOOKUP: function (引数たち, 手, 所) { return 縦横で探す(引数たち, 手, 所, true); },
    HLOOKUP: function (引数たち, 手, 所) { return 縦横で探す(引数たち, 手, 所, false); },

    /* ══ ★★お金の 一族（日付を 使わない 分）★★ ══（2026-09-16）
       ★物差し★ `golden-346-2026-09-08.tsv`
       ★実Excel に 聞いて 分かった 事★
         `=FV(0.5,1,2)` → ★-2★（★出て 行く 金は マイナス★）
         `=FV(2,3,TRUE)` → -13（★真偽は 1 に なる★）
         `=EFFECT(2,3)` → 3.629629629629628
       ★`型` は 0＝期末（既定）／0以外＝期首★ */
    FV: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 3, 5);
      if (g.誤) return g.誤;
      var r = g.数[0], n = g.数[1], p = g.数[2], pv = g.数.length > 3 ? g.数[3] : 0;
      var 期首 = g.数.length > 4 && g.数[4] !== 0;
      if (r === 0) return 数(-(pv + p * n));
      var k = Math.pow(1 + r, n);
      if (!isFinite(k)) return 誤('#NUM!');      /* ★無限は 数に ならない★ */
      return 数(-(pv * k + p * (1 + (期首 ? r : 0)) * (k - 1) / r));
    },
    PV: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 3, 5);
      if (g.誤) return g.誤;
      var r = g.数[0], n = g.数[1], p = g.数[2], fv = g.数.length > 3 ? g.数[3] : 0;
      var 期首 = g.数.length > 4 && g.数[4] !== 0;
      if (r === 0) return 数(-(fv + p * n));
      var k = Math.pow(1 + r, n);
      /* ★k が 無限＝割る 方が 無限★ ⇒ ★0 に 近づく★（PMT と 同じ 型） */
      if (!isFinite(k)) return 数(-(p * (1 + (期首 ? r : 0)) / r));
      return 数(-(fv + p * (1 + (期首 ? r : 0)) * (k - 1) / r) / k);
    },
    PMT: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 3, 5);
      if (g.誤) return g.誤;
      var r = g.数[0], n = g.数[1], pv = g.数[2], fv = g.数.length > 3 ? g.数[3] : 0;
      var 期首 = g.数.length > 4 && g.数[4] !== 0;
      if (n === 0) return 誤('#NUM!');
      if (r === 0) return 数(-(pv + fv) / n);
      var k = Math.pow(1 + r, n);
      /* ★★(1+r)^n が 無限に なる 時★★（2026-09-16 実測）
           `=PMT(D1,D2,1)`（r＝45292 n＝46023）… 前 ★NaN★ ／実Excel ★-45292★
           ＝`Infinity * 1 + 0` ÷ `Infinity - 1` ⇒ ★NaN★
           ⇒★k が 大きく なると 答えは `-pv*r/(1+期首*r)` に 近づきます★
           ⇒★その 値を 返す★（★NaN は 誤りにも ならず マスに 出る＝一番 悪い★） */
      if (!isFinite(k)) return 数(-(pv * r) / (1 + (期首 ? r : 0)));
      return 数(-(pv * k + fv) * r / ((1 + (期首 ? r : 0)) * (k - 1)));
    },
    NPER: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 3, 5);
      if (g.誤) return g.誤;
      var r = g.数[0], p = g.数[1], pv = g.数[2], fv = g.数.length > 3 ? g.数[3] : 0;
      var 期首 = g.数.length > 4 && g.数[4] !== 0;
      if (r === 0) { if (p === 0) return 誤('#NUM!'); return 数(-(pv + fv) / p); }
      var q = p * (1 + (期首 ? r : 0)) / r;
      var 中 = (q - fv) / (pv + q);
      if (!(中 > 0)) return 誤('#NUM!');
      return 数(Math.log(中) / Math.log(1 + r));
    },
    SLN: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 3, 3);
      if (g.誤) return g.誤;
      if (g.数[2] === 0) return 誤('#DIV/0!');
      return 数((g.数[0] - g.数[1]) / g.数[2]);
    },
    SYD: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 4, 4);
      if (g.誤) return g.誤;
      var c = g.数[0], 残 = g.数[1], n = g.数[2], t = g.数[3];
      if (n <= 0) return 誤('#NUM!');
      return 数((c - 残) * (n - t + 1) * 2 / (n * (n + 1)));
    },
    EFFECT: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 2, 2);
      if (g.誤) return g.誤;
      var r = g.数[0], m = 切り捨て(g.数[1]);
      if (r <= 0 || m < 1) return 誤('#NUM!');
      return 数(Math.pow(1 + r / m, m) - 1);
    },
    NOMINAL: function (引数たち, 手, 所) {
      var g = 金の引数(引数たち, 手, 所, 2, 2);
      if (g.誤) return g.誤;
      var r = g.数[0], m = 切り捨て(g.数[1]);
      if (r <= 0 || m < 1) return 誤('#NUM!');
      return 数((Math.pow(1 + r, 1 / m) - 1) * m);
    },

    /* ══ ★★見分けの 一族★★ ══（2026-09-15）
       ★物差し★ `golden-346-2026-09-08.tsv` ／ `golden-mada-2026-09-14.tsv`
       ★実Excel に 聞いて 分かった 事★
         `=ISERR(A1:B5)` → ★TRUE★（★2次元の 四角は 暗黙の 交わりが 出来ず 誤りに なる★）
         `=ISBLANK(A1:A5)` → FALSE（暗黙の 交わりで A1）
       ★`ISERR` は #N/A を 数えない★／`ISERROR` は 全部 数える */
    ISBLANK: function (引数たち, 手, 所) { return 見分け(引数たち, 所, function (v) { return v.型 === '空'; }); },
    ISNUMBER: function (引数たち, 手, 所) { return 見分け(引数たち, 所, function (v) { return v.型 === '数'; }); },
    ISTEXT: function (引数たち, 手, 所) { return 見分け(引数たち, 所, function (v) { return v.型 === '字'; }); },
    ISNONTEXT: function (引数たち, 手, 所) { return 見分け(引数たち, 所, function (v) { return v.型 !== '字'; }); },
    ISLOGICAL: function (引数たち, 手, 所) { return 見分け(引数たち, 所, function (v) { return v.型 === '真偽'; }); },
    ISERROR: function (引数たち, 手, 所) { return 見分け(引数たち, 所, function (v) { return v.型 === '誤'; }); },
    ISERR: function (引数たち, 手, 所) {
      /* ★`#N/A` だけは 数えない★（`ISERROR` との 違い） */
      return 見分け(引数たち, 所, function (v) { return v.型 === '誤' && v.値 !== '#N/A'; });
    },
    ISNA: function (引数たち, 手, 所) {
      return 見分け(引数たち, 所, function (v) { return v.型 === '誤' && v.値 === '#N/A'; });
    },

    /* ★N★ … 数は そのまま／真偽は 1・0／誤りは 素通り／他は 0 */
    N: function (引数たち, 手, 所) {
      var v = 場.ひとつに(引数たち[0], 所 && 所.今のマス);
      if (!引数たち.length || !v) return 誤('#VALUE!');
      if (v.型 === '誤') return v;
      if (v.型 === '数') return 数(v.値);
      if (v.型 === '真偽') return 数(v.値 ? 1 : 0);
      return 数(0);
    },
    /* ★TYPE★ … 1 数／2 字／4 真偽／16 誤り／64 並び */
    TYPE: function (引数たち, 手, 所) {
      if (!引数たち.length) return 誤('#VALUE!');
      var 元 = 引数たち[0];
      if (元.種 === '四角' && ((元.行数 || 0) > 1 || (元.列数 || 0) > 1)) return 数(64);
      var v = 場.ひとつに(元, 所 && 所.今のマス);
      if (!v) return 数(16);
      if (v.型 === '誤') return 数(16);
      if (v.型 === '真偽') return 数(4);
      if (v.型 === '字') return 数(2);
      return 数(1);
    },

    IFNA: function (引数たち, 手, 所) {
      var 今 = 所 && 所.今のマス;
      if (引数たち.length < 2) return 誤('#VALUE!');
      var v = 場.ひとつに(引数たち[0], 今);
      if (!v || v.型 !== '誤' || v.値 !== '#N/A') return v || 計.空;
      return 場.ひとつに(引数たち[1], 今) || 計.空;
    },
    /* ★IFS★ … ★合う 所が 無ければ #N/A★ */
    IFS: function (引数たち, 手, 所) {
      var 今 = 所 && 所.今のマス;
      if (引数たち.length < 2 || 引数たち.length % 2) return 誤('#VALUE!');
      for (var i = 0; i < 引数たち.length; i += 2) {
        var 判 = 真偽にする(場.ひとつに(引数たち[i], 今));
        if (判.誤) return 判.誤;
        if (判.真) return 場.ひとつに(引数たち[i + 1], 今) || 計.空;
      }
      return 誤('#N/A');
    },
    SWITCH: function (引数たち, 手, 所) {
      var 今 = 所 && 所.今のマス;
      if (引数たち.length < 3) return 誤('#VALUE!');
      var 元 = 場.ひとつに(引数たち[0], 今);
      if (!元) return 誤('#VALUE!');
      if (元.型 === '誤') return 元;
      var i;
      for (i = 1; i + 1 < 引数たち.length; i += 2) {
        var c = 場.ひとつに(引数たち[i], 今);
        if (c && 場.比べる(元, c) === 0) return 場.ひとつに(引数たち[i + 1], 今) || 計.空;
      }
      /* ★余った 1つは 既定★／無ければ #N/A */
      if (i < 引数たち.length) return 場.ひとつに(引数たち[i], 今) || 計.空;
      return 誤('#N/A');
    },
    CHOOSE: function (引数たち, 手, 所) {
      if (引数たち.length < 2) return 誤('#VALUE!');
      var t = 数の引数(引数たち[0], 手, 所);
      if (t.誤) return t.誤;
      var k = 切り捨て(t.数);
      if (k < 1 || k >= 引数たち.length) return 誤('#VALUE!');
      return 場.ひとつに(引数たち[k], 所 && 所.今のマス) || 計.空;
    },
    COUNTBLANK: function (引数たち, 手) {
      var n = 0;
      ほどく(引数たち, function (v, 元) {
        if (元 === 'マス' && v.型 === '空') n++;
        return true;
      });
      return 数(n);
    },
    ROWS: function (引数たち) {
      if (!引数たち.length) return 誤('#VALUE!');
      var a = 引数たち[0];
      return 数(a.種 === '四角' ? (a.行数 || 0) : 1);
    },
    COLUMNS: function (引数たち) {
      if (!引数たち.length) return 誤('#VALUE!');
      var a = 引数たち[0];
      return 数(a.種 === '四角' ? (a.列数 || 0) : 1);
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
      return 字ひとつ(引数たち, 手, 所, function (x) { return x.replace(/[\u0000-\u001f]/g, ''); });
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
    return 出口の門(f(引数たち, 手, 所 || {}), 名前);
  }

  /** ★★出口の 門★★（2026-09-16・経営者1 の 注文）
   *   ★★`NaN` と 無限を 1マスも 通さない★★
   *
   *   ★なぜ 1か所に するか★
   *     ★`NaN` は ★誤りに ならない★★＝お客さんは 気づきません
   *       ⇒★そのまま 足し算に 入り 合計が 全部 `NaN` に なる★
   *       ⇒★気づくのは 締めの 後★＝`#VALUE!` より ずっと 悪い
   *     ★今日 3つ 出ました★ … `TRUNC`／`PMT`／`IMSECH`（どれも 大きい 数の `Infinity` から）
   *     ★208個 書いて 門は 20か所★＝★1個ずつ 覚えて 書くのは もたない★
   *   ⇒★★決まりを 1か所で 守る★★（★見張りは 決まりを 見る★と 同じ 形）
   *
   *   ★先に 測りました★ … ★手元の 紙 全部（60枚）で 実Excel が 無限・`NaN` を 返した 行は ★0行★★
   *     ⇒★★門で 正しい 答えを 潰しません★★
   *
   *   ★何に するか★ … `#NUM!`（★実Excel も 数に ならない 時は これ★）
   */
  function 出口の門(出, 名前) {
    if (出 && 出.型 === '数' && !isFinite(出.値)) return 誤('#NUM!');
    if (出 && 出.溢れ === true && 出.並び) {
      for (var r = 0; r < 出.並び.length; r++) {
        var 段 = 出.並び[r];
        for (var c = 0; c < 段.length; c++) {
          if (段[c] && 段[c].型 === '数' && !isFinite(段[c].値)) 段[c] = 誤('#NUM!');
        }
      }
    }
    return 出;
  }

  return {
    呼ぶ: 呼ぶ, 表: 表,
    数を拾う: 数を拾う, ほどく: ほどく,
    足しあげる: 足しあげる, 掛けあげる: 掛けあげる
  };
});
