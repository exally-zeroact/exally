/* hakaridai-mon.test.mjs — ★測り台が 本番と 違うのを 止める★（2026-09-10）
 *
 *  ★★2026-09-09〜10 の 1日で ★5回★ 転びました★★
 *    ①プラグインを ★3本しか★ 積んで いなかった（本番は 8本）… LINEST の 道具
 *    ②プラグインを ★1本も★ 積んで いなかった ………………… 丸めの 押し比べ（★#53 の 根拠★）
 *    ③`smartRounding` が ★既定（true）★（本番は false）…… 803.6538461538445 → ★803.65384615★
 *    ④★板ごと `setSheetContent` で 入れて いた★（本番は 1マスずつ）
 *       ⇒ 裸の `=LINEST(…)` が ★#VALUE!★ に なり
 *         ★「本番が 壊れて いる」と 報告する 一歩 手前★まで 行った
 *       ⇒★実配信を ブラウザで 押したら 4本とも 動いて いた★＝★私の 台の 産物★
 *    ⑤★`getCell` は 式の 答えを 持って いない★／`setCell(r,c,v)` は ★シート番号を 取らない★
 *       ⇒ 材料を 5マス ずらして 敷き ★「1マス目も 空＝穴だ」と 読みかけた★
 *
 *  ★★だから この 見張りが 在ります★★
 *    ★node の 台で 出した 数は ★画面の 数では ありません★★
 *    ⇒ 台の 作り方が 本番と 違えば ★止める★
 *    ⇒ 画面の 事を 言いたい なら ★ブラウザで 押す★（★その 断りを 道具に 書かせる★）
 *
 *  ★★何を 守るか（1つずつ 名指し）★★
 *    ①★本番が 読む プラグインの 数と 同じだけ 積んで いる★
 *    ②★`smartRounding:false` と `useArrayArithmetic:true` を 建て方に 書いて いる★
 *    ③★`setSheetContent` で 板ごと 入れる 道具は ★断りを 書く★★
 *    ④★「画面」「本番の 画面」と 名乗る 道具は ★node では ない★事を 確かめる★
 *
 *  ★★見て いない 範囲（★書かない 見張りは「全部 守った」と 読まれる★）★★
 *    ・★`docs/measured/osu-*.mjs` だけ★ 見ます（`toru-*.ps1` は 実Excel＝別の 話）
 *    ・★中の 計算が 合って いるかは 見て いません★＝★台の 作り方だけ★
 *    ・★ブラウザで 押したかは 機械では 分かりません★＝★断りが 在るかだけ★
 *
 *  使い方: node tests/hakaridai-mon.test.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(ここ, '..');
const 直に走った = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
const 自己試験 = 直に走った && process.argv.includes('--self-test');

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + (e && e.message)); } };

/* ★本番が 読む プラグインの 数★（book.html から 数える＝★書き込まない★） */
function 本番のプラグイン数(html) {
  return new Set([...html.matchAll(/lib\/(formula-[a-z]+)-plug\.js/g)].map((m) => m[1])).size;
}
/* ★本番の 建て方★ */
function 本番のbuildEmpty(html) {
  const m = /buildEmpty\(\{([\s\S]{0,300}?)\}\)/.exec(html);
  return m ? m[1].replace(/\s+/g, '') : null;
}

const book = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf-8');
const 要る本数 = 本番のプラグイン数(book);
const 本番の建て方 = 本番のbuildEmpty(book);

/* ★見る 道具★＝`docs/measured/osu-*.mjs` */
function 道具ら() {
  const d = path.join(ROOT, 'docs/measured');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => /^osu-.*\.mjs$/.test(f))
    .map((f) => ({ 名: f, 道: path.join(d, f), 字: fs.readFileSync(path.join(d, f), 'utf-8') }));
}

