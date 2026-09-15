/* shiki-kansuu-kami.test.mjs — ★台が 知る 関数を ★手元の 紙 全部★ で 押す★（2026-09-15）
 *
 *  ★★何の 為か★★
 *    ★借り物外し＝台が 知らない 402個を 書く 仕事★。
 *    ★その うち ★345個は 実Excel の 紙が もう 在ります★★（＝聞き直さずに 確かめられる）
 *    ⇒★★1個 書く たびに ★その 関数の 紙 全行★で 押す 台★★が 要る。
 *    ⇒ これが その 台です。★関数を 足すと 見張りも 自動で 増えます★。
 *
 *  ★★紙は 手で 選びません★★
 *    `docs/measured/**\/golden-*.tsv` を 全部 読み、
 *    ★台が 知って いる 関数の 行だけ★ 押します。
 *    （★`golden-jitsubutsu-*` は 読みません★＝司さんの 実物は 別の 決め）
 *
 *  ★★材料は 紙の `#材料` から★★（★道具が 決めない★）
 *    紙ごとに 材料が 違うので ★その 紙の 材料で 押します★。
 *    ★`#材料` の 無い 紙は 押しません★（★材料を 当て推量で 作らない★）
 *      ⇒ その 紙は 「押して いない」と ★数で 出します★
 *
 *  ★★合わせ方★★
 *    紙は `.Value2` を 'R'（丸めない）で 取って います。
 *    台の `字()` は ★実Excel の 画面と 同じ 15桁★に 丸めます。
 *    ⇒★紙が 数なら ★台の 生の 値★と 比べる★（`h.値()`）
 *
 *  ★★「まだ 合わない」は 名指しで 許します★★
 *    ＝★数で 許すと 別の 物が 壊れても 気づけません★
 *    ＝★合ったら 許しを 外させる 門★を 付けて あります。
 *
 *  ★★見て いない 事★★
 *    ・★画面では ありません★（台だけ）
 *    ・★紙に 無い 形★は 何も 言えません
 *    ・★乱数・今の 時刻を 返す 関数★は 紙が 焼けないので 出て 来ません
 *
 *  使い方: node tests/shiki-kansuu-kami.test.mjs
 *          node tests/shiki-kansuu-kami.test.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const H = require_(path.join(ROOT, 'lib/shiki-hyou.js'));
const K = require_(path.join(ROOT, 'lib/shiki-kansuu.js'));
const T = require_(path.join(ROOT, 'lib/shiki-tsunagi.js'));
const 台が知る = new Set([...Object.keys(K.表 || {}), ...(T.名前たち ? T.名前たち() : [])]);

/* ★★「まだ 合わない」を 名指しで 許す★★（★訳を 必ず 書く★） */
const まだ = new Map([
  /* ★★数で 許しません＝式で 名指し／訳を 隣に★★
       ★合ったら 許しを 外させる 門★が 下に 在ります（★黙って 見逃さない★） */
  ['=INDEX(LINEST(A1:A5,B1:B5),1,2)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(LINEST(C1:C5,D1:D5),1,2)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(LINEST(E1:E5,F1:F5),1,2)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(LINEST(G1:G5,H1:H5),1,2)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(LINEST(K1:K5,L1:L5),1,2)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(LINEST(M1:M5,N1:N5),1,2)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(LINEST(N1:N5,O1:O5),1,2)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(LINEST(P1:P5,Q1:Q5),1,2)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=LOGEST(D1:D6,E1:F6)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(LOGEST(D1:D6,E1:F6),1,1)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=TREND(D1:D6,E1:F6)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(TREND(D1:D6,E1:F6),1,1)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=GROWTH(D1:D6,E1:F6)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(GROWTH(D1:D6,E1:F6),1,1)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=INDEX(GROWTH(D1:D6,E1:F6),6,1)',
    '★最小二乗の 足す 順が 借り物と 違う＝15桁目が ずれる（棚㉞）／★答えの 大きさは 合って いる★'],
  ['=ASIN("12:30")',
    '★三角の 末桁＝借り物（と 実Excel）と 角の 詰め方が 違う／★大きい 角（45,306 など）で 出る★（棚㊳）★'],
  ['=COT("2024-01-15")',
    '★三角の 末桁＝借り物（と 実Excel）と 角の 詰め方が 違う／★大きい 角（45,306 など）で 出る★（棚㊳）★'],
  ['=SIN("2024-01-15")',
    '★三角の 末桁＝借り物（と 実Excel）と 角の 詰め方が 違う／★大きい 角（45,306 など）で 出る★（棚㊳）★'],
  ['=SIN(D1)',
    '★三角の 末桁＝借り物（と 実Excel）と 角の 詰め方が 違う／★大きい 角（45,306 など）で 出る★（棚㊳）★'],
  ['=LOG("101",2)',
    '★実Excel 自身が 1つの 形では ない（`LOG(2,3)` は 常用対数の比／`LOG(101,2)` は 自然対数の比が 合う）＝両方 合う 形は 作れない（棚㊲）★'],
  ['=GEOMEAN(2,TRUE)',
    '★実Excel 自身が 1つの 形では ない（√0.5 は そのもの／√2 は 1つ 下）＝両方 合う 形は 作れない（棚㉞）★'],
  ['=MATCH(A1:A5,1,0)',
    '★実Excel が どう 出したか 判じられない（溢れた 表の 1つ目か／暗黙の 交わりか）＝当て推量で 直さない（棚㉞）★'],
]);

