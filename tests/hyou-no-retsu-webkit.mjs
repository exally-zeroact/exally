/* hyou-no-ji-webkit.mjs ･･･ ★表の字（Tbl[列]）を打つと 計算される（β1・本物の WebKit）★ 設計 exally-hyou-dougu/sekkei-1b-6.md
 *  見る物＝Tbl[列] の合計／未知の表名＝#REF!／表を伸ばして流し直すと追従／行を足すと追従
 *  走らせ方 node tests/hyou-no-ji-webkit.mjs */
import path from 'node:path'; import http from 'node:http'; import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { borrow, launch } from '../scripts/_borrow-playwright.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const XLSX = require_(path.join(ROOT, 'lib/xlsx.full.min.js'));

let pass = 0, fail = 0;
const T = (n, ok, m) => {
  if (ok) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (m ? '\n       ' + m : '')); }
};

function 立てる(root) {
  const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const s = http.createServer((q, r) => {
    const f = path.join(root, decodeURIComponent(String(q.url).split('?')[0]).replace(/^\/+/, ''));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('no'); }
    r.setHeader('content-type', 型[path.extname(f).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((x) => s.listen(0, '127.0.0.1', () => x({
    url: 'http://127.0.0.1:' + s.address().port, 閉じる: () => s.close(),
  })));
}

const ws = XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 10], [2, 20], [3, 30]]);
ws['!ref'] = 'A1:B4';
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'あ');
const 本 = path.join(os.tmpdir(), 'exally-hyou-no-retsu.xlsx');
fs.writeFileSync(本, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

console.log('[表の字を打つ] ★Tbl[列] が計算されるか★');
const wk = await borrow('hyou-no-retsu', 'webkit');
const browser = await launch('hyou-no-retsu', wk, {}, 'webkit');
const 配信 = await 立てる(ROOT);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('      [落ちた] ' + String(e.message).slice(0, 200)));
try {
  await page.goto(配信.url + '/book.html', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => {
    document.body.classList.remove('exally-locked');
    const ov = document.getElementById('loginOv');
    if (ov) { ov.classList.remove('open'); ov.style.display = 'none'; }
  });
  await page.setInputFiles('#bookFileInput', 本);
  await page.waitForFunction(() => {
    const ss = window.sheets || [];
    return ss.some((s) => s && s.data && Object.keys(s.data).length > 0) && typeof window.setCell === 'function' && typeof window._表の式を流し直す === 'function';
  }, null, { timeout: 120000 });
  await page.waitForTimeout(900);
  const 読む = (r, c) => page.evaluate(([r, c]) => {
    const v = window.hf.getCellValue({ sheet: window._hfSid(window.activeSheet), row: r, col: c });
    return (v && typeof v === 'object') ? 'ERR:' + (v.value || v.type || JSON.stringify(v)) : String(v);
  }, [r, c]);
  const 表を置く = () => page.evaluate(() => {
    const s = window.sheets[window.activeSheet];
    s.tables = [{ 名: 'T1', r1: 0, c1: 0, r2: 3, c2: 1, 見出し行: true, 列名: ['a', 'b'], 集計行: false }];
    window.setCell(6, 0, '=SUM(T1[a])', true); window.setCell(6, 1, '=SUM(T1[b])', true);
  });
  await 表を置く();
  T('前提：SUM(T1[a])＝6・SUM(T1[b])＝60', (await 読む(6, 0)) === '6' && (await 読む(6, 1)) === '60', await 読む(6, 0) + ' ' + await 読む(6, 1));
  /* A 表の中（列1）へ列を挿入：b は 列2 へ動く＝SUM(T1[b]) は 60 のまま（黙って 0 にならない） */
  await page.evaluate(() => { window.sel(0, 1, 0, 1); window.ctxInsertCol(); });
  const 表A = await page.evaluate(() => JSON.stringify(window.sheets[window.activeSheet].tables[0]));
  const aの合計 = await 読む(6, 0), bの合計 = await 読む(6, 2);
  T('A★表の中へ挿入＝列名が [a,列1,b]・c2=2★', /"列名":\["a","列1","b"\]/.test(表A) && /"c2":2/.test(表A), 表A);
  T('A★挿入した列の見出しのセルに「列1」が入る★', await page.evaluate(() => { const d = window.sheets[window.activeSheet].data['0,1']; return !!d && String(d.v) === '列1'; }));
  T('A★挿入の後も SUM(T1[a])＝6・SUM(T1[b])＝60（b は動いた列に付いて行く）★', aの合計 === '6' && bの合計 === '60', aの合計 + ' ' + bの合計);
  /* A2 もう1列 入れる＝新しい名は 空いている一番小さい列N＝列2（既存の列1 は 改名しない） */
  await page.evaluate(() => { window.sel(0, 1, 0, 1); window.ctxInsertCol(); });
  const 表A2 = await page.evaluate(() => JSON.stringify(window.sheets[window.activeSheet].tables[0].列名));
  T('A2★続けて挿入＝[a,列2,列1,b]（既存の名は変えない・空いた一番小さい N）★', 表A2 === '["a","列2","列1","b"]', 表A2);
  /* A3 取り消し2回＝列名も戻る */
  await page.evaluate(() => { window.doUndo(); window.doUndo(); });
  const 表A3 = await page.evaluate(() => JSON.stringify(window.sheets[window.activeSheet].tables[0].列名));
  T('A3★取り消し2回で 列名も [a,b]★', 表A3 === '["a","b"]', 表A3);
  T('A3★取り消した後も SUM(T1[b])＝60★', (await 読む(6, 1)) === '60', await 読む(6, 1));
  /* B 列を消す：消した列の名は 無くなり 残りは 追従 */
  await page.evaluate(() => { window.sel(0, 0, 0, 0); window.ctxDeleteCol(); });
  const 表B = await page.evaluate(() => JSON.stringify(window.sheets[window.activeSheet].tables[0]));
  T('B★左端の列 a を消す＝列名 [b]・c1..c2 は 1列分★', /"列名":\["b"\]/.test(表B) && /"c1":0,"r2":3,"c2":0/.test(表B), 表B);
  await 表を置く();
  /* C 表の外（右隣 c2+1）へ挿入＝表は 広がらない・列名 そのまま */
  await page.evaluate(() => { window.sel(0, 2, 0, 2); window.ctxInsertCol(); });
  const 表C = await page.evaluate(() => JSON.stringify(window.sheets[window.activeSheet].tables[0]));
  T('C★右隣へ挿入＝表は 広がらない（c2=1・列名 [a,b]）★', /"c2":1/.test(表C) && /"列名":\["a","b"\]/.test(表C), 表C);
  /* D 見出し行の無い表は 見出しのセルへ 書かない */
  await page.evaluate(() => {
    const s = window.sheets[window.activeSheet];
    s.tables = [{ 名: 'T3', r1: 10, c1: 0, r2: 12, c2: 1, 見出し行: false, 列名: ['列1', '列2'], 集計行: false }];
    window.sel(10, 1, 10, 1); window.ctxInsertCol();
  });
  const 表D = await page.evaluate(() => ({ t: JSON.stringify(window.sheets[window.activeSheet].tables[0].列名), c: !!window.sheets[window.activeSheet].data['10,1'] }));
  T('D★見出し行の無い表＝列名 だけ増える（セルへは書かない）★', 表D.t === '["列1","列3","列2"]' || 表D.t === '["列1","列2","列3"]' ? !表D.c : false, JSON.stringify(表D));
  /* E 挿入で書いた見出し「列1」は 表の字を持たない式にも 見える（エンジンへ 届く） */
  await 表を置く();
  await page.evaluate(() => { window.setCell(8, 0, '=COUNTA(A1:D1)', true); });
  const 前E = await 読む(8, 0);
  await page.evaluate(() => { window.sel(0, 1, 0, 1); window.ctxInsertCol(); });
  const 後E = await 読む(8, 0);
  T('E★挿入で書いた見出しが エンジンに届く＝COUNTA(A1:D1) が 1つ増える★', Number(後E) === Number(前E) + 1, 前E + ' → ' + 後E);
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}
console.log('\nhyou-no-retsu: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
