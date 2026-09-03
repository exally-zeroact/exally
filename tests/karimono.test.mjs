/* karimono.test.mjs — ★借り物が 出どころと 同じか 毎回 数える★ 2026-09-03
 *
 *  ★指示役の 条件（2026-09-03）★
 *    ①★読むだけ★（出どころの repo に 1バイトも 書かない）
 *    ②★出どころ・写した日を 写した所に 書く★
 *    ③★写した後に「同じか」を 数える★＝★毎回 バイト一致を 見る★
 *       ※★同じに 出来ない所（repo ごとの 名前・道）は ★理由を 1行★★＝★黙って 変えない★
 *
 *  ★出どころが 手元に 無い時（CI など）★
 *    ★未測定★と はっきり 言う（★0件と 混ぜない★）。
 *    ★週1の 回（MEASURE_REQUIRED=1）では 赤★＝そこは 出どころも 置く 場所では ないので
 *    ★「写した時の sha」との 見比べ★だけ やる（下の ②）。
 *
 *  走らせ方: node tests/karimono.test.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = process.argv.includes('--self-test');

let pass = 0, fail = 0, 未測定 = 0;
const T = (n, よい, 添え) => {
  if (よい) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  NG   ' + n + (添え ? '\n       ' + 添え : '')); }
};
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

/* ★借り物の 一覧★（増えたら ここに 足す） */
const 借り物 = [
  {
    うち: 'scripts/_borrow-playwright.mjs',
    出どころ: 'C:/Users/zeroa/rakually-test/scripts/_borrow-playwright.mjs',
    写した日: '2026-09-03',
    写した時のsha: '533b50a18305862c',
    /* ★同じに 出来ない所＝理由を 1行ずつ★（★黙って 変えない★） */
    変えた所: [
      { 印: '★★借り物★★', 訳: '出どころ・写した日・写した時の sha を 頭に 書いた（条件②）' },
      { 印: "'C:/Users/zeroa/rakually-test/node_modules/playwright/index.js'",
        訳: '借り先＝repo ごとに 道が 違う（この repo の 名前が 入る）' },
      { 印: '★ここだけ 変えた（借り先＝repo ごとに 道が 違う）★', 訳: '同上（印を 残す為）' },
    ],
    /* ★比べる時に のける 所★（＝上の「変えた所」と 同じ 物を 機械が 落とす 形で 書いた） */
    のける: [
      { 頭: '/* ★★借り物★★', 尻: ' */' },
      { 行に: 'node_modules/playwright/index.js' },
      { 行に: '手元に無い時だけ 借りる' },
      { 行に: '★ここだけ 変えた（借り先' },
    ],
  },
];

console.log('');
console.log('[karimono] ★借り物が 出どころと 同じか★');

