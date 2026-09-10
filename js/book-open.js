/* book-open.js — ★受け取ったブックを開く／直して返す★（book.html から使う）
 *
 * ★設計の芯（2026-08-08〜09 の実測で決めた）★
 *   受け取ったファイルを直す → ★元のzipのバイト列を持ったまま、値だけ書き換えて閉じ直す★
 *   ゼロから表を作る        → 今までどおり gridToBook → writeBook（元々書式が無いので問題ない）
 *   ★どちらの道のファイルかを、ファイル単位で覚える★
 *   ★受け取ったファイルが writeBook に入ると判子が消える。分岐はここだけ。★
 *
 * ★読む＝見るだけ★
 *   画面に出すための読み取りは SheetJS で行う（.xlsx/.xlsm/.xlsb/.xls すべて読める）。
 *   ★保存はその結果を使わない★。保存は「元のバイト列」に対して行う。
 */
(function (root) {
  'use strict';

  /* 今 開いているファイル。null なら「ゼロから作った表」＝今までの保存の道 */
  var opened = null;

  function u8(ab) { return ab instanceof Uint8Array ? ab : new Uint8Array(ab); }

  /** ★拡張子を信じない。中身で見分ける★（客が拡張子を変えていても間違えない） */
  function detectKind(bytes, name) {
    var b = bytes;
    if (b.length > 8 && b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0) return 'xls';
    if (!(b[0] === 0x50 && b[1] === 0x4B)) return 'unknown';    // zip(PK) でない
    // zip の中身は開いてから見る。ここでは名前で仮置きして、開いた後に上書きする
    return /\.xlsb$/i.test(name || '') ? 'xlsb' : (/\.xlsm$/i.test(name || '') ? 'xlsm' : 'xlsx');
  }

  var MSG_XLS = 'この形式（.xls）は まだ直せません。今は開いて見るだけです。';
  /* ★VBAが入っていた時に 客へ出す言葉（★どうなるかを 先に言う★）★ */
  var MSG_VBA = 'このファイルには マクロ（VBA）が入っています。'
    + 'マクロは そのまま残しますが、ここでは 動きません。'
    + '毎月の繰り返しは、このあと「手順を覚えさせる」で 代わりに出来ます。';

  /** ファイルを開く。★元のバイト列をそのまま持つ★ */
  function openFile(file) {
    return file.arrayBuffer().then(function (ab) {
      var bytes = u8(ab);
      var kind = detectKind(bytes, file.name);
      if (kind === 'unknown') throw new Error('Excelのファイルとして読めませんでした');

      // 中身で確定させる（zip の時だけ）
      /* ★VBA入り(.xlsm)の扱い＝決めた（2026-08-25 司さん方針・指示役の指示）★
         ①★開ける★（読むだけ ではない。直して書き出せる）
         ②★VBAには 触らない。そのまま残す★（実測：書き出しても xl/vbaProject.bin は1バイトも変わらない）
         ③★VBAは 動かさない★（うちはブラウザ。Windows＋マクロ有効化が要る物は 勧めない）
         ④★VBAが要る仕事は うちの側（レシピ）で済ませる★＝画面でも そう言う */
      var hasVba = false;
      if (kind !== 'xls' && root.ZipSurgeon) {
        try {
          var z = root.ZipSurgeon.read(bytes);
          if (z.has('xl/workbook.bin')) kind = 'xlsb';
          else if (z.has('xl/vbaProject.bin')) { kind = 'xlsm'; hasVba = true; }
          else if (z.has('xl/workbook.xml')) kind = 'xlsx';
        } catch (e) { /* 読めなければ名前のままにする */ }
      }

      // ★表示用の読み取り（見るだけ）★
      /* ★★`cellStyles: true` が 無いと 列の 幅が 1つも 来ません★★（2026-09-11 実測）
           SheetJS は これが 無いと `ws['!cols']` を ★作りません★
           ⇒ 幅を 読む 所は 前から 書いて 在ったのに ★材料が ずっと 空★でした
           ⇒★実Excel より 列が 広く、`####` に ならず、桁が 多く 出て いた★
             （実測 … Excel「1.001193」／うち「1.001193321」）
         ★重く ならないか 先に 測りました★（司さんの 実物 代行計算表2026.xlsb・15枚）
           今のまま … 309ms / 236ms ／ 山 21MB ／★幅が 来た板 0/15★
           足した後 … 276ms / 263ms ／ 山 26MB ／★幅が 来た板 15/15★
           ⇒★遅く なりません★（山は +5MB） */
      var wb = root.XLSX.read(bytes, { type: 'array', cellFormula: true, cellNF: true, sheetStubs: false, cellStyles: true });

      /* ★表の名前での参照（Table[列名]）を、実際のA1範囲に直す★（2026-08-18）
         読み込みライブラリは .xlsb で ★表の名前も列名も捨てる★。
           実Excelの真値 =INDEX(R8.1[白石正人], MATCH(B4, R8.1[日付], 0))
           受け取る式     =INDEX(Table1[#Data],  MATCH(B4, Table1[#Data], 0))
         ＝INDEX と MATCH が同じ範囲を指す壊れた式になり、司さんの実物では
         ★式 15,126本のうち 11,669本が 1本残らず #ERROR★ になっていた。
         計算する側をいくら直しても、届く前に消えているので直らない。
         ★合わないセルは直さない（元のまま＝#ERROR のまま）★＝壊すより断る。 */
      var trFixes = {};
      var trStats = null;
      /* ★断った 式のうち 客に 説明できる 物★（2026-09-04）＝★直さない・言うだけ★ */
      var tr断り = [];
      var pre = Promise.resolve();
      if (kind !== 'xls' && root.TableRefs && root.ZipSurgeon) {
        pre = root.TableRefs.resolve(bytes, kind, wb, root.ZipSurgeon).then(function (r) {
          if (r && r.ok) { trFixes = r.fixes || {}; trStats = r.stats || null; tr断り = r.断り || []; }
          else if (r && root.console) root.console.warn('[Exally] 表の参照を直せませんでした: ' + r.why);
        }).catch(function (e) {
          if (root.console) root.console.warn('[Exally] 表の参照を直せませんでした', e);
        });
      }
      /* ★マクロ(VBA)は 開いた時に 読んでおく★（★読むだけ・動かさない★・AIは0回）
         ★読めなくても 画面は そのまま動く★＝読めない時は「未測定」と言う（0本と言わない） */
      var マクロ = null;
      if (hasVba && root.Vba && root.ZipSurgeon) {
        pre = pre.then(function () {
          return root.ZipSurgeon.read(bytes).bytes('xl/vbaProject.bin').then(function (bin) {
            var 読み = root.Vba.読む(bin, root.XLSX && root.XLSX.CFB);
            var 見立て = (読み.ok && root.VbaMikata) ? root.VbaMikata.見立てる(読み.モジュール) : null;
            マクロ = { 読み: 読み, 見立て: 見立て };
          }).catch(function (e) {
            マクロ = { 読み: { ok: false, モジュール: [], なぜ: '読めませんでした' }, 見立て: null };
            if (root.console) root.console.warn('[Exally] マクロを読めませんでした', e);
          });
        });
      }
      return pre.then(function () { return finish(bytes, kind, wb, file, trFixes, trStats, hasVba, マクロ, tr断り); });
    });
  }

  /** 読み終わった物をグリッドの形にして、控え(base)を作る */
  function finish(bytes, kind, wb, file, trFixes, trStats, hasVba, マクロ, tr断り) {
      /* ★その本の 既定の 字体を 覚える★＝列の 幅を 点に 直すのに 要る
         （SheetJS は `wb.Styles.Fonts[0]` に 入れる … 実測 2026-09-11
           {"sz":11,"name":"游ゴシック",...}） */
      既定の字体 = (wb.Styles && wb.Styles.Fonts && wb.Styles.Fonts[0]) ? wb.Styles.Fonts[0] : null;
      var out = wb.SheetNames.map(function (nm) { return sheetToGrid(wb.Sheets[nm], nm, trFixes); });
      /* ★控えは「見せている文字」ではなく「元の生の値」から作る★（2026-08-09）
         画面用に 46043 を "1/21(水)" にして見せているので、その文字を控えにすると
         ★計算し直した瞬間に 46043 と食い違い、全部「変わった」ことになる★
         （実物14シートで 14,424セルが変わった扱いになり、保存が断られた）。 */
      var base = {};
      wb.SheetNames.forEach(function (nm) {
        var ws = wb.Sheets[nm];
        Object.keys(ws).forEach(function (a) {
          if (a.charAt(0) === '!') return;
          var rc = root.XLSX.utils.decode_cell(a);
          var v = ws[a].v;
          base[nm + '|' + rc.r + ',' + rc.c] = (v === undefined || v === null) ? '' : v;
        });
      });

      opened = {
        name: file.name, kind: kind, bytes: bytes,
        sheetNames: wb.SheetNames.slice(),
        /* ★開いた時の値を覚えておく★
           保存の時は「変わったセルだけ」書く。全部書こうとすると
           ・触っていない所まで書き換える危険
           ・答えがエラーの数式セル（記録11）に当たって★保存そのものが断られる★
           が起きる（実物14シート・2万セルで実際に起きた 2026-08-09）。 */
        base: base,
        tableRefs: trStats,        // ★何本 直したか（見張りと報告が読む。画面には出さない）
      };
      return { kind: kind, sheets: out, opened: opened, hasVba: !!hasVba, マクロ: マクロ || null,
        表の断り: tr断り || [] };
  }

  /* ★日本語の曜日（aaa / aaaa）を先に本物の文字へ置き換える★
     SheetJS の書式エンジンは この2つを知らないので、そのまま「(aaa)」と出る。
     実物の代行計算表は日付の書式が `m/d(aaa)` なので、★画面に (aaa) が並ぶ★（2026-08-09 実機で確認）。
     中身(シリアル値)は触らない。見せ方だけ直す。 */
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function withWeekday(fmt, serial) {
    if (!/a{3,4}/.test(String(fmt))) return fmt;
    var d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
    var w = WD[d.getUTCDay()];
    return String(fmt).replace(/a{4}/g, '"' + w + '曜日"').replace(/a{3}/g, '"' + w + '"');
  }

  /** SheetJS の1シート → グリッドの形 { name, data:{'r,c':{v,f,d,numFmt}}, colW, ... }
   *  tableFixes … 'シート名|r,c' → 表の参照を A1 範囲に直した式（TableRefs が作る）。
   *               ★無い物は元のまま★＝直せなかったセルは触らない。 */
  /* ★★うちが 溢れで 作った マスと 同じ 印★★
     ★book.html の `溢れの印` と 同じ 字で なければ なりません★
     ＝違うと 画面が「これは 溢れの 先だ」と 気付かず、古い 数が 残ります。
     ★見張り★ … tests/afureru.test.mjs が 両方が 同じ 字か 突き合わせます */
  var 溢れの印 = '_溢れ元';

  /** ★その マスが「広がった 先」か★＝★元では ない★ */
  function 溢れの先か(c, rc) {
    if (c.f !== undefined && c.f !== null && c.f !== '') return false;   // ★式を 持つ＝元★
    var 元 = 溢れの元の場所(c.F);
    if (!元) return false;
    return 元 !== (rc.r + ',' + rc.c);
  }

  /** ★"G1:G5" → "0,6"★（左上＝溢れの 元）／読めない 時は null */
  function 溢れの元の場所(F) {
    var m = /^([A-Z]+)(\d+):/.exec(String(F || ''));
    if (!m) return null;
    var c = 0, s = m[1];
    for (var i = 0; i < s.length; i++) c = c * 26 + (s.charCodeAt(i) - 64);
    return (Number(m[2]) - 1) + ',' + (c - 1);
  }

  /* ══ ★★列の 幅を 実Excel と 同じ 点(px)に 直す★★（2026-09-11）══════════════
     ★実Excel に 聞いて 決めました★（docs/measured/toru-hashira-haba.ps1）
       打った 字数  2     3     5     8.44   10    12     15     20     30
       実Excel の点 20.5  28.5  44.5  72     84.5  100.5  124.5  164.5  244.5
       ⇒★一直線★＝`点 = 字数 × 8 + 4.5`（游ゴシック 11pt）
     ★ファイルの 中の 数（width）で 突き合わせた★（8列とも ★差 0.00★）
       width 2.5625 → ×8 = 20.5 ／ width 30.5625 → ×8 = 244.5
       ⇒★点 = ファイルの width × 一字の幅★
     ★SheetJS の `wpx` は 使えません★＝1字を 14点と 思い込んで います
       実測 … 5字の 列 … 実Excel ★44.5点★ ／ SheetJS ★78点★
       ⇒ そのまま 使うと ★幅が 足りて しまい `####` に ならない★
     ★一字の幅は 字体で 変わります★＝★その本の 既定の 字体で「0」を 測って 切り捨て★
       游ゴシック 11pt … 8.153 → ★8★（実Excel と 一致）
       Calibri   11pt … 7.430 → ★7★（実Excel と 一致）
       ⇒★2つの 字体で 実Excel と 合う 事を 確かめました★（当て推量では ありません）
     ★まだ 出来て いない 事★
       ・★幅を 書いて いない 列（標準の 幅）★は ファイルの 既定を 読めません
         （SheetJS が `defaultColWidth` を 出さない）
         ⇒ 実Excel の 標準（8.43字）で 置き換えます＝★その本が 標準を 変えて いたら 合いません★ */

  /** ★実Excel の 標準の 列幅（字）★＝どの 版でも 8.43（実測 2026-09-11 … 8.44 と 出る） */
  var 標準の字数 = 8.43;
  /** ★字体が 読めない 時の 逃げ先★＝游ゴシック 11pt の 実測値 */
  var 逃げの字幅 = 8;

  /** ★その本の 既定の 字体★（SheetJS は `wb.Styles.Fonts[0]` に 入れる） */
  var 既定の字体 = null;

  /** ★「0」1文字の 点(px)★＝★画面と 同じ 測り方★（canvas で 測る）
   *  ★切り捨て★＝実Excel も 整数の 点で 持つ（8.153 → 8 ／ 7.430 → 7 で 一致した） */
  function 一字の幅(字体) {
    try {
      var d = root.document;
      if (!d || !d.createElement) return 逃げの字幅;
      var x = d.createElement('canvas').getContext('2d');
      if (!x) return 逃げの字幅;
      var 名 = (字体 && 字体.name) ? 字体.name : '游ゴシック';
      var 大 = (字体 && 字体.sz) ? 字体.sz : 11;
      x.font = 大 + 'pt "' + 名 + '",sans-serif';
      var w = Math.floor(x.measureText('0').width);
      return (w > 0 && w < 100) ? w : 逃げの字幅;
    } catch (e) { return 逃げの字幅; }
  }

  /** ★1列ぶんの 幅を 点に★／読めない 時は 0（＝画面の 既定に 任せる） */
  function 幅を点に(col, 字幅) {
    if (!col) return 0;
    /* ★ファイルの 中の 数を 使う★＝これが 実Excel と 差 0.00 で 合う */
    if (typeof col.width === 'number' && col.width > 0) return Math.round(col.width * 字幅);
    /* ★width が 無い 時だけ 字数から 作る★（`点 = 字数 × 一字の幅 + 余白5`） */
    if (typeof col.wch === 'number' && col.wch > 0) return Math.round(col.wch * 字幅 + 5);
    return 0;
  }

  function sheetToGrid(ws, name, tableFixes) {

    var data = {}, X = root.XLSX, fixes = tableFixes || {};
    Object.keys(ws).forEach(function (a) {
      if (a.charAt(0) === '!') return;
      var c = ws[a], rc = X.utils.decode_cell(a);
      var cell = { v: '', f: '', d: '' };
      if (c.f !== undefined && c.f !== null && c.f !== '') {
        var fixed = fixes[name + '|' + rc.r + ',' + rc.c];
        cell.f = fixed !== undefined ? fixed : ('=' + c.f);
        cell.d = c.v !== undefined && c.v !== null ? c.v : '';   // ★ファイルの答え（キャッシュ）をそのまま出す★
      } else if (c.F && 溢れの先か(c, rc)) {
        /* ══ ★★Excel が 書き込んだ「広がった 先の 答え」★★（2026-09-11）══════
           ★実物で 測った 事★（docs/measured/toru-excel-kara.ps1 で 作った ファイルを
             SheetJS で 読んだ … 2026-09-11）
               G1 … {v:1, f:"_xlws.SORT(E1:E5)", ★F:"G1:G5"★}   ← 溢れの 元
               G2 … {v:1,                        ★F:"G1:G5"★}   ← ★広がった 先★（式は 無い）
               G3 … {v:3,                        ★F:"G1:G5"★}
           ⇒★Excel は 広がった 先の 答えも ファイルに 書きます★
           ⇒ 前は それを ★ただの 数★として 読んで いた
             ⇒ うちの エンジンから 見ると ★溢れ先が 塞がって いる★
             ⇒★#SPILL! ＝ Excel の SORT / UNIQUE / FILTER が 全部 開けない★
                （2026-09-11 実測 … G1・H1・I1 の 3つとも #SPILL!）
           ⇒★うちが 溢れで 作った マスと 同じ 印を 付けます★（book.html の `溢れの印`）
             ＝`v` を 持たせない ⇒ `_pushGrid` は null を 送る ⇒ 塞がない
             ⇒ うちの エンジンが 溢れ直し、`_溢れを写す` が 中身を 入れ直す
           ★断り★＝うちが その 関数を 計算できない 時は、
             ファイルに 在った 答えは ★消えます★（元の 式が エラーに なる）。
             前は「全部 #SPILL!」だったので ★どちらでも 出ません★が、
             ★出なく なる 物が 在る事は 書いて おきます★ */
        cell.d = c.v !== undefined && c.v !== null ? c.v : '';
        cell[溢れの印] = 溢れの元の場所(c.F);
      } else {
        cell.v = c.v !== undefined && c.v !== null ? c.v : '';
        cell.d = c.w !== undefined ? c.w : cell.v;               // w = Excelが表示していた文字
      }
      if (c.z) cell.numFmt = c.z;
      /* ★日付が 46043 という裸の数字で出るのを止める★
         SheetJS が表示用の文字(w)を作らない事がある（.xlsb で実際に起きた 2026-08-09）。
         その時は表示形式(z)を使って自分で作る。★中身(v)はシリアル値のまま持つ★
         ＝保存する時に日付として書き戻せる。 */
      if ((cell.d === '' || typeof cell.d === 'number') && c.z && typeof c.v === 'number') {
        try {
          var t = root.XLSX.SSF.format(withWeekday(c.z, c.v), c.v);
          if (t !== undefined && t !== null && t !== '') cell.d = t;
        } catch (e) { /* 作れなければ数のまま出す */ }
      }
      data[rc.r + ',' + rc.c] = cell;
    });
    var colW = {};
    var 字幅 = 一字の幅(既定の字体);
    (ws['!cols'] || []).forEach(function (col, i) {
      var px = 幅を点に(col, 字幅);
      if (px) colW[i] = px;
    });
    /* ★表の枠（!ref）も 覚えておく★（2026-08-27 指示役の指摘）
       ＝★「値か式が在る所」と「表の枠」は 違う★。
         実物 計算シート … ★値か式 400行×72列／表の枠 404行×152列★
       ★地図が 72列と言うと AIは 73列目から先を 一生 掘らない★ので、
       ★両方を 名前つきで 出す★ため ここで拾う（捨てない）。 */
    var 枠 = null;
    try {
      if (ws['!ref']) {
        var rg = X.utils.decode_range(ws['!ref']);
        枠 = { 行数: rg.e.r + 1, 列数: rg.e.c + 1 };
      }
    } catch (e) { /* 読めない時は null＝「未測定」（0にしない） */ }
    /* ★幅を 書いて いない 列（標準の 幅）も 実Excel に 合わせる★
       ＝画面の 既定は 80点／実Excel の 標準は ★72点★（8.43字 × 8 + 5）
       ⇒ これが 無いと ★Excel 8桁／うち 11桁★の ままです（実測）
       ⇒★この 板だけの 既定★＝新しく 作る ブックの 既定は 動かしません */
    var 標準の点 = Math.round(標準の字数 * 字幅 + 5);
    return { name: name, data: data, colW: colW, 既定の列幅: 標準の点,
      /* ★その ブックの 既定の 字体★＝画面も 同じ 字で 描く
         ⇒ 同じ 幅に 入る 桁数が 実Excel と 揃う（うちの 字は 細くて 多く 入って いた） */
      既定の字体名: (既定の字体 && 既定の字体.name) ? 既定の字体.name : '',
      既定の字大: (既定の字体 && 既定の字体.sz) ? 既定の字体.sz : 0,
      rowH: {}, hiddenRows: {}, hiddenCols: {}, 枠: 枠, _fromFile: true };
  }

  /* ── 保存：★元のバイト列を書き換える★ ── */

  /** セルの「今の値」（式なら答え、そうでなければ打った値） */
  function valueOf(cell) {
    var isF = typeof cell.f === 'string' && cell.f.charAt(0) === '=';
    var v = isF ? cell.d : (cell.v !== undefined && cell.v !== '' ? cell.v : cell.d);
    return v === undefined || v === null ? '' : v;
  }
  /** 開いた時の値を控えておく（'シート名|r,c' → 値） */
  function baselineOf(sheets) {
    var base = {};
    (sheets || []).forEach(function (sh) {
      Object.keys(sh.data || {}).forEach(function (k) {
        base[sh.name + '|' + k] = valueOf(sh.data[k]);
      });
    });
    return base;
  }
  /** ★開いた時から変わったセルだけ★を集める（触っていない所は1つも書かない） */
  /* ★見た目の違いを「変わった」と数えない★（2026-08-09 指示役が実機で発見）
     開いた時の控えは ファイルの表示文字（例 "1,000"）、
     計算し直した後は 生の数（1000）になる。そのまま比べると
     ★1つも触っていないのに 数式セルが全部「変わった」ことになり、
       文字を返す数式セル（記録8）に当たって保存そのものが断られた★。
     司さんの実物には BrtFmlaString が 2,866個＝必ず当たる。 */
  function normForCompare(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'number') return String(v);
    var s = String(v).trim().replace(/[,\s¥￥]/g, '');
    if (s !== '' && !isNaN(Number(s))) return String(Number(s));   // "1,000" と 1000 は同じ
    return String(v).trim();
  }
  function changedCells(sh) {
    var out = {}, base = opened.base || {};
    Object.keys(sh.data || {}).forEach(function (k) {
      var p = k.split(','), r = parseInt(p[0], 10), c = parseInt(p[1], 10);
      if (isNaN(r) || isNaN(c)) return;
      var now = valueOf(sh.data[k]);
      if (normForCompare(now) === normForCompare(base[sh.name + '|' + k])) return;  // 変わっていない
      if (now === '') return;                                        // 空にする操作は まだ扱わない
      /* ★うちの計算が答えを出せなかったセルは、元のまま置いておく★
         #ERROR や #NAME? を書き込むと、★開ける物を自分で壊す★。
         （実物には うちのエンジンが読めない式がある。読めない物は触らないのが正しい） */
      if (typeof now === 'string' && now.charAt(0) === '#') return;
      out[k] = now;
    });
    return out;
  }
  /** ★そのシートの控えを、今の値で取り直す★
   *  うちの計算エンジンは Excel と答えが違う式がある（実物で771セル）。
   *  それを「客が変えた」と数えると、★うちの間違った答えでファイルを上書きしてしまう★。
   *  ⇒ ★シートを計算する側へ流して計算し直した直後に、控えを取り直す★
   *     こうすると「控え＝うちのエンジンから見た今のファイル」になり、
   *     ★そのあとの違い＝客が触った所★だけになる。 */
  function rebaseSheet(sh) {
    if (!opened || !sh) return;
    Object.keys(sh.data || {}).forEach(function (k) {
      opened.base[sh.name + '|' + k] = valueOf(sh.data[k]);
    });
  }

  /** ブック全体で1つでも変わったか（★0件なら元のバイト列をそのまま返す★） */
  function anyChanged(sheets) {
    for (var i = 0; i < sheets.length; i++) {
      if (opened.sheetNames.indexOf(sheets[i].name) < 0) continue;
      if (Object.keys(changedCells(sheets[i])).length) return true;
    }
    return false;
  }

  /** .xlsx 用に A1 形式へ直す。★式のセルは <v>(答え)をうちの計算結果で埋める★ */
  function collectValues(sh) {
    var cells = {}, X = root.XLSX, ch = changedCells(sh);
    Object.keys(ch).forEach(function (k) {
      var p = k.split(','), val = ch[k];
      var num = typeof val === 'number' ? val : (val !== '' && !isNaN(Number(val)) ? Number(val) : null);
      cells[X.utils.encode_cell({ r: parseInt(p[0], 10), c: parseInt(p[1], 10) })] =
        num !== null ? { v: num, t: 'n' } : { v: String(val), t: 's' };
    });
    return cells;
  }

  /** .xlsx / .xlsm を直して返す */
  function saveXlsxLike(sheets) {
    return root.XlsxEdit.open(opened.bytes).then(function (book) {
      var chain = Promise.resolve();
      sheets.forEach(function (sh) {
        if (opened.sheetNames.indexOf(sh.name) < 0) return;      // 元に無いシートは触らない
        chain = chain.then(function () {
          return root.XlsxEdit.setValues(book, sh.name, collectValues(sh));
        });
      });
      return chain.then(function () { return root.XlsxEdit.save(book); });
    });
  }

  /** .xlsb を直して返す（★歩けなければ断る★） */
  function saveXlsb(sheets) {
    var Z = root.ZipSurgeon, E = root.XlsbEdit, X = root.XLSX;
    var zip = Z.read(opened.bytes);
    // シート名 → 部品名（workbook.bin を読まずに、開いた時の並びで対応させる）
    var parts = zip.names().filter(function (n) { return /^xl\/worksheets\/sheet\d+\.bin$/.test(n); })
      .sort(function (a, b) {
        return parseInt(a.replace(/\D+/g, ''), 10) - parseInt(b.replace(/\D+/g, ''), 10);
      });
    var chain = Promise.resolve(), touched = [];
    sheets.forEach(function (sh) {
      var i = opened.sheetNames.indexOf(sh.name);
      if (i < 0 || !parts[i]) return;
      chain = chain.then(function () {
        return zip.bytes(parts[i]).then(function (bin) {
          var cells = {}, ch = changedCells(sh);
          Object.keys(ch).forEach(function (k) {
            var val = ch[k];
            if (typeof val !== 'number' && (val === '' || isNaN(Number(val)))) return;  // 数だけ扱う
            cells[k] = Number(val);
          });
          if (!Object.keys(cells).length) return;
          var ed = E.editSheet(bin, cells);
          if (!ed.ok) throw new Error('このファイルは直せません（' + sh.name + '：' + ed.why + '）');
          zip.replace(parts[i], ed.bytes);
          touched.push(parts[i]);
        });
      });
    });
    return chain.then(function () {
      if (!touched.length) return zip.build();
      /* ★binaryIndex は「何バイト目に何がある」の索引。長さが変わると嘘になるので外す。
         ★部品を消すだけでは足りない。rels と [Content_Types].xml の参照も外す★ */
      return zip.text('[Content_Types].xml').then(function (ct) {
        var relsNames = zip.names().filter(function (n) { return /worksheets\/_rels\/sheet\d+\.bin\.rels$/.test(n); });
        var got = {}, c2 = Promise.resolve();
        relsNames.forEach(function (n) { c2 = c2.then(function () { return zip.text(n).then(function (t) { got[n] = t; }); }); });
        return c2.then(function () {
          var r = E.dropBinaryIndex(zip, ct, got);
          zip.replaceText('[Content_Types].xml', r.contentTypes);
          Object.keys(r.rels).forEach(function (n) { zip.replaceText(n, r.rels[n]); });
          return zip.build();
        });
      });
    });
  }

  /** 保存の入口。★受け取ったファイルかどうかで道を分ける★ */
  function saveOpened(sheets) {
    if (!opened) return Promise.reject(new Error('開いたファイルがありません'));
    if (opened.kind === 'xls') return Promise.reject(new Error(MSG_XLS));
    /* ★1つも変わっていないなら、元のバイト列をそのまま返す★
       作り直さないのが いちばん安全（1バイトも動かない）。 */
    if (!anyChanged(sheets)) {
      return Promise.resolve({ bytes: opened.bytes, log: { compressed: 0, stored: 0, why: '', noChange: true } });
    }
    return (opened.kind === 'xlsb' ? saveXlsb(sheets) : saveXlsxLike(sheets));
  }

  root.BookOpen = {
    openFile: openFile, saveOpened: saveOpened,
    isOpened: function () { return !!opened; },
    current: function () { return opened; },
    reset: function () { opened = null; },
    detectKind: detectKind, sheetToGrid: sheetToGrid, collectValues: collectValues,
    baselineOf: baselineOf, changedCells: changedCells, valueOf: valueOf, withWeekday: withWeekday,
    anyChanged: anyChanged, normForCompare: normForCompare, rebaseSheet: rebaseSheet,
    MSG_XLS: MSG_XLS,
    MSG_VBA: MSG_VBA,
  };
})(typeof self !== 'undefined' ? self : this);
