/* filterxml.test.mjs — ★FILTERXML が 実Excel と 同じ 答えを 出すか★ 2026-09-04
 *
 *  ★何を 正しいと したか★
 *    ★XPath の 決まりを 私が 考えた のでは ありません★。
 *    ★この機械の 実Excel 365 に 29通り 打たせた 答え★が 真値です。
 *      道具 … tools/filterxml-golden.ps1 ／ tools/filterxml-golden2.ps1
 *      台帳 … tests/fixtures/filterxml-golden.json
 *      ★.Formula2 で 打った★（.Formula だと 1つしか 返らない＝暗黙の 交差）
 *      ★司さんの 実物は 1バイトも 触っていません★
 *
 *  ★★ここ（node）では 3通り 測れません★★
 *    ★試験の 台（jsdom）の XPath が 本物の ブラウザと 違う★（2026-09-04 実測）
 *      ・大文字小文字を 区別しない（//A と //a が 同じに なる）… 2通り
 *      ・local-name() が 使えない … 1通り
 *    ⇒★これは「うちが 間違っている」では ありません★
 *      ★本物の ブラウザ（WebKit・Chromium）では 29/29 合っています★
 *      （tests/filterxml-webkit.mjs＝★そちらが 本番と 同じ 台★）
 *    ⇒★だから ここでは「未測定 3通り」と はっきり 書き、緑に 数えません★
 *      ＝★「その 道具で 取れない」を「機械で 取れない」と 書かない★（会社の 決まり）
 *
 *  走らせ方: node tests/filterxml.test.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const F = require_(path.join(ROOT, 'lib/filterxml.js'));
const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/filterxml-golden.json'), 'utf8'));

let pass = 0, fail = 0, 未測定 = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};

/* ★jsdom で 測れない 物★＝★名前で 書く（数だけに しない）★ */
const 測れない = ['大文字小文字（A）', '大文字小文字（a）', '名前空間（ローカル名）'];

console.log('');
console.log('[filterxml] ★実Excel と 同じ 答えを 出すか★');

let 窓 = null;
try {
  const { JSDOM } = await import('jsdom');
  窓 = new JSDOM('<!doctype html><html></html>').window;
} catch (e) { 窓 = null; }
if (!窓) {
  console.log('  ★未測定★ jsdom が 入っていません（0件・異常なしに しない）');
  process.exit(1);
}

T('★台帳が 在る★', Array.isArray(G.本) && G.本.length > 0);
T('★出どころが 書いてある（版・道具）★',
  /Excel 365/.test(G._版 || '') && /filterxml-golden\.ps1/.test((G._道具 || []).join(' ')));

/** 台帳の 形（字の 並び）に 揃える */
const 字にする = (r) => {
  if (r && r.誤り) return ['#VALUE!'];
  return r.map((row) => {
    const v = row[0];
    if (v && v.誤り) return '#VALUE!';
    if (v === true) return 'TRUE';
    if (v === false) return 'FALSE';
    return String(v);
  });
};

/* ── ① ★台帳 全部（測れる 物だけ）★ ── */
{
  const ちがい = [];
  let 見 = 0;
  for (const x of G.本) {
    if (測れない.indexOf(x.な) >= 0) { 未測定++; continue; }
    見++;
    const 出 = 字にする(F.取り出す(x.xml, x.xpath, 窓));
    const 期待 = x.答.map((y) => String(y.text));
    if (JSON.stringify(出) !== JSON.stringify(期待)) {
      ちがい.push(x.な + ' … Excel ' + JSON.stringify(期待) + '／うち ' + JSON.stringify(出));
    }
  }
  T('★実Excel の ' + 見 + '通りと 1つ残らず 同じ★（ちがい ' + ちがい.length + '）',
    ちがい.length === 0, ちがい.slice(0, 5).join('\n       '));
  console.log('       … 台帳 ' + G.本.length + '通り ／ ★ここで 見た ' + 見 + '通り★ ／ '
    + '★未測定 ' + 未測定 + '通り（' + 測れない.join(' / ') + '）★');
}

/* ── ② ★未測定の 3通りは 本物の ブラウザで 見る★（そう 書いてあるか）── */
{
  const w = fs.readFileSync(path.join(ROOT, '.github/workflows/webkit.yml'), 'utf8');
  T('★週1の 回で 本物の ブラウザで 測る事に なっている★',
    w.indexOf('filterxml-webkit.mjs') > 0, '★未測定の 3通りを 誰も 見ない★');
}

/* ── ③ ★境界が 台帳に 入っているか★（指示役の 注文・0通りなら 赤）── */
{
  const 名 = G.本.map((x) => x.な).join(' / ');
  const 組 = {
    'XMLが 壊れている': /壊れている/.test(名) ? 1 : 0,
    'XMLが 空': /XMLが 空/.test(名) ? 1 : 0,
    '見つからない': /見つからない/.test(名) ? 1 : 0,
    '複数 返る（こぼれる）': G.本.filter((x) => x.答.length >= 2).length,
    '名前空間': G.本.filter((x) => /名前空間/.test(x.な)).length,
    '大文字小文字': G.本.filter((x) => /大文字小文字/.test(x.な)).length,
    '空の 要素': G.本.filter((x) => /空の 要素|空白だけ/.test(x.な)).length,
    'XPath が でたらめ': /でたらめ/.test(名) ? 1 : 0,
    '属性': G.本.filter((x) => /属性/.test(x.な)).length,
    '節を 返さない XPath': /数を 数える/.test(名) ? 1 : 0,
  };
  const 空 = Object.keys(組).filter((k) => !組[k]);
  T('★境界が 台帳に 全部 入っている★', 空.length === 0, '入っていない … ' + 空.join(' / '));
  console.log('       … ' + Object.keys(組).map((k) => k + ' ' + 組[k]).join(' ／ '));
}

