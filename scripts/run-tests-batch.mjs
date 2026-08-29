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

let 赤 = 0;
const 落ちた = [];
for (let i = 始 - 1; i < Math.min(終, 一覧.length); i++) {
  const [f, a] = 一覧[i];
  const args = ['--max-old-space-size=4096', path.join(ROOT, 'tests', f)];
  if (a) args.push(a);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (r.status !== 0) {
    赤++;
    落ちた.push((i + 1) + '本目 ' + f + (a ? ' ' + a : '')
      + (r.signal ? '（★中で殺された signal=' + r.signal + '★）' : '（自分で ' + r.status + ' を返した）'));
  }
}
console.log((始) + '〜' + Math.min(終, 一覧.length) + '本目 … ★赤 ' + 赤 + '件★');
for (const s of 落ちた) console.log('   ・' + s);
process.exit(赤 ? 1 : 0);
