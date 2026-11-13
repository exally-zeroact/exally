/* torikeshi-rowcol.test.mjs — ★行・列の 取り消し／やり直しを 正しく 戻す★（押し0a・2026-11-14・設計＝4〜6版）
 *  ★なぜ★ 今の本番（d5972646）で 見つけた 穴：
 *    ① やり直しが 空振り（op を そのまま 積み直す）
 *    ② 戻すと 板の 物が 差し替わる（sheets[i] = 控え）
 *    ③ 戻した後に 計算側（HF）へ 流さない＝★画面の 値と 計算が 食い違う★
 *    ④ 控えを JSON で 写すので ★画像が {} に なる★
 *    ⑤ 開いた本で 打つ前に 行を足すと、最初の 1打ちで 控えが 取り直され ★行の挿入が 書き出しから 消える★
 *    ⑥ 見た目だけの 操作（固定・隠す）の 戻しが ★データまで 丸ごと 戻す★／やり直しで 見た目の 印が 落ちる
 *    ⑦ 並べ替え・重複の削除が ★計算し直す 前の 値★で 決める（開いた本）
 *  使い方: node tests/torikeshi-rowcol.test.mjs ／ EXALLY_BOOK=<別の book.html> で 壊しを 試す
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const T = async (n, fn) => { try { await fn(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  NG   ' + n + '\n       ' + (e && e.message)); } };
const ok = (c, m) => { if (!c) throw new Error(m || 'expected truthy'); };
const eq = (a, b, m) => { if (a !== b) throw new Error((m ? m + ': ' : '') + '期待=' + JSON.stringify(b) + ' 実際=' + JSON.stringify(a)); };

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); }
catch { console.log('★jsdomが入っていません（SKIPを緑と呼ばない）。npm ci してください。'); process.exit(1); }

const BOOK = process.env.EXALLY_BOOK || path.join(ROOT, 'book.html');
const html = fs.readFileSync(BOOK, 'utf8');
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
const inject = (code) => { const el = doc.createElement('script'); el.textContent = code; doc.body.appendChild(el); };
for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1].split('?')[0]).filter((s) => !/^https?:/.test(s))) {
  const p = path.join(ROOT, src);
  if (fs.existsSync(p)) { try { inject(fs.readFileSync(p, 'utf8')); } catch (e) { /* 続ける */ } }
}
for (const m of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) { try { inject(m[1]); } catch (e) { /* 続ける */ } }
try { doc.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { /* 続ける */ }
try { win.dispatchEvent(new win.Event('load')); } catch (e) { /* 続ける */ }
/* ★開く 道具は 本番でも 後から 読む（_ensureXlsx と 同じ 順）＋ 開いた本の 控え（js/book-open.js）★ */
for (const f of ['lib/xlsx.full.min.js', 'lib/xlsx-io.js', 'lib/zip-surgeon.js', 'lib/xlsx-edit.js', 'lib/xlsb-edit.js',
  'lib/xlsb-jitai.js', 'lib/table-refs.js', 'lib/xlsx-kazari.js', 'lib/xlsx-zukei.js', 'lib/diff-preview.js', 'js/book-open.js']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) inject(fs.readFileSync(p, 'utf8'));
}
win.showToast = () => {};
if (!win.XlsxKazari) { console.log('★XlsxKazari が 読めない＝開いた本の 試験が 空振りする★'); process.exit(1); }
/* ★zip を 開く 道具（workbook.xml の calcPr を 読む）＝diff-preview.test.mjs と 同じ 渡し方★ */
win.CompressionStream = globalThis.CompressionStream; win.DecompressionStream = globalThis.DecompressionStream;
win.Response = globalThis.Response; win.Blob = globalThis.Blob;

