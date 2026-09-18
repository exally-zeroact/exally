/* oddf-nokori.test.mjs -- ★ODDF / ODDL の 残りを 実Excel に 聞いた 50本で 押す★（2026-09-18）
 *
 *  ★★紙★★ `docs/measured/golden-oddf-nokori-2026-09-18.tsv`
 *    ＝★経営者1 が 実Excel（16.0 build 20326 / PowerShell 5.1.26100.9278）で 押しました★
 *    ＝★問いは 私の 紙（kansuu46/oddf-nokori-1pon-kiku-koto.md）から 機械で 拾った 物★
 *
 *  ★★なぜ この 試験が 紙と 同じ 頃に 出るか★★
 *    ★紙を 取ったら ★それを 名前で 読む 試験★も 出す★（2026-09-18 の 決め）
 *    ＝`tests/` の どれからも 読まれない 紙が 13枚 在った 事が 在ります
 *
 *  ★★この 紙で 出た 事★★
 *    ・★初回利払日が ★満期から 数えた 利払日の 上★に 無いと #NUM!★
 *      ＝`初回 2009-08-30` `初回 2009-08-15` `満期 2015-02-27` の 3本
 *      ＝★前は 数を 返して いました★（お客さんには 誤りと 分かりません）
 *    ・★ODDL の A と DSC は ★別の 数え方★★（利率 0 ／ 利回り 0 で 引き離した）
 *
 *  ★★まだ 合わない 本数を 決め打ち★★（★減っても 増えても 赤★）
 *
 *  使い方: node tests/oddf-nokori.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { 式をほどく, 答えを見る } from './monosashi.mjs';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..');
const require_ = createRequire(import.meta.url);
const K = require_(path.join(ROOT, 'lib/formula-kane.js'));
const 紙の道 = path.join(ROOT, 'docs/measured/golden-oddf-nokori-2026-09-18.tsv');

let pass = 0, fail = 0;
const T = (n, fn) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { fail++; console.log('  NG   ' + n + '\n       ' + (e && e.message)); }
};

function 引数を割る(s) {
  const 出 = []; let 深 = 0, 今 = '';
  for (const ch of s) {
    if (ch === '(') { 深++; 今 += ch; continue; }
    if (ch === ')') { 深--; 今 += ch; continue; }
    if (ch === ',' && 深 === 0) { 出.push(今.trim()); 今 = ''; continue; }
    今 += ch;
  }
  if (今.trim() !== '') 出.push(今.trim());
  return 出;
}
function 値にする(s) {
  s = String(s).trim();
  const d = s.match(/^DATE\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (d) return K.日から数(+d[1], +d[2], +d[3]);
  return Number(s);
}
const 基 = (a, i) => ((a.length > i && a[i] !== undefined && !Number.isNaN(a[i])) ? a[i] : 0);
const 呼ぶ = {
  ODDFPRICE: (a) => K.初回端数の価格(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], 基(a, 8)),
  ODDFYIELD: (a) => K.初回端数の利回り(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], 基(a, 8)),
  ODDLPRICE: (a) => K.最終端数の価格(a[0], a[1], a[2], a[3], a[4], a[5], a[6], 基(a, 7)),
  ODDLYIELD: (a) => K.最終端数の利回り(a[0], a[1], a[2], a[3], a[4], a[5], a[6], 基(a, 7)),
  COUPDAYS: (a) => K.期間の日数(K.数から日(a[0]), K.数から日(a[1]), a[2], 基(a, 3)),
  COUPDAYBS: (a) => K.前からの日数(K.数から日(a[0]), K.数から日(a[1]), a[2], 基(a, 3)),
  COUPNUM: (a) => K.利払回数(K.数から日(a[0]), K.数から日(a[1]), a[2]),
  COUPPCD: (a) => { const p = K.前の利払日(K.数から日(a[0]), K.数から日(a[1]), a[2]); return K.日から数(p.y, p.m, p.d); },
  COUPNCD: (a) => { const p = K.次の利払日(K.数から日(a[0]), K.数から日(a[1]), a[2]); return K.日から数(p.y, p.m, p.d); },
};

console.log('');
console.log('[oddf-nokori] ★ODDF / ODDL の 残りを 実Excel の 50本で 押す★');

T('★紙が 在る★', () => { if (!fs.existsSync(紙の道)) throw new Error(紙の道); });

const 生 = fs.readFileSync(紙の道, 'utf-8').replace(/^﻿/, '');
T('★★どの Excel で 押したかが 紙に 書いて ある★★（★版が 無い 紙は 使えません★）', () => {
  if (!/build/.test(生) || !/PowerShell/.test(生)) throw new Error('版が 書かれて いません');
});

const 行たち = 生.split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('\t'))
  .map((l) => l.split('\t'))
  .filter((c) => String(c[1] || '').trim().startsWith('='))
  .map((c) => ({ 式: c[1].trim(), 答: c[2], 出る字: c[3], 型: c[4] }));

/* ★2026-09-18 の 実測★（★減っても 増えても 赤★） */
const 紙の本数 = 50;
/* ★★私は ここも 覚えで 書きました（32）★★＝★実測は 22★（2026-09-18・★今日 2回目★）
     ⇒★★数は 覚えで 書かない／走らせてから 書く★★ */
const 合う本数 = 22;

T('★紙が ' + 紙の本数 + '本 在る★（★分母★）', () => {
  if (行たち.length !== 紙の本数) throw new Error('出た ' + 行たち.length + '本');
});

