/* torikeshi-hyou.test.mjs — ★表を作る・集計行の付け外し・フォームで消す も 元に戻す で 戻る★（2026-11-14・穴4＋穴5）
 *  ★なぜ★ 表を決める と フォームで消す は 控え（undoStack）を 積まずに 板を 書き換えていた。
 *    Ctrl+Z を 押すと 1つ前の 別の操作が 戻った（全部再表示→集計行→Ctrl+Z で 集計行は 残り 行が 隠れた＝穴5）。
 *    実Excel は 表を作る・集計行の 付け外し・フォームの 削除 も 1回の Ctrl+Z で 戻る。
 *  ★見出し無しで 作る時は 見出しの 1行を 足す ctxInsertRow が 控えを 1つ 積む＝表を決める では 積まない（2つ 積むと 2回 押さないと 戻らない）★
 *  使い方: node tests/torikeshi-hyou.test.mjs ／ --self-test＝控えを 積まない 形（直す前）に 戻して 赤に なるか
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
const SELF2 = process.argv.includes('--self-test-futatsu');
if (SELF2) {
  /* 見出し無しで 作る時も 表を決める が 積む 形＝控えが 2つ（2回 押さないと 戻らない）で 赤に なるか */
  const 元 = String(win.表を決める); const 抜いた = 元.replace('if (見出し行 || 今) _pushRowColUndo();', '_pushRowColUndo();');
  if (抜いた === 元) { console.log('★--self-test-futatsu: 条件の 行が 見つからない（空振り）'); process.exit(1); }
  win.eval(抜いた);
}
if (SELF) {
  /* 直す前の 形＝表を決める・フォームで消す から 控えを 積む 行を 抜く（抜けなければ 試験が 空振り＝止める） */
  for (const [名, 行] of [['表を決める', /if \(見出し行 \|\| 今\) _pushRowColUndo\(\);/], ['フォームで消す', /_pushRowColUndo\(\);/], ['doUndo', /if\(typeof _フォーム!=="undefined" && _フォーム\) return;/]]) {
    const 元 = String(win[名]);
    const 抜いた = 元.replace(行, '');
    if (抜いた === 元) { console.log('★--self-test: ' + 名 + ' の 控えの 行が 見つからない（空振り）'); process.exit(1); }
    win.eval(抜いた);
  }
  /* onKD は addEventListener で 掴まれている＝外して 守りを 抜いた 物を 付け直す */
  const 元KD = String(win.onKD); const 抜いたKD = 元KD.replace('if(typeof _フォーム!=="undefined" && _フォーム) return;', '');
  if (抜いたKD === 元KD) { console.log('★--self-test: onKD の 守りが 見つからない（空振り）'); process.exit(1); }
  doc.removeEventListener('keydown', win.onKD); win.eval(抜いたKD); doc.addEventListener('keydown', win.onKD);
  const 元R = String(win.doRedo); const 抜いたR = 元R.replace('if(typeof _フォーム!=="undefined" && _フォーム) return;', '');
  if (抜いたR === 元R) { console.log('★--self-test: doRedo の 守りが 見つからない（空振り）'); process.exit(1); }
  win.eval(抜いたR);
  /* 本を 開く 入り口の 守りと、書き込む の「直した 欄だけ・下が 変わったら 書かない」を 抜く */
  win.eval('_フォームが開いていれば断る = function(){ return false; };');
  const 元W = String(win.フォームを書き込む);
  const 抜いたW = 元W.replace('if (箱[i].value === 元) continue;', '').replace('if (sheets[activeSheet] !== f.板 || 今 !== 元) {', 'if (false) {');
  if (抜いたW === 元W || 抜いたW.includes('今 !== 元)')) { console.log('★--self-test: 書き込む の 守りが 見つからない（空振り）'); process.exit(1); }
  win.eval(抜いたW);
}
const 新しい本 = () => { win.eval("sheets.length=1; sheets[0]={name:'Sheet1',data:{},colW:{},rowH:{}}; activeSheet=0; undoStack.length=0; redoStack.length=0;"); if (typeof win.rebuildSheetTabs === 'function') win.rebuildSheetTabs(); };
const 選ぶ = (r, c) => { win.sel(r, c, r, c); };
const 字 = (r, c) => { const o = win.sheets[0].data[r + ',' + c]; return o ? String(o.f || o.v) : ''; };
const 表 = () => (win.sheets[0].tables || []).map((t) => t.名 + ':' + t.r1 + '-' + t.r2 + (t.集計行 ? '+集計' : '')).join(',');
const 窓で決める = (範囲, 名, 見出し, 集計) => {
  win.表の窓を開く();
  if (範囲) doc.getElementById('tblRange').value = 範囲;
  if (名) doc.getElementById('tblName').value = 名;
  doc.getElementById('tblHeader').checked = 見出し; doc.getElementById('tblTotals').checked = 集計;
  return win.表を決める();
};
const 名と数 = () => { win.setCell(0, 0, '名'); win.setCell(0, 1, '数'); win.setCell(1, 0, 'a'); win.setCell(1, 1, 1); win.setCell(2, 0, 'b'); win.setCell(2, 1, 2); win.undoStack.length = 0; };
console.log('\n[torikeshi-hyou] 表を作る・集計行の付け外し・フォームで消す を 元に戻す' + (SELF ? '（--self-test＝赤に なるはず）' : ''));

