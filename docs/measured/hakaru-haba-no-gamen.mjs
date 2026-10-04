/* hakaru-haba-no-gamen.mjs ･･･ ★列の 幅で 画面に 描かれた 字が 実Excel と 同じか（#### まで 含めて）★ 2026-10-04
 *
 *  ★★なぜ★★
 *    実Excel は ★数が 列に 入らないと ####★（字は はみ出す）。うちは ★描く 段★で # に する。
 *  ★★測り方（★描く 本番の 関数を 呼び、描かれた 字を 覗く★）★★（経営者の 叩き⑴）
 *    1回目は 描く 段の 順を 自分で 並べて 呼び、★字体を 決める 段を 落として★ 9組／18組 違うと 出した（★道具の 誤り★）。
 *    ⇒★`render()` を そのまま 呼び、`ctx.fillText` を 覗いて（取る だけ）実際に 描かれた 字を 取る★
 *      ＝段が 将来 増えても 道具が 付いて いく（記憶「測り道具は 本番に 付いて いかない」）
 *    ★作り物の 本を 縦横に 敷き詰めて 1画面に 全部 入れる★（巻かない）。座標 → マスは 画面の yToR／xToC で 引く。
 *  ★★物差し★★ 経営者の 道具132（-幅 標準／4／60）の 紙（各 168組・Excel 16.0.20430）
 *    ★# の 数は 比べない★（Excel の # の 個数は 幅と 字体で 決まる）＝★# だけの 字か★ だけ 比べる
 *  ★走らせ方★ node docs/measured/hakaru-haba-no-gamen.mjs --幅 8.44 --紙 docs/measured/golden-sel-shoshiki-haba-hyoujun-2026-10-04.tsv [--壊す]
 *    --壊す ･･･ ★`_数が入らないか` を いつも 偽に して★ 赤に なるかを 見る（経営者の 叩き⑷）
 *  ★出すのは 数と 違った 組★（作り物の 値＝司さんの 本は 使わない）
 */
import path from 'node:path'; import http from 'node:http'; import fs from 'node:fs'; import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { borrow, launch } from '../../scripts/_borrow-playwright.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const XLSX = require_(path.join(ROOT, 'lib/xlsx.full.min.js'));
const 引数 = process.argv.slice(2);
const 取る = (名, 既定) => { const i = 引数.indexOf('--' + 名); return i >= 0 ? 引数[i + 1] : 既定; };
/* ══ ★★本の 口★★（10-04 夕・経営者の 叩き⑵＝「① の 描く 版」）══
     node docs/measured/hakaru-haba-no-gamen.mjs --本 <xlsb/xlsx> --出す <tsv>
     ⇒ 本を 開き、板ごとに 画面を 巻きながら render() で 全部 描かせ、★描かれた 字★を
       「板 ／ 行 ／ 列 ／ 描いた字 ／ マスが 在るか」で 書き出す（突き合わせは 経営者の 道具 130 が する）
     ★出す 先は 渡された 所だけ★（司さんの 本の 中身＝repo に 入れない／この 道具は 字を 画面に 出さない） */
const 本 = 取る('本', null);
const 出す先 = 取る('出す', null);
if (本) { await 本を描く(本, 出す先); process.exit(0); }
const 幅 = Number(取る('幅', '8.44'));
const 紙 = path.join(ROOT, 取る('紙', 'docs/measured/golden-sel-shoshiki-haba-hyoujun-2026-10-04.tsv'));
const 壊す = 引数.includes('--壊す');