const 板 = (i) => win.sheets[i];
const d = (i, k) => { const x = 板(i).data[k]; return x ? x.d : undefined; };
const 台の値 = (i, r, c) => { const v = win.hf.getCellValue({ sheet: win._hfSid(i), row: r, col: c }); return (v && typeof v === 'object') ? String(v.value || v) : v; };
const 新しい本 = () => {
  win.eval("sheets.length=1; sheets[0]={name:'Sheet1',data:{},colW:{},rowH:{}}; activeSheet=0; undoStack.length=0; redoStack.length=0;"
    + " _engineLoaded={}; if(typeof initFormulaEngine==='function') initFormulaEngine(['Sheet1']); loadSheetIntoEngine(0);");
  if (typeof win.rebuildSheetTabs === 'function') win.rebuildSheetTabs();
};
const 変わったマス = () => {
  let n = 0; const 出 = [];
  for (const sh of win.sheets) { const c = win.BookOpen.changedCells(sh); for (const k of Object.keys(c)) { n++; 出.push(sh.name + '|' + k + '=' + c[k]); } }
  return { n, 出: 出.join(' ') };
};
/* ★保存された 答え（999）と うちの 答え（20）が 食い違う 本★を 作って 開く（任意1＝食い違いが 無いと 壊しても 緑） */
const 本を開く = async (板たち) => {
  const X = win.XLSX;
  const wb = X.utils.book_new();
  for (const [名, セル] of 板たち) {
    const ws = {}; let maxR = 0, maxC = 0;
    for (const [番地, c] of Object.entries(セル)) {
      ws[番地] = c; const a = X.utils.decode_cell(番地); maxR = Math.max(maxR, a.r); maxC = Math.max(maxC, a.c);
    }
    ws['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    X.utils.book_append_sheet(wb, ws, 名);
  }
  const u8 = new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx' }));
  const file = { name: 'tameshi.xlsx', arrayBuffer: () => Promise.resolve(u8.buffer.slice(0)) };
  await win.openBookFile(file);
  ok(win.BookOpen.isOpened(), '前提：本が 開いていない');
};
const 食い違う本 = [['Sheet1', {
  A1: { t: 'n', v: 999, f: 'C1*2' },   /* ★うちの 答え＝20・保存された 答え＝999★ */
  A2: { t: 'n', v: 50 },
  C1: { t: 'n', v: 10 },
  B2: { t: 'n', v: 7 },
}]];

console.log('\n[torikeshi-rowcol] 行・列の 取り消し／やり直し' + (process.env.EXALLY_BOOK ? '（壊しの 本: ' + path.basename(BOOK) + '）' : ''));

/* ── ① やり直しの 空振り・② 板の 物 ── */
新しい本();
win.setCell(0, 0, '1', true); win.setCell(1, 0, '2', true);
const 元の板 = 板(0);
win.sel(1, 0, 1, 0); win.ctxInsertRow();
await T('行挿入→Z→Y→Z：毎回 動く・板の 物は 同じ（===）', () => {
  eq(d(0, '2,0') ?? 板(0).data['2,0']?.v, '2', '挿入した後 A3');
  win.doUndo(); eq(板(0).data['1,0']?.v, '2', 'Z の後 A2'); eq(板(0).data['2,0'], undefined, 'Z の後 A3');
  win.doRedo(); eq(板(0).data['2,0']?.v, '2', 'Y の後 A3'); eq(板(0).data['1,0'], undefined, 'Y の後 A2');
  win.doUndo(); eq(板(0).data['1,0']?.v, '2', '2回目の Z の後 A2');
  ok(板(0) === 元の板, '★板の 物が 差し替わった★');
});

/* ── ③ 戻した後に 計算側へ 流す ── */
新しい本();
win.setCell(0, 0, '3', true); win.setCell(1, 0, '1', true); win.setCell(2, 0, '2', true); win.setCell(0, 3, '=A1', true);
win.sel(0, 0, 2, 0); win.sortRange('asc');
await T('並べ替え→Z：A1 と D1（=A1）が 計算側と 同じ', () => {
  eq(String(d(0, '0,3')), '1', '並べ替えた後 D1');
  win.doUndo();
  eq(板(0).data['0,0']?.v, '3', 'Z の後 A1');
  eq(String(台の値(0, 0, 0)), '3', '★計算側の A1★');
  eq(String(d(0, '0,3')), '3', '★D1 の 答え★');
});

新しい本();
win.addSheet(); win.addSheet();
win.switchSheet(0); win.setCell(0, 0, '3', true); win.setCell(1, 0, '1', true);
win.switchSheet(1); win.setCell(0, 0, '=Sheet1!A1', true);
win.switchSheet(2); win.setCell(0, 0, '=Sheet2!A1', true);
win.switchSheet(0); win.sel(0, 0, 1, 0); win.sortRange('asc');
await T('2段の つながり（Sheet3=Sheet2!A1・Sheet2=Sheet1!A1）：並べ替え→すべて再計算→Z で Sheet3 の 答えが 戻る', () => {
  win.すべて再計算();
  eq(String(d(2, '0,0')), '1', '前提：すべて再計算で Sheet3 が 1');
  win.doUndo();
  eq(String(d(1, '0,0')), '3', 'Sheet2 A1'); eq(String(d(2, '0,0')), '3', '★Sheet3 A1★');
  /* ★計算側が 古いと 次に 打った 時に 出る★＝A2 を 打つと つられて 計算し直す */
  win.switchSheet(0); win.setCell(1, 0, '9');
  eq(String(d(1, '0,0')), '3', '打った後 Sheet2 A1'); eq(String(d(2, '0,0')), '3', '★打った後 Sheet3 A1★');
});

/* ── ④ 画像 ── */
新しい本();
win.setCell(0, 0, 'x', true);
{
  const 画1 = new win.Image(), 画2 = new win.Image();
  板(0).objects = [{ 種: '画像', x: 10, y: 10, w: 20, h: 20, 画像: 画1 },
    { 種: 'グループ', x: 0, y: 0, w: 50, h: 50, 中身: [{ 物: { 種: '画像', x: 0, y: 0, w: 5, h: 5, 画像: 画2 } }] }];
}
win.sel(0, 0, 0, 0); win.ctxInsertRow();
await T('画像（じかに・グループの中）：行挿入→Z で 画像が Image のまま', () => {
  win.doUndo();
  ok(板(0).objects[0].画像 instanceof win.HTMLImageElement, '★じかに置いた 画像が 壊れた★');
  ok(板(0).objects[1].中身[0].物.画像 instanceof win.HTMLImageElement, '★グループの中の 画像が 壊れた★');
  win.doRedo();
  ok(板(0).objects[0].画像 instanceof win.HTMLImageElement, 'Y の後 じかに置いた 画像');
});

/* ── 選び（E） ── */
新しい本();
板(0).objects = [{ 種: '四角', x: 10, y: 10, w: 20, h: 20 }, { 種: '四角', x: 40, y: 10, w: 20, h: 20 }];
win.eval('選んだ物 = sheets[0].objects[0]; えらんだ物たち = sheets[0].objects.slice();');
win.sel(0, 0, 0, 0); win.ctxInsertRow();
await T('物2つ 選ぶ→行挿入→Z：前の 選びを 持ち越さない', () => {
  win.doUndo();
  eq(win.eval('選んだ物'), null, '選んだ物'); eq(win.eval('えらんだ物たち.length'), 0, 'えらんだ物たち');
});

/* ── 見た目だけ（6版 止め2）── */
新しい本();
win.setCell(0, 0, '1', true);
win.sel(4, 0, 4, 0); win.ctxHideRow();
win.setCell(0, 0, '77', true);   /* ★控えを 積まずに データを 変える 道（集計行を出す 17477 と 同じ形）★ */
await T('行を隠す→（控えなしで A1=77）→Z：隠しは 戻り A1 は 77 のまま・計算側も 77', () => {
  win.doUndo();
  ok(!(板(0).hiddenRows || {})[4], '隠しが 戻っていない');
  eq(String(板(0).data['0,0']?.v), '77', '★A1 が 前の 値に 戻された★');
  eq(String(台の値(0, 0, 0)), '77', '計算側の A1');
});
新しい本();
win.sel(2, 0, 2, 0); win.freezePanes();
await T('固定→Z→Y→Z：固定が 毎回 動く', () => {
  eq(板(0).freezeRow, 2, '固定した後');
  win.doUndo(); ok(!板(0).freezeRow, 'Z の後');
  win.doRedo(); eq(板(0).freezeRow, 2, 'Y の後');
  win.doUndo(); ok(!板(0).freezeRow, '2回目の Z の後');
});

/* ── 開いた本（旗が 立つ 本） ── */
await 本を開く(食い違う本);
await T('前提：開いた 直後は 保存された 答え（999）のまま', () => { eq(String(d(0, '0,0')), '999', 'A1'); });
await T('開いた本で 行を隠す→Z→Y→Z：答えが 変わらず 差分 0（6版 止め1）', () => {
  win.sel(5, 0, 5, 0); win.ctxHideRow();
  win.doUndo(); win.doRedo(); win.doUndo();
  eq(String(d(0, '0,0')), '999', '★A1 が うちの 答えに 変わった★');
  const v = 変わったマス(); eq(v.n, 0, '★差分★ ' + v.出);
});
await T('開いた本で 固定：答えが 変わらない（見た目だけ）', () => {
  win.sel(1, 1, 1, 1); win.freezePanes();
  eq(String(d(0, '0,0')), '999', 'A1');
  win.doUndo(); eq(String(d(0, '0,0')), '999', 'Z の後 A1');
});

await 本を開く(食い違う本);
win.sel(0, 0, 0, 0); win.ctxInsertRow();
await T('開いた本で 打たずに 行を足す→Z：差分 0', () => {
  win.doUndo();
  const v = 変わったマス(); eq(v.n, 0, '★差分★ ' + v.出);
});

await 本を開く(食い違う本);
win.sel(0, 0, 0, 0); win.ctxInsertRow();
win.setCell(9, 9, 'x');
await T('開いた 直後に 行を足す→1マス 打つ：行の 挿入が 差分に 残る（穴⑤）', () => {
  const c = win.BookOpen.changedCells(板(0));
  ok(c['2,1'] !== undefined || c['1,1'] !== undefined, '★行の 挿入が 差分から 消えた★ ' + JSON.stringify(c));
});

await 本を開く(食い違う本);
win.setCell(1, 1, '100');
win.sel(0, 0, 0, 0); win.ctxInsertRow();
await T('開いた本：B2=100→行を足す→Z で B2 が 差分に 在る・Y の後 ずれた 所', () => {
  win.doUndo();
  eq(String(win.BookOpen.changedCells(板(0))['1,1']), '100', 'Z の後 B2');
  win.doRedo();
  eq(String(win.BookOpen.changedCells(板(0))['2,1']), '100', 'Y の後 B3');
});

/* ── ⑦ 値を 読む 前に 計算（開いた本） ── */
await 本を開く(食い違う本);
win.sel(0, 0, 1, 0); win.sortRange('asc');
await T('開いた本で 並べ替え：計算し直した 後の 値（20 < 50）で 決める＝並びは 変わらない', () => {
  eq(板(0).data['0,0']?.f, '=C1*2', '★古い 答え 999 で 並べ替えた★');
});
await 本を開く([['Sheet1', { A1: { t: 'n', v: 999, f: 'C1*2' }, A2: { t: 'n', v: 20 }, C1: { t: 'n', v: 10 } }]]);
win.sel(0, 0, 1, 0);
await T('開いた本で 重複の削除：計算し直した 後の 値（20 と 20）で 決める', () => {
  const n = win.重複を削除();
  eq(n, 1, '★古い 答え 999 で 比べた★');
});

/* ── 字で 守る 所（作りが 崩れたら 赤） ── */
const 中身 = (名) => { const f = win[名]; ok(typeof f === 'function', 名 + ' が無い'); return f.toString(); };
await T('データを 変える 13か所は 控えを 積む 前に _人の操作の前 を 呼ぶ', () => {
  const 名たち = ['sortRange', 'replaceAll', 'AIの表をシートに入れる', '_表を入れる', '重複を削除', '区切りで分ける',
    'セルを挿入', 'セルを削除', '並べ替えを決める', 'ctxInsertRow', 'ctxInsertCol', 'ctxDeleteRow', 'ctxDeleteCol'];
  const 抜け = 名たち.filter((n) => { const s = 中身(n); const a = s.indexOf('_人の操作の前('), b = s.indexOf('_pushRowColUndo('); return a < 0 || b < 0 || a > b; });
  eq(抜け.join(','), '', '抜け');
});
await T('並べ替えの 窓は 範囲を 決める 前に _人の操作の前 を 呼ぶ', () => {
  const s = 中身('並べ替えの窓を開く'); const a = s.indexOf('_人の操作の前('), b = s.indexOf('並べ替えの範囲(');
  ok(a >= 0 && a < b, '窓を開く 頭に 無い');
});
await T('見た目だけの 6か所は 計算しない・見た目の 印で 積む', () => {
  const 名たち = ['freezePanes', 'unfreezePanes', 'ctxHideRow', 'ctxHideCol', 'ctxUnhideRow', 'ctxUnhideCol'];
  const 抜け = 名たち.filter((n) => { const s = 中身(n); return s.indexOf('_人の操作の前(') >= 0 || !/_pushRowColUndo\(\s*true\s*\)/.test(s); });
  eq(抜け.join(','), '', '抜け');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
