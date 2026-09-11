/* xlsb-jitai.js — ★.xlsb の「マスごとの 字体」を 自分で 読む★（2026-09-11）
 *
 *  ★★なぜ 自分で 読むか★★
 *    借り物（SheetJS）は ★.xlsb の マスごとの 字体を くれません★。
 *      実測 … 司さんの 実物 ★35,760マス中 0マス★（`c.s` が 付かない）
 *      字体の 表（31本）と マスの 形（139本）は ★在るのに 結び付ける 番号が 来ない★
 *    ⇒ 実Excel は 9pt や 12pt で 書いて 在る 所を うちは 既定（11pt）で 描き、
 *      ★入りきらず `######`★ に なって いました（給料表 120マス）。
 *
 *  ★★借り物の 中は 読んで いません★★
 *    使うのは ★この repo が 前から 持って いる 物★だけ。
 *      `lib/zip-surgeon.js` … 袋を 開ける
 *      `lib/xlsb-edit.js`   … 記録を 歩く（司さんの 実物で 43,917記録・ズレ0 の 実績）
 *    ⇒ ここは ★記録の 中身の 読み方★を 足すだけ。
 *
 *  ★★当て推量で 決めて いません★★（全部 実Excel と 突き合わせて 決めた）
 *    ・字体の 記録は ★番号43★ … 数が 31本＝借り物の 言う「字体31本」と 一致
 *    ・マスの 形は ★番号47★ … 142本（借り物の 言う 139本 ＋ 3）
 *    ・★形の 番号は 3つ ずらす★
 *        ずれ0 … 838マス中 ★94本★しか 合わない
 *        ずれ3 … 838マス中 ★838本 全部 合う★
 *      （142 − 139 ＝ 3＝前に 3本 別の 表が 入って いる）
 *    ・大きさは ★twip（pt × 20）★
 *      実Excel … A368 9pt ／ B34 9pt ／ G1 12pt ／ D1 12pt ⇒ 4本とも 合う
 *
 *  ★読めない 時は 何も しません★＝★断って 元のまま★（勝手に 直さない）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.XlsbJitai = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ★記録の 番号★（★数で 確かめて 決めました★＝上の 断りを 見る） */
  var 字体の記録 = 43;      /* BrtFont 相当 */
  var 形の記録 = 47;        /* BrtXF 相当 */
  var 行の記録 = 0;         /* 行の 頭 */
  var マスの記録 = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1 };

  /* ★★形の 表は 2組 在ります★★（2026-09-11 実測・2つの ファイルで 確かめた）
       ①「626 … 47が n本 … 627」  ＝ 下地の 形（マスは ここを 指しません）
       ②「★617 … 47が n本 … 618★」＝★マスが 指す 形★
     実測
       司さんの 実物 … ①3本 ②★139本★（借り物の 言う「139本」と 一致）
       見本         … ①1本 ②★8本★
     ★★前は「3つ ずらす」と して いました★★＝★司さんの ファイルにだけ 合う 数★
       見本では 6本 全部 外れ、★見張りが 捕まえました★
     ⇒★数では なく 印（617/618）で 切ります★＝どの ファイルでも 合う */
  var 形の始まり = 617, 形の終わり = 618;

  function 数を読む(d) { return new DataView(d.buffer, d.byteOffset, d.byteLength); }

  /** ★字体の 表を 読む★ … [{pt, 名}] */
  function 字体たち(recs) {
    var 出 = [];
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].id !== 字体の記録) continue;
      var d = recs[i].data;
      if (d.length < 25) { 出.push(null); continue; }
      var dv = 数を読む(d);
      var pt = dv.getUint16(0, true) / 20;          /* ★twip（pt × 20）★ */
      var 名 = '';
      try {
        var cch = dv.getUint32(21, true);
        if (cch > 0 && cch < 64 && 21 + 4 + cch * 2 <= d.length) {
          for (var k = 0; k < cch; k++) 名 += String.fromCharCode(dv.getUint16(21 + 4 + k * 2, true));
        }
      } catch (e) { /* 名前が 読めなくても 大きさは 使える */ }
      出.push({ pt: pt, 名: 名 });
    }
    return 出;
  }

  /* ★★164未満の 書式番号は「組み込み」＝国で 中身が 変わります★★（2026-09-11）
       借り物は 世界共通（英語）の 表しか 持たず、日本の 物を くれません。
       ⇒★実Excel に 聞いて 測った 物だけ★ ここに 書きます（当て推量で 増やさない）
       ★55番★ … `yyyy"年"m"月"`（実測 … 司さんの 実物 D1「2026年1月」／26マス 使用）
         借り物は この 番号に 何も 返さず、うちは `1/1/26` と 出して いました
       ★まだ 測って いない 番号は 触りません★（`null` を 返す＝借り物に 任せる） */
  var 組み込み書式 = {
    55: 'yyyy"年"m"月"'
  };
  /** ★書式番号 → 日本の Excel の 字★（測って いない 番号は null） */
  function 組み込みの書式(id) {
    return (組み込み書式[id] !== undefined) ? 組み込み書式[id] : null;
  }

  /** ★マスの 形の 表を 読む★ … [{字体}]／★617 と 618 に 挟まれた 組だけ★ */
  function 形たち(recs) {
    var 出 = [], 中 = false;
    for (var i = 0; i < recs.length; i++) {
      var id = recs[i].id;
      if (id === 形の始まり) { 中 = true; 出 = []; continue; }
      if (id === 形の終わり) { 中 = false; continue; }
      if (!中 || id !== 形の記録) continue;
      var d = recs[i].data;
      if (d.length < 6) { 出.push(null); continue; }
      出.push({ 書式: 数を読む(d).getUint16(2, true), 字体: 数を読む(d).getUint16(4, true) });
    }
    return 出;
  }

  /** ★板の 中の マスが どの 形を 指すか★ … { 'r,c': 形の番号 } */
  function 板の形(recs) {
    var 出 = {}, 行 = -1;
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (r.id === 行の記録) {
        if (r.data.length >= 4) 行 = 数を読む(r.data).getUint32(0, true);
        continue;
      }
      if (!マスの記録[r.id]) continue;
      var d = r.data;
      if (d.length < 8 || 行 < 0) continue;
      var 列 = 数を読む(d).getUint32(0, true);
      var 形番 = (d[4] | (d[5] << 8) | (d[6] << 16)) >>> 0;
      出[行 + ',' + 列] = 形番;
    }
    return 出;
  }

  /**
   * ★板1枚ぶんの「マス → 字体」を 作る★
   *   styles … xl/styles.bin を 歩いた 記録
   *   sheet  … その 板の .bin を 歩いた 記録
   *   返す物 … { 'r,c': {pt, 名} }／読めなければ null（★断って 元のまま★）
   */
  function 板の字体(styles, sheet) {
    if (!styles || !sheet) return null;
    var 字 = 字体たち(styles), 形 = 形たち(styles);
    if (!字.length || !形.length) return null;
    var 指す = 板の形(sheet);
    var 出 = {}, 取れた = 0;
    for (var k in 指す) {
      var x = 形[指す[k]];
      if (!x) continue;
      var f = 字[x.字体];
      var 書 = 組み込みの書式(x.書式);
      if ((!f || !(f.pt > 0)) && !書) continue;
      出[k] = { pt: (f && f.pt) || 0, 名: (f && f.名) || '', 書式: 書 };
      取れた++;
    }
    return 取れた ? 出 : null;
  }

  /* ★★板の 名前と ファイルの 対応★★（2026-09-11）
     ★当て推量しません★＝`sheet10.bin` が 10枚目 とは 限りません。
     ①`xl/workbook.bin` の ★番号156★ に「rId＋板の名前」が 入って います
        （実測 … 司さんの 実物で ★ちょうど 15本★＝板の 数と 同じ）
        中身 … 先頭に 数、その後ろに `rId1` `給料1` の ように 字が 続く
     ②`xl/_rels/workbook.bin.rels` に rId → ファイル名 が 在る
     ⇒ 2つを 突き合わせて 決めます */
  var 板の記録 = 156;

  /** ★記録の 中の UTF-16 の 字を 拾う★（どこに 在るか 当てない） */
  function 字を拾う(d) {
    var dv = 数を読む(d), s = '';
    for (var i = 0; i + 1 < d.length; i += 2) {
      var ch = dv.getUint16(i, true);
      if (ch >= 32 && ch < 0xFFFD) s += String.fromCharCode(ch);
    }
    return s;
  }

  /** ★板の 名前 → ファイル名★（読めなければ null＝★断って 元のまま★） */
  function 板とファイル(workbookRecs, relsText) {
    if (!workbookRecs || !relsText) return null;
    /* rId → ファイル名 */
    var 先 = {};
    var re = /Id="([^"]+)"[^>]*Target="([^"]+)"/g, m;
    while ((m = re.exec(String(relsText)))) 先[m[1]] = m[2];
    var 出 = {}, 数 = 0;
    for (var i = 0; i < workbookRecs.length; i++) {
      if (workbookRecs[i].id !== 板の記録) continue;
      var 字 = 字を拾う(workbookRecs[i].data);
      var g = /(rId\d+)(.*)$/.exec(字);
      if (!g) continue;
      var 名 = g[2];
      var f = 先[g[1]];
      if (!名 || !f) continue;
      出[名] = f.indexOf('/') === 0 ? f.slice(1) : ('xl/' + f);
      数++;
    }
    return 数 ? 出 : null;
  }

  return {
    板とファイル: 板とファイル, 板の記録: 板の記録,
    字体たち: 字体たち, 形たち: 形たち, 板の形: 板の形, 板の字体: 板の字体,
    組み込みの書式: 組み込みの書式, 組み込み書式: 組み込み書式,
    字体の記録: 字体の記録, 形の記録: 形の記録,
    形の始まり: 形の始まり, 形の終わり: 形の終わり,
  };
});
