/* ★『動く 491個』の 中身を 分ける★（2026-09-07）
 *
 *  ★今の 数え方（kansuu-kabaa の 押す(f)）★
 *    ①JS層が 何か 返す ⇒ 動く
 *    ①JS層が ★投げた★ ⇒ ★動く★  ←★穴A★
 *    ②engine の 答えが ★#NAME? で ない★ ⇒ 動く  ←★穴B（他の 誤りも 全部 緑）★
 *    ③引数の 形を 17通り 試して ★1つでも★ 当たれば 動く
 *
 *  ★ここでは 同じ 押し方で 押して、★何が 返ったか で 分ける★
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

/* ★手元の 絶対の 道を 焼き込まない★（焼き込むと ★手元は 緑・CI だけ 赤★に なる） */
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
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

const hf = HF0.buildEmpty({ licenseKey: 'gpl-v3' });
const SID = hf.getSheetId(hf.addSheet('S'));
EF.initExallyFormula(hf);
const JS層 = EF._jsComputeFormula;

const 候補 = ['(1)', '()', '(A1:A2,1)', '(1,1)', '(A1:A2)', '(1,1,1)', '("a")', '(A1)', '(1,1,1,1)',
  '(A1:B2,1,A1:A2)', '(A1:A2,A1:A2)',
  '(A1:A2,LAMBDA(v,v*2))', '(0,A1:A2,LAMBDA(a,b,a+b))', '(2,2,LAMBDA(r,c,r*c))',
  '(x,2,x*3)', '(x,x+1)', '("<a><b>1</b></a>","//b")'];

/** ★1つの 関数を 17通り 押して 一番 良い 結果を 返す★ */
function 押して分ける(f) {
  let 見た = { 値: false, JS投げ: false, 他の誤り: null, NAME: false };
  for (const a of 候補) {
    const 式 = '=' + f + a;
    if (typeof JS層 === 'function') {
      try {
        const r = JS層(0, 式);
        if (r !== null) {
          /* ★JS層は 字で 返す★＝誤りの 字かも しれない */
          if (typeof r === 'string' && /^#[A-Z/0-9!?]+$/.test(r.trim())) {
            見た.他の誤り = 見た.他の誤り || r.trim();
          } else { 見た.値 = true; return 見た; }
        }
      } catch (e) { 見た.JS投げ = true; }   /* ★今の 数え方は ここで 緑に していた★ */
    }
    let 後; try { 後 = EF.convertFormula(式); } catch (e) { continue; }
    try {
      hf.setSheetContent(SID, [[1, 3], [2, 4], [後]]);
      const v = hf.getCellValue({ sheet: SID, row: 2, col: 0 });
      if (v && v.type) {
        if (v.type === 'NAME') 見た.NAME = true;
        else 見た.他の誤り = 見た.他の誤り || ('#' + v.type);
      } else { 見た.値 = true; return 見た; }
    } catch (e) { /* 投げただけでは 数えない */ }
  }
  return 見た;
}

const 読む = (p) => fs.readFileSync(p, 'utf-8').split('\n')
  .map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
const 全部 = 読む(path.join(ROOT, 'docs/measured/excel-functions-2026-09-06.txt'));
const 動かない台帳 = 読む(path.join(ROOT, 'docs/measured/exally-missing-2026-09-07.txt'));
const 動く = 全部.filter((f) => !動かない台帳.includes(f));

const 棚 = { 値: [], 他の誤りだけ: [], JS投げだけ: [], NAMEだけ: [] };
for (const f of 動く) {
  const r = 押して分ける(f);
  if (r.値) 棚.値.push(f);
  else if (r.他の誤り) 棚.他の誤りだけ.push(f + '(' + r.他の誤り + ')');
  else if (r.JS投げ) 棚.JS投げだけ.push(f);
  else 棚.NAMEだけ.push(f);
}

const 行 = [];
const 言う = (s) => { 行.push(s); console.log(s); };
言う('# ★『動く 491個』の 中身を 分けた★（2026-09-07）');
言う('');
言う('★同じ 押し方（17通りの 引数）で 押して、★何が 返ったか★で 分けた★');
言う('');
言う('★① 値が 返った ………………………………… ' + 棚.値.length + '個');
言う('★② ★誤りしか 返らない★ …………………… ' + 棚.他の誤りだけ.length + '個  ←★穴B で 緑に なっていた★');
言う('★③ ★JS層が 投げただけ★ ………………… ' + 棚.JS投げだけ.length + '個  ←★穴A で 緑に なっていた★');
言う('★④ #NAME? しか 返らない ………………… ' + 棚.NAMEだけ.length + '個  ←★本当は 動かない★');
言う('');
言う('★今の 台帳が「動く」と 言っている 数 …… ' + 動く.length + '個');
言う('★★穴A・穴B を 塞ぐと 残る 数 ……………… ' + 棚.値.length + '個★★');
言う('★★減る 数 ……………………………………… ' + (動く.length - 棚.値.length) + '個★★');
言う('');
言う('★★ただし ★減った＝壊れている★では ありません★★');
言う('  ⇒ 17通りの 引数が ★その 関数に 合っていない★だけの 物が 混ざります');
言う('    （例 … 引数が 5つ 要る 関数に 4つまでしか 渡していない）');
言う('  ⇒★★だから これは「動かない 数」では なく ★「押して 値が 出せなかった 数」★です★★');
言う('  ⇒★1本ずつ 見ないと どちらか 分かりません★');
言う('');
言う('★② 誤りしか 返らない ' + 棚.他の誤りだけ.length + '個★');
for (let i = 0; i < 棚.他の誤りだけ.length; i += 6) 言う('  ' + 棚.他の誤りだけ.slice(i, i + 6).join('  '));
言う('');
言う('★③ JS層が 投げただけ ' + 棚.JS投げだけ.length + '個★');
言う('  ' + 棚.JS投げだけ.join(' '));
言う('');
言う('★④ #NAME? しか 返らない ' + 棚.NAMEだけ.length + '個★');
言う('  ' + 棚.NAMEだけ.join(' '));

fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'osu-wakeru.txt'),
  行.join('\n') + '\n', { encoding: 'utf-8' });
hf.destroy();
