/* shitagaki-modosu.test.mjs — ★数式の帯で 打った 下書きは、確定しなければ 表に 残さない★（2026-11-14・件⑥＝表の 押し0b の残り）
 *  ★なぜ★ 数式の帯で 打つと、打つ度に そのマスの 見える字（d）を 下書きに 書き換える（空のマスなら 空の物を 作る）。
 *    Esc・同じ字のまま 抜ける・自前キーボードを 開いたまま 別のマスや 板へ 移る、では 確定しないのに 下書きが 残り、
 *    値（v）と 見える字（d）が 食い違った（空のマスには 中身の無い物が 残った）。実Excel は 確定しなければ 元の 表示に 戻る。
 *  使い方: node tests/shitagaki-modosu.test.mjs ／ --self-test＝戻さない形（_下書きを戻す を 空に）で 赤になるか
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
let pass = 0, fail = 0;
const T = async (n, fn) => { try { await fn(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  NG   ' + n + '\n       ' + (e && e.message)); } };
const ok = (c, m) => { if (!c) throw new Error(m || 'expected truthy'); };
const eq = (a, b, m) => { if (a !== b) throw new Error((m ? m + ': ' : '') + '期待=' + JSON.stringify(b) + ' 実際=' + JSON.stringify(a)); };

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); }
catch { console.log('★jsdomが入っていません（SKIPを緑と呼ばない）。npm ci してください。'); process.exit(1); }

const html = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
const CANVAS_STUB = `
(function(){
  var noop=function(){};
  var ctx=new Proxy({}, { get:function(t,k){
    if(k==='measureText') return function(){ return {width:40}; };
    if(k==='canvas') return {width:800,height:600};
    if(k==='getImageData') return function(){ return {data:[]}; };
    if(k==='createLinearGradient'||k==='createPattern') return function(){ return {addColorStop:noop}; };
    return noop;
  }});
  HTMLCanvasElement.prototype.getContext=function(){ return ctx; };
})();`;
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), {
  runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
  beforeParse(w) {
    w.fetch = () => Promise.reject(new Error('no net'));
    w.scrollTo = () => {}; w.alert = () => {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    w.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    w.cancelAnimationFrame = () => {};
    w.eval(CANVAS_STUB);
  },
});
const win = dom.window, doc = win.document;
// jsdom の document.hasFocus() は blur の中で偽を返す。本物のページは同じページの中で focus が動く時 真＝そう揃える（別の窓へ移る試験だけ偽に差し替える）
doc.hasFocus = () => true;
const inject = (code) => { const el = doc.createElement('script'); el.textContent = code; doc.body.appendChild(el); };
for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1].split('?')[0]).filter((s) => !/^https?:/.test(s))) {
  const p = path.join(ROOT, src);
  if (fs.existsSync(p)) { try { inject(fs.readFileSync(p, 'utf8')); } catch (e) { /* 続ける */ } }
}
for (const m of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) { try { inject(m[1]); } catch (e) { /* 続ける */ } }
try { doc.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { /* 続ける */ }
try { win.dispatchEvent(new win.Event('load')); } catch (e) { /* 続ける */ }
/* ★保存の 道具は 本番でも 初めての 保存で 後から 読む（_ensureXlsx と 同じ 順）★ */

const SELF = process.argv.includes('--self-test');
if (SELF) win.eval('_下書きを戻す=function(){ _打ちかけ前=null; }; _帯を先に確定=function(){};');
const 物 = (i, k) => win.sheets[i].data[k];
const 新しい本 = () => { win.eval("sheets.length=1; sheets[0]={name:'Sheet1',data:{},colW:{},rowH:{}}; activeSheet=0; undoStack.length=0; redoStack.length=0; _打ちかけ前=null;"); if (typeof win.rebuildSheetTabs === 'function') win.rebuildSheetTabs(); };
const fi = doc.getElementById('formula-input'), kb = doc.getElementById('formula-kb');
const 選ぶ = (r, c) => { win.sel(r, c, r, c); win.updateBar(); };
const 帯で打つ = (字) => { fi.value = 字; fi.dispatchEvent(new win.Event('input')); };
const Esc = () => fi.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const Enter = () => fi.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
const PCの帯 = () => { kb.style.display = 'none'; fi.focus(); };
const 自前の帯 = () => { kb.style.display = 'block'; win.eval('_editMode=true'); };
console.log('\n[shitagaki-modosu] 数式の帯の 下書きは 確定しなければ 残さない' + (SELF ? '（--self-test＝赤に なるはず）' : ''));

新しい本(); win.setCell(0, 0, 'a'); 選ぶ(1, 0); PCの帯(); 帯で打つ('下書き'); Esc();
await T('★PC の帯で 空のマスに 打つ→Esc＝空の物を 残さない★', () => { eq(物(0, '1,0'), undefined, 'A2'); });
fi.blur();
await T('Esc の後に 抜けても 空のまま・控えも 増えない', () => { eq(物(0, '1,0'), undefined, 'A2'); eq(win.undoStack.length, 1, '控え'); });

新しい本(); win.setCell(0, 0, 'a'); 選ぶ(0, 0); PCの帯(); 帯で打つ('上書きの下書き'); Esc(); fi.blur();
await T('★値の在るマスで 打つ→Esc＝見える字は 元の a★', () => { eq(物(0, '0,0').d, 'a', 'A1 d'); eq(物(0, '0,0').v, 'a', 'A1 v'); });

新しい本(); win.setCell(0, 0, '=1+1'); 選ぶ(0, 0);
await T('（前提）=1+1 の 見える字は 2', () => { eq(String(物(0, '0,0').d), '2', 'A1 d'); });
PCの帯(); 帯で打つ('=1+'); 帯で打つ('=1+1'); fi.blur();
await T('★同じ式に 打ち戻して 抜ける＝見える字は 式の字でなく 答えの 2★', () => { eq(String(物(0, '0,0').d), '2', 'A1 d'); eq(win.undoStack.length, 1, '控え'); });

新しい本(); win.setCell(0, 0, 'a'); 選ぶ(1, 0); 自前の帯(); 帯で打つ('自前の下書き'); 選ぶ(3, 0);
await T('★自前キーボードで 打つ→別のマスへ＝前のマスに 下書きを 残さない★', () => { eq(物(0, '1,0'), undefined, 'A2'); });
win.fkbCancel();

新しい本(); win.setCell(0, 0, 'a'); 選ぶ(0, 0); 自前の帯(); 帯で打つ('自前の上書き'); win.fkbCancel();
await T('★自前キーボードで 打つ→やめる＝見える字は 元の a★', () => { eq(物(0, '0,0').d, 'a', 'A1 d'); });

新しい本(); win.addSheet(); const 板2 = win.activeSheet; win.switchSheet(0); win.setCell(0, 0, 'a'); 選ぶ(1, 0); 自前の帯(); 帯で打つ('板の下書き'); win.switchSheet(板2); win.updateBar();
await T('★自前キーボードで 打つ→別の板へ＝前の板に 下書きを 残さない★', () => { eq(物(0, '1,0'), undefined, 'Sheet1 A2'); });
win.fkbCancel();

新しい本(); win.setCell(0, 0, 'a'); 選ぶ(0, 0); 自前の帯(); 帯で打つ('ab'); 選ぶ(2, 0); 帯で打つ('c3');
await T('自前キーボードで 2つの マスへ 続けて 打つ＝前のマスは 元の a・今のマスは 下書き', () => { eq(物(0, '0,0').d, 'a', 'A1 d'); eq(物(0, '2,0').d, 'c3', 'A3 d'); });
win.fkbCancel();
await T('やめたら 今のマスも 消える', () => { eq(物(0, '2,0'), undefined, 'A3'); });

新しい本(); win.setCell(0, 0, 'a'); 選ぶ(1, 0); PCの帯(); 帯で打つ('確定'); Enter(); 選ぶ(5, 5);
await T('Enter で 確定した 字は 残る（戻さない）', () => { eq(物(0, '1,0').v, '確定', 'A2 v'); eq(物(0, '1,0').d, '確定', 'A2 d'); eq(win.undoStack.length, 2, '控え'); });

新しい本(); win.setCell(0, 0, 'a'); 選ぶ(1, 0); 自前の帯(); 帯で打つ('KB確定'); win.fkbCommit(); 選ぶ(5, 5);
await T('自前キーボードで 確定した 字も 残る', () => { eq(物(0, '1,0').v, 'KB確定', 'A2 v'); });

新しい本(); win.setCell(0, 0, 'a'); 選ぶ(0, 0); PCの帯(); 帯で打つ('b'); fi.blur(); 選ぶ(3, 3);
await T('PC の帯から 抜けて 確定した 字も 残る', () => { eq(物(0, '0,0').v, 'b', 'A1 v'); eq(物(0, '0,0').d, 'b', 'A1 d'); });

/* ★本物の 順★＝升目を 押すと onMD が 既定を 止めるので sel が 先・帯の blur が 後 */
const マスの点 = (r, c) => { let x = -1, y = -1; for (let i = 0; i < 3000 && x < 0; i++) if (i > win.eval('HDR_W') && win.xToC(i) === c) x = i + 3; for (let i = 0; i < 3000 && y < 0; i++) if (i > win.eval('HDR_H') && win.yToR(i) === r) y = i + 3; return { x, y }; };
const マスを押す = (r, c) => { const p = マスの点(r, c); win.onMD({ button: 0, clientX: p.x, clientY: p.y, preventDefault() {}, stopPropagation() {} }); if (typeof win.onMU === 'function') { try { win.onMU({ button: 0, clientX: p.x, clientY: p.y, preventDefault() {} }); } catch (e) { /* 続ける */ } } };
新しい本(); win.setCell(0, 0, 'a'); 選ぶ(1, 0); PCの帯(); 帯で打つ('100'); マスを押す(3, 3); fi.blur();
await T('★PC の帯で 打つ→別のマスを 押す＝打った字は 確定する（実Excel と 同じ）★', () => { eq(win.selR1, 3, '選んだ行'); eq(String(物(0, '1,0') && 物(0, '1,0').v), '100', 'A2 v'); eq(String(物(0, '1,0').d), '100', 'A2 d'); eq(win.undoStack.length, 2, '控え'); });

新しい本(); win.setCell(0, 0, 1); win.setCell(0, 1, '=A1*2'); 選ぶ(0, 2); PCの帯(); 帯で打つ('=A1'); マスを押す(3, 3);
await T('= で始まる 打ちかけで マスを 押す＝確定せず 参照を 差し込む（今のまま）', () => { eq(物(0, '0,2').f, '', 'C1 は まだ 確定しない'); eq(win.undoStack.length, 2, '控え'); ok(/^=.*D4/.test(fi.value), '帯=' + fi.value); });
win.fkbCancel(); fi.blur();
await T('その後 やめる＝C1 に 下書きを 残さない', () => { eq(物(0, '0,2'), undefined, 'C1'); });

/* ★指を 置いた（スクロールの 始め）だけでは 確定しない★＝前は 確定して 古い 控えが 残り、Esc で 値 7 なのに 見える字 a に なった */
const 指を置く = (r, c) => { const p = マスの点(r, c); try { win.onTS({ touches: [{ clientX: p.x, clientY: p.y }], preventDefault() {}, stopPropagation() {} }); } catch (e) { /* 続ける */ } };
新しい本(); win.setCell(0, 0, 'a'); 選ぶ(0, 0); PCの帯(); 帯で打つ('7'); 指を置く(5, 5); 帯で打つ('78'); Esc(); fi.blur();
await T('★帯で 打つ→指を 置く→打つ→Esc＝値も 見える字も 元の a★', () => { eq(String(物(0, '0,0').v), 'a', 'A1 v'); eq(String(物(0, '0,0').d), 'a', 'A1 d'); eq(win.undoStack.length, 1, '控え'); });
新しい本(); 選ぶ(1, 0); PCの帯(); 帯で打つ('5'); 指を置く(5, 5); 帯で打つ('55'); Esc(); fi.blur();
await T('空のマスで 打つ→指を 置く→Esc＝空のまま', () => { eq(物(0, '1,0'), undefined, 'A2'); });

/* ★件⑦(3)★ PC の帯で 打つ→指で 列・行の 見出し／左上の 角を タップ＝打った字は 確定する（マウスで 見出しを 押した時と 同じ・実Excel と 同じ）
 *   前は onTE の 見出しの 枝が commitEdit→sel だけで、sel→updateBar が 下書きを 戻し 打った 7 が 黙って 消えた */
const 指でタップ = (x, y) => { try { win.onTS({ touches: [{ clientX: x, clientY: y }], preventDefault() {}, stopPropagation() {} }); win.onTE({ touches: [], changedTouches: [], preventDefault() {}, stopPropagation() {} }); } catch (e) { /* 続ける */ } };
/* 点は 打った 後に 測る（選ぶ が スクロールを 動かす ので 先に 測ると ずれて 別の 枝に 入る＝偽の 緑） */
const 打っておく = () => { 新しい本(); win.setCell(0, 0, 'a'); 選ぶ(0, 0); PCの帯(); 帯で打つ('7'); };
const 今の範囲 = () => [win.selR1, win.selC1, win.selR2, win.selC2].join(',');
const 確定した = () => { eq(String(物(0, '0,0').v), '7', 'A1 v'); eq(String(物(0, '0,0').d), '7', 'A1 d'); eq(win.undoStack.length, 2, '控え'); };
{
  const 全 = (n) => win.eval(n) - 1;
  for (const [名, 点, 範囲] of [
    ['列の 見出し', (p) => [p.x + 25, 8], () => [0, 3, 全('ROWS'), 3]],
    ['行の 見出し', (p) => [8, p.y + 8], () => [5, 0, 5, 全('COLS')]],
    ['左上の 角', () => [8, 8], () => [0, 0, 全('ROWS'), 全('COLS')]],
  ]) {
    打っておく(); const [x, y] = 点(マスの点(5, 3)); 指でタップ(x, y);
    const 選んだ = 今の範囲(); fi.blur();
    await T('★PC の帯で 打つ→指で ' + 名 + 'を タップ＝打った 7 は 確定する★', () => { eq(選んだ, 範囲().join(','), '選んだ範囲（見出しの 枝に 入ったか）'); 確定した(); });
  }
  /* 長押し（500ms）で 升目を 選ぶ・指で なぞって 範囲を 選ぶ も 同じ（sel が 下書きを 戻す 前に 確定する）
   *  上の「指を 置く」が 離さずに 残した 長押しの 時計を 先に 流しきる（残すと 待つ 間に 古い 点を 選ぶ） */
  await new Promise((ok_) => setTimeout(ok_, 600)); win.eval('touchState=null;');
  打っておく();
  { const q = マスの点(4, 2); try { win.onTS({ touches: [{ clientX: q.x, clientY: q.y }], preventDefault() {}, stopPropagation() {} }); } catch (e) { /* 続ける */ } }
  await new Promise((ok_) => setTimeout(ok_, 650));
  const 長押しの範囲 = 今の範囲(); win.eval('if(typeof hideCtxMenu==="function") hideCtxMenu()'); fi.blur();
  await T('★PC の帯で 打つ→升目を 長押し＝打った 7 は 確定する★', () => { eq(長押しの範囲, '4,2,4,2', '長押しで 選んだ マス'); 確定した(); });
  打っておく();
  let なぞりの種 = null, なぞりの範囲 = null;
  try {
    const q = マスの点(4, 2), q2 = マスの点(6, 4);
    win.onTS({ touches: [{ clientX: q.x, clientY: q.y }], preventDefault() {}, stopPropagation() {} });
    win.eval('touchState.time-=300; clearTimeout(touchState.lpt);');
    win.onTM({ touches: [{ clientX: q2.x, clientY: q2.y }], preventDefault() {}, stopPropagation() {} });
    なぞりの種 = win.eval('touchState && touchState.type'); なぞりの範囲 = 今の範囲();
    win.onTE({ touches: [], changedTouches: [], preventDefault() {}, stopPropagation() {} });
  } catch (e) { /* 続ける */ }
  fi.blur();
  await T('★PC の帯で 打つ→指で なぞって 範囲を 選ぶ＝打った 7 は 確定する★', () => { eq(なぞりの種, 'rangeselect', '範囲選びの 道に 入ったか'); eq(なぞりの範囲.split(',').slice(0, 2).join(','), '4,2', '選び始めた マス（jsdom は sel で スクロールが 動くので 終わりの マスは 見ない）'); 確定した(); });
  /* 素早く（200ms 未満）なぞる＝スクロール＝確定しない（下書きの まま・Esc で 元の a） */
  打っておく();
  let 流しの種 = null;
  try {
    const q = マスの点(4, 2), q2 = マスの点(6, 4);
    win.onTS({ touches: [{ clientX: q.x, clientY: q.y }], preventDefault() {}, stopPropagation() {} });
    win.eval('clearTimeout(touchState.lpt);');
    win.onTM({ touches: [{ clientX: q2.x, clientY: q2.y }], preventDefault() {}, stopPropagation() {} });
    流しの種 = win.eval('touchState && touchState.type');
    win.onTE({ touches: [], changedTouches: [], preventDefault() {}, stopPropagation() {} });
  } catch (e) { /* 続ける */ }
  const 流しの後 = { v: String(物(0, '0,0').v), 控え: win.undoStack.length };
  Esc(); fi.blur();
  await T('★PC の帯で 打つ→素早く なぞる（スクロール）＝確定しない・Esc で 元の a★', () => { eq(流しの種, 'scroll', 'スクロールの 道に 入ったか'); eq(流しの後.v, 'a', 'スクロールの 後の A1 v'); eq(流しの後.控え, 1, 'スクロールの 後の 控え'); eq(String(物(0, '0,0').v), 'a', 'Esc の 後の A1 v'); eq(String(物(0, '0,0').d), 'a', 'Esc の 後の A1 d'); });
}

/* ★件⑦(2)★ 帯から 抜けて 確定する 道（blur・別のマスを 押す・指で 選ぶ）も 入力の決まりを 通す
 *   前は Enter（fkbCommit）だけが validGate を 通り、抜けて 確定すると 決まりに 合わない 字が 黙って 入った。
 *   断った 時は 知らせを 出して 打ちかけを 捨てる（実Excel の「中止」と 同じ・升目の 下書きも 元へ） */
{
  const 決まり付き = () => { 新しい本(); win.eval("sheets[0].validations={'0,0':{kind:'int',min:1,max:10}};"); win.setCell(0, 0, '5'); 選ぶ(0, 0); PCの帯(); };
  const 知らせを数える = (fn) => { const 出た = []; const 元 = win.showToast; win.showToast = function (m) { 出た.push(String(m)); }; try { fn(); } finally { win.showToast = 元; } return 出た; };
  const 元のまま = (出た) => { eq(String(物(0, '0,0').v), '5', 'A1 v'); eq(String(物(0, '0,0').d), '5', 'A1 d'); eq(win.undoStack.length, 1, '控え'); ok(出た.some((m) => /入りません/.test(m)), '知らせ=' + JSON.stringify(出た)); };
  let 出た;
  決まり付き(); 帯で打つ('99'); 出た = 知らせを数える(() => fi.blur());
  await T('★決まり（1〜10）の マスに 帯で 99→抜ける＝入らない・知らせる・見える字も 5★', () => 元のまま(出た));
  決まり付き(); 帯で打つ('99'); 出た = 知らせを数える(() => { マスを押す(3, 3); fi.blur(); });
  await T('★決まりの マスに 帯で 99→別のマスを 押す＝入らない・知らせる★', () => 元のまま(出た));
  決まり付き(); 帯で打つ('99'); 出た = 知らせを数える(() => { const p = マスの点(5, 3); 指でタップ(p.x + 25, 8); fi.blur(); });
  await T('★決まりの マスに 帯で 99→指で 列の 見出しを タップ＝入らない・知らせる★', () => 元のまま(出た));
  決まり付き(); 帯で打つ('7'); 出た = 知らせを数える(() => fi.blur());
  await T('決まりに 合う 7→抜ける＝入る・知らせは 出ない', () => { eq(String(物(0, '0,0').v), '7', 'A1 v'); eq(win.undoStack.length, 2, '控え'); eq(出た.length, 0, '知らせ'); });
  決まり付き(); 帯で打つ('9'); 帯で打つ('5'); 出た = 知らせを数える(() => fi.blur());
  await T('打ち戻して 同じ 5 のまま 抜ける＝何も 書かず 知らせも 出ない', () => { eq(win.undoStack.length, 1, '控え'); eq(出た.length, 0, '知らせ'); });
  決まり付き(); 帯で打つ('99'); { const 元 = doc.hasFocus; doc.hasFocus = () => false; try { 出た = 知らせを数える(() => fi.blur()); } finally { doc.hasFocus = 元; } }
  await T('★決まりの マスで 99 を 打ったまま 別の窓へ（ページが focus を 失う）＝捨てず 知らせず 打ちかけの まま★', () => { eq(出た.length, 0, '知らせ'); eq(fi.value, '99', '帯'); eq(String(物(0, '0,0').v), '5', 'A1 v'); eq(win.undoStack.length, 1, '控え'); });
  fi.focus(); 出た = 知らせを数える(() => fi.blur());
  await T('戻って そのまま 抜ける＝その時に 決まりで 断る', () => 元のまま(出た));
  決まり付き(); win.setCell(0, 1, 3); 帯で打つ('=B1'); 出た = 知らせを数える(() => fi.blur());
  await T('★決まりの マスに 式 =B1 を 打って 抜ける＝前と 同じく 入る（式を 字で 判じて 断らない）★', () => { eq(物(0, '0,0').f, '=B1', 'A1 式'); eq(出た.length, 0, '知らせ'); });
  決まり付き(); win.setCell(0, 0, 'a\nb'); 選ぶ(0, 0); PCの帯(); 帯で打つ('a ↵ bz'); win.eval("sheets[0].validations={'0,0':{kind:'list',items:['x']}};"); 出た = 知らせを数える(() => fi.blur());
  await T('改行の 在る マスで 断った 時＝帯は ↵ の 書き方で 戻す', () => { eq(fi.value, 'a ↵ b', '帯'); });
  決まり付き(); 帯で打つ('99'); 出た = 知らせを数える(() => Enter());
  await T('（前から）Enter で 99＝入らない・知らせる', () => { eq(String(物(0, '0,0').v), '5', 'A1 v'); ok(出た.length >= 1, '知らせ'); });
  Esc(); fi.blur();
}

/* ★帯の ↵ は 改行の 書き方（件⑦(6)）★＝input は 改行を 持てないので 帯は ' ↵ ' で 見せる。
 *   前は Enter（fkbCommit）が ' ↵ ' の 字の まま 書き（客の 改行が 黙って「↵」の 字に 化けた）、
 *   Esc（fkbCancel）は 改行の まま 帯へ 入れて input が 改行を 消し、抜けると 改行の 無い 字で 確定した。 */
新しい本(); win.setCell(0, 0, 'a\nb'); 選ぶ(0, 0); PCの帯(); Enter(); 選ぶ(5, 5);
await T('★改行の 在る マスで 帯を 触らず Enter＝改行の まま（↵ の 字に 化けない）★', () => { eq(物(0, '0,0').f, 'a\nb', 'A1 式'); });
新しい本(); win.setCell(0, 0, 'a\nb'); 選ぶ(0, 0); PCの帯(); 帯で打つ('a ↵ bc'); Enter(); 選ぶ(5, 5);
await T('★帯で a ↵ bc と 打って Enter＝改行の 入った a\\nbc★', () => { eq(物(0, '0,0').f, 'a\nbc', 'A1 式'); });
新しい本(); win.setCell(0, 0, 'a\nb'); 選ぶ(0, 0); PCの帯(); 帯で打つ('a ↵ bz'); Esc();
await T('★改行の 在る マスで 打つ→Esc＝帯は ↵ の 書き方で 元へ★', () => { eq(fi.value, 'a ↵ b', '帯'); });
fi.blur(); 選ぶ(5, 5);
await T('★その後 抜けても 改行は 消えない・何も 書かない★', () => { eq(物(0, '0,0').f, 'a\nb', 'A1 式'); eq(win.undoStack.length, 1, '控え'); });
新しい本(); win.setCell(0, 0, 'a\nb'); 選ぶ(0, 0); 自前の帯(); 帯で打つ('a ↵ bz'); win.fkbCancel();
await T('自前キーボードで やめる＝帯は ↵ の 書き方で 元へ', () => { eq(fi.value, 'a ↵ b', '帯'); });
{
  新しい本(); 選ぶ(2, 2); fi.blur(); const ci = doc.getElementById('cell-input'); ci.focus(); ci.value = '=A1+\nB1'; ci.dispatchEvent(new win.Event('input'));
  await T('★マスで 改行の 在る 式を 打つ＝帯にも ↵ の 書き方で 写す（改行を 消さない）★', () => { eq(fi.value, '=A1+ ↵ B1', '帯'); });
  ci.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

/* ★下書きの 間に 計算し直された 答えを 古い 答えで 上書きしない★（F9・外のデータ・150ms 後の 計算は 同じ 物の d を 直に 書く） */
新しい本(); win.setCell(0, 0, 1); win.setCell(0, 1, '=A1*2');
win.eval("計算方法='manual'"); win.setCell(0, 0, 7);
await T('（前提）手動計算＝B1 の 見える字は 古い 2', () => { eq(String(物(0, '0,1').d), '2', 'B1 d'); });
選ぶ(0, 1); PCの帯(); 帯で打つ('=A1*3'); win.すべて再計算();
fi.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fi.blur();
await T('★打ちかけ中に F9 → Esc＝B1 は 計算し直した 14（古い 2 に 戻さない）★', () => { eq(String(物(0, '0,1').d), '14', 'B1 d'); eq(物(0, '0,1').f, '=A1*2', 'B1 式'); });
win.eval("計算方法='auto'");

/* 空のマスで 打ちかけ中に 太字を 付けた→Esc＝物は 消さず 太字を 残す（値の在るマスと 揃える） */
新しい本(); 選ぶ(1, 0); PCの帯(); 帯で打つ('太字の下書き'); win.applyFormat('bold', true); Esc(); fi.blur();
await T('空のマスに 打ちかけ中の 太字→Esc＝太字は 残り 下書きは 消える', () => { ok(物(0, '1,0'), 'A2 の 物'); eq(物(0, '1,0').bold, true, '太字'); eq(物(0, '1,0').d, '', 'A2 d'); });

/* 板が 並べ替わっても 前の板の 下書きを 戻す（板は 番号でなく 中身で 持つ） */
新しい本(); win.addSheet(); win.switchSheet(0); 選ぶ(1, 0); 自前の帯(); 帯で打つ('並べ替え前の下書き');
const 板0 = win.sheets[0]; win.eval('sheets.reverse(); activeSheet=1;'); 選ぶ(2, 0);
await T('打ちかけ中に 板が 並べ替わっても 下書きは 戻る', () => { eq(板0.data['1,0'], undefined, '元の板 A2'); });
win.fkbCancel();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (SELF) {
  const 効く = fail >= 10;
  console.log(効く ? '★--self-test：戻さない形で ' + fail + ' 本 赤＝見張りが効いている★' : '★--self-test：赤が ' + fail + ' 本しか出ない＝空振り★');
  process.exit(効く ? 0 : 1);
}
process.exit(fail ? 1 : 0);
