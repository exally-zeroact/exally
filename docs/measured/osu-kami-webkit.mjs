/* osu-kami-webkit.mjs -- ★紙の 式を ★お客さんの 道★で まとめて 押す★（2026-09-18）
 *
 *  ★訳★
 *    `tests/shiki-wo-osu-webkit.mjs` は ★14本★です。
 *    ＝★紙に 在る 式の 0.14%★＝★「14本 合った」は「完璧」では ありません★。
 *    ⇒★紙から 機械で 拾って 本数を 増やします★（★手で 書き写しません★）
 *
 *  ★どう 速くするか★
 *    ★1本ごとに 窓と 行き来しない★＝★全部 まとめて 1回で 押します★
 *
 *  ★見て いない 事★
 *    ・★溢れ（スピル）の 2つ目 以降★は 見て いません（左上だけ）
 *    ・★書き出し・読み込みの 道★は 見て いません
 *    ・★紙は 2枚だけ★です（8枠目・9枠目）
 *
 *  使い方:
 *    node <この道具>                      ... 手元
 *    node <この道具> --どこ=<URL>         ... テスト版／本番
 */
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ★手元の 絶対の 道を 焼き込まない★（記憶の 決まり） */
const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..', '..');
const { borrow, launch } = await import(pathToFileURL(path.join(ROOT, 'scripts/_borrow-playwright.mjs')).href);

const 口 = (process.argv.find((a) => a.startsWith('--どこ=')) || '--どこ=手元').split('=').slice(1).join('=');
const 手元か = (口 === '手元');

/* ★8枠目・9枠目の 紙の 頭に 書いて ある 材料★ */
const 材料 = [
  ['A1', 1], ['A2', 2], ['A3', 3], ['A4', 4], ['A5', 5],
  ['B1', 1], ['B2', 2], ['B3', '=1/0'], ['B4', 4], ['B5', 5],
  ['C1', 1], ['C2', 3], ['C3', 5], ['C4', 7], ['C5', 9],
  ['D1', 9], ['D2', 7], ['D3', 5], ['D4', 3], ['D5', 1],
  ['F1', 1], ['G1', 2], ['F2', 10], ['G2', 20],
];

const 紙たち = [
  { 名: 'golden-kansuu-8kaime-2026-09-18.tsv', 式列: 1, 答列: 2 },
  { 名: 'golden-kansuu-9kaime-2026-09-18.tsv', 式列: 2, 答列: 4 },
];

