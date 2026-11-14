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


const SELF2 = process.argv.includes('--self-test-futatsu');
/* ★--self-test は 守りを 1つずつ 抜いて 回す★（2026-11-14・設計5版）＝前は 全部を 一度に 抜き、Alt の 守りが 抜けても 赤に ならなかった
   --self-test＝下の 守り ごとに 自分を --self-test=<名> で 回し、どれも 赤が 1以上で なければ exit1 */
const 守り = {
  '表を決める': () => 抜く('表を決める', 'if (見出し行 || 今) _pushRowColUndo();', ''),
  'フォームで消す': () => 抜く('フォームで消す', /_pushRowColUndo\(\);/, ''),
  'doUndo': () => 抜く('doUndo', 'if(typeof _フォーム!=="undefined" && _フォーム) return;', ''),
  'doRedo': () => 抜く('doRedo', 'if(typeof _フォーム!=="undefined" && _フォーム) return;', ''),
  'onKD': () => {
    /* onKD は addEventListener で 掴まれている＝外して 守りを 抜いた 物を 付け直す */
    doc.removeEventListener('keydown', win.onKD);
    抜く('onKD', 'if(typeof _フォーム!=="undefined" && _フォーム) return;', '');
    doc.addEventListener('keydown', win.onKD);
  },
  'リボンキー': () => win.eval('_リボンキーをフォームが止める = function(){ return false; };'),
  '本を開く': () => win.eval('_フォームが開いていれば断る = function(){ return false; };'),
  '閉じ込め': () => win.eval('_窓を閉じ込める = function(){};'),
  'ログインの窓': () => 抜く('_窓を閉じ込める', " || e.id === 'loginOv'", ''),
  '写しの比べ': () => win.eval('_フォームの下が同じ = function(){ return true; };'),
  '改行の欄': () => 抜く('フォームを描く', "/[\\r\\n]/.test(v) ? 'textarea' : 'input'", "'input'"),
  '打ちかけの確定': () => 抜く('フォームの窓を開く', 'if (editingCell) { commitEdit(); if (editingCell) return 0; }', ''),
  '帯の打ちかけ': () => 抜く('フォームの窓を開く', 'if (帯 && document.activeElement === 帯 &&', 'if (false &&'),
  '帯を揃える': () => 抜く('フォームの窓を開く', "帯.value = (getCell(selR1, selC1).f || '').replace(/\\n/g, ' ↵ ');", ''),
  '帯の断り':() => 抜く('フォームの窓を開く', 'if (!帯が通った) return 0;', ''),
  '足す先の確かめ':() => 抜く('フォームで足す', 'if (断り) {', 'if (false) {'),
  'はみ出す表': () => 抜く('_フォームで足せない訳', '(h.c1 < f.c1 || h.c2 > f.c2)', 'false'),
  '開くの集計': () => 抜く('フォームの窓を開く', 'if (Table.重なる(表の箱().filter(function (x) { return x.集計行; }), 場所.r1, 場所.c1, 場所.r2, 場所.c2)) {', 'if (false) {'),
  '伸ばす表': () => 抜く('フォームで足す', 't[i].r2 === f.r2 - 1 && t[i].c1 >= f.c1 && t[i].c2 <= f.c2', 't[i].c1 === f.c1 && t[i].r1 === f.r1'),
};
function 抜く(名, 行, 代わり) {
  const 元 = String(win[名]); const 抜いた = 元.replace(行, 代わり);
  if (抜いた === 元) { console.log('★--self-test: ' + 名 + ' の 守りが 見つからない（空振り）'); process.exit(1); }
  win.eval(抜いた);
}
const SELF_ARG = process.argv.find((a) => a.startsWith('--self-test='));
const SELF = !!SELF_ARG;
if (process.argv.includes('--self-test')) {
  const { spawnSync } = await import('node:child_process');
  let 空振り = 0;
  for (const 名 of Object.keys(守り)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--self-test=' + 名], { encoding: 'utf8' });
    const 行 = (r.stdout || '').split('\n').filter((s) => s.includes('★--self-test')).join(' ');
    console.log('  ' + (r.status === 0 ? 'ok ' : 'NG ') + 名 + '：' + (行 || (r.stderr || '').slice(0, 200)));
    if (r.status !== 0) 空振り++;
  }
  console.log(空振り ? '★--self-test: 赤に ならない 守りが ' + 空振り + ' 本' : '★--self-test: 守り ' + Object.keys(守り).length + ' 本 全部 抜くと 赤');
  process.exit(空振り ? 1 : 0);
}
if (SELF2) {
  /* 見出し無しで 作る時も 表を決める が 積む 形＝控えが 2つ（2回 押さないと 戻らない）で 赤に なるか */
  抜く('表を決める', 'if (見出し行 || 今) _pushRowColUndo();', '_pushRowColUndo();');
}
if (SELF) {
  const 名 = SELF_ARG.slice('--self-test='.length);
  if (!守り[名]) { console.log('★--self-test: 知らない 守り ' + 名); process.exit(1); }
  守り[名]();
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

/* やり直し（doRedo）も 開いている 間は 断る＝前は 全部の 守りを 一度に 抜いて 回し、この 守りだけ 抜けても 赤に ならなかった */
新しい本(); win.setCell(0, 0, '名'); win.setCell(1, 0, 'r1'); win.setCell(1, 0, '直した'); win.doUndo();
選ぶ(1, 0); win.フォームの窓を開く();
win.doRedo();
await T('★フォームを 開いたまま やり直し は 断る★', () => { eq(字(1, 0), 'r1', 'A2'); eq(win.redoStack.length, 1, 'やり直しの 控え'); });
win.フォームを閉じる();

/* 最後の 守り（層B）＝客が 直した 欄だけ 入れる・表の 範囲が 開いた 時と 違えば どの 欄も 入れない */
const 三列 = () => { 新しい本(); win.setCell(0, 0, '名'); win.setCell(0, 1, '数'); win.setCell(0, 2, '備考');
  win.setCell(1, 0, 'a'); win.setCell(1, 1, 1); win.setCell(1, 2, 'x'); win.undoStack.length = 0; };
const 欄 = () => [...doc.querySelectorAll('#formBody .form-v')];
三列(); 選ぶ(1, 0); win.フォームの窓を開く();
欄()[1].value = '9';
win.フォームを閉じる();
await T('★下が 変わらなければ 客が 直した 欄だけ 入れる★', () => { eq(字(1, 1), '9', 'B2'); eq(字(1, 0), 'a', 'A2'); eq(字(1, 2), 'x', 'C2'); eq(win.undoStack.length, 1, '控え'); });

三列(); 選ぶ(1, 0); win.フォームの窓を開く();
win.setCell(1, 0, '下で変えた');   /* 開いている 間に 下が 変わった（inert を 抜けた 道の 代わり） */
欄()[1].value = '9'; 欄()[2].value = '客が打った';
win.フォームを閉じる();
await T('★下が 変わったら どの 欄も 入れない（下の 字も 古い字で 戻さない）★', () => { eq(字(1, 0), '下で変えた', 'A2'); eq(字(1, 1), '1', 'B2'); eq(字(1, 2), 'x', 'C2'); });

/* 止め1 の 再現＝A列 名/r1/r2/r3・B列 空。2行目で 開いて B に 打つ→行を削除（inert を 飛ばした 道）→閉じる。
   前は 下が 空どうしで 字の 比べを 抜け、r2 の 行へ「r1の備考」を 書いた */
新しい本(); win.setCell(0, 0, '名'); win.setCell(0, 1, '備考'); for (let r = 1; r <= 3; r++) win.setCell(r, 0, 'r' + r); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
欄()[1].value = 'r1の備考';
win.sel(1, 0, 1, 0); win.ctxDeleteRow();
win.フォームを閉じる();
await T('★開いたまま 行を 消す→閉じても 別の 行へ 書かない★', () => { eq([1, 2].map((r) => 字(r, 0) + '/' + 字(r, 1)).join('|'), 'r2/|r3/', 'A2:B3'); });
await T('★→窓は 閉じて 閉じ込めも 解ける★', () => { eq(win._フォーム, null, '_フォーム'); eq(doc.querySelectorAll('[inert]').length, 0, 'inert の 数'); });

/* 層A＝開くと 外の 子へ inert・focus は 窓の 中・閉じると 外れる・前から inert の 物は 残す */
三列(); const 前から = doc.body.children[0]; 前から.setAttribute('inert', '');
選ぶ(1, 0); win.フォームの窓を開く();
const ov = doc.getElementById('formOverlay');
await T('★開くと 窓の 外の body 直下の 子が 全部 inert★', () => {
  const 外 = [...doc.body.children].filter((e) => e !== ov && e.id !== 'loginOv');   /* ログインの窓は 閉じ込めない（下の 試験） */
  eq(外.filter((e) => !e.hasAttribute('inert')).length, 0, 'inert の 無い 外の 子'); eq(ov.hasAttribute('inert'), false, '窓');
});
await T('★focus は 窓の 中の 最初の 欄★', () => { eq(doc.activeElement === 欄()[0], true, 'activeElement'); });
eq(win.フォームの窓を開く(), 0, '2回目は 開かない');
win.フォームを閉じる();
await T('★閉じると 自分が 付けた inert だけ 外れる★', () => { eq(doc.querySelectorAll('[inert]').length, 1, 'inert の 数'); eq(前から.hasAttribute('inert'), true, '前から'); });
await T('★閉じると focus は マスの 入力欄（開いた ボタンへ 戻さない）★', () => { eq(doc.activeElement && doc.activeElement.id, 'cell-input', 'activeElement'); });
前から.removeAttribute('inert');

/* ★ログインの窓は 閉じ込めない★＝フォームを 開いたまま ログインが 切れても ログインの 欄が 打てる（穴9 の 叩きの 止め1） */
{ const 在った = doc.getElementById('loginOv');   /* js/exally-login.js が 読み込みで 足す 物を 使う・無ければ 同じ 形で 足す */
  const lo = 在った || doc.body.appendChild(Object.assign(doc.createElement('div'), { id: 'loginOv' }));
  三列(); 選ぶ(1, 0); win.フォームの窓を開く();
  doc.body.classList.add('exally-locked');
  await T('★フォームを 開いたまま ロック→ログインの窓に inert が 無い★', () => { eq(lo.hasAttribute('inert'), false, '#loginOv の inert'); eq(lo.closest('[inert]'), null, '祖先の inert'); eq(!!在った, true, 'ログインの窓は 読み込みで 在る'); });
  doc.body.classList.remove('exally-locked'); win.フォームを閉じる(); if (!在った) lo.remove(); }

/* 止め2＝改行と & の マス。触らず 閉じても 字も 控えも 変わらない・改行の マスを 直すと 改行が 残る */
新しい本(); win.setCell(0, 0, '名'); win.setCell(0, 1, 'メモ'); win.setCell(0, 2, '社');
win.setCell(1, 0, 'a'); win.setCell(1, 1, '1行目\n2行目'); win.setCell(1, 2, 'A&amp;B'); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く(); win.フォームを閉じる();
await T('★改行と & の マスは 開いて 閉じるだけで 変わらない★', () => { eq(字(1, 1), '1行目\n2行目', 'B2'); eq(字(1, 2), 'A&amp;B', 'C2'); eq(win.undoStack.length, 0, '控え'); });
選ぶ(1, 0); win.フォームの窓を開く(); 欄()[1].value = '1行目\n3行目'; win.フォームを閉じる();
await T('★改行の マスを 直すと 改行が 残る★', () => { eq(字(1, 1), '1行目\n3行目', 'B2'); });

/* 設計前の 叩きの 止め1＝打ちかけの マスで 開く。前は 開いた 後の blur（100ms）で 確定が 入り、写しと 食い違って 打った 字を 全部 捨てた */
三列(); win.setCell(2, 0, 'b'); win.setCell(2, 1, 20); win.undoStack.length = 0;
win.sel(2, 1, 2, 1); win.startEdit(2, 1); doc.getElementById('cell-input').value = '99';
win.フォームの窓を開く();   /* 選び直さない（選び直すと そこで 確定する） */
await new Promise((ok) => setTimeout(ok, 250));
欄()[2].value = '打った';
win.フォームを閉じる();
await T('★打ちかけの マスで 開く→先に 決まり、フォームの 字も 入る★', () => { eq(字(2, 1), '99', 'B3'); eq(字(1, 2), '打った', 'C2'); });

/* 本番前の 叩きの 止め1＝数式の 帯で 打ちかけの まま キーチップ（Alt→N→F→R）で 開く。
   前は 写しを 撮った 後に 帯の blur が 確定し、閉じる 時「開いている間に 表が 変わった」で フォームの 字を 全部 捨てた */
{ const fi = doc.getElementById('formula-input'), kb = doc.getElementById('formula-kb');
  三列(); win.setCell(2, 0, 'b'); win.setCell(2, 1, 20); win.undoStack.length = 0;
  win.sel(2, 1, 2, 1); kb.style.display = 'none'; fi.focus(); fi.value = '77'; fi.dispatchEvent(new win.Event('input'));
  const 開いた帯 = win.フォームの窓を開く();
  await new Promise((ok) => setTimeout(ok, 250));
  if (開いた帯) { 欄()[2].value = '帯から'; win.フォームを閉じる(); }
  await T('★帯で 打ちかけの まま 開く→帯の 字が 先に 決まり、フォームの 字も 入る★', () => { eq(開いた帯, 1, '開いた'); eq(字(2, 1), '77', 'B3'); eq(字(1, 2), '帯から', 'C2'); });

  /* 全角で 打つ＝setCell は 半角に 直す。前は 帯の 字が 全角の まま 残り、開いた 後の blur で もう一度 書いて 空の 控えが 2本 積まれた（叩き直しの 任意1） */
  三列(); win.setCell(2, 0, 'b'); win.setCell(2, 1, 20); win.undoStack.length = 0;
  win.sel(2, 1, 2, 1); kb.style.display = 'none'; fi.focus(); fi.value = '７７'; fi.dispatchEvent(new win.Event('input'));
  const 開いた全角 = win.フォームの窓を開く();
  await new Promise((ok) => setTimeout(ok, 250));
  if (開いた全角) win.フォームを閉じる();
  await T('★帯で 全角を 打って 開く→控えは 1本だけ★', () => { eq(開いた全角, 1, '開いた'); eq(字(2, 1), '77', 'B3'); eq(win.undoStack.length, 1, '控え'); });

  /* 帯の 字が 入力の 決まりで 断られた＝開かない（マスの 打ちかけと 同じ）。帯の 字は マスの 字へ 戻る */
  三列(); win.setCell(2, 0, 'b'); win.setCell(2, 1, 5); win.undoStack.length = 0;
  win.eval("sheets[0].validations={'2,1':{kind:'int',min:1,max:10}};");
  win.sel(2, 1, 2, 1); kb.style.display = 'none'; fi.focus(); fi.value = '99'; fi.dispatchEvent(new win.Event('input'));
  const 開いた断り = win.フォームの窓を開く();
  if (開いた断り) win.フォームを閉じる();
  await T('★帯の 字が 決まりで 断られた→開かない・マスは 前の まま★', () => { eq(開いた断り, 0, '開かない'); eq(字(2, 1), '5', 'B3'); eq(fi.value, '5', '帯の 字'); });
  win.eval('delete sheets[0].validations;'); fi.blur(); }

/* 穴10＝フォームで 足す の 下の 行。前は 確かめずに 書き、集計行（SUBTOTAL）や 表の 下の 字を 上書きした */
const 足す断り = () => doc.getElementById('formWhy').textContent;
新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, true); win.undoStack.length = 0;
const 集計の式 = 字(3, 1);
選ぶ(1, 0); win.フォームの窓を開く();
const 足す集計 = win.フォームで足す(); const 断り集計 = 足す断り(); win.フォームを閉じる();
await T('★穴10：集計行の ある 表で 足す→断る（集計行は そのまま）★', () => {
  eq(足す集計, 0, '足す'); ok(/集計行/.test(断り集計), '断りの 字＝' + 断り集計);
  eq(字(3, 0), '集計', 'A4'); eq(字(3, 1), 集計の式, 'B4'); eq(表(), '表1:0-3+集計', '表');
});
win.setCell(3, 0, ''); win.setCell(3, 1, ''); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 足す空集計 = win.フォームで足す(); win.フォームを閉じる();
await T('★穴10：集計行を 空にしても 集計行は 集計行＝断る★', () => { eq(足す空集計, 0, '足す'); eq(表(), '表1:0-3+集計', '表'); });

