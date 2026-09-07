/* j36-wakeru.mjs — ★JS層 36個の 突き合わせを 原因ごとに 分ける★（2026-09-08）
 *  ★金の紙★ docs/measured/kansuu46/golden-jssou36-2026-09-08.tsv
 *  ★判定の 紙★ mae-ato の 出力（式 \t 判定 \t うちの 答え）
 *  ⇒★2つを 式で 繋いで ★実Excel の 答え★を 隣に 置く★
 */
import fs from 'node:fs';

const 金道 = process.argv[2];
const 判道 = process.argv[3];

const 金 = new Map();
for (const l of fs.readFileSync(金道, 'utf-8').split('\n')) {
  if (!l || l.startsWith('#')) continue;
  const p = l.split('\t');
  if (p.length < 4) continue;
  金.set(p[1], { 名: p[0], 答: p[2], 型: p[3] });
}

const 山 = { 違う: [], こちらだけ誤り: [], 名前が通らない: [], 合った: 0 };
for (const l of fs.readFileSync(判道, 'utf-8').split('\n')) {
  if (!l) continue;
  const p = l.split('\t');
  if (p.length < 2) continue;
  const g = 金.get(p[0]);
  if (!g) continue;
  if (p[1] === '合った') { 山.合った++; continue; }
  if (!山[p[1]]) continue;
  山[p[1]].push({ 名: g.名, 式: p[0], 正: g.答, 出: p[2] || '' });
}

const 個 = (a) => new Set(a.map((x) => x.名)).size;
console.log('★JS層 36個を 実Excel と 突き合わせた★');
console.log('  ★いつの 紙か★ 2026-09-08（★まだ 押していない★）');
console.log('');
console.log('  合った ……………………………… ' + 山.合った + '本');
console.log('  ★★違う（黙って 間違った 数）… ' + 山.違う.length + '本（関数 ' + 個(山.違う) + '個）★★');
console.log('  ★こちらだけ 誤り ……………… ' + 山.こちらだけ誤り.length + '本（関数 ' + 個(山.こちらだけ誤り) + '個）★');
console.log('  名前が 通らない ………………… ' + 山.名前が通らない.length + '本（関数 ' + 個(山.名前が通らない) + '個）');
console.log('');
for (const [札, a] of [['★★違う（一番 悪い＝誤りも 出さずに 違う 数）★★', 山.違う],
  ['★こちらだけ 誤り（実Excel は 答えを 返す）★', 山.こちらだけ誤り],
  ['★名前が 通らない（#NAME?）★', 山.名前が通らない]]) {
  if (!a.length) continue;
  console.log(札 + ' … ' + a.length + '本');
  const 束 = {};
  for (const x of a) (束[x.名] = 束[x.名] || []).push(x);
  for (const n of Object.keys(束).sort()) {
    console.log('  ★' + n + '★（' + 束[n].length + '本）');
    for (const x of 束[n].slice(0, 4)) {
      console.log('    ' + x.式.padEnd(34) + ' 実Excel ' + String(x.正).padEnd(20) + ' ／ うち ' + x.出);
    }
  }
  console.log('');
}
