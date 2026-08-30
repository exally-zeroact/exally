/* ctx-menu-items.test.mjs — ★右クリックの 中身が 実Excel に 追いついているか★ 2026-08-31
 *
 *  ★場所が 収まるか★は tests/ctx-menu.test.mjs（2026-08-21 の 事故の 見張り）。
 *  ★こちらは 中身★＝実Excel の 命令を どれだけ 持てているか。
 *
 *  ★なぜ★（司さん 2026-08-30）
 *    「Excel を 細胞分解レベルまで 網羅して 把握した上で 持ち込み パクる」
 *    実測＝実Excel の 右クリックは ★1,384 命令★／うちは ★25個★ だった。
 *
 *  ★この 見張りが 見る物★
 *    ① 中身の 正本は lib/ctx-menu.js（画面に 直に 書いていない）
 *    ② ★新しい 働きを 作っていない★＝呼ぶ先は
 *       ・リボンの 249個（lib/ribbon-actions.js）
 *       ・画面の 元から 在る 関数（book.html の ctxCut など）
 *       ★どちらにも 無い 名前を 書いたら 赤★（＝押しても 何も 起きないボタン）
 *    ③ ★数が 減っていない★（37個）
 *    ④ ★出さない 物には 理由が 書いてある★（Copilot など）
 *
 *  ★本物の 確かめは 実ブラウザ★（node では 押せない）
 *    2026-08-31 に ★37個 全部 押して 落ち0★ を 実測した。
 *
 *  走らせ方: node tests/ctx-menu-items.test.mjs  ／  --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const NL = String.fromCharCode(10);
let ok = 0, ng = 0;
const 言う = (よい, 文, 添え) => {
  if (よい) { ok++; console.log('  ok   ' + 文); }
  else { ng++; console.log('  NG   ' + 文); if (添え) console.log('       ' + 添え); }
};

const 中身 = require_(path.join(ROOT, 'lib/ctx-menu.js'));
const 働き = require_(path.join(ROOT, 'lib/ribbon-actions.js'));
const book = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
const { 注記を外す } = await import(
  pathToFileURL(path.join(ROOT, 'scripts/lib/chuki.mjs')).href);
const 素 = 注記を外す(book);

console.log('★右クリックの 中身（実Excel の 命令）★');

/* ── ① 正本は 部品の 側 ── */
言う(/ctx-menu\.js/.test(素), '★画面が 部品を 読み込んでいる★');
言う(/CtxMenu\.出す\(/.test(素), '★画面は 部品から 中身を もらっている★',
  '★画面に 直に 書くと 2つに 分かれて ずれる★');

/* ── ② 呼ぶ先が 全部 生きているか ── */
/* ★中身は 関数で 入れる★（押せるか() は typeof で 見るので
   1 を 入れると ★在るのに 押せないと 出る★。2026-08-31 実際に 踏んだ） */
const 画面の関数 = {};
for (const m of 素.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/g) || []) {
  画面の関数[m.replace(/^function\s+/, '').replace(/\s*\($/, '')] = function () {};
}
言う(Object.keys(画面の関数).length > 200,
  '★空振りしていない（画面の 関数 ' + Object.keys(画面の関数).length + '個 を 見た）★');
言う(Object.keys(働き).length > 200,
  '★リボンの 働きを 読めた（' + Object.keys(働き).length + '個）★');

const 死んだ = [];
(function 潜る(一覧) {
  for (const v of 一覧) {
    if (v.穴 || v.区切り) continue;
    if (v.子) { 潜る(v.子); continue; }
    if (v.リボン && typeof 働き[v.リボン] !== 'function') 死んだ.push(v.名 + ' → リボン:' + v.リボン);
    if (v.画面 && !画面の関数[v.画面]) 死んだ.push(v.名 + ' → 画面:' + v.画面);
    if (!v.リボン && !v.画面) 死んだ.push(v.名 + ' → 呼ぶ先が 書いていない');
  }
}(中身.表));
言う(死んだ.length === 0, '★呼ぶ先は 全部 生きている（新しい 働きを 作っていない）★',
  死んだ.join(NL + '       '));

/* ── ③ 数 ── */
const 数 = 中身.数える(働き, 画面の関数);
const 下限 = 37;   /* ★2026-08-31 の 実測★（2026-08-21 は 25個） */
言う(数.押せる >= 下限,
  '★押せる 物 ' + 下限 + '個 以上（今 ' + 数.押せる + '個）★');
言う(数.押せる === 数.表の全部,
  '★表に 書いた 物は 全部 出せる（今 ' + 数.押せる + '/' + 数.表の全部 + '）★',
  '★出せない＝呼ぶ先が 無い＝偽のボタンに なる★');
/* ★★司さんの 差し戻し（2026-08-31）★★
   「複雑に するなって 言うてなかったか？」
   私は 37個 全部を 組（▸）に まとめ、
   ★前から 在った 25個の うち 17個を 1押し → 2段★に 落とした。
   ⇒ ★前からの 物は 平らに 戻した★ので 上の段は 30行に なる。

   ★高さでは なく「大事な物が 送らずに 見えるか」で 見る★
     2026-08-21 の 事故は ★大事な5つが 真ん中に 埋もれて 届かなかった★事。
     実測（2026-08-31）：高さ 925px ∕ 見える 659px → 送るが、
     ★大事な5つは 1～9番★なので ★送らずに 見える★。 */
言う(数.上の段 <= 32,
  '★上の段は 32行まで（今 ' + 数.上の段 + '行）★',
  '★増やすなら 大事な物が 送らずに 見えるか 測り直す★');
言う(数.組 === 5,
  '★組（▸）は 5つだけ＝2026-08-31 に 足した 12個の分★（今 ' + 数.組 + '組）',
  '★前からの 物を 組に 入れない★');
言う(数.組の中 === 12,
  '★組の 中は 12個＝足した 分だけ★（今 ' + 数.組の中 + '個）');
/* ★前からの 物が 2段に 落ちていないか★ */
{
  const 落ちた = [];
  for (const v of 中身.表) {
    if (!v.子) continue;
    for (const c of v.子) if (中身.前からの物.indexOf(c.画面) >= 0) 落ちた.push(v.名 + ' ▸ ' + c.名);
  }
  言う(落ちた.length === 0,
    '★★前から 在った 物が 2段に 落ちていない（1押しのまま）★★',
    落ちた.join(NL + '       '));
}

/* ── ④ 出さない 物に 理由 ── */
const 理由なし = Object.keys(中身.出さない).filter((k) => !String(中身.出さない[k]).trim());
言う(理由なし.length === 0, '★出さない 物には 理由が 書いてある★', 理由なし.join(' / '));
言う(Object.keys(中身.出さない).length >= 10,
  '★出さない 物を 数えている（' + Object.keys(中身.出さない).length + '個）★');

/* ── 元の 実測 ── */
言う(fs.existsSync(path.join(ROOT, 'docs/excel-commandbars-2026-08-30.tsv')),
  '★元の 実測が 在る（docs/excel-commandbars-2026-08-30.tsv）★');

/* ── わざと 壊して 赤に なるか ── */
if (process.argv.includes('--self-test')) {
  console.log('\n★わざと 壊して 赤に なるか★');
  言う(中身.数える({}, {}).押せる === 0, '★呼ぶ先が 空なら 0個（偽のボタンを 出さない）★');
  言う(中身.押せるか({ リボン: '在るわけない名前' }, 働き, {}) === false,
    '★無い 名前は 押せないと 判る★');
  言う(中身.押せるか({ 画面: 'ctxCut' }, 働き, 画面の関数) === true,
    '★在る 名前は 押せると 判る★');
  const 空組 = 中身.出す({}, { ctxCut: 1 });
  言う(空組.filter((v) => v.子).length === 0, '★中身が 無い 組は 出さない（空の ▸ を 見せない）★');
  言う(中身.数える(働き, 画面の関数).押せる >= 下限, '★本物は 壊していない★');
}

console.log('\nctx-menu-items: ' + ok + '/' + (ok + ng) + ' passed');
process.exit(ng ? 1 : 0);