新しい本(); 名と数(); 選ぶ(0, 0);
eq(窓で決める('A1:B3', '表1', true, true), 1, '作れた');
await T('★集計つきで 表を作る→控えが 1つ★', () => { eq(win.undoStack.length, 1, '控え'); eq(表(), '表1:0-3+集計', '表'); eq(字(3, 0), '集計', 'A4'); });
win.doUndo();
await T('★→Ctrl+Z 1回で 表も 集計行も 無くなる★', () => { eq(表(), '', '表'); eq(字(3, 0), '', 'A4'); eq(字(3, 1), '', 'B4'); eq(字(2, 1), '2', 'B3 は 残る'); });
win.doRedo();
await T('★→Ctrl+Y で 表と 集計行が 戻る★', () => { eq(表(), '表1:0-3+集計', '表'); eq(字(3, 0), '集計', 'A4'); });

新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, false); win.undoStack.length = 0;
選ぶ(1, 0); 窓で決める(null, null, true, true);
await T('★集計行を 付ける→控えが 1つ★', () => { eq(win.undoStack.length, 1, '控え'); eq(表(), '表1:0-3+集計', '表'); });
win.doUndo();
await T('★→Ctrl+Z で 集計行だけ 外れる（表は 残る）★', () => { eq(表(), '表1:0-2', '表'); eq(字(3, 0), '', 'A4'); eq(字(3, 1), '', 'B4'); });

新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, true); win.undoStack.length = 0;
選ぶ(1, 0); 窓で決める(null, null, true, false);
/* 外した後の 表の 形は 穴8（表を決める が 集計行=false を 先に 書く＝集計行を しまえない）＝別件。ここは 控えだけ 見る */
await T('★集計行を 外す→控えが 1つ★', () => { eq(win.undoStack.length, 1, '控え'); });
win.doUndo();
await T('★→Ctrl+Z で 集計行が 戻る★', () => { eq(表(), '表1:0-3+集計', '表'); eq(字(3, 0), '集計', 'A4'); });

新しい本(); win.setCell(0, 0, 'x'); win.setCell(1, 0, 'y'); win.undoStack.length = 0; 選ぶ(0, 0);
窓で決める('A1:A2', '表2', false, false);
await T('★見出し無しで 作る→見出しの 行を 足して 控えは 1つだけ★', () => { eq(win.undoStack.length, 1, '控え'); eq(表(), '表2:0-2', '表'); eq(字(1, 0), 'x', 'A2'); });
win.doUndo();
await T('★→Ctrl+Z 1回で 足した 行も 表も 戻る★', () => { eq(表(), '', '表'); eq(字(0, 0), 'x', 'A1'); eq(字(1, 0), 'y', 'A2'); eq(win.undoStack.length, 0, '控え'); });

