/* hakaru-jitsubutsu-ga-hiraku-ka.mjs
 *   -- ★司さんの 実物が お客さんの 道で 開くか★（105）（2026-09-24）
 *
 *  ★★なぜ★★
 *    `hakaru-hozon-no-mado-no-hayasa.mjs` で 実物を 渡したら
 *    ★5分 待っても `window.sheets` に 中身が 入りませんでした★。
 *    ⇒★「遅い」のか 「落ちて いる」のか 分かりません★
 *    ⇒★分けずに 「遅い」と 書いたら 嘘に なります★
 *
 *  ★★この 道具が する 事★★
 *    ・言づて（console）と 落ち（pageerror）と 取れなかった 物を ★全部 拾う★
 *    ・★10秒ごとに 「今 どこまで 来たか」★を 出す（板の 数・マスの 数）
 *    ・★落ちたら その 字を そのまま 出す★
 *
 *  ★★出さない 物★★
 *    ★マスの 値／シートの 名／式の 字は 1つも 出しません★
 *    ＝出すのは ★数と 時間と 落ちの 字★だけ
 *
 *  ★★1バイトも 書きません★★
 *    `FileOut.deliver` を ★断る 物★に 替えてから 渡します（窓は 出しません）
 *
 *  使い方: node docs/measured/hakaru-jitsubutsu-ga-hiraku-ka.mjs "<xlsb への 道>" [--秒 300]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { borrow, launch } from '../../scripts/_borrow-playwright.mjs';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..', '..');
const 材料 = process.argv[2];
const 秒 = process.argv.includes('--秒') ? Number(process.argv[process.argv.indexOf('--秒') + 1]) : 300;
if (!材料 || !fs.existsSync(材料)) { console.log('★材料が 在りません★ ... ' + 材料); process.exit(3); }
const 中 = fs.readFileSync(材料);
console.log('★材料★ ' + path.basename(材料) + '（' + 中.length.toLocaleString() + ' バイト）');
console.log('  sha256 ' + crypto.createHash('sha256').update(中).digest('hex'));
console.log('★待つ★ ' + 秒 + '秒 ／ ★1バイトも 書きません★');

const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, u === '/' ? 'book.html' : u.replace(/^\//, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 型[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const もと = 'http://127.0.0.1:' + server.address().port;

const wk = await borrow('jitsubutsu-hiraku', 'webkit');
const browser = await launch('jitsubutsu-hiraku', wk, {}, 'webkit');
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const 言づて = [], 落ち = [], 取れず = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') 言づて.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => 落ち.push(String((e && e.message) || e).slice(0, 400)));
page.on('requestfailed', (r) => 取れず.push(r.url().replace(もと, '') + ' ... ' + (r.failure() || {}).errorText));

await page.goto(もと + '/book.html', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => {
  document.body.classList.remove('exally-locked');
  const ov = document.getElementById('loginOv');
  if (ov) { ov.classList.remove('open'); ov.style.display = 'none'; }
  window.FileOut = { deliver: () => Promise.reject(new Error('★書き出しては いけません★')) };
  window.__t0 = performance.now();
});
console.log('');
console.log('★渡します★（`#bookFileInput`＝画面の「読み込む」と 同じ 口）');
await page.setInputFiles('#bookFileInput', 材料);

let 開いた = false;
const 刻み = [];
for (let t = 0; t < 秒; t += 10) {
  await new Promise((r) => setTimeout(r, 10000));
  const い = await page.evaluate(() => {
    const ss = window.sheets || [];
    let マス = 0;
    ss.forEach((sh) => { マス += Object.keys((sh && sh.data) || {}).length; });
    return { 板: ss.length, マス: マス, 秒: performance.now() - window.__t0 };
  }).catch((e) => ({ だめ: String(e.message).slice(0, 200) }));
  if (い.だめ) { console.log('  ' + (t + 10) + '秒 ... ★窓に 訊けません★ ' + い.だめ); break; }
  刻み.push(い);
  console.log('  ' + (t + 10) + '秒 ... 板 ' + い.板 + '枚 ／ マス ' + い.マス.toLocaleString()
    + (落ち.length ? ' ／ ★落ち ' + 落ち.length + '件★' : ''));
  if (い.マス > 0) { 開いた = true; console.log('  ⇒★開きました（' + Math.round(い.秒) + ' ms）★'); break; }
}

console.log('');
console.log('★★答え★★ ... ' + (開いた ? '★開きました★' : '★' + 秒 + '秒 経っても 開きません★'));
console.log('★落ち（pageerror）★ ' + 落ち.length + '件');
落ち.slice(0, 5).forEach((x) => console.log('   ' + x));
console.log('★言づての 赤・黄★ ' + 言づて.length + '件');
言づて.slice(0, 8).forEach((x) => console.log('   ' + x));
console.log('★取れなかった 物★ ' + 取れず.length + '件');
取れず.slice(0, 5).forEach((x) => console.log('   ' + x));

const 絵 = path.join(os.tmpdir(), 'exally-jitsubutsu-hiraku.png');
await page.screenshot({ path: 絵, fullPage: false });
console.log('★絵★ ' + 絵 + '（' + fs.statSync(絵).size + 'B）');

await browser.close();
server.close();
process.exit(開いた ? 0 : 1);
