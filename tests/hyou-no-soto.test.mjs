/* hyou-no-soto.test.mjs — ★診断2本目「ほかの表の その行を 見ている」★ 2026-09-04
 *
 *  ★なぜ 作ったか（司さんの 実物で 実際に 出た）★
 *    2026-09-03 に 8月の 行を コピーして 9月を 作った時、
 *    ★AF・AH・AJ の 3列 × 31行 が 8月の 表(Table23) の [@列名] を 指したまま★ 残っていた。
 *    ⇒ 「その行」は ★自分の表の 中でしか 決まらない★ので Excel も 答えを 出せない
 *    ⇒ IFERROR に 包まれているので ★画面は 0★＝★エラーが 出ず 誰も 気づけない★
 *    ⇒ ★数字を 入れても ずっと 0 のまま★
 *
 *  ★司さんの 指摘（2026-09-04）★
 *    「分かったんなら ★理由と 修正方法まで★ 教えれないかんやろが
 *      それが 出来ずに Exally内でも ユーザーに 聞くつもりか？」
 *    ⇒ ★聞かない★。★見つけて・なぜかを 言って・直し方（前→後）まで 出す★。
 *
 *  ★ここでは 直さない★＝式を 書き換えるのは 客の 決め。★言うだけ★。
 *
 *  走らせ方: node tests/hyou-no-soto.test.mjs [--self-test]
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const TR = require_(path.join(ROOT, 'lib/table-refs.js'));
const Shindan = require_(path.join(ROOT, 'lib/shindan.js'));

let pass = 0, fail = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};

/* ★実物と 同じ 形で 作る★（計算シート・8月=Table23・9月=Table24）
   行は 0 から 数える。実物 … Table23 行233〜265 ／ Table24 行267〜299（見出し1・合計1） */
/* ★名前は 司さんの 実物と 同じ★＝★客が 数式バーで 見る 名前は R8.8 / R8.9★
   （SheetJS が 書く Table23 / Table24 は ★客の 画面には 出ない★＝それで 助言すると 探せない） */
/* ★列の 一覧★＝32番目が 正岡ｈ・34番目が 向垣内ｈ（実物と 同じ 並び） */
const 列たち = (function () { var a = []; for (var i = 0; i < 38; i++) a.push('列' + i); a[32] = '正岡ｈ'; a[34] = '向垣内ｈ'; a[5] = '売上'; return a; })();
const 表 = [
  { id: 23, name: 'R8.8', sheet: '計算', rw1: 233, rw2: 265, cl1: 0, cl2: 37, header: 1, totals: 1, cols: 列たち },
  { id: 24, name: 'R8.9', sheet: '計算', rw1: 267, rw2: 299, cl1: 0, cl2: 37, header: 1, totals: 1, cols: 列たち },
];
const byId = { 23: 表[0], 24: 表[1] };
/* 見出しの 字（列名を 出す為）。Table23 と Table24 の 33列目＝AG＝「正岡ｈ」 */
const wb = { Sheets: { 計算: { AG234: { v: '正岡ｈ' }, AG268: { v: '正岡ｈ' } } } };
const その行 = (id, col) => ({ id: id, code: 16, coltype: 1, colFirst: col, colLast: col });
const 中身 = (id, col) => ({ id: id, code: 0, coltype: 1, colFirst: col, colLast: col });

console.log('');
console.log('[hyou-no-soto] ★ほかの表の「その行」を 見ている所★');

/* ── ① 実物と 同じ形＝見つける ── */
{
  /* 計算!AF269（0から数えると 行268・列31）が Table23[@正岡ｈ] を 指す */
  const x = TR._断りを仕分ける('計算', 268, 31, [その行(24, 12), その行(23, 32)], byId, 表, wb);
  T('★ほかの表の その行を 指していたら 見つける★', !!x, '見つけていない');
  T('★種類が thisrow_other_table★', x && x.種類 === 'thisrow_other_table');
  T('★場所が セルの名前で 出る（AF269）★', x && x.セル === 'AF269', x && x.セル);
  T('★客が 見る 名前で 出す（R8.8 → R8.9／Table23 では ない）★',
    x && x.指した表 === 'R8.8' && x.自分の表 === 'R8.9',
    x && (x.指した表 + ' / ' + x.自分の表));
  T('★列名を 見出しから 取る（正岡ｈ）★', x && x.列名 === '正岡ｈ', x && String(x.列名));
  T('★直し方が 前→後 で 出る★',
    x && x.直し方 && x.直し方.前 === 'R8.8' && x.直し方.後 === 'R8.9');
  T('★直し方の 字（列名は そのまま）★',
    Shindan.直し方の字(x) === 'R8.8[@正岡ｈ]　→　R8.9[@正岡ｈ]',
    Shindan.直し方の字(x));
  T('★行と列を そのまま 出す（画面が その場所へ 飛べる）★', x && x.r === 268 && x.c === 31);
}