新しい本(); win.setCell(0, 0, '名'); for (let r = 1; r <= 3; r++) win.setCell(r, 0, 'r' + r); win.undoStack.length = 0;
選ぶ(1, 0); eq(win.フォームの窓を開く(), 1, 'フォームが 開いた');
win.フォームを動かす(1);
eq(win.フォームで消す(), 1, '消せた');
await T('★フォームで 1行 消す→控えが 1つ★', () => { eq(win.undoStack.length, 1, '控え'); eq(字(2, 0), 'r3', 'A3'); eq(字(3, 0), '', 'A4'); });
win.doUndo();
await T('★フォームを 開いたまま Ctrl+Z は 断る（実Excel の フォームは 閉じるまで 板へ 戻れない）★', () => { eq(win.undoStack.length, 1, '控え'); eq(字(2, 0), 'r3', 'A3'); });
win.フォームを閉じる();
await T('★→閉じても 行が 古い字で 上書きされない★', () => { eq(字(1, 0), 'r1', 'A2'); eq(字(2, 0), 'r3', 'A3'); eq(字(3, 0), '', 'A4'); });
win.doUndo();
await T('★→Ctrl+Z で 消した 行が 戻る★', () => { eq(字(1, 0), 'r1', 'A2'); eq(字(2, 0), 'r2', 'A3'); eq(字(3, 0), 'r3', 'A4'); });

/* フォームの 入力欄で 板の 短縮キー（Ctrl+PageDown・Ctrl+D・Ctrl+Y）＝前は 板が 移って 閉じる時に 別の板へ 書いた */
新しい本(); win.eval("sheets.push({name:'Sheet2',data:{'1,0':{v:'s2a'}},colW:{},rowH:{}})"); if (typeof win.rebuildSheetTabs === 'function') win.rebuildSheetTabs();
win.setCell(0, 0, '名'); for (let r = 1; r <= 3; r++) win.setCell(r, 0, 'r' + r);
win.undoStack.length = 0; win.redoStack.length = 0; win.setCell(5, 5, 'z'); win.doUndo();
eq(win.redoStack.length, 1, 'やり直しが 1つ 在る');
選ぶ(1, 0); eq(win.フォームの窓を開く(), 1, 'フォームが 開いた');
const 入力欄 = doc.querySelector('#formBody .form-v'); 入力欄.focus();
const Ctrl = (k) => 入力欄.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true }));
Ctrl('PageDown'); Ctrl('d'); Ctrl('y');
await T('★フォームの 入力欄で Ctrl+PageDown・Ctrl+D・Ctrl+Y＝板は 動かない★', () => {
  eq(win.activeSheet, 0, '板'); eq(字(2, 0), 'r2', 'A3'); eq(win.redoStack.length, 1, 'やり直し'); eq(字(5, 5), '', 'F6');
});
win.フォームを閉じる();
await T('★→閉じても 別の板へ 書かない★', () => { eq(String(win.sheets[1].data['1,0'].v), 's2a', 'Sheet2 A2'); eq(字(1, 0), 'r1', 'A2'); });

/* Alt の キーチップ（onKD とは 別の 受け口）＝前は 入力欄で Alt→H→D が 行を 消し、閉じると 詰めた 行へ 古い字（名|r1|r3＝r2 が 消えた） */
新しい本(); win.setCell(0, 0, '名'); for (let r = 1; r <= 3; r++) win.setCell(r, 0, 'r' + r); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 欄A = doc.querySelector('#formBody .form-v'); 欄A.focus();
const キー = (t, k, alt) => 欄A.dispatchEvent(new win.KeyboardEvent(t, { key: k, altKey: !!alt, bubbles: true }));
キー('keydown', 'Alt', true); キー('keyup', 'Alt', false); キー('keydown', 'h'); キー('keyup', 'h'); キー('keydown', 'd'); キー('keyup', 'd');
await T('★フォームの 入力欄で Alt→H→D（行を削除）＝板は 動かない★', () => { eq([0, 1, 2, 3].map((r) => 字(r, 0)).join('|'), '名|r1|r2|r3', 'A列'); });
win.フォームを閉じる();
await T('★→閉じても 行が 消えない・古い字で 上書きされない★', () => { eq([0, 1, 2, 3].map((r) => 字(r, 0)).join('|'), '名|r1|r2|r3', 'A列'); });

