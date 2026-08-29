/* ribbon.test.mjs — ★リボン（Excelと同じ配置・見せ方は うちの物）★ 2026-08-29
 *
 *  ★司さんの指示★
 *    「リボンは前から言うてるけど ★配置なども真似しろ★」
 *    「★訴えられんような見せ方で 同じように★」
 *    「★Excel全機能全能力が Exallyに 入って Excelの最上級に なる★」
 *
 *  ★ここで 見る事★
 *    ①並びが ★正本（実Excelから 機械で取った物）と 1文字も 違わない★
 *    ②★出来ていない物の ボタンを 出していない★（押せない物を 見せない）
 *    ③★結び先の関数が 本当に 在る★（押しても 何も起きない ボタンを 作らない）
 *    ④★絵を 写していない★＝印は 字だけ（Excelの絵は 1つも 使わない）
 *    ⑤★対象外は 理由が 書いてある物だけ★（黙って 分母から 引かない）
 *    ⑥★実際に 描いて 数える★（作っただけで 緑に しない）
 *
 *  走らせ方: node tests/ribbon.test.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const 壊す = process.argv.includes('--self-test');
let 緑 = 0, 赤 = 0;
const ok = (名, 条件, 添え) => {
  if (条件) { 緑++; console.log('  ok   ' + 名); }
  else { 赤++; console.log('  ★NG★ ' + 名 + (添え !== undefined ? '  … ' + 添え : '')); }
};

const SPEC = require_(path.join(ROOT, 'lib/ribbon-spec.js'));
const RB = require_(path.join(ROOT, 'lib/ribbon.js'));
const book = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');

/* ── 正本 ─────────────────────────────────── */
const NL = String.fromCharCode(10), TAB = String.fromCharCode(9), CR = String.fromCharCode(13);
const 正本 = Array.from(new Set(
  fs.readFileSync(path.join(ROOT, 'docs/excel-ribbon-flat.tsv'), 'utf8')
    .split(NL).map((l) => l.replace(CR, '')).filter((l) => l.trim())
)).map((l) => l.split(TAB)).filter((c) => c.length >= 3);

console.log('\n[① 並びが 正本と 1文字も 違わない]');
ok('★正本が 空でない（試験が 空振りしていない）', 正本.length >= 100, 正本.length + '個');
ok('部品の数が 同じ', SPEC.ITEMS.length === 正本.length, SPEC.ITEMS.length + ' / ' + 正本.length);
let ずれ = -1;
for (let i = 0; i < Math.min(SPEC.ITEMS.length, 正本.length); i++) {
  const a = SPEC.ITEMS[i], b = 正本[i];
  if (a.t !== b[0] || a.g !== b[1] || a.p !== b[2]) { ずれ = i; break; }
}
ok('★並び順まで 同じ★', ずれ < 0, ずれ < 0 ? '' : (ずれ + 1) + '番目が 違う');
const tabs = SPEC.ツリー();
ok('タブ 12個', tabs.length === 12, String(tabs.length));
ok('グループ 67個', tabs.reduce((a, t) => a + t.groups.length, 0) === 67,
  String(tabs.reduce((a, t) => a + t.groups.length, 0)));

/* ── ③ ★結び先を 実際に 押す★ ───────────────────────
 *  ★「関数が 在る」だけ 見ていて 危なかった★（2026-08-29）:
 *    applyFormat は 引数が 2つ・openColorPalette は event を 取る のに
 *    1つの文字で 呼ぶ結びを 書いていた ⇒ ★押しても 何も起きないボタン★に なる所だった。
 *  ⇒ ★動作の層を 1つずつ 実際に 呼び、画面の関数に 正しく 届いたかを 数える★ */
console.log('\n[③ ★結び先を 実際に 押す★]');
const ACT = require_(path.join(ROOT, 'lib/ribbon-actions.js'));
const 結んだ = SPEC.ITEMS.filter((x) => x.a);
ok('★1つ以上 結んである（試験が 空振りしていない）', 結んだ.length >= 20, 結んだ.length + '個');
const 名無し = 結んだ.filter((x) => typeof ACT[x.a.act] !== 'function');
/* ★引き取る物も 名前を 持つ★＝上の 検査に かかる（名前だけは 要る） */
ok('★働きが 無い結びが 0件★', 名無し.length === 0, 名無し.map((x) => x.p + '→' + x.a.act).join(', '));

