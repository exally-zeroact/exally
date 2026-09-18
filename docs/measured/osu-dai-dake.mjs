/* osu-dai-dake.mjs -- ★同じ 170本を ★自前の 台だけ★で 押す★（2026-09-18）
 *
 *  ★訳★
 *    `osu-kami-webkit.mjs` は ★お客さんの 道★（借り物）を 押して ★99/170（58.2%）★。
 *    ⇒★★「繋いだら どこまで 行くか」は ★別に 測らないと 分かりません★★
 *    ⇒★同じ 170本を ★`lib/shiki-*` だけ★で 押します★（★借り物を 建てません★）
 *
 *  ★★これは「繋いだ後の 数」では ありません★★
 *    ・繋ぐと ★`convertFormula`（JIS→DBCS・YEN→DOLLAR 等）★を 通ります
 *    ・繋ぐと ★JS層（`_jsSet`）★が 先に 横取りする 物が 在ります
 *    ⇒★★ここで 出る 数は「台 単体の 力」です★★
 *    ⇒★★繋いだ 後は 必ず `osu-kami-webkit.mjs` で 測り直します★★
 *
 *  ★見て いない 事★
 *    ・★溢れ（スピル）の 2つ目 以降★は 見て いません（左上だけ）
 *    ・★材料は 1組だけ★（紙の 頭の 物）
 *
 *  使い方: node docs/measured/osu-dai-dake.mjs
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..', '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const H = require_(path.join(ROOT, 'lib/shiki-hyou.js'));
require_(path.join(ROOT, 'lib/shiki-kansuu.js'));
require_(path.join(ROOT, 'lib/shiki-tsunagi.js'));

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

const 誤りの数 = {
  '-2146826281': '#DIV/0!', '-2146826252': '#NUM!', '-2146826246': '#N/A',
  '-2146826273': '#VALUE!', '-2146826265': '#REF!', '-2146826259': '#NAME?',
  '-2146826288': '#NULL!', '-2146826238': '#CALC!', '-2146826245': '#SPILL!',
};

function 答になるか(a) {
  if (a === '') return false;
  if (/打てません|受け付けません|HRESULT/.test(a)) return false;
  return true;
}

const 問い = [];
for (const p of 紙たち) {
  const 生 = fs.readFileSync(path.join(ここ, p.名), 'utf-8').replace(/^﻿/, '');
  for (const l of 生.split(/\r?\n/)) {
    if (!l || l.startsWith('#') || !l.includes('\t')) continue;
    const c = l.split('\t');
    const 式 = 裸(c[p.式列]);
    let 答 = 裸(c[p.答列]);
    if (!式.startsWith('=')) continue;
    if (!答になるか(答)) continue;
    if (誤りの数[答]) 答 = 誤りの数[答];
    問い.push({ 式, 答 });
  }
}

console.log('');
console.log('[osu-dai-dake] ★同じ 170本を 自前の 台だけで 押す★');
console.log('  ★★拾った 式 ... ' + 問い.length + '本★★（★お客さんの 道と 同じ 分母★）');
console.log('  ★借り物は 建てて いません★');

const 板 = new H.表();
for (const kv of 材料) 板.打つ(kv[0], kv[1]);

let 合 = 0, 違 = 0, 知らない = 0, 転 = 0;
const 外れ = [];
const 知らない名 = new Map();
for (const q of 問い) {
  let 出;
  try {
    板.打つ('J21', q.式);
    出 = 板.字('J21');
  } catch (e) { 転 += 1; 外れ.push(q.式 + ' => ★転んだ★ ' + String(e.message).slice(0, 70)); continue; }
  const 字 = (出 === null || 出 === undefined) ? '' : String(出);
  if (字 === '#NAME?') {
    知らない += 1;
    const m = /^=([A-Z0-9_.]+)\(/.exec(q.式);
    const n = m ? m[1] : '(不明)';
    知らない名.set(n, (知らない名.get(n) || 0) + 1);
    continue;
  }
  const 数どうし = /^-?[\d.eE+]+$/.test(q.答) && /^-?[\d.eE+]+$/.test(字);
  const 同 = (字 === q.答)
    || (数どうし && Math.abs(Number(字) - Number(q.答)) <= Math.max(1e-9, Math.abs(Number(q.答)) * 1e-9));
  if (同) 合 += 1;
  else { 違 += 1; 外れ.push(q.式 + ' => 出た [' + 字 + '] ／実Excel [' + q.答 + ']'); }
}

console.log('');
console.log('  ★★合った ' + 合 + ' / ' + 問い.length + '★★'
  + ' ／ 違った ' + 違 + ' ／ ★台が 知らない（#NAME?） ' + 知らない + '★ ／ 転んだ ' + 転);
console.log('  ★合った 割合 ... ' + (問い.length ? (100 * 合 / 問い.length).toFixed(1) : '0') + '%★');
console.log('');
console.log('  ★★台が 知らない 関数★★');
for (const [n, c] of [...知らない名.entries()].sort((a, b) => b[1] - a[1])) {
  console.log('    ' + n + ' ... ' + c + '本');
}
console.log('');
console.log('  ★★合わない ' + 外れ.length + '本★★');
for (const s of 外れ) console.log('    ・' + s);