/* ── ④ ★決まりを 1つずつ★（実Excel から 読み取った 物）── */
T('★その 要素の 直の 字だけ 取る（子の 中は 取らない）★',
  字にする(F.取り出す('<r><a>x<b>y</b>z</a></r>', '//a', 窓))[0] === 'xz');
T('★字は 前後を 削る／CDATA は 削らない★',
  字にする(F.取り出す('<r><a> あ </a></r>', '//a', 窓))[0] === 'あ'
  && 字にする(F.取り出す('<r><a><![CDATA[ CD ]]></a></r>', '//a', 窓))[0] === ' CD ');
T('★空の 要素は その 1つだけ #VALUE!★',
  JSON.stringify(字にする(F.取り出す('<r><a>1</a><a></a><a>3</a></r>', '//a', 窓)))
  === JSON.stringify(['1', '#VALUE!', '3']));
T('★数に 見える 字は 数に なる★',
  JSON.stringify(字にする(F.取り出す('<r><a>0001</a><a>1e3</a></r>', '//a', 窓)))
  === JSON.stringify(['1', '1000']));
T('★既定の 名前空間は 無視する★',
  字にする(F.取り出す('<r xmlns="http://x"><a>1</a></r>', '//a', 窓))[0] === '1');
T('★見つからない／壊れている／空 は #VALUE!★',
  字にする(F.取り出す('<r><a>1</a></r>', '//z', 窓))[0] === '#VALUE!'
  && 字にする(F.取り出す('<r><a>1</a>', '//a', 窓))[0] === '#VALUE!'
  && 字にする(F.取り出す('', '//a', 窓))[0] === '#VALUE!');

/* ── ⑤ ★繋いである★ ── */
{
  const book = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
  T('★画面が lib/filterxml.js を 読み込んでいる★', /lib\/filterxml\.js/.test(book));
  const plug = fs.readFileSync(path.join(ROOT, 'lib/formula-extra-plug.js'), 'utf8');
  T('★エンジンに 繋いである★', /FILTERXML[^\n]*method: 'filterxml'/.test(plug));
}

/* ── ⑥ ★外に 出ない★（部品の 中に 通信の 口が 無い）── */
{
  const src = fs.readFileSync(path.join(ROOT, 'lib/filterxml.js'), 'utf8');
  const 通信 = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'window.open'];
  const 出た = 通信.filter((w) => src.indexOf(w) >= 0);
  T('★部品の 中に 通信の 口が 1つも 無い★', 出た.length === 0, '在った … ' + 出た.join(' / '));
  console.log('       … 見た 言葉 ' + 通信.length + '個 ／ ★見つかった ' + 出た.length + '個★'
    + '（実ブラウザでの 通信 0本は tests/filterxml-webkit.mjs）');
}

/* ── わざと 壊して 赤に なるか ── */
if (process.argv.includes('--self-test')) {
  console.log('');
  console.log('★本物の 部品を わざと 壊して 赤に なるか★');
  const { execFileSync } = await import('node:child_process');
  const 道 = path.join(ROOT, 'lib/filterxml.js');
  const 元 = fs.readFileSync(道, 'utf8');
  const 壊す = [
    ['★textContent で 取る（子の 中まで 取ってしまう）★',
      (t) => t.replace(/    var 出 = '';\n    var c = node.firstChild;[\s\S]*?\n    return 出;/,
        '    return String(node.textContent);')],
    ['★字の 前後を 削らない★',
      (t) => t.replace("出 += String(c.data).replace(/^\\s+|\\s+$/g, '');", '出 += String(c.data);')],
    ['★CDATA も 削ってしまう★',
      (t) => t.replace('else if (c.nodeType === 4) 出 += String(c.data);',
        "else if (c.nodeType === 4) 出 += String(c.data).replace(/^\\s+|\\s+$/g, '');")],
    ['★空の 物を 空の 字で 返す（#VALUE! に しない）★',
      (t) => t.replace("出.push([v === null ? { 誤り: 'VALUE' } : v]);", "出.push([v === null ? '' : v]);")],
    ['★数に しない（字の まま）★',
      (t) => t.replace('return Number(u);', 'return t;')],
    ['★既定の 名前空間を 外さない★',
      (t) => t.replace('既定の名前空間を外す(字)', '字')],
    ['★見つからない を 空で 返す★',
      (t) => t.replace('if (!節.length) return 誤り;', 'if (!節.length) return [];')],
    ['★壊れた XML を 通す★',
      (t) => t.replace("if (doc.getElementsByTagName('parsererror').length) return 誤り;", '')],
  ];
  for (const [名, f] of 壊す) {
    const 壊れ = f(元);
    if (壊れ === 元) { console.log('  ★素通り★  ' + 名 + '（印が 古い＝直せ）'); fail++; continue; }
    fs.writeFileSync(道, 壊れ);
    let 赤 = false;
    try { execFileSync(process.execPath, [path.join(ROOT, 'tests', 'filterxml.test.mjs')], { stdio: 'pipe' }); }
    catch (e) { 赤 = true; }
    fs.writeFileSync(道, 元);                 /* ★必ず 戻す★ */
    console.log((赤 ? '  赤くなった  ' : '  ★素通り★  ') + 名);
    if (!赤) fail++;
  }
  T('★本物は 壊していない（戻した）★', fs.readFileSync(道, 'utf8') === 元);
}

console.log('');
console.log('filterxml: ' + pass + ' 緑 / ' + fail + ' 赤'
  + (未測定 ? ' / ★未測定 ' + 未測定 + '通り★（★緑に 数えていません★・本物の ブラウザで 測る）' : ''));
process.exit(fail ? 1 : 0);
