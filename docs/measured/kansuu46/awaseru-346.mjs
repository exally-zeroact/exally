/* awaseru-346.mjs — ★実Excel の 3,599本と Exally を 1本ずつ 突き合わせる★（2026-09-08）
 *
 *  ★★司さん 2026-09-08「答え確かめて」★★
 *    『名前が 通った』の うち ★答えを 1度も 確かめていなかった 346個★を 測る。
 *
 *  ★実Excel の 答え★ `golden-346-2026-09-08.tsv`
 *    ★引数の 形は 実Excel が 選んだ★（誤りに ならなかった 形を 全部）
 *    ⇒★人が 決めたのは 形の 候補だけ★
 *
 *  ★★押す 道は 本番と 同じ★★
 *    JS層 → convertFormula → HyperFormula（★プラグインも 本番と 同じ 全部★）
 *
 *  ★★数える 時の 決まり★★
 *    ・★合った★ … 実Excel と 同じ 答え
 *    ・★違う★ … ★これが 本命★（＝★それらしい 数を 出している★）
 *    ・★名前が 通らない★ … #NAME?（★台帳が 嘘★＝「動く」と 言っていたのに 動かない）
 *    ・★誤りで 揃った★ … 両方 同じ 誤り＝合っている
 *
 *  使い方: node docs/measured/kansuu46/awaseru-346.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..', '..', '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));

const HFns = require_(path.join(ROOT, 'hyperformula.full.min.js'));
const EF = require_(path.join(ROOT, 'exally-formula.js'));
const 積1 = EF.registerExallyFunctions(HFns) === true;
const HF0 = HFns.HyperFormula;
const H = Object.assign(Object.create(HF0), HFns,
  { registerFunctionPlugin: HF0.registerFunctionPlugin.bind(HF0) });
/* ★本番と 同じ 物を 積む★（片方 忘れると 全部 #NAME? に なって ★偽の 赤★） */
const 積 = [];
for (const n of ['extra', 'nokori', 'kane']) {
  積.push(require_(path.join(ROOT, 'lib/formula-' + n + '-plug.js'))
    .つなぐ(H, require_(path.join(ROOT, 'lib/formula-' + n + '.js'))));
}
積.push(require_(path.join(ROOT, 'lib/formula-yosoku-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-yosoku.js')),
    () => ({ シート数: 1, 版: 'Exally', 台: 'win', OS: '', 左上: '$A$1' })));
積.push(require_(path.join(ROOT, 'lib/formula-soto-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-soto.js')), {
    取る: async () => { throw new Error('外へ 出ません'); },
    聞く: async () => { throw new Error('AI に 聞きません'); },
    再計算: () => {},
  }));
let XML部品 = null;
try {
  const { JSDOM } = require_('jsdom');
  const w = new JSDOM('').window;
  XML部品 = { DOMParser: w.DOMParser, XPathResult: w.XPathResult };
} catch (e) { XML部品 = null; }
積.push(require_(path.join(ROOT, 'lib/formula-filterxml-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-filterxml.js')), () => XML部品));
積.push(require_(path.join(ROOT, 'lib/formula-cell-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-cell.js')), null));

const hf = HF0.buildEmpty({ licenseKey: 'gpl-v3', useArrayArithmetic: true, smartRounding: false });
const SID = hf.getSheetId(hf.addSheet('Sheet1'));
EF.initExallyFormula(hf);

const 赤の名 = (t) => ({
  NA: '#N/A', DIV_BY_ZERO: '#DIV/0!', VALUE: '#VALUE!', NUM: '#NUM!',
  NAME: '#NAME?', REF: '#REF!', CYCLE: '#CYCLE!', ERROR: '#ERROR!', SPILL: '#SPILL!',
}[t] || ('#' + t));

/* ★実Excel を 測った 時と 同じ 材料★ */
function 土台() {
  const 表 = [];
  for (let r = 0; r < 6; r++) 表.push([null, null, null, null, null, null, null, null]);
  表[0][0] = 1; 表[1][0] = 2; 表[2][0] = 3; 表[3][0] = 4; 表[4][0] = 5;
  表[0][1] = 2; 表[1][1] = 4; 表[2][1] = 6; 表[3][1] = 8; 表[4][1] = 10;
  表[0][3] = '=DATE(2024,1,1)';
  表[1][3] = '=DATE(2026,1,1)';
  return 表;
}
function 押す(式) {
  let 後;
  try { 後 = EF.convertFormula(式); } catch (e) { return '★書き換えで 例外★'; }
  try {
    const js = EF._jsComputeFormula(0, 式);
    if (js !== null && js !== undefined) return js;
  } catch (e) { /* JS層が 投げた＝engine へ */ }
  try {
    const 表 = 土台();
    表[0][7] = 後;
    hf.setSheetContent(SID, 表);
    const v = hf.getCellValue({ sheet: SID, row: 0, col: 7 });
    if (v && v.type) return 赤の名(v.type);
    return v;
  } catch (e) { return '★engine で 例外★'; }
}

