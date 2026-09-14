/* shiki-hyou-itamatagi.test.mjs — ★㋖ 板またぎの 土台★（2026-09-15）
 *
 *  ★★この 紙は「作る前」に 書きました★★（指示役1 の 注文・2026-09-15）
 *    ★「動いた」の 後に 書くと ★通る形に 合わせて★ しまいます★
 *    ⇒★先に 赤である 事を 見てから 土台を 書きます★。
 *
 *  ★★なぜ ㋖が 要るか（実物で 数えた）★★
 *    司さんの 実物（代行計算表2026.xlsb）を 自前の 土台で 押すと
 *      ★式 15,799 ／ ★板を またぐ 7,372（46.7%）★ ／ またがないが 染まり 312★
 *      ⇒★押せて いるのは 8,115（51.4%）★
 *    ★`H.表()` に 板の 考えが 無い★のが 唯一の 壁です。
 *    ⇒★これが 通れば 15,799/15,799 が 測れます★（＝⑥「この1冊が 自前だけで 動くか」）
 *
 *  ★★作る物（下見で 決めた・`docs/measured/shiraberu-itamatagi.mjs`）★★
 *    ①`H.表()` に ★板の 口★（マスの 鍵を `板名!A1` に する）
 *    ②`頼りを拾う` が ★板名つきの 名★を 返す
 *    ③`四角` を ★板を またいで★ 組む（★指し先の 7,336本が 四角★＝ここが 本命）
 *    ④`番地から名`／`名から番地` を ★板つき★に する
 *
 *  ★★作らない物（実物で ★0本★ だった）★★
 *    ★3D（板：板！）0本★／★［外の 本］！ 0本★／★'囲んだ 板名' 0本★
 *    ★板名に 空白 0本／記号 0本★／★この 本に 無い 板を 指す 0本★
 *    ⇒★0本の 物を 作ると 測れない 物が 増える★ので 作りません。
 *      ★但し `#REF!A1`（板を 消した 形）だけは ★受け口★を 縛ります★（⑤）
 *        ＝`lib/shiki-sansho.js` は これを ★板「#REF」★と 読むので
 *          ★無い 板 ⇒ #REF!★ に 落ちる 事を 決めて おきます。
 *
 *  ★★この 見張りが 守る 事★★
 *    ①★板を またいで 読める★（1マス／四角）
 *    ②★★菱形が 板を またいでも 効く★★（⑱の 直しが 板を またいでも 生きるか）
 *    ③★★輪が 板を またぐ★★ ⇒ ★#REF!★
 *    ④★★暗黙の 交わりは ★式の マスの★ 行・列を 使う★★（板が 違っても 自分の 行・列）
 *    ⑤★無い 板を 指したら #REF!★
 *    ⑥★板を 跨がない 今までの 書き方が 壊れて いない★
 *
 *  ★★見て いない 事★★
 *    ・★実物の 7,372本が 合うかは ここでは 見て いません★
 *      （それは `docs/measured/osu-jitsubutsu-jizen-dake.mjs` が 数で 出します）
 *    ・★画面（book.html）は 見て いません★＝台だけ
 *
 *  使い方: node tests/shiki-hyou-itamatagi.test.mjs
 *          node tests/shiki-hyou-itamatagi.test.mjs --self-test
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const H = require_(path.join(ROOT, 'lib/shiki-hyou.js'));

let pass = 0, fail = 0;
const T = (n, f) => {
  try { f(); pass++; console.log('  ✓ ' + n); }
  catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message); }
};

console.log('\n[shiki-hyou-itamatagi] ★㋖ 板またぎの 土台★');

/* ★★口の 決め★★（★作る前に ここで 決めます★）
     `H.表()` は ★板の 名前つきの マス★を 受ける：
       `h.打つ('板2!A1', '5')` ／ `h.置く('板2!A1', 5)` ／ `h.字('板2!A1')`
     ★板を 書かない 名は「今の 板」★＝`h.板('名')` で 切り替える（既定は 1枚目）
     ★訳★＝★今までの 書き方（`h.打つ('A1', …)`）を 1文字も 変えない★ */

/* ★土台が 在るか★＝★★式から 別の 板を 引けるか★★で 見る
     ★`打つ('板2!A1', …)` が 通るだけでは 足りません★
     ＝今の 台は ★それを ただの 鍵の 字★として 受けます（板の 意味は 持って いない）
     ⇒★式で 引いて #NAME? に ならない事★を 見ます */
const 板つきを受けるか = () => {
  const h = H.表();
  try {
    h.打つ('板2!A1', '5');
    h.打つ('ZZ1', '=板2!A1');
    return String(h.字('ZZ1')) === '5';
  } catch (e) { return false; }
};

T('★① 板を またいで 1マス 読める★', () => {
  const h = H.表();
  h.打つ('板2!A1', '5');
  h.打つ('A1', '=板2!A1*2');
  if (String(h.字('A1')) !== '10') throw new Error('A1 … ' + h.字('A1') + '（10 のはず）');
});

T('★★② 板を またいで 四角を 足せる★★（★実物の 7,336本が 四角★）', () => {
  const h = H.表();
  h.打つ('板2!A1', '1'); h.打つ('板2!A2', '2'); h.打つ('板2!A3', '3');
  h.打つ('A1', '=SUM(板2!A1:A3)');
  if (String(h.字('A1')) !== '6') throw new Error('A1 … ' + h.字('A1') + '（6 のはず）');
});

T('★③ 打ち直すと 別の 板の 式も 直る★', () => {
  const h = H.表();
  h.打つ('板2!A1', '5');
  h.打つ('A1', '=板2!A1*2');
  h.打つ('板2!A1', '50');
  if (String(h.字('A1')) !== '100') throw new Error('★A1 が ' + h.字('A1') + '（100 のはず）★'
    + '＝★板を またいで 報せが 行って いません★');
});

