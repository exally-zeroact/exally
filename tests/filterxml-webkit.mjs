/* filterxml-webkit.mjs — ★本物の ブラウザで 実Excel の 29通りを 全部 見る★ 2026-09-04
 *
 *  ★なぜ 要るか（一番 大事）★
 *    ★試験の 台（jsdom）の XPath は 本物の ブラウザと 違う★（2026-09-04 実測）
 *      ・大文字小文字を 区別しない（//A と //a が 同じに なる）
 *      ・local-name() が 使えない
 *    ⇒ node の 試験では ★3通り 未測定★に なる。
 *    ⇒★お客さんが 使うのは 本物の ブラウザ★＝★ここが 本当の 答え★。
 *    ⇒★ここで 29通り 全部 見る★＝★未測定を 0 に する★
 *
 *  ★外に 出ないか★＝★計算の 間の 通信を 数えて 0本★（指示役の 注文）
 *
 *  走らせ方: node tests/filterxml-webkit.mjs
 */
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { borrow, launch } from '../scripts/_borrow-playwright.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/filterxml-golden.json'), 'utf8'));
let pass = 0, fail = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};
function 立てる(root) {
  const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.svg': 'image/svg+xml' };
  const s = http.createServer((q, r) => {
    const f = path.join(root, decodeURIComponent(String(q.url).split('?')[0]).replace(/^\/+/, ''));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('no'); }
    r.setHeader('content-type', 型[path.extname(f).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((x) => s.listen(0, '127.0.0.1', () => x({ url: 'http://127.0.0.1:' + s.address().port, 閉じる: () => s.close() })));
}

console.log('');
console.log('[filterxml-webkit] ★本物の ブラウザで 実Excel の 29通りを 見る★');

const wk = await borrow('filterxml', 'webkit');
const browser = await launch('filterxml', wk, {}, 'webkit');
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const 配信 = await 立てる(ROOT);
try {
  /* ★実配信は 落ちてくる 物が 多い★＝load で 待つと 時間切れ（2026-09-04 実測）
     ⇒ domcontentloaded で 進めて ★出るまで 待つ★ */
  await page.goto(配信.url + '/book.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.FilterXml === 'object'
    && typeof window.HyperFormula === 'function', { timeout: 60000 });
  T('★画面が lib/filterxml.js を 読み込んでいる★',
    await page.evaluate(() => typeof window.FilterXml === 'object' && !!window.FilterXml.取り出す));

  /* ★ここから 通信を 数える★（画面その物の 読み込みは 数えない） */
  const 通信 = [];
  page.on('request', (r) => 通信.push(r.method() + ' ' + r.url().slice(0, 90)));
  await page.waitForTimeout(400);
  通信.length = 0;

  const 結果 = await page.evaluate((本) => {
    const F = window.FilterXml;
    return 本.map((x) => {
      const r = F.取り出す(x.xml, x.xpath, window);
      let 出;
      if (r && r.誤り) 出 = ['#VALUE!'];
      else {
        出 = r.map((row) => {
          const v = row[0];
          if (v && v.誤り) return '#VALUE!';
          if (v === true) return 'TRUE';
          if (v === false) return 'FALSE';
          return String(v);
        });
      }
      return { な: x.な, 出: 出, 期待: x.答.map((y) => String(y.text)) };
    });
  }, G.本);
  await page.waitForTimeout(800);        /* ★遅れて 出る 通信も 拾う★ */

  const ちがい = 結果.filter((x) => JSON.stringify(x.出) !== JSON.stringify(x.期待));
  T('★★実Excel の ' + 結果.length + '通りと 1つ残らず 同じ★★', ちがい.length === 0,
    ちがい.slice(0, 5).map((x) => x.な + ' … Excel ' + JSON.stringify(x.期待)
      + '／うち ' + JSON.stringify(x.出)).join('\n       '));
  console.log('       … 見た 総数 ' + 結果.length + '通り ／ ★合った '
    + (結果.length - ちがい.length) + '通り★（★node で 未測定だった 3通りも ここで 見ている★）');

  /* ★node で 測れなかった 3通りを 名指しで 確かめる★ */
  const 大事 = ['大文字小文字（A）', '大文字小文字（a）', '名前空間（ローカル名）'];
  const 見た = 大事.filter((n) => 結果.some((x) => x.な === n
    && JSON.stringify(x.出) === JSON.stringify(x.期待)));
  T('★node で 未測定だった 3通りが ここで 緑★', 見た.length === 大事.length,
    '見た … ' + 見た.join(' / '));

  T('★★計算の 間の 通信が 0本★★', 通信.length === 0,
    '出た 通信 … ' + 通信.slice(0, 5).join(' / '));
  console.log('       … ★数えた 通信 ' + 通信.length + '本★（計算 ' + 結果.length + '回 の 間）');

  /* ★エンジンに 通して こぼれるか★（縦1列で 返る） */
  const こぼれ = await page.evaluate(() => {
    const HF = window.HyperFormula;
    const hf = HF.buildFromArray([
      ['<r><a>1</a><a>2</a><a>3</a></r>', '//a', '=FILTERXML(A1,B1)'],
    ], { licenseKey: 'gpl-v3' });
    return [0, 1, 2].map((r) => {
      const v = hf.getCellValue({ sheet: 0, col: 2, row: r });
      return (v && v.value !== undefined) ? v.value : v;
    });
  });
  T('★エンジンで 縦1列に こぼれる（1／2／3）★',
    JSON.stringify(こぼれ) === JSON.stringify([1, 2, 3]), JSON.stringify(こぼれ));
} finally {
  配信.閉じる();
  await browser.close();
}

console.log('');
console.log('filterxml-webkit: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