/* 本を 開く 入り口（ファイルを 落とす・選ぶ）＝前は 開いたまま 本を 落とすと、閉じる時に 前の本の 字を 新しい本へ 書いた */
新しい本(); win.setCell(0, 0, '名'); win.setCell(1, 0, 'r1'); 選ぶ(1, 0); win.フォームの窓を開く();
const 元の開く = win.openBookFile; let 開いた = 0; win.openBookFile = () => { 開いた++; };
const 落とす = new win.Event('drop', { bubbles: true, cancelable: true });
Object.defineProperty(落とす, 'dataTransfer', { value: { files: [{ name: 'b.xlsx' }] } });
win.dispatchEvent(落とす);
win.onPickBookFile({ files: [{ name: 'b.xlsx' }], value: 'b.xlsx' });
await T('★フォームを 開いたまま 本を 落とす・選ぶ＝開かない★', () => { eq(開いた, 0, '本を 開いた 回数'); });
win.フォームを閉じる();
win.onPickBookFile({ files: [{ name: 'b.xlsx' }], value: 'b.xlsx' });
await T('★→閉じた後は 開ける（守りが 残って 開けなく ならない）★', () => { eq(開いた, 1, '本を 開いた 回数'); });
win.openBookFile = 元の開く;

/* 最後の 守り＝客が 直した 欄だけ 入れる・開いた後に 下の 字が 変わった 欄は 入れない */
新しい本(); win.setCell(0, 0, '名'); win.setCell(0, 1, '数'); win.setCell(0, 2, '備考');
win.setCell(1, 0, 'a'); win.setCell(1, 1, 1); win.setCell(1, 2, 'x'); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 欄 = [...doc.querySelectorAll('#formBody .form-v')];
win.setCell(1, 0, '下で変えた'); win.setCell(1, 2, '下で変えた2');   /* 開いている 間に 下が 変わった（守りを 抜けた 道の 代わり） */
欄[1].value = '9'; 欄[2].value = '客が打った';
win.フォームを閉じる();
await T('★客が 直していない 欄は 書かない（下で 変わった 字を 古い字で 戻さない）★', () => { eq(字(1, 0), '下で変えた', 'A2'); });
await T('★客が 直した 欄で 下が 同じなら 入れる★', () => { eq(字(1, 1), '9', 'B2'); });
await T('★客が 直した 欄でも 下が 変わっていれば 入れない★', () => { eq(字(1, 2), '下で変えた2', 'C2'); });

/* 穴5＝隠す→全部出す→集計行→Ctrl+Z。前は 集計行の 控えが 無く 全部出す が 戻って 行が 隠れ、集計行は 残った */
新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, false);
win.sel(1, 0, 1, 0); win.ctxHideRow();
win.sel(0, 0, 2, 0); win.ctxUnhideRow();
選ぶ(1, 0); 窓で決める(null, null, true, true);
win.doUndo();
await T('★穴5：再表示→集計行→Ctrl+Z＝集計行だけ 戻り 行は 出たまま★', () => {
  eq(表(), '表1:0-2', '表'); eq(字(3, 0), '', 'A4');
  eq(!!(win.sheets[0].hiddenRows || {})[1], false, '2行目は 出たまま');
});

console.log('\ntorikeshi-hyou: ' + pass + ' 緑 / ' + fail + ' 赤');
if (SELF2) { if (fail === 0) { console.log('★--self-test-futatsu なのに 赤が 0＝空振り'); process.exit(1); } console.log('★--self-test-futatsu: 控えを 2つ 積む 形で 赤 ' + fail + '＝見張りは 効いている'); process.exit(0); }
if (SELF) { if (fail === 0) { console.log('★--self-test なのに 赤が 0＝見張りが 効いていない'); process.exit(1); } console.log('★--self-test: 直す前の 形で 赤 ' + fail + '＝見張りは 効いている'); process.exit(0); }
process.exit(fail ? 1 : 0);
