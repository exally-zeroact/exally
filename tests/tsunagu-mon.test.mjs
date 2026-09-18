/* tsunagu-mon.test.mjs — ★台を お客さんの 画面に 繋ぐ 手を 止める 門★（2026-09-18）
 *
 *  ★★なぜ 要るか★★
 *    `docs/measured/tsunagu-dandori.md` ④ … ★経営者1 が 条件に した 物★
 *      「★繋ぐ 前に 必ず 赤に なる 見張り★」
 *      「★『繋いだら 赤』では なく ★繋ぐ 前から 赤★★」
 *      　＝`book.html` に `shiki-*` が 1本でも 入ったら 赤 ⇒★入れる 手が 止まる★
 *
 *  ★★なぜ「繋いだら 赤」では 駄目か★★
 *    ★繋いだ 後に 赤に なる 見張りは、★お客さんに 届いてから★ 鳴ります★
 *    ⇒★記憶「見張りの 値打ちは 赤に する 事では なく ★いつ 赤に なるか★」★
 *      その場（直せる）／後から（運）／気づかない（直せない）
 *    ⇒★この 門は ★その場★に 置きます★
 *
 *  ★★名簿を 手で 書きません★★
 *    ★毎回 引き算で 作ります★ … 実Excel の 名簿 − （土台 ＋ 皮）
 *    ★訳★ 2026-09-16 に `_xlfn.` の 名簿を 手で 書いて いて ★91個 漏れました★
 *    ⇒★手で 書いた 名簿は 足した 日に 必ず 消し忘れます★
 *
 *  ★★この 門が 見て いない 事★★
 *    ・★「台が 出せる」は ★名前の 一覧★です★（★正しく 答えるかは 別★）
 *    ・★どちらの 道（㋐落とさない ／ ㋑借り物へ 落とす）に するかは ★司さんの 決め★★
 *      ⇒★この 門は どちらでも 同じに 止めます★＝★決めが 紙に 出るまで 手を 止める★
 *
 *  使い方: node tests/tsunagu-mon.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
let pass = 0, fail = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};

console.log('');
console.log('[tsunagu-mon] ★台を 画面に 繋ぐ 手を 止める 門★');

/* ══ ①実Excel の 名簿（★手で 書かない★） ══ */
const 実道 = fs.readdirSync(path.join(ROOT, 'docs/measured'))
  .filter((f) => /^excel-functions-.*\.txt$/.test(f)).sort();
T('★実Excel の 名簿が 在る★', 実道.length > 0, 'docs/measured/excel-functions-*.txt');
const 実Excel = new Set(
  実道.length ? fs.readFileSync(path.join(ROOT, 'docs/measured', 実道[実道.length - 1]), 'utf-8')
    .split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
    .map((s) => s.split(/[\s\t]/)[0].toUpperCase()) : []
);
/* ★★読めない 数で 引き算を すると 嘘の 一覧が 出ます★★（2026-09-16 に 踏んだ） */
T('★実Excel の 名簿が 500個 以上 読めた★', 実Excel.size >= 500, 実Excel.size + '個');

/* ══ ②台が 出せる 名前（★`kami-ga-nai-kansuu.mjs` と 同じ 読み方★） ══ */
const K = require_(path.join(ROOT, 'lib/shiki-kansuu.js'));
const Tsu = require_(path.join(ROOT, 'lib/shiki-tsunagi.js'));
const 土台名 = Object.keys(K.表 || {});
const 皮名 = Tsu.名前たち();
const 台 = new Set([...土台名, ...皮名].map((x) => String(x).toUpperCase()));
T('★台が 300個 以上 読めた★（★読み方が 壊れたら 嘘の 緑に なる★）',
  台.size >= 300, '台 ' + 台.size + '個（土台 ' + 土台名.length + ' ＋ 皮 ' + 皮名.length + '）');

const 台にない = [...実Excel].filter((n) => !台.has(n)).sort();
console.log('  ★★台に 無い … ' + 台にない.length + '個★★'
  + '（実Excel ' + 実Excel.size + ' − 台 ' + 台.size + '）');

