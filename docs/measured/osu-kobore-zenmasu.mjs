/* osu-kobore-zenmasu.mjs -- ★溢れた 先の 全マスを ★お客さんの 道★で 押す★（2026-09-19）
 *
 *  ★★なぜ 要るか（★今日 見つけた 穴★）★★
 *    `osu-kami-webkit.mjs` の 断り 24行目
 *      「★溢れ（スピル）の 2つ目 以降★は 見て いません（左上だけ）」
 *    ⇒★★2,105 / 2,116 の「合った」は ★左上が 合った★という 意味です★★
 *    ⇒★★溢れた 先が 実Excel と 同じかは 誰も 突き合わせて いませんでした★★
 *    ⇒★Exally1 が 「台 と 借り物 は 同じ」と 測りましたが
 *      ★それは「借り物と 同じ」であって「実Excel と 同じ」では ありません★★
 *      （記憶「★別の 道で 確かめた は 別の 世界か を 先に 見ろ★」）
 *
 *  ★★実Excel の 側★★ `docs/measured/toru-kobore-zenmasu.ps1`
 *    ⇒ `golden-kobore-zenmasu-2026-09-19.tsv`
 *    ★そこで 分かった 事★ … `.Formula` では ★溢れません★（14本とも 1x1）
 *                          ⇒★`.Formula2` が 溢れる 形★
 *
 *  ★★見て いない 事★★
 *    ・★13本だけ★（Exally1 が 選んだ 物）
 *    ・★材料は 1組だけ★（A1:A3 = 3/1/2 ／ B1:B3 = 10/20/30）
 *    ・★書式・罫線は 見て いません★（★数と 字だけ★）
 *
 *  使い方: node docs/measured/osu-kobore-zenmasu.mjs --どこ=<URL>
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..', '..');
const { borrow, launch } = await import(
  pathToFileURL(path.join(ROOT, 'scripts/_borrow-playwright.mjs')).href);

const 引数 = process.argv.slice(2);
const 取る = (名) => {
  const a = 引数.find((x) => x.startsWith('--' + 名 + '='));
  return a ? a.slice(名.length + 3) : null;
};
const どこ = 取る('どこ');
if (!どこ) {
  console.log('★使い方★ node docs/measured/osu-kobore-zenmasu.mjs --どこ=<URL>');
  process.exit(2);
}

/* ★実Excel の 紙を 読む★（★手で 写しません★） */
const 紙 = path.join(ここ, 'golden-kobore-zenmasu-2026-09-19.tsv');
if (!fs.existsSync(紙)) {
  console.log('★★実Excel の 紙が 在りません ... ' + 紙 + '★★');
  process.exit(3);
}
const 問い = [];
for (const l of fs.readFileSync(紙, 'utf-8').split(/\r?\n/)) {
  if (!l || l.startsWith('#')) continue;
  const c = l.split('\t');
  if (c.length < 5) continue;
  問い.push({ 番: c[0], 式: c[1], 行数: Number(c[2]), 列数: Number(c[3]), 正: c[4] });
}
if (問い.length === 0) { console.log('★紙が 空です★'); process.exit(3); }

const 元から在る誤り = [
  'Viewport argument key "interactive-widget" not recognized',
  'navigator.storage.persisted',
];
const 窓の誤り = [];
const 元から在る = [];
const 誤りを分ける = (s) => {
  if (元から在る誤り.some((x) => s.indexOf(x) >= 0)) 元から在る.push(s);
  else 窓の誤り.push(s);
};

const wk = await borrow('osu-kobore', 'webkit');
const b = await launch('osu-kobore', wk, {}, 'webkit');
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('console', (m) => { if (m.type() === 'error') 誤りを分ける('console.error: ' + String(m.text()).slice(0, 160)); });
p.on('pageerror', (e) => 誤りを分ける('pageerror: ' + String(e.message).slice(0, 160)));

console.log('');
console.log('[osu-kobore-zenmasu] ★溢れた 先の 全マスを お客さんの 道で 押す★');
console.log('  ★どこ★ ... ' + どこ);
console.log('  ★★問い ... ' + 問い.length + '本★★（★実Excel の 紙から 読みました★）');

const 返 = await p.goto(どこ, { waitUntil: 'load', timeout: 60000 });
console.log('  ★返事★ ... ' + (返 ? 返.status() : '(無し)'));
await p.waitForFunction(() => typeof window.setCell === 'function', { timeout: 30000 });