async function 本を描く(本の道, 先) {
  if (!fs.existsSync(本の道)) { console.log('★本が 在りません★'); process.exit(2); }
  if (!先) { console.log('★--出す <tsv> を 渡して ください★'); process.exit(2); }
  const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const sv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(String(q.url).split('?')[0]).replace(/^\/+/, ''));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('no'); }
    r.setHeader('content-type', 型[path.extname(f).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(f).pipe(r);
  });
  await new Promise((x) => sv.listen(0, '127.0.0.1', x));
  const wk = await borrow('haba-no-gamen-hon', 'webkit');
  const br = await launch('haba-no-gamen-hon', wk, {}, 'webkit');
  const p = await br.newPage({ viewport: { width: 2400, height: 2400 } });
  try {
    await p.goto('http://127.0.0.1:' + sv.address().port + '/book.html', { waitUntil: 'load', timeout: 180000 });
    await p.evaluate(() => { document.body.classList.remove('exally-locked'); const o = document.getElementById('loginOv'); if (o) o.style.display = 'none'; });
    await p.setInputFiles('#bookFileInput', 本の道);
    await p.waitForFunction(() => (window.sheets || []).some((x) => Object.keys(x.data || {}).length), null, { timeout: 180000 });
    await p.waitForTimeout(1500);
    const 出 = await p.evaluate(async () => {
      const 行たち = [];
      const 回数 = [];   /* ★板の 名前は 出さない★（字数 だけ） */
      const 型2 = window.CanvasRenderingContext2D.prototype;
      const 元 = 型2.fillText;
      const 二回待つ = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      let 描いた = null;
      型2.fillText = function (t, x, y) {
        try {
          if (描いた && this.canvas === window.ctx.canvas) {
            const m = this.getTransform(); const d = m.a || 1;
            const X = (m.a * x + m.e) / d, Y = (m.d * y + m.f) / d;
            if (X > window.HDR_W && Y > window.HDR_H) {
              let k = window.yToR(Y) + ',' + window.xToC(X);
              /* ★結合の 中で 描かれた 字は 結合の 頭に 付ける★（中央揃えは 中の マスから 描き始める＝10-04 夕 経営者の 分母の 外 167） */
              if (頭へ && 頭へ[k]) k = 頭へ[k];
              描いた[k] = (描いた[k] || '') + String(t);
            }
          }
        } catch (e) { /* 取れない 物は 取らない */ }
        return 元.apply(this, arguments);
      };
      let 頭へ = null;
      try {
        for (let i = 0; i < window.sheets.length; i++) {
          window.switchSheet(i);
          const sh = window.sheets[i];
          頭へ = {};
          for (const k of Object.keys(sh.data || {})) {
            const me = sh.data[k] && sh.data[k].mergeEnd; if (!me) continue;
            const [r0, c0] = k.split(',').map(Number);
            for (let rr = r0; rr <= me.r; rr++) for (let cc = c0; cc <= me.c; cc++) 頭へ[rr + ',' + cc] = k;
          }
          let 最行 = 0, 最列 = 0;
          for (const k of Object.keys(sh.data || {})) { const [r, c] = k.split(',').map(Number); if (r > 最行) 最行 = r; if (c > 最列) 最列 = c; }
          const 全 = {};
          /* ★画面を 巻いて 全部 描かせる★（1枚ずつ・重なりは 同じ 字に なる） */
          window.scrollTop = 0; window.scrollLeft = 0;
          /* ★画面の 大きさが 読めなければ 止まる★（巻きが 1回で 終わり 描いて いない 所を 「空」と 書かない 為） */
          if (!(window.wrapH > window.HDR_H) || !(window.wrapW > window.HDR_W)) throw new Error('★画面の 大きさ（wrapH/wrapW）が 読めない★ ' + window.wrapH + ' ' + window.wrapW);
          const 縦 = Math.max(100, (window.wrapH - window.HDR_H) * 0.9), 横 = Math.max(100, (window.wrapW - window.HDR_W) * 0.9);
          let 回 = 0;
          const 下 = window.rowY(最行 + 1) + window.scrollTop, 右 = window.colX(最列 + 1) + window.scrollLeft;
          for (let st = 0; st <= 下; st += 縦) {
            for (let sl = 0; sl <= 右; sl += 横) {
              window.scrollTop = st; window.scrollLeft = sl;
              描いた = {}; 回++;
              window.render(); await 二回待つ();
              for (const k of Object.keys(描いた)) if (!(k in 全)) 全[k] = 描いた[k];
              描いた = null;
            }
          }
          window.scrollTop = 0; window.scrollLeft = 0;
          回数.push(sh.name.length + '字の板：' + 回 + '回（' + (最行 + 1) + '行×' + (最列 + 1) + '列）');
          const 鍵 = new Set(Object.keys(sh.data || {}).concat(Object.keys(全)));
          for (const k of 鍵) {
            const [r, c] = k.split(',');
            行たち.push([sh.name, r, c, (全[k] || '').replace(/[\t\r\n]/g, ' '), (sh.data && sh.data[k]) ? '1' : '0'].join('\t'));
          }
        }
      } finally { 型2.fillText = 元; }
      return { 行たち, 回数 };
    });
    fs.writeFileSync(先, '板\t行\t列\t描いた字\tマスが在るか\n' + 出.行たち.join('\n') + '\n');
    console.log('★書き出した★ ' + 出.行たち.length + '行 ／ 先 ' + 先 + '（★中身は 画面に 出しません★）');
    console.log('  描かせた 回数 ... ' + 出.回数.join(' ／ '));
  } finally { await p.close(); await br.close(); sv.close(); }
}