let 合 = 0, 違 = 0, 押せず = 0;
const 外れ = [];
for (const 行 of 行たち) {
  const ほ = 式をほどく(行.式);
  if (!ほ || !呼ぶ[ほ.名]) { 押せず++; continue; }
  let 出;
  try { 出 = 呼ぶ[ほ.名](引数を割る(ほ.引数の字).map(値にする)); }
  catch (e) { 出 = { 誤り: 'EX' }; }
  /* ★紙の 「答え」は 誤りを 負の 数で 持って います★ ⇒ 「出る字」で 突き合わせます */
  const 見る = { 答: /^-2146/.test(String(行.答)) ? 行.出る字 : 行.答, 型: 行.型 };
  const r = 答えを見る(出, 見る);
  if (r.合) 合++;
  else { 違++; 外れ.push(行.式.slice(0, 84) + '\n         正 ' + 見る.答 + ' ／ 出 ' + r.出); }
}
console.log('  ★合った ' + 合 + ' ／ 違った ' + 違 + ' ／ 押せず ' + 押せず + '★（決め打ち ' + 合う本数 + '）');

T('★★押せなかった 行が 0本★★（★黙って 飛ばさない★）', () => {
  if (押せず !== 0) throw new Error(押せず + '本 押せて いません');
});

T('★★' + 合う本数 + '本 合う★★（★減っても 増えても 赤★）', () => {
  if (合 < 合う本数) {
    throw new Error('★下がりました★ ' + 合 + '本\n       ' + 外れ.slice(0, 4).join('\n       '));
  }
  if (合 > 合う本数) {
    throw new Error('★上がりました★ ' + 合 + '本 ⇒★決め打ちを 上げて ください★'
      + '（★緩い 門は 門では ありません★）');
  }
});

/* ══ ★★この 紙で 直した 規則を 名指しで 押さえる★★ ══
     ＝★数が 合って いても この 規則が 消えたら 赤に します★ */
const d = (y, m, dd) => K.日から数(y, m, dd);
const 誤りか = (x) => !!(x && typeof x === 'object' && x.誤り);
T('★★初回が 準利払日の 上に 無ければ #NUM!★★（実Excel の 3本）', () => {
  const 組 = [
    ['初回 2009-08-30', K.初回端数の価格(d(2009, 3, 10), d(2015, 2, 28), d(2008, 12, 5), d(2009, 8, 30), 0.045, 0.05, 100, 4, 1)],
    ['初回 2009-08-15', K.初回端数の価格(d(2009, 3, 10), d(2015, 2, 28), d(2008, 12, 5), d(2009, 8, 15), 0.045, 0.05, 100, 4, 1)],
    ['満期 2015-02-27', K.初回端数の価格(d(2009, 3, 10), d(2015, 2, 27), d(2008, 12, 5), d(2009, 8, 31), 0.045, 0.05, 100, 4, 1)],
  ];
  const 外 = 組.filter((x) => !誤りか(x[1]));
  if (外.length) throw new Error('★誤りに なって いない★ ' + 外.map((x) => x[0] + ' ⇒ ' + x[1]).join(' ／ '));
});
T('★★上に 在る 時は 数を 返す★★（★広げすぎて いない★）', () => {
  const 組 = [
    ['満期 2015-02-28', K.初回端数の価格(d(2009, 3, 10), d(2015, 2, 28), d(2008, 12, 5), d(2009, 8, 31), 0.045, 0.05, 100, 4, 1)],
    ['満期 2016-02-29', K.初回端数の価格(d(2009, 3, 10), d(2016, 2, 29), d(2008, 12, 5), d(2009, 8, 31), 0.045, 0.05, 100, 4, 1)],
    ['満期 2015-05-31', K.初回端数の価格(d(2009, 3, 10), d(2015, 5, 31), d(2008, 12, 5), d(2009, 8, 31), 0.045, 0.05, 100, 4, 1)],
  ];
  const 外 = 組.filter((x) => typeof x[1] !== 'number');
  if (外.length) throw new Error('★数に なって いない★ ' + 外.map((x) => x[0]).join(' ／ '));
});

/* ══ ★★ODDL の A と DSC は 別の 数え方★★ ══（★利率 0 ／ 利回り 0 で 引き離した★）
     ★紙の 3本★
       利回り 0 ... 102.1471590909091  ⇒ (値 - 100) / 1.125 = ★DC - A = 1.908585859★
       利率  0 ... 97.696364140993609 ⇒ (100/値 - 1) / 0.0125 = ★DSC = 1.886363636★
       どちらも 0 ... 100（★対照★）
     ⇒★★DC - A（1.9086）と DSC（1.8864）は 違います★★
     ⇒★実Excel は A と DSC を 別の 数え方で 出して います★
     ⇒★うちは DSC = DC - A に して います★＝★ここが 合わない 訳★
     ★この 門は 「まだ 合って いない」事を ★数で★ 残します★ */
T('★★ODDL は まだ DSC を DC - A で 出して いる★★（★合ったら 赤＝直した 印★）', () => {
  const 中 = K.最終端数の中身(d(2009, 3, 10), d(2009, 8, 31), d(2008, 11, 30), 4, 0);
  if (!中 || 中.誤り) throw new Error('中身が 読めません ' + JSON.stringify(中));
  const 実DSC = 1.8863636363636365;   /* ★実Excel から 引き離した 数★ */
  if (Math.abs(中.DSC - 実DSC) < 1e-9) {
    throw new Error('★DSC が 実Excel と 合いました★ ⇒★この 門を 書き換えて ください★');
  }
  console.log('      ... うちの DSC ' + 中.DSC + ' ／ 実Excel ' + 実DSC);
});

console.log('');
console.log('oddf-nokori: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail === 0 ? 0 : 1);
