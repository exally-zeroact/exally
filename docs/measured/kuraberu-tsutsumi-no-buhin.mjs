/* kuraberu-tsutsumi-no-buhin.mjs
 *   -- ★包みの 部品を 前後で 突き合わせる★（95）（2026-09-21）
 *
 *  ★★なぜ★★
 *    Exally1 が 「足した 板も 書き出す」を 書きます。
 *    ⇒私（監査役）が 数えるのは ★「増えた／減った／中身が 変わった」★です。
 *    ⇒★これは Excel を 1回も 立てずに 分かります★（速い・お金 0）
 *    ⇒★実Excel に 開かせるのは その 後★（`Open` が 投げるか＝93）
 *
 *  ★★この 道具が する 事／しない 事★★
 *    する  ... 2つの 包みの ★部品の 名前と 中身（sha256）★を 並べる
 *    しない ... ★中身が 「正しい」かの 判断★（それは 実Excel に 開かせて 見る）
 *
 *  ★★「変わって いない」の 決め方★★
 *    ★ほどいた 後の バイトで 比べます★（★詰め方は 見ません★）
 *      ＝zip の 詰め直しで バイトが 変わっても ★中身は 同じ★事が 在る
 *      ＝`lib/vba.js` の 「中身は同じ・詰め方が違う」と ★同じ 考え方★
 *    ⇒★詰め方の 違いも 別に 数えて 出します★（黙って 同じに しない）
 *
 *  使い方:
 *    node docs/measured/kuraberu-tsutsumi-no-buhin.mjs <前の包み> <後の包み>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(path.join(ここ, '..', '..', 'package.json'));
const zlib = require_('node:zlib');
const crypto = require_('node:crypto');

/** ★zip を ほどいて 名前 ⇒ {中身, 詰め方} に する★（借り物を 増やしません） */
function 包みを開く(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const 本数 = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const 出 = new Map();
  for (let k = 0; k < 本数; k += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const 詰め方 = buf.readUInt16LE(p + 10);
    const 圧んだ = buf.readUInt32LE(p + 20);
    const 名長 = buf.readUInt16LE(p + 28);
    const 追長 = buf.readUInt16LE(p + 30);
    const 注長 = buf.readUInt16LE(p + 32);
    const 頭位置 = buf.readUInt32LE(p + 42);
    const 名 = buf.slice(p + 46, p + 46 + 名長).toString('utf8');
    const 名長2 = buf.readUInt16LE(頭位置 + 26);
    const 追長2 = buf.readUInt16LE(頭位置 + 28);
    const 生 = buf.slice(頭位置 + 30 + 名長2 + 追長2, 頭位置 + 30 + 名長2 + 追長2 + 圧んだ);
    const 中身 = 詰め方 === 0 ? 生 : zlib.inflateRawSync(生);
    出.set(名, { 中身, 詰め方, 圧んだ: 圧んだ });
    p += 46 + 名長 + 追長 + 注長;
  }
  return 出;
}

const 印 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);

const 前道 = process.argv[2];
const 後道 = process.argv[3];
if (!前道 || !後道) {
  console.log('使い方: node kuraberu-tsutsumi-no-buhin.mjs <前の包み> <後の包み>');
  process.exit(2);
}
for (const d of [前道, 後道]) {
  if (!fs.existsSync(d)) { console.log('★在りません★ ... ' + d); process.exit(3); }
}
const 前 = 包みを開く(fs.readFileSync(前道));
const 後 = 包みを開く(fs.readFileSync(後道));
if (!前 || !後) { console.log('★包みが ほどけません★'); process.exit(4); }

console.log('★前★ ' + 前道 + '（部品 ' + 前.size + '本）');
console.log('★後★ ' + 後道 + '（部品 ' + 後.size + '本）');
console.log('');

const 名たち = [...new Set([...前.keys(), ...後.keys()])].sort();
const 増 = [], 減 = [], 変 = [], 同 = [], 詰め違い = [];
for (const な of 名たち) {
  const a = 前.get(な), b = 後.get(な);
  if (!a) { 増.push(な); continue; }
  if (!b) { 減.push(な); continue; }
  if (印(a.中身) !== 印(b.中身)) { 変.push({ な, 前: a.中身.length, 後: b.中身.length }); continue; }
  同.push(な);
  if (a.圧んだ !== b.圧んだ) 詰め違い.push(な);
}

const 出す = (札, 並び, 書き) => {
  console.log('★' + 札 + '★ ' + 並び.length + '本');
  for (const x of 並び.slice(0, 40)) console.log('    ' + 書き(x));
  if (並び.length > 40) console.log('    ...（あと ' + (並び.length - 40) + '本）');
};
出す('増えた 部品', 増, (x) => x + '  ' + 後.get(x).中身.length + 'B');
出す('★減った 部品★', 減, (x) => x + '  ' + 前.get(x).中身.length + 'B');
出す('★中身が 変わった 部品★', 変, (x) => x.な + '  ' + x.前 + 'B ⇒ ' + x.後 + 'B');
console.log('★中身が 同じ 部品★ ' + 同.length + '本'
  + (詰め違い.length ? '（うち ★詰め方だけ 違う★ ' + 詰め違い.length + '本）' : ''));
console.log('');
console.log('★★この 道具は 「開けるか」を 見て いません★★');
console.log('  ⇒実Excel が 投げないかは `toru-jitsu-excel-ga-shuufuku-shita-ka.ps1`（93）で 見ます');
if (減.length) { console.log(''); console.log('★★減った 部品が 在ります★★'); process.exit(1); }