/* ── ② 出しては いけない物（★空振りで 客を 驚かせない★）── */
T('★自分の表の その行は 出さない★',
  TR._断りを仕分ける('計算', 268, 31, [その行(24, 32)], byId, 表, wb) === null);
T('★その行では ない（[#Data]）物は 出さない★',
  TR._断りを仕分ける('計算', 268, 31, [中身(23, 32)], byId, 表, wb) === null);
T('★どの表にも 入っていない セルは 出さない（自分の表が 分からない）★',
  TR._断りを仕分ける('計算', 500, 31, [その行(23, 32)], byId, 表, wb) === null);
T('★知らない表を 指している時は 出さない（当て推量しない）★',
  TR._断りを仕分ける('計算', 268, 31, [その行(99, 32)], byId, 表, wb) === null);
{
  /* ★ほかの表でも その行が 中に 在るなら 出さない★（Excel は 答えを 出せる） */
  const 重なり = [
    { id: 23, name: 'R8.8', sheet: '計算', rw1: 233, rw2: 299, cl1: 0, cl2: 37, header: 1, totals: 1, cols: 列たち },
    表[1],
  ];
  T('★ほかの表でも その行が 中身の 行の 中なら 出さない★',
    TR._断りを仕分ける('計算', 268, 31, [その行(23, 32)], { 23: 重なり[0], 24: 表[1] }, 重なり, wb) === null);
}
/* ★自己確認が 教えてくれた 抜け その1★
   ★自分の表の その行でも、合計の行から 呼べば 中身の 行の 外★になる。
   その時に 出してしまうと 直し方が「Table24→Table24」＝★意味の 無い 助言★に なる。 */
T('★自分の表なら 合計の行から 呼んでも 出さない（前＝後の 助言を 出さない）★',
  TR._断りを仕分ける('計算', 299, 31, [その行(24, 32)], byId, 表, wb) === null);
/* ★自己確認が 教えてくれた 抜け その2★
   ★ほかの表でも その行が 中身の 中に 在るなら Excel は 答えを 出せる＝出しては いけない★
   （自分の表と 重ならない 形で 試す＝列を ずらす） */
T('★ほかの表でも その行が 中身の 中なら 出さない（列をずらして 確かめる）★',
  (() => {
    const 長い = { id: 23, sheet: '計算', rw1: 233, rw2: 299, cl1: 0, cl2: 10, header: 1, totals: 1 };
    return TR._断りを仕分ける('計算', 268, 31, [その行(23, 5)], { 23: 長い, 24: 表[1] }, [表[1], 長い], wb) === null;
  })());
T('★別のシートの 表を 指していたら 出す（行が 合っていても 別の紙）★',
  (() => {
    const 別 = [{ id: 23, name: 'R8.8', sheet: '売上表', rw1: 233, rw2: 299, cl1: 0, cl2: 37, header: 1, totals: 1, cols: 列たち }, 表[1]];
    const x = TR._断りを仕分ける('計算', 268, 31, [その行(23, 32)], { 23: 別[0], 24: 表[1] }, 別, wb);
    return !!x && x.指した表 === 'R8.8';
  })());

