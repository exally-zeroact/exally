/* xlsx-zukei.test.mjs — ★図形（判子）を 自前で 読めて いるか★（2026-09-21）
 *
 *  ★★なぜ 要るか★★
 *    実Excel が 作った ファイルを お客さんの 道で 開いて 数えたら
 *    ★図形が 画面に 1つも 出て いません★でした
 *    （`docs/measured/golden-kazari-gamen-made-2026-09-21.tsv`）。
 *    因 ＝ ★`xl/drawings/drawing1.xml` を 読む 所が 1つも 在りません★。
 *
 *  ★★物差し★★
 *    ①`tests/fixtures/kazari-hiraku3.xlsx`（11725B・実Excel 16.0 build 20326 が COM で 作った 物）
 *    ②実Excel が その ファイルを 開いて 言った 数（経営者1 の 実測・2026-09-21）
 *       `docs/measured/golden-moto-no-katachi-excel-2026-09-21.tsv`
 *         図形 Left ★449.375★ ／ Top ★20★ ／ Width ★60★ ／ Height ★60★（ポイント）
 *         図形の 名 ★hanko★ ／ AutoShapeType ★1（四角）★
 *
 *  ★★点（px）と ポイントの 直し方★★
 *    実Excel は ★ポイント★で 言います。画面は ★96dpi の 点★です。
 *    ⇒ 1pt ＝ 4/3 点 ⇒ 60pt ＝ ★80点★ ／ 20pt ＝ ★26.67点★ ／ 449.375pt ＝ ★599.17点★
 *
 *  ★★★位置は `xfrm` を 使いません★★★
 *    この ファイルの `xfrm` は `x=4064000 EMU`＝★320pt★ ですが、
 *    実Excel は ★449.375pt★ と 言います。
 *    ⇒★`xfrm` は 置いた 時の 古い 数★（`Placement 1` ＋ A列を 30 に 広げた）
 *    ⇒★`twoCellAnchor` の マスと ずれ から 出します★
 *    ⇒★往復の 穴では ありません★（元の ファイルでも 449.375・経営者1 が 09-21 に 実測）
 *
 *  使い方: node tests/xlsx-zukei.test.mjs
 *          node tests/xlsx-zukei.test.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const Z = require_(path.join(ROOT, 'lib/xlsx-zukei.js'));

let pass = 0, fail = 0;
const NL = String.fromCharCode(10);
const T = (n, f) => {
  try { f(); pass++; console.log('  ok   ' + n); }
  catch (e) { fail++; console.log('  NG   ' + n + NL + '       ' + e.message); }
};

function ほどく(buf) {
  const 出 = {};
  let p = 0;
  while (p + 30 <= buf.length) {
    if (buf.readUInt32LE(p) !== 0x04034b50) break;
    const 方 = buf.readUInt16LE(p + 8);
    const 圧 = buf.readUInt32LE(p + 18);
    const n = buf.readUInt16LE(p + 26);
    const x = buf.readUInt16LE(p + 28);
    const 名 = buf.toString('utf8', p + 30, p + 30 + n);
    const 頭 = p + 30 + n + x;
    const 体 = buf.slice(頭, 頭 + 圧);
    出[名] = 方 === 8 ? zlib.inflateRawSync(体).toString('utf8') : 体.toString('utf8');
    p = 頭 + 圧;
  }
  return 出;
}

const 材料道 = path.join(ROOT, 'tests/fixtures/kazari-hiraku3.xlsx');
const 中 = fs.existsSync(材料道) ? fs.readFileSync(材料道) : null;

console.log('');
console.log('[xlsx-zukei] ★図形（判子）を 自前で 読めて いるか★');

T('★材料が 在る（空振りして いない）★', () => {
  if (!中) throw new Error('★材料が 無い★ ' + 材料道);
  const h = crypto.createHash('sha256').update(中).digest('hex');
  if (h !== 'cef5657d3c521e377a9803681d7c0b97d1d95b4dff4b102bbd35bc2f56ff615b') {
    throw new Error('★材料が 入れ替わって います★ sha256=' + h);
  }
});

const 部品 = 中 ? ほどく(中) : {};

/* ★板 → 図形の 部品名★（★並び順では 当てません★＝rels で 解きます） */
const 部品名 = 中 ? Z.図形の部品名(
  部品['xl/worksheets/sheet1.xml'],
  部品['xl/worksheets/_rels/sheet1.xml.rels'],
  'xl/worksheets/sheet1.xml') : null;

