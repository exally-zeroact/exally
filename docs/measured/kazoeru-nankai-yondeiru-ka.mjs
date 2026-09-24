/* kazoeru-nankai-yondeiru-ka.mjs
 *   -- ★重い 2本が ★何回★ 呼ばれるかを 数える★（115）（2026-09-25）
 *
 *  ★★なぜ★★
 *    CPU の 記録（114）で ★87.4% が `lib/shiki-hyou.js`★ と 出ました。
 *      `名から番地` 34.5% ／ `読む` 19.7%
 *    ★但し 割合では 「直せる 形か」が 分かりません★
 *      ・★マスの 数だけ 呼ぶ（N）★なら ★1回を 速くする★話
 *      ・★マスの 2乗（N²）★なら ★呼ぶ 回数を 減らす★話
 *    ⇒★数えます★
 *
 *  ★★やり方（★repo は 1バイトも 触りません★）★★
 *    ★配る 時だけ★ `lib/shiki-hyou.js` の 字に 数取りを 1行 挟みます。
 *    ★挟む 相手は 2本とも ファイルに 1つずつ しか 在りません★（機械で 確かめます・exit 4）
 *    ⇒★手で 書き換えた 物では ありません＝この 道具が 毎回 同じ 事を します★
 *
 *  ★★出さない 物★★ ... ★マスの 値／シートの 名／式の 字★
 *
 *  使い方: node docs/measured/kazoeru-nankai-yondeiru-ka.mjs "<xlsb>" [--秒 300]
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

/* ── ★数取りを 挟む★（★1つずつ しか 無い 事を 先に 確かめます★） ── */
const 表の道 = path.join(ROOT, 'lib', 'shiki-hyou.js');
const 元字 = fs.readFileSync(表の道, 'utf8');
/* ★★別々の 字が 何種類 在るか★★（2026-09-25・追記）
     ★なぜ 要るか★
       `名から番地` が 1億4千万回 呼ばれて いました。
       ★但し それだけでは 直し方が 決まりません★
         ・★別々の 字が 少ない★なら ⇒★覚えて おくだけ★で 1億4千万 → その 種類数
         ・★別々の 字が 多い★なら   ⇒★覚えても 効きません★＝★呼ぶ 回数を 減らす★話
     ★数え方★ ... 束（Set）に 入れて 大きさを 見ます
     ★但し★ ... ★束に 入れる 事 自体が 遅く なります★
                 ＝★この 回の 秒数を 「速さ」の 数に 使っては いけません★ */
const 種類 = [
  { 名: '名から番地', 印: 'function 名から番地(名) {', 引: '名' },
];
const 挟む = [
  { 名: '名から番地', 印: 'function 名から番地(名) {' },
  { 名: '読む',       印: 'function 読む(名, 通り道) {' },
  { 名: '揃える',     印: 'function 揃える(' },
  { 名: '番地から名', 印: 'function 番地から名(行, 列, 板) {' },
];
let 表の字 = 元字;
for (const x of 種類) {
  const c = 元字.split(x.印).length - 1;
  if (c !== 1) { console.log('★★1つで は ありません＝挟みません★★'); process.exit(4); }
  const i = 表の字.indexOf(x.印);
  const j = 表の字.indexOf('{', i + x.印.length - 1);
  表の字 = 表の字.slice(0, j + 1)
    + 'try{self.__種=self.__種||{};(self.__種["' + x.名 + '"]=self.__種["' + x.名 + '"]||new Set()).add(String(' + x.引 + '));}catch(e){}'
    + 表の字.slice(j + 1);
}
for (const x of 挟む) {
  const c = 元字.split(x.印).length - 1;
  console.log('★挟む 相手★ ' + x.名.padEnd(6) + ' ... ファイルに ' + c + '個');
  if (c !== 1) { console.log('★★1つで は ありません＝挟みません★★'); process.exit(4); }
  const i = 表の字.indexOf(x.印);
  const j = 表の字.indexOf('{', i + x.印.length - 1);
  表の字 = 表の字.slice(0, j + 1)
    + 'try{self.__数=self.__数||{};self.__数["' + x.名 + '"]=(self.__数["' + x.名 + '"]||0)+1;}catch(e){}'
    + 表の字.slice(j + 1);
}
console.log('★挟みました★ ' + 元字.length.toLocaleString() + ' → ' + 表の字.length.toLocaleString() + ' バイト');
console.log('  ★repo の ファイルは 触って いません★ sha256 '
  + crypto.createHash('sha256').update(fs.readFileSync(表の道)).digest('hex').slice(0, 16));

const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, u === '/' ? 'book.html' : u.replace(/^\//, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  if (p === 表の道) {
    res.writeHead(200, { 'Content-Type': 型['.js'] });
    res.end(表の字);
    return;
  }
  res.writeHead(200, { 'Content-Type': 型[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const もと = 'http://127.0.0.1:' + server.address().port;

const ck = await borrow('nankai-yonderu', 'chromium');
const browser = await launch('nankai-yonderu', ck, {}, 'chromium');
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(もと + '/book.html', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => {
  document.body.classList.remove('exally-locked');
  const ov = document.getElementById('loginOv');
  if (ov) { ov.classList.remove('open'); ov.style.display = 'none'; }
  window.FileOut = { deliver: () => Promise.reject(new Error('★書き出しては いけません★')) };
});

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
const 出 = await page.evaluate(() => {
  const ss = window.sheets || [];
  let マス = 0, 式 = 0;
  ss.forEach((sh) => {
    const d = (sh && sh.data) || {};
    Object.keys(d).forEach((k) => { マス++; const v = d[k]; if (v && typeof v === 'object' && v.f) 式++; });
  });
  const 種 = {};
  Object.keys(self.__種 || {}).forEach((k) => { 種[k] = self.__種[k].size; });
  return { 数: self.__数 || {}, 種: 種, 板: ss.length, マス: マス, 式: 式 };
});
console.log('');
console.log('★★開くまで★★ ' + (開いた ? 開いた.toLocaleString() + ' ms' : '★開きません★'));
console.log('★★本の 大きさ★★ 板 ' + 出.板 + '枚 ／ マス ' + 出.マス.toLocaleString() + '個 ／ 式 ' + 出.式.toLocaleString() + '個');
console.log('');
console.log('★★何回 呼ばれたか★★');
const 式数 = 出.式 || 1;
const マス数 = 出.マス || 1;
Object.keys(出.数).sort((a, b) => 出.数[b] - 出.数[a]).forEach((k) => {
  const n = 出.数[k];
  console.log('  ' + k.padEnd(7) + ' ' + String(n.toLocaleString()).padStart(13) + ' 回'
    + '   （★式 1個 あたり ' + (n / 式数).toFixed(1) + '回★ ／ マス 1個 あたり ' + (n / マス数).toFixed(1) + '回）');
});
console.log('');
console.log('★★別々の 字は 何種類 在ったか★★（★覚えて おけば 効くか★）');
Object.keys(出.種).forEach((k) => {
  const 種 = 出.種[k], 回 = 出.数[k] || 0;
  console.log('  ' + k.padEnd(7) + ' ★' + 種.toLocaleString() + ' 種類★   （'
    + 回.toLocaleString() + ' 回 ÷ ' + 種.toLocaleString() + ' 種類 ＝ ★同じ 字を '
    + (回 / (種 || 1)).toFixed(0) + ' 回 読み直して います★）');
});
console.log('');
console.log('★★2乗か どうか★★（★マス数 ' + 出.マス.toLocaleString() + ' の 2乗 ＝ '
  + (出.マス * 出.マス).toLocaleString() + '★）');

await browser.close();
server.close();