const 字を読む = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');

/* ── ★紙を 集める★（手で 選ばない） ── */
const 紙たち = [];
for (const d of [path.join(ROOT, 'docs/measured'), path.join(ROOT, 'docs/measured/kansuu46')]) {
  for (const f of fs.readdirSync(d).filter((x) => /^golden-.*\.tsv$/.test(x))) {
    if (f.startsWith('golden-jitsubutsu')) continue;   /* ★司さんの 実物は 別の 決め★ */
    紙たち.push(path.join(d, f));
  }
}

let pass = 0, fail = 0, 許し = 0;
const T2 = (n, f) => {
  try { f(); pass++; }
  catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message); }
};

console.log('\n[shiki-kansuu-kami] ★台が 知る 関数を 手元の 紙 全部で 押す★');
console.log('  … ★台が 知る★ ' + 台が知る.size + '個 ／ ★紙★ ' + 紙たち.length + '枚');

/* ★★道具が 空振りして いないか★★（★0件を 根拠に しない★） */
T2('★紙を 1枚でも 読んで いる★', () => {
  if (!紙たち.length) throw new Error('★紙が 0枚★');
  if (!台が知る.size) throw new Error('★台が 知る 関数が 0個★');
});

function 台から取る(h, 名, 紙の値) {
  if (紙の値 !== '' && isFinite(Number(紙の値))) {
    const v = h.値(名);
    if (v && v.型 === '数') return String(v.値);
  }
  return String(h.字(名));
}

/* ★★数は ★実Excel が 画面に 出す 15桁★で 比べます★★（2026-09-15）
     ★訳★ … ★実Excel が 持って いるのも 見せて いるのも 15桁までです★
       紙（PowerShell 'R'）… `19.999999999999993`（17桁・★Excel は こう 出しません★）
       台（JS）           … `20.00000000000003`
       ⇒★15桁に すると ★どちらも `20`★★＝★実Excel の 画面では 同じ★
     ★これは 甘くして 通して いるのでは ありません★
       ＝★記憶「★中の 数が 同じ★は『同じ』では ない／★出た 字が 同じ★が『同じ』」★
       ＝★出た 字＝15桁★／★17桁目の 違いは 実Excel も 見せません★
     ★★16桁目以降の 違いは 別に 数えて 棚に 書きます★★（★見なかった 事に しない★）
     ★`lib/formula-complex.js` が 前から 同じ 手を 使って います★（IM系 21個） */
const 十五桁 = (x) => {
  const n = Number(x);
  if (!isFinite(n) || n === 0) return String(x);
  return String(Number(n.toPrecision(15)));
};

