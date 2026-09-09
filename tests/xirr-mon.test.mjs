/* xirr-mon.test.mjs — ★XIRR が 実Excel と 同じ 条件で 同じ 誤りを 返すか★（2026-09-09）
 *
 *  ★★何が 起きて いたか★★
 *    実Excel が ★#NUM!★ を 返す 組で、うちは ★数を 返して いました★
 *      =XIRR(全部プラス)  … 実Excel #NUM! ／ うち ★375686054239746.3★
 *      =XIRR(日付が逆順)  … 実Excel #NUM! ／ うち ★-0.5002981524324954★
 *    ⇒★誤りに ならず 数が 出る＝お客さんは 気づけない★（★お金の 利回り★）
 *    ⇒ 375686054239746.3 は ★桁が おかしいのに「変」と 思えない 顔★を して います
 *
 *  ★★これは「機能を 減らす」では ありません＝実Excel と 同じに する★★
 *    ★断らない 所は 断りません★（空の マス・同じ 日付・0 を 含む は ★値を 返す★）
 *
 *  ★★どこから 断るかは ★私が 決めて いません★★★
 *    実Excel に 打たせました … `docs/measured/golden-xirr-sakaime-2026-09-09.tsv`（77本）
 *
 *  ★★何を 守るか（1つずつ 名指し）★★
 *    ①★断る 条件★ … 符号が 片方だけ／日付が 昇順でない／日付が 負／
 *                    範囲の 大きさが 違う／1件だけ／字が 混ざる／見当が 0 より 小さい
 *    ②★断らない 条件★ … 空の マス／同じ 日付／0 を 含む（★出来る 物を 止めない★）
 *    ③★見当で 誤りが 変わらない★（★入口の 門であって 繰り返し 計算の 失敗では ない★）
 *    ④★見当が 大きくても 落ち着く★（★前は NaN に なって いた★）
 *
 *  ★★見て いない 範囲（★書かない 見張りは「全部 守った」と 読まれる★）★★
 *    ・★IRR / MIRR / NPV / XNPV は 見て いません★（同じ 形の 穴が 在るかは ★未測定★）
 *    ・★答えの 細かい 桁は 見て いません★（★幅 1e-6★＝実Excel 自身が 見当で 9.65e-8 ばらつく）
 *    ・エンジン側は 見て いません（XIRR は JS層が 受けます）
 *
 *  使い方: node tests/xirr-mon.test.mjs [--self-test]
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
const hf = HFns.HyperFormula.buildEmpty({
  licenseKey: 'gpl-v3', useArrayArithmetic: true, smartRounding: false,
});
const SID = hf.getSheetId(hf.addSheet('S'));
EF.initExallyFormula(hf);

/* ★A列＝お金 ／ B列＝日付★（★組ごとに 敷き直す★） */
function 押す(値ら, 日ら, 見当) {
  const 板 = [];
  const n = Math.max(値ら.length, 日ら.length);
  for (let i = 0; i < n + 2; i++) 板.push([null, null, null]);
  for (let i = 0; i < n; i++) {
    板[i][0] = i < 値ら.length ? 値ら[i] : null;
    板[i][1] = i < 日ら.length ? 日ら[i] : null;
  }
  hf.setSheetContent(SID, 板);
  const 式 = '=XIRR(A1:A' + 値ら.length + ',B1:B' + 日ら.length
    + (見当 === undefined ? '' : ',' + 見当) + ')';
  return { 式, 答: EF._jsComputeFormula(0, 式) };
}
const 近い = (う, 正) => {
  const a = Number(う), b = Number(正);
  if (!isFinite(a) || !isFinite(b)) return false;
  return Math.abs((a - b) / b) <= 1e-6;   /* ★実測で 決めた 幅★ */
};

console.log('\n[xirr-mon] ★XIRR が 実Excel と 同じ 条件で 同じ 誤りを 返すか★');

