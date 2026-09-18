/* shiki-wo-osu-webkit.mjs — ★お客さんと 同じ 道で 式を 打って 答えを 読む★（2026-09-18）
 *
 *  ★★なぜ 要るか（★決まりです★）★★
 *    `team/global-rules.md` §11 ②
 *      「★Claude Code が 実 UI で 全ボタン・全パターンを 操作する★」
 *      「★計算 lib 緑＝『ボタンが 押せる／画面が 動く／配線されてる』は 保証しない★」
 *    ⇒★★これまで「マスに 式を 打って 答えを 読む」は ★0本★でした★★
 *    ⇒★node で 出した 数は 画面の 数では ありません★（記憶の 決まり）
 *
 *  ★★どこを 開くかを 口（引数）で 選べます★★
 *    `--どこ=手元`     … 手元の ファイルを 小さい 配信で 出す（★既定★）
 *    `--どこ=<URL>`    … テスト版／本番 の 住所を そのまま
 *    ⇒★★同じ 道具で 3つとも 押せます★★＝★「テスト版だけ 違う」が すぐ 出ます★
 *    ⇒★鍵が 要るのは ★最後の 1回だけ★に なります★
 *
 *  ★★出す 物★★
 *    ・★分母つき★（◯ / ◯本）
 *    ・★空っぽの 控え★（★答えが 空の 物を 数える＝0件を 緑に しない★）
 *    ・★掛かった 秒★
 *    ・★`hyperformula` が 何本 読まれたか★／★`shiki-` が 何本★（★終わりの 線★）
 *
 *  ★★門★★
 *    ①★開けなかったら「開けなかった」と 書く★（★0件を 緑に しない★）
 *    ②★本数 決め打ち★（式の 数が 変わったら 赤）
 *    ③★1本ずつ 受け止める★（1本 転んでも 全部 止めない）
 *    ④★★読み込んだ 本数を 画面から 数える★★（★私の 見立てでは ない★）
 *    ⑤★秒が 毎回 同じなら 上限か 空振りを 疑う★
 *
 *  走らせ方:
 *    node tests/shiki-wo-osu-webkit.mjs
 *    node tests/shiki-wo-osu-webkit.mjs --どこ=https://……/book.html
 */
import path from 'node:path'; import http from 'node:http'; import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { borrow, launch } from '../scripts/_borrow-playwright.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};

/* ★どこを 開くか★ */
const 口 = (process.argv.find((a) => a.startsWith('--どこ=')) || '--どこ=手元').split('=').slice(1).join('=');
const 手元か = (口 === '手元');

/* ══ ★★押す 式（★ここが 分母★）★★ ══
   ★今日 書いた 13個を 中心に、★お客さんの 道で 本当に 動くか★ を 見ます★
   ★答えは ★字で★ 突き合わせます★（★出た 字が 同じ＝同じ★） */
const 式たち = [
  { 式: '=SUM(1,2,3)',                 答: '6',       訳: '★対照★ 前から 動く 物' },
  { 式: '=PERMUT(5,2)',                答: '20',      訳: '順列（09-18）' },
  { 式: '=PERMUTATIONA(5,2)',          答: '25',      訳: '順列（09-18）' },
  { 式: '=XMATCH(5,{1;3;5;7;9})',      答: '3',       訳: 'XMATCH（09-18）' },
  { 式: '=XMATCH(4,{1;3;5;7;9},-1)',   答: '2',       訳: 'XMATCH 次に小さい' },
  { 式: '=PERCENTRANK({1;3;5;7;9},4)', 答: '0.375',   訳: 'PERCENTRANK（09-18）' },
  { 式: '=UNICODE(ASC(UNICHAR(65313)))', 答: '65',    訳: 'ASC（09-18）' },
  { 式: '=UNICODE(DBCS(UNICHAR(65)))', 答: '65313',   訳: 'DBCS（09-18）' },
  { 式: '=LENB(UNICHAR(12354))',       答: '2',       訳: 'LENB（09-18）' },
  { 式: '=LEN(MIDB(UNICHAR(12354)&"A",2,2))', 答: '2', 訳: '★外した 1本★ MIDB' },
  { 式: '=TEXTAFTER("a-b-c","-")',     答: 'b-c',     訳: 'TEXTAFTER（09-18）' },
  { 式: '=TEXTBEFORE("a-b-c","-",2)',  答: 'a-b',     訳: 'TEXTBEFORE（09-18）' },
  { 式: '=AGGREGATE(9,6,{1;2;4;5})',   答: '12',      訳: 'AGGREGATE（09-18）' },
  { 式: '=AGGREGATE(19,6,{1;2;4;5},1)', 答: '1.25',   訳: '★外した 1本★ 機能19＝EXC' },
];
const 式の本数 = 14;

