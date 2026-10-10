/* pre-push-noreply.test.mjs — ★押す 前の 作者の 門（scripts/pre-push-noreply.sh）が 止める 物を 止めるか★（2026-10-11）
 *  一時の git の 中で、作り物の メール（example.com）と noreply の commit を 作り、門に 当てる。
 *  ★止めた 時に メールの 字を 出さない★ことも 見る。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const 門 = path.join(ROOT, 'scripts', 'pre-push-noreply.sh');
let 緑 = 0, 赤 = 0;
const T = (n, ok, m) => { if (ok) { 緑++; console.log('  ok   ' + n); } else { 赤++; console.log('  NG   ' + n + (m ? '\n       ' + m : '')); } };
console.log('[pre-push-noreply] ★押す 前の 作者の 門★');

const 置き場 = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-push-noreply-'));
const 遠く = path.join(置き場, 'remote.git'), 手元 = path.join(置き場, 'w');
const NR = '1+mihon@users.noreply.github.com', 偽 = 'mihon@example.com';
const git = (args, env) => execFileSync('git', args, { cwd: 手元, encoding: 'utf8', env: Object.assign({}, process.env, { GIT_CONFIG_NOSYSTEM: '1' }, env || {}) }).trim();
const 作る = (名, 作者, 人) => {
  fs.writeFileSync(path.join(手元, 名), 名);
  git(['add', 名]);
  git(['commit', '-q', '-m', 名], { GIT_AUTHOR_NAME: 'm', GIT_AUTHOR_EMAIL: 作者, GIT_COMMITTER_NAME: 'm', GIT_COMMITTER_EMAIL: 人 });
  return git(['rev-parse', 'HEAD']);
};
const 当てる = (sha) => spawnSync('sh', [門], { cwd: 手元, encoding: 'utf8', input: 'refs/heads/main ' + sha + ' refs/heads/main 0000000000000000000000000000000000000000\n' });
try {
  execFileSync('git', ['init', '-q', '--bare', 遠く]);
  execFileSync('git', ['init', '-q', '-b', 'main', 手元]);
  git(['remote', 'add', 'origin', 遠く]);
  const a = 作る('a', NR, NR);
  let r = 当てる(a);
  T('★noreply の 作者と commit した 人は 通す★', r.status === 0 && /見た commit 1 本/.test(r.stdout), r.stdout + r.stderr);
  git(['push', '-q', 'origin', 'main']);
  const b = 作る('b', 偽, NR);
  r = 当てる(b);
  T('★作者が noreply で ない ⇒ 止める★', r.status === 1 && /の 作者/.test(r.stderr), r.stdout + r.stderr);
  T('★止めた 時に メールの 字を 出さない★', !(r.stdout + r.stderr).includes(偽) && !(r.stdout + r.stderr).includes('example.com'));
  T('★遠くに 在る commit（a）は 見ない＝見た 本数は b だけ★', r.status === 1 && (r.stderr.match(/の 作者/g) || []).length === 1);
  git(['reset', '-q', '--hard', a]);
  const c = 作る('c', NR, 偽);
  r = 当てる(c);
  T('★commit した 人が noreply で ない ⇒ 止める★', r.status === 1 && /の commit した 人/.test(r.stderr), r.stderr);
  git(['reset', '-q', '--hard', a]);
  const d = 作る('d', NR, 'noreply@github.com');
  r = 当てる(d);
  T('★GitHub 自身（noreply@github.com）の commit した 人は 通す★', r.status === 0, r.stderr);
  git(['reset', '-q', '--hard', a]);
  const e = 作る('e', '1+MIHON@USERS.NOREPLY.GITHUB.COM', NR);
  r = 当てる(e);
  T('★大文字の noreply も 通す★', r.status === 0, r.stderr);
  r = spawnSync('sh', [門], { cwd: 手元, encoding: 'utf8', input: '(delete) 0000000000000000000000000000000000000000 refs/heads/x ' + a + '\n' });
  T('★消す 押しは 通す（見る commit 無し）★', r.status === 0, r.stderr);
  r = spawnSync('sh', [門], { cwd: 手元, encoding: 'utf8', input: 'refs/heads/main deadbeefdeadbeefdeadbeefdeadbeefdeadbeef refs/heads/main 0000000000000000000000000000000000000000\n' });
  T('★並べられない sha は 止める（黙って 通さない）★', r.status === 1, r.stdout + r.stderr);
} finally { fs.rmSync(置き場, { recursive: true, force: true }); }
console.log('\npre-push-noreply: ' + 緑 + ' 緑 / ' + 赤 + ' 赤');
process.exit(赤 ? 1 : 0);