/* ══ ★免除（★理由つきで 名指し★／黙って 見逃さない）★ ══════════ */
const 免除 = [
  { 名: 'osu-wakeru.mjs',
    訳: '★2026-09-07 の 道具★＝「動く 491個」を 分ける 為の 物。'
      + '★エンジンは 触ります★（buildEmpty / getCellValue が 在る）が '
      + '★見るのは 返って きた 物の ★種類★だけ★＝`#NAME?` か 値か だけを 数え、'
      + '★値そのものは 1つも 使いません★（コードで 確かめた … `v.type` しか 読まない）。'
      + '⇒ だから ★プラグインの 数も smartRounding も 答えを 変えません★。'
      + '★本番の 数として 報告して いません★。'
      + '★2026-09-10 訂正★ … 前は「答えの 値を 出す 道具では ない」とだけ 書いて いて '
      + '★「エンジンを 呼ばない」と 読める 字★でした。★実際は 呼んで います★＝字を 実物に 合わせました。' },
  { 名: 'osu-oufuku.mjs',
    訳: '★2026-09-10 の 道具★＝★エンジンを 1度も 呼びません★。'
      + 'やる事は ★うちの 書き出しの 道（GridXlsx → XlsxIO）で xlsx を 作る★のと '
      + '★実Excel が 開いて 測った 紙と 突き合わせる★の 2つだけ。'
      + '⇒ 式を 1つも 計算しないので ★プラグインを 積んでも 答えは 1文字も 変わりません★。'
      + '⇒★答えの 正しさは 実Excel が 出して います★（docs/measured/toru-oufuku.ps1 で 開いて 測った）。'
      + '★これこそが この 道具の 役目★＝★うちの 台では なく 実Excel に 答えさせる★' },
  { 名: 'osu-shisuu-mitame.mjs',
    訳: '★2026-09-10 の 道具★＝★エンジンを 1度も 呼びません★。'
      + '押すのは `book.html` の `forDisplay`＝★エンジンの 答えが 出た 後、画面に 字を 作る 段★だけ。'
      + '⇒ 数は ★実Excel に 打たせた 紙★から 読み、うちは ★字を 作る 段に 直に 渡す★（本番の 画面と 同じ 渡り方）。'
      + '⇒★エンジンを 積んでも この 道具の 答えは 1文字も 変わりません★（通らない 段だから）。'
      + '★そして 同じ 10本を ★ブラウザで 打って 絵で 確かめて あります★'
      + '（`docs/measured/e-shisuu-mitame-2026-09-10.png`）＝★台の 数だけで 済ませて いません★' },
];

console.log('\n[hakaridai-mon] ★測り台が 本番と 違うのを 止める★');
console.log('  ★本番★ … プラグイン ' + 要る本数 + '本 ／ buildEmpty ' + (本番の建て方 || '(読めない)'));

T('★道具を 1本でも 見つけて いる（★空振りして いない★）★', () => {
  const n = 道具ら().length;
  if (!n) throw new Error('★`docs/measured/osu-*.mjs` が 1本も 無い★');
  if (!要る本数) throw new Error('★book.html から プラグインの 数を 数えられない★');
  if (!本番の建て方) throw new Error('★book.html の buildEmpty が 読めない★');
  console.log('      … 道具 ' + n + '本');
});

T('★★本番の 建て方に smartRounding:false と useArrayArithmetic:true が 在る★★', () => {
  /* ★本番が 変わったら ここで 気づく★（★下の 試験の 前提★） */
  for (const 要 of ['smartRounding:false', 'useArrayArithmetic:true']) {
    if (本番の建て方.indexOf(要) < 0) {
      throw new Error('★本番の buildEmpty に ' + 要 + ' が 無い★＝★下の 試験の 前提が 崩れた★');
    }
  }
  console.log('      … 2つとも 在る');
});

