/* ita-wo-tasu.test.mjs — ★足した 板が 書き出す 先に 入るか★（2026-09-21）
 *
 *  ★★なぜ 要るか★★
 *    司さん「★全部 保存しろや、断る 理由が なんか あるんか★」（ア）
 *    `lib/hairanai.js` の 頭（2026-09-06 実測）
 *      「新しいシートを 1枚 足して 保存 ⇒ ★出た ファイルに 無い★」
 *
 *  ★★穴は 2つ でした★★（★1つ 直しただけでは 出ませんでした★）
 *    ⑴`js/book-open.js` `saveXlsxLike()`
 *        `if (opened.sheetNames.indexOf(sh.name) < 0) return;`
 *    ⑵`js/book-open.js` `anyChanged()`
 *        `if (opened.sheetNames.indexOf(sheets[i].name) < 0) continue;`
 *      ⇒`saveOpened()` は 1つも 変わって いなければ ★元の バイト列を そのまま 返す★
 *      ⇒★板を 足しただけ では 「変わって いない」★に なり
 *        ★出た ファイルが 元と 1バイトも 同じ★でした（sha256 が 一致・実測）
 *    ⇒★記憶「作る道が 2本 在る時は 両方 直せ」★
 *
 *  ★★この 門が 守る 事★★
 *    ①足した 板の 部品が ★包みに 入る★
 *    ②★元の 部品が 1つも 減らない★
 *    ③★★元の 部品の 中身が 1バイトも 変わらない★★
 *       ＝★判子・罫線・塗り・グラフは 元の 部品の 中★
 *       ＝★直すのは 仕組みの 3本だけ★（`[Content_Types].xml` / rels / `workbook.xml`）
 *    ④`<sheets>` と rels と 型 が ★3つとも★ 直る（★1つでも 抜けると 実Excel は 修復を 言う★）
 *    ⑤★番号が ぶつからない★（`sheetN` / `rIdN` / `sheetId`）
 *    ⑥★もう 在る 名前は 足せない★
 *
 *  ★★見て いない 事★★
 *    ・★実Excel が 開くかは 測れません★（COM が 要る＝経営者1 の 持ち場）
 *      ⇒`docs/measured/toru-jitsu-excel-ga-shuufuku-shita-ka.ps1`（93）
 *    ・★お客さんの 道（画面）では ここでは 押して いません★
 *      ⇒`docs/measured/hakaru-tashita-ita-ga-hozon-sareru-ka.mjs`
 *    ・★足した 板に 飾りは 書きません★＝値と 式だけ
 *    ・★`xl/calcChain.xml` は 触りません★＝★消して 良いか 測って いません★
 *
 *  使い方: node tests/ita-wo-tasu.test.mjs
 *          node tests/ita-wo-tasu.test.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const Z = require_(path.join(ROOT, 'lib/zip-surgeon.js'));
const E = require_(path.join(ROOT, 'lib/xlsx-edit.js'));

let pass = 0, fail = 0;
const NL = String.fromCharCode(10);
const 待 = async (n, f) => {
  try { await f(); pass++; console.log('  ok   ' + n); }
  catch (e) { fail++; console.log('  NG   ' + n + NL + '       ' + e.message); }
};

const 材料道 = path.join(ROOT, 'tests/fixtures/kazari-hiraku3.xlsx');
const 中 = fs.existsSync(材料道) ? fs.readFileSync(材料道) : null;

console.log('');
console.log('[ita-wo-tasu] ★足した 板が 書き出す 先に 入るか★');

await 待('★材料が 在る（空振りして いない）★', async () => {
  if (!中) throw new Error('★材料が 無い★ ' + 材料道);
  const h = crypto.createHash('sha256').update(中).digest('hex');
  if (h !== 'cef5657d3c521e377a9803681d7c0b97d1d95b4dff4b102bbd35bc2f56ff615b') {
    throw new Error('★材料が 入れ替わって います★ ' + h);
  }
});

/* ★元の 包みを 全部 控えます★ */
const 元z = Z.read(new Uint8Array(中));
const 元の名 = 元z.names().slice();
const 元の中身 = {};
for (const n of 元の名) 元の中身[n] = await 元z.bytes(n);