T('★★④ 菱形が 板を またいでも 効く★★（⑱の 直しが 生きて いるか）', () => {
  /* 板1!K1 ← 材料
     板2!Q1 = 板1!K1*2
     板1!M1 = 板1!K1 - 板2!Q1     ←★M は K も Q も 見る／Q も K を 見る★ */
  for (const 順 of [['K', 'Q', 'M'], ['M', 'Q', 'K'], ['Q', 'M', 'K']]) {
    const h = H.表();
    const 手 = {
      K: () => h.打つ('K1', '10'),
      Q: () => h.打つ('板2!Q1', '=K1*2'),
      M: () => h.打つ('M1', '=K1-板2!Q1'),
    };
    for (const k of 順) 手[k]();
    if (String(h.字('板2!Q1')) !== '20') throw new Error(順.join('→') + ' … 板2!Q1 が ' + h.字('板2!Q1'));
    if (String(h.字('M1')) !== '-10') throw new Error(順.join('→') + ' … ★M1 が ' + h.字('M1')
      + '（-10 のはず）★＝★板を またぐと 古い 答えが 残ります★');
    h.打つ('K1', '100');
    if (String(h.字('M1')) !== '-100') throw new Error(順.join('→') + ' … ★打ち直し後 M1 が '
      + h.字('M1') + '（-100 のはず）★');
  }
});

T('★★⑤ 輪が 板を またいだら #REF!★★', () => {
  const h = H.表();
  h.打つ('A1', '=板2!B1+1');
  h.打つ('板2!B1', '=A1+1');
  const a = String(h.字('A1'));
  if (a !== '#REF!') throw new Error('★板を またぐ 輪を 見つけて いない★ … A1 = ' + a);
});

T('★★⑥ 暗黙の 交わりは ★式の マスの★ 行を 使う★★', () => {
  /* ★板2 の 縦の 四角を 板1 の H9 から 裸で 指す★
     ⇒★交わるのは「自分（式）の 行」＝9行目★（★板2 の 何かでは ない★） */
  const h = H.表();
  for (let r = 1; r <= 12; r++) h.打つ('板2!A' + r, String(r * 100));
  h.打つ('H9', '=板2!A1:A12');
  if (String(h.字('H9')) !== '900') throw new Error('★H9 が ' + h.字('H9') + '（900 のはず）★'
    + '＝★交わりに 使う 行が 自分の 行に なって いません★');
  h.打つ('H3', '=板2!A1:A12');
  if (String(h.字('H3')) !== '300') throw new Error('★H3 が ' + h.字('H3') + '（300 のはず）★');
});

T('★⑦ 無い 板を 指したら #REF!★（★板を 消した 形も ここで 受ける★）', () => {
  const h = H.表();
  h.打つ('A1', '=まだない!B2');
  const a = String(h.字('A1'));
  if (a !== '#REF!') throw new Error('★無い 板を 指したのに ' + a + '★（#REF! のはず）');
});

T('★★⑧ 今までの 書き方が 壊れて いない★★（★板を 書かない＝今の 板★）', () => {
  const h = H.表();
  h.打つ('A1', '5');
  h.打つ('B1', '=A1*2');
  h.置く('C1', 'あ');
  h.打つ('D1', '=C1&"x"');
  if (String(h.字('B1')) !== '10') throw new Error('B1 … ' + h.字('B1'));
  if (String(h.字('D1')) !== 'あx') throw new Error('D1 … ' + h.字('D1'));
  h.打つ('A1', '50');
  if (String(h.字('B1')) !== '100') throw new Error('★打ち直し後 B1 が ' + h.字('B1') + '★');
});

T('★⑨ 同じ 名の マスが 板ごとに 別物★', () => {
  const h = H.表();
  h.打つ('A1', '1');
  h.打つ('板2!A1', '2');
  h.打つ('板3!A1', '3');
  h.打つ('B1', '=A1+板2!A1+板3!A1');
  if (String(h.字('B1')) !== '6') throw new Error('B1 … ' + h.字('B1') + '（6 のはず）');
  if (String(h.字('A1')) !== '1') throw new Error('★A1 が 上書きされて います★ … ' + h.字('A1'));
});

if (process.argv.includes('--self-test')) {
  console.log('\n[shiki-hyou-itamatagi --self-test] ★この 紙は 本当に 試して いるか★');

  T('★★⑩ 土台が 無い 間は ①〜⑦⑨が 赤★★（★作る前に 書いた 証★）', () => {
    const 受ける = 板つきを受けるか();
    console.log('      … ★板つきの マスを 受けるか★ … ' + (受ける ? '★受ける（土台 在り）★' : '受けない（まだ）'));
    if (!受ける) {
      if (fail < 7) throw new Error('★土台が 無いのに 赤が ' + fail + '本しか 出て いない★'
        + '＝★この 紙は 試して いません★');
      console.log('      … ★赤 ' + fail + '本＝先に 赤である 事を 確かめました★');
    }
  });

  T('★⑪ 下見の 数が 紙に 書いて 在る★（★作る物／作らない物★）', () => {
    const fs = require_('node:fs');
    const 字 = fs.readFileSync(path.join(ROOT, 'tests/shiki-hyou-itamatagi.test.mjs'), 'utf8');
    for (const n of ['7,372', '7,336', '312', '15,799']) {
      if (字.indexOf(n) < 0) throw new Error('★下見の 数（' + n + '）が 書いて いない★');
    }
    if (字.indexOf('0本の 物を 作ると') < 0) throw new Error('★作らない 訳が 書いて いない★');
  });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
