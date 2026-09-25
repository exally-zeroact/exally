/* run-tests-batch.mjs — ★試験を 分けて 走らせる（一覧は tests/run.js 本人から 読む）★
 *
 *  ★なぜ在るか（2026-08-29）★
 *    通しで 走らせると 10分を 超えて 途中で 止められる事が ある。
 *    そこで 分けて 走らせるが、★一覧を 自分で 拾い直したら 7本 落として
 *    「全部 緑」と 嘘の報告を した★（CIが 赤で 捕まえた）。
 *    ⇒ ★一覧は 写さない。tests/run.js 本人から 読む★（require で 読める形に した）。
 *
 *  使い方:
 *    node scripts/run-tests-batch.mjs            … 何本 在るかだけ 出す
 *    node scripts/run-tests-batch.mjs 1 61       … 1本目〜61本目を 走らせる
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const { FILES } = require_(path.join(ROOT, 'tests/run.js'));

const 一覧 = FILES.map((f) => (Array.isArray(f) ? f : [f, null]));
const 始 = Number(process.argv[2] || 0);
const 終 = Number(process.argv[3] || 0);
if (!始 || !終) {
  console.log('★試験は 全部で ' + 一覧.length + '本★（tests/run.js 本人から 読んだ）');
  console.log('  例: node scripts/run-tests-batch.mjs 1 61');
  process.exit(0);
}

/* ══ ★★「立ち上がれなかった」を 緑に 混ぜない★★ ══（2026-09-26・経営者1 の 知らせ）
     ★★何が 起きたか（経営者1 の 手元）★★
       機械の 空きが 足りず ★318本が `3221225794`（0xC0000142）を 返した★
       ＝Windows の ★「プロセスを 作れなかった」★
       ＝★試験が 落ちた のでは なく 1度も 走らなかった★
       ⇒★★「通った」とも 「割れた」とも 言えません★★
     ★★この 道具は 前から 捕まえます★★＝`r.status !== 0` は 全部 赤
       ⇒★3221225794 も 赤に なります★（字で 確かめました）
     ★★それでも 足りない 物が 1つ 在りました★★
       ＝★「赤 0件」だけでは 何本 走らせたか 出て いません★
       ⇒★だから 走らせた 本数と 緑の 本数を いつも 出します★
       ⇒★立ち上がれなかった 時は その 名を 書きます★
     ★記憶★ [[feedback_ci_node_version_vs_engines]]（落ちるのでは なく 走らない） */
var 立ち上がれない = { 3221225794: '★プロセスを 作れなかった（0xC0000142・機械の 空き 不足）★' };
let 赤 = 0, 走った = 0, 緑 = 0;
const 落ちた = [];
for (let i = 始 - 1; i < Math.min(終, 一覧.length); i++) {
  const [f, a] = 一覧[i];
  const args = ['--max-old-space-size=4096', path.join(ROOT, 'tests', f)];
  if (a) args.push(a);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  走った++;
  if (r.status !== 0) {
    赤++;
    var 訳 = r.signal ? '（★中で殺された signal=' + r.signal + '★）'
      : (立ち上がれない[r.status] ? '（' + 立ち上がれない[r.status] + '）'
        : (r.error ? '（★走らせられません ' + r.error.message + '★）'
          : '（自分で ' + r.status + ' を返した）'));
    落ちた.push((i + 1) + '本目 ' + f + (a ? ' ' + a : '') + 訳);
  } else { 緑++; }
}
/* ★分母を 必ず 出します★＝★「赤 0件」だけでは 何本 走らせたか 分かりません★ */
const 頼んだ = Math.min(終, 一覧.length) - (始 - 1);
console.log((始) + '〜' + Math.min(終, 一覧.length) + '本目 … ★赤 ' + 赤 + '件★'
  + '（★頼んだ ' + 頼んだ + '本 ／ 走らせた ' + 走った + '本 ／ 緑 ' + 緑 + '本★）');
if (走った !== 頼んだ) {
  console.log('   ★★頼んだ 本数と 走らせた 本数が 違います＝この 出しは 当てに なりません★★');
  process.exit(1);
}
for (const s of 落ちた) console.log('   ・' + s);
process.exit(赤 ? 1 : 0);
