/* ci-mitodoke.mjs (lib) -- ★1つの sha の CI と WebKit を「数まで」見届ける★（2026-10-10）
 *
 *  ★★なぜ 在るか★★
 *    「CI 緑」を gh の success だけで 言うと、名簿の 何本が 走ったかは 見て いない。
 *    10-09 までは scratchpad の 写し（消える 所）で 4回 見届けて いた ⇒ repo に 入れる。
 *    使う 口は scripts/ci-mitodoke.mjs（薄い 口）。判じは ここ（試験 tests/ci-mitodoke.test.mjs）。
 *
 *  ★★緑と 言う 時（全部 そろった 時だけ）★★
 *    ・CI（ci.yml）と WebKit（webkit.yml）の 回が その sha に 在り、全部 completed
 *    ・回の headSha が 頼んだ sha と 同じ
 *    ・cancelled を 除いた 回が 全部 success（1回以上）。再実行した 回は ★前の 回も 全部 success★
 *    ・CI の ログ：`Run node tests/run.js` の 段の 行だけを 見て、★その sha の★ 名簿の 全部が
 *      名簿の 順に「=== 名前 ===」で 出て、「★落ちた★」0、最後の 見出しの 後に「全テストファイル 緑」
 *    ・WebKit の ログ：最後の 行の 頼んだ＝走らせた＝緑、かつ 頼んだ＝その sha の 名簿から 出した 期待（1本以上）
 *
 *  ★★言えない 事（書いて おく）★★
 *    ・PR の CI は refs/pull/N/merge（土台と 混ぜた 物）を 走らせる ⇒ 混ぜた 側の 名簿は sha の 名簿 以上。
 *      見るのは「sha の 名簿の 全部が 走ったか」（部分集合）。★名簿から 黙って 外された 試験★は 捕まえない
 *      （それは tests-registered の 門の 仕事）。
 *    ・中の 試験が 名簿と 同じ 名前の「=== 名前 ===」を 出すと、名簿の 順に 当たる 限り 走ったと 数える。
 *    ・ci.yml の run.js 以外の 段の 中身は 見ない（その 段の 色は 回の conclusion に 入る）。
 *    ・出しは 数と run id だけ。ログの 全文・gh の 鍵は 出さない／書かない。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { 段で走らせる名簿 } from '../run-webkit-tests.mjs';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const 時刻 = /^﻿?\d{4}-\d\d-\d\dT[\d:.]+Z ?/;

/** run.js と 同じ 組み立て（file + ' ' + args.join(' ')） */
export function 名簿の名前(FILES) {
  return FILES.map((f) => {
    const [file, ...args] = Array.isArray(f) ? f : [f];
    return file + (args.length ? ' ' + args.join(' ') : '');
  });
}

/** ログを 段ごとに 分ける：「job\t段の名前\t時刻 本文」 ⇒ { 段, 本文 } */
export function ログを読む(生) {
  const 行 = [];
  for (const l of String(生 || '').split('\n')) {
    const s = l.replace(/\r$/, '');
    const a = s.indexOf('\t'), b = a < 0 ? -1 : s.indexOf('\t', a + 1);
    if (b < 0) continue;
    行.push({ 段: s.slice(a + 1, b), 本文: s.slice(b + 1).replace(時刻, '') });
  }
  return 行;
}

/** 中身で 段を 拾う：`##[group]Run <命令>` の 行の 段の 名前 */
function 段の行(行, 命令) {
  const 頭 = 行.find((x) => x.本文 === '##[group]Run ' + 命令);
  return 頭 ? 行.filter((x) => x.段 === 頭.段) : null;
}

