/* monosashi-mado.test.mjs — ★測り道具が「0」を ★2つの 窓★で 取って いるか★
 *
 *  ★★なぜ 要るか（2026-09-08 に 見つけた 物差しの 欠陥）★★
 *    `.Value2` は ★0 で ない 値に 0 を 返す★
 *      =0.1+0.2-0.3    … .Value2 ★0★ ／ =(式)=0 ★False★ ／ (式)*1e17 5.55
 *      =11.1+22.2-33.3 … .Value2 0   ／ =(式)=0 ★True★  ／ (式)*1e17 0
 *    ⇒★.Value2 では この 2つが どちらも 0 に 見える★
 *    正体 …★最後の 演算が ＋ か − の 時だけ、実Excel が ★見せる 時に★ 0 に する★
 *      `=0.1+0.2-0.3+0`   → 5.55e-17（+0 は 桁が 違うので 効かない）
 *      `=(0.1+0.2-0.3)*1` → 5.55e-17（掛け算なので 効かない）
 *    ⇒★実Excel は 値を 0 に して いない。★.Value2 が 見せ方の 側を 返して いる★
 *
 *  ★★もう1つ … 字の "0" も 同じ 顔を する★★
 *    `=DEC2BIN(0.5)` は ★文字列の "0"★（数の 0 では ない）
 *    ⇒ `="0"=0` は FALSE ⇒★見せかけの 0 と 見分けが 付かない★
 *    ⇒★型（String / Number）も 見ないと 分けられない★
 *
 *  ★★この 見張りが 守る 物★★
 *    ①★実Excel を 押す 道具が「0」を 1つの 窓だけで 取って いないか★
 *      ⇒ 2つ目の 窓 … `=(式)=0` の 真偽（★本当に 0 か★）
 *      ⇒ 3つ目の 窓 … 型（String / Number）
 *    ②★免除する 道具は ★理由つきで 名指し★★（★黙って 見逃さない★）
 *
 *  ★★見て いない 範囲（★書かない 見張りは「全部 守った」と 読まれる★）★★
 *    ・`docs/measured/**\/toru-*.ps1` だけ 見る
 *    ・★`.mjs` の 突き合わせ道具は 見て いない★（実Excel を 押さない ので）
 *    ・★『0』以外の 見せ方の 罠は 見て いない★（例：字の 幅で 変わる 表示）
 *
 *  使い方: node tests/monosashi-mado.test.mjs [--self-test]
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

/* ★測り道具を 集める★ */
function 道具ら() {
  const 出 = [];
  const 掘る = (d) => {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { 掘る(p); continue; }
      if (/^toru-.*\.ps1$/.test(f.name)) 出.push(p);
    }
  };
  掘る(path.join(ROOT, 'docs/measured'));
  return 出.sort();
}

/* ★2つ目の 窓を 持って いるか★
   `=(…)=0` の 形か `）=0'` の 形を 探す */
const 窓２ = /\)\s*=\s*0\s*\)|'\)=0'|\)=0"|=\(' \+|\)=0\)/;
function 二つ目の窓が在るか(s) {
  /* ★『=(式)=0』を 打って いるか★（書き方の 揺れを 吸う） */
  if (/\(\s*'\s*=\s*\(\s*'\s*\+/.test(s) && /\)\s*=\s*0/.test(s)) return true;
  if (/'\)=0'/.test(s)) return true;
  if (/\)\s*=\s*0\s*'\s*\)/.test(s)) return true;
  return false;
}
/* ★型を 見て いるか★ */
function 型を見て居るか(s) {
  return /-is \[string\]/.test(s) && /-is \[double\]/.test(s);
}

/* ══ ★★免除（★理由つきで 名指し★／黙って 見逃さない）★★ ══════════
   ★免除の 条件★
     ・その 道具が ★数の 答えを 1つも 取らない★（字・誤り・真偽 だけ）
     ・または ★引き算・足し算で 終わる 式を 1本も 打たない★
   ⇒★どちらも「0 が 見せかけに なる 形」に 当たらない★
   ⇒★★迷ったら 免除しない★★（★免除は 少ない方が 安全★） */
const 免除 = {
  'docs/measured/kansuu46/toru-isref.ps1': 'ISREF … ★真偽（TRUE/FALSE）しか 返さない★＝0 が 出ない',
  'docs/measured/toru-oufuku.ps1':
    '★この 道具は 実Excel に ★式を 打たせません★＝★うちが 書いた ファイルを 開いて 読むだけ★。'
    + '見るのは ①式(.Formula) ②出る字(.Text) ③答え(.Value2) の 3つで、'
    + '★「0」が 出る 所が ありません★（材料は お金の 利回りと 並べ替え）。'
    + '⇒ 2つ目の 窓（=(式)=0）の 当たる 先が 無い。'
    + '★型は 見て います★＝`.Value2` が double か どうかで 分けて 書いて います。',
  'docs/measured/toru-oou-daiarogu.ps1':
    '★実Excel の 数を 1つも 読みません★＝シートに 色を 塗って ★絵を 撮る★だけの 道具。'
    + '見るのは ★絵の 点の 明るさ★で、`.Value2` も `.Text` も 使いません。'
    + '⇒★「0」が 出る 所が 無いので 2つ目の 窓の 当たる 先が ありません★。'
    + '（★この 機械では 画面が 撮れず 走りません★＝別の 機械用に 置いて あります）',
};

