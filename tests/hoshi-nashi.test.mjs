/* hoshi-nashi.test.mjs — ★お客さんの 画面に 出る 字に ★ を 使わない★（2026-09-06）
 *
 *  ★★なぜ★★
 *    ★ は ★私たちの 便りの 印★（司さん・指示役・私の やりとり／コメント／書類）。
 *    ★お客さんには 壊れた 字に 見えます★。
 *    2026-09-06 … 書き出しの 窓の 字に 12個以上 出ていて 指示役に 止められた。
 *    同じ日に Rakunally も ★23件★ 直している（会社ぜんぶの 決まり）。
 *
 *  ★★上限を 付けない（0本）★★（2026-09-06 指示役の 裁定）
 *    私は「今 139本・増えたら 赤 → 減らす」を 出した ⇒★止められた★
 *    ★上限が 死ぬ 道は 2つ★
 *      ①★下げれば 通る★（今日 3回 出た）
 *      ②★減らす 途中で「今 120本だから 120に 上げよう」と なる★
 *        ⇒★『減らす 為の 上限』は 止まった 瞬間に 天井に なる★
 *    ⇒★★0本★＝★下げようが ない★
 *    ⇒ 出来る 理由＝★字を 消すだけ／お金も 計算も 動かない／1つの ファイルに 全部 在る★
 *
 *  ★★この 見張りが 守る 範囲（★半分です★・隠さない）★★
 *    ★見るのは「口を 通る 字」だけ★
 *      showToast(...) ／ notify(...) ／ 窓の副題(...) の ★第1引数★
 *    ★見ていない 物★
 *      ・HTML の 中の 字（ボタンの 札・見出し）… ★口が 決められない★
 *      ・lib が 返して 画面が 出す 字（例 lib/hairanai.js）… ★口では 拾えない★
 *      ・行を またぐ 連結 … ★1行目だけ 拾っている★
 *    ⇒★★本当の 数は ここで 出る 数より 多い★★
 *    ⇒★「0本に なったから 終わり」に しない★
 *
 *  使い方: node tests/hoshi-nashi.test.mjs
 *          node tests/hoshi-nashi.test.mjs --self-test
 *          node tests/hoshi-nashi.test.mjs --list   … ★赤の 一覧を 出す★（直す 時に 使う）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { 注記を外す } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/chuki.mjs')).href);
const { 口に渡る字, 星入り } = await import(pathToFileURL(path.join(ROOT, 'scripts/hoshi-kazoeru.mjs')).href);

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + (e && e.message)); } };

/* ★見る ファイル★＝配信する 画面の 物だけ（min は 除く） */
const 見る = [];
const 積む = (p) => { if (fs.existsSync(p)) 見る.push(p); };
積む(path.join(ROOT, 'book.html'));
積む(path.join(ROOT, 'hub.html'));
for (const d of ['js', 'lib']) {
  const dir = path.join(ROOT, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    if (/\.(js|mjs)$/.test(f) && !/\.min\./.test(f)) 積む(path.join(dir, f));
  }
}

const 赤 = [];
let 字の数 = 0;
for (const p of 見る) {
  const 渡る = 口に渡る字(注記を外す(fs.readFileSync(p, 'utf8')));
  字の数 += 渡る.length;
  for (const x of 星入り(渡る)) {
    赤.push({ 名: path.relative(ROOT, p).split(path.sep).join('/'), 口: x.口, 字: x.字 });
  }
}

if (process.argv.includes('--list')) {
  console.log('\n[hoshi-nashi --list] ★ が 混じっている 字（直す 時の 一覧）');
  const 束 = {};
  for (const x of 赤) (束[x.名] = 束[x.名] || []).push(x);
  for (const k of Object.keys(束)) {
    console.log('\n── ' + k + ' … ' + 束[k].length + '本 ──');
    for (const x of 束[k]) console.log('  [' + x.口 + '] ' + x.字.slice(0, 100));
  }
  console.log('\n合計 ' + 赤.length + '本');
  process.exit(0);
}

if (process.argv.includes('--self-test')) {
  console.log('\n[hoshi-nashi --self-test] わざと壊して赤になるか');
  T('★★ が 混じっていれば 見つける', () => {
    const r = 星入り(口に渡る字("notify('★あ★');"));
    if (r.length !== 1) throw new Error('見つけていない');
  });
  T('★混じっていなければ 出さない', () => {
    if (星入り(口に渡る字("notify('あ');")).length) throw new Error('誤検知');
  });
  T('★口で ない 所は 見ない（コメントや 記録の ★ は 数えない）', () => {
    if (口に渡る字("console.log('★あ★');").length) throw new Error('拾いすぎ');
  });
  T('★★上限を 持っていない（0本しか 通らない）★★', () => {
    /* ★この 試験の 中に 数の 線が 書いてあったら 赤★
       ＝「◯本まで 許す」を 作らせない（★下げれば 通る★に なる） */
    const 本文 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const 素 = 注記を外す(本文);
    if (/赤\.length\s*[<>]=?\s*[1-9]/.test(素)) throw new Error('★上限を 作っています★');
  });
  T('★守る 範囲を 書いてある（半分だと 名乗る）', () => {
    const 本文 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
    for (const 要る of ['口を 通る 字', 'HTML の 中の 字', 'lib が 返して', '行を またぐ 連結']) {
      if (本文.indexOf(要る) < 0) throw new Error('書いていない: ' + 要る);
    }
  });
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

console.log('\n[hoshi-nashi] お客さんの 画面に 出る 字に ★ を 使っていないか');

T('★検査が 空振りしていない（口を 通る 字を 実際に 数えている）', () => {
  if (字の数 < 100) throw new Error('拾えた 字が 少なすぎます: ' + 字の数 + '本');
});

T('★★お客さんの 画面に 出る 字に ★ が 0本★★', () => {
  if (赤.length) {
    const 束 = {};
    for (const x of 赤) 束[x.名] = (束[x.名] || 0) + 1;
    throw new Error('★' + 赤.length + '本 出ています★'
      + '\n   ' + Object.keys(束).map((k) => k + ' … ' + 束[k] + '本').join('\n   ')
      + '\n   → 一覧は  node tests/hoshi-nashi.test.mjs --list'
      + '\n   → ★ は 私たちの 便りの 印です。お客さんには 壊れた 字に 見えます。');
  }
});

console.log('\n── 実測 ──');
console.log('  口 … 3種類（showToast ／ notify ／ 窓の副題）');
console.log('  口を 通る 字 … ' + 字の数 + '本');
console.log('  ★ が 混じっている … ' + 赤.length + '本');
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