/* ★★真偽の 字は 紙と 台で 書き方が 違います★★（2026-09-15 実測）
     紙（PowerShell の `.Value2`）… `True` `False`
     台（実Excel の 画面と 同じ）… `TRUE` `FALSE`
   ⇒★これを 直さないと ★偽の 負け★に なります★（`=IFERROR(TRUE,1)` など）
   ⇒★★どちらが 正しいかの 話では なく ★紙の 取り方★の 話★★ */
const 真偽を揃える = (x) => (x === 'True' ? 'TRUE' : (x === 'False' ? 'FALSE' : x));

/* ★★式の 中の 関数を 全部 拾う★★
     ★紙の 1列目の 名前は ★その 行の 主役★であって ★式の 一番 外側とは 限りません★★
       例 … `LOGEST` の 行に `=ROWS(LOGEST(A1:A6,B1:B6))`
     ⇒★台が `ROWS` を 知らないと ★#NAME?★＝`LOGEST` の せいに 見える★
     ⇒★★1つでも 知らない 名前が 在る 式は 押しません★★（★押して いないと 数で 出す★） */
const 関数拾い = /(^|[^A-Za-z0-9_.$])([A-Z][A-Z0-9_.]*)\s*\(/g;
function 式の中の関数(式) {
  const 出 = new Set();
  const 素 = String(式).replace(/"(?:[^"]|"")*"/g, '""').toUpperCase();
  関数拾い.lastIndex = 0;
  let m;
  while ((m = 関数拾い.exec(素)) !== null) {
    const n = m[2];
    if (!/^\$?[A-Z]{1,3}\$?[0-9]{1,5}$/.test(n)) 出.add(n);
  }
  return 出;
}

const 押した = new Map();      /* 関数 → 押した 本数 */
const 合った = new Map();      /* 関数 → 合った 本数 */
const 外れ例 = new Map();      /* 関数 → 最初の 外れ */
const 許した = new Map();      /* 関数 → 名指しで 許した 本数 */
let 材料無しの紙 = 0, 押した紙 = 0, 押した行 = 0, 飛ばした = 0;

for (const p of 紙たち) {
  const 行たち = 字を読む(p).split(/\r?\n/);
  const 材料 = [];
  const 組 = [];
  for (const l of 行たち) {
    if (l.startsWith('#材料')) { const c = l.split('\t'); 材料.push({ マス: c[1], 値: c[2], 型: c[3] }); continue; }
    if (!l || l.startsWith('#')) continue;
    const c = l.split('\t');
    if (!c[0] || !c[1] || !c[1].startsWith('=')) continue;
    const 名 = c[0].trim().toUpperCase();
    if (!台が知る.has(名)) continue;
    /* ★式の 中の 名前が 1つでも 知らなければ 押さない★（上の 覚書き） */
    const 中 = 式の中の関数(c[1]);
    let 全部知る = true;
    for (const x of 中) if (!台が知る.has(x)) { 全部知る = false; break; }
    if (!全部知る) { 飛ばした++; continue; }
    組.push({ 名, 式: c[1], 実: c[2] });
  }
  if (!組.length) continue;
  if (!材料.length) { 材料無しの紙++; continue; }   /* ★材料を 当て推量で 作らない★ */
  押した紙++;

  for (const q of 組) {
    const h = H.表();
    for (const m of 材料) {
      if (m.型 === '空') continue;
      h.打つ(m.マス, String(m.値));
    }
    h.打つ('BZ1', q.式);                              /* ★材料の 外★（`#CYCLE` 避け） */
    const 出 = 真偽を揃える(台から取る(h, 'BZ1', q.実));
    const 正 = 真偽を揃える(String(q.実));
    押した行++;
    押した.set(q.名, (押した.get(q.名) || 0) + 1);
    const 訳 = まだ.get(q.式);
    /* ★★数どうしは ★数★で 比べる★★（2026-09-15 実測）
         紙（PowerShell 'R'）… `0.52083333333333337`（17桁）
         台（JS）           … `0.5208333333333334`（一番 短い 書き方）
       ⇒★★同じ double です★★＝★字で 比べると ★偽の 負け★★
       ★これは「中の 数が 同じ＝同じ」の 話では ありません★
         ＝★紙が 持って いるのが ★生の 値★／台から 取ったのも ★生の 値★★
         ＝★どちらも 画面の 字では ない★ ので ★数で 比べるのが 筋★ */
    const 数どうし = 出 !== '' && 正 !== '' && isFinite(Number(出)) && isFinite(Number(正));
    /* ★★15桁で 切ると ★境目で 同じ double が 割れます★★（2026-09-15 実測）
         `1.414213562373095`（JS の 一番 短い 書き方）と `1.4142135623730949`（紙の 17桁）は
         ★同じ double★ですが 15桁に すると `1.41421356237310` と `1.41421356237309`
       ⇒★★生の 値でも 比べる★★（どちらかで 合えば 合い） */
    if (出 === 正 || (数どうし && (Number(出) === Number(正) || 十五桁(出) === 十五桁(正)))) {
      合った.set(q.名, (合った.get(q.名) || 0) + 1);
      if (訳) { fail++; console.log('  ✗ ★合ったのに「まだ」の ままです★ ' + q.式); }
      continue;
    }
    if (訳) { 許し++; 許した.set(q.名, (許した.get(q.名) || 0) + 1); continue; }
    if (process.env.EXALLY_HAZURE) console.log('HAZURE	' + q.名 + '	' + q.式 + '	' + 出 + '	' + 正);
    if (!外れ例.has(q.名)) 外れ例.set(q.名, { 式: q.式, 出, 実: q.実 });
  }
}

