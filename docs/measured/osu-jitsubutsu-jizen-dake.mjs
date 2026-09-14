/* osu-jitsubutsu-jizen-dake.mjs — ★司さんの実物を「自前だけ」で押してみる（板をまたがない分）★（2026-09-15）
 *
 *  ★★なぜ★★（指示役1 2026-09-15）
 *    ⑥「この 1冊が 自前だけで 動くか」の ★半分を 先に 数で 出す★。
 *    ★板を またぐ 土台（`H.表()` に 板の 口）は まだ 在りません★が、
 *    ★またがない 式は 今の 土台で 押せる はず★＝★作る前に 大きさが 分かります★。
 *
 *  ★★出す 数は 3つに 割ります★★（★「通った」と「合った」は 別★・指示役1 の 注文）
 *    ①★式が 通った★     … 落ちずに 答えが 出た（★#NAME? でも「通った」には 数えません★）
 *    ②★答えが 合った★   … ★これが 本当の 数★（ファイルに 焼かれた 実Excel の 答えと 突き合わせ）
 *    ③★合わない うち「板またぎの マスに 頼って いる」★
 *       ＝★土台を 作れば 消える 分★／★残りは 別の 壁★
 *    ★★①だけ 出して「◯◯本 通りました」とは 言いません★★
 *       （2026-09-15「120/120 合った」＝★押して いない 行は 合わない 事も 出来ない★）
 *
 *  ★★「またがない」は「独りで 立てる」では ありません★★（指示役1 が 見つけた 穴）
 *    A10 = SUM(A1:A9) は またがないが、A3 = 他板!B5 なら ★A10 の 答えも 嘘★。
 *    ⇒★頼りを 辿って「板またぎに 染まった マス」を 先に 印して おきます★。
 *
 *  ★★読むだけ★★／★出すのは 数だけ★＝★会社名・金額・人の 名前は 1文字も 出しません★
 *
 *  使い方: node docs/measured/osu-jitsubutsu-jizen-dake.mjs [板の番号]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const XLSX = require_(path.join(ROOT, 'lib/xlsx.full.min.js'));
const TR = require_(path.join(ROOT, 'lib/table-refs.js'));
const ZS = require_(path.join(ROOT, 'lib/zip-surgeon.js'));
const H = require_(path.join(ROOT, 'lib/shiki-hyou.js'));

const 本 = 'C:\\Users\\zeroa\\kyukyu-0907\\代行計算表2026.xlsb';
if (!fs.existsSync(本)) { console.error('★本体が 無い★'); process.exit(2); }
const 前 = fs.statSync(本);
const bytes = new Uint8Array(fs.readFileSync(本));
const wb = XLSX.read(bytes, { type: 'array', cellFormula: true });
const 直し = await TR.resolve(bytes, 'xlsb', wb, ZS).then((r) => (r && r.fixes) ? r.fixes : (r || {}));

const 裸に = (f) => String(f).replace(/"(?:[^"]|"")*"/g, '""');
const 板か = (f) => /[A-Za-z0-9_\u3000-\u9fff']+!/.test(裸に(f));
/* ★マスの 名前を 拾う★（★後読みは 使いません★＝旧 Safari で 丸ごと 動かなく なる） */
const マス拾い = /(^|[^A-Z0-9_."!])(\$?[A-Z]{1,3}\$?[0-9]{1,5})(?![0-9(])/g;

const 板だけ = process.argv[2] ? Number(process.argv[2]) : null;
let 全式 = 0, またぐ = 0, 染まった = 0, 押した = 0, 通った = 0, 合った = 0;
let 頼りで落ちた = 0, 名前が無い = 0, 違った = 0, 十五桁で合う = 0;
const 違いの訳 = {}, 落ちた訳 = {}, 違いの関数 = {}, ずれの段 = {};

for (let si = 0; si < wb.SheetNames.length; si++) {
  if (板だけ !== null && si + 1 !== 板だけ) continue;
  const 名 = wb.SheetNames[si];
  const ws = wb.Sheets[名];
  if (!ws || !ws['!ref']) continue;
  const R = XLSX.utils.decode_range(ws['!ref']);

  /* ══ ①その 板の 中身を 集める ══ */
  const 式たち = {}, 値たち = {};
  for (let r = R.s.r; r <= R.e.r; r++) {
    for (let c = R.s.c; c <= R.e.c; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      const s = ws[a];
      if (!s) continue;
      if (s.f) {
        const k = 名 + '|' + r + ',' + c;
        式たち[a] = (直し[k] !== undefined) ? String(直し[k]) : ('=' + s.f);
      }
      if (s.v !== undefined && s.v !== null) 値たち[a] = s;
    }
  }

  /* ══ ②板またぎに 染まった マスを 印す（頼りを 辿る）══
     ★★四角（A1:B9）の 中まで 見ます★★（2026-09-15 に 直した）
       ★前は 端（A1 と B9）だけ 見て いました★
       ⇒`SUM(A1:A100)` の ★A50 が 板またぎ★でも 染まらず ★押して しまう★
       ⇒ 実際に ★37本★ それで 押して いて ★全部 合いませんでした★
         （ずれが 1e-3〜1 と ★大きい★＝浮きの ゴミでは ない＝★材料が 欠けて いた★）
     ★これが 指示役1 の 言った 穴★＝★「またがない」は「独りで 立てる」では ない★ */
  const 染 = {};
  for (const a of Object.keys(式たち)) if (板か(式たち[a])) 染[a] = true;
  /* ★式の マスなのに 押さない 物＝その マスは 空に なります★
     ＝★空を 材料に した 式は 嘘に なる★ので ★そこも 染まりと 見ます★ */
  const 四角拾い = /(\$?[A-Z]{1,3}\$?[0-9]{1,5})\s*:\s*(\$?[A-Z]{1,3}\$?[0-9]{1,5})/g;
  const 番地 = (a) => {
    const m = /^\$?([A-Z]{1,3})\$?([0-9]{1,5})$/.exec(a.replace(/\$/g, ''));
    if (!m) return null;
    let c = 0;
    for (let i = 0; i < m[1].length; i++) c = c * 26 + (m[1].charCodeAt(i) - 64);
    return { r: Number(m[2]), c: c };
  };
  const 名に = (r, c) => {
    let s2 = '';
    let x = c;
    while (x > 0) { const y = (x - 1) % 26; s2 = String.fromCharCode(65 + y) + s2; x = Math.floor((x - 1) / 26); }
    return s2 + r;
  };
  for (let 回 = 0; 回 < 80; 回++) {
    let 増えた = 0;
    for (const a of Object.keys(式たち)) {
      if (染[a]) continue;
      const f = 裸に(式たち[a]);
      let 当たり = false;
      /* ★①四角の 中を 全部 見る★ */
      四角拾い.lastIndex = 0;
      let q;
      while ((q = 四角拾い.exec(f)) !== null && !当たり) {
        const p1 = 番地(q[1]), p2 = 番地(q[2]);
        if (!p1 || !p2) continue;
        const r0 = Math.min(p1.r, p2.r), r1 = Math.max(p1.r, p2.r);
        const c0 = Math.min(p1.c, p2.c), c1 = Math.max(p1.c, p2.c);
        if ((r1 - r0 + 1) * (c1 - c0 + 1) > 200000) { 当たり = true; break; }  /* 大きすぎる＝疑わしきは 染まり */
        for (let rr = r0; rr <= r1 && !当たり; rr++) {
          for (let cc = c0; cc <= c1; cc++) {
            if (染[名に(rr, cc)]) { 当たり = true; break; }
          }
        }
      }
      /* ★②1つの マスも 見る★ */
      if (!当たり) {
        マス拾い.lastIndex = 0;
        let m;
        while ((m = マス拾い.exec(f)) !== null) {
          if (染[m[2].replace(/\$/g, '')]) { 当たり = true; break; }
        }
      }
      if (当たり) { 染[a] = true; 増えた++; }
    }
    if (!増えた) break;
  }

  /* ══ ③表を 建てて 押す ══ */
  const 表 = H.表();
  for (const a of Object.keys(値たち)) {
    if (式たち[a]) continue;                       /* 式の マスは 下で 打つ */
    const s = 値たち[a];
    if (typeof s.v === 'number') { 表.打つ(a, String(s.v)); continue; }
    if (typeof s.v === 'boolean') {
      表.打つ(a, 'x');
      if (表.中身 && 表.中身[a]) { 表.中身[a].値 = { 型: '真偽', 値: s.v }; 表.中身[a].打った字 = String(s.v); }
      continue;
    }
    表.打つ(a, 'x');
    if (表.中身 && 表.中身[a]) { 表.中身[a].値 = { 型: '字', 値: String(s.v) }; 表.中身[a].打った字 = String(s.v); }
  }
  for (const a of Object.keys(式たち)) {
    全式++;
    if (板か(式たち[a])) { またぐ++; continue; }
    if (染[a]) { 染まった++; continue; }
    try { 表.打つ(a, 式たち[a]); } catch (e) { /* 下で 数える */ }
  }

  /* ══ ④突き合わせ ══ */
  for (const a of Object.keys(式たち)) {
    if (板か(式たち[a]) || 染[a]) continue;
    押した++;
    let 出;
    try { 出 = String(表.字(a)); } catch (e) { 出 = '★落ちた★'; }
    if (出 === '★落ちた★') { const k = '落ちた'; 落ちた訳[k] = (落ちた訳[k] || 0) + 1; continue; }
    if (出 === '#NAME?') { 名前が無い++; continue; }
    通った++;
    const 正 = 値たち[a] ? 値たち[a].v : undefined;
    if (正 === undefined) { 違った++; 違いの訳['★ファイルに 答えが 無い★'] = (違いの訳['★ファイルに 答えが 無い★'] || 0) + 1; continue; }
    let 同じ;
    if (typeof 正 === 'number') {
      const x = Number(出);
      同じ = Number.isFinite(x) && Math.abs(x - 正) <= Math.max(1e-9, Math.abs(正) * 1e-9);
    } else if (typeof 正 === 'boolean') {
      同じ = 出.toUpperCase() === String(正).toUpperCase();
    } else {
      同じ = 出 === String(正);
    }
    if (同じ) { 合った++; continue; }
    /* ★★15桁に 丸めたら 合うか★★（2026-09-15）
       ＝実Excel は ★15桁に 丸めてから 見せます★（`book.html:3440` の `_十五桁`）
       ⇒★画面に 出る 字が 同じなら 客には 同じ★
       ★でも「合った」には 数えません★＝★別の 数として 出します★
         （★中の 数が 違うのは 事実★＝★保存すると 違う 数が 書かれます★） */
    if (typeof 正 === 'number') {
      const j = (n) => (typeof n === 'number' && isFinite(n) && n !== 0) ? Number(n.toPrecision(15)) : n;
      if (j(Number(出)) === j(正)) 十五桁で合う++;
    }
    違った++;
    /* ★訳は「形」だけ★＝★数字は 9 に 潰します（金額は 1文字も 出しません）★ */
    const 伏 = (x) => String(x).replace(/[0-9]/g, '9').slice(0, 14);
    const k = 伏(正) + ' ／ ' + 伏(出);
    違いの訳[k] = (違いの訳[k] || 0) + 1;
    /* ★どの 関数を 使って いるか★＝★名前だけ★（★式そのものは 出しません★） */
    const 名ら = (裸に(式たち[a]).match(/[A-Z][A-Z0-9_.]*\s*\(/g) || [])
      .map((x) => x.replace(/\s*\($/, ''));
    const 印 = (名ら.length ? [...new Set(名ら)].sort().join('+') : '（関数なし＝＋−×÷だけ）');
    違いの関数[印] = (違いの関数[印] || 0) + 1;
    /* ★ずれの 大きさ★（★値は 出さず 割合だけ★） */
    if (typeof 正 === 'number' && 正 !== 0) {
      const d = Math.abs(Number(出) - 正) / Math.abs(正);
      const 段 = d < 1e-12 ? '1e-12 より 小' : d < 1e-9 ? '1e-12〜1e-9' : d < 1e-6 ? '1e-9〜1e-6'
        : d < 1e-3 ? '1e-6〜1e-3' : d < 1 ? '1e-3〜1' : '1 より 大';
      ずれの段[段] = (ずれの段[段] || 0) + 1;
    }
  }
  console.log('  … 板 ' + (si + 1) + '／式 ' + Object.keys(式たち).length
    + '／またぐ ' + Object.keys(式たち).filter((a) => 板か(式たち[a])).length
    + '／染まった ' + Object.keys(染).filter((a) => !板か(式たち[a])).length
    + '／ここまで 合った ' + 合った);
}

const 後 = fs.statSync(本);
console.log('');
console.log('# ★司さんの実物を「自前だけ」で 押した★（2026-09-15）');
console.log('#   ★読むだけ★ … ' + 後.size + ' バイト … '
  + ((前.mtimeMs === 後.mtimeMs && 前.size === 後.size) ? '★動いて いません★' : '★★動いた★★'));
console.log('#   ★出すのは 数だけ★（会社名・金額・人の 名前は 1文字も 出て いません）');
console.log('');
console.log('★式 全部★ … ' + 全式);
console.log('  ★板を またぐ★              … ' + またぐ + '（' + pc(またぐ) + '%）★今の 土台では 押せません★');
console.log('  ★またがないが 染まって いる★ … ' + 染まった + '（' + pc(染まった) + '%）'
  + '★頼った 先が 板を またぐ★＝★押しても 嘘に なるので 押しません★');
console.log('  ★★押した★★                  … ' + 押した + '（' + pc(押した) + '%）');
console.log('');
console.log('★①通った（落ちず 答えが 出た）★ … ' + 通った);
console.log('    ★#NAME?（まだ 無い 関数）★ … ' + 名前が無い);
console.log('★★②合った（実Excel と 同じ）★★ … ' + 合った
  + '（押した うち ' + (押した ? Math.round(合った / 押した * 1000) / 10 : 0) + '%'
  + '／式 全部の ' + pc(合った) + '%）');
console.log('★③合わない★ … ' + 違った);
console.log('    ★その うち 15桁に 丸めたら 合う★ … ' + 十五桁で合う
  + '（★画面に 出る 字は 同じ★／★中の 数は 違う★）');
console.log('    ★本当に 違う★ … ' + (違った - 十五桁で合う));
console.log('');
console.log('★合わない 形（多い順・★数字は 9 に 潰して 在ります★）★');
Object.keys(違いの訳).sort((a, b) => 違いの訳[b] - 違いの訳[a]).slice(0, 20)
  .forEach((k) => console.log('  ' + String(違いの訳[k]).padStart(6) + '本  ' + k));
console.log('');
console.log('★合わない 式が 使う 関数（★名前だけ★／式そのものは 出して いません）★');
Object.keys(違いの関数).sort((a, b) => 違いの関数[b] - 違いの関数[a])
  .forEach((k) => console.log('  ' + String(違いの関数[k]).padStart(6) + '本  ' + k));
console.log('');
console.log('★ずれの 大きさ（★割合だけ★／値は 出して いません）★');
Object.keys(ずれの段).sort((a, b) => ずれの段[b] - ずれの段[a])
  .forEach((k) => console.log('  ' + String(ずれの段[k]).padStart(6) + '本  ' + k));

function pc(n) { return 全式 ? Math.round(n / 全式 * 1000) / 10 : 0; }