T('★★断る 条件（実Excel の 実測どおり）★★', () => {
  const 組 = [
    [[100, 200, 300], [45292, 45383, 45474], undefined, '#NUM!', '★全部 プラス★'],
    [[-100, -200, -300], [45292, 45383, 45474], undefined, '#NUM!', '★全部 マイナス★'],
    [[0, 0, 0], [45292, 45383, 45474], undefined, '#NUM!', '★全部 0★'],
    [[-1000, 600, 700], [45474, 45383, 45292], undefined, '#NUM!', '★日付が 逆順★'],
    [[-1000, 600, 700], [45383, 45292, 45474], undefined, '#NUM!', '★日付が バラバラ★'],
    [[-1000, 600, 700], [-10, 45383, 45474], undefined, '#NUM!', '★日付が 負★'],
    [[-1000, 600, 700], [45292, 45383], undefined, '#NUM!', '★範囲の 大きさが 違う★'],
    [[-1000], [45292], undefined, '#N/A', '★1件だけ（#NUM! では ない）★'],
    [[-1000, 'あ', 1100], [45292, 45383, 45474], undefined, '#VALUE!', '★字が 混ざる★'],
    [[-1000, 600, 700], [45292, 45383, 45474], -0.01, '#NUM!', '★見当が −0.01★'],
    [[-1000, 600, 700], [45292, 45383, 45474], -0.9, '#NUM!', '★見当が −0.9★'],
  ];
  for (const [v, d, g, 正, 札] of 組) {
    const r = 押す(v, d, g);
    if (r.答 !== 正) throw new Error('★' + 札 + '（' + r.式 + '）… うち ' + r.答 + ' ／ 実Excel ' + 正 + '★');
  }
  console.log('      … ' + 組.length + '通り とも 実Excel と 同じ 誤り');
});

T('★★断らない 条件（★出来る 物を 止めない★）★★', () => {
  const 組 = [
    [[-1000, 600, 700], [45292, 45383, 45474], undefined, 1.00119332075119, '普通'],
    [[-1000, 1100], [45292, 45657], undefined, 0.09999999403953552, '★一番 短い（2件）★'],
    [[-1000, 0, 1100], [45292, 45383, 45474], undefined, 0.21063382029533387, '★0 を 含む★'],
    [[-1000, null, 1100], [45292, 45383, 45474], undefined, 0.21063382029533387, '★空の マス（＝0 と 見る）★'],
    [[-1000, 600, 700], [45292, 45292, 45474], undefined, 2.071931099891663, '★同じ 日付が 2つ★'],
    [[-1000, 600, 700], [45292, 45383, 45474], 0, 1.0011933300781244, '★見当が 0（境目・通る）★'],
  ];
  for (const [v, d, g, 正, 札] of 組) {
    const r = 押す(v, d, g);
    if (typeof r.答 === 'string' && r.答[0] === '#') {
      throw new Error('★' + 札 + '（' + r.式 + '）を 断って いる（' + r.答 + '）★'
        + '\n      ⇒★実Excel は ' + 正 + ' を 返します＝★出来る 物を 止めた★');
    }
    if (!近い(r.答, 正)) throw new Error('★' + 札 + '… うち ' + r.答 + ' ／ 実Excel ' + 正 + '★');
  }
  console.log('      … ' + 組.length + '通り とも 値を 返し、実Excel と 合う');
});

T('★★見当を 変えても 誤りは 変わらない（入口の 門で あって 計算の 失敗では ない）★★', () => {
  for (const g of [undefined, 0.1, 0, 10, 1000000]) {
    const r = 押す([100, 200, 300], [45292, 45383, 45474], g);
    if (r.答 !== '#NUM!') throw new Error('★見当 ' + g + ' で ' + r.答 + '★（#NUM! のはず）');
  }
  console.log('      … 全部プラスは 見当 5通り とも #NUM!');
});

T('★★見当が 大きくても 落ち着く（前は NaN に なって いた）★★', () => {
  const 組 = [
    [10, 1.0011933278292418], [100, 1.0011933161877096],
    [10000, 1.0011933136411244], [1000000, 1.0011933255782424],
  ];
  for (const [g, 正] of 組) {
    const r = 押す([-1000, 600, 700], [45292, 45383, 45474], g);
    if (String(r.答) === 'NaN') throw new Error('★見当 ' + g + ' で NaN★＝★発散して いる★');
    if (!近い(r.答, 正)) throw new Error('★見当 ' + g + ' … うち ' + r.答 + ' ／ 実Excel ' + 正 + '★');
  }
  console.log('      … 見当 10／100／10000／1000000 とも 落ち着く');
});

