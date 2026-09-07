/* csp-ireta-ra-nani-ga-tomaru.mjs — ★CSP を 入れたら 何が 止まるかを 実物で 測る★（2026-09-07）
 *
 *  ★★本番には 入れません★★（指示役の 注文＝「入れないで ください／一覧だけ」）
 *    ⇒ ここでは ★手元に 同じ 画面を 立てて、そこにだけ CSP を 付けて 数えます★
 *
 *  ★★なぜ 手で 考えず 撃つのか★★
 *    「たぶん 動く」「たぶん 止まる」は ★入れてから 客が 気づく★形に なります。
 *    ⇒★★『入れたら 動かなく なった』が 一番 怖い★★（指示役）
 *    ⇒ だから ★止まった 物を ブラウザ自身に 言わせます★
 *      （`securitypolicyviolation` ＝ ★止めた 時に ブラウザが 出す 合図★）
 *
 *  ★★測り方★★
 *    ①実配信から `book.html` と 中の 部品を 取って ★手元の サーバから 出す★
 *      ⇒ 同じ 出どころに なるので ★'self' が 実配信と 同じ 意味に なる★
 *    ②HTML の 頭に ★見張りの 部品（spy.js）を 1本だけ 足す★
 *      ⇒ 中に 書き込む のでは なく ★外の ファイル★＝CSP を 緩めなくても 動く
 *    ③CSP を 付けて 開き、★止まった 物を 全部 拾う★
 *    ④★2通り 試す★
 *        (あ) `'unsafe-inline'` ★無し★ … 一番 きつい 形
 *        (い) `'unsafe-inline'` ★有り★ … 現実的な 形
 *      ⇒★どれだけ 差が 出るかを 数字で 見せる★
 *
 *  ★物差しが 効いている 事の 確かめ★
 *    ★わざと 止まる 物★を 1つ 混ぜる（許していない 相手の 絵）
 *    ⇒ それが 拾えなければ ★見張りが 効いていない★
 *
 *  使い方: node docs/measured/soto/csp-ireta-ra-nani-ga-tomaru.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const 元 = 'https://exally.vercel.app';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const 取る = (u) => new Promise((ok, ng) => {
  https.get(u, { agent: false }, (r) => {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) { 取る(r.headers.location).then(ok, ng); return; }
    const 塊 = [];
    r.on('data', (c) => 塊.push(c));
    r.on('end', () => ok({ 体: Buffer.concat(塊), 型: r.headers['content-type'] || 'application/octet-stream', 番: r.statusCode }));
  }).on('error', ng);
});

/* ★見張りの 部品★＝止まった 物を 拾って 送り返す */
const SPY = `
var 止まった = [];
document.addEventListener('securitypolicyviolation', function (e) {
  止まった.push({
    決まり: e.violatedDirective,
    相手: String(e.blockedURI || '').slice(0, 120),
    どこ: String(e.sourceFile || '').slice(0, 120) + ':' + (e.lineNumber || 0)
  });
});
/* ★わざと 止める 物★＝物差しが 効いているかの 確かめ */
（function () {
  var im = new Image();
  im.src = 'https://example.invalid/wazato-tomeru.png';
})();
/* ★今 在る「Web から」の 窓と 同じ 撃ち方★＝これが 止まるかを 見る
   （お客さんが 打った 住所へ 取りに 行く／CSP の connect-src が 効く 所） */
（function () {
  try { fetch('https://example.invalid/web-kara-yomu.html'); } catch (e) { /* 止まった */ }
})();
setTimeout(function () {
  var x = new XMLHttpRequest();
  x.open('POST', '/report', true);
  x.setRequestHeader('Content-Type', 'text/plain');
  x.send(JSON.stringify(止まった));
}, 6000);
`.split('（function').join('(function');

const 本体 = await 取る(元 + '/book.html');
let html = 本体.体.toString('utf-8');
html = html.replace(/<head([^>]*)>/i, '<head$1><script src="/__spy.js"></script>');