T('★★rels から 図形の 部品名を 解けて いる★★（★並び順で 当てない★）', () => {
  if (部品名 !== 'xl/drawings/drawing1.xml') {
    throw new Error('★部品名が ' + 部品名 + '★（xl/drawings/drawing1.xml の はず）');
  }
});

const 図たち = 部品名 && 部品[部品名] ? Z.読む(部品[部品名]) : [];
console.log('      ＝ 読んだ 図形 ' + 図たち.length + '個 ／ ' + JSON.stringify(図たち));

T('★図形が 1つ 読めた（名前は hanko）★', () => {
  if (図たち.length !== 1) throw new Error('★' + 図たち.length + '個★（1個 の はず）');
  if (図たち[0].名 !== 'hanko') throw new Error('★名が ' + 図たち[0].名 + '★（hanko の はず）');
});

T('★形が 四角（prst="rect"）★', () => {
  if (図たち[0].種類 !== '四角') throw new Error('★種類が ' + 図たち[0].種類 + '★（四角 の はず）');
});

/* ★★実Excel の 数と 突き合わせます★★（★1点まで 見ます★） */
const 点 = (pt) => pt * 4 / 3;
T('★★大きさが 実Excel と 合う（60pt × 60pt ＝ 80点 × 80点）★★', () => {
  if (図たち[0].w !== 80) throw new Error('★幅が ' + 図たち[0].w + '★（80 の はず）');
  if (図たち[0].h !== 80) throw new Error('★高さが ' + 図たち[0].h + '★（80 の はず）');
});

/* ★★場所★★
     ★うちの 列幅で 解きます★＝`colW` は ★画面が 実際に 使う 数★を 渡します。
     ★2026-09-21 に 本番の 道で 測った 数★ ＝ A列 ＝ 245点／他 ＝ 72点（標準）
     ⇒ この 数で 解くと 実Excel の 449.375pt（＝599.17点）に なる はず。 */
const 場 = Z.場所を決める(図たち[0] || {}, { 0: 245 }, 72, {}, 24);
console.log('      ＝ 場所 x=' + 場.x + ' y=' + 場.y
  + '（実Excel ＝ x ' + 点(449.375).toFixed(2) + ' / y ' + 点(20).toFixed(2) + '）');

T('★★横の 場所が 実Excel と 1点 以内★★（★`xfrm` の 320pt では ありません★）', () => {
  const 待 = 点(449.375);
  const 差 = Math.abs(場.x - 待);
  if (差 > 1) {
    throw new Error('★x が ' + 場.x + '★（' + 待.toFixed(2) + ' の はず・差 ' + 差.toFixed(2) + '）'
      + '／★`xfrm` を 使うと ' + 点(320).toFixed(2) + ' に なります★');
  }
});

T('★★縦の 場所が 実Excel と 1点 以内★★', () => {
  const 待 = 点(20);
  const 差 = Math.abs(場.y - 待);
  if (差 > 1) throw new Error('★y が ' + 場.y + '★（' + 待.toFixed(2) + ' の はず）');
});

T('★★`xfrm` の 古い 数（320pt）に なって いない★★（★これが 一番 起きやすい 間違い★）', () => {
  if (Math.abs(場.x - 点(320)) < 1) {
    throw new Error('★x が ' + 場.x + ' ＝ `xfrm` の 数です★'
      + '／★マスと ずれ（twoCellAnchor）から 出して ください★');
  }
});

T('★台に 載せる 形（`sheets[i].objects` と 同じ）が 出る★', () => {
  const o = Z.台に載せる形(図たち, { 0: 245 }, 72, {}, 24);
  if (o.length !== 1) throw new Error('★' + o.length + '個★');
  for (const k of ['x', 'y', 'w', 'h', 'z', '名']) {
    if (o[0][k] === undefined) throw new Error('★' + k + ' が 無い★ ' + JSON.stringify(o[0]));
  }
  if (o[0].種類 !== '四角') throw new Error('★種類が ' + o[0].種類 + '★');
});

/* ★★色は 付けません★★（★当て推量で 色を 作らない★） */
T('★★テーマの 色は 付けない★★（★未測定だから★）', () => {
  if (図たち[0].塗り) {
    throw new Error('★塗りが ' + 図たち[0].塗り + ' と 付いて います★'
      + '／★この 図形は `<a:schemeClr val="accent1"/>`＝テーマの 色です★'
      + '／★テーマの 色を 決め打ちに できるかは 未測定★（経営者1・2026-09-21）');
  }
});

