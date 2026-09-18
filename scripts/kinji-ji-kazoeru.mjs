/* kinji-ji-kazoeru.mjs — ★決まりで 禁じられた 字を 数える★（2026-09-18）
 *
 *  ★★決まり★★ `team/global-rules.md` §6／§8（★過去の 失敗パターン（再発防止）★）
 *    ・★スマートクォート（" " 「 」）混入禁止 → ASCII 文字のみ★
 *    ・★Unicode 省略記号（|）禁止 → ... （ASCII 3ピリオド）★
 *    ・★バッククォート種別ミス禁止★
 *
 *  ★★なぜ 全部を 直さないか★★
 *    ★2026-09-18 に 数え直しました★（★経営者1 と 私で 別々に★）
 *      `|` は ★覚書き（コメント）の 中だけ★ | 生きた 行 ★0件★
 *    ⇒★★今 壊れる 物は 在りません★★
 *    ⇒★2,000件 近くを 触るのは ★今 動いて いる 物を 触る★★＝★止めました★
 *    ⇒★★代わりに「今日の 数」を 決め打ちに して ★増えたら 赤★★★
 *      ＝★「これから 書く 分は ASCII」が ★心がけ★では なく ★機械★に なります★
 *
 *  ★★私が 1回 踏んだ 罠★★
 *    `grep -o '[||||]'` | ★11,055件★と 出ました
 *    ⇒★★バイトで 当たって いました★★（多バイトの 字を 括弧に 入れた）
 *    ⇒★★だから この 道具は 字で 数えます★★（`String.split` の 長さ）
 *
 *  使い方: node scripts/kinji-ji-kazoeru.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ★見る 物★（★見る 範囲を 先に 数えて 書く★） */
const 見る = [
  { 名: 'lib', 道: 'lib', 拡: ['.js'] },
  { 名: 'tests', 道: 'tests', 拡: ['.mjs', '.js'] },
  { 名: 'scripts', 道: 'scripts', 拡: ['.mjs', '.js'] },
];

/* ══ ★★見ない 物（★名指し＋訳★）★★ ══
     ★2026-09-18 に 1本ずつ 中を 見て 決めました★（★数だけで 決めて いません★）

     ⑴★`*.min.js`★ | ★借り物です★
        `lib/xlsx.full.min.js` | SheetJS 0.20.3（★Apache-2.0★・951,904 B）
        ★配り元と 1バイトも 違いません★（`lib/xlsx-0.20.3-DOKOKARA.md`）
        ⇒★★借り物の 中の 字を 数えても 意味が ありません★★（★触れません★）
        ⇒★ここに スマートクォート 92件★

     ⑵★`lib/symbols.js`★ | ★★字そのものが データです★★
        43〜46行 | ★左二重引用符／右二重引用符／左引用符／右引用符★ の ★名前の 表★
        ⇒★★この 字を 消すと 中身が 壊れます★★
        ⇒★スマートクォート 4件★

     ★★この 2つを 外さないと「守れない 門」に なります★★
       ＝★守れない 門は 消されます★ */
const 見ない名 = [
  { 名: 'xlsx.full.min.js', 訳: '★借り物（SheetJS・Apache-2.0）★' },
  { 名: 'symbols.js', 訳: '★字そのものが データ（43〜46行）★' },
];
/* ★★正規表現を やめました★★（2026-09-18）
     ★`[\/]` と 書いた のに `[\/]` に 落ちて いました★
     ＝★逆斜線の 逃がしが 落ちる★（★記憶に 在る 罠★・今日 2回目）
     ⇒★★名前で 比べます＝逆斜線が 1つも 要りません★★
     ⇒★見分け方★ | ★lib が 111本の はずなのに 110本でした★
              ＝★外れた のは 1本だけ★ */
/* ★★★この 道具自身に 禁字を 書きません★★★
     ★訳★ | ★門が 自分を 数えて 永久に 赤に なります★
     ＝★「守る 紙に 本番の 印を 書くな」と 同じ 型★
     ⇒★★コードで 字を 作ります★★（ファイルに その 字が 1つも 無い） */
const 字 = (n) => String.fromCharCode(n);
const 禁字 = [
  { 字: 字(0x2026), 名: '省略記号 U+2026' },
  { 字: 字(0x201C), 名: 'スマート引用符 左 U+201C' },
  { 字: 字(0x201D), 名: 'スマート引用符 右 U+201D' },
  { 字: 字(0x2018), 名: 'スマート引用符 左一重 U+2018' },
  { 字: 字(0x2019), 名: 'スマート引用符 右一重 U+2019' },
];

