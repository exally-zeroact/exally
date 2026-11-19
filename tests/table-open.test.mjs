/* table-open.test.mjs — ★表の字を開く入口①の中身（β1）★（設計 exally-hyou-dougu/sekkei-1b-6.md）
 * 旗が切れていれば恒等／旗が立てば 関所（未知の表名・同名・未知の列＝=#REF!）＋書き換え（Tbl[列]→A1）。
 * 使い方 node tests/table-open.test.mjs [--self-test]（壊しても赤になるか） */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TR = require(path.join(ROOT, 'lib', 'table-refs.js'));
const SELF = process.argv.includes('--self-test');
let 赤 = 0;
const ok = (n, c, d) => { if (!c) { 赤++; console.log('  赤 ' + n + (d ? '  ' + d : '')); } else console.log('  ok ' + n); };

const mk = (name, sheet, over) => Object.assign({ name, rw1: 1, rw2: 7, cl1: 0, cl2: 2, header: 1, totals: 0, cols: ['a', '金額', 'b'], sheet }, over || {});
function 新しい(表たち, 壊す) {
  delete require.cache[path.join(ROOT, 'lib', 'table-open.js')];
  const TO = require(path.join(ROOT, 'lib', 'table-open.js'));
  TO.設定({ 表たち: () => 表たち, 板名: (i) => (i === 1 ? 'S2' : 'S'), 書き換え: 壊す ? () => 'x' : TR._rewriteTextFormula });
  return TO;
}
const REF = '=#REF!';
const T1 = [mk('Table1', 'S')];

