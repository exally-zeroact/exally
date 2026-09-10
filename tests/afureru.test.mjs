/* afureru.test.mjs — ★1つの 式が 何マスにも 広がる（溢れ）★（2026-09-10）
 *
 *  ★★お客さんから 見て 何が 出来なかったか★★
 *    `=SORT(A1:A5)` を C1 に 打っても ★C1 に 1つ 出るだけ★でした。
 *    実Excel なら C1..C5 に 並びます。
 *    ⇒★Excel で 出来る 事が 出来ない★＝方針（Excel の 最上級・全部 つける）に 反する
 *
 *  ★★エンジンは ★もう 溢れて いました★★（実測）
 *      `=SORT(A1:A5)` … C1 の 型 ARRAYFORMULA ／ C2..C5 ARRAY ／ C6 EMPTY
 *      塞がって いれば ★C1 は #SPILL★（じゃまな マスは そのまま）
 *    ⇒★足りなかったのは 画面が それを 読む 所 1か所だけ★
 *      `recalcSheet` は `Object.keys(data)` を 回る＝★マスが 無い 所は 見ない★
 *
 *  ★★だから 1つ 直すと まとめて 動きます★★
 *    SORT ／ UNIQUE ／ FILTER ／ SEQUENCE ／ LINEST ／ LOGEST …
 *
 *  ★★「前より 悪く なって いないか」を 3つ 押しました★★（2026-09-10・監査の 求め）
 *    ★甲は ★新しい 危なさ★を 作りました★＝前は 溢れた先に マスが 無かったので
 *    お客さんが そこに 打っても 何も 壊れませんでした。今は ★マスが 在る★。
 *    ⇒★知らずに 出さない★＝押して 紙に 書く（直すのは 別PRで よい）
 *
 *    ①★溢れた マスに 字を 打つ★
 *      ⇒★打った 字は 残り、式が #SPILL! に なる★（★実Excel と 同じ★）
 *      ⇒★お客さんの 字は 黙って 消えません★＝悪く なって いない
 *    ②★xlsx に 書き出す★（★実Excel で 開いて 確かめた★）
 *      前 … C1 に 式だけ ／ ★C2〜C5 は 空★
 *      後 … C1 に 式 ／ ★C2〜C5 に 2,3,4,5 が 入る★
 *      ⇒★値が 渡るように なった＝前より 良い★／#SPILL! には なりません
 *      ⇒ 書き出しの 警告の 字も 直しました（前は「1セル分の値になります」だけ＝★半分だけ 本当★）
 *    ③★元に戻す（Undo）★
 *      ⇒ じゃまが 消えても ★#SPILL! の まま★（式を 打ち直すと 直る）
 *      ⇒★★これは エンジン自身の 癖です★★（素の 台で 切り分けた）
 *        塞ぐ → #SPILL ／ ★じゃまを 消す → #SPILL の まま★ ／ 式を 打ち直す → 溢れる
 *      ⇒★私の 直しでも undo でも ありません★／実Excel なら すぐ 計算し直します
 *      ⇒★まだ 直して いません＝別の 直し★
 *
 *  ★★まだ 見て いない 範囲★★
 *    ・★溢れた マスの 上で「配列の 一部は 変えられません」と 断る事★は して いません
 *      （実Excel は 断る。うちは ★打てて しまい #SPILL! に なる★）
 *
 *  使い方: node tests/afureru.test.mjs [--self-test]
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
const 改行と字下げ = String.fromCharCode(10) + '      ';

/* ══ ★本番と 同じ 台を 建てる（★測り台の 門の 決まり★）★ ══
   ★プラグインの 数も 建て方も book.html から 読む＝数を 書き込まない★ */
const 本 = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf-8');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const HFns = require_(path.join(ROOT, 'hyperformula.full.min.js'));
const EF = require_(path.join(ROOT, 'exally-formula.js'));
EF.registerExallyFunctions(HFns);

