/* osu-jitsubutsu-deruji.mjs — ★司さんの実物の「出る字」を うちと 突き合わせる★（2026-09-11）
 *
 *  ★★なぜ★★
 *    今まで 実物で 合わせたのは ★答え★だけ（2026-08-29 … 19,323/19,323 一致）。
 *    ★出る字は 一度も 突き合わせて いません★。
 *    2026-09-11 に 小さい ファイル 19本で 測ったら ★出る字だけで 本当の 穴が 4つ★ 出ました。
 *
 *  ★★お客さんの 道で 開きます★★
 *    本物の ブラウザで book.html を 開き、★「Excelを読み込む」の 入口★に 写しを 渡す。
 *    出る字は ★画面が 本当に 描いた 字（fillText）★を 取ります＝★作り直しません★。
 *
 *  ★司さんの 実物には 触りません★＝写し（scratchpad）だけ。
 *  ★この 道具は 自分の 台を 建てません★＝計算するのは 画面の 中の 本番の エンジン。
 *
 *  使い方:
 *    ① pwsh -NoProfile -File docs/measured/toru-jitsubutsu-deruji.ps1
 *    ② node docs/measured/osu-jitsubutsu-deruji.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { borrow, launch, unmeasured } from '../../scripts/_borrow-playwright.mjs';

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
const TAG = 'jitsubutsu-deruji';
const 写し = 'C:/Users/zeroa/AppData/Local/Temp/claude/C--WINDOWS-System32-WindowsPowerShell-v1-0/5b4e50e6-20a1-4af5-8ffb-8b6d6ca3f52b/scratchpad/jitsubutsu.xlsb';
const 板名 = process.argv[2] || '';
const 紙 = path.join(ROOT, 'docs/measured/golden-jitsubutsu-deruji-2026-09-11.tsv');
const 出す先 = path.join(ROOT, 'docs/measured/golden-jitsubutsu-deruji-awase-2026-09-11.tsv');

function 立てる(root) {
  const 型 = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const s = http.createServer((req, res) => {
    const 道 = decodeURIComponent(String(req.url).split('?')[0]);
    const f = path.join(root, 道.replace(/^[/]+/, ''));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('no'); }
    res.setHeader('content-type', 型[path.extname(f).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => {
    r({ url: 'http://127.0.0.1:' + s.address().port, 閉じる: () => s.close() });
  }));
}

if (!fs.existsSync(紙) || !fs.existsSync(写し)) {
  console.log('  ★未測定★ 先に `pwsh -NoProfile -File docs/measured/toru-jitsubutsu-deruji.ps1` を 走らせて ください');
  process.exit(0);
}

let 紙の板 = '';
const 実 = [];
for (const l of fs.readFileSync(紙, 'utf-8').split(/\r?\n/)) {
  { const m = /^# ★板★ … (.+)$/.exec(l); if (m) 紙の板 = m[1].trim(); }
  if (!l || l.startsWith('#')) continue;
  const c = l.split('\t');
  if (c.length < 5) continue;
  実.push({ マス: c[0], 字: c[1], 型: c[2], 幅: c[3], 書式: c[4] });
}

const chromium = await borrow(TAG, 'chromium');
if (!chromium) { unmeasured(TAG, 'chromium'); process.exit(0); }
const browser = await launch(TAG, chromium, {}, 'chromium');
if (!browser) { unmeasured(TAG, 'chromium'); process.exit(0); }
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const 配信 = await 立てる(ROOT);

let 合 = 0, 違 = 0;
const 行 = [];
const 実物 = [];

try {
  await page.goto(配信.url + '/book.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    document.body.classList.remove('exally-locked');
    const ov = document.getElementById('loginOv');
    if (ov) ov.style.display = 'none';
  });
  await page.waitForTimeout(600);
  const 入口 = await page.waitForSelector('#bookFileInput', { state: 'attached', timeout: 15000 });
  await 入口.setInputFiles(写し);
  await page.waitForFunction(() => {
    try { return Object.keys(sheets[activeSheet].data).length > 50; } catch (e) { return false; }
  }, null, { timeout: 90000 });
  await page.waitForTimeout(4000);
  /* ★板を 選ぶ★＝お客さんと 同じ 道（タブを 押す） */
  if (板名) {
    const 出来た = await page.evaluate((n) => {
      /* ★番号でも 指せます★＝名前は 貝殻で 文字化けする事が 在る */
      const i = /^[0-9]+$/.test(String(n)) ? (Number(n) - 1) : sheets.findIndex((s) => s.name === n);
      if (i < 0 || i >= sheets.length) return false;
      if (typeof switchSheet === 'function') switchSheet(i);
      else { activeSheet = i; if (typeof loadSheetIntoEngine === 'function') loadSheetIntoEngine(i); render(); }
      return true;
    }, 板名);
    if (!出来た) throw new Error('★板が 無い … ' + 板名 + '★');
    await page.waitForTimeout(4000);
  }
  /* ★★同じ 板を 見て いるかを 先に 確かめます★★（2026-09-11）
     ★違う 板を 比べて いたら 数は 全部 無意味★＝
     実際 ★板の 番号が ずれて 933本 違う★ように 見えました。
     ⇒★紙に 書いて ある 板の 名前と 突き合わせます★ */
  const うちの板 = await page.evaluate(() => sheets[activeSheet].name);
  if (紙の板 && String(うちの板) !== String(紙の板)) {
    throw new Error('★違う 板を 見て います★  実Excel「' + 紙の板 + '」／うち「' + うちの板 + '」'
      + '  ⇒★数を 出す 前に 止めます★');
  }
  console.log('★板★ ' + うちの板 + '（実Excel と 同じ）');

  /* ★★描く 所を 覗きます★★（作り直した 字では なく ★描かれた 字★）
     ★★`render()` は その場で 描きません★★（2026-09-11 ここで つまずきました）
       次の 描き直しを ★予約するだけ★＝同じ 一息で 読むと ★0本★に なります
       ⇒★予約して から 待って、それから 読みます★
     ★画面に 出て いる 所しか 描かれません★
       ⇒★画面を 動かしながら 何度も 描いて 集めます★（お客さんと 同じ 動かし方） */
  await page.evaluate(() => {
    window.__箱 = [];
    const 元 = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y) {
      try { window.__箱.push([String(t), x, y]); } catch (e) { /* 何も しない */ }
      return 元.apply(this, arguments);
    };
    /* ★どこまで 動かすか★＝マスの 場所から 決める（当て推量の 数を 使わない） */
    window.__動かして描く = (r, c) => {
      const sh = sheets[activeSheet];
      let y = 0; for (let i = 0; i < r; i++) y += (sh.rowH[i] || ROW_H);
      let x = 0; for (let j = 0; j < c; j++) x += (sh.colW[j] || COL_W);
      scrollTop = Math.max(0, y - ROW_H * 3);
      scrollLeft = Math.max(0, x - COL_W * 2);
      window.__箱.length = 0;
      render();
    };
    window.__読む = (r, c) => {
      const x = colX(c), y = rowY(r), w = cW(c), h = rH(r);
      for (const [t, tx, ty] of window.__箱) {
        if (tx >= x - 1 && tx <= x + w + 1 && ty >= y - 1 && ty <= y + h + 1) return t;
      }
      return '';
    };
  });

  const 場所 = (n) => {
    const m = /^([A-Z]+)([0-9]+)$/.exec(n);
    let c = 0; for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
    return { r: Number(m[2]) - 1, c: c - 1 };
  };
  /* ★★同じ 辺りは 1回だけ 描いて、まとめて 読みます★★
     1マスずつ 行き来すると 大きい 板（468行×131列 など）で 終わりません */
  const 束 = new Map();
  for (const e of 実) {
    const p = 場所(e.マス);
    const 辺り = Math.floor(p.r / 10) + ',' + Math.floor(p.c / 5);
    if (!束.has(辺り)) 束.set(辺り, []);
    束.get(辺り).push({ 名: e.マス, r: p.r, c: p.c });
  }
  const 描いた = {};
  let 済 = 0;
  for (const [, 組] of 束) {
    await page.evaluate(([r, c]) => window.__動かして描く(r, c), [組[0].r,組[0].c]);
    await page.waitForTimeout(90);
    const 出 = await page.evaluate((組) => 組.map((x) => window.__読む(x.r, x.c)), 組);
    組.forEach((x, i) => { 描いた[x.名] = 出[i]; });
    /* ★★取れなかった 分は 1マスずつ 測り直します★★（2026-09-11）
       まとめて 描くと ★端の マスが 画面の 外★に 出る 事が 在ります。
       ★空を「うちは 何も 出さない」と 決めつけない★＝★もう一度 そのマスに 寄って 測る★
       （実際 118マスが これで ★取れて いなかっただけ★でした） */
    for (const x of 組) {
      if (描いた[x.名] !== '') continue;
      await page.evaluate(([r, c]) => window.__動かして描く(r, c), [x.r, x.c]);
      await page.waitForTimeout(90);
      描いた[x.名] = await page.evaluate(([r, c]) => window.__読む(r, c), [x.r, x.c]);
    }
    済 += 組.length;
    if (済 % 500 < 組.length) console.log('  … ' + 済 + ' / ' + 実.length);
  }

  行.push('# ★司さんの実物の「出る字」を うちと 突き合わせた★（2026-09-11）');
  行.push('#');
  行.push('# ★今まで 実物で 合わせたのは 答えだけ★（08-29 … 19,323/19,323）');
  行.push('#   ★出る字は 今日 初めて 突き合わせました★');
  行.push('# ★画面が 本当に 描いた 字（fillText）★を 取って います＝作り直して いません');
  行.push('#');
  行.push(['# マス', '実Excel の 出る字', 'うちの 出る字', '判じ', '型', '列の点', '書式'].join('\t'));

  for (const e of 実) {
    const u = 描いた[e.マス] === undefined ? '(描かれない)' : 描いた[e.マス];
    const よい = String(u) === String(e.字);
    if (よい) 合++; else { 違++; if (実物.length < 40) 実物.push(e.マス + ' 実Excel="' + e.字 + '" うち="' + u + '"（' + e.型 + '／幅' + e.幅 + '／' + e.書式 + '）'); }
    行.push([e.マス, e.字, u, よい ? '合った' : '★違う★', e.型, e.幅, e.書式].join('\t'));
  }
} catch (e) {
  違++;
  console.error('★落ちた … ' + e.message + '★');
} finally {
  await browser.close().catch(() => {});
  配信.閉じる();
}

行.push('#');
行.push('# ★★締め★★ 全 ' + (合 + 違) + '本 ／ 合った ' + 合 + ' ／ ★違う ' + 違 + '★');
fs.writeFileSync(出す先, 行.join('\n') + '\n', 'utf-8');
console.log('');
console.log('★★締め★★ 全 ' + (合 + 違) + '本 ／ 合った ' + 合 + ' ／ ★違う ' + 違 + '★');
if (実物.length) { console.log(''); console.log('★合わない 物（先頭 ' + 実物.length + '本）★'); 実物.forEach((x) => console.log('  ' + x)); }
console.log('');
console.log('★書いた … ' + 出す先 + '★');
process.exit(違 ? 1 : 0);
