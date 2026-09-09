/* ★XIRR の 紙を ★うちの 本番の 道★で 押して 突き合わせる★（2026-09-09・2件目）
 *
 *  ★正★ … `golden-xirr-sakaime-2026-09-09.tsv`（実Excel の 実測）
 *  ★押す 道★ … 本番と 同じ ①JS層 `_jsComputeFormula` → ②`convertFormula` → エンジン
 *
 *  ★材料は 紙から 読む★（★手で 写さない★＝2026-09-08/09 に 3回 写し間違えた）
 *  ★数だけで 済ませない★＝★出た 字を 並べて 出す★
 *
 *  使い方: node docs/measured/osu-linest-hyou.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const 紙 = path.join(ROOT, 'docs/measured/golden-xirr-sakaime-2026-09-09.tsv');
const 出す先 = path.join(ROOT, 'docs/measured/golden-xirr-sakaime-awase-2026-09-09.tsv');

const require_ = createRequire(path.join(ROOT, 'package.json'));
const HFns = require_(path.join(ROOT, 'hyperformula.full.min.js'));
const EF = require_(path.join(ROOT, 'exally-formula.js'));
EF.registerExallyFunctions(HFns);
const HF0 = HFns.HyperFormula;
const H = Object.assign(Object.create(HF0), HFns,
  { registerFunctionPlugin: HF0.registerFunctionPlugin.bind(HF0) });
/* ★★本番が 読む プラグインを ★全部★ つなぐ★★（2026-09-09 に 直した）
   ★1回目は extra / nokori / kane の 3本しか つないで いなかった★
   ⇒ 本番（book.html）は ★8本★ 読む。★yosoku を 落として いた★
   ⇒★本番に 在る 物が 無い 状態で 押して いた＝★嘘の 数字が 出る★
   ⇒ book.html の `<script src="lib/formula-*-plug.js">` と ★同じ 並び★に した
   ★ここに 無い 物が book.html に 増えたら 下の 見張りで 赤に なる★ */
const つなぐ本数 = { 期待: 8, 済: 0 };
for (const n of ['extra', 'nokori', 'kane']) {
  require_(path.join(ROOT, 'lib/formula-' + n + '-plug.js'))
    .つなぐ(H, require_(path.join(ROOT, 'lib/formula-' + n + '.js')));
  つなぐ本数.済++;
}
/* ★予測（TREND / GROWTH / LOGEST）★＝★これを 落として いた★ */
require_(path.join(ROOT, 'lib/formula-yosoku-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-yosoku.js')),
    () => ({ シート数: 1, 版: 'Exally', 台: 'win', OS: '', 左上: '$A$1' }));
つなぐ本数.済++;
/* ★網の 外へ 出る 物は ★出させない★（司さんの 決め）★ */
require_(path.join(ROOT, 'lib/formula-soto-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-soto.js')), {
    取る: async () => { throw new Error('外へ 出ません'); },
    聞く: async () => { throw new Error('AI に 聞きません'); },
    再計算: () => {},
  });
つなぐ本数.済++;
let XML部品 = null;
try {
  const { JSDOM } = require_('jsdom');
  const w = new JSDOM('').window;
  XML部品 = { DOMParser: w.DOMParser, XPathResult: w.XPathResult };
} catch (e) { XML部品 = null; }
require_(path.join(ROOT, 'lib/formula-filterxml-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-filterxml.js')), () => XML部品);
つなぐ本数.済++;
require_(path.join(ROOT, 'lib/formula-cell-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-cell.js')), null);
つなぐ本数.済++;
require_(path.join(ROOT, 'lib/formula-complex-plug.js'))
  .つなぐ(H, require_(path.join(ROOT, 'lib/formula-complex.js')));
つなぐ本数.済++;
/* ★★book.html が 読む 数と 合うか（★落としたら ここで 止まる★）★★ */
{
  const html = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf-8');
  const 本番 = [...html.matchAll(/lib\/(formula-[a-z]+)-plug\.js/g)].map((m) => m[1]);
  const 数 = new Set(本番).size;
  if (数 !== つなぐ本数.済) {
    console.error('★book.html は ' + 数 + '本 読むのに、ここでは ' + つなぐ本数.済 + '本しか つないで いない★');
    console.error('  本番 … ' + [...new Set(本番)].join(' '));
    process.exit(2);
  }
  console.log('★本番と 同じ ' + 数 + '本の プラグインを つないだ★');
}
/* ★★本番と 同じ 建て方に する（2026-09-09 に 直した）★★
   ★1回目は 既定の まま★でした。本番（book.html:1764）は こう 建てて います
     { licenseKey, useArrayArithmetic:true, ★smartRounding:false★, maxRows:1048576, maxColumns:18278 }
   ⇒★smartRounding が 既定（true）だと エンジンが 答えを 勝手に 丸める★
     803.6538461538445 が ★803.65384615★ に なって いた＝★桁が 落ちる★
   ⇒★本番に 無い 丸めを 測り台が 足して いた＝嘘の 数字が 出る★ */