/* ── ②-b ★.xlsx / .xlsm でも 同じ★（形式で 出たり 出なかったり させない）── */
{
  /* ★短い形（画面の 見え方）と 長い形（実Excel が 保存する 形）の 両方★ */
  const f = '=IFERROR(MAX(R8.9[@売上]*2, 1000*R8.8[@正岡ｈ]), 0)';
  const f長 = '=IFERROR(MAX(R8.9[[#This Row],[売上]]*2, 1000*R8.8[[#This Row],[正岡ｈ]]), 0)';
  const x = TR._断りを仕分ける文字('計算', { r: 268, c: 31 }, f, 表, 表[1]);
  T('★.xlsx の 文字の 式でも 見つける★', !!x);
  T('★.xlsx でも 同じ 直し方（R8.8 → R8.9）★',
    x && x.直し方.前 === 'R8.8' && x.直し方.後 === 'R8.9' && x.列名 === '正岡ｈ',
    x && JSON.stringify(x.直し方) + ' ' + x.列名);
  T('★.xlsx でも 種類と 場所は 同じ形★',
    x && x.種類 === 'thisrow_other_table' && x.セル === 'AF269');
  T('★.xlsx で 自分の表だけなら 出さない★',
    TR._断りを仕分ける文字('計算', { r: 268, c: 31 }, '=R8.9[@正岡ｈ]', 表, 表[1]) === null);
  T('★.xlsx で 知らない名前は 出さない（当て推量しない）★',
    TR._断りを仕分ける文字('計算', { r: 268, c: 31 }, '=しらない表[@正岡ｈ]', 表, 表[1]) === null);
  const x長 = TR._断りを仕分ける文字('計算', { r: 268, c: 31 }, f長, 表, 表[1]);
  T('★★実Excel が 保存する 長い形でも 見つける（[[#This Row],[列名]]）★★', !!x長,
    '★字で 探す 作りだと ここが 0件に なる（2026-09-04 実際に 踏んだ）★');
  T('★長い形でも 同じ 直し方★',
    x長 && x長.直し方.前 === 'R8.8' && x長.直し方.後 === 'R8.9' && x長.列名 === '正岡ｈ');
  T('★.xlsx で その行で ない（[列名]）物は 出さない★',
    TR._断りを仕分ける文字('計算', { r: 268, c: 31 }, '=SUM(R8.8[正岡ｈ])', 表, 表[1]) === null);
  /* ★自己確認が 教えてくれた 抜け★（xlsb 側と 同じ 2つを xlsx 側にも） */
  T('★.xlsx で 自分の表なら 合計の行から 呼んでも 出さない★',
    TR._断りを仕分ける文字('計算', { r: 299, c: 31 }, '=R8.9[@正岡ｈ]', 表, 表[1]) === null);
  T('★.xlsx で ほかの表でも その行が 中身の 中なら 出さない★',
    (() => {
      const 長い = { id: 23, name: 'R8.8', sheet: '計算', rw1: 233, rw2: 299, cl1: 0, cl2: 10, header: 1, totals: 1, cols: 列たち };
      return TR._断りを仕分ける文字('計算', { r: 268, c: 31 }, '=R8.8[@正岡ｈ]', [表[1], 長い], 表[1]) === null;
    })());
}

