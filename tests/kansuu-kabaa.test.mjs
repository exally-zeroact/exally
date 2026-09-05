/* kansuu-kabaa.test.mjs — ★実Excel の 関数を どれだけ 動かせているか★（2026-09-06）
 *
 *  ★司さん★「細胞レベルに 細かく 全てに 適応しろ」
 *
 *  ★★なぜ 要るか★★
 *    2026-08-29 に「実Excel 507個／うち 動く 394個＝70%」と 報告した。
 *    ⇒ ★その 一覧を scratchpad に 置いて 消した★
 *    ⇒ 09-05 に「507個の 中に YEN は 居るか」と 聞かれて ★答えられなかった★
 *    ⇒ ★数字だけ 残って 中身が 無い★＝もう 使えない
 *    ⇒★測った 物は repo に 置く★（docs/measured/）
 *
 *  ★この 見張りが 見る 物★
 *    ①`docs/measured/` の 2本が 在って 空でない
 *    ②★「動かない」と 書いた 物が 本当に 動かないか★を ★engine に 押して★ 確かめる
 *    ③★「動く」筈の 物が 本当に 動くか★も 押す（逆向き）
 *    ④★カバー率が 下がったら 赤★（後戻りを 止める）
 *
 *  ★★測り台は 本番と 同じ物を 積む★★
 *    `exally-formula.js`（442本）★と★ `lib/formula-extra-plug.js`（13本）の ★両方★。
 *    ⇒ 片方 忘れると AVERAGEIFS/TAKE/DROP… 13個が「無い」と 出る（★実際に 出た★）。
 *
 *  使い方: node tests/kansuu-kabaa.test.mjs
 *          node tests/kansuu-kabaa.test.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + (e && e.message)); } };

/* ★2026-09-06 の 実測★＝★下がったら 赤★（上がったら この 数を 上げる） */
export const 実測 = { 実Excel: 519, 動く: 432, 動かない: 87 };

/** ★純関数★＝押した 結果と 台帳から 食い違いを 返す */
export function 食い違い(動かない台帳, 押す, 全部) {
  const 出 = { 動かないと書いたのに動く: [], 動くはずが動かない: [], 動いた数: 0 };
  const 無 = new Set(動かない台帳);
  for (const f of 全部) {
    const 動 = 押す(f);
    if (動) 出.動いた数++;
    if (動 && 無.has(f)) 出.動かないと書いたのに動く.push(f);
    if (!動 && !無.has(f)) 出.動くはずが動かない.push(f);
  }
  return 出;
}