/** 回の 並び（1つの ワークフロー）を 見る */
function 回を見る(名, runs, sha, 赤, 行) {
  if (!runs || !runs.length) { 赤.push(名 + ' の 回が 無い（paths に 当たらない か PR が 無い か まだ 作られて いない）'); return []; }
  const 取消 = runs.filter((r) => r.status === 'completed' && r.conclusion === 'cancelled').length;
  const 良い = [];
  for (const r of runs) {
    const id = r.databaseId + (r.attempt > 1 ? ' attempt ' + r.attempt : '');
    if (r.headSha !== sha) { 赤.push(名 + ' ' + id + ' の headSha が 違う（' + String(r.headSha).slice(0, 7) + '）'); continue; }
    if (r.status !== 'completed') { 赤.push(名 + ' ' + id + ' が まだ ' + r.status); continue; }
    if (r.conclusion === 'cancelled') continue;
    if (r.conclusion !== 'success') { 赤.push(名 + ' ' + id + ' が ' + r.conclusion); continue; }
    const 前 = r.前の回 || [];
    if (r.attempt > 1 && 前.length !== r.attempt - 1) { 赤.push(名 + ' ' + id + ' の 前の 回が 取れない'); continue; }
    const 前の赤 = 前.filter((c) => c !== 'success');
    if (前の赤.length) { 赤.push(名 + ' ' + id + ' は 再実行で 緑（前の 回 ' + 前の赤.join('/') + '）'); continue; }
    良い.push(r);
  }
  if (!良い.length && !赤.some((s) => s.startsWith(名))) 赤.push(名 + ' に success の 回が 無い（cancelled ' + 取消 + '）');
  行.push(名 + '：回 ' + runs.length + ' ／ success ' + 良い.length + ' ／ cancelled ' + 取消 + '（' + 良い.map((r) => r.databaseId + ' attempt ' + (r.attempt || 1)).join(', ') + '）');
  return 良い;
}

/** CI の ログの 中身 */
export function CIログを見る(生, 名前, 赤, 行, id) {
  const 段 = 段の行(ログを読む(生), 'node tests/run.js');
  if (!段) { 赤.push('CI ' + id + '：run.js の 段が ログに 無い'); return; }
  const 本文 = 段.map((x) => x.本文);
  let i = 0, 最後の見出し = -1;
  const 欠け = [];
  for (const n of 名前) {
    const 見出し = '=== ' + n + ' ===';
    let j = i;
    while (j < 本文.length && 本文[j] !== 見出し) j++;
    if (j >= 本文.length) { 欠け.push(n); continue; }
    最後の見出し = j; i = j + 1;
  }
  const 落 = 本文.filter((s) => /^\s*★落ちた★/.test(s)).length;
  const 終 = 本文.some((s, k) => k > 最後の見出し && s === '全テストファイル 緑');
  行.push('CI ' + id + '：名簿 ' + 名前.length + ' ／ 走った ' + (名前.length - 欠け.length) + ' ／ 落ちた ' + 落 + ' ／ 終わりの緑 ' + 終);
  if (!名前.length) 赤.push('CI ' + id + '：名簿が 0本');
  if (欠け.length) 赤.push('CI ' + id + '：名簿の ' + 欠け.length + '本が 走って いない（' + 欠け.slice(0, 3).join(', ') + '）');
  if (落) 赤.push('CI ' + id + '：落ちた ' + 落);
  if (!終) 赤.push('CI ' + id + '：最後の 見出しの 後に 終わりの 緑が 無い');
}

/** WebKit の ログの 中身 */
export function WebKitログを見る(生, 期待, 赤, 行, id) {
  const 段 = 段の行(ログを読む(生), 'node scripts/run-webkit-tests.mjs');
  if (!段) { 赤.push('WebKit ' + id + '：run-webkit-tests の 段が ログに 無い'); return; }
  let m = null;
  for (const x of 段) { const t = /^★webkit の 見張り \.\.\. 頼んだ (\d+)本 ／ 走らせた (\d+)本 ／ 緑 (\d+)本★$/.exec(x.本文); if (t) m = t; }
  if (!m) { 赤.push('WebKit ' + id + '：最後の 行が 無い（途中で 切れた）'); return; }
  const [頼, 走, 緑] = [+m[1], +m[2], +m[3]];
  行.push('WebKit ' + id + '：期待 ' + 期待 + ' ／ 頼んだ ' + 頼 + ' ／ 走らせた ' + 走 + ' ／ 緑 ' + 緑);
  if (!(頼 === 走 && 走 === 緑)) 赤.push('WebKit ' + id + '：3つの 数が 揃わない');
  if (!(期待 >= 1)) 赤.push('WebKit ' + id + '：期待の 本数が 0（名簿を 読み損じた）');
  if (頼 !== 期待) 赤.push('WebKit ' + id + '：頼んだ ' + 頼 + ' が 期待 ' + 期待 + ' と 違う');
}

