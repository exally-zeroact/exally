/* shiki-hyou-afure.test.mjs — ★本体が 溢れ（こぼれ）を 置けるか★（土台⑤／2026-09-14）
 *
 *  ★★何を 見るか★★
 *    `lib/shiki-afure.js`（部品）は 前から 在りました。★本体（表）に 入って いなかった★＝
 *    ・`=A1:A3` を 打っても ★#VALUE!★ に なって いた
 *    ・皮が 溢れを 返しても ★マスに 並べられなかった★
 *      （実測 2026-09-14＝式 300通りのうち ★皮（溢れ待ち）154回＝半分★）
 *    ⇒ 本体に 入れた ので ★その 16通りが 本当に 動くか★を ここで 押す。
 *
 *  ★★答えは 全部 実Excel の 実測★★
 *    紙 … `docs/measured/golden-afure-2026-09-13.tsv`（Excel 16.0 build 20326）
 *    ★材料も 紙から 読みます★（`#材料` の 行）＝★手で 写さない★
 *
 *  ★★見て いない 範囲★★
 *    ・`=IF(A1:A3>1,1,0)` と `=ROW(A1:A3)` は ★IF と ROW を まだ 作って いない★ので 押せません
 *      （紙には 在ります＝★377個の 中★）
 *    ・溢れた 先が また 溢れる（重なり合い）／板を またぐ 四角
 *
 *  使い方: node tests/shiki-hyou-afure.test.mjs
 *          node tests/shiki-hyou-afure.test.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const H = require_(path.join(ROOT, 'lib/shiki-hyou.js'));

let pass = 0, fail = 0;
const T = (n, f) => {
  try { f(); pass++; console.log('  ✓ ' + n); }
  catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message); }
};
const 同じ = (得, 欲, なぜ) => {
  if (得 !== 欲) throw new Error((なぜ ? なぜ + ' … ' : '') + 'うち `' + 得 + '` ／ ★欲しい `' + 欲 + '`★');
};

/* ★材料は 紙から 読む★（手で 写さない） */
const 紙 = path.join(ROOT, 'docs/measured/golden-afure-2026-09-13.tsv');
const 材料 = {};
for (const l of fs.readFileSync(紙, 'utf8').split(/\r?\n/)) {
  if (!l.startsWith('#材料')) continue;
  const c = l.split('\t');
  if (c.length >= 3) 材料[c[1].trim()] = c[2].trim();
}
if (Object.keys(材料).length < 6) throw new Error('★紙から 材料が 読めない★');

const 作る = (じゃま) => {
  const h = H.表();
  for (const k of Object.keys(材料)) h.打つ(k, 材料[k]);
  if (じゃま) h.打つ(じゃま[0], じゃま[1]);
  return h;
};
const 字に = (x) => {
  if (!x) return '';
  if (x.型 === '誤') return x.値;
  if (x.型 === '真偽') return x.値 ? 'TRUE' : 'FALSE';
  return String(x.値);
};
/* ★広がった 先★＝左上を 除いた 並び（紙の「広がった先の字」と 同じ 並び） */
const 広がり = (h) => {
  const v = h.値('E1');
  if (!v || v.溢れ !== true) return '';
  const 出 = [];
  for (let i = 0; i < v.行数; i++) for (let j = 0; j < v.列数; j++) {
    if (i === 0 && j === 0) continue;
    出.push(字に(v.並び[i][j]));
  }
  return 出.join(' / ');
};

console.log('\n[shiki-hyou-afure] ★本体が 溢れを 置けるか★（実Excel の 実測 16通り）');
console.log('  材料（紙から 読んだ） … ' + Object.keys(材料).map((k) => k + '=' + 材料[k]).join(' '));

