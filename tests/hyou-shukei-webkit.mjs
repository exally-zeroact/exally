/* hyou-shukei-webkit.mjs ･･･ ★集計行の 在る 表で 窓の OK を 押しても 集計行を 二重に 書かない・外したら 本当に しまう（β2h・本物の WebKit）★ 設計 exally-hyou-dougu/sekkei-2h-2.md
 *  真値＝実Excel COM（exally-hyou-dougu/com-shukei-out.txt）
 *  走らせ方 node tests/hyou-shukei-webkit.mjs */
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
const 本 = path.join(os.tmpdir(), 'exally-hyou-shukei.xlsx');
fs.writeFileSync(本, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

console.log('[集計行] ★二重に 書かない・外したら しまう★');
const wk = await borrow('hyou-shukei', 'webkit');
const browser = await launch('hyou-shukei', wk, {}, 'webkit');
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
  const 三行 = [[0, 0, 'a'], [0, 1, 'b'], [0, 2, 'c'], [1, 0, 21], [1, 1, 22], [1, 2, 23], [2, 0, 31], [2, 1, 32], [2, 2, 33]];
  const 下 = [[4, 0, 'below'], [6, 4, '=SUM(C2:C10)'], [7, 4, '=C4']];   /* ★`[` を 含む 式が 無い 本＝台の 流し直しに 隠れない（設計前 taiketsu 止め1）★ */
  const 集計で作る = async (名, 外の式) => {
    await 置く(三行.concat(下).concat(外の式 || []), []);
    const r = await 決める(名, 'A1:C3', true, true);
    await page.evaluate(() => { window.undoStack.length = 0; window.redoStack.length = 0; });
    return r;
  };
  /* 0 作る（今まで通り） */
  const r0 = await 集計で作る('Goukei');
  T('0★集計つきで 作る＝A1:C4・A4=集計・C2:C10 の 合計=112★', r0.戻り === 1 && (await 表()) === 'Goukei:0-3:0-2:集' && (await 値(3, 0)) === '集計' && (await 読む(6, 4)) === '112', JSON.stringify(r0) + ' ' + (await 表()) + ' ' + (await 読む(6, 4)));
  /* 1 名替えだけ（COM 1＝A1:C4 そのまま・A5=below） */
  await 集計で作る('Goukei', [[8, 4, '=SUM(Goukei[c])']]);
  const r1 = await 決める('Meikae', 'A1:C4', true, true);
  T('1★名替えだけ＝A1:C4 集計 そのまま・A5=below（前は A5 が 集計に 上書き）★', r1.戻り === 1 && (await 表()) === 'Meikae:0-3:0-2:集' && (await 値(4, 0)) === 'below' && (await 値(3, 0)) === '集計', JSON.stringify(r1) + ' ' + (await 表()) + ' A5=' + (await 値(4, 0)));
  T('1★SUM(Meikae[c])=56・C2:C10=112★', (await 読む(8, 4)) === '56' && (await 読む(6, 4)) === '112', (await 読む(8, 4)) + ' ' + (await 読む(6, 4)));
  /* 2 集計を 外す（COM 2＝A1:C3・集計 無し）。うちは 行4 を 空で 残す（下を 上げるのは 式の追従が 要る＝β2g） */
  await 集計で作る('Hazusu');
  const r2 = await 決める('Hazusu', 'A1:C4', true, false);
  T('2★外す＝A1:C3・集計 無し・A4 C4 空・A5=below★', r2.戻り === 1 && (await 表()) === 'Hazusu:0-2:0-2' && (await 値(3, 0)) === '' && (await 値(3, 2)) === '' && (await 値(4, 0)) === 'below', JSON.stringify(r2) + ' ' + (await 表()) + ' A4=' + (await 値(3, 0)));
  T('2★台も 直る＝SUM(C2:C10)=56・=C4 は 空（0／null・古い 56 が 残らない）★', (await 読む(6, 4)) === '56' && ['0', 'null'].includes(await 読む(7, 4)), (await 読む(6, 4)) + ' ' + (await 読む(7, 4)));
  /* 3 Z 1回で 戻る・Y で また 外れる */
  const 控え3 = await page.evaluate(() => window.undoStack.length);
  await 戻す();
  T('3★控えは 1つ・Z で A1:C4 集計・A4=集計・112★', 控え3 === 1 && (await 表()) === 'Hazusu:0-3:0-2:集' && (await 値(3, 0)) === '集計' && (await 読む(6, 4)) === '112', 控え3 + ' ' + (await 表()) + ' ' + (await 読む(6, 4)));
  await 進む();
  T('3★Y で また 外れる・56★', (await 表()) === 'Hazusu:0-2:0-2' && (await 読む(6, 4)) === '56', (await 表()) + ' ' + (await 読む(6, 4)));
  /* 4 外して 戻す（COM 3＝A1:C4・A5=below） */
  const r4 = await 決める('Hazusu', 'A1:C3', true, true);
  T('4★外して 戻す＝A1:C4 集計・A5=below★', r4.戻り === 1 && (await 表()) === 'Hazusu:0-3:0-2:集' && (await 値(3, 0)) === '集計' && (await 値(4, 0)) === 'below', JSON.stringify(r4) + ' ' + (await 表()));
  /* 5 集計を 除いた 形 A1:C3 を 入れる（COM 5＝変わらず） */
  await 集計で作る('Nozoku');
  const r5 = await 決める('Nozoku', 'A1:C3', true, true);
  T('5★A1:C3＝変わらず A1:C4 集計・A5=below★', r5.戻り === 1 && (await 表()) === 'Nozoku:0-3:0-2:集' && (await 値(4, 0)) === 'below', JSON.stringify(r5) + ' ' + (await 表()));
  /* 6 範囲を 変える＝断る・何も 変わらない・控え 0 */
  await 集計で作る('Hanni');
  const 前6 = await page.evaluate(() => JSON.stringify(window.sheets[0].data));
  const r6 = await 決める('Hanni', 'A1:C5', true, true);
  T('6★集計の 在る 表の 範囲を 変える＝断る・何も 変わらない・控え 0★', r6.戻り === 0 && /集計行を 外してから/.test(r6.理由) && (await 表()) === 'Hanni:0-3:0-2:集' && (await page.evaluate(() => JSON.stringify(window.sheets[0].data))) === 前6 && (await page.evaluate(() => window.undoStack.length)) === 0, JSON.stringify(r6) + ' ' + (await 表()));
  /* 7 名替え＋外す を 1回で → Z 1回で 名・式・集計 全部 戻る */
  await 集計で作る('Futatsu', [[8, 4, '=SUM(Futatsu[c])']]);
  const r7 = await 決める('Hitotsu', 'A1:C4', true, false);
  const 式7 = await page.evaluate(() => String((window.sheets[0].data['8,4'] || {}).f || ''));
  T('7★名替え＋外す＝Hitotsu A1:C3・式も 新名★', r7.戻り === 1 && (await 表()) === 'Hitotsu:0-2:0-2' && 式7.indexOf('Hitotsu[c]') >= 0 && (await 読む(8, 4)) === '56', JSON.stringify(r7) + ' ' + (await 表()) + ' ' + 式7);
  await 戻す();
  const 式7b = await page.evaluate(() => String((window.sheets[0].data['8,4'] || {}).f || ''));
  T('7★Z 1回で 名・式・集計 全部 戻る★', (await 表()) === 'Futatsu:0-3:0-2:集' && 式7b.indexOf('Futatsu[c]') >= 0 && (await 値(3, 0)) === '集計' && (await 読む(6, 4)) === '112', (await 表()) + ' ' + 式7b + ' ' + (await 読む(6, 4)));
  /* 8 集計 無しの 表に チェックを 入れる（今まで通り） */
  await 置く(三行.concat(下), []);
  await 決める('Nashi', 'A1:C3', true, false);
  const r8 = await 決める('Nashi', 'A1:C3', true, true);
  T('8★集計 無し→入れる＝A1:C4・A5=below★', r8.戻り === 1 && (await 表()) === 'Nashi:0-3:0-2:集' && (await 値(4, 0)) === 'below', JSON.stringify(r8) + ' ' + (await 表()));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}
console.log('\nhyou-shukei: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
