/* ribbon-actions.js — ★リボンの ボタン1つ1つの 働き★ 2026-08-29
 *
 *  ★なぜ 間に 1枚 挟むか（★実際に 踏んだ★）★
 *    最初 リボンから 画面の関数を ★直接★ 呼ぶ形に した。すると:
 *      applyFormat は 引数が ★2つ★（key, value）なのに 1つで 呼んでいた
 *      openColorPalette は ★event★ を 取るのに 文字を 渡していた
 *    ⇒ ★押しても 何も起きないボタン★が 出来る所だった
 *      （「行き先の関数が 在るか」だけ 見ていて 気づけなかった）
 *    ⇒ ★呼び方を ここに 1か所で 書く★。試験は ★実際に 押して 画面が 変わったか★ を 見る。
 *
 *  ★決まり★
 *    ・1つの働き＝1つの関数（引数は 取らない）
 *    ・画面の関数が 無い時は ★何もしない★（落ちない）
 *    ・★出来ていない物は ここに 書かない★＝リボンに ボタンが 出ない
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RibbonActions = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function W() { return (typeof window !== 'undefined') ? window : {}; }
  function 呼ぶ(名) {
    var f = W()[名];
    if (typeof f !== 'function') return false;
    var 引数 = Array.prototype.slice.call(arguments, 1);
    f.apply(null, 引数);
    return true;
  }

  var A = {
    /* ── クリップボード ── */
    貼り付け:   function () { return 呼ぶ('ctxPaste'); },
    切り取り:   function () { return 呼ぶ('ctxCut'); },
    コピー:     function () { return 呼ぶ('ctxCopy'); },

    /* ── フォント ── */
    太字:       function () { return 呼ぶ('toggleFormat', 'bold'); },
    斜体:       function () { return 呼ぶ('toggleFormat', 'italic'); },
    下線:       function () { return 呼ぶ('toggleFormat', 'underline'); },
    取り消し線: function () { return 呼ぶ('toggleFormat', 'strike'); },
    罫線:       function () { return 呼ぶ('applyBorderAll'); },
    下罫線:     function () { return 呼ぶ('applyFormat', 'borderBottom', true); },
    塗りつぶしの色: function () { return 呼ぶ('openColorPalette', null, 'bg'); },
    フォントの色:   function () { return 呼ぶ('openColorPalette', null, 'fg'); },
    黄色で塗る:     function () { return 呼ぶ('applyFormat', 'bg', '#FFFF00'); },
    赤い字にする:   function () { return 呼ぶ('applyFormat', 'color', '#FF0000'); },
    フォントの設定: function () { return 呼ぶ('openFmtModal'); },
    /* サイズは 画面の 入力欄を 動かす（1か所で 持つ） */
    字を大きく: function () { return _サイズ(1); },
    字を小さく: function () { return _サイズ(-1); },

    /* ── 配置 ── */
    左揃え:     function () { return 呼ぶ('applyFormat', 'align', 'left'); },
    中央揃え:   function () { return 呼ぶ('applyFormat', 'align', 'center'); },
    右揃え:     function () { return 呼ぶ('applyFormat', 'align', 'right'); },
    上揃え:     function () { return 呼ぶ('applyFormat', 'valign', 'top'); },
    上下中央:   function () { return 呼ぶ('applyFormat', 'valign', 'middle'); },
    下揃え:     function () { return 呼ぶ('applyFormat', 'valign', 'bottom'); },
    折り返す:   function () { return 呼ぶ('applyFormat', 'wrap', true); },
    結合して中央: function () { return 呼ぶ('applyMergeCells'); },
    字下げを増やす: function () { return 呼ぶ('applyIndent', 1); },
    字下げを減らす: function () { return 呼ぶ('applyIndent', -1); },
    配置の設定: function () { return 呼ぶ('openFmtModal'); },

    /* ── 数値 ── */
    書式の設定:     function () { return 呼ぶ('openFmtModal'); },
    小数を増やす:   function () { return 呼ぶ('toggleDecimal'); },
    パーセント:     function () { return 呼ぶ('applyFormat', 'numFmt', '0%'); },
    桁区切り:       function () { return 呼ぶ('applyFormat', 'numFmt', '#,##0'); },
    通貨:           function () { return 呼ぶ('applyFormat', 'numFmt', '¥#,##0'); },

    /* ── スタイル ── */
    条件付き書式:   function () { return 呼ぶ('openCondFormat'); },

    /* ── セル ── */
    行を挿入:   function () { return 呼ぶ('ctxInsertRow'); },
    行を削除:   function () { return 呼ぶ('ctxDeleteRow'); },
    列を挿入:   function () { return 呼ぶ('ctxInsertCol'); },
    列を削除:   function () { return 呼ぶ('ctxDeleteCol'); },

    /* ── 編集 ── */
    検索と選択: function () { return 呼ぶ('findNextCell'); },
    元に戻す:   function () { return 呼ぶ('doUndo'); },
    やり直す:   function () { return 呼ぶ('doRedo'); },
    オートSUM:  function () { return 呼ぶ('autoSum'); },
    /* ★フィル★＝Excelの「フィル ▼」。うちは 上から／左から の 2つ（Ctrl+D / Ctrl+R と 同じ物） */
    上から写す: function () { return 呼ぶ('fillFromEdge', 'down'); },
    左から写す: function () { return 呼ぶ('fillFromEdge', 'right'); },
    /* ★クリア★＝実Excelで 測った 3通り（中身だけ／書式だけ／すべて） */
    中身を消す: function () { return 呼ぶ('中身を消す'); },
    書式を消す: function () { return 呼ぶ('書式を消す'); },
    すべて消す: function () { return 呼ぶ('すべて消す'); },

    /* ── 数式 ── */
    関数の挿入: function () { return 呼ぶ('openFnPalette'); },
    /* ★関数ライブラリの 分類★＝Excelの 財務／論理／文字列／日付／検索／数学 に 当てる。
       うちの分類（FN_CATS）に 無い物（財務・エンジニアリング…）は ★作っていないので 結ばない★ */
    論理の関数:     function () { return 呼ぶ('openFnPalette', '論理'); },
    文字列の関数:   function () { return 呼ぶ('openFnPalette', '文字列'); },
    日付の関数:     function () { return 呼ぶ('openFnPalette', '日付'); },
    検索の関数:     function () { return 呼ぶ('openFnPalette', '検索'); },
    数学の関数:     function () { return 呼ぶ('openFnPalette', '数学'); },
    その他の関数:   function () { return 呼ぶ('openFnPalette', 'その他'); },

    /* ── データ ── */
    昇順:       function () { return 呼ぶ('sortRange', 'asc'); },
    降順:       function () { return 呼ぶ('sortRange', 'desc'); },
    絞り込む:   function () { return 呼ぶ('filterByValue'); },
    絞り込みを解除: function () { return 呼ぶ('clearFilter'); },
    入力の決まり:   function () { return 呼ぶ('openValid'); },

    /* ── 数式（ワークシート分析・計算方法）── */
    数式の表示:       function () { return 呼ぶ('数式の表示を切り替える'); },
    すべて再計算:     function () { return 呼ぶ('すべて再計算'); },
    このシートを再計算: function () { return 呼ぶ('このシートを再計算'); },
    エラーチェック:   function () { return 呼ぶ('openShindan'); },

    /* ── 数式（定義された名前）── */
    名前の定義:       function () { return 呼ぶ('名前の窓を開く'); },
    名前の管理:       function () { return 呼ぶ('名前の窓を開く'); },

    /* ── データ ── */
    重複の削除:       function () { return 呼ぶ('重複を削除'); },
    区切り位置:       function () { return 呼ぶ('区切り位置を開く'); },

    /* ── 表示 ── */
    枠を固定:   function () { return 呼ぶ('freezePanes'); },
    固定をやめる: function () { return 呼ぶ('unfreezePanes'); },
    ズーム100:  function () { return 呼ぶ('ズーム100'); },
    マクロ:     function () { return 呼ぶ('openMacro'); },

    /* ── 挿入（グラフ）── */
    /* ★実Excel実測＝既定は 集合縦棒／360×216／凡例は 系列2本以上／タイトルは 出す★
       うちに 無い形（階層・統計・散布図・マップ…）は ★結ばない＝ボタンを 出さない★ */
    縦棒グラフ:   function () { return 呼ぶ('グラフを作る', 'column'); },
    折れ線グラフ: function () { return 呼ぶ('グラフを作る', 'line'); },
    円グラフ:     function () { return 呼ぶ('グラフを作る', 'pie'); },

    /* ── ページ レイアウト ── */
    印刷:       function () { return 呼ぶ('printSheet'); },
  };

  /* 字の大きさ＝画面の 入力欄を 1か所で 動かす */
  function _サイズ(delta) {
    var d = (typeof document !== 'undefined') ? document : null;
    if (!d) return false;
    var el = d.getElementById('fmt-font-size');
    if (!el) return false;
    var 今 = parseInt(el.value, 10) || 12;
    var 次 = Math.max(6, Math.min(72, 今 + delta));
    if (次 === 今) return true;
    el.value = String(次);
    if (typeof el.onblur === 'function') el.onblur({ target: el });
    else if (typeof W().applyFormat === 'function') W().applyFormat('fontSize', 次);
    return true;
  }

  return A;
}));
