/* kinji-ji.test.mjs — ★決まりで 禁じられた 字が 増えて いないか★（2026-09-18）
 *
 *  ★★決まり★★ `team/global-rules.md` §6／§8
 *    ・★スマートクォート 混入禁止 → ASCII 文字のみ★
 *    ・★Unicode 省略記号 U+2026 禁止 → ... （ASCII 3ピリオド）★
 *
 *  ★★なぜ「0本」では なく「上限」か★★
 *    2026-09-18 に 数え直しました（★経営者1 と 私で 別々に★）
 *      U+2026 は ★覚書きの 中が ほとんど★／★今 壊れる 物は 在りません★
 *    ⇒★2,000件 近くを 触るのは ★今 動いて いる 物を 触る★★＝★止めました★
 *    ⇒★★代わりに「今日の 数」を 決め打ちに して ★増えたら 赤★★★
 *      ＝★「これから 書く 分は ASCII」が ★心がけ★では なく ★機械★に なります★
 *    ★スマートクォートだけは ★0本★に しました★（★少なかった から★）
 *
 *  ★★外した 物（★名指し＋訳★）★★
 *    `lib/xlsx.full.min.js` ... ★借り物（SheetJS・Apache-2.0）★＝触れません
 *    `lib/symbols.js` ......... ★字そのものが データ★（引用符の 名前の 表）
 *
 *  使い方: node tests/kinji-ji.test.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};

console.log('');
console.log('[kinji-ji] ★禁じられた 字が 増えて いないか★');

const 道具 = path.join(ROOT, 'scripts/kinji-ji-kazoeru.mjs');
T('★道具が 在る★', fs.existsSync(道具), 道具);

const r = spawnSync(process.execPath, [道具], { encoding: 'utf-8' });
const 出 = String(r.stdout || '') + String(r.stderr || '');
T('★道具が 走った★', r.status !== null, '終わり値 ' + r.status);
T('★★上限の 中★★', r.status === 0,
  '★増えて います★\n' + 出.split('\n').filter((l) => l.includes('増えました')).slice(0, 6).join('\n'));

/* ★★道具 自身が 禁字を 持って いない★★（★守る 紙に 本番の 印を 書くな★と 同じ 型） */
const 中 = fs.readFileSync(道具, 'utf-8');
const 禁 = [0x2026, 0x201C, 0x201D, 0x2018, 0x2019];
const 持つ = 禁.filter((c) => 中.indexOf(String.fromCharCode(c)) >= 0);
T('★★道具 自身に 禁字が 0件★★（★永久に 赤に ならない為★）', 持つ.length === 0,
  '持って います ... ' + 持つ.map((c) => 'U+' + c.toString(16).toUpperCase()).join(' '));

/* ★分母を 出す★ */
const 束 = 出.split('\n').filter((l) => /本）$/.test(l.trim()) || /★lib★|★tests★|★scripts★/.test(l));
for (const l of 束) console.log('       ' + l.trim());

console.log('');
console.log('kinji-ji: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
