/* encodeurl-webkit.mjs — ★ENCODEURL が 外に 出ない事を 通信を 数えて 示す★ 2026-09-04
 *
 *  ★指示役の 注文（2026-09-04）★
 *    「★外に 出ないか は『思う』では なく ★通信を 見て 0本★と 出す★
 *      （実ブラウザで 押して、その 間の 通信が 0本）」
 *
 *  ★やり方★
 *    ①画面を 開く（ここまでの 通信は 数えない＝画面その物の 読み込み）
 *    ②★数え始める★
 *    ③ENCODEURL を ★何度も★ 計算させる（日本語・記号・URL まるごと・長い字）
 *    ④★その 間に 出た 通信を 数える★ ⇒ ★0本★なら 外に 出ていない
 *    ⑤★答えが 実Excel と 同じか も 一緒に 見る★
 *       （★秒や 本数だけ 出さない＝最後まで 行った 証拠を 並べる★）
 *
 *  ★ついでに 見る★ … ★WEBSERVICE・RTD は まだ 無い★（＝#NAME? に なる）
 *    これは「出来ない」ではなく ★司さんの 決め待ち★（外へ 出る＝危なさの 判断が 要る）
 *
 *  走らせ方: node tests/encodeurl-webkit.mjs
 */
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { borrow, launch } from '../scripts/_borrow-playwright.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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
console.log('[encodeurl-webkit] ★外に 出ないかを 通信を 数えて 見る★');

const wk = await borrow('encodeurl', 'webkit');
const browser = await launch('encodeurl', wk, {}, 'webkit');
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const 配信 = await 立てる(ROOT);
try {
  /* ★実配信は 落ちてくる 物が 多い★＝load で 待つと 時間切れに なる（2026-09-04 実測）
     ⇒ domcontentloaded で 進めて ★出るまで 待つ★ */
  await page.goto(配信.url + '/book.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.EncodeUrl === 'object'
    && typeof window.HyperFormula === 'function', { timeout: 60000 });
  T('★画面が lib/encodeurl.js を 読み込んでいる★',
    await page.evaluate(() => typeof window.EncodeUrl === 'object' && !!window.EncodeUrl.直す));

  /* ★ここから 数える★（画面その物の 読み込みは 数えない） */
  const 通信 = [];
  page.on('request', (r) => 通信.push(r.method() + ' ' + r.url().slice(0, 90)));
  await page.waitForTimeout(500);
  通信.length = 0;                       /* ★数え始め★ */

  const 出 = await page.evaluate(() => {
    const 組 = [
      ['a b', 'a%20b'],
      ['あいう', '%E3%81%82%E3%81%84%E3%81%86'],
      ['a&b=c?d/e#f', 'a%26b%3Dc%3Fd%2Fe%23f'],
      ['https://example.com/a b?x=1&y=2', 'https%3A%2F%2Fexample.com%2Fa%20b%3Fx%3D1%26y%3D2'],
      ['a~b', 'a%7Eb'],
      ['x'.repeat(200), 'x'.repeat(200)],
    ];
    const HF = window.HyperFormula;
    const 答 = [];
    for (const [v, e] of 組) {
      const hf = HF.buildFromArray([[v, '=ENCODEURL(A1)']], { licenseKey: 'gpl-v3' });
      const g = hf.getCellValue({ sheet: 0, col: 1, row: 0 });
      const s = (g && g.value !== undefined) ? g.value : String(g);
      答.push({ 入: String(v).slice(0, 40), 出: String(s).slice(0, 60), 合う: s === e });
    }
    /* ★まだ 無い 物も 一緒に 見る（出来ていない物を 出来ていると 言わない）★ */
    const hf2 = HF.buildFromArray([['=WEBSERVICE("http://example.com")'], ['=RTD("a","b","c")']],
      { licenseKey: 'gpl-v3' });
    const まだ = [0, 1].map((r) => {
      const g = hf2.getCellValue({ sheet: 0, col: 0, row: r });
      return (g && g.value !== undefined) ? g.value : String(g);
    });
    return { 答: 答, まだ: まだ };
  });
  await page.waitForTimeout(1000);        /* ★遅れて 出る 通信も 拾う★ */

  const 合 = 出.答.filter((x) => x.合う).length;
  T('★実Excel と 同じ 答えが 出た（' + 合 + ' / ' + 出.答.length + '）★', 合 === 出.答.length,
    出.答.filter((x) => !x.合う).map((x) => x.入 + ' → ' + x.出).join(' / '));
  console.log('       … 見た 総数 ' + 出.答.length + '通り ／ ★合った ' + 合 + '通り★');

  T('★★計算の 間の 通信が 0本★★', 通信.length === 0,
    '出た 通信 … ' + 通信.slice(0, 5).join(' / '));
  console.log('       … ★数えた 通信 ' + 通信.length + '本★（計算 ' + 出.答.length + '回 の 間）');

  T('★WEBSERVICE・RTD は まだ 無い（#NAME?）＝出来たと 言わない★',
    出.まだ.every((x) => String(x).indexOf('#NAME') >= 0), JSON.stringify(出.まだ));
} finally {
  配信.閉じる();
  await browser.close();
}

console.log('');
console.log('encodeurl-webkit: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
