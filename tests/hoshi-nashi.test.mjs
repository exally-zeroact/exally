/* hoshi-nashi.test.mjs — ★お客さんの 画面に 出る 字に ★ を 使わない★（2026-09-06・2026-10-08 に 広げた）
 *
 *  ★★なぜ★★
 *    ★ は ★私たちの 便りの 印★（司さん・指示役・私の やりとり／コメント／書類）。
 *    ★お客さんには 壊れた 字に 見えます★。
 *    2026-09-06 ... 書き出しの 窓の 字に 12個以上 出ていて 指示役に 止められた。
 *    同じ日に Rakunally も ★23件★ 直している（会社ぜんぶの 決まり）。
 *
 *  ★★上限を 付けない（0本）★★（2026-09-06 指示役の 裁定）
 *    ★上限が 死ぬ 道は 2つ★ ①下げれば 通る ②減らす 途中の 数が 天井に なる ⇒★0本★
 *
 *  ★★2026-10-08 に 広げた★★（Rakunally の 引き継ぎ＝司さん 指示・対立役が 叩いた）
 *    前は「口を 通る 字の ★同じ行★」だけで、★HTML の 本文を 見ず★、門は 緑の まま
 *    お客さんの 画面に ★ が 49本 出て いた（窓の 説明 41節＋行を またぐ 口 8本）。
 *    ★この 見張りが 守る 範囲★ ＝ scripts/hoshi-kazoeru.mjs の 注記（口を 通る 字・HTML の 中の 字・
 *      lib が 返して 画面が 出す 字は まだ・行を またぐ 連結は 括弧の 対で 取る）
 *    ★まだ 見て いない 置き場が 在る★（JS が 直に 書く 字 47・lib が 返す 字 8 など＝道具の 注記に 数）
 *    ⇒★「0本に なったから 終わり」に しない★
 *
 *  使い方: node tests/hoshi-nashi.test.mjs
 *          node tests/hoshi-nashi.test.mjs --self-test
 *          node tests/hoshi-nashi.test.mjs --list   ... ★赤の 一覧★
 */
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { 注記を外す } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/chuki.mjs')).href);
const 道具 = await import(pathToFileURL(path.join(ROOT, 'scripts/hoshi-kazoeru.mjs')).href);
const { 口に渡る字, 星入り, HTMLの見える字, 全部数える, 見るファイル } = 道具;

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + (e && e.message)); } };

/* ★歯★＝本物の 抽出の 道（口に渡る字・HTMLの見える字）を 通して 星が 在るか */
const 口の星 = (src, opt) => 星入り(口に渡る字(注記を外す(src), opt)).length;
const HTMLの星 = (html, opt) => HTMLの見える字(html, opt).filter((x) => x.字.indexOf('★') >= 0).length;

