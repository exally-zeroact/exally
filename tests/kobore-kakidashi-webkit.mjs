/* kobore-kakidashi-webkit.mjs — ★お客さんと 同じ 道で 溢れを 打って 書き出す★（2026-09-20）
 *
 *  ★★なぜ 要るか★★
 *    `tests/kobore-kakidashi.test.mjs` は ★node で `gridToBook` を 直に 呼んで います★
 *    ＝★材料（`_溢れ元` の 付いた `data`）を 私が 手で 作って います★
 *    ⇒★「画面で 式を 打ったら 本当に その 印が 付くのか」は 1本も 測って いません★
 *    （経営者1 の 指摘・2026-09-20「★これが 一番 抜けが 大きいと 思います★」）
 *
 *    記憶の 決まり:
 *      ・★自分の 台が 知って いる 数は 客の 道で 数えろ★
 *      ・★「客に 届くか」は 道ごとに 見る★
 *
 *  ★★ここが 守る 事★★
 *    ・画面で `=SEQUENCE(3)` を 打つと ★溢れ先の マスに `_溢れ元` が 付く★
 *    ・その まま ★本番の 書き出しの 道★（`XlsxIO.writeBook(GridXlsx.gridToBook(sheets))`）を
 *      通すと ★`cm="1"` と `<f t="array" ref="D1:D3">` が 出る★
 *    ・★横に 溢れる 物・2次元★でも 範囲が 合う
 *    ・★溢れない 式には 付かない★
 *
 *  ★★見て いない 事★★（★書かない 見張りは「全部 守った」と 読まれる★）
 *    ・★実Excel が これを どう 開くかは ここでは 測れません★（COM が 要る＝経営者1 の 持ち場）
 *      ⇒`--実物を置く` を 付けると %TEMP% に 置くので、そちらで 測れます
 *    ・★書き出しボタンを 押しては いません★＝`saveXlsx` の 中の ★2行★を 同じ 順で 呼びます
 *      （ボタンは ファイルを 落とすので headless では 掴めません）
 *    ・★受け取った ファイルの 道（`saveOpenedBook`）は 測って いません★
 *      ＝あちらは ★元の zip の 値だけ 書き換える★ わざと 別の 道です
 *
 *  使い方:
 *    node tests/kobore-kakidashi-webkit.mjs
 *    node tests/kobore-kakidashi-webkit.mjs --実物を置く
 */
import path from 'node:path'; import http from 'node:http'; import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { borrow, launch } from '../scripts/_borrow-playwright.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const 実物を置く = process.argv.includes('--実物を置く');

let pass = 0, fail = 0;
const T = (n, ok, m) => {
  if (ok) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (m ? '\n       ' + m : '')); }
};

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

/* ★包みを ほどく★（借り物に 読ませず 局所ヘッダを 順に 舐めて ★生の字★を 見る） */
function ほどく(buf) {
  const 出 = {};
  let p = 0;
  while (p + 30 <= buf.length) {
    if (buf.readUInt32LE(p) !== 0x04034b50) break;
    const 方 = buf.readUInt16LE(p + 8);
    const 圧 = buf.readUInt32LE(p + 18);
    const n = buf.readUInt16LE(p + 26);
    const x = buf.readUInt16LE(p + 28);
    const 名 = buf.toString('utf8', p + 30, p + 30 + n);
    const 頭 = p + 30 + n + x;
    const 体 = buf.slice(頭, 頭 + 圧);
    出[名] = 方 === 8 ? zlib.inflateRawSync(体).toString('utf8') : 体.toString('utf8');
    p = 頭 + 圧;
  }
  return 出;
}

console.log('');
console.log('[kobore-kakidashi-webkit] ★画面で 溢れを 打って 本番の 道で 書き出す★');

const 時計 = Date.now();
const wk = await borrow('kobore-kakidashi', 'webkit');
const browser = await launch('kobore-kakidashi', wk, {}, 'webkit');
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const 配信 = await 立てる(ROOT);
let 開けた = false;

