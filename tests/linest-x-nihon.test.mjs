/* linest-x-nihon.test.mjs — ★LINEST の x が 2本以上の 時に ★静かに 違う 答え★を 出さない★
 *
 *  ★★何を 守るか（1つずつ 名指し）★★
 *    ①★x が 2本以上（重回帰）の 時、JS層が 数を 返さない★
 *      ⇒ 返すと ★誤りに ならず 違う 数が 出る＝お客さんは 気づけない★
 *      ⇒ 実測 … =LINEST(G1:G6,H1:I6)
 *                 実Excel ★0.7708333333333329★ ／ 直す前の うち ★7.390243902439025★
 *    ②★x が 1本（縦1列 か 横1行）の 時は 今まで どおり 答える★
 *      ⇒★「直した」と 言って ★出来て いた 物まで 止める★のを 防ぐ★
 *    ③★y が 2本以上の 時も 答えない★
 *
 *  ★★これは「直した」では ありません＝「断った」です★★
 *    実Excel は 値を 返します。うちは ★まだ 返せません★。
 *    ⇒★出来ない物を「出来ている顔」で 出さない★＝#NAME? に 落とす
 *    ⇒★正しく 計算する（表として 積む）のは 別の 直し★
 *
 *  ★★見て いない 範囲（★書かない 見張りは「全部 守った」と 読まれる★）★★
 *    ・★エンジン側は 見て いません★（LINEST は まだ 積んで いない＝全部 #NAME?）
 *    ・★答えの 中身が 実Excel と 合うかは この 試験では 見て いません★
 *      （それは `docs/measured/golden-linest-hyou-2026-09-09.tsv` と 突き合わせる 別の 道具）
 *    ・LOGEST / TREND / GROWTH は ★見て いません★（同じ 形の 穴が 在るかは ★未測定★）
 *
 *  使い方: node tests/linest-x-nihon.test.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..');
const 直に走った = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
const 自己試験 = 直に走った && process.argv.includes('--self-test');

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + (e && e.message)); } };

const require_ = createRequire(path.join(ROOT, 'package.json'));
const HFns = require_(path.join(ROOT, 'hyperformula.full.min.js'));
const EF = require_(path.join(ROOT, 'exally-formula.js'));
EF.registerExallyFunctions(HFns);
const hf = HFns.HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
const SID = hf.getSheetId(hf.addSheet('S'));
EF.initExallyFormula(hf);

/* ══ ★材料（★紙と 同じ 組★）★ ═══════════════════════════
   ★紙 `golden-linest-hyou-2026-09-09.tsv` の `#材料` と 同じに して 在る★
   ⇒ ずれたら 下の「紙と 同じか」で 赤に なる */
const 材料 = {
  A1: 100, A2: 120, A3: 140, A4: 160, A5: 180,   /* y（きれい） */
  B1: 1, B2: 2, B3: 3, B4: 4, B5: 5,             /* x 1本 */
  G1: 10, G2: 14, G3: 21, G4: 25, G5: 33, G6: 38, /* y（重回帰） */
  H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6,      /* x 1本目 */
  I1: 2, I2: 1, I3: 4, I4: 3, I5: 6, I6: 5,      /* x 2本目 */
  /* ★横 1行★の 組（N1:S1 ＝ y ／ N2:S2 ＝ x）
     ★1回目は 私が y と x を 交互に 並べて しまい、意味の 無い 数（−5.31）が 出て いた★
     ⇒ 実Excel で 測り直した … =LINEST(N1:S1,N2:S2) ＝ ★20.000000000000004★ */
  N1: 100, O1: 120, P1: 140, Q1: 160, R1: 180, S1: 200,
  N2: 1, O2: 2, P2: 3, Q2: 4, R2: 5, S2: 6,
};
function マスを解く(s) {
  const m = /^([A-Z]+)(\d+)$/.exec(s);
  if (!m) return null;
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { 行: Number(m[2]) - 1, 列: c - 1 };
}
function 敷く() {
  let 最大行 = 0, 最大列 = 0;
  const 置く = [];
  for (const k of Object.keys(材料)) {
    const rc = マスを解く(k);
    置く.push([rc, 材料[k]]);
    if (rc.行 > 最大行) 最大行 = rc.行;
    if (rc.列 > 最大列) 最大列 = rc.列;
  }
  const 板 = [];
  for (let r = 0; r <= 最大行 + 2; r++) 板.push(new Array(最大列 + 3).fill(null));
  for (const [rc, v] of 置く) 板[rc.行][rc.列] = v;
  hf.setSheetContent(SID, 板);
}
const JS層で押す = (式) => { 敷く(); return EF._jsComputeFormula(0, 式); };

console.log('\n[linest-x-nihon] ★LINEST の x が 2本以上の 時に 静かに 違う 答えを 出さない★');

T('★★x が 2本（縦に 2列）の 時 JS層は 答えない★★', () => {
  const r = JS層で押す('=LINEST(G1:G6,H1:I6)');
  if (r !== null && r !== undefined) {
    throw new Error('★数を 返した（' + r + '）★＝実Excel は 0.7708333333333329'
      + '\n      ⇒★誤りに ならず 違う 数が 出る＝お客さんは 気づけない★');
  }
  console.log('      … =LINEST(G1:G6,H1:I6) → ★答えない（#NAME? に 落ちる）★');
});

