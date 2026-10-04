/* run-webkit-tests.mjs — ★webkit の 見張りを 名簿（tests/run.js）から 全部 拾って 走らせる★（2026-10-04 夜）
 *
 *  ★★なぜ 在るか（経営者が 3bceea9 の 木で 数えて 見つけた）★★
 *    webkit の 見張り 19本の うち ★15本は CI の どこでも 1度も 本当に 走って いなかった★。
 *      ・毎回の CI（ci.yml）には webkit が 無い ⇒ 借り方（_borrow-playwright）が ★未測定・緑★ で 終わる
 *      ・見張り 本人は「webkit.yml で 本当に 測ります」と 言う ⇒ ★webkit.yml には 4本しか 書いて いなかった★
 *    ⇒ 10-02〜10-04 に 足した #REF!・和暦経過・描かれた字 の 見張りも ★手元の 総なめ でしか 走って いなかった★
 *  ★★直し★★
 *    webkit.yml は ★1本ずつ 並べず★ この 道具を 1段で 呼ぶ ＝★名簿に 足せば 勝手に 走る★
 *    ★門★ tests/webkit-hashiru.test.mjs（毎回の CI）＝webkit.yml が この 段を 持つか・拾い 漏れが 無いか
 *  ★走らせ方★ node scripts/run-webkit-tests.mjs           ... 全部 走らせる（webkit.yml の 段）
 *             node scripts/run-webkit-tests.mjs --名簿だけ ... 拾った 名前を 出す だけ（走らせない）
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** ★名簿から webkit の 見張りを 拾う★（`-webkit.mjs` で 終わる 物・引数 付きも そのまま） */
export function webkitの名簿(FILES) {
  return FILES.map((f) => (Array.isArray(f) ? f : [f]))
    .filter((f) => /-webkit\.mjs$/.test(String(f[0])))
    .map((f) => f.filter((x) => x !== null && x !== undefined));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
  const { FILES } = require_(path.join(ROOT, 'tests/run.js'));
  const 名簿 = webkitの名簿(FILES);
  if (process.argv.includes('--名簿だけ')) {
    for (const f of 名簿) console.log(f.join(' '));
    console.log('★webkit の 見張り ' + 名簿.length + '本★（tests/run.js 本人から 拾った）');
    process.exit(0);
  }
  let 走った = 0, 緑 = 0;
  const 落ちた = [];
  for (const [f, ...a] of 名簿) {
    console.log('\n=== ' + [f].concat(a).join(' ') + ' ===');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tests', f)].concat(a), { stdio: 'inherit' });
    走った++;
    if (r.status === 0) 緑++; else 落ちた.push([f].concat(a).join(' ') + '（' + (r.signal ? 'signal ' + r.signal : 'exit ' + r.status) + '）');
  }
  /* ★最後の 行★＝★頼んだ／走らせた／緑★（これが 無い 出しは 途中で 切られた＝赤） */
  console.log('\n★webkit の 見張り ... 頼んだ ' + 名簿.length + '本 ／ 走らせた ' + 走った + '本 ／ 緑 ' + 緑 + '本★');
  for (const s of 落ちた) console.log('   ★落ちた★ ' + s);
  process.exit((落ちた.length || 走った !== 名簿.length) ? 1 : 0);
}