/* 表の 無い 所は 表のまわりを当てる が 続く 字を 全部 含める＝すぐ下は 必ず 空。字が 下に 来るのは 表の 時だけ */
新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, false); win.setCell(3, 1, 'x'); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 足す字 = win.フォームで足す(); win.フォームを閉じる();
await T('★穴10：表の すぐ下（B4）に 字→断る・字は 残る・表は 伸びない★', () => { eq(足す字, 0, '足す'); eq(字(3, 1), 'x', 'B4'); eq(字(3, 0), '', 'A4'); eq(表(), '表1:0-2', '表'); });
win.setCell(3, 1, ''); win.sheets[0].data['3,1'] = { v: '', s: { b: 1 } }; win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 足す書式 = win.フォームで足す(); win.フォームを閉じる();
await T('★穴10：すぐ下が 書式だけ（字は 空）→足せる★', () => { eq(足す書式, 1, '足す'); eq(表(), '表1:0-3', '表'); });

新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, false);
win.sheets[0].tables.push({ 名: '表2', r1: 3, c1: 0, r2: 4, c2: 1, 見出し行: true, 列名: ['p', 'q'], 集計行: false });
選ぶ(1, 0); win.フォームの窓を開く();
const 足す表 = win.フォームで足す(); const 断り表 = 足す断り(); win.フォームを閉じる();
await T('★穴10：すぐ下に 別の 表（空）→断る★', () => { eq(足す表, 0, '足す'); ok(/表2/.test(断り表), '断りの 字＝' + 断り表); });

