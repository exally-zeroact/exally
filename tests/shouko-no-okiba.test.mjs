/* shouko-no-okiba.test.mjs — ★消える場所に repo の 物を 置いていないか★（2026-09-05）
 *
 *  ★なぜ 要るか（★同じ日に 2回 落ちた★）★
 *    ①2026-08-29 実Excel 507個の 一覧 ⇒ `scratchpad/exally_missing_functions.txt`
 *       ⇒★消えた★／09-05 に 聞かれて ★答えられなかった★
 *       ⇒★「507個」は ★中身の 無い 数字★に なった★
 *    ②2026-09-05 実Excel を 叩き直した YEN の 直し ⇒ ★また `scratchpad/hold2/` に 置いた★
 *       ⇒★「消えた」と 報告した ★その 30分後★★
 *    ⇒★★決意では 直らない★★＝★手を 変えるか 機械を 置くか★
 *
 *  ★形（指示役 2026-09-05）★
 *    `scratchpad/` の 中に ★repo が 追っている ファイルと 同じ 名前★の
 *    `.js` `.mjs` `.json` が 在ったら ★赤★
 *  ★なぜ 雑音 0 か★
 *    ・掃引の 記録・撮った 絵・一時の 計算 … ★repo に 同じ 名前が 無い★⇒ 素通り
 *    ・`formula-extra.js` を 控えに 置いた … ★repo に 在る 名前★⇒ 赤
 *    ⇒★私が 今日 2回 やった 事だけを 捕まえる★
 *
 *  ★控えを 取るなら★ … `git switch -c <枝>` ＋ commit（★push しなくてよい★）
 *
 *  ★★この 機械は 半分しか 守りません（指示役 2026-09-05）★★
 *    ★見るのは「★控えた コード★」だけ★＝repo に ★同じ 名前★が 在る `.js/.mjs/.cjs/.json`
 *    ★捕まえられない 物★＝★測って 出した 結果★（新しい 名前の 一覧・記録）
 *      例）08-29 の 実Excel 507個 ⇒ `scratchpad/exally_missing_functions.txt`
 *          ⇒★repo に 同じ 名前の 相手が 居ない★＝★原理的に 捕まらない★
 *    ★広げては いけない★＝`.txt` まで 見ると 掃引の 記録・覚え書きが 全部 赤に なる
 *      ⇒★正しい 物を 赤に する 見張りは 人が 切る★（今日の 決まり）
 *    ⇒★★測って 出した 結果は「その場で repo に commit」＝手を 変えるしか ない★★
 *
 *  使い方: node tests/shouko-no-okiba.test.mjs
 *          node tests/shouko-no-okiba.test.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + (e && e.message)); } };

/** ★純関数★＝repo の 名前の 集まりと 消える場所の 名前から「危ない物」を 返す
 *  ★git の 作業用 複製(worktree)は 除く★（2026-09-05 実測で 199本 出た）
 *    ＝★中は git が 守っている＝消えても 元が 在る★／★控えでは ない★
 *    ⇒ 除かないと ★202本のうち 199本が 雑音★＝★見張りが 死ぬ★
 *      （指示役が 今日「雑音 123件で 入れなかった」と 言ったのと 同じ 家） */
export function 危ないか(repoの名前, 消える場所の名前, git複製) {
  const 見る = /\.(js|mjs|cjs|json)$/i;
  const 集 = new Set(repoの名前.map((f) => f.split('/').pop()));
  const 除く = new Set(git複製 || []);
  return 消える場所の名前.filter((f) => {
    if (!見る.test(f)) return false;
    const 頭 = f.split('/')[0];
    if (除く.has(頭)) return false;
    return 集.has(f.split('/').pop());
  });
}

