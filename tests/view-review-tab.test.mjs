/* view-review-tab.test.mjs — ★表示（ズーム）と 校閲（保護・数）★ 2026-08-30
 *
 *  ★真値（実Excel 16.0 で 実測）★
 *    tools/measure-view-tab.ps1
 *      ・View の 既定 = 1（標準）／2=改ページプレビュー（★Zoom が 60 に なる★）／3=ページレイアウト
 *      ・Zoom は ★10〜400 が 入る★（★5 も 401 も 入らない★）／既定 100
 *      ・A1:E10 に 合わせたら Zoom=258（★窓の 大きさで 変わる数★＝真似ない）
 *      ・分割 … C5 で Split=True → SplitRow=4 / SplitColumn=2
 *    tools/measure-review-tab.ps1
 *      ・ブックの保護 … 既定 構造=False。★守ると シートが 足せない★・外すと 足せる
 *      ・メモ … 作者つき（作者＝Excelを 使っている人の名）・★既定は 隠れている★・形 93 × 54.8
 *      ・範囲の編集を許可する … 名前＋範囲を 持つ（既定 0個）
 *      ・統計 … シート数／中身の在るセル／式／字／数 を 数えられる
 *
 *  走らせ方: node tests/view-review-tab.test.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(pathToFileURL(path.join(ROOT, 'package.json')));
const 壊す = process.argv.includes('--self-test');
let 緑 = 0, 赤 = 0;
const ok = (名, 条件, 添え) => {
  if (条件) { 緑++; console.log('  ok   ' + 名); }
  else { 赤++; console.log('  ★NG★ ' + 名 + (添え !== undefined ? '  … ' + 添え : '')); }
};

const book = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');

function 抜く(名) {
  const i = book.indexOf('function ' + 名 + '(');
  if (i < 0) return null;
  let d = 0; const j = book.indexOf('{', i);
  for (let k = j; k < book.length; k++) {
    if (book[k] === '{') d++;
    else if (book[k] === '}') { d--; if (d === 0) return book.slice(i, k + 1); }
  }
  return null;
}

console.log('\n[① 測った 道具が 残っている]');
ok('tools/measure-view-tab.ps1 が 在る', fs.existsSync(path.join(ROOT, 'tools/measure-view-tab.ps1')));
ok('tools/measure-review-tab.ps1 が 在る', fs.existsSync(path.join(ROOT, 'tools/measure-review-tab.ps1')));
ok('★測った 中に 人の 名前を 残していない★',
  !/矢野/.test(book) && !/矢野/.test(fs.readFileSync(path.join(ROOT, 'tools/measure-review-tab.ps1'), 'utf8')));

console.log('\n[② ズーム（実測＝10〜400）]');
for (const n of ['ズームの窓を開く', 'ズームを決めて閉じる', '選択範囲に合わせる']) ok(n + ' が 在る', !!抜く(n));
ok('窓が 在る', /id="zoomOverlay"/.test(book));
ok('★下は 10★（前は 25 だった＝実測で 直した）', /var ズームの下 = 10/.test(book));
ok('★上は 400★', /ズームの上 = 400/.test(book));
ok('★決める所も 0.10 まで 下げた★', /Math\.max\(0\.10, Math\.min\(4, 倍\)\)/.test(book));
ok('★外れた数は 入れずに 理由を 出す★', /％から ' \+ ズームの上 \+ '％までです/.test(book));
{
  /* 範囲に 合わせる 計算（★数は 窓の 大きさ次第＝考え方だけ 見る★） */
  const f = new Function('selR1', 'selR2', 'selC1', 'selC2', 'sheets', 'activeSheet',
    'COL_W', 'ROW_H', 'wrapW', 'wrapH', 'HDR_W', 'HDR_H', 'ズームの下', 'ズームの上',
    'ズームを決める', 'ズームの窓を閉じる', 'notify',
    抜く('選択範囲に合わせる') + '\nreturn 選択範囲に合わせる;');
  let 決めた = null;
  const 走らす = (r2, c2, W, H) => {
    決めた = null;
    return f(0, r2, 0, c2, [{ colW: {}, rowH: {} }], 0, 80, 22, W, H, 46, 22, 10, 400,
      (v) => { 決めた = v; }, () => {}, () => {})();
  };
  const 大 = 走らす(9, 4, 1200, 700);      /* 5列×10行＝400x220 が 1146x656 に 入る */
  ok('★小さい所を 選ぶと 大きく なる★', 大 > 100, String(大));
  const 小 = 走らす(99, 49, 400, 300);     /* 50列×100行＝広い */
  ok('★広い所を 選ぶと 小さく なる★', 小 < 100, String(小));
  ok('★下限（10）より 下には しない★', 小 >= 10, String(小));
  const 上 = 走らす(0, 0, 4000, 4000);
  ok('★上限（400）より 上には しない★', 上 <= 400, String(上));
}

