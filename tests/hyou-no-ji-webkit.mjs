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
const 本 = path.join(os.tmpdir(), 'exally-hyou-no-ji.xlsx');
fs.writeFileSync(本, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

console.log('[表の字を打つ] ★Tbl[列] が計算されるか★');
const wk = await borrow('hyou-no-ji', 'webkit');
const browser = await launch('hyou-no-ji', wk, {}, 'webkit');
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
  await page.evaluate(() => {
    window.sheets[window.activeSheet].tables = [{ 名: 'T1', r1: 0, c1: 0, r2: 3, c2: 1, 見出し行: true, 列名: ['a', 'b'], 集計行: false }];
    window.setCell(6, 0, '=SUM(T1[b])', true);
    window.setCell(6, 1, '=SUM(Xyz[b])', true);
    window.setCell(6, 2, '=SUM(t1[a])+COUNT(T1[b])', true);
    window.setCell(6, 3, '=SUM(T1[zzz])', true);
  });
  T('★SUM(T1[b])＝60★', (await 読む(6, 0)) === '60', await 読む(6, 0));
  T('★SUM(t1[a])+COUNT(T1[b])＝6+3＝9（表名は大小無視）★', (await 読む(6, 2)) === '9', await 読む(6, 2));
  T('★未知の表名 Xyz[b]＝#REF!（黙って数を出さない）★', /REF/.test(await 読む(6, 1)), await 読む(6, 1));
  T('★未知の列 T1[zzz]＝#REF!★', /REF/.test(await 読む(6, 3)), await 読む(6, 3));
  /* 表を伸ばして 流し直す */
  await page.evaluate(() => {
    window.setCell(4, 0, '4', true); window.setCell(4, 1, '40', true);
    window.sheets[window.activeSheet].tables[0].r2 = 4;
    window._表の式を流し直す();
  });
  T('★表を伸ばして流し直す＝SUM(T1[b])＝100★', (await 読む(6, 0)) === '100', await 読む(6, 0));
  /* 行を足す（右クリックの 行の挿入） */
  await page.evaluate(() => { window.sel(2, 0, 2, 0); window.ctxInsertRow(); });
  const 後 = await page.evaluate(() => JSON.stringify(window.sheets[window.activeSheet].tables[0]));
  const 合計の行 = 7;
  T('★行を足すと 表が 1行 伸びる（r2=5）★', /"r2":5/.test(後), 後);
  await page.evaluate(() => { window.setCell(2, 1, '5', true); });
  T('★行を足して 値を入れる＝SUM(T1[b])＝105（追従する）★', (await 読む(合計の行, 0)) === '105', await 読む(合計の行, 0));

  /* ══ 本番前 taiketsu 止め1〜4 ══ */
  await page.evaluate(() => {
    const s = window.sheets[window.activeSheet];
    s.tables = [{ 名: 'K1', r1: 10, c1: 10, r2: 13, c2: 11, 見出し行: true, 列名: ['x', 'y'], 集計行: true }];
    window.setCell(10, 10, 'x', true); window.setCell(10, 11, 'y', true);
    window.setCell(11, 10, '1', true); window.setCell(11, 11, '10', true);
    window.setCell(12, 10, '2', true); window.setCell(12, 11, '20', true);
    window.setCell(13, 10, '集計', true);
    window.setCell(16, 10, '=SUM(K1[y])', true);
    window.sel(13, 10, 13, 10); window.ctxDeleteRow();
  });
  const 後1 = await page.evaluate(() => JSON.stringify(window.sheets[window.activeSheet].tables.filter(t => t.名 === 'K1')[0] || null));
  T('止め1★集計行の行を消す＝表の集計行の旗も外れる（r2=12・集計行 false）★', /"r2":12/.test(後1) && /"集計行":false/.test(後1), 後1);
  T('止め1★集計行を消した後 SUM(K1[y])＝30★', (await 読む(15, 10)) === '30', await 読む(15, 10));
  await page.evaluate(() => { window.sel(10, 10, 10, 10); window.ctxDeleteRow(); });
  const 後1b = await page.evaluate(() => JSON.stringify((window.sheets[window.activeSheet].tables || []).filter(t => t.名 === 'K1')));
  T('止め1b★見出し行を消すと表も無くなる★', 後1b === '[]', 後1b);
  T('止め1b★表が無くなったら SUM(K1[y])＝#REF!★', /REF/.test(await 読む(14, 10)), await 読む(14, 10));

  await page.evaluate(() => {
    window.sheets.push({ name: '4月', data: {}, tables: [{ 名: 'T9', r1: 0, c1: 0, r2: 2, c2: 1, 見出し行: true, 列名: ['a', 'b'], 集計行: false }] });
  });
  const 名重なり = await page.evaluate(() => {
    const 結果 = {};
    document.getElementById('tblRange').value = 'A20:B22';
    document.getElementById('tblHeader').checked = true; document.getElementById('tblTotals').checked = false;
    document.getElementById('tblName').value = 't9';
    結果.戻り = window.表を決める();
    結果.理由 = document.getElementById('tblWhy').textContent;
    結果.数 = window.sheets.reduce((n, s) => n + (s.tables || []).filter(t => String(t.名).toLowerCase() === 't9').length, 0);
    return 結果;
  });
  T('止め2★別の板に同じ名前（大小違い）の表は作れない★', 名重なり.戻り === 0 && 名重なり.数 === 1, JSON.stringify(名重なり));
  await page.evaluate(() => { window.sheets.pop(); });

  await page.evaluate(() => {
    window.sheets[window.activeSheet].tables = [{ 名: 'T1', r1: 0, c1: 0, r2: 3, c2: 1, 見出し行: true, 列名: ['a', 'b'], 集計行: false }];
    window.setCell(18, 0, '=SUM(T1[[#データ],[b]])', true);
    window.setCell(18, 1, '=COUNTA(T1[[#見出し],[a]])', true);
    window.setCell(18, 2, '=SUM(T1[B])', true);
    window.setCell(18, 3, '=ROWS(T1[#すべて])', true);
    window.setCell(0, 5, '=T1[@b]', true);
  });
  T('止め3★[#データ] 日本語＝35（行を足した後の範囲 r1..r3）★', (await 読む(18, 0)) === '35', await 読む(18, 0));
  T('止め3★[#見出し] 日本語＝1★', (await 読む(18, 1)) === '1', await 読む(18, 1));
  T('止め3★T1[B]（列名の大小違い）＝35★', (await 読む(18, 2)) === '35', await 読む(18, 2));
  T('止め3★[#すべて] 日本語＝4行★', (await 読む(18, 3)) === '4', await 読む(18, 3));
  T('止め3★見出し行の [@b]＝#VALUE!★', /VALUE/.test(await 読む(0, 5)), await 読む(0, 5));

  await page.evaluate(() => {
    window.addSheet();
    const i = window.sheets.length - 1;
    window.sheets[i].name = '4月'; window.板を揃える();
    window.switchSheet(i);
    window.setCell(0, 0, '=SUM(T1[b])', true);
  });
  T('止め4★別の板「4月」から T1[b] を足す＝35★', (await 読む(0, 0)) === '35', await 読む(0, 0));

  /* 止め5：新しい板に表を作る口を 2回 続けても 全部の板で 名前が重ならない */
  const 名たち = await page.evaluate(() => {
    window.switchSheet(0);
    window.sel(0, 0, 3, 1); window.サブテーブルを作る();
    window.switchSheet(0);
    window.sel(0, 0, 3, 1); window.サブテーブルを作る();
    const 名 = [];
    window.sheets.forEach((s) => (s.tables || []).forEach((t) => 名.push(String(t.名).toLowerCase())));
    return 名;
  });
  T('止め5★サブテーブルを2回作っても 全部の板で 名前が重ならない★', new Set(名たち).size === 名たち.length, JSON.stringify(名たち));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}
console.log('\nhyou-no-ji: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
