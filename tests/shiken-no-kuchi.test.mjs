/* shiken-no-kuchi.test.mjs — ★実の倉庫に触る道具の門「試験用の口か」が 正しく 止めるか★（2026-10-10）
 *  門＝メールの +タグ が 白名簿（e0test）に 在る 時だけ 通す（tests/shiken-no-kuchi.mjs）。
 *  作り物の 箱だけで 当てる（本物の メールは ここにも 書かない）。
 */
import { 試験の口か, 許すタグ } from './shiken-no-kuchi.mjs';

let 緑 = 0, 赤 = 0;
const T = (n, ok) => { if (ok) { 緑++; console.log('  ok   ' + n); } else { 赤++; console.log('  NG   ' + n); } };
console.log('[shiken-no-kuchi] ★試験用の 口か の 門★');
T('★白名簿は e0test だけ★', 許すタグ.length === 1 && 許すタグ[0] === 'e0test');
T('通す：mihon+e0test@example.com', 試験の口か('mihon+e0test@example.com'));
const 止める = [
  ['タグ 無し', 'mihon@example.com'],
  ['別の タグ', 'mihon+honban@example.com'],
  ['タグの 一部だけ 同じ', 'mihon+e0test2@example.com'],
  ['タグが 大文字', 'mihon+E0TEST@example.com'],
  ['+ が 2つ', 'mihon+x+e0test@example.com'],
  ['空白 入り', 'mihon +e0test@example.com'],
  ['@ が 無い', 'mihon+e0test'],
  ['ドメインに 点が 無い', 'mihon+e0test@example'],
  ['空', ''],
  ['undefined', undefined],
];
for (const [n, e] of 止める) T('止める：' + n, !試験の口か(e));
console.log('\nshiken-no-kuchi: ' + 緑 + ' 緑 / ' + 赤 + ' 赤');
process.exit(赤 ? 1 : 0);