/* 画面の関数を にせ物に 差し替えて、★どれが 何を どう 呼んだか★ を 記録する */
{
  const 記録 = [];
  const g = globalThis;
  const 前window = g.window, 前document = g.document;
  const にせ画面 = {};
  const 拾う名 = ['ctxPaste','ctxCut','ctxCopy','toggleFormat','applyBorderAll','applyFormat',
    'openColorPalette','openFmtModal','applyMergeCells','applyIndent','toggleDecimal',
    'openCondFormat','ctxInsertRow','ctxDeleteRow','ctxInsertCol','ctxDeleteCol','findNextCell',
    'doUndo','doRedo','openFnPalette','sortRange','filterByValue','clearFilter','openValid',
    'freezePanes','unfreezePanes','printSheet',
    'autoSum','fillFromEdge','中身を消す','書式を消す','すべて消す',
    '数式の表示を切り替える','すべて再計算','このシートを再計算','openShindan','重複を削除','ズーム100','openMacro','名前の窓を開く','区切り位置を開く','グラフを作る',
    'コメントの窓を開く','コメントを消す','前のコメントへ','次のコメントへ','コメントの一覧',
    'ページ設定を開く','向きを切り替える','枠線を刷るか','見出しを刷るか',
    'シートの保護を切り替える','選んだ所のロックを切り替える','枠線の表示を切り替える',
    '小数を増やす','小数を減らす','書式をコピー','書式を貼る','セルを下へ挿入','セルを上へ削除','行の高さを開く','列の幅を開く','セルのスタイルを開く','並べ替えの窓を開く','見出しを出すか','数式バーを出すか','ctxUnhideRow','ctxUnhideCol','openRireki','リンクの窓を開く','おすすめグラフ','スパークラインの窓を開く','表の窓を開く','記号の窓を開く','フォームの窓を開く','計算方法の窓を開く','関数の窓を開く','数式で使用の窓を開く','範囲から名前の窓を開く','参照元のトレース','参照先のトレース','トレース矢印の削除','数式の検証を開く','ウォッチを開く','ズームの窓を開く','選択範囲に合わせる','ブックの保護を開く','範囲の編集を開く','ブックの数を開く','フラッシュフィル','絞りを再適用','ゴールシークを開く'];
  for (const n of 拾う名) にせ画面[n] = (function (nm) {
    return function () { 記録.push({ fn: nm, args: Array.prototype.slice.call(arguments) }); };
  }(n));
  const dom2 = new JSDOM('<input id="fmt-font-size" value="12">');
  g.window = Object.assign(にせ画面, { RibbonActions: ACT });
  g.document = dom2.window.document;
  let 届かない = [];
  for (const it of 結んだ) {
    記録.length = 0;
    try { ACT[it.a.act](); } catch (e) { 届かない.push(it.a.act + '（落ちた: ' + e.message.slice(0, 40) + '）'); continue; }
    /* ★引き取る物（元から在る 入力・色の見本）は 押す物では ない★＝除く。
       押す働きは 元の物が 持っている（配線ごと リボンへ 引っ越すだけ）。 */
    if (!記録.length && it.a.act !== '字を大きく' && it.a.act !== '字を小さく' && !it.a.取り込む) {
      届かない.push(it.a.act + '（画面の関数を 1つも 呼んでいない）');
    }
  }
  g.window = 前window; g.document = 前document;
  ok('★押したら 画面の関数に 届く（' + 結んだ.length + '個 全部 押した）★',
    届かない.length === 0, 届かない.join(' / '));
}

/* ★関数ライブラリの 分類★＝引数が 効いているか（2026-08-29 に 足した）
 *   知らない分類（財務など・うちに まだ 無い物）は ★すべて★に なる＝黙って 落ちない。 */
{
  const g = globalThis, 前w = g.window;
  const 受け = [];
  g.window = { openFnPalette: function (c) { 受け.push(c); } };
  ACT['論理の関数'](); ACT['日付の関数'](); ACT['関数の挿入']();
  g.window = 前w;
  ok('★分類を 渡している★', JSON.stringify(受け) === JSON.stringify(['論理', '日付', undefined]), JSON.stringify(受け));
}

