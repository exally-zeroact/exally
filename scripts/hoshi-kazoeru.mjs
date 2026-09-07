/* hoshi-kazoeru.mjs — ★お客さんの 画面に 出る 字に ★ が 混じっていないか 数える★（2026-09-06）
 *
 *  ★★なぜ★★
 *    ★ は ★私たちの 便りの 印★（司さん・指示役・私の やりとり）。
 *    ★お客さんには 壊れた 字に 見えます★。
 *    2026-09-06 に 指示役から 指摘され、書き出しの 窓の 字から 12個以上 抜いた。
 *    同じ日に Rakunally も ★23件★ 直している（会社ぜんぶの 決まり）。
 *
 *  ★★数える 前に「どこが お客さんの 画面か」を 決める★★（指示役の 条件）
 *    ★repo 全体で ★ を 数えたら 何千件★ 出る。
 *    コメント・書類・私たちの 便り・記憶は ★★ を 使ってよい 所★。
 *    ⇒★口を 名指しして、その 口に 渡る 字だけ 数える★
 *
 *  ★★口＝3種類（名指し）★★
 *    ①`showToast(...)` … 画面の 上に 出る 知らせ
 *    ②`notify(...)`    … 同上（book.html の 別名）
 *    ③`窓の副題(...)`   … 窓の 下の 説明（#funcSub）
 *    ⇒★どれも「第1引数が お客さんに 出る 字」★
 *
 *  ★★数えない 物（はっきり 書く）★★
 *    ・コメント（// と 星印つき 注記）… ★私たちの 便り＝★ でよい★
 *    ・HTML の 中の 字（ボタンの 札・見出し）… ★口が 決められない★ので この 回は 見ない
 *    ・lib が 返して 画面が 出す 字（例 lib/hairanai.js）… ★口では 拾えない★
 *      ⇒★この 3つは 別に 数える 必要が 在る＝★半分しか 見ていない★★
 *
 *  使い方: node scripts/hoshi-kazoeru.mjs
 *          node scripts/hoshi-kazoeru.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { 注記を外す } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/chuki.mjs')).href);

/** ★純関数★＝字の 中から「口に 渡る 文字列」を 拾う
 *  ★注記は 先に 外して 渡す★（コメントの ★ を 数えない） */
