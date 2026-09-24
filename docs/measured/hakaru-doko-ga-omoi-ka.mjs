/* hakaru-doko-ga-omoi-ka.mjs
 *   -- ★111秒 固まって いる ── ★どの 関数か★★（114）（2026-09-25）
 *
 *  ★★なぜ この やり方に したか★★
 *    ★外から 1秒ごとに 観る★ やり方では ★何も 分かりませんでした★
 *    ＝節目 14個が ★全部 同じ 時刻（111,177 ms）★に 着きました
 *    ＝★私の 問い合わせ自体が 1回も 動けて いない★
 *    ＝★画面が 111秒 ずっと 1本の 処理で 塞がって います★（★細かい 段では ない★）
 *    ⇒★外から 観る 道は 塞がって います★
 *    ⇒★中で 誰が 使って いるかを 記録させます★（CPU の 記録）
 *
 *  ★★chromium を 使います★★
 *    ＝★記録の 口（CDP）は chromium に しか 在りません★
 *    ＝★webkit と 時間が 違うかも しれません★＝★それも 一緒に 出します★
 *    ＝★見たいのは 「どこが 重いか」★で ★秒数そのものでは ありません★
 *
 *  ★★出さない 物★★ ... ★マスの 値／シートの 名／式の 字★
 *  ★★1バイトも 書きません★★
 *
 *  使い方: node docs/measured/hakaru-doko-ga-omoi-ka.mjs "<xlsb>" [--秒 300]
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { borrow, launch } from '../../scripts/_borrow-playwright.mjs';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..', '..');
const 材料 = process.argv[2];
const 秒 = process.argv.includes('--秒') ? Number(process.argv[process.argv.indexOf('--秒') + 1]) : 300;
if (!材料 || !fs.existsSync(材料)) { console.log('★材料が 在りません★'); process.exit(3); }
const 中 = fs.readFileSync(材料);
console.log('★材料★ ' + path.basename(材料) + '（' + 中.length.toLocaleString() + ' バイト）');
console.log('  sha256 ' + crypto.createHash('sha256').update(中).digest('hex'));

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

const ck = await borrow('doko-ga-omoi', 'chromium');
const browser = await launch('doko-ga-omoi', ck, {}, 'chromium');
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(もと + '/book.html', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => {
  document.body.classList.remove('exally-locked');
  const ov = document.getElementById('loginOv');
  if (ov) { ov.classList.remove('open'); ov.style.display = 'none'; }
  window.FileOut = { deliver: () => Promise.reject(new Error('★書き出しては いけません★')) };
});

const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 2000 });   /* 2ms ごと */
await cdp.send('Profiler.start');
console.log('★記録を 始めました★（CPU）');

const t0 = Date.now();
await page.setInputFiles('#bookFileInput', 材料);
let 開いた = 0;
for (let t = 0; t < 秒; t += 2) {
  await new Promise((r) => setTimeout(r, 2000));
  const い = await page.evaluate(() => {
    const ss = window.sheets || [];
    let m = 0; ss.forEach((sh) => { m += Object.keys((sh && sh.data) || {}).length; });
    return m;
  }).catch(() => -1);
  if (い > 0) { 開いた = Date.now() - t0; break; }
}
const { profile } = await cdp.send('Profiler.stop');
console.log('★★開くまで★★ ' + (開いた ? 開いた + ' ms' : '★開きません★'));

/* ── ★誰が 使ったかを 数えます★ ── */
const ふし = new Map();
profile.nodes.forEach((n) => ふし.set(n.id, n));
const 自分 = new Map();
(profile.samples || []).forEach((id) => 自分.set(id, (自分.get(id) || 0) + 1));
const 全 = (profile.samples || []).length || 1;
const 並 = [...自分.entries()].map(([id, n]) => {
  const x = ふし.get(id) || {};
  const f = x.callFrame || {};
  const 元 = String(f.url || '').replace(もと, '').replace(/^\//, '') || '(中)';
  return { 名: (f.functionName || '(名なし)') + ' @ ' + 元 + ':' + (f.lineNumber + 1), 数: n };
}).sort((a, b) => b.数 - a.数);

console.log('');
console.log('★★時間を 使って いる 所（多い 順・上から 15）★★');
console.log('  ' + '割合'.padEnd(8) + '所');
並.slice(0, 15).forEach((x) => {
  console.log('  ' + (x.数 / 全 * 100).toFixed(1).padStart(5) + '%   ' + x.名);
});
/* ★ファイル別にも まとめます★ */
const 本ごと = new Map();
並.forEach((x) => {
  const f = x.名.split(' @ ')[1].split(':')[0];
  本ごと.set(f, (本ごと.get(f) || 0) + x.数);
});
console.log('');
console.log('★★ファイル別★★');
[...本ごと.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([f, n]) => {
  console.log('  ' + (n / 全 * 100).toFixed(1).padStart(5) + '%   ' + f);
});

await browser.close();
server.close();
