/* chart.js — ★グラフ（縦棒・折れ線・円）★ 2026-08-29
 *
 *  ★司さん「Excel全機能全能力が Exallyに 入って Excelの最上級に なる」★
 *  Excelの「挿入」タブの 中心は グラフ（11個）。まず ★よく使う3つ★ から。
 *
 *  ★真値（実Excel 16.0 で 実測 2026-08-29）★
 *    ・既定の 種類 … ★51 = 集合縦棒★
 *    ・既定の 大きさ … ★幅 360 × 高さ 216★（ポイント）
 *    ・凡例 … ★系列が 1本なら 出さない★（HasLegend=False）
 *    ・タイトル … ★出す★（HasTitle=True）
 *    ・系列の 名前 … 見出しが 無ければ「系列1」
 *
 *  ★見せ方（司さん「訴えられんような見せ方で 同じように」）★
 *    ・★Excelの 絵・配色は 1つも 写さない★。色は うちの緑の並び。
 *    ・描くのは ★自前の canvas★（外の部品を 1つも 読み込まない）。
 *
 *  ★出来ない事は 黙らない★＝数が 1つも 無い時は 作らずに 理由を 返す。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Chart = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ★うちの色★（Excelの 配色は 使わない） */
  var 色 = ['#3D9E72', '#52B788', '#2E7D54', '#7A9A87', '#C8ECD8', '#1A2B22'];

  var 既定 = { 幅: 360, 高さ: 216 };   /* 実Excelの 実測値 */

  /** 選んだ範囲から グラフの 材料を 作る
   *  @param 表 … [[値,…],…]（選んだ範囲の 中身。左上から）
   *  返り値: { ok, なぜ, 見出し[], 系列[{名, 値[]}] } */
  function 材料を作る(表) {
    if (!表 || !表.length || !表[0] || !表[0].length) return { ok: false, なぜ: '選んだ所に 何も ありません' };
    var 高 = 表.length, 幅 = 表[0].length;
    /* 1列目が 字なら 見出し（Excelと 同じ 見立て） */
    var 左が見出し = false;
    for (var r = 0; r < 高; r++) {
      var v = 表[r][0];
      if (v !== null && v !== undefined && v !== '' && !数か(v)) { 左が見出し = true; break; }
    }
    /* 1行目が 字なら 系列の 名前 */
    var 上が名前 = false;
    for (var c = 左が見出し ? 1 : 0; c < 幅; c++) {
      var v2 = 表[0][c];
      if (v2 !== null && v2 !== undefined && v2 !== '' && !数か(v2)) { 上が名前 = true; break; }
    }
    var 始行 = 上が名前 ? 1 : 0;
    var 始列 = 左が見出し ? 1 : 0;
    if (始行 >= 高 || 始列 >= 幅) return { ok: false, なぜ: '数が 1つも ありません' };

    var 見出し = [];
    for (var r2 = 始行; r2 < 高; r2++) {
      見出し.push(左が見出し ? String(表[r2][0] == null ? '' : 表[r2][0]) : String(r2 - 始行 + 1));
    }
    var 系列 = [];
    for (var c2 = 始列; c2 < 幅; c2++) {
      var 値 = [], 数あり = false;
      for (var r3 = 始行; r3 < 高; r3++) {
        var n = 数にする(表[r3][c2]);
        値.push(n);
        if (n !== null) 数あり = true;
      }
      if (!数あり) continue;
      系列.push({
        名: 上が名前 ? String(表[0][c2] == null ? '' : 表[0][c2]) : ('系列' + (系列.length + 1)),
        値: 値,
      });
    }
    if (!系列.length) return { ok: false, なぜ: '数が 1つも ありません' };
    return { ok: true, 見出し: 見出し, 系列: 系列 };
  }

  function 数か(v) { return 数にする(v) !== null; }
  function 数にする(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).replace(/[,¥￥\s]/g, '');
    if (s === '') return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  /** canvas に 描く
   *  @param 種類 … 'column' | 'line' | 'pie' */
  function 描く(ctx, 材料, 種類, 幅, 高, 題) {
    if (!ctx || !材料 || !材料.ok) return false;
    var W = 幅 || 既定.幅, H = 高 || 既定.高さ;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#C8ECD8'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    /* ★タイトルは 出す★（実Excelの 既定と 同じ） */
    var 上 = 8;
    if (題) {
      ctx.fillStyle = '#2E7D54';
      ctx.font = 'bold 13px "Noto Sans JP",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(String(題), W / 2, 上);
      上 += 20;
    }
    /* ★凡例は 系列が 2本以上の時だけ★（実Excelの 既定と 同じ） */
    var 凡例の高 = 0;
    if (材料.系列.length >= 2) {
      凡例の高 = 18;
      ctx.font = '11px "Noto Sans JP",sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      var x = 10;
      for (var i = 0; i < 材料.系列.length; i++) {
        ctx.fillStyle = 色[i % 色.length];
        ctx.fillRect(x, H - 14, 10, 10);
        ctx.fillStyle = '#333333';
        ctx.fillText(材料.系列[i].名, x + 14, H - 9);
        x += 14 + ctx.measureText(材料.系列[i].名).width + 12;
      }
    }
    if (種類 === 'pie') return _円(ctx, 材料, W, H, 上, 凡例の高);
    return _棒か線(ctx, 材料, 種類 === 'line' ? 'line' : 'column', W, H, 上, 凡例の高);
  }

  function _棒か線(ctx, 材料, 種類, W, H, 上, 凡例の高) {
    var 左 = 44, 右 = 10, 下 = 24 + 凡例の高;
    var 図幅 = W - 左 - 右, 図高 = H - 上 - 下;
    if (図幅 <= 10 || 図高 <= 10) return false;

    var 最大 = 0, 最小 = 0;
    for (var i = 0; i < 材料.系列.length; i++) {
      for (var j = 0; j < 材料.系列[i].値.length; j++) {
        var v = 材料.系列[i].値[j];
        if (v === null) continue;
        if (v > 最大) 最大 = v;
        if (v < 最小) 最小 = v;
      }
    }
    if (最大 === 最小) 最大 = 最小 + 1;
    var 目盛 = function (v) { return 上 + 図高 - (v - 最小) / (最大 - 最小) * 図高; };

    /* 目盛の 線と 数 */
    ctx.strokeStyle = '#D4EDE1'; ctx.fillStyle = '#7A9A87';
    ctx.font = '10px "Noto Sans JP",sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var k = 0; k <= 4; k++) {
      var v2 = 最小 + (最大 - 最小) * k / 4;
      var y = 目盛(v2);
      ctx.beginPath(); ctx.moveTo(左, y); ctx.lineTo(W - 右, y); ctx.stroke();
      ctx.fillText(String(Math.round(v2 * 100) / 100), 左 - 4, y);
    }
    var 個数 = 材料.見出し.length;
    var 一枠 = 図幅 / Math.max(1, 個数);

    if (種類 === 'column') {
      var 本数 = 材料.系列.length;
      var 棒幅 = Math.max(2, (一枠 * 0.7) / 本数);
      for (var s = 0; s < 本数; s++) {
        ctx.fillStyle = 色[s % 色.length];
        for (var n = 0; n < 個数; n++) {
          var v3 = 材料.系列[s].値[n];
          if (v3 === null) continue;
          var x = 左 + 一枠 * n + (一枠 - 棒幅 * 本数) / 2 + 棒幅 * s;
          var y0 = 目盛(Math.max(0, 最小)), y1 = 目盛(v3);
          ctx.fillRect(x, Math.min(y0, y1), 棒幅, Math.abs(y1 - y0) || 1);
        }
      }
    } else {
      for (var s2 = 0; s2 < 材料.系列.length; s2++) {
        ctx.strokeStyle = 色[s2 % 色.length]; ctx.lineWidth = 2;
        ctx.beginPath();
        var 打った = false;
        for (var n2 = 0; n2 < 個数; n2++) {
          var v4 = 材料.系列[s2].値[n2];
          if (v4 === null) continue;
          var x2 = 左 + 一枠 * n2 + 一枠 / 2, y2 = 目盛(v4);
          if (!打った) { ctx.moveTo(x2, y2); 打った = true; } else ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
    }
    /* 下の 見出し */
    ctx.fillStyle = '#333333'; ctx.font = '10px "Noto Sans JP",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var m = 0; m < 個数; m++) {
      ctx.fillText(材料.見出し[m], 左 + 一枠 * m + 一枠 / 2, 上 + 図高 + 4);
    }
    return true;
  }

  function _円(ctx, 材料, W, H, 上, 凡例の高) {
    var 値 = 材料.系列[0].値;
    var 合計 = 0;
    for (var i = 0; i < 値.length; i++) if (値[i] !== null && 値[i] > 0) 合計 += 値[i];
    if (!合計) return false;
    var cx = W / 2, cy = 上 + (H - 上 - 凡例の高 - 8) / 2;
    var r = Math.min(W, H - 上 - 凡例の高) / 2 - 12;
    var 角 = -Math.PI / 2;
    for (var j = 0; j < 値.length; j++) {
      var v = 値[j];
      if (v === null || v <= 0) continue;
      var 幅角 = v / 合計 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, 角, 角 + 幅角);
      ctx.closePath();
      ctx.fillStyle = 色[j % 色.length]; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
      角 += 幅角;
    }
    return true;
  }

  return { 材料を作る: 材料を作る, 描く: 描く, 既定: 既定, 色: 色, _数にする: 数にする };
}));