export function 口に渡る字(注記なしの字) {
  const 口 = ['showToast', 'notify', '窓の副題'];
  const 出 = [];
  for (const k of 口) {
    /* `口(` の 後ろから ★同じ行に 在る 文字列リテラル★を 拾う
       （行をまたぐ 連結は 1本目だけ＝★拾えない分は 下で 正直に 書く★） */
    /* ★`\b` は ASCII の 区切りしか 見ない★＝日本語の 名前（窓の副題）の 前では 効かない
       ⇒★2026-09-06 の self-test が 掴んだ★（自分の 道具が 先に 赤に なった）
       ⇒ 名前が ASCII で 始まる 時だけ 付ける */
    const 頭 = /^[A-Za-z_$]/.test(k) ? '\\b' : '';
    const re = new RegExp(頭 + k + '\\s*\\(', 'g');
    let m;
    while ((m = re.exec(注記なしの字))) {
      const 後ろ = 注記なしの字.slice(m.index, m.index + 400);
      const 行 = 後ろ.split('\n')[0];
      const 字 = [...行.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
        .map((x) => (x[1] !== undefined ? x[1] : x[2]));
      if (字.length) 出.push({ 口: k, 字: 字.join('') });
    }
  }
  return 出;
}

/** ★★ が 混じっている 物だけ 返す */
export function 星入り(渡る字) {
  return 渡る字.filter((x) => x.字.indexOf('★') >= 0);
}

/* ★★取り込まれた 時は 走らない★★（2026-09-06 実測で 踏んだ）
   ★★会社の 決まりが 3日前から 在りました★★
     記憶 `feedback_global_tool_must_not_judge_itself_by_argv.md`（2026-09-02 Rakunally）
     「全プロセスに 読ませる 道具は ★argv で 自分を 判定するな★
       ＝同じ `--self-test` の 見張りを 丸ごと 乗っ取り ★走らずに 緑★ ★74本★」
   ⇒★私は それを 読まずに 同じ 穴を 踏み、自分で 見つけて 直しました★
   ⇒★決まりを 書くのは 直しでは ない★の 実例（決まりは 在ったが 効かなかった）
   tests/hoshi-nashi.test.mjs が この ファイルを import した所、
   ★向こうの --self-test を こちらが 食べて 先に 終了した★
   ⇒★向こうの self-test が 1本も 走らないのに 緑に 見えた★
   ⇒★自分が 直に 走らされた 時だけ 動く★ */
const 直に走った = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (直に走った && process.argv.includes('--self-test')) {
  let pass = 0, fail = 0;
  const T = (n, c, 添) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  ★NG★ ' + n + (添 ? ' … ' + 添 : '')); } };
  console.log('\n[hoshi-kazoeru --self-test] わざと壊して赤になるか');
  T('★口に 渡る 字を 拾える', 口に渡る字("showToast('あ');").length === 1);
  T('★★ が 混じっていれば 見つける', 星入り(口に渡る字("notify('★あ★');")).length === 1);
  T('★混じっていなければ 出さない', 星入り(口に渡る字("notify('あ');")).length === 0);
  T('★口で ない 所は 拾わない', 口に渡る字("console.log('★あ★');").length === 0);
  T('★窓の副題も 口', 口に渡る字("窓の副題('あ', 'name-insert');").length === 1);
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

/* ══ 数える（★直さない★） ═══════════════════════════════════ */
if (直に走った) {
const 見る = [];
const 積む = (p) => { if (fs.existsSync(p)) 見る.push(p); };
積む(path.join(ROOT, 'book.html'));
積む(path.join(ROOT, 'hub.html'));
for (const d of ['js', 'lib']) {
  const dir = path.join(ROOT, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (/\.(js|mjs)$/.test(f) && !/\.min\./.test(f)) 積む(path.join(dir, f));
  }
}

let 字の数 = 0, 星の数 = 0;
const ファイルごと = [];
const 見本 = [];
for (const p of 見る) {
  const 生 = fs.readFileSync(p, 'utf8');
  const 渡る = 口に渡る字(注記を外す(生));
  const 星 = 星入り(渡る);
  字の数 += 渡る.length;
  星の数 += 星.length;
  if (星.length) {
    ファイルごと.push({ 名: path.relative(ROOT, p).split(path.sep).join('/'), 数: 星.length });
    for (const x of 星.slice(0, 2)) 見本.push({ 名: path.relative(ROOT, p).split(path.sep).join('/'), 口: x.口, 字: x.字.slice(0, 70) });
  }
}
ファイルごと.sort((a, b) => b.数 - a.数);

console.log('\n[hoshi-kazoeru] お客さんの 画面に 出る 字の ★ を 数える（★直していません★）');
console.log('');
console.log('  口 ……………………………… 3種類（showToast ／ notify ／ 窓の副題）');
console.log('  その 口に 渡る 字 ………… ' + 字の数 + '本');
console.log('  ★ が 混じっている 物 …… ★' + 星の数 + '本★');
console.log('');
console.log('  一番 多い ファイル 3つ');
for (const f of ファイルごと.slice(0, 3)) console.log('    ' + f.名.padEnd(28) + f.数 + '本');
if (見本.length) {
  console.log('');
  console.log('  見本（先頭 5本）');
  for (const x of 見本.slice(0, 5)) console.log('    [' + x.口 + '] ' + x.字);
}
console.log('');
console.log('  ★この 数は 半分です（隠さず 書く）★');
console.log('    ・HTML の 中の 字（ボタンの 札・見出し）… 口が 決められないので 見ていない');
console.log('    ・lib が 返して 画面が 出す 字（例 lib/hairanai.js）… 口では 拾えない');
console.log('    ・行を またぐ 連結 … 1行目だけ 拾っている');
}
