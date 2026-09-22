/* doko-wo-sawatta-bun-webkit.mjs — ★どこを 触ったか＝1文 ＋ ドロップダウンで 詳しく★ 2026-09-22
 *
 *  ★★司さんの 注文（ア）★★
 *    「★全部 保存しろや★・★Excel のように 保存★
 *      （★どこを 触ったか どんな 関数や マクロが 組まれてるかは
 *        簡潔に 文に して ドロップダウンで 詳しく★）」
 *
 *  ★★形は 経営者1 の 注文で 決めました★★（2026-09-21）
 *    「★「どこを 触ったか」は ★私が 実Excel で 割れる 形★に して ください★
 *      ＝「A1 を 3 から 42 に した」の ように ★マスと 前後の 値★が 在れば
 *        ★私が 開いて 突き合わせられます★」
 *
 *  ★★この 試験が 見る 物★★（2つ。★どちらも 欠けたら 赤★）
 *    ① ★言葉（`DiffPreview.文`）★・★残りの 数は `userCount` から 取る★
 *         ★2026-09-22 ここで 1回 踏みました★
 *           `sheets[].rows` は ★先頭 3行だけ★（この 台の 元からの 決め）。
 *           見えて いる 分だけ 数えたので ★4つ 直したのに 「ほか 1か所」★ と 出ました。
 *           ⇒★数は 必ず 数えた 側から 取ります★
 *    ② ★絵（本物の webkit）★・★畳んだ 中身が 本当に 高さ 0 か★
 *         ★2026-09-08 Rakunally の 請求書で 実測★
 *           `<details>` を 畳んでも 中の 部品が 自分で display を 持つと
 *           ★open=false のまま 幅358×高49 で 見えたまま★ でした。
 *           ⇒★「畳んだ」は 印(open 属性)では なく ★高さ★で 数えます★
 *
 *  ★★お客さんの 道で 出します★★
 *    `#bookFileInput` に ファイルを 渡す＝★画面の 「読み込む」が 押す 物と 同じ★。
 *    そのあと ★保存の 窓を 出して [やめる] を 押します★
 *    ＝★1本も 書き出しません★（ファイルは 作られない）。
 *    ただし ★マスに 打つ 所だけは `setCell()` を 呼びます★
 *      ＝★字を 打つ 真似では なく 台の 口です★（正直に 書く）。
 *
 *  走らせ方: node tests/doko-wo-sawatta-bun-webkit.mjs
 */
import path from 'node:path'; import http from 'node:http'; import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { borrow, launch } from '../scripts/_borrow-playwright.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const DiffPreview = require_(path.join(ROOT, 'lib/diff-preview.js'));

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

/* ══════ ① 言葉 ══════ */
console.log('★① 言葉（`DiffPreview.文`）★');

/* ★直した 数を 決めて 作る★＝`build()` に 通す（★窓と 同じ 台★） */
function 作る(直した数, 波及数) {
  const ch = {}, base = {}, edited = {};
  for (let i = 0; i < 直した数; i++) {
    ch['0,' + i] = i + 1; base['計算|0,' + i] = 9; edited['計算|0,' + i] = { beforeF: null };
  }
  for (let j = 0; j < (波及数 || 0); j++) { ch['5,' + j] = 100 + j; base['計算|5,' + j] = 7; }
  return DiffPreview.build({
    sheets: [{ name: '計算', data: {} }],
    changedCells: () => ch, base, edited, format: (v) => String(v),
  });
}

