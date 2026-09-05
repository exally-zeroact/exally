/* kansuu-tana.test.mjs — ★台帳の 棚が 本当か、engine に 押して 確かめる★（2026-09-05）
 *
 *  ★★なぜ 要るか（2026-09-05 に 実際に 起きた）★★
 *    `YEN` を ★「足さない（＝Exally で 動かない）」の 棚★に 置いていた。
 *    ⇒ AIへ 渡る 紙 `prompt/kansuu.md` の
 *      ★「Exally内では まだ 動かない（勧めては いけない）」の 列★に 並ぶ。
 *    ⇒★★実際は `=YEN(1234.5)` は ¥1,235 を 返す★★
 *      （`exally-formula.js` の `convertFormula` が 本名 `DOLLAR` に 直している）
 *    ⇒★AIが お客さんに「YEN は 動きません」と 言う★所だった。
 *
 *  ★★字だけ 見る 見張りでは 掴めなかった★★
 *    `tests/formula-extra.test.mjs` は ★理由の 字★を 見ていた
 *    `tests/prompt-file.test.mjs` は ★台帳と 紙が 揃っているか★を 見ていた
 *    ⇒ ★台帳が 間違っていると、揃っているほど 揃って 間違う★
 *    ⇒★★台帳の 外＝engine に 押して 答えを 見るしか ない★★
 *
 *  ★何を 押すか★
 *    ①「動かない」棚の 名前 … ★本番と 同じ道（convertFormula → engine）で #NAME? に なるか★
 *       なれば 正しい／答えが 出るなら ★棚が 嘘★＝赤
 *    ②「別名で動く」棚の 名前 … ★本当に 答えが 出るか★
 *       出なければ ★棚が 嘘★＝赤（今度は 逆向きの 嘘）
 *    ⇒★両方 見る★＝片側だけだと 「全部 動かない 棚に 入れる」で 緑に できてしまう
 *
 *  ★★既に 在る 物と 重なっていないか（作る前に 探した）★★
 *    `tests/xlsx-harness/alias.test.mjs`（2026-08-01）が
 *      ★JIS→DBCS / YEN→DOLLAR の ★直し そのもの★★を 見ている
 *      （入口 convertFormula と 出口 xlsx 書き出しの 2か所）
 *      ⇒★そこには `.FormulaLocal` ↔ `.Formula` の 事も 正しく 書いてあった★
 *      ⇒★08-31 に 私が 台帳へ 書いた「実Excel に 無い」は、
 *        ★repo が 既に 持っていた 正しい 記述と 逆★だった★
 *    ⇒★ここ(kansuu-tana)は 重ならない★＝見るのは ★直し★ではなく
 *      ★★台帳の 棚（AIに 何と 言わせるか）が 本当か★★
 *      ＝alias は「YEN が 動く」を 見る／ここは「棚が 嘘を ついていないか」を 見る
 *
 *  使い方: node tests/kansuu-tana.test.mjs
 *          node tests/kansuu-tana.test.mjs --self-test
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + (e && e.message)); } };

/** ★純関数★＝棚と「押した 答え」から 食い違いを 返す（self-test で 作り物を 通せる）
 *  @param 動かない 名前の 配列 ／ @param 別名 名前の 配列
 *  @param 押す (名前) => '#NAME?' か 答えの 字 */
export function 棚の嘘(動かない, 別名, 押す) {
  const 出 = { 動かないと言ったのに動く: [], 動くと言ったのに動かない: [] };
  for (const f of 動かない) if (押す(f) !== '#NAME?') 出.動かないと言ったのに動く.push(f + '→' + 押す(f));
  for (const f of 別名) if (押す(f) === '#NAME?') 出.動くと言ったのに動かない.push(f);
  return 出;
}