const 裸 = (s) => String(s === undefined ? '' : s).replace(/★/g, '').replace(/`/g, '').trim();

/* ★実Excel の .Value2 は 誤りを 負の 数で 返します★（記憶の 決まり） */
const 誤りの数 = {
  '-2146826281': '#DIV/0!', '-2146826252': '#NUM!', '-2146826246': '#N/A',
  '-2146826273': '#VALUE!', '-2146826265': '#REF!', '-2146826259': '#NAME?',
  '-2146826288': '#NULL!', '-2146826238': '#CALC!', '-2146826245': '#SPILL!',
};

function 答になるか(a) {
  if (a === '') return false;
  /* ★Excel 自身が 式を 受け付けなかった 行は 答えでは ありません★ */
  if (/打てません|受け付けません|HRESULT/.test(a)) return false;
  return true;
}

const 問い = [];
for (const p of 紙たち) {
  const 生 = fs.readFileSync(path.join(ここ, p.名), 'utf-8').replace(/^\uFEFF/, '');
  for (const l of 生.split(/\r?\n/)) {
    if (!l || l.startsWith('#') || !l.includes('\t')) continue;
    const c = l.split('\t');
    const 式 = 裸(c[p.式列]);
    let 答 = 裸(c[p.答列]);
    if (!式.startsWith('=')) continue;
    if (!答になるか(答)) continue;
    if (誤りの数[答]) 答 = 誤りの数[答];
    問い.push({ 紙: p.名, 式, 答 });
  }
}

console.log('');
console.log('[osu-kami-webkit] ★紙の 式を お客さんの 道で 押す★');
console.log('  ★どこ★ ... ' + (手元か ? '手元' : 口));
console.log('  ★紙★ ... ' + 紙たち.map((p) => p.名).join(' / '));
console.log('  ★★拾った 式 ... ' + 問い.length + '本★★（★これが 分母★）');

function 立てる(root) {
  const 型 = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  };
  const s = http.createServer((q, r) => {
    const f = path.join(root, decodeURIComponent(String(q.url).split('?')[0]).replace(/^\/+/, ''));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('no'); }
    r.setHeader('content-type', 型[path.extname(f).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((x) => s.listen(0, '127.0.0.1', () => x({ url: 'http://127.0.0.1:' + s.address().port, 閉じる: () => s.close() })));
}

const 時計 = Date.now();
const wk = await borrow('osu-kami', 'webkit');
const browser = await launch('osu-kami', wk, {}, 'webkit');
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const 配信 = 手元か ? await 立てる(ROOT) : null;
const 住所 = 手元か ? (配信.url + '/book.html') : 口;
let 終わり = 1;
try {
  const 返 = await page.goto(住所, { waitUntil: 'load', timeout: 60000 }).catch((e) => ({ エラー: e.message }));
  if (!返 || 返.エラー || (返.status && 返.status() >= 400)) {
    console.log('  NG   ★開けませんでした★ ' + (返 && 返.エラー ? 返.エラー : ('http ' + (返 && 返.status && 返.status()))));
    throw new Error('★開けないので 止めます★');
  }
  console.log('  ok   ★開けた★ http ' + 返.status());
  await page.evaluate(() => {
    document.body.classList.remove('exally-locked');
    const ov = document.getElementById('loginOv');
    if (ov) { ov.classList.remove('open'); ov.style.display = 'none'; }
  });
  const 読み = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll('script[src]')).map((x) => x.getAttribute('src') || '');
    return {
      全: s.length,
      hf: s.filter((u) => /hyperformula/i.test(u)).length,
      shiki: s.filter((u) => /shiki-/.test(u)).length,
    };
  });
  console.log('  ★script src ' + 読み.全 + '本 ／ hyperformula ' + 読み.hf + '本 ／ shiki- ' + 読み.shiki + '本★');

  /* ★★1回で まとめて 押します★★ */
  const 出 = await page.evaluate(({ 材, 問 }) => {
    const 番地 = (s) => {
      const m = /^([A-Z]+)(\d+)$/.exec(s);
      let c = 0;
      for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
      return { r: Number(m[2]) - 1, c: c - 1 };
    };
    const sh = window.sheets[window.activeSheet];
    for (const kv of 材) { const a = 番地(kv[0]); window.setCell(a.r, a.c, kv[1]); }
    const 答 = [];
    const 行 = 20;              /* ★材料の 下に 置きます★ */
    for (let i = 0; i < 問.length; i++) {
      let v;
      try {
        window.setCell(行, 9, 問[i]);
        if (typeof window.recalcSheet === 'function') window.recalcSheet(window.activeSheet, sh.data);
        const c = (sh.data || {})[行 + ',9'];
        v = !c ? null : (c.d !== undefined ? c.d : c.v);
      } catch (e) { 答.push({ 転: String(e.message).slice(0, 60) }); continue; }
      答.push({ 値: (v === undefined || v === null) ? '' : String(v) });
    }
    return 答;
  }, { 材: 材料, 問: 問い.map((q) => q.式) });

  let 合 = 0, 違 = 0, 空 = 0, 転 = 0;
  const 外れ = [];
  for (let i = 0; i < 問い.length; i++) {
    const q = 問い[i];
    const o = 出[i] || {};
    if (o.転) { 転 += 1; 外れ.push(q.式 + ' => ★転んだ★ ' + o.転); continue; }
    if (o.値 === '' || o.値 === undefined) { 空 += 1; 外れ.push(q.式 + ' => ★空っぽ★（はず ' + q.答 + '）'); continue; }
    const 数どうし = /^-?[\d.eE+]+$/.test(q.答) && /^-?[\d.eE+]+$/.test(o.値);
    const 同 = (o.値 === q.答)
      || (数どうし && Math.abs(Number(o.値) - Number(q.答)) <= Math.max(1e-9, Math.abs(Number(q.答)) * 1e-9));
    if (同) 合 += 1;
    else { 違 += 1; 外れ.push(q.式 + ' => 出た [' + o.値 + '] ／実Excel [' + q.答 + ']'); }
  }
  console.log('');
  console.log('  ★★合った ' + 合 + ' / ' + 問い.length + '★★ ／ 違った ' + 違
    + ' ／ ★空っぽ ' + 空 + '★ ／ 転んだ ' + 転);
  console.log('  ★合った 割合 ... ' + (問い.length ? (100 * 合 / 問い.length).toFixed(1) : '0') + '%★');
  console.log('');
  console.log('  ★★合わない 全部（' + 外れ.length + '本）★★');
  for (const s of 外れ) console.log('    ・' + s);
  終わり = 0;
} finally {
  await browser.close().catch(() => {});
  if (配信) 配信.閉じる();
  console.log('');
  console.log('  ★掛かった 秒 ... ' + ((Date.now() - 時計) / 1000).toFixed(1) + '秒★');
}
process.exit(終わり);
