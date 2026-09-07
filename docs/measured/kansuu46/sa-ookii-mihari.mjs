/* atta-noni-ji-ga-chigau.mjs — ★『合った』の うち ★字が 違う★ 行は 何本か★（2026-09-08）
 *
 *  ★★指示役 2026-09-08 の 問い★★
 *    「`=LINEST(A1:A5,B1:B5)` は 実Excel ★0.49999999999999994★／うち ★0.5★
 *      なのに 判定は『合った』＝★字は 違う のに 合った★」
 *    ⇒「★『合った』は どう 決めていますか★」
 *
 *  ★★答え（道具の 中の 1行）★★
 *    `mae-ato.mjs` の `同じか`:
 *      ・型が Double … ★数に して 引き算し、相対 1e-9 以内なら 合った★
 *      ・型が Boolean … ★大文字小文字を 無視して 比べる★
 *      ・それ以外 …… ★字が 同じ か★
 *    ⇒★★だから Double の 行は ★字が 違っても『合った』に なります★★
 *
 *  ★★なぜ 大きいか（指示役）★★
 *    ⇒★IM系で 見つけた 病気（★字が 違う★）は
 *      ★字を 返す 関数だから 見つかった★
 *    ⇒★★数を 返す 関数では ★同じ 病気が 全部 隠れて いる★★
 *
 *  ★これは 数えるだけ／1行も 直さない★
 *
 *  使い方: node atta-noni-ji-ga-chigau.mjs <repo>
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.argv[2];
const require_ = createRequire(path.join(ROOT, 'package.json'));

globalThis.HF_ERR = {
  DIV_BY_ZERO: '#DIV/0!', NUM: '#NUM!', NA: '#N/A', VALUE: '#VALUE!',
  REF: '#REF!', NAME: '#NAME?', CYCLE: '#CYCLE!', NULL: '#NULL!',
  SPILL: '#SPILL!', GETTING_DATA: '#GETTING_DATA',
};

const HFns = require_(path.join(ROOT, 'hyperformula.full.min.js'));
const EF = require_(path.join(ROOT, 'exally-formula.js'));
EF.registerExallyFunctions(HFns);
const HF0 = HFns.HyperFormula;
const H = Object.assign(Object.create(HF0), HFns,
  { registerFunctionPlugin: HF0.registerFunctionPlugin.bind(HF0) });
for (const n of ['extra', 'nokori', 'kane']) {
  require_(path.join(ROOT, 'lib/formula-' + n + '-plug.js'))
    .つなぐ(H, require_(path.join(ROOT, 'lib/formula-' + n + '.js')));
}
require_(path.join(ROOT, 'lib/formula-yosoku-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-yosoku.js')),
    () => ({ シート数: 1, 版: 'Exally', 台: 'win', OS: '', 左上: '$A$1' }));
try {
  require_(path.join(ROOT, 'lib/formula-complex-plug.js'))
    .つなぐ(H, require_(path.join(ROOT, 'lib/formula-complex.js')));
} catch (e) { /* 無い 置き場も 在る */ }

const hf = HF0.buildEmpty({ licenseKey: 'gpl-v3', useArrayArithmetic: true, smartRounding: false });
const SID = hf.getSheetId(hf.addSheet('S'));
EF.initExallyFormula(hf);

{
  hf.setSheetContent(SID, [['=1/0']]);
  const 出 = String(EF._hfGetDisplay(0, 0, 0, true));
  if (出 !== '#DIV/0!') { console.error('★出口が 効いていません★ … ' + 出); process.exit(3); }
  console.error('  出口の 門 … ○');
}

