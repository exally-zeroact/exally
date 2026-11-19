/* hyou-midashi-hazushi-webkit.mjs ･･･ ★前から在る表で 見出しの チェックを 外して OK を 押しても 列名が 列1.. に 化けない（SUM(T[c]) が #REF! に ならない）・本物の WebKit★
 *  走らせ方 node tests/hyou-midashi-hazushi-webkit.mjs */
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
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['x']]), 'い');
const 本 = path.join(os.tmpdir(), 'exally-hyou-midashi-hazushi.xlsx');
fs.writeFileSync(本, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

console.log('[見出しを外す] ★列名が 化けない★');
const wk = await borrow('hyou-midashi-hazushi', 'webkit');
const browser = await launch('hyou-midashi-hazushi', wk, {}, 'webkit');
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
    return ss.length >= 2 && ss.some((s) => s && s.data && Object.keys(s.data).length > 0) && typeof window.setCell === 'function' && typeof window._表の式を流し直す === 'function';
  }, null, { timeout: 120000 });
  await page.waitForTimeout(900);
  const 読む = (r, c) => page.evaluate(([r, c]) => {
    const v = window.hf.getCellValue({ sheet: window._hfSid(0), row: r, col: c });
    return (v && typeof v === 'object') ? 'ERR:' + (v.value || v.type || JSON.stringify(v)) : String(v);
  }, [r, c]);
  const 値 = (r, c) => page.evaluate(([r, c]) => { const d = window.sheets[0].data[r + ',' + c]; return d ? String(d.v) : ''; }, [r, c]);
  const 表 = () => page.evaluate(() => (window.sheets[0].tables || []).map((t) => t.名 + ':' + t.r1 + '-' + t.r2 + ':' + t.c1 + '-' + t.c2 + (t.集計行 ? ':集' : '')).join(','));
  /* 板0 を 空に して 置く。マスは [行,列,字] */
  const 置く = async (マス, 表たち) => {
    await page.evaluate(([マス, 表たち]) => {
      window.switchSheet(0);
      const s = window.sheets[0];
      for (const k of Object.keys(s.data)) delete s.data[k];
      s.rowH = {}; s.links = {};
      s.tables = 表たち;
      for (const [r, c, v] of マス) window.setCell(r, c, v, true);
      window._表の式を流し直す();
      window.undoStack.length = 0; window.redoStack.length = 0;
    }, [マス, 表たち]);
    await page.waitForTimeout(300);
  };
  const 決める = async (名, 範囲, 見出し, 集計) => {
    const 出 = await page.evaluate(([名, 範囲, 見出し, 集計]) => {
      window.switchSheet(0);
      const m = /^([A-Z]+)(\d+)/.exec(範囲); window.sel(Number(m[2]) - 1, m[1].charCodeAt(0) - 65, Number(m[2]) - 1, m[1].charCodeAt(0) - 65);
      document.getElementById('tblRange').value = 範囲;
      document.getElementById('tblHeader').checked = 見出し; document.getElementById('tblTotals').checked = !!集計;
      document.getElementById('tblName').value = 名;
      const 戻り = window.表を決める();
      return { 戻り, 理由: document.getElementById('tblWhy').textContent };
    }, [名, 範囲, 見出し, !!集計]);
    await page.waitForTimeout(300);
    return 出;
  };
  const 行を消す = async (r1, r2, c) => {
    const 戻り = await page.evaluate(([r1, r2, c]) => { window.switchSheet(0); window.sel(r1, c || 0, r2, c || 0); return window.ctxDeleteRow(); }, [r1, r2, c || 0]);
    await page.waitForTimeout(300);
    return 戻り;
  };
  const 戻す = async () => { await page.evaluate(() => window.doUndo()); await page.waitForTimeout(300); };
  const 進む = async () => { await page.evaluate(() => window.doRedo()); await page.waitForTimeout(300); };
  const 三行 = [[0, 0, 'a'], [0, 1, 'b'], [0, 2, 'c'], [1, 0, 21], [1, 1, 22], [1, 2, 23], [2, 0, 31], [2, 1, 32], [2, 2, 33], [4, 0, 'below']];
  const 列名 = () => page.evaluate(() => JSON.stringify(((window.sheets[0].tables || [])[0] || {}).列名 || null));
  const 作る = async (名, 外の式, 集計) => {
    await 置く(三行.concat(外の式 || []), []);
    const r = await 決める(名, 'A1:C3', true, !!集計);
    await page.evaluate(() => { window.undoStack.length = 0; window.redoStack.length = 0; });
    return r;
  };
  /* 1 見出しを 外して OK（名も 範囲も 同じ） */
  await 作る('Midashi', [[6, 4, '=SUM(Midashi[c])']]);
  T('0★作った＝SUM(Midashi[c])=56★', (await 読む(6, 4)) === '56', await 読む(6, 4));
  const 前1 = await page.evaluate(() => JSON.stringify(window.sheets[0].data));
  const r1 = await 決める('Midashi', 'A1:C3', false, false);
  T('1★外して OK＝列名は a,b,c のまま（前は 列1,列2,列3）★', r1.戻り === 1 && (await 列名()) === '["a","b","c"]', JSON.stringify(r1) + ' ' + (await 列名()));
  T('1★SUM(Midashi[c])=56 のまま（前は #REF!）★', (await 読む(6, 4)) === '56', await 読む(6, 4));
  T('1★表は A1:C3 のまま・行は 足さない・マスは 変わらない★', (await 表()) === 'Midashi:0-2:0-2' && (await page.evaluate(() => JSON.stringify(window.sheets[0].data))) === 前1, (await 表()));
  /* 2 名替え＋外す */
  await 作る('Moto', [[6, 4, '=SUM(Moto[b])']]);
  const r2 = await 決める('Atarashii', 'A1:C3', false, false);
  const 式2 = await page.evaluate(() => String((window.sheets[0].data['6,4'] || {}).f || ''));
  T('2★名替え＋外す＝式は Atarashii[b]・答え 54★', r2.戻り === 1 && 式2.indexOf('Atarashii[b]') >= 0 && (await 読む(6, 4)) === '54' && (await 列名()) === '["a","b","c"]', JSON.stringify(r2) + ' ' + 式2 + ' ' + (await 読む(6, 4)) + ' ' + (await 列名()));
  /* 3 集計の 在る 表で 外す */
  await 作る('Shu', [[6, 4, '=SUM(Shu[a])']], true);
  const r3 = await 決める('Shu', 'A1:C4', false, true);
  T('3★集計の 在る表で 外す＝A1:C4 集計・列名 a,b,c・SUM(Shu[a])=52★', r3.戻り === 1 && (await 表()) === 'Shu:0-3:0-2:集' && (await 列名()) === '["a","b","c"]' && (await 読む(6, 4)) === '52', JSON.stringify(r3) + ' ' + (await 表()) + ' ' + (await 列名()) + ' ' + (await 読む(6, 4)));
  /* 4 新しく 作る 時に 外す＝今まで通り 見出しを 1行 足して 列1.. */
  await 置く([[0, 0, 1], [0, 1, 2], [1, 0, 3], [1, 1, 4]], []);
  const r4 = await 決める('Atara', 'A1:B2', false, false);
  T('4★新しく 作る 時は 今まで通り＝見出しを 足して 列1,列2・A1:B3★', r4.戻り === 1 && (await 列名()) === '["列1","列2"]' && (await 表()) === 'Atara:0-2:0-1' && (await 値(0, 0)) === '列1', JSON.stringify(r4) + ' ' + (await 列名()) + ' ' + (await 表()));
  /* 5 見出しの 無い 前からの 表＝チェックを 入れても 外しても 1行目を 見出しに しない・列名を 保つ */
  await 置く([[0, 0, 5], [0, 1, 6], [1, 0, 7], [1, 1, 8], [4, 4, '=SUM(Nashi[p])']], [{ 名: 'Nashi', r1: 0, c1: 0, r2: 1, c2: 1, 見出し行: false, 列名: ['p', 'q'], 集計行: false }]);
  const 前5 = await page.evaluate(() => JSON.stringify(window.sheets[0].data));
  const r5a = await 決める('Nashi', 'A1:B2', false, false);
  const 見5a = await page.evaluate(() => window.sheets[0].tables[0].見出し行);
  const r5b = await 決める('Nashi', 'A1:B2', true, false);
  const 見5b = await page.evaluate(() => window.sheets[0].tables[0].見出し行);
  T('5★見出しの 無い 表＝外しても 入れても 見出し行=false・列名 p,q・A1:B2・マスは 変わらない（前は 入れると 5,6 が 見出しに 化けた）★', r5a.戻り === 1 && r5b.戻り === 1 && 見5a === false && 見5b === false && (await 列名()) === '["p","q"]' && (await 表()) === 'Nashi:0-1:0-1' && (await page.evaluate(() => JSON.stringify(window.sheets[0].data))) === 前5 && (await 読む(4, 4)) === '12', JSON.stringify([r5a, r5b, 見5a, 見5b]) + ' SUM=' + (await 読む(4, 4)) + ' ' + (await 列名()) + ' ' + (await 表()));
  /* 6 見出しの 無い 表を 左へ 広げる＝列名は 列の 番地で 引き継ぐ・新しい 列だけ 列3（前は 名が ずれ SUM が 別の 列を 足した＝taiketsu 止め1） */
  const 決めるで = async (名, 範囲, 見出し, r, c) => {
    const 出 = await page.evaluate(([名, 範囲, 見出し, r, c]) => {
      window.switchSheet(0); window.sel(r, c, r, c);
      document.getElementById('tblRange').value = 範囲;
      document.getElementById('tblHeader').checked = 見出し; document.getElementById('tblTotals').checked = false;
      document.getElementById('tblName').value = 名;
      return { 戻り: window.表を決める(), 理由: document.getElementById('tblWhy').textContent };
    }, [名, 範囲, 見出し, r, c]);
    await page.waitForTimeout(300);
    return 出;
  };
  await 置く([[0, 0, 100], [1, 0, 200], [0, 1, 5], [0, 2, 6], [1, 1, 7], [1, 2, 8], [4, 4, '=SUM(Hidari[列1])'], [5, 4, '=SUM(Hidari[列2])']], [{ 名: 'Hidari', r1: 0, c1: 1, r2: 1, c2: 2, 見出し行: false, 列名: ['列1', '列2'], 集計行: false }]);
  const 前6 = (await 読む(4, 4)) + ',' + (await 読む(5, 4));
  const r6 = await 決めるで('Hidari', 'A1:C2', false, 0, 1);
  T('6★見出しの 無い 表を 左へ 広げる＝列名 列3,列1,列2・SUM(列1)=12・SUM(列2)=14 のまま（前は 300／200）★', 前6 === '12,14' && r6.戻り === 1 && (await 表()) === 'Hidari:0-1:0-2' && (await 列名()) === '["列3","列1","列2"]' && (await 読む(4, 4)) === '12' && (await 読む(5, 4)) === '14', 前6 + ' ' + JSON.stringify(r6) + ' ' + (await 表()) + ' ' + (await 列名()) + ' ' + (await 読む(4, 4)) + ',' + (await 読む(5, 4)));
  /* 7 名の 順が 番号順で ない 表を 右へ 広げる＝列1,列3,列2,列4・SUM(列3)=14 のまま（前は 18） */
  await 置く([[0, 0, 1], [0, 1, 6], [0, 2, 3], [0, 3, 4], [1, 0, 2], [1, 1, 8], [1, 2, 5], [1, 3, 5], [4, 4, '=SUM(Migi[列3])']], [{ 名: 'Migi', r1: 0, c1: 0, r2: 1, c2: 2, 見出し行: false, 列名: ['列1', '列3', '列2'], 集計行: false }]);
  const r7 = await 決めるで('Migi', 'A1:D2', false, 0, 0);
  T('7★右へ 広げる＝列1,列3,列2,列4・SUM(列3)=14★', r7.戻り === 1 && (await 列名()) === '["列1","列3","列2","列4"]' && (await 読む(4, 4)) === '14', JSON.stringify(r7) + ' ' + (await 列名()) + ' ' + (await 読む(4, 4)));
  /* 8 外して OK → Z → Y でも 列名と SUM を 保つ */
  await 作る('Modosu', [[6, 4, '=SUM(Modosu[c])']]);
  await 決める('Modosu', 'A1:C3', false, false);
  await 戻す();
  const 戻8 = (await 列名()) + ' ' + (await 読む(6, 4));
  await 進む();
  const 進8 = (await 列名()) + ' ' + (await 読む(6, 4));
  T('8★外して OK→Z→Y＝どちらも a,b,c・SUM=56★', 戻8 === '["a","b","c"] 56' && 進8 === '["a","b","c"] 56', 戻8 + ' / ' + 進8);
  /* 9 見出しの 無い 表を 狭める（B:D→C:D）＝列2,列3・残りの SUM は そのまま・外れた 列1 は #REF!（黙って 別の 列を 足さない） */
  await 置く([[0, 1, 11], [0, 2, 21], [0, 3, 31], [1, 1, 12], [1, 2, 22], [1, 3, 32], [4, 4, '=SUM(Semai[列1])'], [5, 4, '=SUM(Semai[列2])'], [6, 4, '=SUM(Semai[列3])']], [{ 名: 'Semai', r1: 0, c1: 1, r2: 1, c2: 3, 見出し行: false, 列名: ['列1', '列2', '列3'], 集計行: false }]);
  const r9 = await 決めるで('Semai', 'C1:D2', false, 0, 2);
  const 答9 = [await 読む(4, 4), await 読む(5, 4), await 読む(6, 4)].join(',');
  T('9★狭める＝列2,列3・SUM(列2)=43・SUM(列3)=63・SUM(列1)=#REF!★', r9.戻り === 1 && (await 表()) === 'Semai:0-1:2-3' && (await 列名()) === '["列2","列3"]' && /^ERR:#REF!,43,63$/.test(答9), JSON.stringify(r9) + ' ' + (await 表()) + ' ' + (await 列名()) + ' ' + 答9);
  /* 10 左右 両方へ 広げる（B:C→A:D）＝列3,列1,列2,列4・SUM は そのまま */
  await 置く([[0, 0, 100], [0, 1, 1], [0, 2, 2], [0, 3, 300], [1, 1, 3], [1, 2, 4], [4, 4, '=SUM(Ryou[列1])'], [5, 4, '=SUM(Ryou[列2])']], [{ 名: 'Ryou', r1: 0, c1: 1, r2: 1, c2: 2, 見出し行: false, 列名: ['列1', '列2'], 集計行: false }]);
  const r10 = await 決めるで('Ryou', 'A1:D2', false, 0, 1);
  T('10★左右 両方へ 広げる＝列3,列1,列2,列4・SUM(列1)=4・SUM(列2)=6★', r10.戻り === 1 && (await 列名()) === '["列3","列1","列2","列4"]' && (await 読む(4, 4)) === '4' && (await 読む(5, 4)) === '6', JSON.stringify(r10) + ' ' + (await 列名()) + ' ' + (await 読む(4, 4)) + ',' + (await 読む(5, 4)));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}
console.log('\nhyou-midashi-hazushi: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
