/* vba-tejun.js — ★マクロから「手順」を 取り出す★（③レシピにして 会社に残す）
 *
 *  ★なぜ在るか（設計の正本 features.md の順番）★
 *    ①VBAの中身を読んで「何をしているか」を 日本語で言う …………… 出来た（lib/vba.js）
 *    ②同じ事を Exally で どう済ませるかを 1本ずつ出す ……………… 出来た（lib/vba-mikata.js）
 *    ③★レシピにして 会社に残す★＝★人ではなく 会社に残る★ ……… ここ
 *
 *  ★言葉は レシピ（lib/recipe.js）の 物を そのまま使う★＝2つ作らない
 *    使える種類 … 式の列を足す ／ 列の名前を変える ／ 列を消す ／ 並べ替え ／ 切り出す
 *
 *  ★一番 大事な決まり★
 *    ・★取り出せた分だけ 手順にする★。取り出せない行は ★「取り出せません」と 数で言う★。
 *      （黙って 少ない手順を 返すと ★出来たように 見えて 中身が 減る★＝合計が静かに小さくなる型）
 *    ・★当てずっぽうで 埋めない★。列の名前が 分からない式は ★手順にしない★（理由を残す）。
 *    ・★VBAは 動かさない★。読んで 写すだけ。
 *
 *  ★実物での 実測（2026-08-28・司さんの150本の中の マクロ入り5本）★
 *    手続き 14本のうち ★手順が 取り出せたのは 0本★。
 *    ＝この5本は「自分で作った入力画面」と「打ったら 別のシートへ 写す きっかけ」が中心で、
 *      並べ替え・列を消す・式を入れる を していない（★母数が 5本と 小さい事も 併せて 見る★）。
 *    ⇒ ★取り出せない時は ボタンを 出さない★（出来ていない物のボタンを 見せない）。
 */