T('★字で 書いた 色（srgbClr）なら 使う★', () => {
  const 作 = 部品[部品名].split('<a:prstGeom').join(
    '<a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:prstGeom');
  const 出 = Z.読む(作);
  if (!出.length || 出[0].塗り !== '#FF0000') {
    throw new Error('★塗りが ' + (出[0] || {}).塗り + '★（#FF0000 の はず）');
  }
});

/* ══ ★★`.xlsb` でも 読めるか★★ ══（2026-09-21）
     ★★なぜ 要るか★★
       ★司さんの 実物は `.xlsb`★ です。
       `.xlsb` の 包みの 中は ほとんど `.bin` ですが、
       ★`xl/drawings/drawing1.xml` だけは XML の まま 残ります★（経営者1 の 実測・09-21）。
     ★★但し 板は 2進です★★（`xl/worksheets/sheet1.bin`）
       ⇒`<drawing r:id=>` を ★字として 探せません★
       ⇒★rels の `Type` で 解きます★（`lib/xlsx-zukei.js`）
     ★材料★ `tests/fixtures/kazari-hiraku3.xlsb`（経営者1 が 実Excel で 作った 作り物） */
const b材料道 = path.join(ROOT, 'tests/fixtures/kazari-hiraku3.xlsb');
const b中 = fs.existsSync(b材料道) ? fs.readFileSync(b材料道) : null;

T('★.xlsb の 材料が 在る（空振りして いない）★', () => {
  if (!b中) throw new Error('★材料が 無い★ ' + b材料道);
  const h = crypto.createHash('sha256').update(b中).digest('hex');
  if (h !== 'b21b67cac5c53ae7653e4a03c138ccca11c5abd360d9668dc10f381a20942430') {
    throw new Error('★材料が 入れ替わって います★ sha256=' + h);
  }
});

const b部品 = b中 ? ほどく(b中) : {};
T('★★.xlsb の 板は 2進・図形は XML の まま★★（★ここが 肝★）', () => {
  if (!b部品['xl/worksheets/sheet1.bin']) throw new Error('★sheet1.bin が 無い★');
  if (!b部品['xl/drawings/drawing1.xml']) throw new Error('★drawing1.xml が 無い★');
  if (b部品['xl/worksheets/sheet1.xml']) throw new Error('★sheet1.xml が 在る★（.xlsb の はず）');
  if (b部品['xl/styles.xml']) throw new Error('★styles.xml が 在る★（.xlsb は styles.bin の はず）');
});

/* ★★板の 字を 渡しません★★＝★2進なので 渡せません★（`Type` で 解けるか を 見ます） */
const b部品名 = b中 ? Z.図形の部品名('',
  b部品['xl/worksheets/_rels/sheet1.bin.rels'], 'xl/worksheets/sheet1.bin') : null;

T('★★板が 2進でも `Type` で 図形に 辿り着ける★★', () => {
  if (b部品名 !== 'xl/drawings/drawing1.xml') {
    throw new Error('★部品名が ' + b部品名 + '★（xl/drawings/drawing1.xml の はず）');
  }
});

const b図 = b部品名 && b部品[b部品名] ? Z.読む(b部品[b部品名]) : [];
const b場 = b図.length ? Z.場所を決める(b図[0], { 0: 245 }, 72, {}, 24) : {};
console.log('      ＝ .xlsb の 図形 ' + b図.length + '個 ／ x=' + b場.x + ' y=' + b場.y);

T('★★.xlsb の 図形も 実Excel と 1点 以内★★（★xlsx と 同じ 数★）', () => {
  if (b図.length !== 1) throw new Error('★' + b図.length + '個★（1個 の はず）');
  if (b図[0].名 !== 'hanko') throw new Error('★名が ' + b図[0].名 + '★');
  if (b図[0].w !== 80 || b図[0].h !== 80) {
    throw new Error('★大きさが ' + b図[0].w + 'x' + b図[0].h + '★（80x80 の はず）');
  }
  if (Math.abs(b場.x - 点(449.375)) > 1) {
    throw new Error('★x が ' + b場.x + '★（' + 点(449.375).toFixed(2) + ' の はず）');
  }
  if (Math.abs(b場.y - 点(20)) > 1) {
    throw new Error('★y が ' + b場.y + '★（' + 点(20).toFixed(2) + ' の はず）');
  }
});