const hf = HF0.buildEmpty({
  licenseKey: 'gpl-v3', useArrayArithmetic: true, smartRounding: false,
  maxRows: 1048576, maxColumns: 18278,
});
{ /* ★本番の 建て方と 食い違ったら 止める★ */
  const html = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf-8');
  const m = /buildEmpty\(\{([\s\S]{0,240}?)\}\)/.exec(html);
  if (!m) { console.error('★book.html の buildEmpty が 読めない★'); process.exit(2); }
  for (const 要る of ['useArrayArithmetic:true', 'smartRounding:false']) {
    const [k, v] = 要る.split(':');
    if (!new RegExp(k + '\s*:\s*' + v).test(m[1].replace(/\s+/g, ''))) {
      console.error('★本番の buildEmpty に ' + 要る + ' が 無い＝測り台の 建て方を 見直して ください★');
      process.exit(2);
    }
  }
}
const SID = hf.getSheetId(hf.addSheet('S'));
EF.initExallyFormula(hf);

/* ══ ★紙を 読む（材料も 答えも）★ ══════════════════════════ */
const 材料 = {};
const 答え = [];
for (const l of fs.readFileSync(紙, 'utf-8').split('\n')) {
  if (l.startsWith('#材料')) {
    const c = l.split('\t');
    if (c.length >= 3) {
      /* ★★数で ない 材料も 在る★★（`★字「あ」★` `★空★`）
         ⇒★Number() に すると NaN に なり ★別の 物を 敷いて しまう★
         ⇒ 印で 見分けて ★字は 字の まま／空は 空の まま★ 敷く */
      const 生 = c[2].trim();
      if (/^★字「(.*)」★$/.test(生)) 材料[c[1].trim()] = 生.replace(/^★字「|」★$/g, '');
      else if (生 === '★空★') 材料[c[1].trim()] = null;
      else 材料[c[1].trim()] = Number(生);
    }
    continue;
  }
  if (l.startsWith('#') || !l.trim()) continue;
  const c = l.split('\t');
  if (c.length < 6) continue;
  答え.push({ 組: c[0].trim(), 式: c[1].trim(), 正: c[2].trim(), 型: c[3].trim(), 場所: c[5].trim() });
}
if (!Object.keys(材料).length || !答え.length) {
  console.error('★紙から 読めなかった（材料 ' + Object.keys(材料).length + ' ／ 行 ' + 答え.length + '）★');
  process.exit(2);
}

/* ★マスの 名前を 行・列に★ */
function マスを解く(s) {
  const m = /^([A-Z]+)(\d+)$/.exec(s);
  if (!m) return null;
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { 行: Number(m[2]) - 1, 列: c - 1 };
}
let 最大行 = 0, 最大列 = 0;
const 置く = [];
for (const k of Object.keys(材料)) {
  const rc = マスを解く(k);
  if (!rc) continue;
  置く.push([rc, 材料[k]]);
  if (rc.行 > 最大行) 最大行 = rc.行;
  if (rc.列 > 最大列) 最大列 = rc.列;
}
const 板 = [];
for (let r = 0; r <= 最大行 + 3; r++) 板.push(new Array(最大列 + 4).fill(null));
for (const [rc, v] of 置く) 板[rc.行][rc.列] = v;

/* ══ ★本番と 同じ 道で 押す★ ══════════════════════════════ */
const 式の行 = 最大行 + 2;   /* ★材料の 下★に 置く（材料を 潰さない） */
function 押す(式) {
  /* ①JS層 … 本番は これを 先に 見る */
  hf.setSheetContent(SID, 板.map((r) => r.slice()));
  try {
    const r = EF._jsComputeFormula(0, 式);
    if (r !== null && r !== undefined) return { 道: 'JS層', 値: String(r) };
  } catch (e) { return { 道: 'JS層', 値: '★投げた（' + (e && e.message) + '）★' }; }
  /* ②エンジン */
  let 後;
  try { 後 = EF.convertFormula(式); } catch (e) { return { 道: 'エンジン', 値: '★変換で 投げた★' }; }
  try {
    const 盤 = 板.map((r) => r.slice());
    while (盤.length <= 式の行) 盤.push(new Array(最大列 + 4).fill(null));
    盤[式の行][0] = 後;
    hf.setSheetContent(SID, 盤);
    const v = hf.getCellValue({ sheet: SID, row: 式の行, col: 0 });
    if (v && v.type) return { 道: 'エンジン', 値: '#' + v.type };
    if (v === null || v === undefined) return { 道: 'エンジン', 値: '(空)' };
    return { 道: 'エンジン', 値: String(v) };
  } catch (e) { return { 道: 'エンジン', 値: '★投げた（' + (e && e.message) + '）★' }; }
}

/* ★合うか（★幅は 場所ごとに 変える＝1つの 数で 決めない★）★ */
/* ★★XIRR の 幅は 1e-6★★（★測ってから 決めた 数★）
   実Excel の XIRR は ★見当（第3引数）を 変えるだけで 自分の 答えが 動きます★
     1万・1年ごと・3回 … 0.06023252382874489 〜 0.06023252964019775 ＝★相対 9.65e-8★
   ⇒★実Excel 同士でも 落ちる 幅で 比べては いけない★
   ⇒ 実測の ばらつき 最大の 10倍で ★1e-6★
   ★この 幅で 見逃す 悪さ★ … 相対 1e-6 より 小さい 狂いは この 紙では 捕まりません */
