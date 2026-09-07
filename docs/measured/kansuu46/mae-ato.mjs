/* mae-ato.mjs — ★入れる 前と 後で「合った」が 1本も 減っていないか★（2026-09-08）
 *
 *  ★★指示役 2026-09-08 … ここから ★全部の PR に 付ける 条件★★★
 *    「★『何本 直ったか』と『★何本 壊れたか★』は 別の 数です★」
 *    「★数が 動かなかった 時が 一番 危ない＝動いた 数は 誰でも 見る／
 *      ★動かなかった 数は 誰も 見ない★★」
 *
 *  ★使い方★
 *    node mae-ato.mjs <コードの 置き場> <金の紙> <出す先.tsv>
 *      ⇒ 1行 = 式 \t 判定（合った／違う／こちらだけ誤り／名前が通らない）
 *    2回 走らせて（前の コード・後の コード）★行ごとに★ 突き合わせる。
 *
 *  ★測るたび 変わる 関数は 判定しない★（NOW RAND RANDBETWEEN…）
 *    ⇒ 入れても 出しても 数が ±1 ずれて ★何が 起きたか 見えなく なる★
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.argv[2];
const 金道 = process.argv[3];
const 出道 = process.argv[4];
if (!ROOT || !金道 || !出道) {
  console.error('使い方: node mae-ato.mjs <コードの置き場> <金の紙> <出す先.tsv>');
  process.exit(2);
}
const require_ = createRequire(path.join(ROOT, 'package.json'));

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
require_(path.join(ROOT, 'lib/formula-soto-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-soto.js')), {
    取る: async () => { throw new Error('外へ 出ません'); },
    聞く: async () => { throw new Error('AI に 聞きません'); },
    再計算: () => {},
  });
let XML部品 = null;
try {
  const { JSDOM } = require_('jsdom');
  const w = new JSDOM('').window;
  XML部品 = { DOMParser: w.DOMParser, XPathResult: w.XPathResult };
} catch (e) { XML部品 = null; }
require_(path.join(ROOT, 'lib/formula-filterxml-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-filterxml.js')), () => XML部品);
require_(path.join(ROOT, 'lib/formula-cell-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-cell.js')), null);

/* ★★IM系の 字を 直す 物★★（★入っていない 置き場（＝「前」）でも 走るように 包む★）
   ⇒★★これを 積み忘れると「直しが 効かないまま」測る事に なる★★
     ⇒「0本 直る」と 出て ★自分の 直しが 見えない★（＝物差しが 直した物を 見ていない）
   ⇒ だから ★積めたか どうかを 必ず 出す★（下の 一言）*/
let 複素 = '★入っていない★';
try {
  const 数 = require_(path.join(ROOT, 'lib/formula-complex-plug.js'))
    .つなぐ(H, require_(path.join(ROOT, 'lib/formula-complex.js')));
  複素 = 数 ? ('★' + 数 + '個 包んだ★') : '★在るのに 0個＝繋がっていない★';
} catch (e) { /* 「前」の 置き場には まだ 無い＝それで 良い */ }
console.error('  IM系の 字を 直す 物 … ' + 複素);

const hf = HF0.buildEmpty({ licenseKey: 'gpl-v3', useArrayArithmetic: true, smartRounding: false });
const SID = hf.getSheetId(hf.addSheet('Sheet1'));
EF.initExallyFormula(hf);

const 赤の名 = (t) => ({
  NA: '#N/A', DIV_BY_ZERO: '#DIV/0!', VALUE: '#VALUE!', NUM: '#NUM!',
  NAME: '#NAME?', REF: '#REF!', CYCLE: '#CYCLE!', ERROR: '#ERROR!', SPILL: '#SPILL!',
}[t] || ('#' + t));

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
  } catch (e) { /* engine へ */ }
  try {
    const 表 = 土台();
    表[0][7] = 後;
    hf.setSheetContent(SID, 表);
    const v = hf.getCellValue({ sheet: SID, row: 0, col: 7 });
    if (v && v.type) return 赤の名(v.type);
    return v;
  } catch (e) { return '★engine で 例外★'; }
}

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

const さいころ = /^(NOW|TODAY|RAND|RANDBETWEEN|RANDARRAY)$/;
const 金 = fs.readFileSync(金道, 'utf-8')
  .split('\n').filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split('\t')).filter((p) => p.length === 4)
  .map((p) => ({ 名: p[0], 式: p[1], 答: p[2], 型: p[3] }));

const 行 = [];
let 数えた = 0;
for (const g of 金) {
  if (さいころ.test(g.名)) { 行.push(g.式 + '\t★数えない★'); continue; }
  数えた++;
  const 出 = 押す(g.式);
  const s = String(出);
  let 判定;
  if (s === '#NAME?') 判定 = '名前が通らない';
  else if (同じか(出, g.答, g.型)) 判定 = '合った';
  else if (/^#|^★/.test(s)) 判定 = 'こちらだけ誤り';
  else 判定 = '違う';
  行.push(g.式 + '\t' + 判定 + '\t' + s);
}
fs.writeFileSync(出道, 行.join('\n') + '\n', { encoding: 'utf-8' });
const 合 = 行.filter((l) => l.split('\t')[1] === '合った').length;
console.log('書いた ' + 出道 + ' … 判定した ' + 数えた + '本 ／ 合った ' + 合 + '本');
