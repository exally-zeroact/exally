/* yonketa-kazoku.mjs — ★『4桁で 切る』の 家族を 数える★（2026-09-08・★数えるだけ★）
 *
 *  ★★指示役 2026-09-08 の 注文★★
 *    「★実Excel の 答えは 小数が 5桁以上／うちの 答えは ★ちょうど 4桁★★ の 行を 全部 出す」
 *    ★なぜ 急ぐか★
 *      ⇒★お金の 関数は ★705本 測って「合った」と 出ている★★
 *      ⇒★でも その 705本の 中に ★小数 4桁以下の 答えしか 無かった★なら
 *        ★この 病気は 隠れた まま★＝★『合った 705本』が 嘘かもしれない★★
 *
 *  ★測り方★
 *    ①金の紙（golden 全部）を なめる
 *    ②Exally を ★本番と 同じ 入口と 出口★で 押す
 *    ③実Excel の 小数の 桁 と うちの 小数の 桁 を 数える
 *    ⇒★『実Excel 5桁以上 かつ うち ちょうど 4桁』★を 出す
 *    ⇒ ついでに ★うちの 桁が 実Excel より 少ない 行 全部★も 数える（★家族の 上限★）
 *
 *  ★★これは 数えるだけ／1行も 直さない★★
 *
 *  使い方: node yonketa-kazoku.mjs <repo>
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

/* ★門★＝出口が 効いているか 先に 1本 押す */
{
  hf.setSheetContent(SID, [['=1/0']]);
  const 出 = String(EF._hfGetDisplay(0, 0, 0, true));
  if (出 !== '#DIV/0!') { console.error('★出口が 効いていません★ … ' + 出); process.exit(3); }
  console.error('  出口の 門 … ○（#DIV/0!）');
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

/* ★小数の 桁を 数える★（指数は 別扱い＝数えない） */
const 桁 = (s) => {
  const t = String(s).trim();
  if (/[eE]/.test(t)) return -1;
  const m = t.match(/^-?\d+\.(\d+)$/);
  return m ? m[1].length : 0;
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
const ちょうど4桁 = [], 桁が少ない = [];
let 行数 = 0, 数の行 = 0;
for (const p of 紙たち) {
  for (const l of fs.readFileSync(path.join(ROOT, p), 'utf-8').split('\n')) {
    if (!l || l.startsWith('#')) continue;
    const c = l.split('\t');
    if (c.length < 3) continue;
    const 名 = String(c[0] || '').trim();
    const 式 = String(c[1] || '').trim();
    const 正 = String(c[2] || '').trim();
    if (!/^[A-Z][A-Z0-9._]*$/.test(名) || !式.startsWith('=')) continue;
    if (さいころ.test(名)) continue;
    行数++;
    const 正桁 = 桁(正);
    if (正桁 < 5) continue;                 /* ★実Excel が 5桁以上★ の 行だけ */
    数の行++;
    const 出 = 押す(式);
    const 出桁 = 桁(出);
    if (出桁 < 0) continue;                 /* 指数は 別 */
    if (出桁 === 4) ちょうど4桁.push({ 名, 式, 正, 出 });
    else if (出桁 > 0 && 出桁 < 正桁) 桁が少ない.push({ 名, 式, 正, 出, 正桁, 出桁 });
  }
}

const 個 = (a) => new Set(a.map((x) => x.名)).size;
console.log('★『4桁で 切る』の 家族を 数えた★');
console.log('  ★いつの 紙か★ 2026-09-08（golden ' + 紙たち.length + '枚 ／ 数えた 行 ' + 行数 + '）');
console.log('  ★実Excel の 答えが 小数 5桁以上★ … ' + 数の行 + '行');
console.log('');
console.log('  ★★うちが ちょうど 4桁 …… ' + ちょうど4桁.length + '本（関数 ' + 個(ちょうど4桁) + '個）★★');
console.log('  ★うちの 桁が 実Excel より 少ない（4桁 以外も 含む）… ' + 桁が少ない.length + '本（関数 ' + 個(桁が少ない) + '個）★');
console.log('');
if (ちょうど4桁.length) {
  console.log('★★ちょうど 4桁の 行★★');
  const 束 = {};
  for (const x of ちょうど4桁) (束[x.名] = 束[x.名] || []).push(x);
  for (const n of Object.keys(束).sort()) {
    console.log('  ★' + n + '★（' + 束[n].length + '本）');
    for (const x of 束[n].slice(0, 3)) console.log('    ' + x.式.padEnd(34) + ' 実Excel ' + x.正.padEnd(22) + ' ／ うち ' + x.出);
  }
  console.log('');
}
if (桁が少ない.length) {
  console.log('★桁が 少ない 行（4桁 以外）★');
  const 束 = {};
  for (const x of 桁が少ない) if (x.出桁 !== 4) (束[x.名] = 束[x.名] || []).push(x);
  for (const n of Object.keys(束).sort().slice(0, 20)) {
    console.log('  ' + n.padEnd(16) + 束[n].length + '本  例 ' + 束[n][0].式.slice(0, 30)
      + ' 実Excel ' + 束[n][0].正桁 + '桁 ／ うち ' + 束[n][0].出桁 + '桁');
  }
}
