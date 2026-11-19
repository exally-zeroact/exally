/* hyou-no-namae-webkit.mjs ･･･ ★表の名前を替えると 全板の 式の字が 追従する（β2c・本物の WebKit）★ 設計 exally-hyou-dougu/sekkei-2c-2.md
 *  見る物＝T1→T9 で 字と答え（別の板・板名付き・指定子・大小）／替わらない物（文字列・T2・Uriagex）／Z・Y・Z→Y→Z→Y／
 *          大小だけの名替え／字の決まりに合わない名は断る（A-B・My T・1表・A1・R）／範囲だけ替えるなら0本／後で直された式は戻さない
 *  走らせ方 node tests/hyou-no-namae-webkit.mjs */
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
const 本 = path.join(os.tmpdir(), 'exally-hyou-no-namae.xlsx');
fs.writeFileSync(本, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

console.log('[表の名前替え] ★全板の 式の字が 追従するか★');
const wk = await borrow('hyou-no-namae', 'webkit');
const browser = await launch('hyou-no-namae', wk, {}, 'webkit');
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
  const 表名 = () => page.evaluate(() => (window.sheets[0].tables || []).map((t) => t.名).join(','));
  const 全部の字 = () => page.evaluate(() => JSON.stringify(window.sheets.map((s) => Object.keys(s.data).sort().map((k) => k + '=' + (s.data[k] && s.data[k].f)))));
  /* 板0「あ」に 表 T1（A1:B4）・T2（D1:E3）・Uriagex（G1:H3）と 式たち／板1「い」に 別の板の式 */
  const 置く = async () => {
    await page.evaluate(() => {
      window.switchSheet(0);
      const s = window.sheets[0];
      for (const k of Object.keys(s.data)) { const [r] = k.split(',').map(Number); if (r >= 5) delete s.data[k]; }
      s.tables = [
        { 名: 'Uriage1', r1: 0, c1: 0, r2: 3, c2: 1, 見出し行: true, 列名: ['a', 'b'], 集計行: false },
        { 名: 'Shiire', r1: 0, c1: 3, r2: 2, c2: 4, 見出し行: true, 列名: ['a', 'b'], 集計行: false },
        { 名: 'Uriagex', r1: 0, c1: 6, r2: 2, c2: 7, 見出し行: true, 列名: ['a', 'b'], 集計行: false },
      ];
      window.setCell(0, 3, 'a', true); window.setCell(0, 4, 'b', true);
      window.setCell(1, 4, 5, true); window.setCell(2, 4, 7, true);
      window.setCell(0, 6, 'a', true); window.setCell(0, 7, 'b', true);
      window.setCell(1, 7, 100, true); window.setCell(2, 7, 200, true);
      window.setCell(6, 0, '=SUM(Uriage1[b])', true);
      window.setCell(6, 1, '=SUM(uriage1[[#データ],[b]])', true);
      window.setCell(6, 2, '="Uriage1[b]"', true);
      window.setCell(6, 3, '=SUM(Shiire[b])', true);
      window.setCell(6, 4, '=SUM(Uriagex[b])', true);
      window.setCell(6, 5, '=LEN("Uriage1[b]")&Uriage1[[#見出し],[b]]', true);
      window.switchSheet(1);
      for (const k of Object.keys(window.sheets[1].data)) delete window.sheets[1].data[k];
      window.setCell(2, 0, '=SUM(Uriage1[b])', true);
      window.setCell(2, 1, '=SUM(あ!Uriage1[b])', true);   /* ★板名付きは 名替えの 前から #ERROR（別件）＝字だけ 見る★ */
      window.setCell(2, 2, "=SUM(Uriage1[b])+LEN('い'!A1)", true);
      window.switchSheet(0);
      window._表の式を流し直す();
      window.undoStack.length = 0; window.redoStack.length = 0;
    });
    await page.waitForTimeout(400);
  };
  /* 表の窓で 名前を 決める（今いる表＝T1 の中を 選んで）。範囲は 既定 A1:B4 */
  const 名を決める = async (名, 範囲) => {
    const 出 = await page.evaluate(([名, 範囲]) => {
      window.switchSheet(0); window.sel(1, 0, 1, 0);
      document.getElementById('tblRange').value = 範囲 || 'A1:B4';
      document.getElementById('tblHeader').checked = true; document.getElementById('tblTotals').checked = false;
      document.getElementById('tblName').value = 名;
      const 戻り = window.表を決める();
      return { 戻り, 理由: document.getElementById('tblWhy').textContent };
    }, [名, 範囲 || '']);
    await page.waitForTimeout(400);
    return 出;
  };
  const 戻す = async () => { await page.evaluate(() => window.doUndo()); await page.waitForTimeout(400); };
  const 進む = async () => { await page.evaluate(() => window.doRedo()); await page.waitForTimeout(400); };
  const 新の字 = async () => [await 字(0, 6, 0), await 字(0, 6, 1), await 字(1, 2, 0), await 字(1, 2, 1), await 字(1, 2, 2)].join(' | ');
  const 答え60 = async () => (await 読む(0, 6, 0)) === '60' && (await 読む(0, 6, 1)) === '60' && (await 読む(1, 2, 0)) === '60';
  const 答え = async () => [await 読む(0, 6, 0), await 読む(0, 6, 1), await 読む(1, 2, 0)].join(' ');

  await 置く();
  T('前提：Uriage1[b]＝60（3か所）・T2＝12・Uriagex＝300', (await 答え60()) && (await 読む(0, 6, 3)) === '12' && (await 読む(0, 6, 4)) === '300', (await 答え()) + ' ' + (await 読む(0, 6, 3)) + ' ' + (await 読む(0, 6, 4)));

  /* A T1→T9 */
  const rA = await 名を決める('Uriage9');
  T('A★名前が Uriage9 に替わる★', rA.戻り === 1 && (await 表名()) === 'Uriage9,Shiire,Uriagex', JSON.stringify(rA) + ' ' + (await 表名()));
  T('A★全板の 字が Uriage9 へ（板名付き・指定子・大小違いも）★', (await 新の字()) === "=SUM(Uriage9[b]) | =SUM(Uriage9[[#データ],[b]]) | =SUM(Uriage9[b]) | =SUM(あ!Uriage9[b]) | =SUM(Uriage9[b])+LEN('い'!A1)", await 新の字());
  T('A★答えは 全部 60 のまま（前は #REF!）★', await 答え60(), await 答え());
  T('A★文字列・T2・Uriagex は 替わらない★', (await 字(0, 6, 2)) === '="Uriage1[b]"' && (await 字(0, 6, 3)) === '=SUM(Shiire[b])' && (await 字(0, 6, 4)) === '=SUM(Uriagex[b])' && (await 字(0, 6, 5)) === '=LEN("Uriage1[b]")&Uriage9[[#見出し],[b]]' && (await 読む(0, 6, 4)) === '300',
    [await 字(0, 6, 2), await 字(0, 6, 3), await 字(0, 6, 4), await 字(0, 6, 5)].join(' | '));
  /* B 取り消し・やり直し */
  await 戻す();
  T('B★Z で 名前 Uriage1・全板の字 Uriage1・60★', (await 表名()) === 'Uriage1,Shiire,Uriagex' && (await 字(1, 2, 0)) === '=SUM(Uriage1[b])' && (await 字(1, 2, 1)) === '=SUM(あ!Uriage1[b])' && (await 字(0, 6, 0)) === '=SUM(Uriage1[b])' && (await 答え60()),
    (await 表名()) + ' ' + (await 新の字()) + ' ' + (await 答え()));
  await 進む();
  T('B★Y で また Uriage9・全板 60★', (await 表名()) === 'Uriage9,Shiire,Uriagex' && (await 字(1, 2, 0)) === '=SUM(Uriage9[b])' && (await 答え60()), (await 表名()) + ' ' + (await 新の字()) + ' ' + (await 答え()));
  await 戻す();
  T('B★Z→Y→Z でも 全板 Uriage1 に戻る（止め2）★', (await 表名()) === 'Uriage1,Shiire,Uriagex' && (await 字(1, 2, 0)) === '=SUM(Uriage1[b])' && (await 字(1, 2, 1)) === '=SUM(あ!Uriage1[b])' && (await 答え60()), (await 表名()) + ' ' + (await 新の字()) + ' ' + (await 答え()));
  await 進む();
  T('B★Z→Y→Z→Y でも Uriage9・60★', (await 表名()) === 'Uriage9,Shiire,Uriagex' && (await 字(1, 2, 1)) === '=SUM(あ!Uriage9[b])' && (await 答え60()), (await 表名()) + ' ' + (await 新の字()) + ' ' + (await 答え()));
  /* C 大小だけ */
  await 置く();
  await 名を決める('uriage1');
  T('C★大小だけ（Uriage1→uriage1）でも 字が uriage1 へ・60★', (await 表名()) === 'uriage1,Shiire,Uriagex' && (await 字(1, 2, 0)) === '=SUM(uriage1[b])' && (await 字(0, 6, 1)) === '=SUM(uriage1[[#データ],[b]])' && (await 答え60()), (await 表名()) + ' ' + (await 新の字()));
  /* G 字の決まりに合わない名は断る（止め1）＝名も字も そのまま */
  for (const 名 of ['A-B', 'My T', '1表', 'A1', 'T9', 'R', 'Uriage1+2']) {
    await 置く();
    const 前 = await 全部の字();
    const r = await 名を決める(名);
    T('G★「' + 名 + '」は 断る・名 Uriage1・字 0本 替わる・60★', r.戻り === 0 && r.理由 !== '' && (await 表名()) === 'Uriage1,Shiire,Uriagex' && (await 全部の字()) === 前 && (await 答え60()), JSON.stringify(r) + ' ' + (await 表名()));
  }
  /* H 今まで 作れた 名（々・全角英数・①・〆・𠮷・テーブル1）は 通る＝式も 追従・60（本番前 taiketsu 任意→直した） */
  for (const 名 of ['佐々木表', 'テーブル１', 'Ｔ１', '表①', '〆表', '𠮷野', 'テーブル1']) {
    await 置く();
    const r = await 名を決める(名);
    T('H★「' + 名 + '」は 通る・式も 追従・60★', r.戻り === 1 && (await 字(1, 2, 0)) === '=SUM(' + 名 + '[b])' && (await 答え60()), JSON.stringify(r) + ' ' + (await 字(1, 2, 0)) + ' ' + (await 答え()));
  }
  /* F 名前を替えない（範囲だけ）＝字 0本 */
  await 置く();
  const 前F = await 全部の字();
  await 名を決める('Uriage1', 'A1:B3');
  T('F★範囲だけ 替えても 式の字は 0本 替わる★', (await 全部の字()) === 前F && (await 表名()) === 'Uriage1,Shiire,Uriagex', await 表名());
  /* D 戻す前に 別の板の式を（控え無しで）直したら その式は 戻さない・他は 戻る */
  await 置く();
  await 名を決める('Uriage9');
  await page.evaluate(() => { const y = window.sheets[1].data['2,0']; y.f = y.v = '=SUM(Uriage9[a])'; });
  await 戻す();
  T('D★後で 直された 式は 前の字で 上書きしない・他は Uriage1 に戻る★', (await 字(1, 2, 0)) === '=SUM(Uriage9[a])' && (await 字(1, 2, 1)) === '=SUM(あ!Uriage1[b])' && (await 字(0, 6, 0)) === '=SUM(Uriage1[b])' && (await 表名()) === 'Uriage1,Shiire,Uriagex',
    (await 新の字()) + ' ' + (await 表名()));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}
console.log('\nhyou-no-namae: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
