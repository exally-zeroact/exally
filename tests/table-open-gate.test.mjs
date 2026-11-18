/* table-open-gate.test.mjs — ★式がエンジンへ入る口は、全部 表の字を開く入口①（lib/table-open.js・book.html の 表の字を開く）を通っているか★
 * 設計 exally-hyou-dougu/sekkei-1b-6.md（口を人が数えると毎回1つ漏れる＝機械で数える）。
 * 数え方＝受け先の呼び出し（.setCellContents( .setSheetContent( _jsComputeFormula( .打つ( ）を全部拾い、
 *   それを含む関数の中に `表の字を開く(` か `開く(` が在るかを見る。式でない口は ALLOW に理由つきで書く。
 * 使い方 node tests/table-open-gate.test.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let 赤 = 0;
const ok = (n, c, d) => { if (!c) { 赤++; console.log('  赤 ' + n + (d ? '  ' + d : '')); } else console.log('  ok ' + n); };

const SINK = /\.setCellContents\(|\.setSheetContent\(|(?:^|[^\w.])_jsComputeFormula\(|[板t]\.打つ\(/;
const 通す = /表の字を開く\(|TableOpen\.開く\(|開く\(/;
/* 式でない口・定義そのもの＝関数名で許す（理由つき） */
const ALLOW = {
  '_jsComputeFormula': '定義そのもの',
  'setCell': '時刻・日付の値を HF へ入れる口（式でない・11050/11057）',
  'doUndo': '字のまま戻す口（式でない値・_式 でない時だけ）',
};
function 口を数える(file, text) {
  const lines = text.split('\n'); const 出 = [];
  let fn = null, fnStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(?:async\s+)?function\s+([^\s(]+)\s*\(/.exec(lines[i]);
    if (m) { fn = m[1]; fnStart = i; }
    if (/^\s*(\/\/|\/\*|\*)/.test(lines[i])) continue;
    if (SINK.test(lines[i]) && !/^\s*function\s/.test(lines[i])) {
      const body = lines.slice(fnStart, i + 1).join('\n');
      出.push({ file, line: i + 1, fn, 通る: 通す.test(body) });
    }
  }
  return 出;
}
const book = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
const lib = fs.readFileSync(path.join(ROOT, 'lib', 'shiki-ita-awase.js'), 'utf8');
const 口 = [...口を数える('book.html', book), ...口を数える('lib/shiki-ita-awase.js', lib)];
console.log('口の数 ' + 口.length);
for (const x of 口) ok(`${x.file}:${x.line} (${x.fn}) が入口を通る`, x.通る || ALLOW[x.fn] !== undefined);
ok('入口の関数が book.html に在る', /function 表の字を開く\(/.test(book));
ok('lib/table-open.js を book.html が読む', /lib\/table-open\.js/.test(book));
ok('台の 合わせる は 開く関数を引数で受ける', /function 合わせる\(板, data, 板名, 開く\)/.test(lib));
console.log(赤 ? `\n${赤} 赤` : '\n全部 ok');
process.exit(赤 ? 1 : 0);
