/* jitsubutsu-oshi.mjs — ★司さんの実物を 自前の 土台で 押す（★1つの 物★）★（2026-09-15）
 *
 *  ★★なぜ 1つに するか★★（指示役1 2026-09-15）
 *    ★掘る 道具を 書き起こしたら ★染まりの 印★が 抜けました★＝
 *      ★本番が 押して いない マスを 押して しまい★、
 *      「四角の 中は 空 31 ／ 数 0」という ★別の マスの 数★を 読みかけました。
 *    ★「印を 付け忘れた」では ありません★＝★別の 道を 作れば 印は 毎回 抜けます★。
 *    ⇒★押し方は ここ 1つ★／★掘る 道具は ここを 呼ぶだけ★。
 *    ＝★今日「書式の 台は 1つ・呼ぶ側は 2つ」で 出した 答えと 同じ 形★を 測る 側にも 当てた。
 *
 *  ★★ここが 持つ 決まり★★（★全部 実物で 踏んで 直した 物★）
 *    ①★表の 参照（Table1[…]）を A1 に 直す★（`lib/table-refs.js`／実物 12,218本＝100%）
 *    ②★板を またぐ 式は 押さない★（★うちの 表は 板を 1枚しか 持って いません★）
 *    ③★★またがなくても「またぐ マスに 頼る 式」は 押さない★★（＝★染まり★）
 *       ・A10=SUM(A1:A9) は またがなくても A3=他板!B5 なら ★A10 の 答えも 嘘★
 *       ・★四角（A1:A100）の 中まで 見ます★＝★端だけ 見ると 取りこぼす★
 *    ④★値の マスは そのまま 置く／式の マスだけ 打つ★
 *
 *  ★出す 物★ … { 名, 式たち, 値たち, 染, 表, 押した }
 *  ★出さない 物★ … ★中身は 1つも 出しません★（呼ぶ側が 数だけ 出す 約束）
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
export const XLSX = require_(path.join(ROOT, 'lib/xlsx.full.min.js'));
const TR = require_(path.join(ROOT, 'lib/table-refs.js'));
const ZS = require_(path.join(ROOT, 'lib/zip-surgeon.js'));
const H = require_(path.join(ROOT, 'lib/shiki-hyou.js'));

export const 本の道 = 'C:\\Users\\zeroa\\kyukyu-0907\\代行計算表2026.xlsb';

export const 裸に = (f) => String(f).replace(/"(?:[^"]|"")*"/g, '""');
export const 板か = (f) => /[A-Za-z0-9_\u3000-\u9fff']+!/.test(裸に(f));
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

/** ★本を 開いて 表の 参照を 直す★（★読むだけ★） */
export async function 本を開く() {
  const 前 = fs.statSync(本の道);
  const bytes = new Uint8Array(fs.readFileSync(本の道));
  const wb = XLSX.read(bytes, { type: 'array', cellFormula: true, cellNF: true, cellText: true });
  const r = await TR.resolve(bytes, 'xlsb', wb, ZS);
  const 直し = (r && r.fixes) ? r.fixes : (r || {});
  return { wb, 直し, 前 };
}

/** ★本体を 触って いない事を 確かめる★ */
export function 触っていないか(前) {
  const 後 = fs.statSync(本の道);
  return {
    大きさ: 後.size,
    動いたか: !(前.mtimeMs === 後.mtimeMs && 前.size === 後.size),
    字: (前.mtimeMs === 後.mtimeMs && 前.size === 後.size) ? '★動いて いません★' : '★★動いた★★',
  };
}

/** ★1枚の 板を 建てて 押す★（★染まりの 印まで 必ず ここで 付ける★） */
export function 板を押す(wb, 直し, si) {
  const 名 = wb.SheetNames[si];
  const ws = wb.Sheets[名];
  if (!ws || !ws['!ref']) return null;
  const R = XLSX.utils.decode_range(ws['!ref']);
  const 式たち = {}, 値たち = {};
  for (let r = R.s.r; r <= R.e.r; r++) {
    for (let c = R.s.c; c <= R.e.c; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      const s = ws[a];
      if (!s) continue;
      const k = 名 + '|' + r + ',' + c;
      if (s.f) 式たち[a] = (直し[k] !== undefined) ? String(直し[k]) : ('=' + s.f);
      if (s.v !== undefined && s.v !== null) 値たち[a] = s;
    }
  }

  /* ══ ★★染まり★★＝★板またぎに 頼る 式★ ══
     ★★何段でも 伝わります★★（2026-09-15・指示役1 の 問い）
       ＝★増えなく なるまで 繰り返す★（★1段だけでは ありません★）
       ★他板!C1 → B5 → A5 → A10 の ような 鎖も 端まで 染まります★
       ★何段 掛かったかを 数えて 出します★（`段数` ＝ ★1 なら 1段で 止まった★） */
  const 染 = {};
  for (const a of Object.keys(式たち)) if (板か(式たち[a])) 染[a] = true;
  let 段数 = 0;
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
        for (let rr = r0; rr <= r1 && !当; rr++) {
          for (let cc = c0; cc <= c1; cc++) if (染[名に(rr, cc)]) { 当 = true; break; }
        }
      }
      if (!当) {
        マス拾い.lastIndex = 0;
        let m;
        while ((m = マス拾い.exec(f)) !== null) if (染[m[2].replace(/\$/g, '')]) { 当 = true; break; }
      }
      if (当) { 染[a] = true; 増++; }
    }
    if (!増) break;
    段数 = 回 + 1;
  }

  /* ══ ★表を 建てる★ ══ */
  const 表 = H.表();
  for (const a of Object.keys(値たち)) {
    if (式たち[a]) continue;                        /* 式の マスは 下で 打つ */
    const s = 値たち[a];
    if (typeof s.v === 'number') { 表.打つ(a, String(s.v)); continue; }
    表.打つ(a, 'x');
    if (表.中身 && 表.中身[a]) {
      表.中身[a].値 = (typeof s.v === 'boolean') ? { 型: '真偽', 値: s.v } : { 型: '字', 値: String(s.v) };
      表.中身[a].打った字 = String(s.v);
    }
  }
  const 押した = [];
  for (const a of Object.keys(式たち)) {
    if (板か(式たち[a]) || 染[a]) continue;
    try { 表.打つ(a, 式たち[a]); 押した.push(a); } catch (e) { /* 呼ぶ側が 数える */ }
  }
  return { 名, si, 式たち, 値たち, 染, 表, 押した, 段数 };
}

/** ★突き合わせ★（★ファイルに 焼かれた 実Excel の 答えと★） */
export function 合うか(出, 正) {
  if (typeof 正 === 'number') {
    const x = 出.trim() === '' ? NaN : Number(出);
    return Number.isFinite(x) && Math.abs(x - 正) <= Math.max(1e-9, Math.abs(正) * 1e-9);
  }
  if (typeof 正 === 'boolean') return String(出).toUpperCase() === String(正).toUpperCase();
  return String(出) === String(正);
}

/** ★数字を 潰す★（★金額は 1文字も 出さない★） */
export const 伏せる = (x) => String(x).replace(/[0-9]/g, '9');
