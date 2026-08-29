/* ribbon.js — ★リボン（Excelと同じ配置・見せ方は うちの物）★ 2026-08-29
 *
 *  ★司さんの指示（2026-08-29）★
 *    「リボンは前から言うてるけど ★配置なども真似しろ★」
 *    「★訴えられんような見せ方で 同じように★」
 *    「★Excel全機能全能力が Exallyに 入って Excelの最上級に なる★」
 *
 *  ★ここで やる事★
 *    ・並び（タブ→グループ→部品）は ★lib/ribbon-spec.js（＝実Excelの正本）そのまま★
 *    ・★絵は 1つも 写さない★＝印は 字か 自作の形（spec の icon）／色は うちの緑
 *    ・★出来ていない物は ボタンを 出さない★（司さんの決まり）
 *      ただし ★グループの箱は 出す★＝「ここに 何が 来るか」が 分かる
 *      （＝並びの穴として 数えられる形に 残す）
 *
 *  ★スマホ★
 *    タブは 横に すべる。グループは 折り返す。★押す所は 44px 以上★。
 *
 *  依存: 無し（spec だけ）。画面に 差し込むのは 呼ぶ側。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Ribbon = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ★狭い画面では 最初から たたむ★（2026-08-29 実ブラウザで 測って 決めた）
     390px幅で 開いたまま だと リボンが 高さ110px を 占め、表が その分 隠れる。
     ★タブの帯（44px）は 出す★＝どこに 何が 在るかは 見える。 */
  var 狭い = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth <= 560 : false;
  var 状態 = { tab: 'ホーム', 開いている: !狭い };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ★部品の 見せ方★
   *  ・印（icon）は spec の物。無ければ 名前の 頭1文字。
   *  ・名前は そのまま 出す（人が 探せる為）。★末尾の … は 落とす★（うちは 窓を 開く）
   */
  function 名を短く(p) {
    return String(p).replace(/\.\.\.$/, '').replace(/…$/, '');
  }

  /* ★呼ぶのは 動作の層（RibbonActions）だけ★
   *  画面の関数を 直接 呼ぶ形に していたら、引数の数を 間違えて
   *  ★押しても 何も起きないボタン★を 作る所だった（2026-08-29 実際に 踏んだ）。
   *  ⇒ 呼び方は lib/ribbon-actions.js に 1か所で 書く。ここは その名前を 押すだけ。 */
  function 部品のHTML(it) {
    if (!it.a) return '';                       // ★出来ていない物は 出さない★
    /* ★元から 画面に 在る 作り込んだ物（サイズの入力・色の見本）は 引き取る★
       ＝作り直さない（配線も 見た目も そのまま 動く）。場所だけ 空けておく。 */
    if (it.a.取り込む) {
      return '<span class="rb-slot" data-take="' + esc(it.a.取り込む) + '"'
        + ' title="' + esc(名を短く(it.p)) + '"></span>';
    }
    var 印 = (it.a.icon || 名を短く(it.p).charAt(0));
    return '<button type="button" class="rb-item" title="' + esc(名を短く(it.p)) + '"'
      + ' data-act="' + esc(it.a.act) + '">'
      + '<span class="rb-ico">' + esc(印) + '</span>'
      + '<span class="rb-lbl">' + esc(名を短く(it.p)) + '</span>'
      + '</button>';
  }

  function グループのHTML(g) {
    var 中 = '';
    var 出した = 0;
    for (var i = 0; i < g.items.length; i++) {
      var h = 部品のHTML(g.items[i]);
      if (h) { 中 += h; 出した++; }
    }
    /* ★中身が 1つも 出せない箱★＝「ここに 何が 来るか」だけ 出す。
       ★偽のボタンは 出さない★（押せない物を 見せない） */
    if (!出した) {
      中 = '<span class="rb-yet">これから</span>';
    }
    return '<div class="rb-group" data-group="' + esc(g.name) + '"'
      + (出した ? '' : ' data-empty="1"') + '>'
      + '<div class="rb-items">' + 中 + '</div>'
      + '<div class="rb-gname">' + esc(g.name) + '</div>'
      + '</div>';
  }

  function タブのHTML(tabs) {
    var s = '';
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      s += '<button type="button" class="rb-tab' + (t.name === 状態.tab ? ' on' : '') + '"'
        + ' data-tab="' + esc(t.name) + '">' + esc(t.name) + '</button>';
    }
    return s;
  }

  /** ★引き取った物を 元の 置き場へ 戻す★
   *  描き直しは innerHTML で 作り直すので、先に 逃がさないと ★引き取った物ごと 消える★
   *  （2026-08-29 実ブラウザで 踏んだ＝タブを 押した途端に サイズの入力が 消えた）。 */
  function 逃がす(el) {
    if (!el || typeof document === 'undefined') return;
    var 置き場 = document.getElementById('rb-hold');
    if (!置き場) {
      置き場 = document.createElement('div');
      置き場.id = 'rb-hold';
      置き場.style.display = 'none';
      document.body.appendChild(置き場);
    }
    var 枠 = el.querySelectorAll('.rb-slot');
    for (var i = 0; i < 枠.length; i++) {
      while (枠[i].firstChild) 置き場.appendChild(枠[i].firstChild);
    }
  }

  /** 画面に 描く。spec は ribbon-spec.js（無ければ 何もしない） */
  function 描く(el, spec) {
    if (!el || !spec) return null;
    逃がす(el);                                  /* ★先に 逃がす★ */
    var tabs = spec.ツリー();
    var いま = null;
    for (var i = 0; i < tabs.length; i++) if (tabs[i].name === 状態.tab) いま = tabs[i];
    if (!いま && tabs.length) { いま = tabs[0]; 状態.tab = いま.name; }
    var 本体 = '';
    if (いま) for (var j = 0; j < いま.groups.length; j++) 本体 += グループのHTML(いま.groups[j]);
    /* ★クイック アクセス（元に戻す／やり直す）★
       Excelも ★リボンの外（上）★に 置いている。★288の 数には 入れない★（別物なので）。 */
    el.innerHTML =
      '<div class="rb-qat">'
        + '<button type="button" class="rb-q" data-act="元に戻す" title="元に戻す">↩</button>'
        + '<button type="button" class="rb-q" data-act="やり直す" title="やり直す">↪</button>'
        + '</div>'
      + '<div class="rb-tabs" role="tablist">' + タブのHTML(tabs)
        + '<button type="button" class="rb-fold" title="' + (状態.開いている ? 'たたむ' : 'ひらく') + '">'
        + (状態.開いている ? '▲' : '▼') + '</button></div>'
      + '<div class="rb-body"' + (状態.開いている ? '' : ' hidden') + '>' + 本体 + '</div>';
    /* タブの 押し込み（onclick を 文字で 書かない＝中の名前に 依らない） */
    var bs = el.querySelectorAll('.rb-tab');
    for (var k = 0; k < bs.length; k++) {
      bs[k].addEventListener('click', (function (名) {
        return function () { 状態.tab = 名; 状態.開いている = true; 描く(el, spec); };
      }(bs[k].getAttribute('data-tab'))));
    }
    var f = el.querySelector('.rb-fold');
    if (f) f.addEventListener('click', function () { 状態.開いている = !状態.開いている; 描く(el, spec); });
    /* ★部品の 押し込み★＝動作の層を 名前で 引く（画面の関数を 直接 呼ばない）
       クイックアクセス（.rb-q）も 同じ 仕組みで 動かす。 */
    var its = el.querySelectorAll('.rb-item, .rb-q');
    for (var m = 0; m < its.length; m++) {
      its[m].addEventListener('click', (function (名) {
        return function () {
          try {
            var A = (typeof window !== 'undefined') ? window.RibbonActions : null;
            if (A && typeof A[名] === 'function') A[名]();
            else if (typeof console !== 'undefined') console.warn('リボン: 働きが 無い ' + 名);
          } catch (e) { if (typeof console !== 'undefined') console.warn(e); }
        };
      }(its[m].getAttribute('data-act'))));
    }
    /* ★元から 在る物を 引き取る★（作り直さない＝配線が 生きたまま 動く） */
    var 枠 = el.querySelectorAll('.rb-slot');
    for (var q = 0; q < 枠.length; q++) {
      var どこ = 枠[q].getAttribute('data-take');
      var 物 = null;
      try { 物 = (typeof document !== 'undefined') ? document.querySelector(どこ) : null; } catch (e) { 物 = null; }
      if (物) 枠[q].appendChild(物);
      else 枠[q].parentNode.removeChild(枠[q]);   /* ★無ければ 空の枠を 残さない★ */
    }
    return { tab: 状態.tab, 開いている: 状態.開いている };
  }

  /** 数える（画面に 出した数／全部） */
  function 数える(spec) {
    var n = spec.数える();
    return { 全: n.全, 出せる: n.有, まだ: n.無 };
  }

  return { 描く: 描く, 数える: 数える, 状態: 状態, _部品のHTML: 部品のHTML, _名を短く: 名を短く, _逃がす: 逃がす };
}));
