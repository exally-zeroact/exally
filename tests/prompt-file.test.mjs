/* prompt-file.test.mjs — ★AIの 頭は ファイルから／台帳と ずれたら 赤★（2026-09-05）
 *
 *  ★司さん★「★AIの構造は ファイルにして 更新できるような 設計に しとけよ★」
 *
 *  ★なぜ 要るか（実測）★
 *    前は api/claude.js に ★べた書き★だった。台帳（lib/formula-extra.js）と 二重管理。
 *    ⇒★手書きの「使えない関数」22個のうち ★17個が 間違い★★
 *       ・足してあるのに「使えない」…4個（TOCOL/TOROW/CHOOSEROWS/CHOOSECOLS）
 *       ・動かないのに 1つも 教えていない…13個（LAMBDA/LET/MAP/REDUCE/…）
 *    ⇒ しかも latest の 決まりは「★LET・LAMBDA等を 積極的に 提案★」
 *       ＝★AIが 動かない 式を 勧めていた★
 *
 *  使い方: node tests/prompt-file.test.mjs
 *          node tests/prompt-file.test.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + (e && e.message)); } };

/** ★純関数★＝前置きの 字と 台帳から「食い違い」を 返す（self-test で 作り物を 通せる） */
export function 食い違い(前置き, 台帳) {
  const 足す = (台帳.足す || []).concat(Object.keys(台帳.別のlibで足す || {}));
  const 足さない = Object.keys(台帳.足さない || {});
  const 出 = { 使えるのに使えないと言う: [], 動かないのに黙っている: [] };
  for (const f of 足す) {
    /* ★正規表現を 組み立てない★＝関数名に . が 入る（MODE.MULT）ので 逃がしが 要り、
       ここで 1回 壊した（2026-09-05）。★字を そのまま 探す★方が 確実。 */
    if (前置き.indexOf('★' + f + '★') >= 0) 出.使えるのに使えないと言う.push(f);
  }
  for (const f of 足さない) {
    if (前置き.indexOf(f) < 0) 出.動かないのに黙っている.push(f);
  }
  return 出;
}

if (process.argv.includes('--self-test')) {
  console.log('\n[prompt-file --self-test] わざと壊して赤になるか');
  const 台帳 = { 足す: ['TAKE'], 足さない: { LAMBDA: '無い' } };
  T('★動かない関数が 前置きに 無ければ 見つける', () => {
    const r = 食い違い('つかえる関数: TAKE', 台帳);
    if (r.動かないのに黙っている.length !== 1) throw new Error('見つけていない');
  });
  T('★動く関数を「使えない」と 書いていたら 見つける', () => {
    const r = 食い違い('動かない: ★TAKE★ / LAMBDA', 台帳);
    if (r.使えるのに使えないと言う.length !== 1) throw new Error('見つけていない');
  });
  T('★正しければ 何も 出さない', () => {
    const r = 食い違い('つかえる: TAKE / 動かない: ★LAMBDA★', 台帳);
    if (r.使えるのに使えないと言う.length || r.動かないのに黙っている.length) throw new Error('誤検知');
  });
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

/* ══ 本番 ═══════════════════════════════════════════════════ */
if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'test-dummy-key';
const handler = require_(path.join(ROOT, 'api/claude.js'));
const 台帳 = require_(path.join(ROOT, 'lib/formula-extra.js')).数える();
const 部屋 = path.join(ROOT, 'prompt');

console.log('\n[prompt-file] AIの 頭は ファイルから 出来ているか');

T('★prompt/ の 4本が 在って 空でない', () => {
  for (const f of ['base.md', 'kansuu.md', 'kyoutsuu.md', 'version.md']) {
    const p = path.join(部屋, f);
    if (!fs.existsSync(p)) throw new Error('無い: ' + f);
    if (!fs.readFileSync(p, 'utf8').trim()) throw new Error('空: ' + f);
  }
});

T('★api/claude.js に 前置きを べた書きしていない', () => {
  const src = fs.readFileSync(path.join(ROOT, 'api/claude.js'), 'utf8');
  for (const 悪い of ['const SYSTEM_PROMPT_BASE = ', 'const EXALLY_UNSUPPORTED = ']) {
    if (src.indexOf(悪い) >= 0) throw new Error('★べた書きが 戻っています★: ' + 悪い);
  }
});

T('★★前置きが 台帳と 食い違っていない（動かない関数を 勧めない）★★', () => {
  const p = handler.__buildPromptParts({ group: 'latest', name: 'Excel 365' });
  const 全 = p.共通 + p.版ごと;
  const r = 食い違い(全, 台帳);
  if (r.使えるのに使えないと言う.length) {
    throw new Error('★足してあるのに「使えない」と 書いている★: ' + r.使えるのに使えないと言う.join(', '));
  }
  if (r.動かないのに黙っている.length) {
    throw new Error('★動かないのに 1つも 教えていない★: ' + r.動かないのに黙っている.join(', ')
      + '\n   → node scripts/make-prompt.mjs を 走らせて commit してください');
  }
});

T('★どの 版でも 前置きが 組める（版ごとの 決まりが 入る）', () => {
  for (const g of ['latest', 'newer', 'older', 'online', 'exally_only']) {
    const p = handler.__buildPromptParts({ group: g, name: 'X' });
    if (p.版ごと.indexOf('ユーザーのExcel環境') < 0) throw new Error(g + ' の 決まりが 入っていない');
    if ((p.共通 + p.版ごと).length < 1500) throw new Error(g + ' の 前置きが 短すぎる');
  }
});

T('★prompt が 1本でも 読めなければ 500・合言葉 shitaku_tarinai（AIのせいに しない）', () => {
  const 分ける = handler.__失敗を分ける;
  const e = Object.assign(new Error('prompt が 読めません'), { 支度足りない: true });
  const r = 分ける(e);
  if (r.status !== 500 || r.合言葉 !== 'shitaku_tarinai') {
    throw new Error('★' + JSON.stringify(r) + '★（ai_shippai だと「AI側の問題です」と 嘘を 言う）');
  }
});

T('★Vercel に prompt/ を 載せる 設定が 在る（配信で 読めないと 全部 500）', () => {
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const inc = v.functions && v.functions['api/claude.js'] && v.functions['api/claude.js'].includeFiles;
  if (!inc || String(inc).indexOf('prompt') < 0) {
    throw new Error('vercel.json の functions.includeFiles に prompt/** が 在りません');
  }
});

T('★機械が 作る ファイルは 台帳と 一致（--check が 通る）', () => {
  const r = require_('node:child_process').spawnSync(process.execPath,
    [path.join(ROOT, 'scripts/make-prompt.mjs'), '--check'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('make-prompt --check が 赤: ' + (r.stdout || '').trim());
});

const p0 = handler.__buildPromptParts({ group: 'latest', name: 'Excel 365' });
console.log('\n── 実測 ──');
console.log('  前置き … 共通 ' + p0.共通.length + '字 ／ 版ごと ' + p0.版ごと.length + '字');
console.log('  台帳 … 動く ' + (台帳.足す.length + Object.keys(台帳.別のlibで足す || {}).length)
  + '個 ／ 動かない ' + Object.keys(台帳.足さない).length + '個');
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
