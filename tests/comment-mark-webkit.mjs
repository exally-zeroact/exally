/* comment-mark-webkit.mjs — ★画面が した 約束を「描いた物」で 確かめる★ 2026-09-03
 *
 *  ★約束（画面に そう 書いてある）★
 *    「コメントが 付いたセルには ★右上に 赤い印★ が 出ます（実Excelと 同じ）。」
 *    印 … book.html の data-yakusoku="comment-mark"／台帳 … lib/yakusoku-daicho.js
 *
 *  ★なぜ 本物の ブラウザが 要るか★
 *    ★canvas に 描いた 点の 色★でしか 見られない。jsdom は 絵を 描かないので 出来ない。
 *    ⇒★週1の 回（.github/workflows/webkit.yml）で 本当に 測る★
 *
 *  ★★物差しを 先に 疑う（2026-09-03 に 2回 踏んだ）★★
 *    ①★描く前に 読んでいた★ … render() の 後に ★画面が 描き終わるのを 待つ★必要が 在る
 *       （待たずに 読んだら ★印が 在る はずの 形でも 赤 0点★＝嘘の「守られていない」）
 *    ②だから ★先に「印が 描かれる はずの 形」で 赤が 読めるか★ を 見る。
 *       ★読めなければ この 試験は 何も 言わない（未測定）★＝★0点を「守られていない」と 言わない★
 *
 *  走らせ方: node tests/comment-mark-webkit.mjs [--self-test]
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
import { borrow, launch, unmeasured } from '../scripts/_borrow-playwright.mjs';

/** ★その場で 立てる 小さい 配信★（読むだけ・127.0.0.1 だけ） */
function 立てる(root) {
  const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const s = http.createServer((req, res) => {
    const 道 = decodeURIComponent(String(req.url).split('?')[0]);
    let f = path.join(root, 道.replace(/^\/+/, ''));
    /* ★わざと 壊した book.html を 食わせる 口★（--self-test で 使う） */
    if (道 === '/book.html' && process.env.EXALLY_CM_BOOK) f = process.env.EXALLY_CM_BOOK;
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('no'); }
    res.setHeader('content-type', 型[path.extname(f).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => {
    r({ url: 'http://127.0.0.1:' + s.address().port, 閉じる: () => s.close() });
  }));
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = 'comment-mark';
const SELF = process.argv.includes('--self-test');

let pass = 0, fail = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};

const webkit = await borrow(TAG, 'webkit');
const browser = await launch(TAG, webkit, {}, 'webkit');
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

console.log('');
console.log('[' + TAG + '] ★コメントの 赤い印＝画面の 約束を 描いた物で 確かめる★');

/* ★file:// では 部品が 読めない事が 在る★（2026-09-03 実測＝物差しが 通らなかった）
   ⇒★その場で 小さい 配信を 立てて http で 開く★（外へは 出ない・127.0.0.1 だけ） */
const 配信 = await 立てる(ROOT);
await page.goto(配信.url + '/book.html');
/* ★ログインの 代わり★（本物の ログインは 出来ない）＝★何を したか 隠さない★ */
await page.evaluate(() => {
  document.body.classList.remove('exally-locked');
  const ov = document.getElementById('loginOv'); if (ov) ov.remove();
  window.dispatchEvent(new Event('resize'));
});

/** A1 の 中の ★赤い 点★ を 数える（★描き終わるのを 待ってから★ 読む） */
const 赤を数える = (結合にする) => page.evaluate(async (結合) => {
  const s = window.sheets[window.activeSheet];
  s.data = {}; s.comments = {};
  window.setCell(0, 0, 'あ');
  s.comments['0,0'] = { 文: 'ためし', 誰: 'わたし', いつ: '2026/9/3' };
  if (結合) s.data['0,0'].mergeEnd = { r: 0, c: 0 };
  window.sel(4, 4, 4, 4);            /* 選んだ 青を 混ぜない */
  window.render();
  /* ★描き終わるのを 待つ★＝これが 無いと 印が 在っても 0点に なる（2026-09-03 実測） */
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  /* ★箱を 切って 読まない★＝★全部 読んでから A1 の 中か 見る★
     （2026-09-03 実測＝箱で 切ると 0点に なる事が 在った／全部 読むと 15点 出た）*/
  const cv = document.getElementById('grid-canvas');
  const ctx = cv.getContext('2d');
  const 全 = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const x = window.colX(0), y = window.rowY(0), w = window.cW(0), h = window.rH(0);
  let 赤 = 0, A1の中 = 0;
  for (let i = 0; i < 全.length; i += 4) {
    if (!(全[i] > 180 && 全[i + 1] < 110 && 全[i + 2] < 110)) continue;
    赤++;
    const n = i / 4, px = n % cv.width, py = Math.floor(n / cv.width);
    if (px >= x && px < x + w && py >= y && py < y + h) A1の中++;
  }
  return { 赤, A1の中, A1: Math.round(x) + ',' + Math.round(y) + ' ' + Math.round(w) + 'x' + Math.round(h) };
}, 結合にする);

/* ── ①物差しが 通るか（★先に これ★） ── */
const 結合 = await 赤を数える(true);
if (結合.A1の中 === 0) {
  await browser.close();
  配信.閉じる();
  unmeasured(TAG,
    '★物差しが 通りません★＝印が 描かれる はずの 形（結合セル）でも 赤が 0点。'
    + '★読み方（場所・倍率・待ち方）が 悪い＝この 試験は 何も 言いません★', 'webkit');
}
T('★物差しが 通っている（印が 在る 形で A1 の 中に 赤 ' + 結合.A1の中 + '点／画面ぜんぶで '
  + 結合.赤 + '点・A1＝' + 結合.A1 + '）★', 結合.A1の中 > 0);

/* ── ②約束は 守られているか ── */
const ふつう = await 赤を数える(false);
T('★コメントを 付けた ふつうの セルに 赤い印が 出る（今 A1 の 中に ' + ふつう.A1の中
  + '点／画面ぜんぶで ' + ふつう.赤 + '点）★', ふつう.A1の中 > 0,
  '★画面には「右上に 赤い印が 出ます」と 書いてある のに 出ていません★'
  + '（印を 描く 数行が ★結合セルだけを 回す 輪★の 中に 在る＝book.html）');

/* ── わざと 壊して 赤に なるか ── */
/* ★前の 自己確認は 取り下げました★（2026-09-03）
   前 …「★描き終わるのを 待たずに 読むと 0点に なる★」を 見ていた。
   ⇒ 直した後は ★待たなくても 10点 読めて しまう★＝★再現しない★。
   ⇒★再現しない 物を 自己確認に しない★（★「たまに 赤」を 見張りに しない★）
   今 …★直しを わざと 元に 戻して（drawText の 呼び出しを 消して）赤に なるか★を 見る。 */
if (process.argv.includes('--self-test')) {
  console.log('');
  console.log('★わざと 壊して 赤に なるか★');
  const fsx = await import('node:fs');
  const 元 = fsx.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
  const 壊す = [
    ['★drawText の 呼び出しを 消す（直す前に 戻す）★',
      (t) => t.replace('  コメントの印を描く(r, c, x, y, w);' + String.fromCharCode(10), '')],
    /* ★「色を 変える」は 自己確認に 使えません★（2026-09-03 実測）
       ＝★物差し（結合セルで 赤が 読めるか）まで 通らなく なる★
       ⇒ この 試験は ★正しく「未測定」と 言って 何も 言わずに 終わる★＝★赤に ならない★。
       ★それで 正しい★（★読めない のに「守られていない」と 言わない★）ので、
       ★自己確認には 使わない★。 */
  ];
  const tmp = path.join(ROOT, 'tests', '_cm_broken.html');
  const { execFileSync } = await import('node:child_process');
  for (const [名, f] of 壊す) {
    const 壊れ = f(元);
    if (壊れ === 元) { console.log('  ★素通り★  ' + 名 + '（印が 古い＝直せ）'); fail++; continue; }
    fsx.writeFileSync(tmp, 壊れ);
    let 赤 = false;
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'tests', 'comment-mark-webkit.mjs')], {
        env: { ...process.env, EXALLY_CM_BOOK: tmp }, stdio: 'pipe',
      });
    } catch (e) { 赤 = true; }
    console.log((赤 ? '  赤くなった  ' : '  ★素通り★  ') + 名);
    if (!赤) fail++;
  }
  try { fsx.unlinkSync(tmp); } catch (e) { /* 無くてよい */ }
}

await browser.close();
配信.閉じる();
console.log('');
console.log(TAG + ': ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