function 土台() {
  const 表 = [];
  for (let r = 0; r < 8; r++) 表.push(new Array(22).fill(null));
  for (let r = 0; r < 5; r++) { 表[r][0] = r + 1; 表[r][1] = (r + 1) * 2; }
  表[0][2] = 0; 表[1][2] = 3; 表[2][2] = 0.1; 表[3][2] = 0.2; 表[4][2] = 1;
  表[0][3] = '=DATE(2024,1,1)'; 表[1][3] = '=DATE(2026,1,1)';
  表[0][5] = '名'; 表[0][6] = '組'; 表[0][7] = '数'; 表[0][8] = '日';
  表[1][5] = 'あ'; 表[1][6] = 'X'; 表[1][7] = 10; 表[1][8] = 1;
  表[2][5] = 'い'; 表[2][6] = 'X'; 表[2][7] = 20; 表[2][8] = 2;
  表[0][10] = '組'; 表[1][10] = 'X'; 表[0][12] = '名'; 表[1][12] = 'あ';
  表[0][15] = -100; 表[1][15] = 30; 表[2][15] = 40; 表[3][15] = 50; 表[4][15] = 20;
  return 表;
}
const 押す = (式) => {
  try {
    const js = EF._jsComputeFormula(0, 式);
    if (js !== null && js !== undefined) return String(js);
  } catch (e) { /* engine へ */ }
  try {
    const 表 = 土台();
    表[0][20] = EF.convertFormula(式);
    hf.setSheetContent(SID, 表);
    return String(EF._hfGetDisplay(0, 0, 20, true));
  } catch (e) { return '★例外★'; }
};

/* ★今の 判定（mae-ato.mjs と 同じ）★ */
const 同じか = (出, 正, 型) => {
  const s = String(出);
  if (型 === 'Double') {
    const a = Number(出), b = Number(正);
    if (!isFinite(a) || !isFinite(b)) return s === 正;
    if (a === b) return true;
    const 大 = Math.max(Math.abs(a), Math.abs(b));
    return Math.abs(a - b) <= (大 > 1 ? 大 * 1e-9 : 1e-9);
  }
  if (型 === 'Boolean') return s.toUpperCase() === String(正).toUpperCase();
  return s === 正;
};

const 歩く = (d, ext, 出 = []) => {
  let es = [];
  try { es = fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }); } catch (e) { return 出; }
  for (const e of es) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) 歩く(p, ext, 出);
    else if (ext.some((x) => e.name.endsWith(x))) 出.push(p);
  }
  return 出;
};
const 紙たち = 歩く('docs/measured', ['.tsv'])
  .filter((p) => /golden-/.test(p.split(path.sep).join('/')));

const さいころ = /^(NOW|TODAY|RAND|RANDBETWEEN|RANDARRAY)$/;
let 合った = 0, 字も同じ = 0, 真偽の書き方 = 0;
const 差1以上 = [], 差001以上 = [];
const 字が違う = [], 小文字のe = [];
for (const p of 紙たち) {
  for (const l of fs.readFileSync(path.join(ROOT, p), 'utf-8').split('\n')) {
    if (!l || l.startsWith('#')) continue;
    const c = l.split('\t');
    if (c.length < 3) continue;
    const 名 = String(c[0] || '').trim();
    const 式 = String(c[1] || '').trim();
    const 正 = String(c[2] || '').trim();
    const 型 = String(c[3] || '').trim();
    if (!/^[A-Z][A-Z0-9._]*$/.test(名) || !式.startsWith('=')) continue;
    if (さいころ.test(名)) continue;
    const 出 = 押す(式);
    if (!同じか(出, 正, 型)) continue;
    合った++;
    /* ★★指示役 2026-09-08 … お金で 聞かれた★★
       「1e-9 × 1,000,000,000円 ＝ ★1円★」
       ⇒★★『合った』の 中に ★差が 1 以上★の 行が 在るか★★ */
    {
      const a = Number(出), b = Number(正);
      if (isFinite(a) && isFinite(b)) {
        const d = Math.abs(a - b);
        if (d >= 1) 差1以上.push({ 名, 式, 正, 出: String(出), 差: d });
        else if (d >= 0.01) 差001以上.push({ 名, 式, 正, 出: String(出), 差: d });
      }
    }
    if (String(出) === 正) { 字も同じ++; continue; }
    /* ★★分ける★★（指示役 2026-09-08 の 問いに 答える為）
       ・Boolean … 金の紙は `True`／画面は `TRUE`＝★金の紙の 書き方★（defect では ない）
       ・★小文字の e★ … `1.660538782e-24`／実Excel は `E`＝★幅に よらない 本物の 違い★
       ・その他の Double … 金の紙は ★.Value2＝中の 値★＝★画面の 字では ない★
         ⇒★比べている 物が 違う＝defect とは 言えない★ */
    const s2 = String(出);
    if (型 === 'Boolean') { 真偽の書き方++; continue; }
    if (/e[-+]?\d/.test(s2) && /E[-+]?\d/.test(正)) { 小文字のe.push({ 名, 式, 正, 出: s2 }); continue; }
    字が違う.push({ 名, 式, 正, 出: s2, 型 });
  }
}