function 通し(式) {
  const s = String(式).replace(/^=/, '');
  const d = /^DATE\((\d+),(\d+),(\d+)\)$/.exec(s);
  if (d) { let n = (Date.UTC(+d[1], +d[2] - 1, +d[3]) - Date.UTC(1899, 11, 30)) / 864e5; if (n < 61) n -= 1; return n; }
  if (!/^[-0-9.*/ eE+()]+$/.test(s)) return null;
  return Function('return (' + s + ')')();
}
const L = fs.readFileSync(紙, 'utf8').split(/\r?\n/).filter((l) => l && l.charAt(0) !== '#');
const 頭 = L.shift().split('\t');
const i組 = 頭.indexOf('組'), i式 = 頭.indexOf('値の式'), i書 = 頭.indexOf('渡した書式(Local)'), i字 = 頭.indexOf('画面の字(.Text)');
const 組 = L.map((l) => l.split('\t')).map((c) => ({ 組: c[i組], 式: c[i式], 書: c[i書], 字: c[i字], 値: 通し(c[i式]) }))
  .filter((x) => x.値 !== null && isFinite(x.値));
console.log('[幅の 画面] 幅 ' + 幅 + ' ／ 紙 ' + path.basename(紙) + ' ... ' + 組.length + '組（値を 読めない ' + (L.length - 組.length) + '）'
  + (壊す ? ' ／ ★--壊す（_数が入らないか を いつも 偽）★' : ''));

/* ★敷き詰め★＝列 N 本・行は 1つ 空けて（はみ出しや 重なりを 隣の 組と 混ぜない＝★隣の 列も 1つ 空ける★） */
const 画面幅 = 2400, 画面高 = 2400;
const 列の点 = Math.max(10, 幅 * 7.5 + 5);   /* ★見積り（敷き詰めの 列数を 決める だけ）★ */
const 列数 = Math.max(1, Math.floor((画面幅 - 120) / (列の点 * 2)) - 1);
const ws = {};
const 置き場 = [];
組.forEach((x, i) => {
  const r = Math.floor(i / 列数) * 2, c = (i % 列数) * 2;
  ws[XLSX.utils.encode_cell({ r, c })] = { t: 'n', v: x.値, z: x.書 };
  置き場.push({ r, c });
});
const 最後の行 = 置き場.reduce((m, p) => Math.max(m, p.r), 0);
ws['!ref'] = 'A1:' + XLSX.utils.encode_cell({ r: 最後の行, c: 列数 * 2 });
ws['!cols'] = Array.from({ length: 列数 * 2 + 1 }, () => ({ wch: 幅 }));
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'あ');
const 材料 = path.join(os.tmpdir(), 'exally-haba-no-gamen.xlsx');
fs.writeFileSync(材料, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));