(function (root) {
  'use strict';

  /** 列の字 → 番号（A=0） */
  function 列の番号(字) {
    var s = String(字 || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!s) return -1;
    var n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }
  /** 番号 → 列の字（0=A） */
  function 列の字(c) {
    var s = '';
    c = Number(c);
    if (!(c >= 0)) return '';
    while (c >= 0) { s = String.fromCharCode(65 + (c % 26)) + s; c = Math.floor(c / 26) - 1; }
    return s;
  }

  /* ══ ①1行が「表を いじっている行」か ══════════════════════
     ★分かった／分からなかった を 数えるための 母数★＝これを 決めないと
     「2つ 取り出せました」だけ言って ★残り18行を 黙って 落とす★事になる。 */
  var 効く行 = /(Range|Cells|Columns|Rows|Sheets|Worksheets|Selection|ActiveSheet|ActiveCell)\s*[.(]/i;
  var 読み飛ばす = /^\s*(Attribute\b|Option\b|Dim\b|Const\b|Set\s+\w+\s*=\s*(Sheets|Worksheets|ThisWorkbook|ActiveSheet)|'|Rem\b|End\s+(Sub|Function|Property|If|With)\b|If\b|Else|ElseIf\b|Next\b|Loop\b|With\b|Exit\b|On\s+Error|Application\.(ScreenUpdating|EnableEvents|Calculation|DisplayAlerts)|\s*$)/i;

  /* ══ ②1行を 手順に する ═════════════════════════════════ */

  /** 並べ替え … .Sort Key1:=Range("B2"), Order1:=xlDescending ／ SortFields.Add Key:=Range("B2:B9") */
  function 並べ替えを読む(行) {
    if (!/\.Sort\b|SortFields\.Add/i.test(行)) return null;
    var m = /Key1?\s*:=\s*(?:\w+\.)*Range\("([A-Z]+)\d*(?::[A-Z]+\d*)?"\)/i.exec(行);
    if (!m) {
      var c = /Key1?\s*:=\s*(?:\w+\.)*Cells\(\s*\d+\s*,\s*(\d+)\s*\)/i.exec(行);
      if (!c) return { だめ: '並べ替える列が 書かれていません' };
      m = [null, 列の字(Number(c[1]) - 1)];
    }
    var 降順 = /Order1?\s*:=\s*xlDescending/i.test(行);
    return { 手順: { 種類: '並べ替え', 列: String(m[1]).toUpperCase(), 向き: 降順 ? '降順' : '昇順' } };
  }

  /** 列を消す … Columns("C").Delete ／ Columns(3).Delete ／ Range("C:C").Delete */
  function 列を消すを読む(行) {
    if (!/\.Delete\b/i.test(行)) return null;
    if (/Rows\(|EntireRow/i.test(行)) return { だめ: '行を消す作業は まだ 手順に 出来ません' };
    var m = /Columns\(\s*"([A-Z]+)"\s*\)/i.exec(行);
    if (m) return { 手順: { 種類: '列を消す', 列: m[1].toUpperCase() } };
    var n = /Columns\(\s*(\d+)\s*\)/i.exec(行);
    if (n) return { 手順: { 種類: '列を消す', 列: 列の字(Number(n[1]) - 1) } };
    var r = /Range\("([A-Z]+):[A-Z]+"\)/i.exec(行);
    if (r) return { 手順: { 種類: '列を消す', 列: r[1].toUpperCase() } };
    if (/EntireColumn/i.test(行)) return { だめ: '消す列が どこかを 書いていません' };
    return null;
  }

  /** 見出しを書く … Range("E1").Value = "税込" ／ Cells(1, 5).Value = "税込" */
  function 見出しを読む(行) {
    var m = /Range\("([A-Z]+)1"\)\s*\.\s*Value\s*=\s*"([^"]+)"/i.exec(行);
    if (m) return { 列: m[1].toUpperCase(), 名: m[2] };
    var c = /Cells\(\s*1\s*,\s*(\d+)\s*\)\s*\.\s*Value\s*=\s*"([^"]+)"/i.exec(行);
    if (c) return { 列: 列の字(Number(c[1]) - 1), 名: c[2] };
    return null;
  }

  /** 式を入れる … Range("E2:E100").Formula = "=D2*1.1" */
  function 式を読む(行) {
    var m = /Range\("([A-Z]+)(\d+)(?::([A-Z]+)\d+)?"\)\s*\.\s*Formula(?:R1C1)?\s*=\s*"(=[^"]*)"/i.exec(行);
    if (!m) return null;
    var 列 = m[1].toUpperCase();
    if (m[3] && m[3].toUpperCase() !== 列) return { だめ: '式を入れる先が 1列では ありません' };
    var 始まり = Number(m[2]);
    var 式 = m[4];
    if (/R1C1/i.test(行)) return { だめ: 'R1C1の書き方の式は まだ 読めません' };
    /* ★行の番号を {行} に 置き換える★＝レシピは 1行ずつ 当てる形で 持つ。
       ★置き換えるのは「その式が 始まる行の番号」だけ★（他の数字を 触ると 式が 変わる）。 */
    var 直した = 式.replace(new RegExp('(\\$?[A-Z]{1,3}\\$?)' + 始まり + '(?![0-9])', 'g'), '$1{行}');
    return { 列: 列, 式: 直した, 動かした: 直した !== 式 };
  }

  /* ══ ③手続き1本を まるごと 読む ═══════════════════════════
     @param 手続き … vba-mikata の 手続きに切る() が返す 1本
     @returns {手順, 取り出せなかった, 数:{効く行, 分かった, 分からない}} */
  function 取り出す(手続き) {
    var 行たち = String((手続き && 手続き.中身) || '').split(/\r\n|\r|\n/);
    var 手順 = [], 取り出せなかった = [];
    var 効いた = 0;
    var 見出し = {};      /* 列 → 名前（式より 先に 書かれる事が 多い） */
    var 式待ち = [];      /* 見出しが まだ 見つかっていない式 */

    for (var i = 0; i < 行たち.length; i++) {
      var 行 = 行たち[i];
      if (読み飛ばす.test(行)) continue;
      if (!効く行.test(行)) continue;
      効いた++;

      var h = 見出しを読む(行);
      if (h) { 見出し[h.列] = h.名; 手順.push({ 種類: '列の名前を変える', 元: h.列, 新: h.名, 行: i + 1 }); continue; }

      var f = 式を読む(行);
      if (f) {
        if (f.だめ) { 取り出せなかった.push({ 行: i + 1, なぜ: f.だめ }); continue; }
        式待ち.push({ 列: f.列, 式: f.式, 行: i + 1 });
        continue;
      }

      var s = 並べ替えを読む(行);
      if (s) {
        if (s.だめ) { 取り出せなかった.push({ 行: i + 1, なぜ: s.だめ }); continue; }
        s.手順.行 = i + 1;
        手順.push(s.手順);
        continue;
      }

      var d = 列を消すを読む(行);
      if (d) {
        if (d.だめ) { 取り出せなかった.push({ 行: i + 1, なぜ: d.だめ }); continue; }
        d.手順.行 = i + 1;
        手順.push(d.手順);
        continue;
      }

      取り出せなかった.push({ 行: i + 1, なぜ: 'この書き方は まだ 手順に 出来ません' });
    }

    /* ★式は 列の名前と 組にして はじめて 手順になる★
       ＝名前が 分からない式を「列E」などと 勝手に 名づけない（当てずっぽうで 埋めない）。 */
    for (var k = 0; k < 式待ち.length; k++) {
      var w = 式待ち[k];
      var 名 = 見出し[w.列];
      if (!名) { 取り出せなかった.push({ 行: w.行, なぜ: 'この式の 列の名前が どこにも 書かれていません' }); continue; }
      /* 名前だけの手順は 式の手順に まとめる（同じ列に 2本 出さない） */
      for (var q = 手順.length - 1; q >= 0; q--) {
        if (手順[q].種類 === '列の名前を変える' && 手順[q].元 === w.列) { 手順.splice(q, 1); break; }
      }
      手順.push({ 種類: '式の列を足す', 見出し: 名, 式: w.式, 行: w.行 });
    }
    手順.sort(function (a, b) { return (a.行 || 0) - (b.行 || 0); });

    return {
      手順: 手順,
      取り出せなかった: 取り出せなかった,
      /* ★行の数と 手順の数は 別★（列の名前と 式は 2行で 1つの手順になる）。
         ★同じ数のように 書くと どちらかが 嘘になる★ので 分けて 持つ。 */
      数: {
        効く行: 効いた,
        読めた行: Math.max(0, 効いた - 取り出せなかった.length),
        読めない行: 取り出せなかった.length,
        手順: 手順.length,
      },
    };
  }

  /* ══ ④客に見せる 1行（★減った事を 隠さない★） ═══════════════ */
  function 知らせの字(出) {
    if (!出 || !出.数 || !出.数.効く行) return 'この中に 表をいじる所が 見つかりません。';
    if (!出.手順.length) {
      return '表をいじる所が ' + 出.数.効く行 + 'か所 ありますが、'
        + 'まだ 手順として 覚えられる書き方では ありません。';
    }
    var s = '表をいじる ' + 出.数.効く行 + 'か所のうち ' + 出.数.読めた行 + 'か所を 読めました。'
      + '手順は ' + 出.数.手順 + 'つです。';
    if (出.数.読めない行) {
      s += '残り ' + 出.数.読めない行 + 'か所は 読み取れていません（覚えるのは この ' + 出.数.手順 + 'つだけです）。';
    }
    return s;
  }

  /** 手順を 日本語の1行にする（見せる時だけ・当てるのは lib/recipe.js） */
  function 手順の字(t) {
    if (!t) return '';
    if (t.種類 === '並べ替え') return '列 ' + t.列 + ' で ' + (t.向き || '昇順') + 'に 並べ替える';
    if (t.種類 === '列を消す') return '列 ' + t.列 + ' を 空にする';
    if (t.種類 === '列の名前を変える') return '列 ' + t.元 + ' の名前を「' + t.新 + '」にする';
    if (t.種類 === '式の列を足す') return '「' + t.見出し + '」の列を 足す（' + t.式 + '）';
    if (t.種類 === '切り出す') return '1人分・何月分を 切り出す';
    return String(t.種類 || '');
  }

  var api = {
    取り出す: 取り出す,
    知らせの字: 知らせの字,
    手順の字: 手順の字,
    列の字: 列の字,
    列の番号: 列の番号,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VbaTejun = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