/** ★判じ★（網も git も 叩かない）。ci/wk = { runs, ログ: { [databaseId]: 生 | null } } */
export function 見届ける({ sha, ci, wk, 名簿, webkit期待 }) {
  const 赤 = [], 行 = [];
  if (!/^[0-9a-f]{40}$/.test(String(sha))) 赤.push('sha が 全桁で ない');
  for (const r of 回を見る('CI', ci && ci.runs, sha, 赤, 行)) {
    const 生 = ci.ログ && ci.ログ[r.databaseId];
    if (!生) { 赤.push('CI ' + r.databaseId + '：ログが 取れない'); continue; }
    CIログを見る(生, 名簿の名前(名簿 || []), 赤, 行, r.databaseId);
  }
  for (const r of 回を見る('WebKit', wk && wk.runs, sha, 赤, 行)) {
    const 生 = wk.ログ && wk.ログ[r.databaseId];
    if (!生) { 赤.push('WebKit ' + r.databaseId + '：ログが 取れない'); continue; }
    WebKitログを見る(生, webkit期待, 赤, 行, r.databaseId);
  }
  return { 赤, 行 };
}

/* ---------- ここから下は 網と git を 叩く（scripts/ci-mitodoke.mjs から 呼ぶ） ---------- */

const REPO = 'exally-zeroact/exally';
const 叩く = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT });

/** その sha の tests/run.js から FILES を 読む（手元の 作業木では ない） */
export function shaの名簿(sha) {
  const 置き場 = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-mitodoke-'));
  try {
    const f = path.join(置き場, 'run.js');
    fs.writeFileSync(f, 叩く('git', ['show', sha + ':tests/run.js']));
    const { FILES } = createRequire(pathToFileURL(f))(f);
    const 読む = (n) => 叩く('git', ['show', sha + ':tests/' + n]);
    let yml = '';
    try { yml = 叩く('git', ['show', sha + ':.github/workflows/webkit.yml']); } catch (e) { yml = ''; }
    return { FILES, webkit期待: 段で走らせる名簿(FILES, 読む, yml).length };
  } finally { fs.rmSync(置き場, { recursive: true, force: true }); }
}

function 回を引く(ファイル, sha) {
  const runs = JSON.parse(叩く('gh', ['run', 'list', '--repo', REPO, '--workflow', ファイル, '--commit', sha,
    '--json', 'databaseId,status,conclusion,headSha,attempt']));
  const ログ = {};
  for (const r of runs) {
    r.前の回 = [];
    for (let k = 1; k < (r.attempt || 1); k++) {
      try { r.前の回.push(JSON.parse(叩く('gh', ['api', 'repos/' + REPO + '/actions/runs/' + r.databaseId + '/attempts/' + k])).conclusion); }
      catch (e) { /* 取れない 回は 数が 足りず 赤 */ }
    }
    if (r.status !== 'completed' || r.conclusion !== 'success') continue;
    ログ[r.databaseId] = null;
    for (let i = 0; i < 3; i++) {
      try { const t = 叩く('gh', ['run', 'view', String(r.databaseId), '--repo', REPO, '--log']); if (t.length > 1000) { ログ[r.databaseId] = t; break; } }
      catch (e) { /* 取り直す */ }
    }
  }
  return { runs, ログ };
}

/** 直に 走らせる 口。★既定は exit 1★、緑を 出す 1か所で だけ 0 に 戻す */
export function 走らせる(引数) {
  process.exitCode = 1;
  const 頼み = 引数[0];
  if (!頼み) { console.log('使い方: node scripts/ci-mitodoke.mjs <sha>'); return; }
  let sha;
  try { sha = 叩く('git', ['rev-parse', '--verify', 頼み + '^{commit}']).trim(); }
  catch (e) { console.log('★赤（見届けられない）★ sha が 引けない（git fetch して ください）'); return; }
  let 結果;
  try {
    const { FILES, webkit期待 } = shaの名簿(sha);
    結果 = 見届ける({ sha, ci: 回を引く('ci.yml', sha), wk: 回を引く('webkit.yml', sha), 名簿: FILES, webkit期待 });
  } catch (e) {
    console.log('★赤（見届けられない）★ gh か git が 通らない：' + String((e && e.message) || e).split('\n')[0].slice(0, 120));
    return;
  }
  for (const l of 結果.行) console.log(l);
  if (結果.赤.length) { console.log('★赤（見届けられない）★ ' + 結果.赤.join(' ／ ')); return; }
  console.log('★緑★ ' + sha.slice(0, 7));
  process.exitCode = 0;
}