const 金 = fs.readFileSync(path.join(ここ, 'golden-346-2026-09-08.tsv'), 'utf-8')
  .split('\n').filter((l) => l && !l.startsWith('#'))
  .map((l) => { const p = l.split('\t'); return { 名: p[0], 式: p[1], 答: p[2], 型: p[3] }; });

const 同じか = (出, 正, 型) => {
  if (出 === null || 出 === undefined) return 正 === '';
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

/* ★★2026-09-08 に 足した＝★数が 測るたび ±1 ずれていた★★
   ⇒ 訳 … RANDBETWEEN(D1,D2) が ★たまたま★ 実Excel の 値と 一致する 回が 在る
   ⇒ ★実際に 起きた★ 続けて 2回 走らせて 合った=3223／3224 と 割れた
   ⇒★毎回 同じ 数が 出ない 紙は ★証拠に ならない★★
   ⇒ だから ★測るたび 変わる 関数は 先に 外へ 出す★（数に 入れない） */
const さいころ = /^(NOW|TODAY|RAND|RANDBETWEEN|RANDARRAY)$/;

const 分け = { 合った: [], 違う: [], 名前が通らない: [], こちらだけ誤り: [], 測るたび変わる: [] };
for (const g of 金) {
  if (さいころ.test(g.名)) { 分け.測るたび変わる.push(g); continue; }
  const 出 = 押す(g.式);
  const s = String(出);
  if (s === '#NAME?') { 分け.名前が通らない.push(g); continue; }
  if (同じか(出, g.答, g.型)) { 分け.合った.push(g); continue; }
  if (/^#|^★/.test(s)) { 分け.こちらだけ誤り.push({ ...g, 出: s }); continue; }
  分け.違う.push({ ...g, 出: s });
}

const 名で数える = (a) => new Set(a.map((x) => x.名)).size;
const 行 = [];
const 言う = (s) => { 行.push(s); console.log(s); };
言う('# ★実Excel の 答えと Exally を 1本ずつ 突き合わせた★（2026-09-08）');
言う('');
言う('★司さん 2026-09-08「答え確かめて」★');
言う('★押した 道★ JS層 → convertFormula → engine（★本番と 同じ★）');
言う('★積んだ プラグイン★ ' + 積.join(' / ') + '（exally-formula ' + (積1 ? '○' : '×') + '）');
言う('');
言う('★式 ' + 金.length + '本 ／ 関数 ' + 名で数える(金) + '個★');
言う('  ★数えない ' + 分け.測るたび変わる.length + '本★（' +
  [...new Set(分け.測るたび変わる.map((x) => x.名))].sort().join(' ') +
  '＝★測るたび 変わる★ので 合う/合わないが 決まらない）');
言う('  ⇒ 数える のは ' + (金.length - 分け.測るたび変わる.length) + '本');
言う('');
言う('  ★合った ……………………… ' + 分け.合った.length + '本（関数 ' + 名で数える(分け.合った) + '個）★');
言う('  ★★違う（それらしい 数を 出している）… ' + 分け.違う.length + '本（関数 ' + 名で数える(分け.違う) + '個）★★');
言う('  ★こちらだけ 誤り ………… ' + 分け.こちらだけ誤り.length + '本（関数 ' + 名で数える(分け.こちらだけ誤り) + '個）★');
言う('  ★名前が 通らない ………… ' + 分け.名前が通らない.length + '本（関数 ' + 名で数える(分け.名前が通らない) + '個）★');
言う('    ⇒★台帳が「動く」と 言っていたのに #NAME?＝★台帳が 嘘★★');
言う('');
言う('★★違う（一番 悪い＝黙って 間違った 数を 出している）★★');
const 違う名 = {};
for (const x of 分け.違う) { (違う名[x.名] = 違う名[x.名] || []).push(x); }
for (const 名 of Object.keys(違う名).sort()) {
  言う('  ★' + 名 + '★（' + 違う名[名].length + '本）');
  for (const x of 違う名[名].slice(0, 3)) 言う('    ' + x.式 + '   正 ' + x.答 + ' ／ 出 ' + x.出);
}
言う('');
言う('★名前が 通らない 関数★');
言う('  ' + [...new Set(分け.名前が通らない.map((x) => x.名))].sort().join(' '));
言う('');
言う('★こちらだけ 誤り（関数ごと 先頭 1本）★');
const 誤り名 = {};
for (const x of 分け.こちらだけ誤り) { if (!誤り名[x.名]) 誤り名[x.名] = x; }
for (const 名 of Object.keys(誤り名).sort()) {
  言う('  ' + 名 + '   ' + 誤り名[名].式 + '   正 ' + 誤り名[名].答 + ' ／ 出 ' + 誤り名[名].出);
}

fs.writeFileSync(path.join(ここ, 'awaseru-346.txt'), 行.join('\n') + '\n', { encoding: 'utf-8' });
console.log('\n★書いた … docs/measured/kansuu46/awaseru-346.txt★');