console.log('\n[③ ブックの保護（実測＝守ると シートが 足せない）]');
for (const n of ['ブックの保護を開く', 'ブックの保護を決める', 'ブックの守りに引っかかる']) ok(n + ' が 在る', !!抜く(n));
ok('窓が 在る', /id="bookProtOverlay"/.test(book));
ok('★はじめは 守っていない（実測 構造=False）★', /var ブックを守っている = false;/.test(book));
ok('★シートを 足す前に 門を 通る★',
  /function addSheet\(\)\{[\s\S]{0,200}ブックの守りに引っかかる\('シートを 足す事'\)/.test(book));
ok('★止めた時は 理由を 出す（黙って 素通りさせない）★', /ブックを 守っています★＝/.test(book));
ok('★合い言葉を 出さない（守れているふりを しない）★', /合い言葉（パスワード）は 付けられません/.test(book));
{
  const f = new Function('notify', 'ブックを守っている',
    抜く('ブックの守りに引っかかる') + '\nreturn ブックの守りに引っかかる;');
  const 言った = [];
  ok('守っていなければ 通す', f((m) => 言った.push(m), false)('シートを 足す事') === false);
  ok('★守っていたら 止める★', f((m) => 言った.push(m), true)('シートを 足す事') === true);
  ok('  その時 理由を 言う', 言った.length === 1 && /できません/.test(言った[0]), JSON.stringify(言った));
}

console.log('\n[④ 範囲の編集を許可する（実測＝名前＋範囲・既定0個）]');
for (const n of ['編集を許す箱', '範囲の編集を開く', '範囲の編集を足す', '範囲の編集を消す',
  '範囲の編集の一覧', '編集を許された所か']) ok(n + ' が 在る', !!抜く(n));
ok('窓が 在る', /id="editRangeOverlay"/.test(book));
ok('★守っていても 許した所は 書ける★',
  /function ここに書けるか[\s\S]{0,400}編集を許された所か\(r, c\)\) return true;/.test(book));
{
  const f = new Function('sheets', 'activeSheet', 抜く('編集を許された所か') + '\nreturn 編集を許された所か;');
  const s0 = { allowEdit: [{ 名: 'は1', r1: 1, c1: 1, r2: 3, c2: 3 }] };
  const 中か = f([s0], 0);
  ok('中は true', 中か(2, 2) === true);
  ok('へりも true', 中か(1, 1) === true && 中か(3, 3) === true);
  ok('外は false', 中か(0, 0) === false && 中か(4, 4) === false);
  ok('1つも 無ければ false', f([{}], 0)(0, 0) === false);
}
ok('★同じ 名前は 足せない★', /その 名前は もう 在ります/.test(book));

console.log('\n[⑤ ブックの数（数えた物だけ 出す）]');
for (const n of ['ブックの数を数える', 'ブックの数を開く', 'ブックの数を閉じる']) ok(n + ' が 在る', !!抜く(n));
ok('窓が 在る', /id="statsOverlay"/.test(book));
{
  const f = new Function('sheets', 抜く('ブックの数を数える') + '\nreturn ブックの数を数える;');
  const 数 = f([
    { data: { '0,0': { v: 'あいう' }, '0,1': { v: 123 }, '1,0': { f: '=A1', d: '5' } },
      comments: { '0,0': {} }, links: {} },
    { data: { '0,0': { v: '' }, '0,1': { v: 'x' } } },
  ])();
  ok('シートは 2', 数.シート === 2, String(数.シート));
  ok('★中身の 在るセルだけ 数える（空は 数えない）★', 数.セル === 4, JSON.stringify(数));
  ok('式は 1', 数.式 === 1, String(数.式));
  ok('数は 1', 数.数 === 1, String(数.数));
  ok('字は 2', 数.字 === 2, String(数.字));
  ok('字の 数は 3+3+1+1=8', 数.文字数 === 8, String(数.文字数));
  ok('付箋は 1', 数.付箋 === 1, String(数.付箋));
}
ok('★数えた物だけ 出すと 書いてある★', /数えたのは 中身の 在るセルだけ/.test(book));
ok('★alert / prompt / confirm を 使っていない★', !/\balert\(|\bprompt\(|\bconfirm\(/.test(book));

console.log('\n[⑥ リボンから 押せる]');
{
  const ACT = require_(path.join(ROOT, 'lib/ribbon-actions.js'));
  const g = globalThis, 前w = g.window;
  for (const [ボタン, 呼ぶ名] of [
    ['ズーム', 'ズームの窓を開く'], ['選択範囲に合わせて拡大縮小', '選択範囲に合わせる'],
    ['ブックの保護', 'ブックの保護を開く'], ['範囲の編集を許可する', '範囲の編集を開く'],
    ['ブックの統計情報', 'ブックの数を開く'],
  ]) {
    let 受け = null;
    const w = {}; w[呼ぶ名] = function () { 受け = 'ok'; };
    g.window = w;
    ACT[ボタン]();
    g.window = 前w;
    ok('「' + ボタン + '」→ ' + 呼ぶ名, 受け === 'ok', String(受け));
  }
}

console.log('\nview-review-tab: ' + 緑 + '/' + (緑 + 赤) + ' passed');

if (壊す) {
  console.log('\n★--self-test＝わざと 壊して 赤に なるか★');
  let 素通り = 0;
  /* 壊し① ズームの 下が 25 に 戻っていないか（実測は 10） */
  if (/Math\.max\(0\.25, Math\.min\(4, 倍\)\)/.test(book)) {
    素通り++; console.log('  ★素通り★ ズームの 下が 25 に 戻っている（実測は 10）');
  } else console.log('  ok   ズームの 下は 10');
  /* 壊し② 守りの 門が 外れていないか */
  if (!/ブックの守りに引っかかる\('シートを 足す事'\)/.test(book)) {
    素通り++; console.log('  ★素通り★ シートを 足す所の 門が 無い');
  } else console.log('  ok   シートを 足す所に 門が 在る');
  /* 壊し③ 許可範囲を 見ずに 保護だけで 決めていないか */
  if (!/編集を許された所か\(r, c\)\) return true;/.test(book)) {
    素通り++; console.log('  ★素通り★ 許した範囲を 見ていない');
  } else console.log('  ok   許した範囲を 見ている');
  if (素通り) { console.log('★抜け道 ' + 素通り + '件★'); process.exit(1); }
  console.log('  ok   抜け道 0件');
}
process.exit(赤 ? 1 : 0);
