/* sakusha-mihon.mjs -- ★Office ファイル（xlsx/xlsb/xlsm）の 作者の 欄を「見本」に 替える★（2026-10-10）
 *
 *  ★なぜ★ 公開 repo の 見本・測った 証しの ファイルの docProps/core.xml に、作った 人の 名前が 入って いた
 *    （司さんの 決め 10-10「実在の 名前は 架空に」）。Excel は サインインの アカウント名を 入れるので、
 *    作る 側（toru-*.ps1・tools/make-mihon*.ps1）は 保存の 後に この 道具を 呼ぶ。
 *  ★替える 所★ … docProps/core.xml の dc:creator と cp:lastModifiedBy の 字だけ（欄が 無い 物は 足さない）。
 *    ほかの 部品は ★圧縮の バイトまで そのまま★（並び・拡張の 欄も 保つ）。後ろの 部品の 位置だけ ずらす。
 *  ★止まる 時（赤）★ … zip が 読めない／zip64／データ記述子（flag bit3）／替えた 後に 2欄が「見本」に ならない
 *  使い方：
 *    node scripts/sakusha-mihon.mjs <ファイル>...      … 替える（もう 見本なら 何もしない）
 *    node scripts/sakusha-mihon.mjs --check            … git ls-files の Office ファイルを 全部 見る（替えない）
 *  ★名前は 出さない★（出すのは「見本／欄なし／その他」だけ）
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const 見本 = '見本';
const CORE = 'docProps/core.xml';

function 目録を読む(b) {
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) if (b.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('zip の 終わりが 無い');
  const 数 = b.readUInt16LE(e + 10), 目録の大きさ = b.readUInt32LE(e + 12), 目録の位置 = b.readUInt32LE(e + 16);
  if (数 === 0xffff || 目録の位置 === 0xffffffff) throw new Error('zip64 は 扱わない');
  const 部品 = [];
  let p = 目録の位置;
  for (let k = 0; k < 数; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('目録が 壊れて いる');
    const nl = b.readUInt16LE(p + 28), xl = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32);
    const flag = b.readUInt16LE(p + 8);
    if (flag & 8) throw new Error('データ記述子は 扱わない');
    部品.push({ 目録: p, 目録の長さ: 46 + nl + xl + cl, 名: b.toString('utf8', p + 46, p + 46 + nl), 位置: b.readUInt32LE(p + 42), 圧縮: b.readUInt32LE(p + 20), 方式: b.readUInt16LE(p + 10) });
    p += 46 + nl + xl + cl;
  }
  return { 終わり: e, 目録の位置, 目録の大きさ, 部品 };
}

function 部品の中身(b, x) {
  if (b.readUInt32LE(x.位置) !== 0x04034b50) throw new Error('部品の 頭が 壊れて いる');
  const nl = b.readUInt16LE(x.位置 + 26), xl = b.readUInt16LE(x.位置 + 28);
  const 頭 = 30 + nl + xl;
  const raw = b.subarray(x.位置 + 頭, x.位置 + 頭 + x.圧縮);
  return { 頭, raw, 中: x.方式 === 8 ? zlib.inflateRawSync(raw) : x.方式 === 0 ? Buffer.from(raw) : null };
}

/** 作者の 欄を 読む ⇒ null（core.xml 無し）／{ 作者, 最後 }（欄が 無ければ undefined） */
export function 作者を読む(buf) {
  const b = Buffer.from(buf);
  const d = 目録を読む(b);
  const x = d.部品.find((p) => p.名 === CORE);
  if (!x) return null;
  const s = 部品の中身(b, x).中;
  if (!s) throw new Error('core.xml の 圧縮の 方式が 読めない');
  const t = s.toString('utf8');
  const 引く = (tag) => { const m = new RegExp('<' + tag + '(?:\\s[^>]*)?>([^<]*)</' + tag + '>').exec(t); return m ? m[1] : (new RegExp('<' + tag + '(?:\\s[^>]*)?/>').test(t) ? '' : undefined); };
  return { 作者: 引く('dc:creator'), 最後: 引く('cp:lastModifiedBy') };
}

