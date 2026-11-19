/* hyou-midashidake-webkit.mjs ･･･ ★見出しだけの 表は 作らない＝中身の 空の 1行を 本当に 持つ（β2d・本物の WebKit）★ 設計 exally-hyou-dougu/sekkei-2d-2.md
 *  真値＝実Excel COM（exally-hyou-dougu/com-midashidake{,2,3,4}-out.txt）
 *  見る物＝見出し1行で 作る（下が空＝伸ばす・中身＝断る）／前から在る表を1行＝断る／行の削除で 中身全部＝1行目を 空で 残す（外の セル・高さは 残る）／
 *          取り消し・やり直し／集計つき／2表 かかる 行の削除は 断る／集計行が 下の 中身を 上書きしない／サブテーブルを作る
 *  走らせ方 node tests/hyou-midashidake-webkit.mjs */
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
const 本 = path.join(os.tmpdir(), 'exally-hyou-midashidake.xlsx');
fs.writeFileSync(本, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

console.log('[見出しだけの表] ★空の 1行を 持つか★');
const wk = await borrow('hyou-midashidake', 'webkit');
const browser = await launch('hyou-midashidake', wk, {}, 'webkit');
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
  const 見出し = [[0, 0, 'a'], [0, 1, 'b'], [0, 2, 'c']];
  const 三行 = 見出し.concat([[1, 0, 21], [1, 1, 22], [1, 2, 23], [2, 0, 31], [2, 1, 32], [2, 2, 33]]);
  const 表3 = (名) => [{ 名, r1: 0, c1: 0, r2: 2, c2: 2, 見出し行: true, 列名: ['a', 'b', 'c'], 集計行: false }];

  /* 1 見出し1行で 作る・下が 空（実測1） */
  await 置く(見出し.concat([[5, 4, '=SUM(Kara1[b])'], [6, 4, '=ROWS(Kara1[b])']]), []);
  const r1 = await 決める('Kara1', 'A1:C1', true);
  T('1★見出し1行で 作る＝A1:C2（空の1行）★', r1.戻り === 1 && (await 表()) === 'Kara1:0-1:0-2', JSON.stringify(r1) + ' ' + (await 表()));
  T('1★SUM(Kara1[b])=0・ROWS=1（前は #REF!）★', (await 読む(5, 4)) === '0' && (await 読む(6, 4)) === '1', (await 読む(5, 4)) + ' ' + (await 読む(6, 4)));
  /* 2 下に 中身＝断る（実Excel は ずらす＝β2g） */
  await 置く(見出し.concat([[1, 1, 5]]), []);
  const r2 = await 決める('Kara2', 'A1:C1', true);
  T('2★すぐ下に 中身＝断る・理由が出る・表 0・B2=5 のまま★', r2.戻り === 0 && /すぐ下/.test(r2.理由) && (await 表()) === '' && (await 値(1, 1)) === '5', JSON.stringify(r2) + ' ' + (await 表()));
  /* 3 下は 空・その下 A3 に 中身＝ずらさず 伸ばす（実測2） */
  await 置く(見出し.concat([[2, 0, 'y']]), []);
  const r3 = await 決める('Kara3', 'A1:C1', true);
  T('3★A2 空・A3=y＝A1:C2・A3 は y のまま★', r3.戻り === 1 && (await 表()) === 'Kara3:0-1:0-2' && (await 値(2, 0)) === 'y', JSON.stringify(r3) + ' ' + (await 表()));
  /* 4 前から 在る表を 1行に 直す＝断る（実Excel も 断る） */
  await 置く(三行, 表3('Mae4'));
  const r4 = await 決める('Mae4', 'A1:C1', true);
  T('4★前から在る表を 1行に＝断る・範囲 そのまま★', r4.戻り === 0 && /1行以上/.test(r4.理由) && (await 表()) === 'Mae4:0-2:0-2', JSON.stringify(r4) + ' ' + (await 表()));
  /* 5 前から 在る表で 見出しを 外して 1行＝断る（見出し扱いに なる 道・止め3） */
  await 置く(三行, 表3('Mae5'));
  const r5 = await 決める('Mae5', 'A1:C1', false);
  T('5★見出しを 外して 1行＝断る★', r5.戻り === 0 && (await 表()) === 'Mae5:0-2:0-2', JSON.stringify(r5) + ' ' + (await 表()));
  /* 6 行の削除で 中身 全部＝1行目を 空で 残す（実測4・p2 Q1） */
  const 外 = [[1, 7, 'keep2'], [3, 7, 'h4'], [3, 0, 'z'], [5, 4, '=SUM(Del6[b])']];
  await 置く(三行.concat(外), 表3('Del6'));
  await page.evaluate(() => { window.sheets[0].rowH[1] = 40; });
  const 前6 = await page.evaluate(() => JSON.stringify(window.sheets[0].data));
  const d6 = await 行を消す(1, 2);
  const 見6 = async () => [await 表(), await 値(1, 0), await 値(1, 7), await 値(2, 0), await 値(2, 7), await page.evaluate(() => String(window.sheets[0].rowH[1]))].join(' ');
  T('6★行2:3 消す＝Del6 A1:C2・A2 空・H2=keep2・A3=z・H3=h4・高さ40 残る★', d6 !== false && (await 見6()) === 'Del6:0-1:0-2  keep2 z h4 40', await 見6());
  T('6★SUM(Del6[b])=0（6行目の 式が 1行 上へ）★', (await 読む(4, 4)) === '0', await 読む(4, 4));
  await 戻す();
  T('7★Z で 1回で 全部 戻る★', (await 表()) === 'Del6:0-2:0-2' && (await page.evaluate(() => JSON.stringify(window.sheets[0].data))) === 前6, await 表());
  await 進む();
  T('7★Y で また 空の1行★', (await 見6()) === 'Del6:0-1:0-2  keep2 z h4 40', await 見6());
  /* 8 中身 1行だけの 表で その行を 消す＝行は 消えず 空に なるだけ（p2 Q6） */
  await 置く(見出し.concat([[1, 0, 21], [1, 1, 22], [1, 7, 'keep'], [2, 0, 'y']]), [{ 名: 'One8', r1: 0, c1: 0, r2: 1, c2: 2, 見出し行: true, 列名: ['a', 'b', 'c'], 集計行: false }]);
  await 行を消す(1, 1);
  T('8★1行だけ＝A1:C2 のまま・A2 空・H2=keep・A3=y（行は 詰めない）★', [await 表(), await 値(1, 0), await 値(1, 7), await 値(2, 0)].join(' ') === 'One8:0-1:0-2  keep y', [await 表(), await 値(1, 0), await 値(1, 7), await 値(2, 0)].join(' '));
  /* 9 集計つきで 中身と 集計を 消す（com4） */
  await 置く(三行.concat([[3, 0, '集計'], [4, 0, '下']]), [{ 名: 'Tot9', r1: 0, c1: 0, r2: 3, c2: 2, 見出し行: true, 列名: ['a', 'b', 'c'], 集計行: true }]);
  await 行を消す(1, 3);
  T('9★集計も 消す＝A1:C2・集計 無し・A3=下★', (await 表()) === 'Tot9:0-1:0-2' && (await 値(2, 0)) === '下' && (await 値(1, 0)) === '', (await 表()) + ' ' + (await 値(2, 0)));
  /* 10 2表が かかる 行の削除は 断る（com4・p2 Q2） */
  const 横 = 表3('Yoko1').concat([{ 名: 'Yoko2', r1: 0, c1: 4, r2: 2, c2: 4, 見出し行: true, 列名: ['p'], 集計行: false }]);
  await 置く(三行.concat([[0, 4, 'p'], [1, 4, 1], [2, 4, 2]]), 横);
  const 前10 = await page.evaluate(() => JSON.stringify(window.sheets[0].data));
  const d10 = await 行を消す(1, 1);
  T('10★横に 並ぶ 2表の 行＝断る・何も 変わらない・控え 0★', d10 === false && (await page.evaluate(() => JSON.stringify(window.sheets[0].data))) === 前10 && (await page.evaluate(() => window.undoStack.length)) === 0, String(d10) + ' ' + (await 表()));
  await 置く(三行.concat([[4, 0, 'p'], [5, 0, 1], [6, 0, 2]]), 表3('Tate1').concat([{ 名: 'Tate2', r1: 4, c1: 0, r2: 6, c2: 0, 見出し行: true, 列名: ['p'], 集計行: false }]));
  const d10b = await 行を消す(2, 5);
  T('10★縦に 並ぶ 2表を またぐ＝断る★', d10b === false && (await 表()) === 'Tate1:0-2:0-2,Tate2:4-6:0-0', String(d10b) + ' ' + (await 表()));
  await 置く(三行.concat([[2, 4, 'p'], [3, 4, 1], [4, 4, 2]]), 表3('Ka1').concat([{ 名: 'Ka2', r1: 2, c1: 4, r2: 4, c2: 4, 見出し行: true, 列名: ['p'], 集計行: false }]));
  const d10c = await 行を消す(1, 1);
  T('10★1表だけ かかる（Ka2 は 3行目から）＝通る★', d10c !== false && (await 表()) === 'Ka1:0-1:0-2,Ka2:1-3:4-4', String(d10c) + ' ' + (await 表()));
  /* 11 集計行は 下の 中身を 上書き しない（止め4） */
  await 置く(三行.concat([[3, 0, 'x']]), []);
  const r11 = await 決める('Goukei11', 'A1:C3', true, true);
  T('11★下に 中身＝集計行は 断る・A4=x のまま★', r11.戻り === 0 && /集計行/.test(r11.理由) && (await 値(3, 0)) === 'x' && (await 表()) === '', JSON.stringify(r11) + ' ' + (await 値(3, 0)));
  /* 12 見出しだけ＋集計＝見出し・空の1行・集計（実測5） */
  await 置く(見出し.concat([[5, 4, '=SUM(Goukei12[b])']]), []);
  const r12 = await 決める('Goukei12', 'A1:C1', true, true);
  T('12★A1:C3（見出し・空・集計）・SUM=0★', r12.戻り === 1 && (await 表()) === 'Goukei12:0-2:0-2:集' && (await 読む(5, 4)) === '0', JSON.stringify(r12) + ' ' + (await 表()) + ' ' + (await 読む(5, 4)));
  await 置く(見出し.concat([[2, 1, 'y']]), []);
  const r12b = await 決める('Tot12b', 'A1:C1', true, true);
  T('12★見出しだけ＋集計で 集計の行に 中身＝断る・B3=y のまま★', r12b.戻り === 0 && (await 値(2, 1)) === 'y' && (await 表()) === '', JSON.stringify(r12b));
  /* 13 サブテーブルを作る（新しい板）で 見出し1行 */
  await 置く(見出し, []);
  const r13 = await page.evaluate(() => {
    window.switchSheet(0); window.sel(0, 0, 0, 2);
    const n = window.sheets.length; window.サブテーブルを作る();
    const s = window.sheets[window.sheets.length - 1];
    return window.sheets.length > n ? (s.tables || []).map((t) => t.r1 + '-' + t.r2 + (t.見出し行 ? ':見' : '')).join(',') : 'NG';
  });
  T('13★サブテーブルを作る で 見出し1行＝0-1（空の1行）★', r13 === '0-1:見', r13);
  /* 14 前の版で 作り 保存済みの 見出しだけの 表（r1==r2）＝名替え・集計の出し入れを 止めない（naoshi 止め1） */
  await 置く(見出し.concat([[5, 4, '=SUM(Mae14[b])']]), [{ 名: 'Mae14', r1: 0, c1: 0, r2: 0, c2: 2, 見出し行: true, 列名: ['a', 'b', 'c'], 集計行: false }]);
  const r14 = await 決める('AtoHyo', 'A1:C1', true);
  T('14★前から 見出しだけ・下が空＝名替え 通る・A1:C2 へ 伸びる★', r14.戻り === 1 && (await 表()) === 'AtoHyo:0-1:0-2', JSON.stringify(r14) + ' ' + (await 表()));
  const f14 = await page.evaluate(() => String((window.sheets[0].data['5,4'] || {}).f || ''));
  T('14★旧名の 式が 新名へ・SUM(AtoHyo[b])=0★', f14.indexOf("AtoHyo[b]") >= 0 && (await 読む(5, 4)) === '0', f14 + ' ' + (await 読む(5, 4)));
  await 置く(見出し, [{ 名: 'Mae14b', r1: 0, c1: 0, r2: 0, c2: 2, 見出し行: true, 列名: ['a', 'b', 'c'], 集計行: false }]);
  const r14b = await 決める('Mae14b', 'A1:C1', true, true);
  T('14★前から 見出しだけ＋集計を 出す＝通る★', r14b.戻り === 1 && (await 表()) === 'Mae14b:0-2:0-2:集', JSON.stringify(r14b) + ' ' + (await 表()));
  await 置く(見出し.concat([[1, 0, 'y']]), [{ 名: 'Mae14c', r1: 0, c1: 0, r2: 0, c2: 2, 見出し行: true, 列名: ['a', 'b', 'c'], 集計行: false }]);
  const r14c = await 決める('Ato14c', 'A1:C1', true);
  T('14★前から 見出しだけ・下に 中身＝名替えは 通る・形は 今まで通り・A2=y のまま★', r14c.戻り === 1 && (await 表()) === 'Ato14c:0-0:0-2' && (await 値(1, 0)) === 'y', JSON.stringify(r14c) + ' ' + (await 表()));
  /* 15 2表を 丸ごと 含む 行の削除＝実Excel は 通す（com-midashidake5）・一部だけ かかる 表が 在れば 断る */
  await 置く(三行.concat([[4, 0, 'p'], [5, 0, 1], [6, 0, 2], [8, 0, 'shita']]), 表3('Tate15').concat([{ 名: 'Tate15b', r1: 4, c1: 0, r2: 6, c2: 0, 見出し行: true, 列名: ['p'], 集計行: false }]));
  const d15 = await 行を消す(0, 6);
  T('15★縦2表 丸ごと＝通る・表0・A2=shita★', d15 !== false && (await 表()) === '' && (await 値(1, 0)) === 'shita', String(d15) + ' ' + (await 表()) + ' ' + (await 値(1, 0)));
  await 戻す();
  T('15★Z で 2表と 中身が 戻る★', (await 表()) === 'Tate15:0-2:0-2,Tate15b:4-6:0-0' && (await 値(1, 0)) === '21' && (await 値(5, 0)) === '1' && (await 値(8, 0)) === 'shita', (await 表()) + ' ' + (await 値(1, 0)) + ' ' + (await 値(8, 0)));
  await 置く(三行.concat([[0, 4, 'p'], [1, 4, 1], [2, 4, 2], [4, 0, 'shita']]), 表3('Yoko15').concat([{ 名: 'Yoko15b', r1: 0, c1: 4, r2: 2, c2: 4, 見出し行: true, 列名: ['p'], 集計行: false }]));
  const d15b = await 行を消す(0, 2);
  T('15★横2表 丸ごと＝通る・表0・A2=shita★', d15b !== false && (await 表()) === '' && (await 値(1, 0)) === 'shita', String(d15b) + ' ' + (await 表()) + ' ' + (await 値(1, 0)));
  await 置く(三行.concat([[4, 0, 'p'], [5, 0, 1], [6, 0, 2]]), 表3('Tate15c').concat([{ 名: 'Tate15d', r1: 4, c1: 0, r2: 6, c2: 0, 見出し行: true, 列名: ['p'], 集計行: false }]));
  const d15c = await 行を消す(0, 4);
  T('15★上 丸ごと＋下の 見出しだけ＝断る★', d15c === false && (await 表()) === 'Tate15c:0-2:0-2,Tate15d:4-6:0-0', String(d15c) + ' ' + (await 表()));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}
console.log('\nhyou-midashidake: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