T('★x が 3本の 時も 答えない★', () => {
  const r = JS層で押す('=LINEST(G1:G6,G1:I6)');
  if (r !== null && r !== undefined) throw new Error('★数を 返した（' + r + '）★');
});

T('★y が 2本以上の 時も 答えない★', () => {
  const r = JS層で押す('=LINEST(G1:H6,I1:I6)');
  if (r !== null && r !== undefined) throw new Error('★数を 返した（' + r + '）★');
});

T('★★x が 1本（縦1列）の 時は 今まで どおり 答える（★出来て いた 物を 止めない★）★★', () => {
  const r = JS層で押す('=LINEST(A1:A5,B1:B5)');
  if (r === null || r === undefined) throw new Error('★答えなく なった＝出来て いた 物を 止めた★');
  const n = Number(r);
  if (!isFinite(n)) throw new Error('★数で 返って いない（' + r + '）★');
  /* ★実Excel 19.999999999999993★（golden-linest-hyou の 実測）★幅は 1e-9★ */
  if (Math.abs((n - 19.999999999999993) / 19.999999999999993) > 1e-9) {
    throw new Error('★実Excel と 違う（うち ' + n + ' ／ 実Excel 19.999999999999993）★');
  }
  console.log('      … =LINEST(A1:A5,B1:B5) → ' + n + '（実Excel 19.999999999999993）');
});

T('★★x が 1本（★横1行★）の 時も 答える（縦だけを 見て いない）★★', () => {
  const r = JS層で押す('=LINEST(N1:S1,N2:S2)');
  if (r === null || r === undefined) {
    throw new Error('★横1行を 断って いる★＝★1本なのに 表と 見なした★');
  }
  const n = Number(r);
  if (!isFinite(n)) throw new Error('★数で 返って いない（' + r + '）★');
  /* ★実Excel 20.000000000000004★（golden-linest-hyou の 実測・★私が 決めた 数では ない★） */
  if (Math.abs((n - 20.000000000000004) / 20.000000000000004) > 1e-9) {
    throw new Error('★実Excel と 違う（うち ' + n + ' ／ 実Excel 20.000000000000004）★');
  }
  console.log('      … =LINEST(N1:S1,N2:S2) → ' + n + '（実Excel 20.000000000000004・★横 1行も 1本★）');
});

T('★紙（実測）と 材料が 同じ（★試験の 中で 材料が ずれて いない★）★', () => {
  const p = path.join(ROOT, 'docs/measured/golden-linest-hyou-2026-09-09.tsv');
  if (!fs.existsSync(p)) throw new Error('★紙が 無い★ … ' + p);
  const 紙 = {};
  for (const l of fs.readFileSync(p, 'utf-8').split('\n')) {
    if (!l.startsWith('#材料')) continue;
    const c = l.split('\t');
    if (c.length >= 3) 紙[c[1].trim()] = Number(c[2]);
  }
  const 見る = ['A1', 'A5', 'B1', 'B5', 'G1', 'G6', 'H1', 'H6', 'I1', 'I6', 'N1', 'S1', 'N2', 'S2'];
  const 違う = 見る.filter((k) => 紙[k] !== 材料[k]);
  if (違う.length) {
    throw new Error('★紙と 材料が 違う … ' + 違う.map((k) => k + '（紙 ' + 紙[k] + ' ／ 試験 ' + 材料[k] + '）').join(' / ') + '★');
  }
  console.log('      … 紙と 同じ（' + 見る.length + 'マスを 名指しで 見た）');
});

/* ══ ★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★ ══ */
if (自己試験) {
  console.log('\n★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★');

  T('★★門（_一本の並びか）を 外したら 赤に なる★★', () => {
    const s = fs.readFileSync(path.join(ROOT, 'exally-formula.js'), 'utf-8');
    if (!/_一本の並びか\(mLi\[1\]\)/.test(s)) {
      throw new Error('★門が コードに 無い＝この 試験は 空振り★');
    }
    /* ★門を 外した 形を 作って 中で 動かす（★ファイルは 触らない★）★ */
    const 外した = s.replace('mLi&&_一本の並びか(mLi[1])&&_一本の並びか(mLi[2])', 'mLi');
    if (外した === s) throw new Error('★門の 字が 見つからない（探し方が 古い）★');
    console.log('      … 門の 字を 見つけた（外すと 通る 形に なる）');
  });

  T('★門は 縦1列・横1行を 通し、表を 断る（★形だけ 見て 決めて いる★）★', () => {
    const s = fs.readFileSync(path.join(ROOT, 'exally-formula.js'), 'utf-8');
    const m = /function _一本の並びか\([\s\S]*?\n\}/.exec(s);
    if (!m) throw new Error('★門の 中身が 見つからない★');
    const f = new Function('return (' + m[0].replace('function _一本の並びか', 'function') + ')')();
    const 表 = [['A1:A5', true, '縦1列'], ['A1:E1', true, '横1行'], ['A1:B5', false, '★表（2列）★'],
      ['A1:E2', false, '★表（2行）★'], ['A1', false, '★範囲で ない★'], ['', false, '★空★']];
    for (const [範囲, 期待, 札] of 表) {
      if (f(範囲) !== 期待) throw new Error('★' + 範囲 + '（' + 札 + '）… ' + f(範囲) + '（' + 期待 + ' のはず）★');
    }
    console.log('      … ' + 表.length + '通り 全部 期待どおり');
  });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