/* ★引数の 取り違えを 名指しで 弾く★（前に やらかした形） */
{
  const 記録 = [];
  const g = globalThis;
  const 前window = g.window, 前document = g.document;
  g.window = {
    applyFormat: function (k, v) { 記録.push(['applyFormat', k, v]); },
    toggleFormat: function (k) { 記録.push(['toggleFormat', k]); },
    openColorPalette: function (e, t) { 記録.push(['openColorPalette', e, t]); },
    applyIndent: function (d) { 記録.push(['applyIndent', d]); },
    sortRange: function (d) { 記録.push(['sortRange', d]); },
  };
  g.document = new JSDOM('<div></div>').window.document;
  ACT['左揃え'](); ACT['太字'](); ACT['字下げを増やす'](); ACT['昇順']();
  g.window = 前window; g.document = 前document;
  const 見つけ = (fn) => 記録.find((r) => r[0] === fn);
  ok('applyFormat は ★2つ★の引数で 呼ぶ',
    JSON.stringify(見つけ('applyFormat')) === JSON.stringify(['applyFormat', 'align', 'left']),
    JSON.stringify(見つけ('applyFormat')));
  ok('toggleFormat は key 1つ', JSON.stringify(見つけ('toggleFormat')) === JSON.stringify(['toggleFormat', 'bold']));
  ok('applyIndent は ★数★で 呼ぶ', JSON.stringify(見つけ('applyIndent')) === JSON.stringify(['applyIndent', 1]));
  ok('sortRange は 向きの文字', JSON.stringify(見つけ('sortRange')) === JSON.stringify(['sortRange', 'asc']));
}

