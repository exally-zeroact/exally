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
  var 状態 = { tab: 'ホーム', 開いている: !狭い, キー中: null };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ★部品の 見せ方★
   *  ・印（icon）は spec の物。無ければ 名前の 頭1文字。
   *  ・★札は lib/ribbon-label.js が 決める★＝箱に 収まる 長さに して、
   *    ★頭が 同じ名前どうしが 画面で 同じに 見えない ように する★
   *    （2026-08-30 監査役の 差し戻し＝「ウィンドウ…」が 3つ 並んでいた）
   *  ・★元の 名前は 消さない★＝title（当てると 出る）に 全部 残す
   */
  var ラベル = (typeof module === 'object' && module.exports)
    ? require('./ribbon-label.js')
    : ((typeof self !== 'undefined' ? self : this).RibbonLabel);

  /* ★どこまで 作るかの 正本★（bind も 画面も この1本を 見る） */
  var 範囲 = (typeof module === 'object' && module.exports)
    ? require('./ribbon-scope.js')
    : ((typeof self !== 'undefined' ? self : this).RibbonScope);

  /* ★Alt の キー（実 Excel を 測った 物）★
     事務の人は ★指が 覚えている★（Alt,H,1＝太字／Alt,H,A,L＝左揃え）。
     ★うちで 勝手に 決めない★＝lib/ribbon-keys.js に 在る 物だけ。 */
  var 鍵 = (typeof module === 'object' && module.exports)
    ? require('./ribbon-keys.js')
    : ((typeof self !== 'undefined' ? self : this).RibbonKeys);
  var キー木 = (typeof module === 'object' && module.exports)
    ? require('./ribbon-keytips.js')
    : ((typeof self !== 'undefined' ? self : this).RibbonKeytips);

  /* ★組の 右下の ↘（起動ツール）★＝どの 組の ↘ が どの 窓を 開くか の 正本 */
  var 起動 = (typeof module === 'object' && module.exports)
    ? require('./ribbon-launcher.js')
    : ((typeof self !== 'undefined' ? self : this).RibbonLauncher);

  function 名を短く(p) {
    return String(p).replace(/\.\.\.$/, '').replace(/…$/, '');
  }

  /** ★画面に 出す 札★（箱に 収まる 短い物） */
  function 札にする(it, n) {
    if (!ラベル) return 名を短く(it.p);
    return ラベル.札(it.p, it.t, it.g, n);
  }

  /* ★呼ぶのは 動作の層（RibbonActions）だけ★
   *  画面の関数を 直接 呼ぶ形に していたら、引数の数を 間違えて
   *  ★押しても 何も起きないボタン★を 作る所だった（2026-08-29 実際に 踏んだ）。
   *  ⇒ 呼び方は lib/ribbon-actions.js に 1か所で 書く。ここは その名前を 押すだけ。 */
  function 部品のHTML(it, n) {
    if (!it.a) return '';                       // ★出来ていない物は 出さない★
    var 元 = 名を短く(it.p);                     // ★当てると 出る 字＝元の名前のまま★
    var 札 = 札にする(it, n || 1);               // ★画面に 描く 字＝短い物★
    /* ★元から 画面に 在る 作り込んだ物（サイズの入力・色の見本）は 引き取る★
       ＝作り直さない（配線も 見た目も そのまま 動く）。場所だけ 空けておく。 */
    if (it.a.取り込む) {
      return '<span class="rb-slot" data-take="' + esc(it.a.取り込む) + '"'
        + ' title="' + esc(元) + '"></span>';
    }
    var 印 = (it.a.icon || 札.charAt(0));
    var 順 = 鍵 && 鍵.部品の鍵 ? 鍵.部品の鍵(it.t, 元) : null;
    return '<button type="button" class="rb-item" title="' + esc(元) + '"'
      + (順 ? ' data-key="' + esc(順.join(',')) + '"' : '')
      + ' data-act="' + esc(it.a.act) + '">'
      + '<span class="rb-ico">' + esc(印) + '</span>'
      + '<span class="rb-lbl">' + esc(札) + '</span>'
      + '</button>';
  }

  function グループのHTML(g, タブ名) {
    /* ★(c) そもそも 押す物では ない 組は 出さない★（2026-08-30 監査役の 決め）
       ＝Excelの 状態表示や、下のシート見出しの 写り込み。 */
    if (範囲 && 範囲.出さない理由(タブ名, g.name)) return '';

    var 中 = '';
    var 出した = 0;
    var 何個目 = {};                             // ★同じ名前が 2つ 在る所を 見分ける★
    for (var i = 0; i < g.items.length; i++) {
      /* ★その組の ↘ そのものは 中に 出さない★ 2026-09-03
         ＝実Excel では 組の 下端の Button（上=321）＝★↘ として 右下に 1つ 描く物★。
         中にも 出すと ★同じ字が 2つ 並ぶ★（ページ レイアウトで「ページ設定」が 3つに 見えた）。
         正本：lib/ribbon-launcher.js の 実の起動ツール（実測 8個） */
      if (起動 && 起動.起動の品か && 起動.起動の品か(タブ名, g.name, g.items[i].p)) continue;
      var 元名 = 名を短く(g.items[i].p);
      何個目[元名] = (何個目[元名] || 0) + 1;
      var h = 部品のHTML(g.items[i], 何個目[元名]);
      if (h) { 中 += h; 出した++; }
    }
    /* ★中身が 1つも 出せない箱★＝「ここに 何が 来るか」だけ 出す。
       ★偽のボタンは 出さない★（押せない物を 見せない）
       ★ただし (a)これから と (b)付けません を 分ける★
       ＝作らないと 決めた物に「これから」と 書くのは ★守れない 約束★
       （2026-08-30 監査役が 絵を 見て 見つけた）。 */
    /* ★組の 右下の 印（↘ / ▾ / ▼）★
       ★中身の 判定より 先に 引く★ 2026-09-03
       ＝★中身が ↘ だけの 組が 在る★（ページ レイアウト｜シートのオプション）。
       後で 引くと ★「これから」と 出て ↘ が 消える★（実際に そう なった）。 */
    var 開く印 = '';
    var A = (typeof window !== 'undefined') ? window.RibbonActions : null;
    var 先 = 起動 ? 起動.引く(タブ名, g.name, A) : null;
    if (先) {
      /* ★2026-09-03＝3種類を 1つの箱に 混ぜていたのを 分けた★
         ↘ 起動ツール（組の 下端の Button・実測8個）
         ▾ その他のオプション（組の 中の メニュー・15個）
         ▼ コンボの 開く（入力欄の 右・1個）
         ★どれも 実Excel の 画面に 在る＝消さずに 印を 分ける★ */
      var 印文字 = (先.印 === '▾') ? '&#x25BE;' : (先.印 === '▼') ? '&#x25BC;' : '&#x2198;';
      var 種類名 = (先.印 === '▾') ? 'more' : (先.印 === '▼') ? 'combo' : 'dlg';
      開く印 = '<button type="button" class="rb-launch rb-launch-' + 種類名 + '"'
        + ' data-act="' + esc(先.先) + '" data-mark="' + esc(先.印 || '↘') + '"'
        + ' title="' + esc(先.Excel + '（' + 先.先 + '）') + '"'
        + ' aria-label="' + esc(先.先) + '">' + 印文字 + '</button>';
    }
    /* ★印だけの 組も「中身が 在る」と 数える★（押せる物が 1つ 在るので） */
    if (!出した && 開く印) 出した = 1;

    var 種 = 'yet';
    if (!出した) {
      var 理由 = null;
      if (範囲) {
        var 全部が外 = g.items.length > 0;
        for (var y = 0; y < g.items.length; y++) {
          var r = 範囲.付けない理由(タブ名, g.name, g.items[y].p);
          if (!r) { 全部が外 = false; break; }
          if (!理由) 理由 = r;                    /* 先頭の 1行だけ 見せる */
        }
        if (!全部が外) 理由 = null;
      }
      if (理由) {
        種 = 'no';
        中 = '<span class="rb-no" title="' + esc(理由) + '">付けません'
           + '<em class="rb-why">' + esc(理由) + '</em></span>';
      } else {
        中 = '<span class="rb-yet">これから</span>';
      }
    }
    /* ★印（↘/▾/▼）は 上で 先に 引いてある★
       ★開く先が 無い 印は 出さない★（押しても 何も 起きない 印を 見せない）。
       中身の 正本：lib/ribbon-launcher.js ／ 見張り：tests/ribbon-launcher.test.mjs */
    return '<div class="rb-group" data-group="' + esc(g.name) + '"'
      + (出した ? '' : ' data-empty="' + 種 + '"') + '>'
      + '<div class="rb-items">' + 中 + '</div>'
      + '<div class="rb-gname">' + esc(ラベル ? ラベル.組札(g.name) : g.name) + 開く印 + '</div>'
      + '</div>';
  }

  function タブのHTML(tabs) {
    var s = '';
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var タ順 = 鍵 && 鍵.タブの鍵 ? 鍵.タブの鍵(t.name) : null;
      s += '<button type="button" class="rb-tab' + (t.name === 状態.tab ? ' on' : '') + '"'
        + (タ順 ? ' data-key="' + esc(タ順.join(',')) + '"' : '')
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
  /* ===== ★Alt の キー（キーヒント）★ ===================================
   *
   *  ★実 Excel と 同じ 手順★
   *    Alt を 押す → ★札が 出る★（タブに H・N・P …）
   *    字を 打つ   → タブが 変わる＋そのタブの 札が 出る
   *    打ち続ける → その 部品を ★押す★
   *    Esc / Alt / 外れ字 → やめる
   *
   *  ★打っている 途中は 表に 字を 入れない★
   *    （実 Excel も 同じ。ここを 漏らすと ★セルに H と 入る★）
   *
   *  ★作っていない 物に キーを 付けない★
   *    → 木に 入っているのは ★つないだ 物だけ★（lib/ribbon-keytips.js）
   */
  var 木 = null;
  var 待ち = false;   /* ★Alt を 押したが まだ 離していない★ */
  function 木を作る(spec) {
    if (木) return 木;
    if (!鍵 || !キー木 || !spec) return null;
    木 = キー木.作る(鍵, spec.ITEMS, 範囲);
    return 木;
  }

  /** 今 打てる 字だけに 札を 出す（★出すのは 進める 字だけ★） */
  function 札を描く(el) {
    var 古 = el.querySelectorAll('.rb-tip');
    for (var i = 古.length - 1; i >= 0; i--) 古[i].parentNode.removeChild(古[i]);
    var 中 = 状態.キー中;
    if (!中) { el.classList.remove('rb-keying'); return; }
    el.classList.add('rb-keying');
    var 打った = 中.打った.join(',');
    /* ★Alt を 押した 直後は ★タブだけ★★
       （実 Excel も そう。全部の ボタンに「H」を 出すと
        ★同じ字が 45個 並んで 読めない★。2026-08-31 実ブラウザで 見た） */
    var もの = el.querySelectorAll(中.打った.length === 0 ? '.rb-tab[data-key]' : '.rb-item[data-key]');
    for (var j = 0; j < もの.length; j++) {
      var 全 = もの[j].getAttribute('data-key').toUpperCase().split(',');
      /* ★今まで 打った 分が 先頭で 一致する 物だけ★ */
      var 合う = true;
      for (var k = 0; k < 中.打った.length; k++) if (全[k] !== 中.打った[k]) { 合う = false; break; }
      if (!合う || 全.length <= 中.打った.length) continue;
      var b = document.createElement('span');
      b.className = 'rb-tip';
      /* ★残り 全部を 出す★（実 Excel と 同じ：左揃えは「AL」と 出る）
         1字だけだと ★F が 5つ 並ぶ★＝どれが どれか 分からない */
      b.textContent = 全.slice(中.打った.length).join('');
      もの[j].appendChild(b);
    }
  }

  function キーをやめる(el) { 状態.キー中 = null; 札を描く(el); }

  /** ★キーを 1つ 受ける★
   *  @return true なら ★こちらで 使った★（呼ぶ側は preventDefault する） */
  function キーを受ける(el, spec, e) {
    if (!el || !spec || !e) return false;
    var 根 = 木を作る(spec);
    if (!根) return false;

    /* ★Alt は 「★離した 時★」に 出す★（Windows も Excel も この形）
       ★押した 瞬間に 出すと ★Alt＋= の 「=」を 食べてしまう★
       （2026-08-31 実ブラウザで ★自分で 壊した★＝オートSUM が 効かなくなった）
       ⇒ 押しただけでは 何も しない。途中で 別の キーが 来たら ★取り消す★。 */
    if (e.type === 'keydown' && e.key === 'Alt') {
      if (!状態.キー中) 待ち = true;
      return false;                                 /* ★止めない★＝Alt＋○○ は 下の層へ */
    }
    if (e.type === 'keyup' && e.key === 'Alt') {
      if (状態.キー中) { キーをやめる(el); 待ち = false; return true; }
      if (!待ち) return false;
      待ち = false;
      状態.キー中 = { 節: 根, 打った: [] };
      状態.開いている = true;
      return true;                                  /* 描き直しは 呼ぶ側 */
    }
    if (e.type === 'keydown') 待ち = false;         /* ★Alt＋別のキー★＝札は 出さない */
    if (e.type !== 'keydown') return false;
    if (!状態.キー中) return false;             /* 打っていない→何も しない */
    if (e.key === 'Escape') { キーをやめる(el); return true; }
    if (e.key === 'Backspace') {                    /* 1つ 戻る */
      状態.キー中 = { 節: 根, 打った: [] };
      札を描く(el); return true;
    }
    if (!e.key || e.key.length !== 1) return false; /* 矢印などは 見見する */

    var r = キー木.進む(状態.キー中.節, e.key);
    if (r.どうする === '外れ') { キーをやめる(el); return true; }
    状態.キー中 = { 節: r.節, 打った: 状態.キー中.打った.concat([String(e.key).toUpperCase()]) };
    if (r.どうする === '押す') {
      var 名 = r.節.動作;
      キーをやめる(el);
      動かす(名);
      return true;
    }
    if (r.どうする === 'タブ') { 状態.tab = r.節.タブ; 状態.開いている = true; }
    return true;
  }

  /** 名前で 動作を 呼ぶ（押し込みと 同じ 1か所） */
  function 動かす(名) {
    try {
      var A = (typeof window !== 'undefined') ? window.RibbonActions : null;
      if (A && typeof A[名] === 'function') A[名]();
      else if (typeof console !== 'undefined') console.warn('リボン: 働きが 無い ' + 名);
    } catch (e) { if (typeof console !== 'undefined') console.warn(e); }
  }

  function 描く(el, spec) {
    if (!el || !spec) return null;
    逃がす(el);                                  /* ★先に 逃がす★ */
    var tabs = spec.ツリー();
    /* ★(c) の組しか 無い タブは タブごと 出さない★
       （Sheet1＝下の シート見出しの 写り込み。
        ★空の タブを 見せるのは 壊れて 見える★） */
    if (範囲) {
      tabs = tabs.filter(function (t) {
        for (var z = 0; z < t.groups.length; z++) {
          if (!範囲.出さない理由(t.name, t.groups[z].name)) return true;
        }
        return false;
      });
    }
    var いま = null;
    for (var i = 0; i < tabs.length; i++) if (tabs[i].name === 状態.tab) いま = tabs[i];
    if (!いま && tabs.length) { いま = tabs[0]; 状態.tab = いま.name; }
    var 本体 = '';
    if (いま) for (var j = 0; j < いま.groups.length; j++) 本体 += グループのHTML(いま.groups[j], いま.name);
    /* ★クイック アクセス（元に戻す／やり直す）★
       Excelも ★リボンの外（上）★に 置いている。★288の 数には 入れない★（別物なので）。 */
    /* ★クイックアクセスは タブの帯の 中に 入れる★（2026-08-29 実ブラウザで 測って 決めた）
       別の 行に すると それだけで 36px 使い、リボンが 221px に なった。
       Excelも タイトルの帯に 置いている＝★1行 増やさない★ */
    el.innerHTML =
      '<div class="rb-tabs" role="tablist">'
        + '<button type="button" class="rb-q" data-act="元に戻す" title="元に戻す">↩</button>'
        + '<button type="button" class="rb-q" data-act="やり直す" title="やり直す">↪</button>'
        + '<span class="rb-sep"></span>'
        + タブのHTML(tabs)
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
    /* ★選んだ タブを 画面の中へ 送る★ 2026-09-03
       ＝スマホ幅（390px）で ★選んでいる タブが 右端で 半分 切れて 出ていた★
       （2026-09-03 監査役が 絵を 開いて 見つけた）。
       ★「選ばれている物が 分かる」は 光っているだけでは 足りない＝★見えていないと 分からない★★。
       ★画面ごと 動かさない★（`block:'nearest'`）＝帯の 中だけ 横に 送る。 */
    var 選び = el.querySelector('.rb-tab.on');
    if (選び && typeof 選び.scrollIntoView === 'function') {
      try { 選び.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      catch (e) { /* 古い ブラウザは 引数を 取らない＝何も しない */ }
    }
    var f = el.querySelector('.rb-fold');
    if (f) f.addEventListener('click', function () { 状態.開いている = !状態.開いている; 描く(el, spec); });
    /* ★部品の 押し込み★＝動作の層を 名前で 引く（画面の関数を 直接 呼ばない）
       クイックアクセス（.rb-q）も 同じ 仕組みで 動かす。 */
    var its = el.querySelectorAll('.rb-item, .rb-q, .rb-launch');
    for (var m = 0; m < its.length; m++) {
      /* ★押し込みも Alt のキーも ★同じ 1か所★を 通る★
         （別々に 書くと ★マウスでは 動くのに キーでは 動かない★が 出る） */
      its[m].addEventListener('click', (function (名) {
        return function () { 動かす(名); };
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
    /* ★描き直したら 札も 描き直す★
       （innerHTML で 作り直すので ★札は 毎回 消える★） */
    札を描く(el);
    return { tab: 状態.tab, 開いている: 状態.開いている };
  }

  /** 数える（画面に 出した数／全部） */
  function 数える(spec) {
    var n = spec.数える();
    return { 全: n.全, 出せる: n.有, まだ: n.無 };
  }

  return { 描く: 描く, 数える: 数える, 状態: 状態, _部品のHTML: 部品のHTML, _名を短く: 名を短く,
    _札にする: 札にする, _逃がす: 逃がす,
    /* ★Alt の キー★（呼ぶ側の keydown から 渡す） */
    キーを受ける: キーを受ける, キーをやめる: キーをやめる, 木を作る: 木を作る,
    /** ★今 キーを 打っているか★＝表に 字を 入れて よいかの 判断に 使う */
    キー中か: function () { return !!状態.キー中; } };
}));