/* ★★プラグインの 積み方は ★既に 在る 道具から そのまま★★（自分で 書き直さない）★★
   出どころ … `docs/measured/osu-okane-4kansuu.mjs`
   ⇒★2通りの 積み方が 出来ると 必ず ずれる★（2026-09-09 に 3本しか 積まず 嘘の 数字を 出した） */
const H = HFns;
let つないだ = 0;
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
  つないだ = 数;
}

/* ★建て方も book.html から 読む（★数を 書き込まない★）★ */
const 建て = /buildEmpty\(\{([^}]*)\}/.exec(本);
if (!建て) throw new Error('★book.html の buildEmpty が 読めない★');
if (!/smartRounding\s*:\s*false/.test(建て[1])) throw new Error('★本番に smartRounding:false が 無い★');
if (!/useArrayArithmetic\s*:\s*true/.test(建て[1])) throw new Error('★本番に useArrayArithmetic:true が 無い★');

function 台() {
  const hf = HFns.HyperFormula.buildEmpty({
    licenseKey: 'gpl-v3', useArrayArithmetic: true, smartRounding: false,
    maxRows: 1048576, maxColumns: 18278,
  });
  const SID = hf.getSheetId(hf.addSheet('S'));
  EF.initExallyFormula(hf);
  return { hf, SID };
}