新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, false); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 足す空 = win.フォームで足す(); win.フォームを閉じる();
await T('★穴10：下が 空なら 足せる・表も 1行 伸びる★', () => { eq(足す空, 1, '足す'); eq(表(), '表1:0-3', '表'); });

新しい本(); const 底 = win.eval("ROWS"); win.setCell(底 - 2, 0, '名'); win.setCell(底 - 1, 0, 'a'); win.undoStack.length = 0;
選ぶ(底 - 1, 0); win.フォームの窓を開く();
const 足す底 = win.フォームで足す(); win.フォームを閉じる();
await T('★穴10：シートの 一番 下では 足せない（板の 外へ 書かない）★', () => {
  eq(足す底, 0, '足す'); eq(Object.keys(win.sheets[0].data).some((k) => parseInt(k) >= 底), false, '板の 外の マス');
});

/* 叩き直しの 止め1＝表の 隣の 列から 開く。前は 当てた 塊が 集計行まで 含み 断りを 素通り・集計行が 中身に 化けた */
新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, true);
for (let r = 0; r <= 3; r++) win.setCell(r, 2, 'c' + r); win.undoStack.length = 0;
選ぶ(1, 2); const 開く右 = win.フォームの窓を開く(); if (開く右) { win.フォームで足す(); win.フォームを閉じる(); }
await T('★穴10：集計行の ある 表の 右隣から 開く→開かない・表と 集計行は そのまま★', () => {
  eq(開く右, 0, '開く'); eq(表(), '表1:0-3+集計', '表'); eq(字(3, 0), '集計', 'A4'); eq(字(4, 0), '', 'A5');
});
新しい本(); win.setCell(0, 1, '名'); win.setCell(0, 2, '数'); win.setCell(1, 1, 'a'); win.setCell(1, 2, 1); win.setCell(2, 1, 'b'); win.setCell(2, 2, 2);
選ぶ(0, 1); 窓で決める('B1:C3', '表1', true, false);
for (let r = 0; r <= 2; r++) win.setCell(r, 0, 'L' + r); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 足す左 = win.フォームで足す(); win.フォームを閉じる();
await T('★穴10：表の 左隣から 開いて 足す→表も 1行 伸びる（中身と 表が ずれない）★', () => { eq(足す左, 1, '足す'); eq(表(), '表1:0-3', '表'); });
新しい本(); 名と数(); 選ぶ(0, 0); 窓で決める('A1:B3', '表1', true, false);
win.sheets[0].data['3,1'] = { v: '', d: '表示だけ' }; win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 足すd = win.フォームで足す(); win.フォームを閉じる();
await T('★穴10：下が 表示の 字（d）だけでも 断る★', () => { eq(足すd, 0, '足す'); eq(表(), '表1:0-2', '表'); });