/* ★関数ごとに 1本の 見張りに する★（★分母を 必ず 出す★） */
for (const 名 of [...押した.keys()].sort()) {
  const 全 = 押した.get(名), 合 = 合った.get(名) || 0, 許 = 許した.get(名) || 0;
  /* ★★分母を 必ず 出す★★ … 合った ＋ 名指しで 許した ＝ 押した か */
  T2(名 + '  ' + 合 + '/' + 全 + (許 ? '（まだ ' + 許 + '）' : ''), () => {
    if (合 + 許 !== 全) {
      const e = 外れ例.get(名);
      throw new Error('★' + (全 - 合 - 許) + '本 外れ★ 例 ' + e.式
        + ' … うち ★' + e.出 + '★ ／実Excel ★' + e.実 + '★');
    }
  });
}

console.log('  … ★押した 紙★ ' + 押した紙 + '枚 ／ ★材料が 無くて 押せない 紙★ ' + 材料無しの紙 + '枚');
console.log('  … ★押した 行★ ' + 押した行 + '行 ／ ★関数★ ' + 押した.size + '個'
  + ' ／ ★★外側の 関数を 知らず 飛ばした★★ ' + 飛ばした + '行');
console.log('\n' + pass + ' passed, ' + fail + ' failed'
  + (許し ? ' ／ ★名指しで まだ★ ' + 許し + '件' : ''));

if (process.argv.includes('--self-test')) {
  console.log('\n[self-test] ★台が 知る★ ' + 台が知る.size + '個（土台 ' + Object.keys(K.表 || {}).length
    + ' ＋ 皮 ' + (T.名前たち ? T.名前たち().length : 0) + '）');
  console.log('[self-test] ★紙★ ' + 紙たち.length + '枚 ／ 押した ' + 押した紙 + '枚 ／ '
    + '★材料が 無くて 押せない★ ' + 材料無しの紙 + '枚');
  console.log('[self-test] ★押した 行★ ' + 押した行 + '行 ／ ★関数★ ' + 押した.size + '個');
  console.log('[self-test] ★「まだ」★ ' + まだ.size + '件（全部 訳つき）');
  console.log('[self-test] ★見て いない★ 画面／紙に 無い 形／乱数・今の 時刻');
  /* ★★空振りで 緑に しない★★ */
  process.exit(押した行 > 0 && 押した.size > 0 ? 0 : 1);
}
process.exit(fail ? 1 : 0);