T('★★`r:id` の 道でも 型の 道でも 同じ 答え★★（★.xlsx で 割ります★）', () => {
  const あ = Z.図形の部品名(部品['xl/worksheets/sheet1.xml'],
    部品['xl/worksheets/_rels/sheet1.xml.rels'], 'xl/worksheets/sheet1.xml');
  const い = Z.図形の部品名('',
    部品['xl/worksheets/_rels/sheet1.xml.rels'], 'xl/worksheets/sheet1.xml');
  if (あ !== い) throw new Error('★r:id ' + あ + ' ／ 型 ' + い + '★');
});

console.log('');
console.log('  ★見て いない 事★');
console.log('    ・★色は 付けて いません★＝テーマの 色が 決め打ちに できるかは ★未測定★');
console.log('    ・`oneCellAnchor` / `absoluteAnchor` は ★まだ★（この 材料に 在りません）');
console.log('    ・図形の 中の 字／線の 太さ／回転の 見た目は ★未測定★');
console.log('    ・★★`.xlsb` の マスの 飾りは まだ★★＝`xl/styles.bin`（2進）');
console.log('      ＝お客さんの 道で 測ると ★.xlsb は 8 / 13★（図形は 出ます）');
console.log('    ・★★.xlsb の 板の 名前は 「並び」で 当てて います★★');
console.log('      ＝★板が 2枚 以上 在る `.xlsb` で 合うかは 未測定★');
console.log('    ・★画面に 描いて いるかは ここでは 測って いません★');
console.log('      ＝`docs/measured/hakaru-kazari-ga-gamen-made-todoku-ka.mjs`');
console.log('xlsx-zukei: ' + pass + ' 緑 / ' + fail + ' 赤');

if (process.argv.includes('--self-test')) {
  console.log('');
  console.log('--self-test: ★わざと壊して 赤に なるか★（★lib は 1字も 触りません★）');
  const 絵 = 部品[部品名];
  const 板 = 部品['xl/worksheets/sheet1.xml'];
  const rels = 部品['xl/worksheets/_rels/sheet1.xml.rels'];
  /* ★★壊し方の 表★★＝★元の 字を 書き換えて 押します★ */
  const 壊し方 = [
    { 名: 'マスの 番号を 変える（場所が 動く はず）',
      絵: (x) => x.replace(new RegExp('<xdr:col>5</xdr:col>'), '<xdr:col>1</xdr:col>'),
      見る: (図) => Math.abs(Z.場所を決める(図[0], { 0: 245 }, 72, {}, 24).x - 点(449.375)) > 1 },
    { 名: '大きさを 半分に する（80 → 40 に なる はず）',
      絵: (x) => x.replace(new RegExp('cx="762000" cy="762000"'), 'cx="381000" cy="381000"'),
      見る: (図) => 図[0] && 図[0].w === 40 && 図[0].h === 40 },
    { 名: '名前を 変える（hanko で なくなる はず）',
      絵: (x) => x.replace(new RegExp('name="hanko"'), 'name="betsu"'),
      見る: (図) => 図[0] && 図[0].名 === 'betsu' },
    { 名: '形を 丸に する（種類が 丸に なる はず）',
      絵: (x) => x.replace(new RegExp('prst="rect"'), 'prst="ellipse"'),
      見る: (図) => 図[0] && 図[0].種類 === '丸' },
    { 名: '`<xdr:sp>` を 消す（図形が 0個に なる はず）',
      絵: (x) => x.replace(new RegExp('<xdr:sp ', 'g'), '<xdr:zzz '),
      見る: (図) => 図.length === 0 },
  ];
  let 悪 = 0;
  for (const こ of 壊し方) {
    const 絵2 = こ.絵(絵);
    if (絵2 === 絵) { console.log('  NG   ★1字も 変わって いません★ ' + こ.名); 悪++; continue; }
    if (こ.見る(Z.読む(絵2))) console.log('  ok   ' + こ.名);
    else { console.log('  NG   ★壊したのに 同じ 答え★ ' + こ.名); 悪++; }
  }
  /* ★rels を 壊すと 部品名が 出ない はず★ */
  const r2 = rels.replace(new RegExp('drawings/drawing1.xml'), 'drawings/nai.xml');
  const 名2 = Z.図形の部品名(板, r2, 'xl/worksheets/sheet1.xml');
  if (名2 === 'xl/drawings/nai.xml') console.log('  ok   rels の 行き先を 変えると 部品名も 変わる');
  else { console.log('  NG   ★rels を 変えたのに ' + 名2 + '★'); 悪++; }
  process.exit(悪 ? 1 : 0);
}
process.exit(fail ? 1 : 0);