/* ══ ③★上限（★今日の 数★）★ … ★増えたら 赤★ ══
     ★余裕を 残さない★＝余裕の 在る 門は 止めません（2026-09-18 に 決めた） */
const 上限 = 37;   /* ★2026-09-18 … 49 → 42（1束目 7個）→ 37（2束目 5個）★ */
T('★★台に 無いが ' + 上限 + '個 以下★★（★増えたら 赤★）',
  台にない.length <= 上限,
  '出た ' + 台にない.length + '個 ／ 上限 ' + 上限 + '個'
  + '\n       ★減ったなら この 上限も 下げて ください★');
if (台にない.length < 上限) {
  console.log('  ★★上限を ' + 台にない.length + ' に 下げて ください★★'
    + '（★余裕を 残すと 止まらない 門に なります★）');
}

/* ══ ④★★繋ぐ 前から 赤★★ ══ */
const book = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf-8');
const src = [...book.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
const shiki本 = src.filter((s) => /(^|\/)shiki-[^/]*\.js/.test(s));
const hf本 = src.filter((s) => /hyperformula/i.test(s));
console.log('  ★book.html の script src★ … shiki-* ' + shiki本.length + '本'
  + ' ／ hyperformula ' + hf本.length + '本');

T('★★台に 無いが 残って いる 間は `book.html` に `shiki-*` を 入れない★★',
  台にない.length === 0 || shiki本.length === 0,
  '台に 無い ' + 台にない.length + '個 ／ 入って いる shiki-* ' + shiki本.length + '本'
  + '\n       ' + shiki本.join(' ')
  + '\n       ★どちらの 道に するかは 司さんの 決めです★'
  + '\n       ＝`docs/measured/tsunagu-dandori.md` ③ の ㋐／㋑'
  + '\n       ★決めが 紙に 出るまで ここで 止めます★');

T('★★台に 無いが 残って いる 間は `hyperformula` を 外さない★★',
  台にない.length === 0 || hf本.length >= 1,
  'hyperformula ' + hf本.length + '本 ／ 台に 無い ' + 台にない.length + '個'
  + '\n       ★先に 外すと ★台が 知らない 式が 一斉に #NAME? に なります★');

/* ══ ⑤★名簿を 手で 書いて いないか★（★この 門 自身を 読む★） ══
     ★訳★ 手で 書いた 名簿は ★足した 日に 消し忘れます★ */
const 自分 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf-8');
const 焼き込み = 台にない.filter((n) => n.length >= 4 && 自分.includes(n));
T('★台に 無い 関数の 名前を この 門に 焼き込んで いない★',
  焼き込み.length === 0, '焼き込み ' + 焼き込み.length + '個 … ' + 焼き込み.join(' '));

/* ══ ⑥★もう 1つの 道具と 数が 合うか★（★読み方が 2本に 割れて いないか★） ══ */
const r = spawnSync(process.execPath, [path.join(ROOT, 'docs/measured/kami-ga-nai-kansuu.mjs')],
  { encoding: 'utf-8' });
const 出 = String(r.stdout || '') + String(r.stderr || '');
const m = 出.match(/台に 無い★★ ………………… (\d+)個/);
T('★もう 1つの 道具（kami-ga-nai-kansuu.mjs）が 数を 出せた★', !!m,
  '出しの 頭 … ' + 出.slice(0, 120).replace(/\n/g, ' '));
T('★★2つの 道具の 数が 合う★★（★読み方が 割れて いない★）',
  !!m && Number(m[1]) === 台にない.length,
  'この 門 ' + 台にない.length + '個 ／ もう 1つ ' + (m ? m[1] : '(読めず)') + '個');

console.log('');
console.log('  ★★今 どこまで 来たか★★');
console.log('    ・台が 出せる … ' + 台.size + '個（土台 ' + 土台名.length + ' ＋ 皮 ' + 皮名.length + '）');
console.log('    ・★あと ' + 台にない.length + '個★（実Excel 519 の 名簿で 数えた 数）');
console.log('    ・★この 門は 「繋いで よいか」だけを 見ます★＝★正しく 答えるかは 別の 門★');
console.log('');
console.log('tsunagu-mon: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
