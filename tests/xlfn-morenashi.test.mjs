/* xlfn-morenashi.test.mjs — ★`_xlfn.` の 一覧に 漏れが 無いか★（2026-09-16）
 *
 *  ★★なぜ 要るか★★
 *    `lib/xlsx-io.js` の 一覧に 1つでも 漏れが 有ると
 *    ★その 式だけ 実Excel で #NAME?★ に なります。
 *    ★紙（golden-*.tsv）が 全部 緑でも 見つかりません★
 *      ＝台の 中では 正しく 計算できるから。
 *
 *  ★★同じ 型で 3回 踏んで います★★
 *    ①PERMUTATIONA（2026-08-02）… 実Excel で その 式だけ #NAME?
 *    ②RANK.AVG（2026-08-01）… RANK.EQ は 入って いたのに これだけ 抜けて いた
 *    ③★2026-09-16 … ★91個★ 抜けて いた★（棚58〜67 で 足した 物＋前から 在った 物）
 *    ⇒★手で 足すと また 漏れる★＝★実Excel に 聞いた 紙と 突き合わせる★
 *
 *  ★★この 見張りが 見る 物★★
 *    ①紙が 読めて いる（★空振りして いない★）
 *    ②★紙に 在る 名前が 一覧に 全部 在る★（＝漏れが 無い）
 *    ③一覧の 数が 紙と 合う（★黙って 痩せない★）
 *
 *  ★★紙の 取り直し方★★
 *    node docs/measured/osu-xlfn-zenbu.mjs --namae
 *    pwsh -NoProfile -File docs/measured/toru-xlfn-zenbu.ps1
 *    node docs/measured/osu-xlfn-zenbu.mjs
 *
 *  使い方: node tests/xlfn-morenashi.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const T = (n, f) => {
  try { f(); pass++; console.log('  ✓ ' + n); }
  catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message); }
};

console.log('\n[xlfn-morenashi] ★`_xlfn.` の 一覧に 漏れが 無いか★');

const 紙道 = path.join(ROOT, 'docs/measured/golden-xlfn-2026-09-16.tsv');
const 紙 = fs.readFileSync(紙道, 'utf-8')
  .split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((s) => s.trim());

const io = fs.readFileSync(path.join(ROOT, 'lib/xlsx-io.js'), 'utf-8');
const m = /var XLFN = \[([\s\S]*?)\];/.exec(io);
const 一覧 = m ? [...new Set((m[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1)))] : [];

console.log('      … 紙 ' + 紙.length + '個 ／ 一覧 ' + 一覧.length + '個');

T('★紙が 読めて いる（★空振りして いない★）★', () => {
  if (紙.length < 100) throw new Error('★' + 紙.length + '個しか 読めない★（紙が 壊れて いる）');
  /* ★実Excel が 付けると 測った 物が ちゃんと 入って いるか（名指し）★ */
  for (const n of ['NORM.DIST', 'CHISQ.DIST', 'CONFIDENCE.NORM', 'ISOMITTED', 'XLOOKUP']) {
    if (紙.indexOf(n) < 0) throw new Error('★紙に ' + n + ' が 無い★');
  }
});

T('★★一覧に 漏れが 無い（★漏れると その 式だけ 実Excel で #NAME?★）★★', () => {
  const 無 = 紙.filter((n) => 一覧.indexOf(n) < 0);
  if (無.length) {
    throw new Error('★' + 無.length + '個 漏れて いる★ … ' + 無.slice(0, 12).join(' ')
      + (無.length > 12 ? ' …' : ''));
  }
});

T('★一覧が 黙って 痩せて いない★', () => {
  /* ★数は 決め打ち★＝★減らしたら ここも 直す＝直さないと 赤で 止まる★ */
  const 期待 = 130;
  if (一覧.length !== 期待) {
    throw new Error('★一覧が ' + 一覧.length + '個★（' + 期待 + '個の はず）'
      + '／足したなら ここも 直す');
  }
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