try {
  const 返 = await page.goto(配信.url + '/book.html', { waitUntil: 'load', timeout: 60000 }).catch((e) => ({ エラー: e.message }));
  if (!返 || 返.エラー || (返.status && 返.status() >= 400)) {
    T('★開けた★', false, '★開けませんでした★ ' + (返 && 返.エラー ? 返.エラー : ('http ' + (返 && 返.status && 返.status()))));
    throw new Error('★開けないので ここで 止めます★（★0件を 緑に しません★）');
  }
  開けた = true;
  T('★開けた★', true);

  /* ★鍵を 外す（ログインは 通して いません）★ */
  await page.evaluate(() => {
    document.body.classList.remove('exally-locked');
    const ov = document.getElementById('loginOv');
    if (ov) { ov.classList.remove('open'); ov.style.display = 'none'; }
  });

  T('★式を 打つ 口が 在る★', await page.evaluate(() => typeof window.setCell === 'function'));
  /* ★`XlsxIO` は 押すまで 読み込まれません★（`_ensureXlsx` が 後から 足す）
       ⇒★ここで 先に 呼んでから 数える★（本番の `saveXlsx` も 同じ 順番） */
  T('★書き出しの 部品が 在る★', await page.evaluate(async () => {
    if (typeof window._ensureXlsx === 'function') { try { await window._ensureXlsx(); } catch (e) { /* 既に 在る */ } }
    return typeof window.XlsxIO === 'object' && typeof window.GridXlsx === 'object';
  }));

  /* ══ ★①画面で 打つ → `_溢れ元` が 付くか★ ══
       ★★押す 前に 隙間を 計算してから 置く★★（2026-09-20 ここで 1回 踏みました）
         最初 横3 を F1 に、 2次元を H1 に 置いた ため
         ★横3 の 行き先（H1）を 2次元が 塞いで いました★
         ⇒ ref が F1:H1 では なく F1:G1 に なり、
           ★本番の 穴では なく 私の 材料の 置き方の 穴★ でした。
       D1(0,3)  縦3     ⇒ D1:D3（列 3 / 行 0-2）
       F1(0,5)  横3     ⇒ F1:H1（列 5-7 / 行 0）
       A20(19,0) 2次元 ⇒ A20:C21（列 0-2 / 行 19-20）
       A10(9,0) 溢れない 式
       ★どれも 重ならない★ */
  const 印 = await page.evaluate(() => {
    const sh = window.sheets[window.activeSheet];
    window.setCell(0, 3, '=SEQUENCE(3)');
    window.setCell(0, 5, '=SEQUENCE(1,3)');
    window.setCell(19, 0, '=SEQUENCE(2,3)');
    window.setCell(9, 0, '=SUM(1,2)');
    if (typeof window.recalcSheet === 'function') window.recalcSheet(window.activeSheet, sh.data);
    const 読 = (r, c) => {
      const x = (sh.data || {})[r + ',' + c];
      if (!x) return null;
      return { d: x.d, 元: x['_溢れ元'] || null, f: x.f || null };
    };
    return {
      D1: 読(0, 3), D2: 読(1, 3), D3: 読(2, 3),
      F1: 読(0, 5), G1: 読(0, 6), H1: 読(0, 7),
      A20: 読(19, 0), B21: 読(20, 1),
      A10: 読(9, 0),
    };
  });

  T('★① 画面で 打つと 溢れ先に `_溢れ元` が 付く（縦3）★',
    印.D2 && 印.D2.元 === '0,3' && 印.D3 && 印.D3.元 === '0,3',
    'D2=' + JSON.stringify(印.D2) + ' D3=' + JSON.stringify(印.D3));
  T('★② 頭には `_溢れ元` が 付かない★',
    印.D1 && !印.D1.元 && String(印.D1.f || '').indexOf('SEQUENCE') >= 0,
    'D1=' + JSON.stringify(印.D1));
  T('★③ 横に 溢れた 先にも 付く★',
    印.G1 && 印.G1.元 === '0,5', 'G1=' + JSON.stringify(印.G1));
  T('★④ 2次元でも 付く★',
    印.B21 && 印.B21.元 === '19,0', 'B21=' + JSON.stringify(印.B21));
  T('★⑤ 溢れない 式には 付かない★',
    印.A10 && !印.A10.元, 'A10=' + JSON.stringify(印.A10));

  /* ══ ★②その まま 本番の 書き出しの 道を 通す★ ══
       `book.html:saveXlsx` の 中の ★この 2行と 同じ★:
         var buf = XlsxIO.writeBook(GridXlsx.gridToBook(sheets));                */
  const 出 = await page.evaluate(async () => {
    if (window._ensureXlsx) { try { await window._ensureXlsx(); } catch (e) { /* 既に 在る */ } }
    const buf = window.XlsxIO.writeBook(window.GridXlsx.gridToBook(window.sheets));
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return Array.from(u8);
  });
  const buf = Buffer.from(出);
  const 中 = ほどく(buf);
  const s = 中['xl/worksheets/sheet1.xml'] || '';

  T('★⑥ 包みが ほどけた★', Object.keys(中).length > 0 && s.length > 0,
    '部品 ' + Object.keys(中).length + '本 / sheet ' + s.length + 'B');

  const 取る = (a) => {
    const m = s.match(new RegExp('<c r="' + a + '" cm="1"><f t="array" ref="([^"]+)">'));
    return m ? m[1] : null;
  };
  T('★⑦ 縦3 が ref="D1:D3" ＋ cm="1"★', 取る('D1') === 'D1:D3', 'D1 の ref=' + 取る('D1'));
  T('★⑧ 横3 が ref="F1:H1"★', 取る('F1') === 'F1:H1', 'F1 の ref=' + 取る('F1'));
  T('★⑨ 2次元 が ref="A20:C21"★', 取る('A20') === 'A20:C21', 'A20 の ref=' + 取る('A20'));
  T('★⑩ 溢れない 式(A10)には cm が 付かない★',
    /<c r="A10"[^>]*>/.test(s) && !/<c r="A10" cm="1"/.test(s),
    'A10 = ' + (s.match(/<c r="A10"[\s\S]{0,90}?<\/c>/) || ['(無い)'])[0]);
  T('★⑪ xl/metadata.xml が 入って いる★',
    !!中['xl/metadata.xml'] && 中['xl/metadata.xml'].indexOf('dynamicArrayProperties') >= 0);
  T('★⑫ 頭の 式に _xlfn. が 付いて いる★', s.indexOf('_xlfn.SEQUENCE(3)') >= 0);

  if (実物を置く) {
    const out = path.join(process.env.TEMP || process.env.TMP || '.', 'exally-kakidashi-gamen.xlsx');
    fs.writeFileSync(out, buf);
    console.log('');
    console.log('  ★実物を 置きました★（★お客さんの 道で 作った 物★）');
    console.log('    場所   : ' + out);
    console.log('    大きさ : ' + buf.length + 'B');
    console.log('    sha256 : ' + crypto.createHash('sha256').update(buf).digest('hex'));
    for (const a of ['D1', 'D2', 'D3', 'F1', 'H1', 'A20']) {
      const m = s.match(new RegExp('<c r="' + a + '"[\\s\\S]{0,150}?<\\/c>'));
      console.log('    ' + a + '     : ' + (m ? m[0] : '(無い)'));
    }
  }
} catch (e) {
  if (開けた) { fail++; console.log('  NG   ★途中で 止まりました★ ' + String(e.message).slice(0, 160)); }
  else { fail++; console.log('  NG   ★開く 前に 止まりました★ ' + String(e.message).slice(0, 160)); }
} finally {
  if (配信) 配信.閉じる();
  await browser.close();
}

const 秒 = ((Date.now() - 時計) / 1000).toFixed(1);
console.log('');
console.log('  ★掛かった 秒 ＝ ' + 秒 + '秒★');
console.log('kobore-kakidashi-webkit: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