/* ★★板を 1枚 足して 書き出す★★ */
const 出 = await (async () => {
  const book = await E.open(new Uint8Array(中));
  const 足 = E.板を足す(book, 'Tashita', {
    A1: { v: 123, t: 'n' }, B1: { v: 'tashita', t: 's' }, A2: { v: 2.5, t: 'n' },
  });
  const r = await E.save(book);
  return { 足: 足, z: Z.read(r.bytes), 大: r.bytes.length };
})();
console.log('      ＝ 足した 部品 ' + 出.足.部品 + ' ／ ' + 出.足.rId
  + ' ／ sheetId ' + 出.足.sheetId + ' ／ 出た 包み ' + 出.大 + 'B');

await 待('★★足した 板の 部品が 包みに 入って いる★★', async () => {
  if (!出.z.has(出.足.部品)) throw new Error('★' + 出.足.部品 + ' が 無い★');
  const t = await 出.z.text(出.足.部品);
  if (t.indexOf('<v>123</v>') < 0) throw new Error('★A1 の 123 が 無い★ ' + t.slice(0, 120));
  if (t.indexOf('tashita') < 0) throw new Error('★B1 の 字が 無い★');
  if (t.indexOf('t="inlineStr"') < 0) {
    throw new Error('★字が `inlineStr` で 入って いません★'
      + '／★共有文字列を 触ると 元の 板の 番号が ずれます★');
  }
});

await 待('★★元の 部品が 1つも 減って いない★★', async () => {
  const 無 = 元の名.filter((n) => !出.z.has(n));
  if (無.length) throw new Error('★' + 無.length + '本 消えました★ ' + 無.join(' '));
});

await 待('★★★元の 部品の 中身が 1バイトも 変わって いない★★★'
  + '（★直すのは 仕組みの 3本だけ★）', async () => {
  const 直して良い = ['[Content_Types].xml', 'xl/_rels/workbook.xml.rels', 'xl/workbook.xml'];
  const 違 = [];
  for (const n of 元の名) {
    if (直して良い.indexOf(n) >= 0) continue;
    const a = 元の中身[n];
    const b = await 出.z.bytes(n);
    if (a.length !== b.length) { 違.push(n + ' ' + a.length + 'B ⇒ ' + b.length + 'B'); continue; }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) { 違.push(n + ' ' + i + 'バイト目'); break; }
    }
  }
  if (違.length) {
    throw new Error('★' + 違.length + '本 変わりました★' + NL + '       ' + 違.join(NL + '       ')
      + NL + '       ★判子・罫線・塗り・グラフは この 中に 在ります★');
  }
});

await 待('★★仕組みの 3本が ★3つとも★ 直って いる★★'
  + '（★1つでも 抜けると 実Excel は 修復を 言います★）', async () => {
  const wb = await 出.z.text('xl/workbook.xml');
  const rels = await 出.z.text('xl/_rels/workbook.xml.rels');
  const ct = await 出.z.text('[Content_Types].xml');
  if (wb.indexOf('name="Tashita"') < 0) throw new Error('★workbook.xml に 板の 名前が 無い★');
  if (wb.indexOf('r:id="' + 出.足.rId + '"') < 0) throw new Error('★workbook.xml に rId が 無い★');
  if (rels.indexOf('Id="' + 出.足.rId + '"') < 0) throw new Error('★rels に rId が 無い★');
  if (rels.indexOf(出.足.部品.replace('xl/', '')) < 0) throw new Error('★rels に 行き先が 無い★');
  if (ct.indexOf('/' + 出.足.部品) < 0) throw new Error('★[Content_Types].xml に 型が 無い★');
});