/** 作者の 欄を「見本」に ⇒ 新しい Buffer（替える 物が 無ければ 同じ物） */
export function 作者を見本に(buf) {
  const b = Buffer.from(buf);
  const d = 目録を読む(b);
  const x = d.部品.find((p) => p.名 === CORE);
  if (!x) return b;
  const { 頭, raw, 中 } = 部品の中身(b, x);
  if (!中) throw new Error('core.xml の 圧縮の 方式が 読めない');
  const 前 = 中.toString('utf8');
  const 後 = 前.replace(/(<dc:creator(?:\s[^>]*)?>)[^<]*(<\/dc:creator>)/, '$1' + 見本 + '$2')
    .replace(/(<cp:lastModifiedBy(?:\s[^>]*)?>)[^<]*(<\/cp:lastModifiedBy>)/, '$1' + 見本 + '$2');
  if (後 === 前) return b;
  const 生 = Buffer.from(後, 'utf8');
  const 新raw = x.方式 === 8 ? zlib.deflateRawSync(生, { level: 9 }) : 生;
  const crc = zlib.crc32(生) >>> 0;
  const 差 = 新raw.length - raw.length;
  /* 部品を 位置の 順に 並べ、core.xml だけ 差し替えて つなぐ（すき間が 在れば 止める） */
  const 順 = d.部品.slice().sort((a, c) => a.位置 - c.位置);
  const 片 = [];
  let 次 = 0;
  for (const p of 順) {
    if (p.位置 !== 次) throw new Error('部品の 間に すき間が 在る');
    const 中身 = 部品の中身(b, p);
    const 終 = p.位置 + 中身.頭 + p.圧縮;
    if (p === x) {
      const h = Buffer.from(b.subarray(p.位置, p.位置 + 頭));
      h.writeUInt32LE(crc, 14); h.writeUInt32LE(新raw.length, 18); h.writeUInt32LE(生.length, 22);
      片.push(h, 新raw);
    } else 片.push(b.subarray(p.位置, 終));
    次 = 終;
  }
  if (次 !== d.目録の位置) throw new Error('部品と 目録の 間に すき間が 在る');
  const 目録 = Buffer.from(b.subarray(d.目録の位置, d.目録の位置 + d.目録の大きさ));
  for (const p of d.部品) {
    const o = p.目録 - d.目録の位置;
    if (p === x) { 目録.writeUInt32LE(crc, o + 16); 目録.writeUInt32LE(新raw.length, o + 20); 目録.writeUInt32LE(生.length, o + 24); }
    if (p.位置 > x.位置) 目録.writeUInt32LE(p.位置 + 差, o + 42);
  }
  const 終わり = Buffer.from(b.subarray(d.終わり));
  終わり.writeUInt32LE(d.目録の位置 + 差, 16);
  const out = Buffer.concat([...片, 目録, b.subarray(d.目録の位置 + d.目録の大きさ, d.終わり), 終わり]);
  const 読 = 作者を読む(out);
  const ok = (v) => v === undefined || v === 見本;
  if (!ok(読.作者) || !ok(読.最後)) throw new Error('替えた 後も 作者の 欄が「見本」に ならない');
  return out;
}

/** 判じ：見本 か 欄なし だけを 通す */
export function 欄の判じ(r) {
  if (r === null) return '欄なし';
  const ok = (v) => v === undefined || v === '' || v === 見本;
  if (!ok(r.作者) || !ok(r.最後)) return 'その他';
  return (r.作者 === 見本 || r.最後 === 見本) ? '見本' : '欄なし';
}

export function Officeファイル(root) {
  return execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' }).split('\n')
    .filter((f) => /\.(xlsx|xlsb|xlsm|docx|pptx)$/i.test(f));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = 1;
  const 引数 = process.argv.slice(2);
  const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (引数[0] === '--check') {
    const 数 = { 見本: 0, 欄なし: 0, その他: 0, 読めない: 0 };
    for (const f of Officeファイル(ROOT)) {
      let k;
      try { k = 欄の判じ(作者を読む(fs.readFileSync(path.join(ROOT, f)))); } catch (e) { k = '読めない'; }
      数[k]++;
      if (k === 'その他' || k === '読めない') console.log('  ★' + k + '★ ' + f);
    }
    console.log('Office ' + Object.values(数).reduce((a, c) => a + c, 0) + '本：見本 ' + 数.見本 + '・欄なし ' + 数.欄なし + '・その他 ' + 数.その他 + '・読めない ' + 数.読めない);
    if (!数.その他 && !数.読めない) process.exitCode = 0;
  } else {
    if (!引数.length) { console.log('使い方: node scripts/sakusha-mihon.mjs <ファイル>... ／ --check'); }
    else {
      for (const f of 引数) {
        const 前 = fs.readFileSync(f);
        const 後 = 作者を見本に(前);
        if (後 !== 前 && !後.equals(前)) { fs.writeFileSync(f, 後); console.log('見本に 替えた … ' + f + '（' + 前.length + ' → ' + 後.length + ' バイト）'); }
        else console.log('替える 物 無し … ' + f);
      }
      process.exitCode = 0;
    }
  }
}