T('★門と 計算が ★同じ 組★を 見て いる（口裏が 合って いる）★', () => {
  /* ★空の マスで 踏んだ★ … 門は 通したのに 計算側が 空を 落として 日付と ずれた */
  const 空あり = 押す([-1000, null, 1100], [45292, 45383, 45474], undefined);
  const ゼロあり = 押す([-1000, 0, 1100], [45292, 45383, 45474], undefined);
  if (String(空あり.答) !== String(ゼロあり.答)) {
    throw new Error('★空の マスと 0 で 答えが 違う★（' + 空あり.答 + ' ／ ' + ゼロあり.答 + '）'
      + '\n      ⇒★門は 空を 0 と 見るのに 計算が 落として いる＝口裏が 合って いない★');
  }
  console.log('      … 空の マスと 0 が 同じ 答え（' + 空あり.答 + '）');
});

T('★紙（実測）と 試験の 材料が 同じ★', () => {
  const p = path.join(ROOT, 'docs/measured/golden-xirr-sakaime-2026-09-09.tsv');
  if (!fs.existsSync(p)) throw new Error('★紙が 無い★ … ' + p);
  const 紙 = {};
  for (const l of fs.readFileSync(p, 'utf-8').split('\n')) {
    if (!l.startsWith('#材料')) continue;
    const c = l.split('\t');
    if (c.length >= 3) 紙[c[1].trim()] = c[2].trim();
  }
  /* ★A/B＝全部プラス ／ E/F＝普通 ／ M/N＝日付が 逆順★ */
  const 見る = [['A1', '100'], ['A3', '300'], ['E1', '-1000'], ['E3', '700'],
    ['M1', '-1000'], ['N1', '45474'], ['N3', '45292']];
  const 違う = 見る.filter(([k, v]) => 紙[k] !== v);
  if (違う.length) {
    throw new Error('★紙と 違う … ' + 違う.map(([k, v]) => k + '（紙 ' + 紙[k] + ' ／ 試験 ' + v + '）').join(' / ') + '★');
  }
  console.log('      … 紙と 同じ（' + 見る.length + 'マスを 名指しで 見た）');
});

/* ══ ★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★ ══ */
if (自己試験) {
  console.log('\n★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★');

  T('★★門が コードに 在る（空振りして いない）★★', () => {
    const s = fs.readFileSync(path.join(ROOT, 'exally-formula.js'), 'utf-8');
    if (!/function _xirrの門/.test(s)) throw new Error('★_xirrの門 が 無い★');
    if (!/function _xirrの組/.test(s)) throw new Error('★_xirrの組 が 無い★＝口裏を 合わせる 所が 無い');
    if (!/_xirrの門\(生値,生日,見当\)/.test(s)) throw new Error('★門を 呼んで いない★');
    console.log('      … 門・組・呼び出し の 3つとも 在る');
  });

  T('★★門を 外したら 数が 出て しまう（＝門が 効いて いる 証拠）★★', () => {
    /* ★門を 通さずに 直に 計算したら どうなるか★を 見る */
    const 直 = EF._jsXirr([100, 200, 300], [45292, 45383, 45474]);
    if (String(直) === 'NaN') { console.log('      … 門なしでは NaN（どちらにせよ ★値では ない★）'); return; }
    if (typeof 直 === 'string' && 直[0] === '#') throw new Error('★計算側が 断って いる＝門の 手柄では ない★');
    console.log('      … 門なしでは ' + 直 + ' が 出る（★実Excel は #NUM!★）');
  });

  T('★見当の 境目が 0 だと 書いて 在る（★−1 では ない★）★', () => {
    const s = fs.readFileSync(path.join(ROOT, 'exally-formula.js'), 'utf-8');
    if (/見当<=-1/.test(s)) throw new Error('★−1 の ままに なって いる★＝実測は −0.01 でも #NUM!');
    if (!/見当<0/.test(s)) throw new Error('★見当の 境目が 0 に なって いない★');
    if (!/刻んで 打ちました/.test(s)) throw new Error('★刻んで 測った 断りが 消えた★');
    console.log('      … 境目は 0（刻んで 測った 断りも 残って いる）');
  });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