/* ★紙の 実測★（式, E1の字, 広がった先） */
const 押す = [
  ['=A1:A3', '1', '2 / 3', '★四角を そのまま 打つ（下に 広がるか）★'],
  ['=A1:A3*2', '2', '4 / 6', '★四角に 掛ける★'],
  ['=A1:B2', '1', '10 / 2 / 20', '★2列×2行（横にも 広がるか）★'],
  ['=A1:A3+B1:B3', '11', '22 / 33', '★四角どうしを 足す★'],
  ['=A1:A3+B1:B2', '11', '22 / #N/A', '★形が 違う 四角どうし＝足りない 所だけ #N/A★'],
  ['=@A1:A3', '1', '', '★@ を 付けると 1マスに なる（暗黙の交差）★'],
  ['=A1:A3&"x"', '1x', '2x / 3x', '★四角に 字を つなぐ★'],
  ['=-A1:A3', '-1', '-2 / -3', '★四角に 前置きの マイナス★'],
  ['=A1:A3=1', 'TRUE', 'FALSE / FALSE', '★四角の 大小くらべ★'],
  ['=SUM(A1:A3)', '6', '', '関数は 溢れない'],
];
for (const [式, 期待, 広期待, なぜ] of 押す) {
  T(なぜ + '  ' + 式, () => {
    const h = 作る(); h.打つ('E1', 式);
    同じ(h.字('E1'), 期待, 'E1');
    同じ(広がり(h), 広期待, '広がった先');
  });
}

/* ★溢れる先が 塞がって いたら #SPILL!★（実測 3通り＋下が式） */
for (const [名, じゃま] of [
  ['★溢れる先に 物が 在る★', ['E2', '9']],
  ['★溢れる先に 字が 在る★', ['E2', 'あ']],
  ['★溢れる先に 空の字("") が 在る（★目で 見ても 何も 無い★）★', ['E2', '=""']],
  ['★溢れる先が 別の 式★', ['E2', '=1+1']],
]) {
  T(名, () => {
    const h = 作る(じゃま); h.打つ('E1', '=A1:A3');
    同じ(h.字('E1'), '#SPILL!');
  });
}

T('★溢れた 先を 別の 式から 読める★（並べた 物が 本当に 使える）', () => {
  const h = 作る(); h.打つ('E1', '=A1:A3');
  h.打つ('G1', '=E2+E3');
  同じ(h.字('G1'), '5', '2 + 3');
});

T('★塞ぐ 物を どけたら 溢れが 戻る★（一度 #SPILL! に なった 後）', () => {
  const h = 作る(['E2', '9']);
  h.打つ('E1', '=A1:A3');
  同じ(h.字('E1'), '#SPILL!', 'まず 塞がって いる');
  h.打つ('E2', '');
  h.打つ('E1', '=A1:A3');        /* ★打ち直す★（溢れの 作り直しは まだ 自動では ない） */
  同じ(h.字('E1'), '1', 'どけた 後');
  同じ(広がり(h), '2 / 3');
});

if (process.argv.includes('--self-test')) {
  console.log('\n[shiki-hyou-afure --self-test] ★わざと 壊したら 赤に なるか★');
  T('★紙に その 式が 無ければ 落ちる★（紙を 見ずに 緑に しない）', () => {
    const 中 = fs.readFileSync(紙, 'utf8');
    for (const [式] of 押す) {
      if (中.indexOf(式 + '\t') < 0) throw new Error('★紙に 無い 式を 押して いる★: ' + 式);
    }
    if (中.indexOf('=NAIshiki()\t') >= 0) throw new Error('在り得ない');
  });
  T('★材料を 変えたら 答えも 変わる★（材料を 読んで いる 証拠）', () => {
    const h = H.表();
    for (const k of Object.keys(材料)) h.打つ(k, k === 'A2' ? '99' : 材料[k]);
    h.打つ('E1', '=A1:A3');
    同じ(広がり(h), '99 / 3', '★A2 を 99 に した★');
  });
  T('★溢れを 1マスとして 読むと 左上★（暗黙の交差）', () => {
    const h = 作る(); h.打つ('E1', '=A1:A3');
    h.打つ('G1', '=E1*10');
    同じ(h.字('G1'), '10', '★E1 は 1 として 読まれる★');
  });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