if (process.argv.includes('--self-test')) {
  console.log('\n[kansuu-tana --self-test] わざと壊して赤になるか');
  /* ★2026-09-05 に 実際に 通した 形★＝動く 物を 動かない 棚に 置いた */
  T('★★動かない と 言ったのに 動く物を 見つける（YEN の 事故）★★', () => {
    const r = 棚の嘘(['LAMBDA', 'YEN'], [], (f) => (f === 'YEN' ? '¥1,235' : '#NAME?'));
    if (r.動かないと言ったのに動く.length !== 1) throw new Error('見つけていない');
  });
  T('★逆向きの 嘘（動くと 言ったのに 動かない）も 見つける', () => {
    const r = 棚の嘘([], ['YEN'], () => '#NAME?');
    if (r.動くと言ったのに動かない.length !== 1) throw new Error('見つけていない');
  });
  T('★正しければ 何も 出さない', () => {
    const r = 棚の嘘(['LAMBDA'], ['YEN'], (f) => (f === 'YEN' ? '¥1,235' : '#NAME?'));
    if (r.動かないと言ったのに動く.length || r.動くと言ったのに動かない.length) throw new Error('誤検知');
  });
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

/* ══ 本番＝本当に 押す ═══════════════════════════════════════ */
const HFns = require_(path.join(ROOT, 'hyperformula.full.min.js'));
const EF = require_(path.join(ROOT, 'exally-formula.js'));
const 台帳 = require_(path.join(ROOT, 'lib/formula-extra.js')).数える();

console.log('\n[kansuu-tana] 台帳の 棚を engine に 押して 確かめる');

/* ★プラグインを 積む★＝積み忘れると 素の engine が 答えて ★嘘の 緑★に なる
   （2026-08-29 の 実測＝907本を「合わない」と 誤報告した 家） */
const 積めた = EF.registerExallyFunctions(HFns) === true;
const hf = HFns.HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
const SID = hf.getSheetId(hf.addSheet('S'));

/* ★本番と 同じ 道★＝convertFormula を 通してから engine に 渡す
   （素で 渡すと 本番と 違う物を 測る＝今日の YEN は それで 見落とした） */
function 押す(名前, 引数) {
  hf.setSheetContent(SID, [[EF.convertFormula('=' + 名前 + '(' + (引数 === undefined ? '1' : 引数) + ')')]]);
  const v = hf.getCellValue({ sheet: SID, row: 0, col: 0 });
  if (v && v.type === 'NAME') return '#NAME?';
  if (v && v.type) return '#' + v.type;
  return String(v);
}

const 動かない = Object.keys(台帳.足さない).sort();
const 別名 = Object.keys(台帳.別名で動く || {}).sort();
const 嘘 = 棚の嘘(動かない, 別名, 押す);

T('★プラグインを 積めた（積み忘れると 素の engine が 答えて 嘘の 緑に なる）', () => {
  if (!積めた) throw new Error('registerExallyFunctions が true を 返さない');
});

T('★★「動かない」棚は 本当に 動かない（AIが 嘘を 言わない）★★', () => {
  if (嘘.動かないと言ったのに動く.length) {
    throw new Error('★動くのに「動かない」と 台帳に 書いてあります★: '
      + 嘘.動かないと言ったのに動く.join(' / ')
      + '\n   → ★AIが お客さんに「使えません」と 言います★'
      + '\n   → 台帳(lib/formula-extra.js)の ★別名で動く★ か ★足す★ へ 移してください');
  }
});

T('★★「別名で動く」棚は 本当に 動く★★', () => {
  if (嘘.動くと言ったのに動かない.length) {
    throw new Error('★動かないのに「動く」と 台帳に 書いてあります★: '
      + 嘘.動くと言ったのに動かない.join(' / ')
      + '\n   → ★AIが 動かない 式を 勧めます★');
  }
});

T('★この 検査が 空振りしていない（棚が 空でない）', () => {
  if (動かない.length < 10) throw new Error('動かない棚が 少なすぎます: ' + 動かない.length);
  if (!別名.length) throw new Error('別名で動く棚が 空です（YEN が 居るはず）');
});

console.log('\n── 実測（本番と 同じ道＝convertFormula → engine） ──');
/* ★ここは「名前が 通るか」だけを 見る★＝#NAME? でなければ 通っている。
   引数の 数は 名前ごとに 違うので #N/A などは 出る（それは 名前の 話では ない）。
   ★引数まで 込みの 実測は tests/betsumei-zenbu.test.mjs が やる★ */
for (const f of 別名) console.log('  ' + f + ' … 名前は 通る（' + 押す(f, '1234.5') + '）');
console.log('  「動かない」棚 ' + 動かない.length + '個 … 全部 #NAME?（' + 動かない.join(' ') + '）');
console.log('\n' + pass + ' passed, ' + fail + ' failed');
hf.destroy();
process.exit(fail ? 1 : 0);