await 待('★★番号が ぶつからない（元の 板と 同じ 番号を 使って いない）★★', async () => {
  const wb = await 出.z.text('xl/workbook.xml');
  if (出.足.部品 === 'xl/worksheets/sheet1.xml') throw new Error('★元の 板に 被って います★');
  if (出.足.sheetId === 1) throw new Error('★sheetId が 1★（元の 板と 同じ）');
  /* ★`sheetId` も `rId` も 二度 出て こない★ */
  const 数 = (s, k) => s.split(k).length - 1;
  if (数(wb, 'sheetId="' + 出.足.sheetId + '"') !== 1) {
    throw new Error('★sheetId ' + 出.足.sheetId + ' が 2つ 在ります★');
  }
  if (数(wb, 'r:id="' + 出.足.rId + '"') !== 1) {
    throw new Error('★' + 出.足.rId + ' が 2つ 在ります★');
  }
});

await 待('★★もう 在る 名前は 足せない（黙って 2枚に しない）★★', async () => {
  const book = await E.open(new Uint8Array(中));
  let 投げた = false;
  try { E.板を足す(book, 'Sheet1', {}); } catch (e) { 投げた = true; }
  if (!投げた) throw new Error('★同じ 名前の 板を 足せて しまいました★');
});

await 待('★2枚 続けて 足しても 番号が ぶつからない★', async () => {
  const book = await E.open(new Uint8Array(中));
  const a = E.板を足す(book, 'A', {});
  const b = E.板を足す(book, 'B', {});
  if (a.部品 === b.部品) throw new Error('★同じ 部品名★ ' + a.部品);
  if (a.rId === b.rId) throw new Error('★同じ rId★ ' + a.rId);
  if (a.sheetId === b.sheetId) throw new Error('★同じ sheetId★ ' + a.sheetId);
  const r = await E.save(book);
  const z = Z.read(r.bytes);
  if (!z.has(a.部品) || !z.has(b.部品)) throw new Error('★2枚とも 入って いません★');
});

console.log('');
console.log('  ★見て いない 事★');
console.log('    ・★実Excel が 開くかは 測れません★（COM が 要る＝経営者1 の 持ち場）');
console.log('    ・★お客さんの 道（画面）は 別の 道具★');
console.log('      ＝`docs/measured/hakaru-tashita-ita-ga-hozon-sareru-ka.mjs`');
console.log('    ・★足した 板に 飾りは 書きません★＝値と 式だけ');
console.log('    ・★`xl/calcChain.xml` は 触りません★＝★消して 良いか 測って いません★');
console.log('ita-wo-tasu: ' + pass + ' 緑 / ' + fail + ' 赤');

if (process.argv.includes('--self-test')) {
  console.log('');
  console.log('--self-test: ★わざと壊して 赤に なるか★（★lib は 1字も 触りません★）');
  let 悪 = 0;
  const 見る = (な, ok) => { if (ok) console.log('  ok   ' + な); else { console.log('  NG   ' + な); 悪++; } };

  /* ㋐ ★足さずに 保存したら 部品は 増えない★＝門①が 本当に 数えて いるか */
  const b1 = await E.open(new Uint8Array(中));
  const r1 = await E.save(b1);
  見る('★足さなければ 部品は 増えない★', Z.read(r1.bytes).names().length === 元の名.length);

  /* ㋑ ★型を 入れずに 保存したら 門④が 赤に なる形か★ */
  const b2 = await E.open(new Uint8Array(中));
  const 足2 = E.板を足す(b2, 'X', {});
  b2.addedTypes = [];                       /* ★型を わざと 捨てる★ */
  const r2 = await E.save(b2);
  const ct2 = await Z.read(r2.bytes).text('[Content_Types].xml');
  見る('★型を 捨てると [Content_Types].xml に 入らない（門が 気づける 形）★',
    ct2.indexOf('/' + 足2.部品) < 0);

  /* ㋒ ★板の 中身を 変えたら 部品の 中身も 変わる★＝門①が 中を 見て いるか */
  const b3 = await E.open(new Uint8Array(中));
  const 足3 = E.板を足す(b3, 'Y', { A1: { v: 999, t: 'n' } });
  const r3 = await E.save(b3);
  const t3 = await Z.read(r3.bytes).text(足3.部品);
  見る('★中身を 変えると 部品の 中も 変わる（門が 中を 見て います）★',
    t3.indexOf('<v>999</v>') >= 0);

  process.exit(悪 ? 1 : 0);
}
process.exit(fail ? 1 : 0);