const 幅 = 1e-6;
/* ★★誤りの 名前の 書き方を 揃える（2026-09-09 に 足した）★★
   実Excel は `#N/A` / `#DIV/0!` / `#NUM!` と 書き、エンジンは `#NA` / `#DIV_BY_ZERO` / `#NUM` と 返す。
   ⇒★同じ 誤りなのに「違う」と 数えて いました★（★字が 違うだけ★）
   ⇒★名前を 揃えてから 比べる★
   ★注意★ これは ★同じ 誤りを 同じと 見る★だけです。
          ★違う 誤り（#REF! と #NUM! など）は そのまま 違うと 数えます★ */
const 誤りの名 = (s) => {
  const t = String(s).trim().toUpperCase().replace(/[#!]/g, '').replace(/[\/_]/g, '');
  const 表 = { NA: 'NA', DIVBY0: 'DIV0', DIVBYZERO: 'DIV0', DIV0: 'DIV0', NUM: 'NUM',
    VALUE: 'VALUE', REF: 'REF', NAME: 'NAME', NULL: 'NULL', SPILL: 'SPILL',
    CALC: 'CALC', CYCLE: 'CYCLE', ERROR: 'ERROR' };
  return 表[t] || null;
};
function 合うか(う, 正) {
  if (う === 正) return true;
  const 誤り1 = 誤りの名(う), 誤り2 = 誤りの名(正);
  if (誤り1 && 誤り2) return 誤り1 === 誤り2;   /* ★どちらも 誤り＝名前で 比べる★ */
  if (誤り1 || 誤り2) return false;             /* ★片方だけ 誤り＝違う★ */
  const a = Number(う), b = Number(正);
  if (!isFinite(a) || !isFinite(b)) return false;
  if (b === 0) return a === 0;
  return Math.abs((a - b) / b) <= 幅;
}

const 行 = [];
const 言う = (s) => { 行.push(s); console.log(s); };
言う('# ★XIRR の 紙を うちの 本番の 道で 押して 突き合わせた★（2026-09-09・2件目）');
言う('#');
言う('# ★正★ golden-xirr-sakaime-2026-09-09.tsv（実Excel の 実測）');
言う('# ★押す 道★ 本番と 同じ ①JS層 → ②convertFormula → エンジン');
言う('# ★材料は 紙から 読んだ★（' + Object.keys(材料).length + 'マス）★手で 写して いません★');
言う('# ★合う 幅★ 相対 ' + 幅 + '（★字が そのまま 同じ 物は そのまま 合う★）');
言う('#');
言う('# 組\t式\t実Excel\tうち\t道\t判じ\t何の 場所');

const 数 = { 合った: 0, 違う: 0, NAME: 0, 誤りが違う: 0 };
const 例 = [];
for (const x of 答え) {
  const r = 押す(x.式);
  let 判;
  if (r.値 === '#NAME') { 判 = '★★#NAME?＝在るように 見えて 実は 無い★★'; 数.NAME++; }
  else if (合うか(r.値, x.正)) { 判 = '合った'; 数.合った++; }
  else if (/^#/.test(x.正) || /^#/.test(r.値)) { 判 = '★誤りの 出方が 違う★'; 数.誤りが違う++; }
  else { 判 = '★★違う★★'; 数.違う++; }
  if (判 !== '合った' && 例.length < 14) 例.push({ 式: x.式, 正: x.正, う: r.値, 場所: x.場所 });
  行.push(x.組 + '\t' + x.式 + '\t' + x.正 + '\t' + r.値 + '\t' + r.道 + '\t' + 判 + '\t' + x.場所);
}

言う('#');
言う('# ★★締め★★ 全 ' + 答え.length + '本');
言う('#   合った ……………………………………… ' + 数.合った);
言う('#   ★#NAME?（在るように 見えて 実は 無い）★ … ' + 数.NAME);
言う('#   ★値が 違う★ ………………………………… ' + 数.違う);
言う('#   ★誤りの 出方が 違う★ ……………………… ' + 数.誤りが違う);
言う('#   ―― 足すと ' + (数.合った + 数.NAME + 数.違う + 数.誤りが違う) + ' ／ 全 ' + 答え.length + '本');

fs.writeFileSync(出す先, 行.join('\n') + '\n');
console.log('\n★合わない 物の 実物（★数だけで 済ませない＝出た 字を 並べる★）★');
for (const e of 例) {
  console.log('  ' + e.式.padEnd(46) + ' 実Excel=' + String(e.正).padEnd(22) + ' うち=' + String(e.う).padEnd(22) + ' ' + e.場所);
}
console.log('\n★書いた … ' + 出す先 + '★');
if (数.合った + 数.NAME + 数.違う + 数.誤りが違う !== 答え.length) {
  console.error('★数が 合わない＝数え落として いる★'); process.exit(3);
}