/* 旗が切れている＝恒等 */
{
  const TO = 新しい(T1);
  for (const f of ['=SUM(Table1[a])', '=Xyz[b]', '=[@a]', '=SUM(A1:A3)', '="[x]"', 'abc'])
    ok('旗が切れていれば恒等 ' + f, TO.開く(f, { sheet: 0, r: 3, c: 3 }) === f);
}
/* 旗が立つ */
{
  const TO = 新しい(T1); TO.旗を立てる(true);
  const 開く = (f, r, c, s) => TO.開く(f, { sheet: s || 0, r: r === undefined ? 12 : r, c: c === undefined ? 5 : c });
  const a = 開く('=SUM(Table1[金額])');
  ok('Table1[金額] が A1 の範囲になる', typeof a === 'string' && a.indexOf('[') < 0 && /B\d+:B\d+/.test(a), a);
  ok('未知の表名 Xyz[b] は =#REF!', 開く('=Xyz[b]') === REF);
  ok('未知の表名は式の途中でも式全体 =#REF!', 開く('=SUM(A1:A2)+Xyz[b]') === REF);
  ok('IFERROR に包まれた未知の表名も =#REF!（IFERROR に飲まれない）', 開く('=IFERROR(Xyz[b],0)') === REF);
  ok('未知の列 Table1[zzz] は =#REF!', 開く('=SUM(Table1[zzz])') === REF);
  ok('表名は大小無視 table1[金額]', /B\d+:B\d+/.test(開く('=SUM(table1[金額])')));
  ok('表の外の [@a] は =#REF!', 開く('=[@a]', 20, 20) === REF);
  const b = 開く('=[@金額]', 3, 5);
  ok('表の外（列が違う）の [@金額] は =#REF!', b === REF, b);
  const c = 開く('=[@金額]', 3, 1);
  ok('表の中の [@金額] は同じ行の B3', typeof c === 'string' && c.indexOf('[') < 0 && /B4/.test(c), c);
  /* 表の字を持たない式は同じ字 */
  for (const f of ['=SUM(A1:A3)', '="[x]"', '=TEXT(A1,"[h]:mm")', "='[1]Sheet'!A1", '=[1]Sheet!A1', '=CUBEVALUE("x","[a].[b]")', '="Table1[a]"', "='Xyz[b]'!A1"])
    ok('表の字を持たない式は同じ字 ' + f, 開く(f) === f, 開く(f));
  ok('= で始まらない字は同じ', 開く('Table1[a]') === 'Table1[a]');
  /* 別の板の表 */
  const TO2 = 新しい([mk('T2', 'S2')]); TO2.旗を立てる(true);
  const d = TO2.開く('=SUM(T2[a])', { sheet: 0, r: 12, c: 5 });
  ok('別の板の表は板名つきの範囲', /S2/.test(d) && d.indexOf('[') < 0, d);
  /* 同名の表 */
  const TO3 = 新しい([mk('Dup', 'S'), mk('dup', 'S2')]); TO3.旗を立てる(true);
  ok('同名の表（大小無視）は =#REF!', TO3.開く('=SUM(Dup[a])', { sheet: 0, r: 12, c: 5 }) === REF);
  /* 設定が無い／投げる */
  delete require.cache[path.join(ROOT, 'lib', 'table-open.js')];
  const TO4 = require(path.join(ROOT, 'lib', 'table-open.js')); TO4.旗を立てる(true);
  ok('設定が無い＝表の字を持つ式だけ =#REF!', TO4.開く('=SUM(Table1[a])', { sheet: 0, r: 0, c: 0 }) === REF);
  ok('設定が無くても表の字を持たない式は同じ字', TO4.開く('=SUM(A1:A3)', { sheet: 0, r: 0, c: 0 }) === '=SUM(A1:A3)');
  const TO5 = 新しい(T1); TO5.設定({ 表たち: () => { throw new Error('x'); }, 書き換え: TR._rewriteTextFormula }); TO5.旗を立てる(true);
  ok('設定が投げる＝表の字を持つ式は =#REF!（投げない）', TO5.開く('=SUM(Table1[a])', { sheet: 0, r: 0, c: 0 }) === REF);
  ok('設定が投げても表の字を持たない式は同じ字', TO5.開く('=1+1', { sheet: 0, r: 0, c: 0 }) === '=1+1');
  /* LET / LAMBDA の仮の名前と列名が同じ a */
  const e = 開く('=LET(a,1,SUM(Table1[a]))');
  ok('LET の仮の名前 a と 列名 a が同じでも 表の字だけ開く', /^=LET\(a,1,SUM\(/.test(e) && e.indexOf('[') < 0, e);
}
{
  /* ★列名を替える（β2b）★＝表名[旧] と 自分の表の中の [@旧] だけ・文字列と 別の表と 指定子は 触らない */
  const TOm = require(path.join(ROOT, 'lib', 'table-open.js'));
  const R = (f, 自分, 新) => TOm.列名を替える(f, 'T1', 'b', 新 || 'bb', !!自分);
  const 組 = [
    ['=SUM(T1[b])', 0, '=SUM(T1[bb])'], ['=SUM(t1[B])', 0, '=SUM(t1[bb])'], ['=SUM(T1[[a]:[b]])', 0, '=SUM(T1[[a]:[bb]])'],
    ['=T1[[#見出し],[b]]', 0, '=T1[[#見出し],[bb]]'], ['="T1[b]"', 0, '="T1[b]"'], ["='T1[b]'!A1", 0, "='T1[b]'!A1"], ['=SUM(T2[b])', 0, '=SUM(T2[b])'],
    ['=[@b]*2', 1, '=[@bb]*2'], ['=[@b]*2', 0, '=[@b]*2'], ['=[1]Sheet1!A1+T1[b]', 0, '=[1]Sheet1!A1+T1[bb]'], ['=SUM(T1[a])', 0, '=SUM(T1[a])'],
    ['=SUM(T1[[#すべて],[b]])+T1[@b]', 0, '=SUM(T1[[#すべて],[bb]])+T1[@bb]'], ['=1+1', 0, '=1+1'], ['=SUM(T1b[b])', 0, '=SUM(T1b[b])'],
  ];
  for (const [f, 自分, 期待] of 組) { const 出 = R(f, 自分); ok('列名を替える ' + f + (自分 ? '（表の中）' : ''), 出 === 期待, 出); }
  ok("列名を替える 新しい名の逃がし a[1] → [[a'[1']]]", R('=SUM(T1[b])', 0, 'a[1]') === "=SUM(T1[[a'[1']]])", R('=SUM(T1[b])', 0, 'a[1]'));
  ok('列名を替える @ と 空白の名 → [@[x y]]', R('=[@b]', 1, 'x y') === '=[@[x y]]', R('=[@b]', 1, 'x y'));
  ok("列名を替える 逃がした旧 '#x を 解いて比べる", TOm.列名を替える("=SUM(T1['#x])", 'T1', '#x', 'y', false) === '=SUM(T1[y])');
}
if (SELF) {
  /* 自分で壊して赤になるか：書き換えが別の字を返す／旗が効かない */
  const TO = 新しい(T1, true); TO.旗を立てる(true);
  const x = TO.開く('=SUM(Table1[a])', { sheet: 0, r: 12, c: 5 });
  ok('(壊し) 書き換えが字でない物を返したら =#REF!', x === 'x' ? false : x === REF);
}
console.log(赤 ? `\n${赤} 赤` : '\n全部 ok');
process.exit(赤 ? 1 : 0);