function 立てる(root) {
  const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const s = http.createServer((q, r) => {
    const f = path.join(root, decodeURIComponent(String(q.url).split('?')[0]).replace(/^\/+/, ''));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('no'); }
    r.setHeader('content-type', 型[path.extname(f).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((x) => s.listen(0, '127.0.0.1', () => x({ url: 'http://127.0.0.1:' + s.address().port, 閉じる: () => s.close() })));
}

console.log('');
console.log('[shiki-wo-osu-webkit] ★お客さんと 同じ 道で 式を 打って 答えを 読む★');
console.log('  ★どこ★ … ' + (手元か ? '手元（file を 小さい 配信で 出す）' : 口));

/* ★②本数の 門★ */
if (式たち.length !== 式の本数) {
  console.log('  NG   ★' + 式の本数 + '本の はずが ' + 式たち.length + '本です★');
  process.exit(4);
}
console.log('  ★押す 式 … ' + 式たち.length + '本★（決め打ち ' + 式の本数 + '本）');

const 時計 = Date.now();
const wk = await borrow('shiki-wo-osu', 'webkit');
const browser = await launch('shiki-wo-osu', wk, {}, 'webkit');
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const 配信 = 手元か ? await 立てる(ROOT) : null;
const 住所 = 手元か ? (配信.url + '/book.html') : 口;
let 開けた = false;
try {
  /* ★①開けなかったら「開けなかった」と 書く★ */
  const 返 = await page.goto(住所, { waitUntil: 'load', timeout: 60000 }).catch((e) => ({ エラー: e.message }));
  if (!返 || 返.エラー || (返.status && 返.status() >= 400)) {
    T('★開けた★', false, '★開けませんでした★ ' + (返 && 返.エラー ? 返.エラー : ('http ' + (返 && 返.status && 返.status()))));
    throw new Error('★開けないので ここで 止めます★（★0件を 緑に しません★）');
  }
  開けた = true;
  T('★開けた★', true, 'http ' + 返.status());

  /* ★鍵を 外す（ログインは 通して いません）★ */
  await page.evaluate(() => {
    document.body.classList.remove('exally-locked');
    const ov = document.getElementById('loginOv');
    if (ov) { ov.classList.remove('open'); ov.style.display = 'none'; }
  });

  /* ★④読み込んだ 本数を ★画面から★ 数える★（★私の 見立てでは ない★） */
  const 読み = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll('script[src]')).map((x) => x.getAttribute('src') || '');
    return {
      全: s.length,
      hf: s.filter((u) => /hyperformula/i.test(u)).length,
      shiki: s.filter((u) => /\/shiki-|^shiki-|lib\/shiki-/.test(u)).length,
    };
  });
  console.log('  ★画面が 読み込んだ script src … ' + 読み.全 + '本★');
  console.log('    ★hyperformula … ' + 読み.hf + '本★（★終わりの 線＝0本★）');
  console.log('    ★shiki- ……… ' + 読み.shiki + '本★（★終わりの 線＝1本 以上★）');

  T('★式を 打つ 口が 在る★', await page.evaluate(() => typeof window.setCell === 'function'));

  /* ══ ★★1本ずつ 打って 読む★★ ══ */
  let 合 = 0, 違 = 0, 空 = 0, 転 = 0;
  const 外れ = [];
  for (let i = 0; i < 式たち.length; i++) {
    const x = 式たち[i];
    let 出;
    try {
      出 = await page.evaluate(({ r, f }) => {
        window.setCell(r, 0, f);
        if (typeof window.recalcSheet === 'function') window.recalcSheet();
        const d = (window.sheets[window.activeSheet].data) || {};
        const c = d[r + ',0'];
        if (!c) return { 空: true };
        const v = (c.d !== undefined ? c.d : c.v);
        return { 値: (v === undefined || v === null) ? '' : String(v) };
      }, { r: i, f: x.式 });
    } catch (e) {
      /* ★③1本ずつ 受け止める★ */
      転++; 外れ.push(x.式 + ' ⇒ ★転んだ★ ' + String(e.message).slice(0, 60));
      continue;
    }
    if (!出 || 出.空 || 出.値 === '') { 空++; 外れ.push(x.式 + ' ⇒ ★空っぽ★'); continue; }
    if (出.値 === x.答) 合++;
    else { 違++; 外れ.push(x.式 + ' ⇒ 出た「' + 出.値 + '」／はず「' + x.答 + '」'); }
  }

  console.log('  ★★合った ' + 合 + ' / ' + 式たち.length + '★★'
    + ' ／ 違った ' + 違 + ' ／ ★空っぽ ' + 空 + '★ ／ 転んだ ' + 転);
  for (const s of 外れ.slice(0, 8)) console.log('       ・' + s);
  T('★★空っぽが 0件★★（★0件を 緑に しない★）', 空 === 0, '空っぽ ' + 空 + '件');
  T('★★対照（=SUM(1,2,3)）が 6★★', 合 > 0 && !外れ.some((s) => s.startsWith('=SUM(')));
  T('★★' + 式たち.length + '本 とも 合う★★', 合 === 式たち.length,
    '合 ' + 合 + ' ／ 違 ' + 違 + ' ／ 空 ' + 空 + ' ／ 転 ' + 転);
} catch (e) {
  if (開けた) { fail++; console.log('  NG   ★途中で 止まりました★ ' + String(e.message).slice(0, 120)); }
} finally {
  if (配信) 配信.閉じる();
  await browser.close();
}

const 秒 = ((Date.now() - 時計) / 1000).toFixed(1);
console.log('');
console.log('  ★掛かった 秒 … ' + 秒 + '秒★');
console.log('  ★秒が 毎回 同じなら ★上限に 当てて いる★ か ★空振り★ を 疑う★');
console.log('shiki-wo-osu-webkit: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