const 出 = await p.evaluate((問) => {
  const 読む = (r, c) => {
    const x = window.getCell(r, c);
    if (!x) return null;
    const v = (x.d !== undefined ? x.d : x.v);
    return (v === null || v === undefined || v === '') ? null : String(v);
  };
  const 結果 = [];
  for (const q of 問) {
    /* ★材料★（★毎回 入れ直す★） */
    window.setCell(0, 0, 3); window.setCell(1, 0, 1); window.setCell(2, 0, 2);
    window.setCell(0, 1, 10); window.setCell(1, 1, 20); window.setCell(2, 1, 30);
    /* ★前の 溢れを 消す★ */
    for (let r = 0; r < 10; r += 1) for (let c = 3; c < 8; c += 1) window.setCell(r, c, '');
    let 投げた = null;
    try { window.setCell(0, 3, q.式); } catch (e) { 投げた = String(e.message).slice(0, 80); }
    /* ★★2026-09-19 ── ★これを 呼ばないと 溢れません★★
       ＝1回目に 書いた 時 ★14本とも 1x1★ に なり
         ★危うく「台が 溢れない」と 出す 所でした★
       ＝実物を 覗いたら ★`recalcSheet` の 後に `_溢れ元` が 付いた マスが 出ます★
       ⇒★記憶「台が 違うと 言う 前に 測り道具が その式を 押せるかを 見る」★ */
    const sh2 = window.sheets[window.activeSheet];
    if (typeof window.recalcSheet === 'function') window.recalcSheet(window.activeSheet, sh2.data);
    const 行たち = [];
    let 最終行 = 0; let 最終列 = 0;
    for (let r = 0; r < 10; r += 1) {
      const 一行 = [];
      for (let c = 3; c < 8; c += 1) {
        const v = 読む(r, c);
        if (v !== null) { if (r + 1 > 最終行) 最終行 = r + 1; if (c - 2 > 最終列) 最終列 = c - 2; }
        一行.push(v === null ? '' : v);
      }
      行たち.push(一行);
    }
    const 並 = [];
    for (let i = 0; i < 最終行; i += 1) 並.push(行たち[i].join('|'));
    結果.push({ 番: q.番, 式: q.式, 行数: 最終行, 列数: 最終列, 出: 並.join(' / '), 投げた });
  }
  return 結果;
}, 問い);

await b.close();

/* ★実Excel の 紙は 後ろに 空の 列が 付きます★（D1:H10 を そのまま 書いた ので）
   ⇒★比べる 前に ★両方とも★ 後ろの 空を 落とします★ */
const 揃える = (s) => String(s)
  .split(' / ')
  .map((行) => 行.replace(/\|+$/, ''))
  .join(' / ');

let 合 = 0;
const 外れ = [];
for (let i = 0; i < 問い.length; i += 1) {
  const q = 問い[i];
  const x = 出[i];
  const a = 揃える(x.出);
  const b2 = 揃える(q.正);
  const 同 = (a === b2) && (x.行数 === q.行数) && (x.列数 === q.列数);
  if (同) 合 += 1; else 外れ.push({ q, x, a, b2 });
  console.log('  ' + (同 ? 'o ' : '★X★') + ' ' + q.式.slice(0, 44).padEnd(44)
    + ' ' + x.行数 + 'x' + x.列数 + '（実Excel ' + q.行数 + 'x' + q.列数 + '）');
  if (!同) {
    console.log('      うち ...... ' + a.slice(0, 70));
    console.log('      実Excel ... ' + b2.slice(0, 70));
    if (x.投げた) console.log('      ★窓が 投げました★ ' + x.投げた);
  }
}

console.log('');
console.log('  ★★合った ' + 合 + ' / ' + 問い.length + '★★ ／ 外れ ' + 外れ.length + '本');
console.log('  ★★窓の 誤り（★新しい 物だけ★） ... ' + 窓の誤り.length + '件★★');
console.log('    ★元から 在る（名指しで 許した） ... ' + 元から在る.length + '件★');
for (const e of 窓の誤り.slice(0, 6)) console.log('    ・' + e);
console.log('');
console.log('  ★★断り★★');
console.log('    ・★13本だけ／材料は 1組だけ★');
console.log('    ・★数と 字だけ★（書式・罫線は 見て いません）');
console.log('    ・★`window.setCell` で 打って います★＝★打鍵では ありません★');
console.log('      （★打鍵は `utte-osu-webkit.mjs` の 役★）');
