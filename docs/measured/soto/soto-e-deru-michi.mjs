/* soto-e-deru-michi.mjs — ★外へ 出る 関数を 入れると 何が 起きるかを 実物で 測る★（2026-09-07）
 *
 *  ★★なぜ 測るか★★
 *    指示役の 問い … 「★セルの 中身を 外へ 送れるか★を はい／いいえ で」
 *    ⇒ 私の 頭の 中の 理屈では なく ★本物の Chrome で 撃って 相手が 受け取ったかを 数える★
 *
 *  ★★測り方★★
 *    ①「うちの 画面」役の サーバ … 127.0.0.1:8801
 *    ②「外の 相手」役の サーバ  … 127.0.0.1:8802 ★受け取った 物を 全部 記録する★
 *       ⇒ 番号が 違う＝★別の 出どころ★＝ブラウザから 見れば 外の 会社と 同じ 扱い
 *    ③本物の Chrome で ①を 開き、②へ ★4通りの 撃ち方★で 秘密の 字を 送る
 *    ④★②の 記録に その 字が 在るか★を 数える
 *
 *  ★★物差しが 効いている 事の 確かめ★★
 *    ・★撃たなかった 弾★（/never）… ②の 記録に 出たら ★物差しが 壊れている★
 *    ・★読める 場合★（/cors-ok）… 画面が 中身を 読めたら ★撃てている 事の 裏付け★
 *
 *  ★外へは 1回も 出ません★（127.0.0.1 だけ／お金 0円）
 *
 *  使い方: node docs/measured/soto/soto-e-deru-michi.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const 秘密 = 'HIMITSU-' + Date.now().toString(36).toUpperCase();

/* ── ②「外の 相手」役 ── */
const 受けた = [];
const 外 = http.createServer((req, res) => {
  受けた.push({ 道: req.url, やり方: req.method, 時: Date.now() });
  /* ★/cors-ok だけ「読んでよい」と 返す★＝それ以外は 返事を 読ませない */
  if (req.url.startsWith('/cors-ok')) res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('うけとった');
});

/* ── ①「うちの 画面」役 ── */
const 報告 = [];
const 画面 = `<!doctype html><meta charset="utf-8"><title>測り</title><body>
<script>
var 相手 = 'http://127.0.0.1:8802';
var 秘密 = ${JSON.stringify(秘密)};
var 出 = [];
function 記す(名, 結) { 出.push({ 名: 名, 結: 結 }); }
function 終い() {
  fetch('/report', { method: 'POST', body: JSON.stringify(出) });
}
（async function () {
  /* ①ふつうの fetch（相手が 許していない）＝WEBSERVICE と 同じ 撃ち方 */
  try {
    var r1 = await fetch(相手 + '/fetch-no-cors?d=' + 秘密);
    記す('fetch(許し なし)', '読めた：' + (await r1.text()));
  } catch (e) { 記す('fetch(許し なし)', '読めなかった：' + e.name); }

  /* ②相手が 許している 場合（物差しの 裏付け） */
  try {
    var r2 = await fetch(相手 + '/cors-ok?d=' + 秘密);
    記す('fetch(許し あり)', '読めた：' + (await r2.text()));
  } catch (e) { 記す('fetch(許し あり)', '読めなかった：' + e.name); }

  /* ③no-cors で 送りつける（返事は 元から 読まない） */
  try {
    await fetch(相手 + '/nocors-post?d=' + 秘密, { method: 'POST', mode: 'no-cors', body: 秘密 });
    記す('fetch(no-cors で 送る)', '例外 なし');
  } catch (e) { 記す('fetch(no-cors で 送る)', '例外：' + e.name); }

  /* ④絵として 撃つ＝IMAGE と 同じ 撃ち方 */
  await new Promise(function (ok) {
    var im = new Image();
    im.onload = function () { 記す('絵として 撃つ', 'onload'); ok(); };
    im.onerror = function () { 記す('絵として 撃つ', 'onerror（絵では ない ので 当然）'); ok(); };
    im.src = 相手 + '/img?d=' + 秘密;
    setTimeout(ok, 2000);
  });

  /* ★/never は 1回も 撃たない★ */
  終い();
})();
</script></body>`.replace('（async', '(async');