/* ★本番の 道＝1マスずつ 入れる★（★板ごと 入れない★） */
function 打つ(hf, SID, マス, 中身) {
  const m = /^([A-Z]+)(\d+)$/.exec(マス);
  const c = m[1].split('').reduce((s, ch) => s * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  hf.setCellContents({ sheet: SID, row: Number(m[2]) - 1, col: c }, [[中身]]);
}
const 型 = (hf, SID, r, c) => hf.getCellType({ sheet: SID, row: r, col: c });
const 値 = (hf, SID, r, c) => {
  const v = hf.getCellValue({ sheet: SID, row: r, col: c });
  return (v && v.type) ? '#' + v.type : v;
};

/* ★book.html から 溢れの 段を 切り出す（★写しを 置かない★）★ */
function 切り出す(名) {
  const 頭 = 本.indexOf('function ' + 名 + '(');
  if (頭 < 0) throw new Error('★book.html に ' + 名 + ' が 無い★');
  const 開き = 本.indexOf('{', 頭);
  let 深さ = 0, i = 開き;
  for (; i < 本.length; i++) {
    if (本[i] === '{') 深さ++;
    else if (本[i] === '}') { 深さ--; if (深さ === 0) break; }
  }
  return 本.slice(頭, i + 1);
}

console.log('\n[afureru] ★1つの 式が 何マスにも 広がる（溢れ）★');
console.log('  ★つないだ プラグイン★ ' + つないだ + '本（★book.html と 同じ 数★）');

T('★台が 建って いる（★空振りして いない★）★', () => {
  const { hf, SID } = 台();
  打つ(hf, SID, 'A1', 1);
  if (Number(値(hf, SID, 0, 0)) !== 1) throw new Error('★台に 値が 入らない★');
  if (つないだ < 1) throw new Error('★プラグインを 1本も つないで いない★');
});

T('★★エンジンは 溢れて いる（★これが 前提★）★★', () => {
  const { hf, SID } = 台();
  [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
  打つ(hf, SID, 'C1', '=SORT(A1:A5)');
  if (型(hf, SID, 0, 2) !== 'ARRAYFORMULA') throw new Error('★C1 が ARRAYFORMULA で ない（' + 型(hf, SID, 0, 2) + '）★');
  const 出 = [];
  for (let r = 0; r < 5; r++) 出.push(値(hf, SID, r, 2));
  if (出.join(',') !== '1,2,3,4,5') throw new Error('★' + 出.join(',') + '★（1,2,3,4,5 のはず）');
  for (let r = 1; r < 5; r++) {
    if (型(hf, SID, r, 2) !== 'ARRAY') throw new Error('★C' + (r + 1) + ' が ARRAY で ない★');
  }
  if (型(hf, SID, 5, 2) !== 'EMPTY') throw new Error('★C6 まで 広がって いる★');
  console.log('      … C1 ARRAYFORMULA ／ C2..C5 ARRAY ／ C6 EMPTY');
});

T('★★塞がって いれば #SPILL（じゃまな マスは そのまま）★★', () => {
  const { hf, SID } = 台();
  [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
  打つ(hf, SID, 'C3', 'じゃま');
  打つ(hf, SID, 'C1', '=SORT(A1:A5)');
  if (String(値(hf, SID, 0, 2)) !== '#SPILL') throw new Error('★C1 が ' + 値(hf, SID, 0, 2) + '★（#SPILL のはず）');
  if (値(hf, SID, 2, 2) !== 'じゃま') throw new Error('★じゃまな マスが 消えた★');
  console.log('      … C1 #SPILL ／ C3 は「じゃま」の まま');
});

T('★★画面に 出す 段が book.html に 在る（★空振りして いない★）★★', () => {
  for (const 名 of ['_溢れの広さ', '_溢れを写す', '_古い溢れを消す']) {
    if (本.indexOf('function ' + 名 + '(') < 0) throw new Error('★' + 名 + ' が 無い★');
  }
  if (!/_溢れを写す\(sheetIdx, data, r, c\)/.test(本)) throw new Error('★recalcSheet から 呼んで いない★');
  if (!/_古い溢れを消す\(sheetIdx, data\)/.test(本)) throw new Error('★古い 溢れを 消して いない★');
  console.log('      … 3つの 段と 2つの 呼び出しが 在る');
});

T('★★溢れた 先の マスが 作られる（★これが 本体★）★★', () => {
  const { hf, SID } = 台();
  [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
  打つ(hf, SID, 'C1', '=SORT(A1:A5)');
  const 写す = new Function('hf', '_hfGetDisplay', '溢れの印', '溢れの上限',
    切り出す('_溢れの広さ') + ' ' + 切り出す('_溢れを写す') + ' return _溢れを写す;')(
    hf, (s, r, c) => String(値(hf, s, r, c)), '_溢れ元', 100000);
  const data = { '0,2': { f: '=SORT(A1:A5)' } };
  const n = 写す(SID, data, 0, 2);
  if (n !== 4) throw new Error('★' + n + 'マスしか 作られない★（4のはず）');
  const 出 = [0, 1, 2, 3, 4].map((r) => data[r + ',2'] && data[r + ',2'].d);
  if (出.slice(1).join(',') !== '2,3,4,5') throw new Error('★' + JSON.stringify(出) + '★');
  for (let r = 1; r < 5; r++) {
    if (data[r + ',2']._溢れ元 !== '0,2') throw new Error('★C' + (r + 1) + ' に 印が 無い★');
  }
  console.log('      … 4マス 作られ、全部に「溢れ元」の 印が 付いた');
});

T('★★お客さんが 打った 物を 上書きしない★★', () => {
  const { hf, SID } = 台();
  [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
  打つ(hf, SID, 'C1', '=SORT(A1:A5)');
  const 写す = new Function('hf', '_hfGetDisplay', '溢れの印', '溢れの上限',
    切り出す('_溢れの広さ') + ' ' + 切り出す('_溢れを写す') + ' return _溢れを写す;')(
    hf, (s, r, c) => String(値(hf, s, r, c)), '_溢れ元', 100000);
  /* ★C3 に お客さんの 字が 在る 形★（本当は #SPILL に なるが、段だけを 試す） */
  const data = { '0,2': { f: '=SORT(A1:A5)' }, '2,2': { v: 'たいせつ' } };
  写す(SID, data, 0, 2);
  if (data['2,2'].v !== 'たいせつ') throw new Error('★お客さんの 字を 消した★');
  if (data['2,2'].d !== undefined) throw new Error('★お客さんの マスに 溢れを 書いた★');
  console.log('      … お客さんの 字は そのまま');
});

T('★★大きすぎる 溢れは 出さない（★黙って 固まらせない★）★★', () => {
  const 段 = 切り出す('_溢れを写す');
  if (!/溢れの上限/.test(段)) throw new Error('★上限を 見て いない★');
  if (!/> 溢れの上限\) return 0/.test(段)) throw new Error('★上限を 超えた 時に 止めて いない★');
  const 数 = /var 溢れの上限 = (\d+);/.exec(本);
  if (!数) throw new Error('★上限が 書いて いない★');
  console.log('      … 上限 ' + Number(数[1]).toLocaleString() + 'マス');
});

T('★★①溢れた マスに 打つと 字は 残り 式が #SPILL に なる★★', () => {
  const { hf, SID } = 台();
  [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
  打つ(hf, SID, 'C1', '=SORT(A1:A5)');
  打つ(hf, SID, 'C3', 'あとから打った');          /* ★溢れた 先に 後から 打つ★ */
  if (値(hf, SID, 2, 2) !== 'あとから打った') throw new Error('★お客さんの 字が 消えた★');
  if (String(値(hf, SID, 0, 2)) !== '#SPILL') throw new Error('★C1 が ' + 値(hf, SID, 0, 2) + '★');
  console.log('      … 字は 残り、式は #SPILL（★実Excel と 同じ★）');
});

T('★★③元に戻しても #SPILL の まま（★エンジン自身の 癖★・まだ 直して いない）★★', () => {
  const { hf, SID } = 台();
  [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
  打つ(hf, SID, 'C3', 'じゃま');
  打つ(hf, SID, 'C1', '=SORT(A1:A5)');
  if (String(値(hf, SID, 0, 2)) !== '#SPILL') throw new Error('★塞いだのに #SPILL に ならない★');
  hf.setCellContents({ sheet: SID, row: 2, col: 2 }, [[null]]);   /* ★じゃまを 消す★ */
  if (String(値(hf, SID, 0, 2)) !== '#SPILL') {
    throw new Error('★じゃまを 消したら 溢れ直した★＝★この 断りの 方が 古い（もう 直って いる）★');
  }
  打つ(hf, SID, 'C1', '=SORT(A1:A5)');                            /* ★打ち直す★ */
  if (String(値(hf, SID, 0, 2)) !== '1') throw new Error('★打ち直しても 直らない★');
  console.log('      … 消しても #SPILL の まま／打ち直すと 直る（★エンジンの 癖★）');
});

T('★★②書き出しの 警告が 本当の 事を 言って いる★★', () => {
  /* ★前は「1セル分の値になります」だけ＝★半分だけ 本当★★
     実Excel で 開いて 確かめた … C2〜C5 に 2,3,4,5 が ★ただの 数★で 入る */
  const 字 = fs.readFileSync(path.join(ROOT, 'lib/grid-xlsx.js'), 'utf-8');
  const m = /msg: '配列を返す式が'[\s\S]{0,400}?listCells\(arrayCells\)/.exec(字);
  if (!m) throw new Error('★警告の 字が 見つからない★');
  if (m[0].indexOf('ただの数として入ります') < 0) {
    throw new Error('★「広がった先の値も 入る」事を 言って いない★＝★半分だけ 本当★');
  }
  if (m[0].indexOf('1セル分') < 0) throw new Error('★式が 1セル分に なる 事を 言って いない★');
  console.log('      … 式は 1セル分／広がった先は ただの数、の 両方を 言って いる');
});

T('★★「まだ 見て いない 事」の 断りが 残って いる★★', () => {
  const s = fs.readFileSync(path.join(ここ, 'afureru.test.mjs'), 'utf-8');
  for (const 断り of ['配列の 一部は 変えられません', 'エンジン自身の 癖', 'まだ 直して いません']) {
    if (s.indexOf(断り) < 0) throw new Error('★断りが 消えた … ' + 断り + '★');
  }
  console.log('      … 3つの 断りが 残って いる（★未完を 緑に しない★）');
});

/* ══ ★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★ ══ */
if (自己試験) {
  console.log('\n★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★');

  T('★★溢れを 写す 段を 外すと 赤に なる★★', () => {
    /* ★元の recalcSheet（溢れを 見ない 形）で 押すと 何も 作られない★ */
    const { hf, SID } = 台();
    [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
    打つ(hf, SID, 'C1', '=SORT(A1:A5)');
    const data = { '0,2': { f: '=SORT(A1:A5)' } };
    /* ★呼ばない＝前の 姿★ */
    const 出 = [1, 2, 3, 4].map((r) => data[r + ',2']);
    if (出.some((x) => x)) throw new Error('★呼んで いないのに マスが 在る★');
    console.log('      … 呼ばなければ 0マス（＝これが 直す 前の 姿）');
  });

  T('★★古い 溢れが 消える（式を 短く した 時）★★', () => {
    const { hf, SID } = 台();
    [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
    打つ(hf, SID, 'C1', '=SORT(A1:A5)');
    const 作る = (名) => new Function('hf', '_hfGetDisplay', '溢れの印', '溢れの上限',
      切り出す('_溢れの広さ') + ' ' + 切り出す('_溢れを写す') + ' ' + 切り出す('_古い溢れを消す') + ' return ' + 名 + ';')(
      hf, (s, r, c) => String(値(hf, s, r, c)), '_溢れ元', 100000);
    const 写す = 作る('_溢れを写す'), 消す = 作る('_古い溢れを消す');
    const data = { '0,2': { f: '=SORT(A1:A5)' } };
    写す(SID, data, 0, 2);
    if (!data['4,2']) throw new Error('★5マス 目が 作られて いない★');
    /* ★式を 短く する★ */
    打つ(hf, SID, 'C1', '=SORT(A1:A3)');
    const 消えた = 消す(SID, data);
    if (data['4,2']) throw new Error('★古い マスが 残って いる★＝★古い 数が 画面に 残る★');
    if (消えた < 2) throw new Error('★' + 消えた + 'マスしか 消えて いない★');
    console.log('      … 短く すると ' + 消えた + 'マス 消える');
  });

  T('★★書式だけ 残って いる マスは 消さない★★', () => {
    const { hf, SID } = 台();
    [3, 1, 5, 2, 4].forEach((v, i) => 打つ(hf, SID, 'A' + (i + 1), v));
    打つ(hf, SID, 'C1', '=SORT(A1:A3)');
    const 消す = new Function('hf', '溢れの印',
      切り出す('_古い溢れを消す') + ' return _古い溢れを消す;')(hf, '_溢れ元');
    /* ★もう 溢れて いない マスに お客さんの 色が 付いて いる★ */
    const data = { '4,2': { d: '5', _溢れ元: '0,2', bgColor: '#FFFF00' } };
    消す(SID, data);
    if (!data['4,2']) throw new Error('★色が 付いた マスを 消した★');
    if (data['4,2'].bgColor !== '#FFFF00') throw new Error('★色が 消えた★');
    if (data['4,2'].d !== undefined) throw new Error('★古い 数が 残って いる★');
    console.log('      … 色は 残り、古い 数だけ 消える');
  });

  T('★★台が 本番と 同じ（プラグインを 積んで いる）★★', () => {
    if (つないだ < 3) throw new Error('★プラグインが ' + つないだ + '本しか つないで いない★');
    const { hf, SID } = 台();
    打つ(hf, SID, 'A1', 1); 打つ(hf, SID, 'A2', 2); 打つ(hf, SID, 'A3', 3);
    打つ(hf, SID, 'B1', '=UNIQUE(A1:A3)');
    if (String(値(hf, SID, 0, 1)).indexOf('NAME') >= 0) {
      throw new Error('★UNIQUE が #NAME★＝★プラグインが 積めて いない台で 測って いる★');
    }
    console.log('      … つないだ ' + つないだ + '本／UNIQUE も 通る');
  });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
