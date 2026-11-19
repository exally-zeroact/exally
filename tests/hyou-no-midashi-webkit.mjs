/* hyou-no-midashi-webkit.mjs ･･･ ★見出しのセルを打ち替えると 列名と 全板の 式の字が 追従する（β2b・本物の WebKit）★ 設計 exally-hyou-dougu/sekkei-2b-2.md
 *  見る物＝b→bb で 字と答え／別の板・範囲・見出し指定子・大小／替わらない物（別の表・文字列）／Z・Y・Z→Y→Z／空→列1・同名→A2／
 *          見出しでないマスは0本／noUndo の口は改名しない／後で直された式は戻さない
 *  走らせ方 node tests/hyou-no-midashi-webkit.mjs */
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
const 本 = path.join(os.tmpdir(), 'exally-hyou-no-midashi.xlsx');
fs.writeFileSync(本, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

console.log('[見出しの打ち替え] ★列名と 式の字が 追従するか★');
const wk = await borrow('hyou-no-midashi', 'webkit');
const browser = await launch('hyou-no-midashi', wk, {}, 'webkit');
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
  const 読む = (i, r, c) => page.evaluate(([i, r, c]) => {
    const v = window.hf.getCellValue({ sheet: window._hfSid(i), row: r, col: c });
    return (v && typeof v === 'object') ? 'ERR:' + (v.value || v.type || JSON.stringify(v)) : String(v);
  }, [i, r, c]);
  const 字 = (i, r, c) => page.evaluate(([i, r, c]) => { const d = window.sheets[i].data[r + ',' + c]; return d ? String(d.f) : ''; }, [i, r, c]);
  const 列名 = () => page.evaluate(() => JSON.stringify(window.sheets[0].tables[0].列名));
  const 全部の字 = (除く) => page.evaluate((除く) => JSON.stringify(window.sheets.map((s, i) => Object.keys(s.data).sort()
    .filter((k) => !(i === 0 && 除く.indexOf(k) >= 0)).map((k) => k + '=' + (s.data[k] && s.data[k].f)))), 除く);
  /* 板0 に 表 T1（A1:B4）と 表 T2（D1:E3・列名 a,b）・式たち／板1 に 別の板の式 */
  const 置く = async () => {
    await page.evaluate(() => {
      window.switchSheet(0);
      const s = window.sheets[0];
      for (const k of Object.keys(s.data)) { const [r] = k.split(',').map(Number); if (r >= 5) delete s.data[k]; }
      s.data['0,1'] = { v: 'b', f: 'b', d: 'b' };
      s.tables = [
        { 名: 'T1', r1: 0, c1: 0, r2: 3, c2: 1, 見出し行: true, 列名: ['a', 'b'], 集計行: false },
        { 名: 'T2', r1: 0, c1: 3, r2: 2, c2: 4, 見出し行: true, 列名: ['a', 'b'], 集計行: false },
      ];
      window.setCell(0, 1, 'b', true); window.setCell(1, 1, 10, true); window.setCell(0, 2, '', true);
      window.setCell(0, 3, 'a', true); window.setCell(0, 4, 'b', true);
      window.setCell(1, 4, 5, true); window.setCell(2, 4, 7, true);
      window.setCell(6, 0, '=SUM(T1[b])', true);
      window.setCell(6, 1, '=SUM(T1[[a]:[b]])', true);
      window.setCell(6, 2, '=T1[[#見出し],[b]]', true);
      window.setCell(6, 3, '=SUM(T2[b])', true);
      window.setCell(6, 4, '="T1[b]"', true);
      window.setCell(6, 5, '=LEN("T1[b]")', true);
      window.setCell(6, 6, '=SUM(t1[B])', true);
      window.switchSheet(1);
      window.setCell(2, 0, '=SUM(T1[b])', true);
      window.switchSheet(0);
      window._表の式を流し直す();
      window.undoStack.length = 0; window.redoStack.length = 0;
    });
    await page.waitForTimeout(400);
  };
  const 打つ = async (r, c, v) => { await page.evaluate(([r, c, v]) => { window.switchSheet(0); window.setCell(r, c, v); }, [r, c, v]); await page.waitForTimeout(400); };
  const 戻す = async () => { await page.evaluate(() => window.doUndo()); await page.waitForTimeout(400); };
  const 進む = async () => { await page.evaluate(() => window.doRedo()); await page.waitForTimeout(400); };

  await 置く();
  T('前提：SUM(T1[b])＝60・別の板も 60・T2[b]＝12', (await 読む(0, 6, 0)) === '60' && (await 読む(1, 2, 0)) === '60' && (await 読む(0, 6, 3)) === '12',
    [await 読む(0, 6, 0), await 読む(1, 2, 0), await 読む(0, 6, 3)].join(' '));

  /* A b→bb */
  await 打つ(0, 1, 'bb');
  T('A★列名が [a,bb]★', (await 列名()) === '["a","bb"]', await 列名());
  T('A★=SUM(T1[b]) の字が =SUM(T1[bb]) に替わり 60★', (await 字(0, 6, 0)) === '=SUM(T1[bb])' && (await 読む(0, 6, 0)) === '60', (await 字(0, 6, 0)) + ' ' + (await 読む(0, 6, 0)));
  await 打つ(7, 0, '=SUM(T1[bb])');
  T('A★新しく打つ =SUM(T1[bb]) も 60★', (await 読む(0, 7, 0)) === '60', await 読む(0, 7, 0));
  /* B 別の板・範囲・見出し指定子・大小違い */
  T('B★別の板の =SUM(T1[b]) も替わり 60★', (await 字(1, 2, 0)) === '=SUM(T1[bb])' && (await 読む(1, 2, 0)) === '60', (await 字(1, 2, 0)) + ' ' + (await 読む(1, 2, 0)));
  T('B★[[a]:[b]] → [[a]:[bb]]★', (await 字(0, 6, 1)) === '=SUM(T1[[a]:[bb]])', await 字(0, 6, 1));
  T('B★[[#見出し],[b]] → [[#見出し],[bb]]★', (await 字(0, 6, 2)) === '=T1[[#見出し],[bb]]', await 字(0, 6, 2));
  T('B★大小違い t1[B] も替わる・60★', /^=SUM\(t1\[bb\]\)$/.test(await 字(0, 6, 6)) && (await 読む(0, 6, 6)) === '60', (await 字(0, 6, 6)) + ' ' + (await 読む(0, 6, 6)));
  /* C 替わらない物 */
  T('C★別の表 T2[b] は替わらない・12★', (await 字(0, 6, 3)) === '=SUM(T2[b])' && (await 読む(0, 6, 3)) === '12', await 字(0, 6, 3));
  T('C★文字列の中は替わらない★', (await 字(0, 6, 4)) === '="T1[b]"' && (await 字(0, 6, 5)) === '=LEN("T1[b]")', (await 字(0, 6, 4)) + ' ' + (await 字(0, 6, 5)));
  /* E 取り消し・やり直し */
  await 戻す();   /* 7,0 を消す */
  await 戻す();   /* 見出し */
  T('E★Z で 列名 [a,b]・字 =SUM(T1[b])・別の板も・60★', (await 列名()) === '["a","b"]' && (await 字(0, 6, 0)) === '=SUM(T1[b])' && (await 字(1, 2, 0)) === '=SUM(T1[b])' && (await 読む(0, 6, 0)) === '60' && (await 読む(1, 2, 0)) === '60',
    [await 列名(), await 字(0, 6, 0), await 字(1, 2, 0), await 読む(0, 6, 0), await 読む(1, 2, 0)].join(' '));
  await 進む();
  T('E★Y で また [a,bb]・=SUM(T1[bb])＝60★', (await 列名()) === '["a","bb"]' && (await 字(1, 2, 0)) === '=SUM(T1[bb])' && (await 読む(1, 2, 0)) === '60', (await 列名()) + ' ' + (await 字(1, 2, 0)));
  await 戻す();
  T('E★Z→Y→Z でも 全部戻る★', (await 列名()) === '["a","b"]' && (await 字(1, 2, 0)) === '=SUM(T1[b])' && (await 字(0, 6, 0)) === '=SUM(T1[b])' && (await 読む(1, 2, 0)) === '60',
    [await 列名(), await 字(1, 2, 0), await 字(0, 6, 0), await 読む(1, 2, 0)].join(' '));
  /* D 空・同名・大小 */
  await 置く();
  await 打つ(0, 1, '');
  T('D★空にすると 列名 列1・セルにも 列1・式も 列1 へ・60★', (await 列名()) === '["a","列1"]' && (await 字(0, 0, 1)) === '列1' && (await 字(0, 6, 0)) === '=SUM(T1[列1])' && (await 読む(0, 6, 0)) === '60',
    [await 列名(), await 字(0, 0, 1), await 字(0, 6, 0), await 読む(0, 6, 0)].join(' '));
  await 置く();
  await 打つ(0, 1, 'A');
  T('D★他の列と 同じ名（大小無視）＝A2・セルにも★', (await 列名()) === '["a","A2"]' && (await 字(0, 0, 1)) === 'A2' && (await 字(0, 6, 0)) === '=SUM(T1[A2])', [await 列名(), await 字(0, 0, 1), await 字(0, 6, 0)].join(' '));
  /* F 見出しでないマス・表の外 */
  await 置く();
  const 前F = await 全部の字(['1,1', '0,2']);
  await 打つ(1, 1, 11); await 打つ(0, 2, 'b');
  T('F★見出しでない マス・表の外を 打っても 他の字は 0本 替わる★', (await 全部の字(['1,1', '0,2'])) === 前F);
  T('F★列名も そのまま★', (await 列名()) === '["a","b"]', await 列名());
  /* H noUndo の口（貼り付け相当）は 改名しない＝字0本・答え 60 */
  await 置く();
  await page.evaluate(() => { window.setCell(0, 1, 'zz', true); }); await page.waitForTimeout(400);
  T('H★noUndo で 見出しを 替えても 列名・字は そのまま・60★', (await 列名()) === '["a","b"]' && (await 字(1, 2, 0)) === '=SUM(T1[b])' && (await 読む(1, 2, 0)) === '60', [await 列名(), await 字(1, 2, 0), await 読む(1, 2, 0)].join(' '));
  /* I 戻す前に 別の板の式を 直したら その式は 戻さない */
  await 置く();
  await 打つ(0, 1, 'bb');
  await page.evaluate(() => { window.sheets[1].data['2,0'].f = window.sheets[1].data['2,0'].v = '=SUM(T1[a])'; });
  await 戻す();
  T('I★後で 直された 式は 戻さない（前の字で 上書きしない）・他は 戻る★', (await 字(1, 2, 0)) === '=SUM(T1[a])' && (await 字(0, 6, 0)) === '=SUM(T1[b])' && (await 列名()) === '["a","b"]',
    [await 字(1, 2, 0), await 字(0, 6, 0), await 列名()].join(' '));
  /* J 改名→表の外に行を足す→Z Z→Y Y（行の取り消しが 表を 写しに 置き換えても 戻る・taiketsu 本番前 止め1） */
  await 置く();
  await 打つ(0, 1, 'bb');
  await page.evaluate(() => { window.switchSheet(0); window.sel(10, 0, 10, 0); window.ctxInsertRow(); }); await page.waitForTimeout(400);
  await 戻す(); await 戻す();
  T('J★改名→行を足す→Z Z＝列名 [a,b]・両方の板 =SUM(T1[b])＝60★', (await 列名()) === '["a","b"]' && (await 字(0, 6, 0)) === '=SUM(T1[b])' && (await 読む(0, 6, 0)) === '60' && (await 読む(1, 2, 0)) === '60',
    [await 列名(), await 字(0, 6, 0), await 読む(0, 6, 0), await 読む(1, 2, 0)].join(' '));
  await 進む(); await 進む();
  T('J★続けて Y Y＝[a,bb]・両方の板 60★', (await 列名()) === '["a","bb"]' && (await 字(1, 2, 0)) === '=SUM(T1[bb])' && (await 読む(0, 6, 0)) === '60' && (await 読む(1, 2, 0)) === '60',
    [await 列名(), await 字(1, 2, 0), await 読む(0, 6, 0), await 読む(1, 2, 0)].join(' '));
  /* K 特別な字（: , 前後の空白）の見出し＝外も [[ ]] で囲み 答えは 60 のまま（止め2） */
  for (const 名 of ['9:00', 'p,q', '  b2 ', 'x+y']) {
    await 置く();
    await 打つ(0, 1, 名);
    T('K★見出し「' + 名 + '」＝両方の板 60・[@] 形も★', (await 読む(0, 6, 0)) === '60' && (await 読む(1, 2, 0)) === '60' && !/^ERR/.test(await 読む(0, 6, 2)),
      [await 字(0, 6, 0), await 読む(0, 6, 0), await 読む(1, 2, 0), await 読む(0, 6, 2)].join(' | '));
  }
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}
console.log('\nhyou-no-midashi: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