const うち = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/report') {
    let b = ''; req.on('data', (c) => { b += c; });
    req.on('end', () => { try { 報告.push(...JSON.parse(b)); } catch (e) { 報告.push({ 名: '読めない報告', 結: b }); } res.end('ok'); });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(画面);
});

await new Promise((ok) => 外.listen(8802, '127.0.0.1', ok));
await new Promise((ok) => うち.listen(8801, '127.0.0.1', ok));

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(CHROME)) { console.log('★Chrome が 見つからない … ' + CHROME); process.exit(1); }
const 仮 = fs.mkdtempSync(path.join(os.tmpdir(), 'soto-'));
const ch = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + 仮, '--virtual-time-budget=9000',
  '--dump-dom', 'http://127.0.0.1:8801/',
], { stdio: ['ignore', 'ignore', 'ignore'] });
await new Promise((ok) => { ch.on('exit', ok); setTimeout(() => { try { ch.kill(); } catch (e) { /* もう 死んでいる */ } ok(); }, 25000); });
await new Promise((ok) => setTimeout(ok, 600));

外.close(); うち.close();

/* ── 数える ── */
const 行 = [];
const 出す = (s) => { 行.push(s); console.log(s); };

出す('# ★外へ 出る 道が 在るかの 実測★（' + new Date().toISOString().slice(0, 10) + '）');
出す('');
出す('★本物の Chrome ' + 'headless=new' + '／外へは 1回も 出ていない（127.0.0.1 だけ）★');
出す('★秘密の 字 … ' + 秘密 + '★');
出す('');
出す('## ★相手（外の 会社 役）が 受け取った 物★');
出す('');
if (!受けた.length) 出す('  ★1本も 届いていない★');
for (const x of 受けた) 出す('  ' + x.やり方 + ' ' + x.道 + '  … ★秘密が 入っている … ' + (x.道.indexOf(秘密) >= 0 ? 'はい' : 'いいえ') + '★');
出す('');
出す('## ★画面の 側から 見えた 事★');
出す('');
for (const x of 報告) 出す('  ' + x.名 + ' … ' + x.結);
出す('');

const 届いた = 受けた.filter((x) => x.道.indexOf(秘密) >= 0).length;
const 撃たなかった弾 = 受けた.filter((x) => x.道.startsWith('/never')).length;
const 読めた = 報告.filter((x) => String(x.結).startsWith('読めた')).map((x) => x.名);

出す('## ★数★');
出す('');
出す('  ★秘密が 相手に 届いた 回数 … ' + 届いた + '回★');
出す('  ★画面が 返事を 読めた 撃ち方 … ' + (読めた.length ? 読めた.join(' / ') : 'なし') + '★');
出す('  ★撃たなかった 弾が 記録に 出た … ' + 撃たなかった弾 + '本（0 でなければ 物差しが 壊れている）★');
出す('');
出す('## ★答え★');
出す('');
出す('  ★セルの 中身を 外へ 送れるか … ' + (届いた > 0 ? '★はい★' : 'いいえ') + '★');
出す('  ★相手の 返事を 読めるか … ' + (読めた.length > 1 ? 'いつでも' : '★相手が 許した 時だけ★') + '★');
出す('  ⇒ ★送るのと 読むのは 別★＝相手が 許していなくても ★送る 方は 通る★');

fs.writeFileSync(path.join(ここ, 'soto-e-deru-michi.txt'), 行.join('\n') + '\n', { encoding: 'utf-8' });
console.log('\n★書いた … docs/measured/soto/soto-e-deru-michi.txt★');
if (撃たなかった弾) { console.log('★物差しが 壊れている★'); process.exit(1); }