T('★★道具が 本番と 同じ 本数の プラグインを 積んで いる★★', () => {
  const 悪い = [];
  for (const t of 道具ら()) {
    if (免除.some((x) => x.名 === t.名)) continue;
    /* ★数を 書き込んで いる 物は それを 見る／`つなぐ` の 数を 数える★ */
    const つなぐ数 = (t.字.match(/-plug\.js'\)\)?\s*\n?\s*\.つなぐ|\.つなぐ\(/g) || []).length;
    const 門が在る = /book\.html[\s\S]{0,400}?(buildEmpty|プラグイン)/.test(t.字)
      || /本番のプラグイン数|本番と 同じ .*本の プラグイン/.test(t.字);
    if (つなぐ数 < 要る本数 && !門が在る) {
      悪い.push(t.名 + '（つなぐ ' + つなぐ数 + '本／本番 ' + 要る本数 + '本・★門も 無い★）');
    }
  }
  if (悪い.length) {
    throw new Error('★' + 悪い.length + '本が 足りない★\n      ' + 悪い.join('\n      ')
      + '\n      ⇒★本番に 在る 物が 無い 状態で 押すと ★嘘の 数字★が 出ます★');
  }
  console.log('      … 全部 ' + 要る本数 + '本 ／ 免除 ' + 免除.length + '本（理由つき）');
});

T('★★道具の 建て方が 本番と 同じ（smartRounding:false）★★', () => {
  const 悪い = [];
  for (const t of 道具ら()) {
    if (免除.some((x) => x.名 === t.名)) continue;
    const 建て = (/buildEmpty\(\{([\s\S]{0,300}?)\}\)/.exec(t.字) || [])[1];
    if (!建て) { 悪い.push(t.名 + '（buildEmpty が 無い）'); continue; }
    const s = 建て.replace(/\s+/g, '');
    if (s.indexOf('smartRounding:false') < 0) {
      悪い.push(t.名 + '（★smartRounding が 既定＝エンジンが 勝手に 丸める★）');
    }
  }
  if (悪い.length) {
    throw new Error('★' + 悪い.length + '本★\n      ' + 悪い.join('\n      ')
      + '\n      ⇒★803.6538461538445 が 803.65384615 に なります（2026-09-09 実測）★');
  }
  console.log('      … 全部 smartRounding:false');
});

T('★★`setSheetContent` で 板ごと 入れる 道具は 断りを 書いて いる★★', () => {
  /* ★本番は `setCell`／`setCellFormula` で ★1マスずつ★ です★
     ⇒ 板ごと 入れると ★式が 表の 中を 指したり 溢れの 判じが 変わったり★します
     ⇒★使うなと は 言いません★（速いので）。★「画面の 数では ない」と 書かせます★ */
  const 悪い = [];
  for (const t of 道具ら()) {
    if (免除.some((x) => x.名 === t.名)) continue;
    if (t.字.indexOf('setSheetContent') < 0) continue;
    const 断り = /画面の 数では ない|画面の 答えでは ない|ブラウザで 押/.test(t.字);
    if (!断り) 悪い.push(t.名);
  }
  if (悪い.length) {
    throw new Error('★' + 悪い.length + '本が 板ごと 入れて いるのに 断りが 無い★\n      '
      + 悪い.join('\n      ')
      + '\n      ⇒★「★この 台の 数は 画面の 数では ありません★」と 書いて ください★'
      + '\n      ⇒ 2026-09-10 … 板ごと 入れて 裸の =LINEST が #VALUE! に なり'
      + '\n         ★本番が 壊れて いると 報告する 一歩 手前★まで 行きました');
  }
  console.log('      … 板ごと 入れる 道具は 全部 断りつき');
});

/* ★★「免除」と「対象外」を 分けます（2026-09-10）★★
   ★この 門が 見るのは ★エンジンを 建てて 式を 押す 道具★です。
   ★エンジンを 1度も 呼ばない 道具★は ★そもそも 測り台では ありません★＝★対象外★。
   ⇒ 前は それも「免除」に 入れて いたので ★免除が 3本に 増え、
     「免除に 逃げて いないか」の 見張りが 赤に なりました★（★門が 正しい★）
   ⇒★言い張りに しない★＝★機械で 判じます★
     `buildEmpty` も `getCellValue` も ★1つも 書いて いない★＝エンジンを 触らない
   ⇒★逃げ道に しない★＝理由も 要るし、★本当に 触って いない事を 数える★ */
/* ★改行を 逃がし（バックスラッシュ n）で 書きません★
   ＝2026-09-07/10 に ★heredoc で 生の 改行に 化ける★のを ★4回★ 踏んだ */
const 改行と字下げ = String.fromCharCode(10) + '      ';

function エンジンを触るか(t) {
  return t.字.indexOf('buildEmpty') >= 0 || t.字.indexOf('getCellValue') >= 0;
}

T('★★「対象外」は 本当に エンジンを 触って いない（★言い張りに しない★）★★', () => {
  const 嘘 = [];
  for (const x of 免除) {
    const t = 道具ら().find((y) => y.名 === x.名);
    if (!t) continue;
    /* ★★探す 字を 決めた 時点で 答えが 決まる★★（2026-09-10 に 踏んだ）
       前は「種類だけ」も 拾って いて、★エンジンを 触る 道具まで 対象外と 読んで★
       ★中身は 正しいのに 赤★に なりました。
       ⇒★見るのは 1つの 言い切りだけ★＝「エンジンを 1度も 呼びません」
       ⇒★それ以外の 免除は「エンジンを 触る けれど 免除」として 数える★（上の 見張りが 数を 見る） */
    if (x.訳.indexOf('エンジンを 1度も 呼びません') < 0) continue;
    if (エンジンを触るか(t)) 嘘.push(x.名 + ' … ★「エンジンを 呼ばない」と 書いて あるのに buildEmpty か getCellValue が 在る★');
  }
  if (嘘.length) throw new Error('★' + 嘘.length + '本★' + 改行と字下げ + 嘘.join(改行と字下げ));
  console.log('      … 書いて ある 通り 触って いない');
});

T('★免除は 全部 理由つき／★免除に 逃げて いない★★', () => {
  const なし = 免除.filter((x) => !x.訳 || !x.訳.trim());
  if (なし.length) throw new Error('★' + なし.length + '本に 理由が 無い★');
  /* ★エンジンを 触る 道具だけで 数える★
     ＝★触らない 道具は そもそも 測り台では ない★（対象外）ので 分母にも 分子にも 入れない */
  const 測り台 = 道具ら().filter(エンジンを触るか);
  const 本当の免除 = 免除.filter((x) => {
    const t = 道具ら().find((y) => y.名 === x.名);
    return t && エンジンを触るか(t);
  });
  const 対象外 = 免除.length - 本当の免除.length;
  if (本当の免除.length > Math.max(1, Math.floor(測り台.length / 3))) {
    throw new Error('★免除が 多すぎる（' + 本当の免除.length + ' ／ 測り台 ' + 測り台.length + '）★'
      + 改行と字下げ + '⇒★エンジンを 触る 道具を 免除するのは よほどの 時だけ★');
  }
  console.log('      … 測り台 ' + 測り台.length + '本 ／ ★免除 ' + 本当の免除.length + '本★ ／ 対象外 ' + 対象外 + '本（エンジンを 触らない）');
});

/* ══ ★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★ ══ */
if (自己試験) {
  console.log('\n★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★');

  T('★★smartRounding を 抜いたら 赤に なる★★', () => {
    const 写し = 道具ら().filter((t) => !免除.some((x) => x.名 === t.名))[0];
    if (!写し) throw new Error('★見る 道具が 無い★');
    const 抜いた = 写し.字.replace(/smartRounding:\s*false,?/g, '');
    const 建て = (/buildEmpty\(\{([\s\S]{0,300}?)\}\)/.exec(抜いた) || [])[1] || '';
    if (建て.replace(/\s+/g, '').indexOf('smartRounding:false') >= 0) {
      throw new Error('★抜いたのに まだ 在る＝この 試験は 空振り★');
    }
    console.log('      … ' + 写し.名 + ' から 抜くと 見つからなく なる（★赤に なる形★）');
  });

  T('★★断りを 消したら 赤に なる★★', () => {
    const 板 = 道具ら().filter((t) => t.字.indexOf('setSheetContent') >= 0
      && !免除.some((x) => x.名 === t.名));
    if (!板.length) { console.log('      … 板ごと 入れる 道具が 無い（この 試験は 当たらない）'); return; }
    const 消した = 板[0].字.replace(/画面の 数では ない|画面の 答えでは ない|ブラウザで 押/g, '');
    if (/画面の 数では ない|画面の 答えでは ない|ブラウザで 押/.test(消した)) {
      throw new Error('★消したのに まだ 在る＝この 試験は 空振り★');
    }
    console.log('      … ' + 板[0].名 + ' から 断りを 消すと 見つからなく なる');
  });

  T('★本番の 数を 書き込んで いない（★book.html から 数えて いる★）★', () => {
    const 字 = fs.readFileSync(path.join(ここ, 'hakaridai-mon.test.mjs'), 'utf-8');
    const 本体 = 字.slice(字.indexOf('function 本番のプラグイン数'));
    if (/=== *8\b|!== *8\b|要る本数 *= *8/.test(本体)) {
      throw new Error('★8 を 書き込んで いる★＝★本番が 増えたら 追えない★');
    }
    console.log('      … 数は book.html から 数えて いる（今 ' + 要る本数 + '本）');
  });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
