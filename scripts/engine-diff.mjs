/* engine-diff.mjs — ★計算の道具を 入れ替えた時に「答えが 変わっていないか」を 実物で 数える★
 *
 *  ★なぜ在るか（指示役 2026-08-29）★
 *    計算の道具（HyperFormula）を 2.6.1 → 3.4.0 に 丸ごと 入れ替えた（+67KB）。
 *    ★中身が 別物★なので ★答えが 変わり得る★。
 *    「表の参照 11,669本＝一致率100.0%」は ★前の道具で 出した数字★＝そのまま 使えない。
 *
 *  ★測り方（自分で 決めない・本番と 同じ物を 使う）★
 *    ・読み込みは 本番と 同じ … XLSX.read ＋ lib/table-refs.js（Table[列名]→A1）
 *    ・計算の設定も 本番と 同じ … buildEmpty({useArrayArithmetic:true, smartRounding:false})
 *      ★smartRounding は 切る★（book.html の 決まり。true に すると 1円 ずれる）
 *    ・2つの版で 同じ表を 計算して ★1セルずつ 突き合わせる★
 *    ・★比べる相手は 先に 複製する★（同じ物を 指したまま だと 自分の答えで 上書きされる）
 *
 *  ★出す物★
 *    ・式の本数／答えが 違った本数／どの関数を 使っている式が 違ったか
 *    ・★Excelが ファイルに 残した答え（キャッシュ）とも 比べる★＝どちらが 正しいかの 手掛かり
 *
 *  使い方:
 *    node scripts/engine-diff.mjs "<xlsxのパス>" [<前の道具のjs>] [<今の道具のjs>]
 *      前の道具を 省くと 今の道具どうし（＝差 0 の 空振り確認）に なる。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const XLSX = require_(path.join(ROOT, 'lib/xlsx.full.min.js'));
const EF = require_(path.join(ROOT, 'exally-formula.js'));
const TableRefs = require_(path.join(ROOT, 'lib/table-refs.js'));
const ZipSurgeon = require_(path.join(ROOT, 'lib/zip-surgeon.js'));

/* ★印（--…）と 場所を 混ぜない★＝混ぜると 印を ファイル名として 読んで 落ちる（実際に 落ちた） */
const 引数 = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const ファイル = 引数[0];
const 前の道具 = 引数[1] || path.join(ROOT, 'hyperformula.full.min.js');
const 今の道具 = 引数[2] || path.join(ROOT, 'hyperformula.full.min.js');
if (!ファイル) { console.log('★どのファイルを 測るか 教えてください★'); process.exit(1); }

/** ★シート名を 引用符で 囲む★（book.html の quoteSheetRefs と 同じ物を 写した）
 *  ★HyperFormula は 日本語のシート名を そのままでは 読めない★
 *    実測 2026-08-29 … `=歩合!B1` → #ERROR! ／ `='歩合'!B2` → 20
 *  ★本番は これを 通してから エンジンに 渡している★。ここを 通さずに 測ると
 *  「別シートを見る式が 8,800本 エラー」という ★嘘の数字★が 出る（実際に 出した）。 */
function シート名を囲む(f, 名前たち) {
  if (typeof f !== 'string' || f.charAt(0) !== '=') return f;
  for (const n of 名前たち) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) continue;
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    f = f.replace(new RegExp("(^|[^'\\w])" + esc + "!", 'g'), "$1'" + n + "'!");
  }
  return f;
}