if (process.argv.includes('--self-test')) {
  console.log('\n[kansuu-kabaa --self-test] わざと壊して赤になるか');
  T('★「動かない」と 書いたのに 動いたら 見つける', () => {
    const r = 食い違い(['A'], (f) => f === 'A', ['A', 'B']);
    if (r.動かないと書いたのに動く.length !== 1) throw new Error('見つけていない');
  });
  T('★「動く」筈が 動かなければ 見つける（後戻り）', () => {
    const r = 食い違い(['A'], () => false, ['A', 'B']);
    if (r.動くはずが動かない.join() !== 'B') throw new Error('見つけていない: ' + JSON.stringify(r));
  });
  T('★正しければ 何も 出さない', () => {
    const r = 食い違い(['A'], (f) => f !== 'A', ['A', 'B']);
    if (r.動かないと書いたのに動く.length || r.動くはずが動かない.length) throw new Error('誤検知');
    if (r.動いた数 !== 1) throw new Error('数え違い: ' + r.動いた数);
  });
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

/* ══ 本番 ═══════════════════════════════════════════════════ */
const 部屋 = path.join(ROOT, 'docs/measured');
const 読む = (f) => fs.readFileSync(path.join(部屋, f), 'utf8').split(/\r?\n/).filter(Boolean);

console.log('\n[kansuu-kabaa] 実Excel の 関数を どれだけ 動かせているか');

T('★測った 物が repo に 在る（scratchpad に 置かない）', () => {
  for (const f of ['excel-functions-2026-09-06.txt', 'exally-missing-2026-09-06.txt', 'README.md']) {
    const p = path.join(部屋, f);
    if (!fs.existsSync(p)) throw new Error('無い: ' + f);
    if (!fs.readFileSync(p, 'utf8').trim()) throw new Error('空: ' + f);
  }
});

const 全部 = 読む('excel-functions-2026-09-06.txt');
const 動かない台帳 = 読む('exally-missing-2026-09-06.txt');

T('★一覧の 数が 実測と 合っている（検査が 空振りしていない）', () => {
  if (全部.length !== 実測.実Excel) {
    throw new Error('実Excel の 一覧が ' + 全部.length + '個（実測 ' + 実測.実Excel + '個）');
  }
  if (動かない台帳.length !== 実測.動かない) {
    throw new Error('動かない 一覧が ' + 動かない台帳.length + '個（実測 ' + 実測.動かない + '個）');
  }
});

/* ★本番と 同じ物を 積む★（片方 忘れると 13個が 嘘に なる） */
const HFns = require_(path.join(ROOT, 'hyperformula.full.min.js'));
const EF = require_(path.join(ROOT, 'exally-formula.js'));
const 積1 = EF.registerExallyFunctions(HFns) === true;
const HF0 = HFns.HyperFormula;
const H = Object.assign(Object.create(HF0), HFns,
  { registerFunctionPlugin: HF0.registerFunctionPlugin.bind(HF0) });
const FXP = require_(path.join(ROOT, 'lib/formula-extra-plug.js'));
const 積2 = FXP.つなぐ(H, require_(path.join(ROOT, 'lib/formula-extra.js')));

T('★★本番と 同じ物を 積めた（片方 忘れると 13個が 嘘に なる）★★', () => {
  if (!積1) throw new Error('exally-formula の プラグインを 積めていない');
  if (!(積2 > 0)) throw new Error('formula-extra-plug を 積めていない（' + 積2 + '本）');
});

const hf = HF0.buildEmpty({ licenseKey: 'gpl-v3' });
const SID = hf.getSheetId(hf.addSheet('S'));
/* ★引数は 決め打たない★＝足りないと ★動く物を 死んだと 誤判定する★ */
const 候補 = ['(1)', '()', '(A1:A2,1)', '(1,1)', '(A1:A2)', '(1,1,1)', '("a")', '(A1)', '(1,1,1,1)'];
function 押す(f) {
  for (const a of 候補) {
    let 後; try { 後 = EF.convertFormula('=' + f + a); } catch (e) { continue; }
    try {
      hf.setSheetContent(SID, [[1], [2], [後]]);
      const v = hf.getCellValue({ sheet: SID, row: 2, col: 0 });
      if (!(v && v.type === 'NAME')) return true;
    } catch (e) { return true; }   /* engine が 引数で 投げた＝名前は 通っている */
  }
  return false;
}

const 食 = 食い違い(動かない台帳, 押す, 全部);

T('★★「動かない」と 書いた 物が 本当に 動かない（AIが 客に 嘘を 言わない）★★', () => {
  if (食.動かないと書いたのに動く.length) {
    throw new Error('★動くのに「動かない」と 書いてあります★: '
      + 食.動かないと書いたのに動く.join(' / '));
  }
});

T('★★動いていた 物が 動かなく なっていない（後戻りを 止める）★★', () => {
  if (食.動くはずが動かない.length) {
    throw new Error('★前は 動いていた 物が 動きません★: ' + 食.動くはずが動かない.join(' / '));
  }
});

T('★★カバー率が 下がっていない★★', () => {
  if (食.動いた数 < 実測.動く) {
    throw new Error('★動く 関数が 減りました★: ' + 食.動いた数 + '個（前 ' + 実測.動く + '個）');
  }
});

console.log('\n── 実測（★本番と 同じ道★＝convertFormula → engine） ──');
console.log('  実Excel が 知っている … ' + 全部.length + '個');
console.log('  ★Exally で 動く ……… ' + 食.動いた数 + '個（'
  + (食.動いた数 / 全部.length * 100).toFixed(1) + '%）★');
console.log('  動かない …………………… ' + (全部.length - 食.動いた数) + '個');
console.log('  積んだ プラグイン ……… exally-formula ' + (積1 ? '○' : '×')
  + ' ／ formula-extra-plug ' + 積2 + '本');
console.log('\n' + pass + ' passed, ' + fail + ' failed');
hf.destroy();
process.exit(fail ? 1 : 0);