/* 叩き直し2の 止め1＝列の 一部だけ 掛かる 表。前は 表の 幅ごと 伸ばし、下の 別の 表と 重なった */
新しい本(); win.setCell(0, 1, '名'); win.setCell(0, 2, '数'); win.setCell(1, 1, 'a'); win.setCell(2, 1, 'b');
win.sheets[0].tables = []; win.sheets[0].tables.push({ 名: '表T', r1: 0, c1: 1, r2: 2, c2: 4, 見出し行: true, 列名: ['名', '数', '列1', '列2'], 集計行: false });
win.sheets[0].tables.push({ 名: '表3', r1: 3, c1: 3, r2: 5, c2: 4, 見出し行: true, 列名: ['p', 'q'], 集計行: false });
for (let r = 0; r <= 2; r++) win.setCell(r, 0, 'L' + r); win.undoStack.length = 0;
選ぶ(1, 0); win.フォームの窓を開く();
const 足すはみ = win.フォームで足す(); const 断りはみ = 足す断り(); win.フォームを閉じる();
await T('★穴10：列の 一部だけ 掛かる 表→断る・表は 伸びず 下の 表と 重ならない★', () => {
  eq(足すはみ, 0, '足す'); ok(/表T/.test(断りはみ), '断りの 字＝' + 断りはみ); eq(表(), '表T:0-2,表3:3-5', '表'); eq(字(3, 0), '', 'A4');
});

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
