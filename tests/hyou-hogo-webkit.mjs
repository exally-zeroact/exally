/* hyou-hogo-webkit.mjs ･･･ ★保護した シートでは 表の 機能を 断る（作る・集計行・名替え・範囲替え）・範囲に変換（表を やめる）は 通す（β2j・本物の WebKit）★
 *  真値＝実Excel COM（exally-hyou-dougu/com-hogo-out.txt）＝ロックを 外した マスでも 断る・字は「シートが保護されているため、テーブルの機能は使用できません。」
 *  走らせ方 node tests/hyou-hogo-webkit.mjs */
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
const 本 = path.join(os.tmpdir(), 'exally-hyou-hogo.xlsx');
fs.writeFileSync(本, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

console.log('[保護] ★表の 機能を 断る★');
const wk = await borrow('hyou-hogo', 'webkit');
const browser = await launch('hyou-hogo', wk, {}, 'webkit');
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
      s.rowH = {}; s.links = {}; s.protect = false;
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
  const 三行 = [[0, 0, 'a'], [0, 1, 'b'], [0, 2, 'c'], [1, 0, 21], [1, 1, 22], [1, 2, 23], [2, 0, 31], [2, 1, 32], [2, 2, 33], [6, 4, '=SUM(C2:C10)']];
  const 守る = async (外す) => { await page.evaluate((外す) => { if (外す) for (const k of Object.keys(window.sheets[0].data)) window.sheets[0].data[k].locked = false; window.sheets[0].protect = true; }, 外す); };
  const 丸写し = () => page.evaluate(() => JSON.stringify({ d: window.sheets[0].data, t: window.sheets[0].tables, u: window.undoStack.length, y: window.redoStack.length }));
  const 知らせ = () => page.evaluate(() => { const n = document.querySelectorAll('.notify, #notify, .toast'); return Array.from(n).map((x) => x.textContent).join('|'); });
  const 断りの字 = /保護されているため.*テーブルの 機能は 使えません/;
  for (const 外す of [false, true]) {
    const k = 外す ? 'ロック外し' : '既定';
    /* 1 表を 作る */
    await 置く(三行, []);
    await 守る(外す);
    const 前1 = await 丸写し();
    const r1 = await 決める('Hogo', 'A1:C3', true, false);
    T(k + ' 1★保護中に 表を 作る＝断る・表 0・何も 変わらない・控え 0★', r1.戻り === 0 && 断りの字.test(r1.理由) && (await 丸写し()) === 前1, JSON.stringify(r1) + ' ' + (await 表()));
    /* 2 集計行を 出す／3 名替え／4 範囲替え（前からの 表） */
    await 置く(三行, []);
    await 決める('Mae', 'A1:C3', true, false);
    await page.evaluate(() => { window.undoStack.length = 0; window.redoStack.length = 0; });
    await 守る(外す);
    const 前2 = await 丸写し();
    const r2 = await 決める('Mae', 'A1:C3', true, true);
    const r3 = await 決める('Kaeta', 'A1:C3', true, false);
    const r4 = await 決める('Mae', 'A1:C2', true, false);
    T(k + ' 2-4★保護中に 集計行・名替え・範囲替え＝全部 断る・A4 空・何も 変わらない★', [r2, r3, r4].every((r) => r.戻り === 0 && 断りの字.test(r.理由)) && (await 丸写し()) === 前2 && (await 値(3, 0)) === '', JSON.stringify([r2, r3, r4]) + ' ' + (await 表()));
    /* 5 集計行を しまう */
    await 置く(三行, []);
    await 決める('Shu', 'A1:C3', true, true);
    await page.evaluate(() => { window.undoStack.length = 0; window.redoStack.length = 0; });
    await 守る(外す);
    const 前5 = await 丸写し();
    const r5 = await 決める('Shu', 'A1:C4', true, false);
    T(k + ' 5★保護中に 集計行を しまう＝断る・A4=集計 のまま・SUM(C2:C10)=112★', r5.戻り === 0 && 断りの字.test(r5.理由) && (await 丸写し()) === 前5 && (await 値(3, 0)) === '集計' && (await 読む(6, 4)) === '112', JSON.stringify(r5) + ' ' + (await 表()) + ' ' + (await 読む(6, 4)));
    /* 6 窓を 開く（Ctrl+T・リボン の 入口）＝開かない */
    await 置く(三行, []);
    await 守る(外す);
    const 開 = await page.evaluate(() => { const ov = document.getElementById('tableOverlay'); ov.style.display = 'none'; window.sel(0, 0, 0, 0); window.表の窓を開く(); return ov.style.display; });
    T(k + ' 6★保護中は 表の 窓を 開かない★', 開 !== 'flex', 'display=' + 開);
    /* 7 範囲に 変換（表を やめる）＝実Excel は 通す */
    await 置く(三行, []);
    await 決める('Yame', 'A1:C3', true, false);
    await 守る(外す);
    const r7 = await page.evaluate(() => { window.sel(1, 1, 1, 1); return window.表をやめる(); });
    T(k + ' 7★保護中でも 表をやめる の 関数は 通る（実Excel の Unlist と 同じ・画面の 入口は 窓が 開かないので 届かない）・中身は 残る★', r7 === 1 && (await 表()) === '' && (await 値(1, 1)) === '22', r7 + ' ' + (await 表()));
  }
  /* 9 フォームで 消す・足す（β2j 2版・実Excel COM com-hogo-gyou-out.txt＝ListRows.Add/Delete は ロック外しでも 断る） */
  for (const 外す of [false, true]) {
    const k = 外す ? 'ロック外し' : '既定';
    for (const 何 of ['消す', '足す']) {
      await 置く(三行, []);
      await 決める('Fm', 'A1:C3', true, false);
      await page.evaluate(() => { window.undoStack.length = 0; window.redoStack.length = 0; });
      await 守る(外す);
      const 前9 = await 丸写し();
      const r9 = await page.evaluate((何) => {
        window.sel(1, 0, 1, 0);
        const 開 = window.フォームの窓を開く();
        const 戻り = 何 === '消す' ? window.フォームで消す() : window.フォームで足す();
        const 理由 = document.getElementById('formWhy').textContent;
        window.フォームを閉じる();
        return { 開, 戻り, 理由 };
      }, 何);
      await page.waitForTimeout(300);
      T(k + ' 9' + 何 + '★保護中に フォームで 行を ' + 何 + '＝断る・表も 中身も 控えも 変わらない★', r9.開 === 1 && r9.戻り === 0 && 断りの字.test(r9.理由) && (await 丸写し()) === 前9 && (await 表()) === 'Fm:0-2:0-2', JSON.stringify(r9) + ' ' + (await 表()));
    }
  }
  /* 9外 表の 外の 塊も フォームで 消す は 断る（setCell を 通らず ロックを 消すので 安全側） */
  await 置く(三行, []);
  await 守る(false);
  const 前9外 = await 丸写し();
  const r9外 = await page.evaluate(() => { window.sel(1, 0, 1, 0); const 開 = window.フォームの窓を開く(); const 戻り = window.フォームで消す(); const 理由 = document.getElementById("formWhy").textContent; window.フォームを閉じる(); return { 開, 戻り, 理由 }; });
  await page.waitForTimeout(300);
  T("9外★表の 外の 塊も 保護中は フォームで 消さない・字は 行を 足す・消す★", r9外.開 === 1 && r9外.戻り === 0 && /行を 足す・消す は できません/.test(r9外.理由) && (await 丸写し()) === 前9外 && (await 値(2, 0)) === "31", JSON.stringify(r9外));
  /* 10 作る→Ctrl+Z→保護→Ctrl+Y＝保護中に 表と 集計行を 作らない */
  await 置く(三行, []);
  await 決める('Zy', 'A1:C3', true, true);
  await 戻す();
  const 前10表 = await 表();
  await 守る(false);
  const 前10 = await 丸写し();
  await 進む();
  T('10★保護中の やり直しで 表と 集計行を 作らない・A4 空★', 前10表 === '' && (await 丸写し()) === 前10 && (await 値(3, 0)) === '', 前10表 + ' → ' + (await 表()) + ' A4=' + (await 値(3, 0)));
  /* 11 作る→保護→Ctrl+Z＝保護中に 表を 消さない／12 保護を やめたら 戻せる */
  await 置く(三行, []);
  await 決める('Zz', 'A1:C3', true, false);
  await 守る(false);
  const 前11 = await 丸写し();
  await 戻す();
  T('11★保護中の 元に戻すで 表を 消さない★', (await 丸写し()) === 前11 && (await 表()) === 'Zz:0-2:0-2', await 表());
  await page.evaluate(() => { window.sheets[0].protect = false; });
  await 戻す();
  T('12★保護を やめたら 元に戻すで 表が 消える（今まで通り）★', (await 表()) === '', await 表());
  /* 13 保護中に 行を 足す→Ctrl+Z＝戻る（本番前 taiketsu 止め1＝表の 四角が ずれる 挿入でも 取り消しを 詰まらせない・本番 a18c7163 と 同じ） */
  await 置く([[1, 0, 'a'], [1, 1, 'b'], [2, 0, 1], [2, 1, 2], [3, 0, 3], [3, 1, 4]], []);
  await 決める('Gy', 'A2:B4', true, false);
  await page.evaluate(() => { window.undoStack.length = 0; window.redoStack.length = 0; });
  await 守る(false);
  const r13 = await page.evaluate(() => { window.sel(0, 0, 0, 0); window.ctxInsertRow(); const 後 = window.undoStack.length; window.doUndo(); return { 後, 戻後: window.undoStack.length }; });
  await page.waitForTimeout(300);
  T('13★保護中に 行を 足して Ctrl+Z＝戻る・表は A2:B4 へ★', r13.後 === 1 && r13.戻後 === 0 && (await 表()) === 'Gy:1-3:0-1', JSON.stringify(r13) + ' ' + (await 表()));
  /* 14 作る→Ctrl+Z→Ctrl+Y→保護→Ctrl+Z＝鏡にも 印（Y で 積んだ 控えも 保護中は 戻さない） */
  await 置く(三行, []);
  await 決める('Kg', 'A1:C3', true, false);
  await 戻す(); await 進む();
  await 守る(false);
  const 前14 = await 丸写し();
  await 戻す();
  T('14★Z→Y で 積み直した 表の 控えも 保護中は 戻さない★', (await 丸写し()) === 前14 && (await 表()) === 'Kg:0-2:0-2', await 表());
  /* 15 見出し 無しで 作る（ctxInsertRow で 見出し行を 足す 道）→保護→Ctrl+Z＝戻さない */
  await 置く([[0, 0, 1], [0, 1, 2], [1, 0, 3], [1, 1, 4]], []);
  const r15 = await 決める("Mn", "A1:B2", false, false);
  await 守る(false);
  const 前15 = await 丸写し();
  await 戻す();
  T("15★見出し 無しで 作った 表も 保護中は Ctrl+Z で 消さない★", r15.戻り === 1 && (await 丸写し()) === 前15 && (await 表()) === "Mn:0-2:0-1", JSON.stringify(r15) + " " + (await 表()));
  /* 16 フォームで 消す（保護 無し）→保護→Ctrl+Z＝戻さない・保護を やめたら 戻る */
  await 置く(三行, []);
  await 決める("Fz", "A1:C3", true, false);
  await page.evaluate(() => { window.undoStack.length = 0; window.redoStack.length = 0; window.sel(1, 0, 1, 0); window.フォームの窓を開く(); window.フォームで消す(); window.フォームを閉じる(); });
  await page.waitForTimeout(300);
  const 消後 = await 表();
  await 守る(false);
  const 前16 = await 丸写し();
  await 戻す();
  const 守り中 = (await 丸写し()) === 前16;
  await page.evaluate(() => { window.sheets[0].protect = false; });
  await 戻す();
  T("16★フォームで 消した 表の 行は 保護中は 戻さない・保護を やめたら 戻る★", 消後 === "Fz:0-1:0-2" && 守り中 && (await 表()) === "Fz:0-2:0-2" && (await 値(2, 0)) === "31", 消後 + " " + 守り中 + " " + (await 表()));
  /* 8 保護を やめたら 今まで通り 作れる */
  await 置く(三行, []);
  await page.evaluate(() => { window.sheets[0].protect = false; });
  const r8 = await 決める('Yameta', 'A1:C3', true, true);
  T('8★保護 無しは 今まで通り＝A1:C4 集計★', r8.戻り === 1 && (await 表()) === 'Yameta:0-3:0-2:集', JSON.stringify(r8) + ' ' + (await 表()));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}
console.log('\nhyou-hogo: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