/* ── ②-c ★★実Excel が 作った 見本の ブックで 実際に 押す★★ ──
   ★作り物の 引数で 試すだけでは 足りない★（2026-09-04 実際に 踏んだ）：
   実Excel が 保存する 形は ★R8.8[[#This Row],[正岡ｈ]]★ で、
   ★[@正岡ｈ] の 短い形では ない★＝字で 探す 作りは ★1件も 見つけられなかった★。
   ⇒ ★実Excel に 作らせた 見本を repo に 置いて 毎回 通す★
      tools/make-mihon.ps1 で 作った（司さんの 実物は 1バイトも 触っていない）
      中身 … 表2つ（R8.8＝A1:C5 ／ R8.9＝A8:C12）、R8.9 の C列が R8.8 の その行を 指す
      ★Excel 自身も 答えを 出せず 値は 0★（エラーは 出ない＝客は 気づけない） */
{
  const fs = await import('node:fs');
  const XLSX = require_(path.join(ROOT, 'lib/xlsx.full.min.js'));
  const ZipSurgeon = require_(path.join(ROOT, 'lib/zip-surgeon.js'));
  const TR2 = require_(path.join(ROOT, 'lib/table-refs.js'));
  for (const [形, 名] of [['xlsx', 'hyou-no-soto-sample.xlsx'], ['xlsb', 'hyou-no-soto-sample.xlsb']]) {
    const 道 = path.join(ROOT, 'tests/fixtures', 名);
    if (!fs.existsSync(道)) { T('★見本が 在る（' + 名 + '）★', false, '★無い＝この 試験は 空振り★'); continue; }
    const bytes = new Uint8Array(fs.readFileSync(道));
    const wb = XLSX.read(bytes, { type: 'array', cellFormula: true });
    const rr = await TR2.resolve(bytes, 形, wb, ZipSurgeon);
    const 出 = (rr.断り || []).filter((x) => x.種類 === 'thisrow_other_table');
    T('★' + 形 + ' の 見本で 見つける（4か所）★', 出.length === 4, '見つけた ' + 出.length + '件');
    T('★' + 形 + ' の 直し方が 正しい（R8.8[@正岡ｈ] → R8.9[@正岡ｈ]）★',
      出.length > 0 && 出[0].直し方.前 === 'R8.8' && 出[0].直し方.後 === 'R8.9' && 出[0].列名 === '正岡ｈ',
      出.length ? (出[0].直し方.前 + '→' + 出[0].直し方.後 + ' [@' + 出[0].列名 + ']') : '(0件)');
    T('★' + 形 + ' の 場所が 正しい（計算!C9 から）★',
      出.length > 0 && 出[0].シート === '計算' && 出[0].セル === 'C9', 出.length ? 出[0].セル : '(0件)');
    T('★' + 形 + ' Excel 自身も 0 を 返している（エラーが 出ない＝客は 気づけない）★',
      (wb.Sheets['計算'].C9 || {}).v === 0, JSON.stringify((wb.Sheets['計算'].C9 || {}).v));
    /* ★★答えを 実Excel に 合わせる★★（2026-09-04＝★絵を 開いて 見つけた★）
       断ると 式ごと 読めず ★IFERROR まで 道連れで #ERROR★＝実Excel の 0 と 違う。
       ⇒★Excel と 同じ エラーの 印を 置く★＝IFERROR が 拾って 0 に なる。 */
    const 直し = rr.fixes['計算|8,2'] || '';
    T('★' + 形 + ' その セルを 直している（断って 放り出していない）★', !!直し, '(直していない)');
    T('★' + 形 + ' ★Excel と 同じく エラーの 印を 置く（IFERROR が 拾える）★★',
      直し.indexOf('#VALUE!') >= 0 && 直し.indexOf('IFERROR') >= 0, 直し.slice(0, 120));
  }
}

/* ── ③ 客に 見せる 言葉 ── */
{
  const w = Shindan.言葉('thisrow_other_table', 62);
  T('★言葉が 在る★', !!w);
  T('★何か所か を 言う★', w && w.本文.indexOf('62か所') >= 0);
  T('★「0 のまま」と 言う（気づけない事を 言う）★', w && w.本文.indexOf('0 のまま') >= 0);
  T('★直し方を 言う（聞かない）★', w && w.つぎ.indexOf('直し方は1つ') >= 0, w && w.つぎ);
  T('★列名は そのまま と 言う★', w && w.つぎ.indexOf('列名はそのまま') >= 0);
  T('★金額らしき数を 出さない★', w && (w.本文 + w.つぎ).match(/\d{6,}/) === null);
}

/* ── ④ 画面に つないである（台帳に 書いただけで 出ていない、を 防ぐ）── */
{
  const fs = await import('node:fs');
  const html = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
  T('★画面が 断りを 受け取っている★', html.indexOf('res.表の断り') > 0);
  T('★画面が 種類で 選り分けている★', html.indexOf("'thisrow_other_table'") > 0);
  T('★画面が 直し方の字を 出している★', html.indexOf('Shindan.直し方の字') > 0);
  T('★ボタンの 数が 2本の 合計★', html.indexOf("'危ない所 ' + (n1 + n2) + 'か所'") > 0);
  const open = fs.readFileSync(path.join(ROOT, 'js/book-open.js'), 'utf8');
  T('★読み込みが 断りを 渡している★', open.indexOf('表の断り: tr断り') > 0);
  T('★前のファイルの物を 残さない（毎回 入れ替える）★',
    html.indexOf('_hyouNoSoto = (res.表の断り') > 0);
}

