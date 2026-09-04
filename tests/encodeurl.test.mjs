/* encodeurl.test.mjs — ★ENCODEURL が 実Excel と 同じ 字を 出すか★ 2026-09-04
 *
 *  ★何を 正しいと したか★
 *    ★どの字を 残すかを 私が 決めた のでは ありません★。
 *    ★この機械の 実Excel 365 に 75通り 打たせた 答え★が 真値です。
 *      道具 … tools/encodeurl-golden.ps1 ／ tools/encodeurl-golden2.ps1
 *      台帳 … tests/fixtures/encodeurl-golden.json
 *      ★セルは 字の 書式に した★（そうしないと Excel が 100% を 1 に 変える＝別の話）
 *      ★司さんの 実物は 1バイトも 触っていません★
 *
 *  ★★JS の encodeURIComponent を そのまま 使っては いけない★★
 *    実Excel は 6文字（波・感嘆・星・引用・括弧2つ）も ★%XX に する★
 *    encodeURIComponent は ★残す★ ⇒★6文字 ずれる★
 *    ＝★借りずに 自分で 書いた★（この 試験が それを 見る）
 *
 *  ★外に 出るか★ … ★出ない★（tests/encodeurl-webkit.mjs で ★通信 0本★を 数える）
 *
 *  走らせ方: node tests/encodeurl.test.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const E = require_(path.join(ROOT, 'lib/encodeurl.js'));
const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/encodeurl-golden.json'), 'utf8'));

let pass = 0, fail = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};

console.log('');
console.log('[encodeurl] ★実Excel と 同じ 字を 出すか★');

T('★台帳が 在る★', Array.isArray(G.本) && G.本.length > 0);
T('★出どころが 書いてある（版・道具）★',
  /Excel 365/.test(G._版 || '') && /encodeurl-golden\.ps1/.test((G._道具 || []).join(' ')));

/* ── ① ★台帳 全部★ ── */
const 字の行 = G.本.filter((x) => !String(x.入).startsWith('(式)'));
{
  const ちがい = [];
  for (const x of 字の行) {
    const 出 = E.直す(x.入);
    if (出 !== x.text) {
      ちがい.push(JSON.stringify(x.入).slice(0, 40) + ' … Excel「' + x.text.slice(0, 40)
        + '」／うち「' + String(出).slice(0, 40) + '」');
    }
  }
  T('★実Excel の ' + 字の行.length + '通りと 1つ残らず 同じ★（ちがい ' + ちがい.length + '）',
    ちがい.length === 0, ちがい.slice(0, 5).join('\n       '));
  console.log('       … 見た 総数 ' + G.本.length + '通り（うち 式の行 ' + (G.本.length - 字の行.length)
    + '）／★合った ' + (字の行.length - ちがい.length) + '通り★');
}