{
  const p = 作る(1, 1);
  const 出 = DiffPreview.文(p);
  console.log('      ── 実測 ── ' + 出);
  T('1つ 直した＋波及1 ＝ マスと 前後の 値が 出る',
    出 === '計算!A1 を 9 から 1 に しました。つられて 1か所が 変わります', 出);
}
{
  const p = 作る(2, 0);
  const 出 = DiffPreview.文(p);
  console.log('      ── 実測 ── ' + 出);
  T('2つ 直した ＝ 2つとも 出る（「ほか」は 付かない）',
    出 === '計算!A1 を 9 から 1 に しました／計算!B1 を 9 から 2 に しました', 出);
}
{
  /* ★★これが 2026-09-22 に 踏んだ 穴★★
       `rows` は 先頭 3行だけ ⇒ 見えて いる 分を 数えると 「ほか 1か所」に なった */
  const p = 作る(4, 0);
  const 出 = DiffPreview.文(p);
  console.log('      ── 実測 ── ' + 出 + '（rows ' + p.sheets[0].rows.length
    + '行 / userCount ' + p.userCount + '）');
  T('★4つ 直した ＝「ほか 2か所」★（★rows(3行)では なく userCount(4)で 数える★）',
    出 === '計算!A1 を 9 から 1 に しました／計算!B1 を 9 から 2 に しました（ほか 2か所）', 出);
}
{
  const p = 作る(18, 0);
  const 出 = DiffPreview.文(p);
  console.log('      ── 実測 ── ' + 出);
  T('18つ 直した ＝「ほか 16か所」（★数は いくつでも 合う★）',
    出.indexOf('（ほか 16か所）') > 0, 出);
}
{
  /* 前の 値を 控えて いない＝★黙って 0や 空に しない★ */
  const p = DiffPreview.build({
    sheets: [{ name: '計算', data: {} }],
    changedCells: () => ({ '0,0': 42 }), base: {}, edited: { '計算|0,0': { beforeF: null } },
    format: (v) => String(v),
  });
  const 出 = DiffPreview.文(p);
  console.log('      ── 実測 ── ' + 出);
  T('前が 分からない ＝「分かりません」と 出す（黙って 埋めない）',
    出 === '計算!A1 を 分かりません から 42 に しました', 出);
}
{
  const p = DiffPreview.build({
    sheets: [{ name: '計算', data: {} }], changedCells: () => ({}), base: {}, edited: {},
  });
  const 出 = DiffPreview.文(p);
  console.log('      ── 実測 ── ' + 出);
  T('何も 直して いない ＝「変える所はありません」', 出 === '変える所はありません', 出);
}
{
  /* ★人が 直した 所が 1行も 出て いない 時★（波及が 先頭を 埋めた 等）
     ⇒★無い事に しない★＝数だけ 言う */
  const ch = {}, base = {}, edited = {};
  for (let i = 0; i < 9; i++) { ch['0,' + i] = i; base['計算|0,' + i] = 0; }
  ch['0,20'] = 5; base['計算|0,20'] = 1; edited['計算|0,20'] = { beforeF: null };
  const p = DiffPreview.build({
    sheets: [{ name: '計算', data: {} }], changedCells: () => ch, base, edited,
    format: (v) => String(v), maxRows: 0,
  });
  const 出 = DiffPreview.文(p);
  console.log('      ── 実測 ── ' + 出 + '（rows 0行 / userCount ' + p.userCount + '）');
  T('★1行も 出せなかった 時も 数は 言う★（無い事に しない）',
    出.indexOf('あなたが 直した所 1か所') === 0, 出);
}

/* ══════ ② 絵（本物の webkit・お客さんの 道） ══════ */
console.log('\n★② 絵（本物の webkit で 開いて 保存の 窓を 出す）★');

const 材料 = path.join(ROOT, 'tests/fixtures/cross-sheet-sample.xlsb');
if (!fs.existsSync(材料)) { console.log('  ★材料が 有りません★ ' + 材料); process.exit(1); }

const wk = await borrow('doko-wo-sawatta-bun', 'webkit');
const browser = await launch('doko-wo-sawatta-bun', wk, {}, 'webkit');
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const 配信 = await 立てる(ROOT);

