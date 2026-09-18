/* zairyou-ga-nai-kami.mjs — ★「紙は 在るが `#材料` が 無い」紙を 数える★（2026-09-18）
 *
 *  ★★なぜ★★
 *    2026-09-18、`golden-oddf-to-46ko-2026-09-16.tsv`（46個の 紙）に
 *    ★`#材料` が 無い★ 為に ★見張りが 1行も 押して いませんでした★。
 *    ⇒★★「紙が 在る」は「押されて いる」では ありません★★
 *    ⇒★同じ 穴が 他にも 開いて いないか★を 数えます。
 *
 *  ★数え方★
 *    ①`docs` の `*.tsv` `*.csv`（★`golden-jitsubutsu-*` は 読みません★＝司さんの 実物）
 *    ②`#材料` の 行が 在るか
 *    ③★式が マスを 指して いるか★（A1・$A$1・A1:B2・板!A1）
 *    ⇒★★③が 在って ②が 無い 紙＝押せない 紙★★
 *
 *  ★見て いない 事★
 *    ・★その 紙が 別の 試験で 押されて いるかは 見て いません★
 *      （`kansuu46-1taba.test.mjs` の ように 材料の 出どころを 名指しした 物が 在る）
 *    ・★柱（# 種 ...）が 読めるかは 見て いません★
 *
 *  使い方: node docs/measured/zairyou-ga-nai-kami.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const 紙 = [];
const 歩く = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { 歩く(p); continue; }
    if (!/\.(tsv|csv)$/.test(e.name)) continue;
    if (/^golden-jitsubutsu-/.test(e.name)) continue;   /* ★司さんの 実物は 別の 決め★ */
    紙.push(p);
  }
};
歩く(path.join(ROOT, 'docs'));

/* ★マスを 指す 形★（`shiki-kansuu-kami.test.mjs` の 見方と 揃える） */
const マス = /(?:^|[^A-Za-z0-9_.!$])\$?[A-Z]{1,3}\$?[0-9]{1,7}(?![0-9A-Za-z_])/;

let 材あり = 0;
const 押せない = [];
const 指さない = [];
for (const p of 紙) {
  const 行 = fs.readFileSync(p, 'utf-8').split(/\r?\n/);
  const 材 = 行.some((l) => l.startsWith('#材料'));
  const 本 = 行.filter((l) => l && !l.startsWith('#'));
  const 指す = 本.filter((l) => マス.test(l)).length;
  if (材) { 材あり++; continue; }
  /* ★突き合わせの 出しは ★紙では ありません★（`shiki-kansuu-kami` も 読んで いません） */
  /* ★逆斜線を 書かない★（★今日 4回 heredoc で 落ちました★）＝名前だけ 見る */
  const 名 = path.basename(p);
  const 突き = 名.indexOf('-awase-') >= 0 || 名.indexOf('cases-') === 0;
  if (指す > 0) 押せない.push({ 紙: path.relative(ROOT, p), 行: 本.length, 指す: 指す, 突き: 突き });
  else 指さない.push(path.relative(ROOT, p));
}

console.log('');
console.log('★★「紙は 在るが `#材料` が 無い」を 数える★★');
console.log('');
console.log('  ★紙★ ......................... ' + 紙.length + '枚');
console.log('  ★`#材料` が 在る★ ............ ' + 材あり + '枚');
console.log('  ★`#材料` が 無い★ ............ ' + (紙.length - 材あり) + '枚');
const 本物 = 押せない.filter((x) => !x.突き);
const 突き数 = 押せない.length - 本物.length;
console.log('    ・★マスを 指す 式が 在る★ ... ' + 押せない.length + '枚');
console.log('        うち ★★本当の 紙 ' + 本物.length + '枚★★（★押せません★）');
console.log('        うち 突き合わせの 出し ' + 突き数 + '枚（★元から 紙では ない★）');
console.log('    ・★押せない 行の 合計★ ...... ★' + 本物.reduce((a, x) => a + x.指す, 0) + '行★');
console.log('    ・マスを 指さない .......... ' + 指さない.length + '枚（★材料が 要らない★）');
console.log('');
console.log('★★押せない 紙（★材料が 要るのに 無い★）★★');
for (const x of 本物.sort((a, b) => b.指す - a.指す)) {
  console.log('  ' + String(x.指す).padStart(5) + '行が マスを 指す ／ 全 '
    + String(x.行).padStart(5) + '行  ' + x.紙);
}
console.log('');
console.log('★★言えない 事★★');
console.log('  ・★その 紙が 別の 試験で 押されて いるかは 見て いません★');
console.log('    ＝`tests/kansuu46-1taba.test.mjs` の ように');
console.log('      ★材料の 出どころを 名指しして 押して いる 物が 在ります★');
console.log('  ・★柱（# 種 ...）が 読めるかは 見て いません★');