/* ── ② ★境界が 台帳に 入っているか★（指示役の 注文・0通りなら 赤）── */
{
  const s = 字の行.map((x) => String(x.入));
  const 組 = {
    '空': s.filter((x) => x === '').length,
    '半角スペース': s.filter((x) => x.indexOf(' ') >= 0).length,
    '日本語': s.filter((x) => /[぀-ヿ一-鿿]/.test(x)).length,
    '半角カナ・全角英数': s.filter((x) => /[！-ﾟ]/.test(x)).length,
    '絵文字（2文字で1つ）': s.filter((x) => /[\uD800-\uDBFF]/.test(x)).length,
    '記号（アンド・等号・疑問・斜線・井桁）': s.filter((x) => /[&=?\/#]/.test(x)).length,
    'すでに %xx の 字': s.filter((x) => /%[0-9A-Fa-f]{2}/.test(x)).length,
    '長い 字（100字以上）': s.filter((x) => x.length >= 100).length,
    '改行・タブ': s.filter((x) => /[\n\t]/.test(x)).length,
    'URL まるごと': s.filter((x) => /^https?:\/\//.test(x)).length,
  };
  const 空 = Object.keys(組).filter((k) => !組[k]);
  T('★境界が 台帳に 全部 入っている★', 空.length === 0, '入っていない … ' + 空.join(' / '));
  console.log('       … ' + Object.keys(組).map((k) => k + ' ' + 組[k]).join(' ／ '));
}

/* ── ③ ★encodeURIComponent とは 違う★（借りたら ずれる 6文字）── */
{
  /* ★波・感嘆・星・引用・括弧2つ★（引用は 字の 番号で 書く＝読み間違えない為） */
  const 六 = ['~', '!', '*', String.fromCharCode(39), '(', ')'];
  const ずれ = 六.filter((c) => encodeURIComponent(c) === c);
  T('★JS の encodeURIComponent は この 6文字を 残す（だから 借りられない）★',
    ずれ.length === 6, '残した ' + ずれ.join(''));
  const うち = 六.map((c) => E.直す(c));
  T('★うちは 6文字とも %XX に する（実Excel と 同じ）★',
    うち.every((x) => /^%[0-9A-F]{2}$/.test(x)), うち.join(' '));
}

/* ── ④ ★変な物★（実Excel に 打たせた） ── */
T('★空の セルは 空（#VALUE! では ない）★', E.直す(null) === '' && E.直す(undefined) === '');
T('★TRUE は TRUE★', E.直す(true) === 'TRUE');
T('★数は その まま 字に★', E.直す(1.5) === '1.5' && E.直す(123) === '123');

/* ── ⑤ ★繋いである★ ── */
{
  const book = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
  T('★画面が lib/encodeurl.js を 読み込んでいる★', /lib\/encodeurl\.js/.test(book));
  const plug = fs.readFileSync(path.join(ROOT, 'lib/formula-extra-plug.js'), 'utf8');
  T('★エンジンに 繋いである★', /ENCODEURL[^\n]*method: 'encodeurl'/.test(plug));
}

/* ── ⑥ ★エンジンに 通して 打つ★（部品だけ 緑では 足りない）── */
{
  const M = require_(path.join(ROOT, 'hyperformula.full.min.js'));
  const HF = M.HyperFormula;
  /* ★画面では window.HyperFormula が 全部 持っている★＝node では 同じ 形に 混ぜる */
  const H = Object.assign(Object.create(HF), M,
    { registerFunctionPlugin: HF.registerFunctionPlugin.bind(HF) });
  const P = require_(path.join(ROOT, 'lib/formula-extra-plug.js'));
  P.つなぐ(H, require_(path.join(ROOT, 'lib/formula-extra.js')));
  const 組 = [
    ['a b', 'a%20b'],
    ['あ', '%E3%81%82'],
    [null, ''],                                  /* ★空の セル＝Symbol で 来る★ */
    ['a~b', 'a%7Eb'],
    [1.5, '1.5'],
    [true, 'TRUE'],
    ['a&b=c?d/e#f', 'a%26b%3Dc%3Fd%2Fe%23f'],
  ];
  let 合 = 0;
  for (const [v, e] of 組) {
    let 出;
    try {
      const hf = HF.buildFromArray([[v, '=ENCODEURL(A1)']], { licenseKey: 'gpl-v3' });
      const g = hf.getCellValue({ sheet: 0, col: 1, row: 0 });
      出 = (g && g.value !== undefined) ? g.value : String(g);
    } catch (err) { 出 = '★落ちた★ ' + String(err && err.message).slice(0, 50); }
    if (出 === e) 合++;
    else T('★エンジンで ' + JSON.stringify(v) + '★', false, '期待「' + e + '」／出た「' + 出 + '」');
  }
  T('★エンジンに 通して ' + 組.length + '通り 打った（全部 一致）★', 合 === 組.length,
    '合った ' + 合 + ' / ' + 組.length);
  console.log('       … 見た 総数 ' + 組.length + '通り ／ ★合った ' + 合 + '通り★');
}

/* ── ⑦ ★外に 出ない★（部品の 中に 通信の 口が 無い）── */
{
  const src = fs.readFileSync(path.join(ROOT, 'lib/encodeurl.js'), 'utf8');
  const 通信 = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon',
    'import(', 'http:', 'https:', 'window.open'];
  const 出た = 通信.filter((w) => src.indexOf(w) >= 0);
  T('★部品の 中に 通信の 口が 1つも 無い★', 出た.length === 0, '在った … ' + 出た.join(' / '));
  console.log('       … 見た 言葉 ' + 通信.length + '個 ／ ★見つかった ' + 出た.length + '個★'
    + '（実ブラウザでの 通信 0本は tests/encodeurl-webkit.mjs）');
}

/* ── わざと 壊して 赤に なるか ── */
if (process.argv.includes('--self-test')) {
  console.log('');
  console.log('★本物の 部品を わざと 壊して 赤に なるか★');
  const { execFileSync } = await import('node:child_process');
  const 道 = path.join(ROOT, 'lib/encodeurl.js');
  const 元 = fs.readFileSync(道, 'utf8');
  const 残す印 = "|| c === '-' || c === '_' || c === '.';";
  const 壊す = [
    ['★波の字を 残す（encodeURIComponent の 真似）★',
      (t) => t.replace(残す印, "|| c === '-' || c === '_' || c === '.' || c === '~';")],
    ['★点を 逃がす★', (t) => t.replace(残す印, "|| c === '-' || c === '_';")],
    /* ★.toUpperCase() は 2か所 在る★（借りた分の 大文字化 と 自分で 作る分）
       ★片方だけ 消しても もう片方が 効く★（借りた分は 元から 大文字）
       ⇒★2つ まとめて 外して 赤に なる事★を 見る（2026-09-04 自己確認が 教えた） */
    ['★小文字の %xx に する（2か所とも）★', (t) => t.split('.toUpperCase();').join(';')],
    ['★絵文字を 1文字ずつ 切る（壊れる）★',
      (t) => t.replace('出 += 逃がす(s.substr(i, 2)); i++; continue;', '出 += 逃がす(c); continue;')],
    ['★空の セルを #VALUE! に する★',
      (t) => t.replace("if (x === null || x === undefined) return '';",
        'if (x === null || x === undefined) return null;')],
    ['★TRUE を 小文字に する★', (t) => t.replace("x ? 'TRUE' : 'FALSE'", "x ? 'true' : 'false'")],
  ];
  for (const [名, f] of 壊す) {
    const 壊れ = f(元);
    if (壊れ === 元) { console.log('  ★素通り★  ' + 名 + '（印が 古い＝直せ）'); fail++; continue; }
    fs.writeFileSync(道, 壊れ);
    let 赤 = false;
    try { execFileSync(process.execPath, [path.join(ROOT, 'tests', 'encodeurl.test.mjs')], { stdio: 'pipe' }); }
    catch (e) { 赤 = true; }
    fs.writeFileSync(道, 元);                 /* ★必ず 戻す★ */
    console.log((赤 ? '  赤くなった  ' : '  ★素通り★  ') + 名);
    if (!赤) fail++;
  }
  T('★本物は 壊していない（戻した）★', fs.readFileSync(道, 'utf8') === 元);
}

console.log('');
console.log('encodeurl: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