/** 本番と 同じ設定で 表を 載せて 全部 計算する */
function 計算する(道具, sheets) {
  const { HyperFormula } = require_(道具);
  /* ★本番と 同じ設定★（book.html の initFormulaEngine より） */
  const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3', useArrayArithmetic: true, smartRounding: false });
  /* ★シートは 先に 全部 作ってから 中身を 入れる★（本番も addSheetToEngine → loadSheetIntoEngine の順）。
     ★1枚ずつ 作って 入れると、まだ 無いシートを 見ている式が その場で #ERROR! になり
       後から シートが 出来ても 直らない★（2026-08-29 実測：別シート参照が 8,800本 エラーに なっていた）。 */
  for (const s of sheets) hf.addSheet(s.name);
  const 名前たち = sheets.map((x) => x.name);
  for (const s of sheets) {
    const g = s.grid.map((行) => 行.map((v) => (typeof v === 'string' && v.charAt(0) === '=') ? シート名を囲む(v, 名前たち) : v));
    hf.setSheetContent(hf.getSheetId(s.name), g);
  }
  const 出 = {};
  for (const s of sheets) {
    const sid = hf.getSheetId(s.name);
    for (const k of s.式の場所) {
      const [r, c] = k.split(',').map(Number);
      let v;
      try { v = hf.getCellValue({ sheet: sid, row: r, col: c }); }
      catch (e) { v = '★読めない★'; }
      出[s.name + '!' + k] = (v && typeof v === 'object' && v.value !== undefined) ? v.value : v;
    }
  }
  const 版 = HyperFormula.version;
  hf.destroy();
  return { 版, 答え: 出 };
}

/* ── 読み込み（本番と 同じ道）────────────────────────────── */
const bytes = new Uint8Array(fs.readFileSync(ファイル));
const 形 = /\.xlsb$/i.test(ファイル) ? 'xlsb' : (/\.xlsm$/i.test(ファイル) ? 'xlsm' : 'xlsx');
const wb = XLSX.read(bytes, { type: 'array', cellFormula: true, cellNF: true, sheetStubs: false });

let 直し = {}, 直しの数 = 0;
const r = await TableRefs.resolve(bytes, 形, wb, ZipSurgeon);
if (r && r.ok) { 直し = r.fixes || {}; 直しの数 = Object.keys(直し).length; }
else console.log('※ 表の名前での参照を 直せませんでした（' + (r && r.why) + '）');

const sheets = [];
let 式の本数 = 0;
const Excelの答え = {};
for (const nm of wb.SheetNames) {
  const ws = wb.Sheets[nm];
  if (!ws) continue;
  const ref = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
  if (!ref) continue;
  const grid = [];
  const 式の場所 = [];
  for (let R = 0; R <= ref.e.r; R++) {
    const 行 = [];
    for (let C = 0; C <= ref.e.c; C++) {
      const a = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[a];
      if (!cell) { 行.push(null); continue; }
      /* ★鍵の形は 本番と 同じに する★＝「シート名|行,列」（js/book-open.js と 同じ）。
         ★A1 の形で 引いていて 1本も 当たっていなかった★＝Table[列名] が 直らないまま 計算していた
         （2026-08-29 実測で 気づいた。★数字が おかしい時は まず 自分の道具を 疑う★） */
      const 直った = 直し[nm + '|' + R + ',' + C];
      if (cell.f || 直った) {
        const f = 直った || cell.f;
        /* ★本番と 同じ順で 通す★＝convertFormula（exally-formula.js）→ シート名を囲む */
        let 式 = '=' + String(f).replace(/^=/, '');
        if (EF && typeof EF.convertFormula === 'function') 式 = EF.convertFormula(式);
        行.push(式);
        式の場所.push(R + ',' + C);
        式の本数++;
        if (cell.v !== undefined && cell.v !== null) Excelの答え[nm + '!' + R + ',' + C] = cell.v;
      } else {
        行.push(cell.v === undefined ? null : cell.v);
      }
    }
    grid.push(行);
  }
  sheets.push({ name: nm, grid, 式の場所 });
}

console.log('');
console.log('[計算の道具の 突き合わせ] ★読むだけ★');
console.log('  ファイル … ' + path.basename(ファイル) + '（' + bytes.length.toLocaleString() + 'バイト）');
console.log('  シート ' + sheets.length + '枚 ／ ★式 ' + 式の本数.toLocaleString() + '本★'
  + ' ／ 表の名前での参照を 直した所 ' + 直しの数.toLocaleString() + '本');