const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const s = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(String(q.url).split('?')[0]).replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('no'); }
  r.setHeader('content-type', 型[path.extname(f).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(f).pipe(r);
});
await new Promise((x) => s.listen(0, '127.0.0.1', x));
const wk = await borrow('haba-no-gamen', 'webkit');
const br = await launch('haba-no-gamen', wk, {}, 'webkit');
const p = await br.newPage({ viewport: { width: 画面幅, height: 画面高 } });
let 終わり値 = 0;
try {
  await p.goto('http://127.0.0.1:' + s.address().port + '/book.html', { waitUntil: 'load', timeout: 120000 });
  await p.evaluate(() => { document.body.classList.remove('exally-locked'); const o = document.getElementById('loginOv'); if (o) o.style.display = 'none'; });
  await p.setInputFiles('#bookFileInput', 材料);
  await p.waitForFunction(() => (window.sheets || []).some((x) => Object.keys(x.data || {}).length), null, { timeout: 120000 });
  await p.waitForTimeout(800);
  const 無い = await p.evaluate(() => ['render', 'switchSheet', 'yToR', 'xToC', 'cW', 'colX', 'rowY', '_数が入らないか']
    .filter((x) => typeof window[x] !== 'function').concat(window.ctx ? [] : ['ctx']));
  if (無い.length) { console.log('★道が 無い★ ' + 無い.join(' / ')); process.exit(8); }
  /* ★本番の render() を 呼び、fillText を 覗く★（取る だけ・描く 物は 変えない） */
  const 出 = await p.evaluate(async ([n置, 壊]) => {
    window.switchSheet(0);
    if (壊) window._数が入らないか = function () { return false; };
    const 描いた = [];
    /* ★全部の 筆が 通る 所で 覗く★（描く 所が どの 筆を 使っても 拾える） */
    const 型 = window.CanvasRenderingContext2D.prototype;
    const 元 = 型.fillText;
    型.fillText = function (t, x, y) {
      try {
        if (this.canvas === window.ctx.canvas) {
          const m = this.getTransform ? this.getTransform() : null;
          const X = m ? m.a * x + m.e : x, Y = m ? m.d * y + m.f : y;
          const dpr = m && m.a ? m.a : 1;
          /* ★見出し（列の 記号・行の 番号）は 外す★＝マスの 領域で 描かれた 字だけ */
          if (X / dpr > window.HDR_W && Y / dpr > window.HDR_H) {
            描いた.push({ t: String(t), r: window.yToR(Y / dpr), c: window.xToC(X / dpr) });
          }
        }
      } catch (e) { /* ★取れない 物は 取らない★ */ }
      return 元.apply(this, arguments);
    };
    const 二回待つ = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    try { window.render(); await 二回待つ(); } finally { 型.fillText = 元; }
    const 字 = {};
    for (const d of 描いた) { const k = d.r + ',' + d.c; (字[k] = 字[k] || []).push(d.t); }
    return { 字, 描いた数: 描いた.length, 列の点: window.cW(0) };
  }, [置き場.length, 壊す]);
  console.log('  列の 幅（cW）' + 出.列の点 + ' ／ fillText ' + 出.描いた数 + '回');
  let 合 = 0, 描かれない = 0; const 違 = {};
  組.forEach((x, i) => {
    const pl = 置き場[i];
    /* ★そのマスの 左端から 描かれた 字★（はみ出した 字は 左の マスの 座標で 拾える） */
    const 並び = 出.字[pl.r + ',' + pl.c] || [];
    const g = 並び.join('');
    if (!並び.length) 描かれない++;
    const ok = (/^#+$/.test(x.字) && /^#+$/.test(g)) || g === x.字;
    if (ok) { 合++; return; }
    const 型名 = /^#+$/.test(x.字) ? 'Excel# うち字' : (/^#+$/.test(g) ? 'Excel字 うち#' : '字が違う');
    (違[型名] = 違[型名] || []).push(x.組 + ' ' + x.式 + ' ' + x.書 + ' 画面=' + JSON.stringify(g) + ' 実Excel=' + JSON.stringify(x.字));
  });
  console.log('  ★見た ' + 組.length + ' ／ 合った ' + 合 + ' ／ 違う ' + (組.length - 合) + '★（描かれなかった ' + 描かれない + '）');
  for (const k of Object.keys(違)) {
    console.log('  ── ' + k + ' ' + 違[k].length + '組');
    違[k].slice(0, 12).forEach((t) => console.log('     ' + t));
  }
  終わり値 = (組.length - 合) ? 1 : 0;
} finally { await p.close(); await br.close(); s.close(); }
process.exit(終わり値);
