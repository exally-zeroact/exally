/* osu-jitsubutsu-awanai37.mjs — ★合わない 37本の 中を 見る★（2026-09-15）
 *
 *  ★★なぜ★★（指示役1 2026-09-15）
 *    `osu-jitsubutsu-jizen-dake.mjs` で ★押した 8,019本の うち 37本が 合いません★。
 *    ★15桁に 丸めても 合わない★＝★浮きの ゴミでは ない★／ずれ 1e-3〜1 が 24本。
 *    ★使って いる 関数は 3つに 固まって います★
 *      IFERROR+MAX 14本 ／ SUBTOTAL 14本 ／ IFERROR 9本
 *
 *  ★★指示役1 から 渡された 手 2つ★★（★どちらも「見立て」＝測って 確かめます★）
 *    ①★23本は IFERROR が 覆って います★（14+9）
 *       ＝★誤りを 飲み込む★ので ★外からは ただの 違う 値に 見える★
 *       ⇒★IFERROR を 外した 中身だけを 押して 3つに 割る★
 *          ㋐★うちだけ 誤り★  … うちが 出せない 何かが 中に 在る
 *          ㋑★Excel だけ 誤り★… ★うちが 通しては いけない 物を 通して いる（危ない）★
 *          ㋒★どちらも 誤りで ないのに 値が 違う★ … ★本当の 中身の 違い★
 *    ②★SUBTOTAL 14本の 第1引数を 数える★
 *       ★9 … 隠れた 行も 数える／109 … 隠れた 行を 数えない★
 *       ⇒★109 が 混ざって いたら「中身の 違い」では なく ★見えて いない 材料★★
 *         （＝行の 隠し／絞り込み＝VBA・条件付き書式と 同じ 棚）
 *
 *  ★★読むだけ★★／★出すのは 数と 関数の 名前だけ★
 *    ★会社名・金額・人の 名前は 1文字も 出しません★（値は `9` に 潰して 形だけ）
 *
 *  使い方: node docs/measured/osu-jitsubutsu-awanai37.mjs
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
const マス拾い = /(^|[^A-Z0-9_."!])(\$?[A-Z]{1,3}\$?[0-9]{1,5})(?![0-9(])/g;
const 四角拾い = /(\$?[A-Z]{1,3}\$?[0-9]{1,5})\s*:\s*(\$?[A-Z]{1,3}\$?[0-9]{1,5})/g;
const 番地 = (a) => {
  const m = /^\$?([A-Z]{1,3})\$?([0-9]{1,5})$/.exec(a.replace(/\$/g, ''));
  if (!m) return null;
  let c = 0;
  for (let i = 0; i < m[1].length; i++) c = c * 26 + (m[1].charCodeAt(i) - 64);
  return { r: Number(m[2]), c };
};
const 名に = (r, c) => { let s = '', x = c; while (x > 0) { const y = (x - 1) % 26; s = String.fromCharCode(65 + y) + s; x = Math.floor((x - 1) / 26); } return s + r; };

/* ★IFERROR( … , … ) の 1つ目の 引数だけ 取り出す★（★括弧を 数えます★＝正規表現では 切れない） */
function IFERRORの中(f) {
  const i = f.toUpperCase().indexOf('IFERROR(');
  if (i < 0) return null;
  let 深 = 0, 字中 = false, 始 = i + 'IFERROR('.length;
  for (let k = 始; k < f.length; k++) {
    const c = f.charAt(k);
    if (c === '"') { 字中 = !字中; continue; }
    if (字中) continue;
    if (c === '(') 深++;
    else if (c === ')') { if (深 === 0) return f.slice(始, k); 深--; }
    else if (c === ',' && 深 === 0) return f.slice(始, k);
  }
  return null;
}

const 誤りら = ['#N/A', '#VALUE!', '#REF!', '#DIV/0!', '#NUM!', '#NAME?', '#NULL!', '#SPILL!'];
const 誤りか = (x) => 誤りら.indexOf(String(x)) >= 0;