if (process.argv.includes('--self-test')) {
  console.log('\n[shouko-no-okiba --self-test] わざと壊して赤になるか');
  const repo = ['lib/formula-extra.js', 'api/claude.js', 'prompt/kansuu.md'];
  T('★repo と 同じ 名前の 控えが 在れば 赤', () => {
    const r = 危ないか(repo, ['hold2/formula-extra.js']);
    if (r.length !== 1) throw new Error('見つけていない: ' + JSON.stringify(r));
  });
  T('★★掃引の 記録・絵の 元は 素通り（正しい 物を 赤に しない）★★', () => {
    const r = 危ないか(repo, ['cisame.log', 'shot/E1_mae.html', 'shot/toru.mjs', 'ai.json', 'st.json']);
    if (r.length) throw new Error('★誤検知★: ' + JSON.stringify(r));
  });
  T('★.md や .txt は 見ない（絵の 説明や 覚え書き）', () => {
    const r = 危ないか(['docs/EXCEL_NAYAMI.md'], ['EXCEL_NAYAMI.md', 'memo.txt']);
    if (r.length) throw new Error('誤検知: ' + JSON.stringify(r));
  });
  T('★深い 所に 置いても 見つける', () => {
    const r = 危ないか(repo, ['a/b/c/claude.js']);
    if (r.length !== 1) throw new Error('見つけていない');
  });
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

/* ══ 本番 ═══════════════════════════════════════════════════ */
const SKIP = new Set(['node_modules', '.git', 'tmp', '.vercel', 'dist']);
function 集める(base, rel, out) {
  let 中;
  try { 中 = fs.readdirSync(path.join(base, rel || '.')); } catch (e) { return out; }
  for (const n of 中) {
    if (SKIP.has(n)) continue;
    const r = rel ? rel + '/' + n : n;
    let st;
    try { st = fs.statSync(path.join(base, r)); } catch (e) { continue; }
    if (st.isDirectory()) 集める(base, r, out); else out.push(r);
  }
  return out;
}

/* ★消える場所＝この セッションの scratchpad★（無ければ 何も 見ない＝空振りとは 別） */
const 消える場所 = process.env.EXALLY_SCRATCHPAD
  || 'C:/Users/zeroa/AppData/Local/Temp/claude/C--WINDOWS-System32-WindowsPowerShell-v1-0/5b4e50e6-20a1-4af5-8ffb-8b6d6ca3f52b/scratchpad';

const repoの = 集める(ROOT, '', []);
const 在るか = fs.existsSync(消える場所);
const 消えるの = 在るか ? 集める(消える場所, '', []) : [];
/* ★git の 作業用 複製(worktree)を 見つける★＝`.git` を 持つ 直下の 部屋 */
const git複製 = 在るか ? fs.readdirSync(消える場所).filter((n) => {
  try { return fs.existsSync(path.join(消える場所, n, '.git')); } catch (e) { return false; }
}) : [];
const 危ない = 危ないか(repoの, 消えるの, git複製);

console.log('\n[shouko-no-okiba] 消える場所に repo の 物を 置いていないか');

T('★★消える場所に repo と 同じ 名前の コードが 無い★★', () => {
  if (危ない.length) {
    throw new Error('★消える場所に repo の 物が 在ります★:\n'
      + 危ない.map((f) => '   - ' + f).join('\n')
      + '\n   → ★控えは `git switch -c <枝>` ＋ commit★（push しなくてよい）'
      + '\n     ★scratchpad は 消えます★＝2026-08-29 の 実Excel 507個は これで 消え、'
      + '\n     ★「507個」は 中身の 無い 数字に なりました★');
  }
});

T('★この 機械が「半分」だと 書いてある（守ったと 読ませない）', () => {
  /* ★捕まえられない 物が 在る★のに、それが 書いていないと
     ★「見張りが 在る＝安全」と 読まれる★＝★一番 危ない★ */
  const src = fs.readFileSync(path.join(ROOT, 'tests/shouko-no-okiba.test.mjs'), 'utf8');
  for (const 要る of ['半分しか 守りません', '原理的に 捕まらない', 'その場で repo に commit']) {
    if (src.indexOf(要る) < 0) throw new Error('★断りが 消えています★: ' + 要る
      + '\n   → ★言い換えたなら この 3語を 直す／消したなら 戻す★（★見張りごと 消さない★）');
  }
});

T('検査が空振りしていない（repo を 実際に 数えている）', () => {
  if (repoの.length < 100) throw new Error('repo の ファイルが 少なすぎます: ' + repoの.length);
});

console.log('\n── 実測 ──');
console.log('  repo … ' + repoの.length + '本');
console.log('  消える場所 … ' + (在るか ? 消えるの.length + '本' : '★無い（この 回では 見ていない）★'));
console.log('  除いた git の 作業用 複製 … ' + (git複製.length ? git複製.join(' / ') : 'なし'));
console.log('  危ない … ' + 危ない.length + '本');
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