const 拾った = [];
async function 走らせる(名, CSP) {
  拾った.length = 0;
  const 蔵 = new Map();
  const さば = http.createServer(async (req, res) => {
    const 道 = req.url.split('?')[0];
    if (req.method === 'POST' && 道 === '/report') {
      let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => { try { 拾った.push(...JSON.parse(b)); } catch (e) { /* 読めない */ } res.end('ok'); });
      return;
    }
    res.setHeader('Content-Security-Policy', CSP);
    if (道 === '/__spy.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(SPY); return; }
    if (道 === '/' || 道 === '/book.html') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    try {
      if (!蔵.has(req.url)) 蔵.set(req.url, await 取る(元 + req.url));
      const o = 蔵.get(req.url);
      res.setHeader('Content-Type', o.型); res.statusCode = o.番; res.end(o.体);
    } catch (e) { res.statusCode = 502; res.end(''); }
  });
  await new Promise((ok) => さば.listen(8811, '127.0.0.1', ok));

  const 仮 = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-'));
  const ch = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--no-service-autorun', '--disable-extensions',
    '--user-data-dir=' + 仮, '--virtual-time-budget=12000', '--dump-dom',
    'http://127.0.0.1:8811/book.html',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  await new Promise((ok) => { ch.on('exit', ok); setTimeout(() => { try { ch.kill(); } catch (e) { /* もう 死んでいる */ } ok(); }, 45000); });
  await new Promise((ok) => setTimeout(ok, 600));
  さば.close();
  return 拾った.slice();
}

const 相手たち = "https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com https://*.supabase.co";
const きつい = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
].join('; ');
const ゆるい = きつい
  .replace("script-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'")
  .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");

const あ = await 走らせる('きつい', きつい);
const い = await 走らせる('ゆるい', ゆるい);

const 出 = [];
const 言う = (s) => { 出.push(s); console.log(s); };
const まとめ = (並) => {
  const m = new Map();
  for (const x of 並) {
    const k = x.決まり + ' → ' + (x.相手 || '(中に 書いた 物)');
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

言う('# ★CSP を 入れたら 何が 止まるか★（' + new Date().toISOString().slice(0, 10) + '）');
言う('');
言う('★本番には 入れていません★（手元に 同じ 画面を 立てて 測った）');
言う('★止まった 物は ブラウザ自身に 言わせた（securitypolicyviolation）★');
言う('');
for (const [名, 決, 並] of [['(あ) 中に 書いた 物を 許さない 形', きつい, あ], ['(い) 中に 書いた 物を 許す 形', ゆるい, い]]) {
  言う('## ★' + 名 + '★');
  言う('');
  言う('```');
  for (const d of 決.split('; ')) 言う('  ' + d);
  言う('```');
  言う('');
  言う('  ★止まった 数 … ' + 並.length + '件★');
  for (const [k, n] of まとめ(並)) 言う('    ' + String(n).padStart(4) + '回  ' + k);
  const 確かめ = 並.some((x) => String(x.相手).includes('example.invalid') || x.決まり.startsWith('img-src'));
  言う('  ★わざと 止めた 物を 拾えたか … ' + (確かめ ? 'はい（物差しは 効いている）' : '★いいえ＝物差しが 壊れている★') + '★');
  言う('');
}
言う('## ★差★');
言う('');
言う('  ★きつい 形 … ' + あ.length + '件 止まる★');
言う('  ★ゆるい 形 … ' + い.length + '件 止まる★');
言う('');
言う('★この 測りが 見ていない 物★');
言う('  ・押さないと 動かない 所（AIに 聞く／倉庫に 入る／ファイルを 開く／印刷）');
言う('  ⇒ ★開いた だけ＝半分です★');

fs.writeFileSync(path.join(ここ, 'csp-ireta-ra-nani-ga-tomaru.txt'), 出.join('\n') + '\n', { encoding: 'utf-8' });
console.log('\n★書いた … docs/measured/soto/csp-ireta-ra-nani-ga-tomaru.txt★');