let 合わない = 0;
const SUBTOTALの型 = {}, 割れ方 = {}, 関数ごと = {};
const 形の例 = {};
const 合わない印 = {}, 百番台印 = {};
const 中の形 = {}, 中のずれ = {}, 中と正 = {};
const 四角の中 = {}, 四角の正しさ = {}, 子の有無 = {};
const 五本の形 = {}, 五本の値 = {};
const 伏せ = (x) => String(x).replace(/[0-9]/g, '9');
const 板ごとの式 = {};

for (let si = 0; si < wb.SheetNames.length; si++) {
  const 名 = wb.SheetNames[si];
  const ws = wb.Sheets[名];
  if (!ws || !ws['!ref']) continue;
  const R = XLSX.utils.decode_range(ws['!ref']);
  const 式たち = {}, 値たち = {};
  for (let r = R.s.r; r <= R.e.r; r++) {
    for (let c = R.s.c; c <= R.e.c; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      const s = ws[a];
      if (!s) continue;
      if (s.f) 式たち[a] = (直し[名 + '|' + r + ',' + c] !== undefined) ? String(直し[名 + '|' + r + ',' + c]) : ('=' + s.f);
      if (s.v !== undefined && s.v !== null) 値たち[a] = s;
    }
  }
  /* ★染まりを 印す（四角の 中まで）★ */
  const 染 = {};
  for (const a of Object.keys(式たち)) if (板か(式たち[a])) 染[a] = true;
  for (let 回 = 0; 回 < 80; 回++) {
    let 増 = 0;
    for (const a of Object.keys(式たち)) {
      if (染[a]) continue;
      const f = 裸に(式たち[a]);
      let 当 = false;
      四角拾い.lastIndex = 0;
      let q;
      while ((q = 四角拾い.exec(f)) !== null && !当) {
        const p1 = 番地(q[1]), p2 = 番地(q[2]);
        if (!p1 || !p2) continue;
        const r0 = Math.min(p1.r, p2.r), r1 = Math.max(p1.r, p2.r);
        const c0 = Math.min(p1.c, p2.c), c1 = Math.max(p1.c, p2.c);
        if ((r1 - r0 + 1) * (c1 - c0 + 1) > 200000) { 当 = true; break; }
        for (let rr = r0; rr <= r1 && !当; rr++) for (let cc = c0; cc <= c1; cc++) if (染[名に(rr, cc)]) { 当 = true; break; }
      }
      if (!当) { マス拾い.lastIndex = 0; let m; while ((m = マス拾い.exec(f)) !== null) if (染[m[2].replace(/\$/g, '')]) { 当 = true; break; } }
      if (当) { 染[a] = true; 増++; }
    }
    if (!増) break;
  }

  板ごとの式[名] = 式たち;
  const 表 = H.表();
  for (const a of Object.keys(値たち)) {
    if (式たち[a]) continue;
    const s = 値たち[a];
    if (typeof s.v === 'number') { 表.打つ(a, String(s.v)); continue; }
    表.打つ(a, 'x');
    if (表.中身 && 表.中身[a]) {
      表.中身[a].値 = (typeof s.v === 'boolean') ? { 型: '真偽', 値: s.v } : { 型: '字', 値: String(s.v) };
      表.中身[a].打った字 = String(s.v);
    }
  }
  for (const a of Object.keys(式たち)) if (!板か(式たち[a]) && !染[a]) 表.打つ(a, 式たち[a]);

  for (const a of Object.keys(式たち)) {
    if (板か(式たち[a]) || 染[a]) continue;
    const 正 = 値たち[a] ? 値たち[a].v : undefined;
    if (正 === undefined) continue;
    const 出 = String(表.字(a));
    if (出 === '#NAME?') continue;
    let 同じ;
    if (typeof 正 === 'number') { const x = Number(出); 同じ = Number.isFinite(x) && Math.abs(x - 正) <= Math.max(1e-9, Math.abs(正) * 1e-9); }
    else if (typeof 正 === 'boolean') 同じ = 出.toUpperCase() === String(正).toUpperCase();
    else 同じ = 出 === String(正);
    if (同じ) continue;

    合わない++;
    合わない印[名 + '|' + a] = true;
    if (/SUBTOTAL\s*\(\s*1[0-9][0-9]/i.test(裸に(式たち[a]))) 百番台印[名 + '|' + a] = true;
    const f = 式たち[a];
    const 名ら = [...new Set((裸に(f).match(/[A-Z][A-Z0-9_.]*\s*\(/g) || []).map((x) => x.replace(/\s*\($/, '')))].sort().join('+');
    関数ごと[名ら] = (関数ごと[名ら] || 0) + 1;

    /* ══ ②SUBTOTAL の 第1引数 ══ */
    const st = /SUBTOTAL\s*\(\s*([0-9]+)/i.exec(裸に(f));
    if (st) {
      SUBTOTALの型[st[1]] = (SUBTOTALの型[st[1]] || 0) + 1;
      /* ★★四角の 中に 何が 在るか★★（指示役1 の 手・2026-09-15）
         ①★打った字が 在る マス★ ②★字が 無い マス★ ③★その うち SUBTOTAL★
         ★②が 0 なら「押して いない マスを 足して いる」という 見当は 外れ★
         ★★この 道具は 本番と 同じ 染まりの 印を 付けて います★★
           ＝★印の 無い 道具で 数えると 別の マスを 数えます★（2026-09-15 に 踏んだ） */
      const mm = /SUBTOTAL\s*\(\s*[0-9]+\s*,\s*([A-Z]+[0-9]+:[A-Z]+[0-9]+)\s*\)/i.exec(裸に(f));
      if (mm) {
        const rr = XLSX.utils.decode_range(mm[1]);
        let 字あり = 0, 字なし = 0, 入れ子 = 0;
        for (let r2 = rr.s.r; r2 <= rr.e.r; r2++) {
          for (let c2 = rr.s.c; c2 <= rr.e.c; c2++) {
            const n2 = XLSX.utils.encode_cell({ r: r2, c: c2 });
            const t = (表.中身 && 表.中身[n2]) ? String(表.中身[n2].打った字 || '') : '';
            if (/^=\s*SUBTOTAL\s*\(/i.test(t)) 入れ子++;
            else if (t === '') 字なし++;
            else 字あり++;
          }
        }
        const k2 = '字あり ' + 字あり + ' ／ ★字なし ' + 字なし + '★ ／ 入れ子 ' + 入れ子;
        四角の中[k2] = (四角の中[k2] || 0) + 1;
        /* ★★ファイルの 値を その 四角で 足すと 合うか★★（2026-09-15）
           ＝★合えば 四角は 正しい／合わなければ 四角が 違う★
             （`Table9[#Data]` を 直した 先が ★本当の 表の 端★かを 見る）
           ★ファイルの 値＝実Excel が 出した 答え★なので ★足せば 実Excel の 合計★に なるはず */
        /* ★★その 四角の 中に「合わない 23本」が 何個 在るか★★（2026-09-15）
           ★前に 測ったのは 逆向き★（23本が 14本に 頼って いるか ＝ ★0本★）
           ⇒★向きを 変えます★＝★14本が 23本を 足して いないか★
           ★合って いれば 根は 1つ★＝★23本を 直せば 14本も 直る★ */
        let 合わない子 = 0;
        for (let r4 = rr.s.r; r4 <= rr.e.r; r4++) {
          for (let c4 = rr.s.c; c4 <= rr.e.c; c4++) {
            const n4 = XLSX.utils.encode_cell({ r: r4, c: c4 });
            if (合わない印[名 + '|' + n4]) 合わない子++;
          }
        }
        const k4 = 合わない子 > 0
          ? '★四角の 中に 合わない マスが 在る（' + 合わない子 + '個）★'
          : '四角の 中に 合わない マスは 無い';
        子の有無[k4] = (子の有無[k4] || 0) + 1;
        let 紙の和 = 0, 紙の数 = 0;
        for (let r2 = rr.s.r; r2 <= rr.e.r; r2++) {
          for (let c2 = rr.s.c; c2 <= rr.e.c; c2++) {
            const n3 = XLSX.utils.encode_cell({ r: r2, c: c2 });
            const s3 = 値たち[n3];
            if (s3 && typeof s3.v === 'number') { 紙の和 += s3.v; 紙の数++; }
          }
        }
        const 合うか = Math.abs(紙の和 - 正) <= Math.max(1e-9, Math.abs(正) * 1e-9);
        const k3 = 合うか
          ? '★ファイルの 値を 足すと 合う★（四角は 正しい／うちの 値が 違う）'
          : '★ファイルの 値を 足しても 合わない★（★四角が 違う★＝表の 端が ずれて いる）';
        四角の正しさ[k3] = (四角の正しさ[k3] || 0) + 1;
        if (!形の例[k3]) 形の例[k3] = '数の マス ' + 紙の数 + '個';
      } else {
        四角の中['★四角を 切り出せない（範囲が 1つの 四角では ない）★'] =
          (四角の中['★四角を 切り出せない（範囲が 1つの 四角では ない）★'] || 0) + 1;
      }
    }

    /* ══ ①IFERROR を 外して 中だけ 押す ══ */
    if (/IFERROR\s*\(/i.test(裸に(f))) {
      const 中 = IFERRORの中(f.replace(/^=/, ''));
      if (中 !== null) {
        表.打つ('ZZ9999', '=' + 中);
        const 中の出 = String(表.字('ZZ9999'));
        const うち誤 = 誤りか(中の出);
        /* ★Excel の 側は ファイルから は 分かりません★＝
           ★IFERROR が 飲み込んだ 後の 値しか 焼かれて いない★
           ⇒★分かるのは「うちが 誤りか」だけ★＝★そこまでを 正直に 出します★ */
        const k = うち誤 ? '㋐うちだけ 誤り（中が ' + 中の出 + '）' : '㋒どちらも 誤りで ない（中身の 違い）';
        割れ方[k] = (割れ方[k] || 0) + 1;
        if (!形の例[k]) 形の例[k] = 名ら;
        /* ★★中身の 形だけ 出す★★＝★字は "…" に／数は 9 に／マスの 名前は そのまま★
           ＝★マスの 名前（A1 等）は 客の 字では ありません★
           ★"…" の 中は 客が 書いた 字かも しれない★ので ★丸ごと 伏せます★ */
        const 形 = 中
          .replace(/"(?:[^"]|"")*"/g, '"…"')
          .replace(/[0-9]+(\.[0-9]+)?/g, (x, d) => (d ? '9.9' : '9'))
          .replace(/\s+/g, '');
        中の形[形] = (中の形[形] || 0) + 1;
        const ずれ = (typeof 正 === 'number' && 正 !== 0)
          ? Math.abs(Number(出) - 正) / Math.abs(正) : null;
        if (ずれ !== null) {
          const 段 = ずれ < 1e-6 ? '1e-6 未満' : ずれ < 1e-3 ? '1e-6〜1e-3' : ずれ < 0.5 ? '1e-3〜0.5' : '0.5 以上';
          中のずれ[段] = (中のずれ[段] || 0) + 1;
        }
        /* ★中だけ 押した 値と ファイルの 値を くらべる★
           ＝★IFERROR が 飲み込んだ かどうかの 手がかり★ */
        if (typeof 正 === 'number') {
          const 中数 = Number(中の出);
          if (Number.isFinite(中数)) {
            const 同 = Math.abs(中数 - 正) <= Math.max(1e-9, Math.abs(正) * 1e-9);
            中と正[同 ? '★中だけ 押すと 合う★' : '中だけ 押しても 合わない'] =
              (中と正[同 ? '★中だけ 押すと 合う★' : '中だけ 押しても 合わない'] || 0) + 1;
            if (同) {
              /* ★★中だけなら 合うのに 丸ごとだと 合わない★★
                 ⇒★覆い（IFERROR）の 所で 分かれて います★
                 ⇒★丸ごとの 形も 見ます★（★字は "…" に／数は 9 に★） */
              const 丸 = String(f)
                .replace(/"(?:[^"]|"")*"/g, '"…"')
                .replace(/[0-9]+(\.[0-9]+)?/g, (x, d) => (d ? '9.9' : '9'))
                .replace(/\s+/g, '');
              五本の形[丸] = (五本の形[丸] || 0) + 1;
              五本の値[伏せ(正) + ' ／ 丸ごと ' + 伏せ(出) + ' ／ 中だけ ' + 伏せ(中の出)] =
                (五本の値[伏せ(正) + ' ／ 丸ごと ' + 伏せ(出) + ' ／ 中だけ ' + 伏せ(中の出)] || 0) + 1;
            }
          }
        }
      } else {
        割れ方['★IFERROR の 中を 切り出せない★'] = (割れ方['★IFERROR の 中を 切り出せない★'] || 0) + 1;
      }
    }
  }
}

const 後 = fs.statSync(本);
console.log('# ★合わない 37本の 中を 見た★（2026-09-15）');
console.log('#   ★読むだけ★ … ' + 後.size + ' バイト … '
  + ((前.mtimeMs === 後.mtimeMs && 前.size === 後.size) ? '★動いて いません★' : '★★動いた★★'));
console.log('#   ★出すのは 数と 関数の 名前だけ★');
console.log('');
console.log('★合わない★ … ' + 合わない + '本');
console.log('');
console.log('★使って いる 関数★');
Object.keys(関数ごと).sort((a, b) => 関数ごと[b] - 関数ごと[a])
  .forEach((k) => console.log('  ' + String(関数ごと[k]).padStart(4) + '本  ' + k));
console.log('');
console.log('★★② SUBTOTAL の 第1引数★★（9＝隠れた行も 数える ／ 109＝数えない）');
const st鍵 = Object.keys(SUBTOTALの型).sort((a, b) => SUBTOTALの型[b] - SUBTOTALの型[a]);
if (!st鍵.length) console.log('  （SUBTOTAL は 合わない 中に 在りません）');
st鍵.forEach((k) => console.log('  ' + String(SUBTOTALの型[k]).padStart(4) + '本  第1引数 ' + k
  + (Number(k) >= 101 ? '  ★101番台＝隠れた 行を 数えない★' : '')));
console.log('');
/* ══ ★★③37本は 同じ 根から 来て いるか★★ ══（2026-09-15）
   ★SUBTOTAL(1xx) の マスに 頼って いる 合わない 式★を 数える
   ＝★頼りを 辿る★（四角の 中まで） */
{
  let 根に頼る = 0, 根そのもの = 0, 根と無関係 = 0;
  for (const 鍵 of Object.keys(合わない印)) {
    const [板, マス] = 鍵.split('|');
    if (百番台印[鍵]) { 根そのもの++; continue; }
    const 式たち = 板ごとの式[板] || {};
    /* ★その 板の 中で 100番台の マスを 集める★ */
    const 根 = {};
    for (const k of Object.keys(百番台印)) { const [b2, m2] = k.split('|'); if (b2 === 板) 根[m2] = true; }
    /* ★頼りを 辿る★ */
    const 見た = {}; let 積 = [マス]; let 当 = false;
    while (積.length && !当) {
      const x = 積.pop();
      if (見た[x]) continue;
      見た[x] = true;
      const f = 裸に(式たち[x] || '');
      if (!f) continue;
      四角拾い.lastIndex = 0;
      let q;
      while ((q = 四角拾い.exec(f)) !== null && !当) {
        const p1 = 番地(q[1]), p2 = 番地(q[2]);
        if (!p1 || !p2) continue;
        const r0 = Math.min(p1.r, p2.r), r1 = Math.max(p1.r, p2.r);
        const c0 = Math.min(p1.c, p2.c), c1 = Math.max(p1.c, p2.c);
        if ((r1 - r0 + 1) * (c1 - c0 + 1) > 50000) continue;
        for (let rr = r0; rr <= r1 && !当; rr++) for (let cc = c0; cc <= c1; cc++) {
          const n2 = 名に(rr, cc);
          if (根[n2]) { 当 = true; break; }
          if (式たち[n2] && !見た[n2]) 積.push(n2);
        }
      }
      if (当) break;
      マス拾い.lastIndex = 0;
      let m;
      while ((m = マス拾い.exec(f)) !== null) {
        const n2 = m[2].replace(/\$/g, '');
        if (根[n2]) { 当 = true; break; }
        if (式たち[n2] && !見た[n2]) 積.push(n2);
      }
    }
    if (当) 根に頼る++; else 根と無関係++;
  }
  console.log('★★③ 37本は 同じ 根から 来て いるか★★');
  console.log('  ★SUBTOTAL(1xx) そのもの★        … ' + 根そのもの + '本');
  console.log('  ★その マスに 頼って いる★        … ' + 根に頼る + '本');
  console.log('  ★根と 関わりが 見つからない★     … ' + 根と無関係 + '本');
  console.log('');
}
console.log('★★SUBTOTAL の 四角の 中に 何が 在るか★★（★本番と 同じ 染まりの 印つき★）');
Object.keys(四角の中).sort((a, b) => 四角の中[b] - 四角の中[a])
  .forEach((k) => console.log('  ' + String(四角の中[k]).padStart(4) + '本  ' + k));
console.log('');
console.log('★★14本の 四角の 中に「合わない マス」が 在るか★★（★向きを 変えた★）');
Object.keys(子の有無).sort((a, b) => 子の有無[b] - 子の有無[a])
  .forEach((k) => console.log('  ' + String(子の有無[k]).padStart(4) + '本  ' + k));
console.log('');
console.log('★★ファイルの 値を その 四角で 足すと 合うか★★');
Object.keys(四角の正しさ).sort((a, b) => 四角の正しさ[b] - 四角の正しさ[a])
  .forEach((k) => console.log('  ' + String(四角の正しさ[k]).padStart(4) + '本  ' + k
    + '   （' + (形の例[k] || '-') + '）'));
console.log('');
console.log('★★① IFERROR を 外して 中を 押した★★');
Object.keys(割れ方).sort((a, b) => 割れ方[b] - 割れ方[a])
  .forEach((k) => console.log('  ' + String(割れ方[k]).padStart(4) + '本  ' + k + '   （例の 関数 … ' + (形の例[k] || '-') + '）'));
console.log('');
console.log('★★中だけなら 合う 分の「丸ごとの 形」★★（字は "…"／数は 9）');
Object.keys(五本の形).forEach((k) => console.log('  ' + String(五本の形[k]).padStart(4) + '本  ' + k));
console.log('★★その 値（数字は 9 に 潰して 在ります）★★');
Object.keys(五本の値).forEach((k) => console.log('  ' + String(五本の値[k]).padStart(4) + '本  ファイル ' + k));
console.log('');
console.log('★中だけ 押した 値と ファイルの 値★');
Object.keys(中と正).forEach((k) => console.log('  ' + String(中と正[k]).padStart(4) + '本  ' + k));
console.log('');
console.log('★ずれの 大きさ★');
Object.keys(中のずれ).sort((a, b) => 中のずれ[b] - 中のずれ[a])
  .forEach((k) => console.log('  ' + String(中のずれ[k]).padStart(4) + '本  ' + k));
console.log('');
console.log('★★IFERROR の 中の 形★★（★字は "…" に／数は 9 に 潰して 在ります★）');
Object.keys(中の形).sort((a, b) => 中の形[b] - 中の形[a]).slice(0, 12)
  .forEach((k) => console.log('  ' + String(中の形[k]).padStart(4) + '本  ' + k));