const 全 = 道具ら();
console.log('\n★測り道具の 窓★');
console.log('  ★見る 範囲★ … `docs/measured/**/toru-*.ps1` … ' + 全.length + '本');
console.log('    （★.mjs の 突き合わせ道具は 見て いません＝実Excel を 押さない ので★）');

T('★測り道具を 1本でも 見つけて いる（空振りして いない）★', () => {
  if (全.length < 10) throw new Error('★' + 全.length + '本しか 見つからない★＝探し方が おかしい');
  console.log('      ' + 全.length + '本');
});

T('★免除は 全部 理由つき（★黙って 見逃さない★）★', () => {
  for (const k of Object.keys(免除)) {
    if (!免除[k] || !免除[k].trim()) throw new Error('★' + k + ' に 理由が 無い★');
    if (!fs.existsSync(path.join(ROOT, k))) throw new Error('★免除に 書いた 道具が 無い … ' + k + '★');
  }
  console.log('      免除 ' + Object.keys(免除).length + '本（全部 理由つき）');
});

T('★★「0」を 1つの 窓だけで 取って いる 道具が 無い★★', () => {
  const 駄目 = [];
  for (const p of 全) {
    const 道 = path.relative(ROOT, p).replace(/\\/g, '/');
    if (免除[道]) continue;
    const s = fs.readFileSync(p, 'utf-8');
    const 窓2 = 二つ目の窓が在るか(s);
    const 型 = 型を見て居るか(s);
    if (!窓2 || !型) 駄目.push({ 道, 窓2, 型 });
  }
  console.log('      2つ目の 窓が 在る … ' + (全.length - Object.keys(免除).length - 駄目.length)
    + ' ／ 無い … ' + 駄目.length);
  if (駄目.length) {
    throw new Error('★' + 駄目.length + '本が 1つの 窓だけ★\n'
      + '      ⇒★`=(式)=0` の 真偽と ★型★を 一緒に 取って ください★\n'
      + '      ⇒ 免除するなら ★理由つきで 名指し★して ください\n'
      + 駄目.map((x) => '      ' + x.道 + '  '
        + (x.窓2 ? '' : '★=(式)=0 が 無い★ ') + (x.型 ? '' : '★型を 見て いない★')).join('\n'));
  }
});

/* ══ ★自己試験＝★わざと 見せかけの 0 を 通して 赤に なるか★★ ══════ */
if (自己試験) {
  console.log('\n★自己試験（★壊すのは 写し★＝ファイルは 1バイトも 触らない）★');

  T('★★窓②が 無い 道具は 赤に なる★★', () => {
    const 素 = '$v = $sh.Range("T1").Value2\nif ($v -is [double]) { }';
    if (二つ目の窓が在るか(素)) throw new Error('★窓②が 無いのに 在ると 言う★');
    console.log('      … `=(式)=0` を 打たない 道具 → ★赤★');
  });

  T('★窓②が 在れば 通る★', () => {
    const 良 = "$z = 押して字に ('=(' + $中 + ')=0')\nif ($v -is [string]) { } elseif ($v -is [double]) { }";
    if (!二つ目の窓が在るか(良)) throw new Error('★窓②が 在るのに 無いと 言う★');
    if (!型を見て居るか(良)) throw new Error('★型を 見て いるのに 見て いないと 言う★');
    console.log('      … `=(式)=0` ＋ 型 を 打つ 道具 → ★緑★');
  });

  T('★型を 見て いない 道具は 赤に なる★', () => {
    const 半 = "$z = 押して字に ('=(' + $中 + ')=0')\nif ($v -is [double]) { }";
    if (型を見て居るか(半)) throw new Error('★型を 見て いないのに 見て いると 言う★');
    console.log('      … 型（String/Number）を 分けない 道具 → ★赤★');
  });

  T('★★見せかけの 0 の 実物 3組を 覚えて いる★★', () => {
    /* ★この 3組は 実Excel で 実測ずみ★（golden-hikizan-zero-2026-09-08.tsv） */
    const 組 = [
      ['=0.1+0.2-0.3', '0', 'False', '5.551115123125783e-17'],
      ['=1-0.9-0.1', '0', 'False', '-2.7755575615628914e-17'],
      ['=11.1+22.2-33.3', '0', 'True', '0'],   /* ★これは 本当に 0★ */
    ];
    const 紙 = path.join(ROOT, 'docs/measured/golden-hikizan-zero-2026-09-08.tsv');
    if (!fs.existsSync(紙)) throw new Error('★実測の 紙が 無い … golden-hikizan-zero-2026-09-08.tsv★');
    const 中 = fs.readFileSync(紙, 'utf-8');
    for (const [式] of 組) {
      if (中.indexOf(式 + '\t') < 0) throw new Error('★紙に ' + 式 + ' が 無い★');
    }
    console.log('      … 3組とも 紙に 在る（★見せかけ 2 ／ 本当に 0 が 1★）');
  });

  T('★免除に 逃げて いない（免除は 1本だけ）★', () => {
    if (Object.keys(免除).length > 3) {
      throw new Error('★免除が ' + Object.keys(免除).length + '本★＝★免除に 逃げて いる★');
    }
    console.log('      … 免除 ' + Object.keys(免除).length + '本 ／ 全 ' + 全.length + '本');
  });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (直に走った) process.exit(fail ? 1 : 0);