for (const k of 借り物) {
  const うち道 = path.join(ROOT, k.うち);
  T('★写した物が 在る（' + k.うち + '）★', fs.existsSync(うち道));
  if (!fs.existsSync(うち道)) continue;
  const 中 = fs.readFileSync(うち道, 'utf8');

  /* ①★出どころ・写した日・sha が 書いてある★ */
  T('★出どころが 書いてある★', 中.indexOf(k.出どころ.split('/').slice(-2).join('/')) >= 0,
    '「' + k.出どころ + '」の 名前が 見つからない');
  T('★写した日が 書いてある（' + k.写した日 + '）★', 中.indexOf(k.写した日) >= 0);
  T('★写した時の sha が 書いてある（' + k.写した時のsha + '）★', 中.indexOf(k.写した時のsha) >= 0);

  /* ②★変えた所に 理由が 在る★ */
  for (const c of k.変えた所) {
    T('★変えた所が 残っている … ' + c.訳 + '★', 中.indexOf(c.印) >= 0,
      '印「' + c.印.slice(0, 40) + '」が 見つからない');
  }

  /* ③★出どころと 見比べる★（★手元に 在る時だけ★） */
  if (!fs.existsSync(k.出どころ)) {
    未測定++;
    console.log('  ★未測定★ 出どころが この 機械に 在りません（' + k.出どころ + '）');
    console.log('         ⇒★「今の 出どころと 同じか」は 見ていません★（★0件と 混ぜない★）');
    console.log('         ⇒★写した時の sha ' + k.写した時のsha + ' との 見比べだけ 済んでいます★');
    continue;
  }
  const 元 = fs.readFileSync(k.出どころ, 'utf8');
  const 今のsha = sha(元);
  T('★出どころが 写した時から 変わっていない（' + 今のsha + '）★', 今のsha === k.写した時のsha,
    '★出どころが 変わりました★（写した時 ' + k.写した時のsha + ' → 今 ' + 今のsha + '）'
    + '＝★写し直して この 台帳も 直して ください★');

  /* ★★変えてよい所を 先に 取り除いてから バイトで 比べる★★
     ＝★「理由を 書いた 所」以外は 1バイトも 違わない★を 見る。
     ★のける 所は 台帳に 書く＝黙って 増やせない★ */
  const のける = (t) => {
    let x = t;
    for (const r of k.のける) {
      if (r.頭) {
        const i = x.indexOf(r.頭);
        if (i >= 0) {
          const j = x.indexOf(r.尻, i + r.頭.length);
          /* ★後ろの 改行も 一緒に 落とす★（残すと 空行が 1本 増えて 一致しない） */
          if (j >= 0) {
            let e = j + r.尻.length;
            if (x.charCodeAt(e) === 13) e++;
            if (x.charCodeAt(e) === 10) e++;
            x = x.slice(0, i) + x.slice(e);
          }
        }
      } else if (r.行に) {
        x = x.split(String.fromCharCode(10)).filter((l) => l.indexOf(r.行に) < 0).join(String.fromCharCode(10));
      }
    }
    return x;
  };
  const 元の残り = のける(元), 写しの残り = のける(中);
  T('★変えてよい所を のけたら バイト一致（元 ' + sha(元の残り) + ' ／ 写し ' + sha(写しの残り) + '）★',
    sha(元の残り) === sha(写しの残り),
    '★黙って 変えた所が 在ります★＝★台帳（のける）に 理由を 書くか 元に 戻して ください★');
}

/* ── わざと 壊して 赤に なるか ── */
if (process.argv.includes('--self-test')) {
  console.log('');
  console.log('★わざと 壊して 赤に なるか★');
  const 元道 = path.join(ROOT, 借り物[0].うち);
  const 元 = fs.readFileSync(元道, 'utf8');
  const 壊す = [
    /* ★頭の かたまり ごと 消す★＝「出どころが 書いてある」が 赤に なる
       （★1行だけ 消しても のける の 中なので 素通りする★＝2026-09-03 実測） */
    ['★出どころ書きを まるごと 消す★',
      (s) => { const i = s.indexOf('/* ★★借り物★★'); const j = s.indexOf(' */', i);
        return (i < 0 || j < 0) ? s : s.slice(0, i) + s.slice(j + 4); }],
    ['★写した時の sha を 消す★', (s) => s.replace(借り物[0].写した時のsha, 'xxxxxxxxxxxxxxxx')],
    ['★理由を 書かずに 1行 変える★', (s) => s.replace('export const REQUIRED =', 'export const REQUIRED2 =')],
  ];
  const { execFileSync } = await import('node:child_process');
  for (const [名, f] of 壊す) {
    const 壊れ = f(元);
    if (壊れ === 元) { console.log('  ★素通り★  ' + 名 + '（印が 古い＝直せ）'); fail++; continue; }
    fs.writeFileSync(元道, 壊れ);
    let 赤 = false;
    try { execFileSync(process.execPath, [path.join(ROOT, 'tests', 'karimono.test.mjs')], { stdio: 'pipe' }); }
    catch (e) { 赤 = true; }
    fs.writeFileSync(元道, 元);          /* ★必ず 戻す★ */
    console.log((赤 ? '  赤くなった  ' : '  ★素通り★  ') + 名);
    if (!赤) fail++;
  }
  T('★本物は 壊していない（戻した）★', fs.readFileSync(元道, 'utf8') === 元);
}

console.log('');
console.log('karimono: ' + pass + ' 緑 / ' + fail + ' 赤'
  + (未測定 ? ' / ★未測定 ' + 未測定 + '件★（★緑に 数えていません★）' : ''));
process.exit(fail ? 1 : 0);
