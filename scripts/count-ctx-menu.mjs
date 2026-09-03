/* ★右クリック（セル）は 今 何個 / 相手は 何個★ — ★1本の 数字を 手で 書かない為の 道具★
 *   分母 … docs/excel-commandbars-2026-08-30.tsv の `Cell` バー
 *          （名前で 重複を 除く 87）− ★外の 会社の 物 20★ ＝ ★67★
 *   分子 … lib/ctx-menu.js の 表を ★子まで 歩いて★ 上の 67 と 名前で 突き合わせた 数
 *   使い方 … node scripts/count-ctx-menu.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ★物差し★＝見えない字と アクセスキー（COM は `(&T)`・TSV は `(T)`）と 末尾の … を 落とす */
export const 掃除 = (s) => String(s || '')
  .replace(/[​‌‍﻿]/g, '')
  .replace(/\(&?[A-Za-z0-9]\)/g, '')
  .replace(/\.\.\.$/, '')
  .replace(/\s+/g, '')
  .trim();

/* ★外の 会社の 物（うちだけでは 作れない）＝20★ */
export const 外の会社の物 = [
  'Paste as Table with Copilot', 'Copilot', 'Copilot とチャットする',
  'カスタマイズされたテーブルの作成', '推奨される Copilot プロンプト',
  'Python 出力', 'Python オブジェクト', 'Excel の値',
  'データの種類', 'データ型カードを表示', '設定の更新をしています', '更新', '変更', 'テキストに変換',
  '翻訳', 'スマート検索',
  'セル内の画像', 'セルの上に配置', '参照の作成',
  'アプリのスキルを開く'
].map(掃除);

export function 相手() {
  const tsv = fs.readFileSync(path.join(ROOT, 'docs/excel-commandbars-2026-08-30.tsv'), 'utf8');
  const 全 = new Map();
  for (const l of tsv.split(/\r?\n/)) {
    if (!l || l[0] === '#') continue;
    const c = l.split('\t');
    if (c[0] !== 'Cell') continue;
    const n = 掃除(c[2]);
    if (n && !全.has(n)) 全.set(n, c[2]);
  }
  const 残 = [...全.keys()].filter((n) => 外の会社の物.indexOf(n) < 0);
  return { 全部: 全.size, 外: 全.size - 残.length, 分母: 残 };
}

export function うち() {
  const src = fs.readFileSync(path.join(ROOT, 'lib/ctx-menu.js'), 'utf8');
  const mod = { exports: {} };
  new Function('module', 'exports', src)(mod, mod.exports);
  const 表 = mod.exports.表 || [];
  const 出 = [];
  (function 歩く(a) {
    for (const v of a) { if (v.名) 出.push(v); if (v.子) 歩く(v.子); }
  })(表);
  return 出;
}

/* ★字を 出すのは 自分で 走らせた時だけ★（試験から 呼ぶ時は 黙る） */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const 相 = 相手();
  const 我 = うち();
  const 我名 = 我.map((v) => 掃除(v.名));
  const 当たり = 相.分母.filter((n) => 我名.indexOf(n) >= 0);

  console.log('★相手★ Cell バー 名前で重複を除く ' + 相.全部
    + ' − 外の会社の物 ' + 相.外 + ' ＝ ★分母 ' + 相.分母.length + '★');
  console.log('★うち★ 表を 子まで 歩いた ' + 我.length + ' 個');
  console.log('★★' + 当たり.length + ' / ' + 相.分母.length + '★★');
  console.log('  当たり … ' + 当たり.join('・'));
  console.log('  ★うちにしか 無い（Excel の Cell バーに 名前が 無い）★ … '
    + 我名.filter((n) => 相.分母.indexOf(n) < 0).join('・'));
}