const 個 = (a) => new Set(a.map((x) => x.名)).size;
console.log('★★『合った』の うち ★差が 大きい 行★（お金の 見張り）★★');
console.log('  ★★差が 1 以上 …… ' + 差1以上.length + '本★★  ←★1円 以上 ずれても『合った』★');
for (const x of 差1以上.slice(0, 20)) {
  console.log('    ' + x.名.padEnd(14) + x.式.padEnd(30) + ' 差 ' + x.差
    + '  実Excel ' + x.正 + ' ／ うち ' + x.出);
}
console.log('  ★差が 0.01 以上 1 未満 … ' + 差001以上.length + '本★');
for (const x of 差001以上.slice(0, 8)) {
  console.log('    ' + x.名.padEnd(14) + x.式.padEnd(30) + ' 差 ' + x.差);
}
console.log('');
console.log('★『合った』の うち 字が 違う 行を 数えた★');
console.log('  ★いつの 紙か★ 2026-09-08（golden ' + 紙たち.length + '枚）');
console.log('');
console.log('  ★『合った』…………………… ' + 合った + '本★');
console.log('    ★字も 同じ ……………… ' + 字も同じ + '本★');
console.log('    ★真偽の 書き方（True/TRUE）… ' + 真偽の書き方 + '本★（★金の紙の 書き方＝defect では ない★）');
console.log('    ★★小文字の e（実Excel は E）… ' + 小文字のe.length + '本（関数 ' + 個(小文字のe) + '個）★★  ←★幅に よらない 本物の 違い★');
console.log('    ★その他（金の紙は .Value2＝中の 値）… ' + 字が違う.length + '本（関数 ' + 個(字が違う) + '個）★');
console.log('      ⇒★★比べている 物が 違う＝★画面の 字は 1度も 測っていない★★');
console.log('');
const 型ごと = {};
for (const x of 字が違う) 型ごと[x.型] = (型ごと[x.型] || 0) + 1;
console.log('  ★型ごと★ ' + Object.keys(型ごと).map((k) => k + ' ' + 型ごと[k] + '本').join(' ／ '));
console.log('');
if (小文字のe.length) {
  console.log('★★小文字の e の 行（関数ごと）★★');
  const b = {};
  for (const x of 小文字のe) (b[x.名] = b[x.名] || []).push(x);
  for (const n of Object.keys(b).sort()) {
    console.log('  ' + n.padEnd(16) + String(b[n].length).padStart(4) + '本   例 ' + b[n][0].式.slice(0, 26));
    console.log('      実Excel ' + b[n][0].正 + ' ／ うち ' + b[n][0].出);
  }
  console.log('');
}
console.log('★その他（.Value2 と 比べている 行・関数ごと・上から 12個）★');
const 束 = {};
for (const x of 字が違う) (束[x.名] = 束[x.名] || []).push(x);
const 並 = Object.keys(束).sort((a, b) => 束[b].length - 束[a].length);
for (const n of 並.slice(0, 12)) {
  console.log('  ' + n.padEnd(16) + String(束[n].length).padStart(4) + '本   例 ' + 束[n][0].式.slice(0, 26));
  console.log('      実Excel ' + 束[n][0].正 + ' ／ うち ' + 束[n][0].出);
}
if (並.length > 12) console.log('  …（ほか ' + (並.length - 12) + '個）');