if (process.argv.includes('--self-test')) {
  console.log('\n[hoshi-nashi --self-test] ★本物の 抽出の 道を 通る 入力で 歯を 確かめる★');
  const 赤 = (n, v) => T(n + ' ⇒ 赤', () => { if (!(v > 0)) throw new Error('見つけて いない（' + v + '）'); });
  const 緑 = (n, v) => T(n + ' ⇒ 赤に しない', () => { if (v !== 0) throw new Error('拾いすぎ（' + v + '）'); });
  /* ── 口 ── */
  赤('口 notify(\'★あ★\')', 口の星("notify('★あ★');"));
  緑('口 notify(\'あ\')', 口の星("notify('あ');"));
  緑('口で ない console.log(\'★\')', 口の星("console.log('★あ★');"));
  緑('注記の 中の ★', 口の星("/* notify('★') */ notify('あ'); // notify('★')"));
  赤('窓の副題 も 口', 口の星("窓の副題('★', 'name-insert');"));
  赤('三項 演算子で 行を またぐ（2026-10-08 に 8本 素通りして いた 形）', 口の星("notify(x\n  ? '★あ' : 'い');"));
  赤('改行して + で つなぐ', 口の星("notify('あ'\n  + '★い');"));
  赤('テンプレート 文字列', 口の星('notify(`★${x}`);'));
  赤('JS の 逃がし \\u2605（逆斜線 1つ）', 口の星("notify('\\u2605あ');"));
  赤('JS の 逃がし \\u{2605}', 口の星("notify('\\u{2605}あ');"));
  緑('逃がしの 逆斜線を 逃がした \\\\u2605（字は「逆斜線 u2605」）', 口の星("notify('\\\\u2605');"));
  赤('逆斜線 3つ（逆斜線＋★）', 口の星("notify('\\\\\\u2605');"));
  赤('notify は innerHTML＝実体参照 &#9733; も ★', 口の星("notify('&#9733;あ');"));
  緑('窓の副題 は textContent＝&#9733; は 字の まま', 口の星("窓の副題('&#9733;');"));
  緑('&amp;#9733; は ★ に ならない（1回だけ 解く）', 口の星("notify('&amp;#9733;');"));
  /* ── HTML ── */
  赤('本文 <div>★注意</div>', HTMLの星('<div>★注意</div>'));
  赤('隠れた 窓の 中（hidden）＝JS が 開く ので 見える', HTMLの星('<div hidden><p>★注意</p></div>'));
  赤('display:none の 中も 見える', HTMLの星('<div style="display:none">★注意</div>'));
  緑('HTML の 注記 <!--★-->', HTMLの星('<!--★--><div>あ</div>'));
  緑('script の 中', HTMLの星("<script>var a='★';</script><div>あ</div>"));
  緑('style の 中', HTMLの星('<style>.a:after{content:"★"}</style><div>あ</div>'));
  赤('実体参照 &#9733;', HTMLの星('<div>&#9733;注意</div>'));
  赤('実体参照 &#x2605; ／ 頭に 0 ／ ; 無し ／ 名前 &starf;', HTMLの星('<div>&#x2605;&#09733;&#9733 &starf;</div>'));
  緑('&amp;#9733; は 字で「&#9733;」', HTMLの星('<div>&amp;#9733;</div>'));
  赤('属性 title="★"', HTMLの星('<div title="★あ">あ</div>'));
  赤('名簿に 無い 属性も 見る（data-tip="★"）', HTMLの星('<div data-tip="★あ">あ</div>'));
  緑('style 属性の 中', HTMLの星('<div style="--x:\'★\'">あ</div>'));
  赤('textarea と option の 字も 見える', HTMLの星('<textarea>★</textarea><select><option>★</option></select>'));
  /* ── 読み解きを 外すと 答えが 変わる（★復号が 効いて いる 証し★＝同じ 入力を 両方に 通す） ── */
  T('★口：逃がしを 解かないと \\u2605 を 見逃す（解く 1 ／ 解かない 0）★', () => {
    const 解 = 口の星("notify('\\u2605');"), 素 = 口の星("notify('\\u2605');", { 復号: false });
    if (!(解 === 1 && 素 === 0)) throw new Error('解く ' + 解 + ' ／ 解かない ' + 素);
  });
  T('★HTML：実体参照を 解かないと &#9733; を 見逃す（解く 1 ／ 解かない 0）★', () => {
    const 解 = HTMLの星('<div>&#9733;</div>'), 素 = HTMLの星('<div>&#9733;</div>', { 復号: false });
    if (!(解 === 1 && 素 === 0)) throw new Error('解く ' + 解 + ' ／ 解かない ' + 素);
  });
  T('★★上限を 持っていない（0本しか 通らない）★★', () => {
    const 素 = 注記を外す(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8'));
    if (/赤\.length\s*[<>]=?\s*[1-9]/.test(素)) throw new Error('★上限を 作っています★');
  });
  T('★守る 範囲を 書いてある（まだ 見て いない 置き場と 数を 名乗る）', () => {
    const 本文 = fs.readFileSync(path.join(ROOT, 'scripts/hoshi-kazoeru.mjs'), 'utf8');
    for (const 要る of ['まだ 見て いない 物', 'JS が 画面へ 直に 書く 字', 'lib が 返して 画面が 出す 字', '隠れて いる 所']) {
      if (本文.indexOf(要る) < 0) throw new Error('書いていない: ' + 要る);
    }
  });
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

const { 赤, 数 } = 全部数える(ROOT);

if (process.argv.includes('--list')) {
  console.log('\n[hoshi-nashi --list] ★ が 混じっている 字');
  for (const x of 赤) console.log('  ' + x.名 + ' [' + x.置き場 + '] ' + x.字.replace(/\s+/g, ' ').trim().slice(0, 100));
  console.log('\n合計 ' + 赤.length + '本');
  process.exit(0);
}

console.log('\n[hoshi-nashi] お客さんの 画面に 出る 字に ★ を 使っていないか');
T('★見る ファイルを 名前で 選んで いない（repo 直下の HTML 全部・js／lib の 下 全部）', () => {
  const 名簿 = 見るファイル(ROOT);
  const 直下 = fs.readdirSync(ROOT).filter((f) => /\.html$/i.test(f));
  if (名簿.html.length !== 直下.length || !直下.length) throw new Error('HTML ' + 名簿.html.length + ' ／ 直下 ' + 直下.length);
});
T('★検査が 空振りしていない（口を 通る 字 と HTML の 本文を 実際に 読んでいる）', () => {
  if (数.口の字 < 100) throw new Error('口を 通る 字が 少なすぎます: ' + 数.口の字);
  for (const [f, n] of Object.entries(数.本文)) if (!(n > 0)) throw new Error(f + ' の 本文が 読めて いない（' + n + '節）');
});
T('★★お客さんの 画面に 出る 字に ★ が 0本★★', () => {
  if (赤.length) {
    const 束 = {};
    for (const x of 赤) 束[x.名 + ' ' + x.置き場.split(' ')[0]] = (束[x.名 + ' ' + x.置き場.split(' ')[0]] || 0) + 1;
    throw new Error('★' + 赤.length + '本 出ています★\n   ' + Object.keys(束).map((k) => k + ' ... ' + 束[k] + '本').join('\n   ')
      + '\n   → 一覧は  node tests/hoshi-nashi.test.mjs --list');
  }
});
console.log('\n── 実測 ──');
console.log('  見た ファイル ' + 数.ファイル + '本 ／ 口を 通る 字 ' + 数.口の字 + '本 ／ HTML の 本文 ' + JSON.stringify(数.本文) + ' ／ 属性 ' + 数.属性);
console.log('  ★ が 混じっている ... ' + 赤.length + '本');
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