/* ── ⑤ ★機械が 見つけた 物を AIへ 渡しているか★（2026-09-04 司さん「なんで できてないんど」）── */
{
  const fs = await import('node:fs');
  const Chizu = require_(path.join(ROOT, 'lib/chizu.js'));
  const Horu = require_(path.join(ROOT, 'lib/horu.js'));
  const 断り = [{ 種類: 'thisrow_other_table', シート: '計算', r: 268, c: 31, セル: 'AF269',
    指した表: 'R8.8', 自分の表: 'R8.9', 列名: '正岡ｈ', 直し方: { 前: 'R8.8', 後: 'R8.9' } }];
  const m = Chizu.作る([{ name: '計算', data: { '0,0': { v: 1 } } }], null, null, { 表の断り: 断り });
  T('★地図に 2本目が 載る（見つけたのに 渡さない、を 防ぐ）★',
    m.字.indexOf('機械が見つけた 危ない所（AIは呼んでいない）その2') > 0
    && m.字.indexOf('ほかの表の「その行」を見ている式') > 0, m.字.slice(-260));
  T('★地図に 直し方が 載る（前→後）★', m.字.indexOf('R8.8[@正岡ｈ]→R8.9[@正岡ｈ]') > 0);
  T('★地図に 何か所かが 載る★', m.字.indexOf('1か所') > 0);
  T('★1つも 無い時は 地図に 出さない（0件で 騒がない）★',
    Chizu.作る([{ name: '計算', data: { '0,0': { v: 1 } } }], null, null, {}).字.indexOf('その2') < 0);
  const html = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
  T('★画面が 地図に 2本目を 渡している★', html.indexOf('表の断り: (typeof _hyouNoSoto') > 0);

  /* ★掘れる回数＝ブックを 掘りきれる 回数★（★5回の 決め打ちに 戻らない為★） */
  const 作る = (n) => { const d = {}; for (let i = 0; i < n; i++) d[i + ',0'] = { v: 1 }; return [{ name: 's', data: d }]; };
  T('★小さいブックでも 5回は 掘れる★', Horu.掘れる回数を決める(作る(10)) === 5);
  T('★実物なみ（21,204セル）なら 掘りきれる 回数まで 増える★',
    Horu.掘れる回数を決める(作る(21204)) * 2000 >= 21204,
    String(Horu.掘れる回数を決める(作る(21204))));
  T('★大きいほど 多く 掘れる（決め打ちに なっていない）★',
    Horu.掘れる回数を決める(作る(50000)) > Horu.掘れる回数を決める(作る(10000)));
  T('★画面が その回数を 使っている（12回の 決め打ちで ない）★',
    html.indexOf('Horu.掘れる回数を決める(sheets)') > 0 && html.indexOf('回 < 掘れる + 2') > 0);
}

/* ── わざと 壊して 赤に なるか ── */
/* ★「出さない」を もう一度 呼ぶだけでは 自己確認に ならない★（同じ物を 2回 見るだけ）
   ⇒ ★本物の 部品を わざと 壊して、この 試験が 赤に なるか を 見る★ */