/* ★比べる相手は 先に 複製する★（参照のままだと 自分の答えで 上書きされる） */
const 前 = 計算する(前の道具, sheets);
const 前の答え = JSON.parse(JSON.stringify(前.答え));
const 今 = 計算する(今の道具, sheets);

const 鍵 = Object.keys(前の答え);
let 同じ = 0;
const 違い = [];
for (const k of 鍵) {
  const a = 前の答え[k], b = 今.答え[k];
  if (String(a) === String(b)) { 同じ++; continue; }
  違い.push({ k, 前: a, 今: b, excel: Excelの答え[k] });
}
console.log('');
console.log('★前の道具 ' + 前.版 + ' ／ 今の道具 ' + 今.版 + '★');
console.log('  比べた式 … ' + 鍵.length.toLocaleString() + '本');
console.log('  ★答えが 同じ … ' + 同じ.toLocaleString() + '本（' + (鍵.length ? (Math.round(同じ / 鍵.length * 1000) / 10) : 0) + '%）★');
console.log('  ★答えが 違う … ' + 違い.length.toLocaleString() + '本★');

if (違い.length) {
  const 例 = 違い.slice(0, 20);
  console.log('');
  console.log('  違った所（先頭' + 例.length + '件・★どちらが正しいかは Excelの答えで 見る★）');
  for (const d of 例) {
    console.log('   ' + d.k + ' … 前=' + JSON.stringify(d.前) + ' 今=' + JSON.stringify(d.今)
      + (d.excel !== undefined ? ' ／ Excelが 残した答え=' + JSON.stringify(d.excel) : ' ／ Excelの答え=（無し）'));
  }
  if (違い.length > 例.length) console.log('   ほか ' + (違い.length - 例.length) + '本');
}

/* Excelが 残した答えとの 突き合わせ（★どちらの道具が 正しいか★） */
const 突合 = (答え) => {
  let 合 = 0, 差 = 0, 無 = 0;
  for (const k of Object.keys(Excelの答え)) {
    const e = Excelの答え[k], v = 答え[k];
    if (v === undefined) { 無++; continue; }
    const 数 = (typeof e === 'number' && typeof v === 'number');
    if (数 ? Math.abs(e - v) <= Math.max(1e-9, Math.abs(e) * 1e-9) : String(e) === String(v)) 合++;
    else 差++;
  }
  return { 合, 差, 無 };
};
const a = 突合(前の答え), b = 突合(今.答え);
console.log('');
console.log('★Excelが ファイルに 残した答えとの 突き合わせ（' + Object.keys(Excelの答え).length.toLocaleString() + '本）★');
console.log('  前の道具 … 合う ' + a.合.toLocaleString() + ' ／ 違う ' + a.差.toLocaleString() + ' ／ 計算できず ' + a.無.toLocaleString());
if (process.argv.includes('--見本')) {
  let n = 0;
  for (const k of Object.keys(Excelの答え)) {
    const e = Excelの答え[k], v = 今.答え[k];
    const 数 = (typeof e === 'number' && typeof v === 'number');
    const 合う = 数 ? Math.abs(e - v) <= Math.max(1e-9, Math.abs(e) * 1e-9) : String(e) === String(v);
    if (合う || n >= 12) continue;
    n++;
    const [sh, rc] = k.split('!');
    const [R, C] = rc.split(',').map(Number);
    const 式 = (sheets.find((x) => x.name === sh) || {}).grid?.[R]?.[C];
    console.log('   ' + k + ' 式=' + String(式).slice(0, 60) + ' ／ Excel=' + JSON.stringify(e) + ' ／ うち=' + JSON.stringify(v));
  }
}
console.log('  今の道具 … 合う ' + b.合.toLocaleString() + ' ／ 違う ' + b.差.toLocaleString() + ' ／ 計算できず ' + b.無.toLocaleString());
console.log('');