try {
  const 返 = await page.goto(配信.url + '/book.html', { waitUntil: 'load', timeout: 60000 })
    .catch((e) => ({ エラー: e.message }));
  if (!返 || 返.エラー) throw new Error('★開けませんでした★ ' + (返 && 返.エラー));

  await page.evaluate(() => {
    document.body.classList.remove('exally-locked');
    const ov = document.getElementById('loginOv');
    if (ov) { ov.classList.remove('open'); ov.style.display = 'none'; }
  });

  /* ★お客さんの 入口★ */
  await page.setInputFiles('#bookFileInput', 材料);
  await page.waitForFunction(() => {
    const sh = window.sheets && window.sheets[window.activeSheet];
    return !!(sh && sh.data && Object.keys(sh.data).length > 3);
  }, { timeout: 60000 });

  /* ★1マス 打つ★（★台の 口＝`setCell`★。字を 打つ 真似では ありません） */
  const 打てた = await page.evaluate(() => {
    if (typeof window.setCell !== 'function') return '(setCell が 無い)';
    const i = (window.sheets || []).findIndex((s) => s.name === '4月');
    if (i < 0) return '(4月 が 無い)';
    window.activeSheet = i;
    window.setCell(3, 2, '99');
    return 'ok';
  });
  if (打てた !== 'ok') throw new Error('★打てませんでした★ ' + 打てた);

  /* ★保存の 窓を 出す★（★[やめる] を 押すので 1本も 書き出しません★） */
  await page.evaluate(() => {
    window.FileOut = { deliver: () => Promise.reject(new Error('★書き出しては いけません★')) };
    window.__保存 = window.saveOpenedBook();
  });
  await page.waitForFunction(() => {
    const ov = document.getElementById('diffOverlay');
    return !!ov && ov.style.display === 'flex';
  }, { timeout: 60000 });

  /* ★畳んだ ままの 姿を 測る★（★触る 前★） */
  const 畳んだ時 = await page.evaluate(() => {
    const 高 = (el) => (el ? Math.round(el.getBoundingClientRect().height) : -1);
    const bun = document.getElementById('diffBun');
    const d = document.querySelector('#diffBody details.diffKuwashiku');
    const sm = d && d.querySelector('summary');
    const 中 = d ? Array.prototype.filter.call(d.children, (x) => x.tagName !== 'SUMMARY') : [];
    return {
      文: bun ? bun.textContent : '(diffBun が 無い)',
      文の高さ: 高(bun),
      畳みが在る: !!d,
      open: d ? d.open : null,
      summaryの高さ: 高(sm),
      中の数: 中.length,
      中の高さ: 中.reduce((a, x) => a + 高(x), 0),
      本文の字: (document.getElementById('diffBody') || {}).textContent || '',
    };
  });
  console.log('      ── 実測 ── 文「' + 畳んだ時.文 + '」／ 文の高さ ' + 畳んだ時.文の高さ
    + 'px ／ 畳み open=' + 畳んだ時.open + ' summary ' + 畳んだ時.summaryの高さ
    + 'px ／ 中 ' + 畳んだ時.中の数 + '個 合計 ' + 畳んだ時.中の高さ + 'px');

  T('★1文が 画面に 出ている★（字が 在る＋高さが 0でない）',
    畳んだ時.文の高さ > 0 && /を .* から .* に しました|変える所はありません|あなたが 直した所/.test(畳んだ時.文),
    '高さ ' + 畳んだ時.文の高さ + 'px ／ 字「' + 畳んだ時.文 + '」');

  T('★1文に マスと 前後の 値が 入って いる★（実Excel で 突き合わせられる 形）',
    /![A-Z]+\d+ を .+ から .+ に しました/.test(畳んだ時.文), 畳んだ時.文);

  T('詳しくは ドロップダウンに 入って いる（`<details>` が 在る・閉じて いる）',
    畳んだ時.畳みが在る && 畳んだ時.open === false,
    '在る=' + 畳んだ時.畳みが在る + ' open=' + 畳んだ時.open);

  T('★畳みの 見出しは 見えて いる★（押せないと 開けない）',
    畳んだ時.summaryの高さ > 0, 'summary ' + 畳んだ時.summaryの高さ + 'px');

  T('★★畳んだ 中身は 高さ 0★★（★印(open)では なく 絵で 数える★・2026-09-08 の 穴）',
    畳んだ時.中の数 > 0 && 畳んだ時.中の高さ === 0,
    '中 ' + 畳んだ時.中の数 + '個 合計 ' + 畳んだ時.中の高さ + 'px');

  /* ★開けたら 出る★（畳んだ ままで 中身が 死んで いないか） */
  const 開けた時 = await page.evaluate(() => {
    const d = document.querySelector('#diffBody details.diffKuwashiku');
    d.querySelector('summary').click();
    const 中 = Array.prototype.filter.call(d.children, (x) => x.tagName !== 'SUMMARY');
    return {
      open: d.open,
      中の高さ: 中.reduce((a, x) => a + Math.round(x.getBoundingClientRect().height), 0),
      字: d.textContent,
    };
  });
  console.log('      ── 実測 ── 開けたら open=' + 開けた時.open + ' 中 ' + 開けた時.中の高さ + 'px');
  T('★開けたら 1マスずつ 出る★（高さが 0でない・番地が 在る）',
    開けた時.open === true && 開けた時.中の高さ > 0 && /[A-Z]+\d+/.test(開けた時.字),
    'open=' + 開けた時.open + ' 中 ' + 開けた時.中の高さ + 'px');

  /* ★[やめる] を 押す★＝★1本も 書き出さない★ */
  await page.evaluate(() => { document.getElementById('diffCancel').click(); });
  await page.evaluate(() => window.__保存);
  const 窓が閉じた = await page.evaluate(() =>
    document.getElementById('diffOverlay').style.display !== 'flex');
  T('[やめる] で 窓が 閉じる（★1本も 書き出さない★）', 窓が閉じた);
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  配信.閉じる();
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