if (process.argv.includes('--self-test')) {
  console.log('');
  console.log('★本物の 部品を わざと 壊して 赤に なるか★');
  const fs = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const 道 = path.join(ROOT, 'lib/table-refs.js');
  const 元 = fs.readFileSync(道, 'utf8');
  const 壊す = [
    ['★自分の表かどうかを 見なくする★',
      (t) => t.replace('      if (L.id === 自分.id) continue;', '      if (false) continue;')],
    ['★その行（[@列名]）以外も 拾う★',
      (t) => t.replace("      if (BAND_BY_CODE[L.code] !== 'thisRow') continue;", '      if (false) continue;')],
    ['★中身の 行の 中か どうかを 見なくする★',
      (t) => t.replace('      if (先.sheet === sn && 行 >= 中身の頭 && 行 <= 中身の尻) continue;', '      if (false) continue;')],
    ['★直し方（後）を 取り違える★',
      (t) => t.replace('後: 自分の名 },', '後: 先の名 },')],
    ['★番号の 名前（Table23）で 助言してしまう★',
      (t) => t.replace("var 先の名 = (先.name || ('Table' + L.id));", "var 先の名 = 'Table' + L.id;")],
    ['★.xlsx の 側で 自分の表かどうかを 見なくする★',
      (t) => t.replace('      if (名 === own.name) continue;', '      if (false) continue;')],
    ['★.xlsx の 側で 中身の 行か どうかを 見なくする★',
      (t) => t.replace('      if (先.sheet === sn && rc.r >= 中身の頭 && rc.r <= 中身の尻) continue;', '      if (false) continue;')],
    ['★列名を 出さなくする★',
      (t) => t.replace('列名 = String(hc.v);', '列名 = null;')],
  ];
  /* ★lib/horu.js と lib/chizu.js の 側も 壊して 見る★（渡す所が 抜けたら 気づけない） */
  const 別の壊し = [
    /* ★★本当に 動いている 道を 壊す★★（2026-09-04）
       ＝実Excel の 見本を 通す 道。上の 8通りは ★断った 時の 受け皿★を 壊している。 */
    ['lib/table-refs.js', '★実物の 道＝控えるのを やめる（答えは 合うが 誰も 気づけない）★',
      (t) => t.replace('    ctx.断り.push({', '    if (false) ctx.断り.push({')],
    ['lib/table-refs.js', '★実物の 道＝その行が 中か 外かを 見なくする★',
      (t) => t.replace('    return ctx.row >= (def.rw1 + def.header) && ctx.row <= (def.rw2 - def.totals);', '    return true;')],
    ['lib/table-refs.js', '★実物の 道＝Excel と 同じ 答えに しない（#ERROR に 戻す）★',
      (t) => t.replace("        out += formula.slice(prev, h.at) + '#VALUE!';", '        return null;')],
    ['lib/horu.js', '★掘れる回数を 5回の 決め打ちに 戻す★',
      (t) => t.replace('return Math.max(下限, Math.ceil(全部 / Math.max(1, 一度のセル)) + 2);', 'return 下限;')],
    ['lib/chizu.js', '★機械が 見つけた 2本目を 地図に 載せない★',
      (t) => t.replace("      行.push('## 機械が見つけた 危ない所（AIは呼んでいない）その2');", '')],
    ['lib/chizu.js', '★地図に 直し方を 載せない★',
      (t) => t.replace("      行.push('- 例: ' + 直し.join(' / ')", "      行.push('- 例: ' + ''")],
  ];
  for (const [名, f] of 壊す) {
    const 壊れ = f(元);
    if (壊れ === 元) { console.log('  ★素通り★  ' + 名 + '（印が 古い＝直せ）'); fail++; continue; }
    fs.writeFileSync(道, 壊れ);
    let 赤 = false;
    try { execFileSync(process.execPath, [path.join(ROOT, 'tests', 'hyou-no-soto.test.mjs')], { stdio: 'pipe' }); }
    catch (e) { 赤 = true; }
    fs.writeFileSync(道, 元);                 /* ★必ず 戻す★ */
    console.log((赤 ? '  赤くなった  ' : '  ★素通り★  ') + 名);
    if (!赤) fail++;
  }
  T('★本物は 壊していない（戻した）★', fs.readFileSync(道, 'utf8') === 元);
  for (const [部品, 名, f] of 別の壊し) {
    const み = path.join(ROOT, 部品);
    const もと = fs.readFileSync(み, 'utf8');
    const こわれ = f(もと);
    if (こわれ === もと) { console.log('  ★素通り★  ' + 名 + '（印が 古い＝直せ）'); fail++; continue; }
    fs.writeFileSync(み, こわれ);
    let 赤 = false;
    try { execFileSync(process.execPath, [path.join(ROOT, 'tests', 'hyou-no-soto.test.mjs')], { stdio: 'pipe' }); }
    catch (e) { 赤 = true; }
    fs.writeFileSync(み, もと);                 /* ★必ず 戻す★ */
    console.log((赤 ? '  赤くなった  ' : '  ★素通り★  ') + 名 + '（' + 部品 + '）');
    if (!赤) fail++;
    if (fs.readFileSync(み, 'utf8') !== もと) { console.log('  ★戻せていない★ ' + 部品); fail++; }
  }
  T('★言葉を 知らない 種類で 呼んだら null（黙って 何か 出さない）★',
    Shindan.言葉('しらない種類', 1) === null);
  T('★直し方の 字は 中身が 無ければ 空★', Shindan.直し方の字(null) === '');
}

console.log('');
console.log('hyou-no-soto: ' + pass + ' 緑 / ' + fail + ' 赤');
process.exit(fail ? 1 : 0);