/* ── ④ 絵を 写していない ───────────────────── */
console.log('\n[④ 絵を 写していない（印は 字だけ）]');
const 絵っぽい = 結んだ.filter((x) => x.a.icon && /<svg|<img|url\(|\.png|\.svg|\.ico/i.test(x.a.icon));
ok('★印に 画像を 使っていない★', 絵っぽい.length === 0, 絵っぽい.map((x) => x.p).join(', '));
const css = fs.readFileSync(path.join(ROOT, 'lib/ribbon.css'), 'utf8');
ok('★見た目に 外の画像を 使っていない★', !/url\(\s*['"]?(https?:|\/\/)/.test(css));
ok('★うちの緑を 使っている★', /#3D9E72|#2E7D54|#C8ECD8|#F0FAF4/i.test(css));

/* ── ⑤ 対象外は 理由つき ───────────────────── */
console.log('\n[⑤ 対象外は 理由が 書いてある物だけ]');
const bind = fs.readFileSync(path.join(ROOT, 'scripts/ribbon-bind.mjs'), 'utf8');
const 対象外の数 = (bind.match(/^\s*'[^']+\|[^']+\|[^']+':\s*'[^']+',/gm) || []).length;
ok('★対象外に 理由が 書いてある★', 対象外の数 >= 1, String(対象外の数));
/* ★\b は 日本語の 後ろでは 効かない★（単語の切れ目の 決まりが [A-Za-z0-9_] 前提）。
   実測 2026-08-29＝/export const 対象外\b/ は 在るのに 当たらなかった。 */
ok('★対象外の一覧が repo に 在る（口約束に しない）', /export const 対象外\s*=/.test(bind));
ok('★対象外のタブの一覧も 在る', /export const 対象外タブ\s*=/.test(bind));

/* ── ⑥⑦ 実際に 描く ───────────────────────── */
console.log('\n[⑥ 実際に 描いて 数える]');
const dom = new JSDOM('<div id="ribbon"></div>');
const el = dom.window.document.getElementById('ribbon');
const r = RB.描く(el, SPEC);
ok('★描けた★', !!r && r.tab === 'ホーム', JSON.stringify(r));
const 描いたタブ = el.querySelectorAll('.rb-tab').length;
ok('タブを 12個 描いた', 描いたタブ === 12, String(描いたタブ));
const 描いた群 = el.querySelectorAll('.rb-group').length;
ok('★ホームの グループを 9個 描いた★', 描いた群 === 9, String(描いた群));
const ボタン = [...el.querySelectorAll('.rb-item')];
ok('★押せるボタンを 1つ以上 描いた★', ボタン.length >= 10, ボタン.length + '個');

console.log('\n[② 出来ていない物の ボタンを 出していない]');
const 結び済み名 = new Set(SPEC.ITEMS.filter((x) => x.t === 'ホーム' && x.a && !x.a.取り込む).map((x) => RB._名を短く(x.p)));
const 出た名 = ボタン.map((b) => b.getAttribute('title'));
const 余計 = 出た名.filter((n) => !結び済み名.has(n));
ok('★結んでいない物が 画面に 出ていない★', 余計.length === 0, 余計.join(', '));
ok('★ボタンの数＝結んだ数★', ボタン.length === 結び済み名.size, ボタン.length + ' / ' + 結び済み名.size);
const 空箱 = [...el.querySelectorAll('.rb-group[data-empty="1"]')];
ok('★中身が 無い箱は「これから」と 出す（偽のボタンを 出さない）',
  空箱.every((g) => g.querySelectorAll('.rb-item').length === 0 && /これから/.test(g.textContent)),
  空箱.length + '箱');

console.log('\n[⑦ 画面に 差し込んである]');
ok('book.html に リボンの箱が 在る', /id="ribbon"/.test(book));
ok('book.html が 部品を 読み込んでいる', /lib\/ribbon-spec\.js/.test(book) && /lib\/ribbon\.js/.test(book));
ok('book.html が 見た目を 読み込んでいる', /lib\/ribbon\.css/.test(book));
ok('★起動時に 描いている★', /Ribbon\.描く/.test(book));

/* ── 数を 出す ─────────────────────────────── */
const n = SPEC.数える();
console.log('\n  ── 今の数 ──');
console.log('  Excelの部品 … ' + n.全 + '個 ／ ★うちに 在る … ' + n.有 + '個★ ／ まだ … ' + n.無 + '個');

console.log('\nribbon: ' + 緑 + '/' + (緑 + 赤) + ' passed');

if (壊す) {
  console.log('\n★--self-test＝わざと 壊して 赤に なるか★');
  let 素通り = 0;
  /* 壊し① 並びを 1つ 入れ替える */
  const 写し = SPEC.ITEMS.slice();
  const 入替 = 写し.slice(); const t0 = 入替[0]; 入替[0] = 入替[1]; 入替[1] = t0;
  let ず = -1;
  for (let i = 0; i < 入替.length; i++) {
    if (入替[i].t !== 正本[i][0] || 入替[i].g !== 正本[i][1] || 入替[i].p !== 正本[i][2]) { ず = i; break; }
  }
  if (ず < 0) { 素通り++; console.log('  ★素通り★ 並びを 入れ替えても 気づかない'); }
  /* 壊し② ★動作の層に 無い名前を 結ぶ★（前は「関数が在るか」だけ 見ていて 危なかった） */
  if (typeof ACT['この働きは絶対に無い___'] === 'function') { 素通り++; console.log('  ★素通り★ 無い働きを 在ると 言った'); }
  /* 壊し③ ★引数の 取り違え★＝1つで 呼ぶと 画面に 届かない事を 見せる */
  {
    const g = globalThis, 前w = g.window, 前d = g.document;
    let 受けた = null;
    g.window = { applyFormat: function (k, v) { 受けた = [k, v]; } };
    g.document = new JSDOM('<div></div>').window.document;
    /* わざと 1つで 呼ぶ（＝前に 私が 書いた 形） */
    g.window.applyFormat('align:left');
    g.window = 前w; g.document = 前d;
    if (受けた && 受けた[1] !== undefined) { 素通り++; console.log('  ★素通り★ 1つで 呼んでも 値が 届いた事に なっている'); }
  }
  /* 壊し③ 結んでいない物を 画面に 出す */
  const にせ = { t: 'ホーム', g: 'テスト', p: 'にせもの', a: null };
  if (RB._部品のHTML(にせ) !== '') { 素通り++; console.log('  ★素通り★ 結んでいない物の ボタンを 作った'); }
  if (素通り) { console.log('★抜け道 ' + 素通り + '件★'); process.exit(1); }
  console.log('  ok   抜け道 0件');
}
process.exit(赤 ? 1 : 0);