/* ══ ★★2026-09-18 の 数（★これを 超えたら 赤★）★★ ══
     ★増やさない為の 門です／減らすのは いつでも よい★ */
const 上限 = {
  'lib':     { 0x2026: 1070, 0x201C: 0, 0x201D: 0, 0x2018: 0, 0x2019: 0 },
  'tests':   { 0x2026: 1863, 0x201C: 0, 0x201D: 0, 0x2018: 0, 0x2019: 0 },
  'scripts': { 0x2026: 360, 0x201C: 0, 0x201D: 0, 0x2018: 0, 0x2019: 0 },
};
/* ══ ★★「生きた 行」の 上限★★ ══
     ★2026-09-18 に 数えたら ★0では ありませんでした★★
     ⇒★調べると ★字の 中（'|' の ような 出す 字）★が 大半です★
     ⇒★★これは 壊れる 物では ありません★★（★決まりが 禁じるのは ★混入★★）
     ⇒★★だから 0では なく「今日の 数」を 上限に します★★
     ⇒★減らすのは いつでも よい／★増やさない★のが この 門の 仕事★ */
const 生きた上限 = { 'lib': 54, 'tests': 1019, 'scripts': 160 };

function 集める(道, 拡) {
  const 出 = [];
  const d = path.join(ROOT, 道);
  if (!fs.existsSync(d)) return 出;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) continue;
    if (!拡.includes(path.extname(f))) continue;
    if (見ない名.some((x) => x.名 === f)) continue;   /* ★名前で 外す（逆斜線を 使わない）★ */
    出.push(p);
  }
  return 出;
}

/* ★覚書きを 落とす★（★雑ですが ★生きた 行★ を 甘く 見ない 向き★）
   ＝`//` の 後ろ／`/* | *​/` の 中／`*` で 始まる 行 を 落とす */
function 覚書きを落とす(t) {
  let 出 = '', 中 = false;
  for (const 行 of t.split('\n')) {
    let l = 行;
    if (中) {
      const e = l.indexOf('*/');
      if (e < 0) { 出 += '\n'; continue; }
      l = l.slice(e + 2); 中 = false;
    }
    for (;;) {
      const s = l.indexOf('/*');
      if (s < 0) break;
      const e = l.indexOf('*/', s + 2);
      if (e < 0) { l = l.slice(0, s); 中 = true; break; }
      l = l.slice(0, s) + l.slice(e + 2);
    }
    const c = l.indexOf('//');
    if (c >= 0) l = l.slice(0, c);
    出 += l + '\n';
  }
  return 出;
}

let 赤 = 0;
console.log('');
console.log('[kinji-ji] ★決まりで 禁じられた 字を 数える★（★字で 数えます＝バイトでは ない★）');
console.log('');
for (const g of 見る) {
  const ファイル = 集める(g.道, g.拡);
  const 合 = {}, 生 = {};
  for (const c of 禁字) { 合[c.字] = 0; 生[c.字] = 0; }
  for (const p of ファイル) {
    const t = fs.readFileSync(p, 'utf-8');
    const k = 覚書きを落とす(t);
    for (const c of 禁字) {
      合[c.字] += t.split(c.字).length - 1;
      生[c.字] += k.split(c.字).length - 1;
    }
  }
  console.log('  ★' + g.名 + '★（' + ファイル.length + '本）');
  for (const c of 禁字) {
    if (!合[c.字] && !生[c.字]) continue;
    const 限 = (上限[g.名] || {})[c.字.charCodeAt(0)];
    const だめ = (限 !== undefined && 合[c.字] > 限);
    const 生限 = (生きた上限[g.名] === undefined) ? 0 : 生きた上限[g.名];
    const 生だめ = 生[c.字] > 生限;
    if (だめ || 生だめ) 赤++;
    console.log('    ' + c.名.padEnd(26)
      + ' 全部 ' + String(合[c.字]).padStart(5) + '（上限 ' + 限 + '）'
      + ' ／ ★生きた 行 ' + 生[c.字] + '★（上限 ' + 生限 + '）'
      + (だめ ? '  ★★増えました★★' : '') + (生だめ ? '  ★★生きた 行に 出ました★★' : ''));
  }
  if (禁字.every((c) => !合[c.字])) console.log('    ★0件★');
}
console.log('');
if (赤) {
  console.log('★★' + 赤 + '件 上限を 超えて います★★');
  console.log('  ⇒★これから 書く 分は ★ASCII★ に して ください★');
  console.log('  ⇒★`|` は `...` ／ スマートクォートは `"` `\'`★');
  process.exit(1);
}
console.log('★上限の 中です★（★2026-09-18 の 数を 決め打ちに して います★）');
