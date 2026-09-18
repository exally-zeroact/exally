/* tsunaida-ato-no-mikomi.mjs -- ★㋑の 後の 数を ★先に★ 出す★（2026-09-18）
 *
 *  ★★なぜ 要るか★★
 *    私は 門に「★合った 割合が 1,539 → 1,603 に 上がる★」と 書きました。
 *    ⇒★★その 1,603 は ★足し算で 出した 見込み★です★★（1,539 + 64）
 *    ⇒★足し算が 合って いるかは ★1本ずつ 混ぜて みないと 分かりません★★
 *    ⇒★★門に 書く 数は 先に 出して 固定する★★
 *      （記憶「見込みを 出す 前に 道具が 今の 数を 再現できるかを 見る」）
 *
 *  ★★混ぜ方は 2通り 在ります（★答えが 変わります★）★★
 *    ㋐★台が 先★ ... 台が 知って いれば 台の 答え／知らなければ 借り物
 *    ㋑★借り物が 先★ ... 借り物が 答えられれば 借り物／`#NAME?` なら 台
 *    ⇒★★どちらに するかで 数が 違います★★＝★先に 両方 出します★
 *
 *  ★★この 台の 数は 画面の 数では ありません★★
 *    ＝★2つの 出し（TSV）を 紙の 上で 混ぜただけ★です
 *    ＝★本当に そう 動くかは ㋑を 書いて 画面で 押すまで 分かりません★
 *    ⇒★だから「見込み」と 呼びます★
 *
 *  使い方:
 *    node docs/measured/tsunaida-ato-no-mikomi.mjs <dai.tsv> <kyaku.tsv>
 */
import fs from 'node:fs';

const 引数 = process.argv.slice(2);
if (引数.length < 2) {
  console.log('★使い方★ node docs/measured/tsunaida-ato-no-mikomi.mjs <dai.tsv> <kyaku.tsv>');
  process.exit(2);
}
const 読む = (p) => {
  const m = new Map();
  for (const l of fs.readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const c = l.split('\t');
    if (c.length < 3) continue;
    m.set(c[0], { 出: c[1], 正: c[2], 限り: !!c[3] });
  }
  return m;
};
const 台 = 読む(引数[0]);
const 客 = 読む(引数[1]);

const 数か = (x) => /^[-+]?[0-9]*[.]?[0-9]+([eE][-+]?[0-9]+)?$/.test(x);
const 真偽をそろえる = (x) => {
  const s = String(x).trim();
  return /^(TRUE|FALSE)$/i.test(s) ? s.toUpperCase() : s;
};
const 合うか = (出, 正) => {
  if (真偽をそろえる(出) === 真偽をそろえる(正)) return true;
  if (数か(出) && 数か(正)) {
    const a = Number(出); const b = Number(正);
    return Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);
  }
  return false;
};
const 知らない = (x) => String(x).trim() === '#NAME?';

let 分母 = 0;
let 今 = 0;
let 台が先 = 0;
let 借りが先 = 0;
const 上がる = [];
const 下がる = [];
for (const [式, d] of 台.entries()) {
  const k = 客.get(式);
  if (!k) continue;
  分母 += 1;
  /* ★測り道具の 限りで 落ちた 行は ★本物では 読めます★★
     ⇒★台の 答えは「合う」と して 混ぜます★（`osu-dai-dake.mjs` が 名指しで 許した 行） */
  const 台が合う = d.限り ? true : 合うか(d.出, d.正);
  const 客が合う = 合うか(k.出, k.正);
  if (客が合う) 今 += 1;

  /* ㋐台が 先 ... 台が 知って いれば 台／知らなければ 借り物 */
  const a = 知らない(d.出) ? 客が合う : 台が合う;
  if (a) 台が先 += 1;
  /* ㋑借り物が 先 ... 借り物が `#NAME?` なら 台／それ以外は 借り物 */
  const b = 知らない(k.出) ? 台が合う : 客が合う;
  if (b) 借りが先 += 1;

  if (a && !客が合う) 上がる.push({ 式, 台: d.出, 客: k.出, 正: d.正 });
  if (!a && 客が合う) 下がる.push({ 式, 台: d.出, 客: k.出, 正: d.正 });
}

console.log('');
console.log('[tsunaida-ato-no-mikomi] ★㋑の 後の 数（★見込み★）★');
console.log('  ★合わせた 分母 ... ' + 分母 + '本★（★同じ 式は 1本に して います★）');
console.log('');
console.log('  ★今（借り物だけ）★ ................. ' + 今 + ' / ' + 分母);
console.log('  ★★㋐台が 先★★ ................... ' + 台が先 + ' / ' + 分母
  + '   （' + (台が先 - 今 >= 0 ? '+' : '') + (台が先 - 今) + '）');
console.log('  ★㋑借り物が 先★ ................... ' + 借りが先 + ' / ' + 分母
  + '   （' + (借りが先 - 今 >= 0 ? '+' : '') + (借りが先 - 今) + '）');
console.log('');
console.log('  ★★台が 先に した 時に 上がる ... ' + 上がる.length + '本★★');
console.log('  ★★台が 先に した 時に 下がる ... ' + 下がる.length + '本★★');
const 名 = (f) => { const m = /^=([A-Z0-9_.]+)\(/.exec(f); return m ? m[1] : '(不明)'; };
const 束 = (xs) => {
  const m = new Map();
  for (const x of xs) m.set(名(x.式), (m.get(名(x.式)) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
if (上がる.length) {
  console.log('');
  console.log('  ★上がる 物を 関数ごとに★');
  for (const [n, c] of 束(上がる)) console.log('    ' + n.padEnd(14) + ' ... ' + c + '本');
}
if (下がる.length) {
  console.log('');
  console.log('  ★★下がる 物 全部（★これが 出たら 繋げません★）★★');
  for (const x of 下がる) {
    console.log('    ' + x.式.slice(0, 92));
    console.log('        台 ' + String(x.台).slice(0, 24)
      + ' ／借り物 ' + String(x.客).slice(0, 24) + ' ／実Excel ' + String(x.正).slice(0, 24));
  }
}
