/* osu-86-karimono-no-ima.mjs — ★★借り物が 建って いる ★今★ の 答えを 紙に 取る★★（2026-09-15）
 *
 *  ★★なぜ 今 取るのか（★外した 後では 取れません★）★★
 *    自前の 関数 ★86個★が ★借り物（HyperFormula）の 骨組みの 上に 載って います★
 *      ・★足す 65個★ … `lib/formula-*-plug.js` が 借り物に 登録する
 *      ・★包む 21個★ … `formula-complex-plug` が IM系の ★出す 字だけ★ 実Excel に 合わせる
 *    ★司さんの 実物 1冊は この 86個を ★1つも★ 使いません★（実測・2026-09-15）
 *    ⇒★★だから 外す時に 86個が 黙って 変わっても この 1冊では 気づけません★★
 *    ⇒★★借り物が 建って いる 今 の 答えを 焼いて おく★★
 *      ＝★外した 後に「外す前と 同じか」が 測れる★
 *
 *  ★★この 紙で 言える 事／言えない 事★★
 *    ★言える★ … ★★外す前と 同じか★★
 *    ★★言えない★★ … ★正しいか★
 *      ＝★これは「うちの 今の 答え」であって「実Excel の 答え」では ありません★
 *      ★実Excel の 答えが 在る 分★は `docs/measured/kansuu46/` の 紙が 持って います
 *      （2026-09-15 実測＝★86個の うち 66個は 紙が 在る／20個は 無い★）
 *
 *  ★★外へ 出る 4個は 答えを 焼きません★★（指示役1 の 決め・2026-09-15）
 *    WEBSERVICE ／ STOCKHISTORY ／ TRANSLATE ／ DETECTLANGUAGE
 *    ★毎回 変わる★ので ★「外す前と 同じか」も 測れません★
 *    ⇒★本番の 道は 元から 外へ 出させません★（`取る`／`聞く` が 投げる）
 *      ＝★出るのは「外へ 出ようとした」という 印だけ★＝★呼び方だけ★
 *    ⇒★お金・秘密・相手の 迷惑の 3つとも 避けられます★
 *
 *  ★★通り数を 必ず 出します★★（指示役1 の 注文）
 *    ★1通りしか 押せて いない 関数は「守れて いる」に 近くない★
 *    ⇒★1通り ◯個／2〜4通り ◯個／5通り以上 ◯個★を 出します
 *
 *  ★★この 台の 数は 画面の 数では ありません★★
 *    ★`setSheetContent` で 板ごと 入れて います★（本番は 1マスずつ）。
 *    ⇒ 2026-09-10 … 板ごと 入れた せいで 裸の `=LINEST(…)` が #VALUE! に なり
 *      ★「本番が 壊れて いる」と 報告する 一歩 手前★まで 行きました。
 *    ⇒★画面の 事を 言いたい なら ブラウザで 押して ください★
 *
 *  ★★見て いない 事★★
 *    ・★引数の 組は 17通りの 決め打ち★＝★その 関数に とって 意味の 在る 組とは 限りません★
 *      （★だから 通り数を 出します★＝★1通りは 弱い★）
 *    ・★答えが 正しいかは 見て いません★（上に 書いた 通り）
 *
 *  使い方: node docs/measured/osu-86-karimono-no-ima.mjs
 *  出す先: docs/measured/golden-86-karimono-2026-09-15.tsv
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(path.join(ROOT, 'package.json'));
const 出す先 = path.join(ROOT, 'docs/measured/golden-86-karimono-2026-09-15.tsv');

const { 建てる } = await import(pathToFileURL(path.join(ROOT, 'docs/measured/honban-no-michi.mjs')).href);
const { 指紋の行 } = await import(pathToFileURL(path.join(ROOT, 'docs/measured/zairyou-no-yubimon.mjs')).href);
const 道 = await 建てる();
const { EF, hf, SID } = 道;
console.log('★本番と 同じ ' + 道.積んだ + '本の プラグインを つないだ★');

/* ══ ★相手の 86個を 名簿から 集める★（★字で 探さない★＝2026-09-15 に 踏んだ） ══ */
const 札 = new Set();
for (const f of fs.readdirSync(path.join(ROOT, 'lib')).filter((x) => /^formula-.*-plug\.js$/.test(x))) {
  const s = fs.readFileSync(path.join(ROOT, 'lib', f), 'utf8');
  for (const m of s.matchAll(/['"]([A-Z][A-Z0-9_.]{1,30})['"]\s*:/g)) 札.add(m[1]);
  for (const m of s.matchAll(/\b([A-Z][A-Z0-9_.]{1,30})\s*:\s*(function|\()/g)) 札.add(m[1]);
}
const CX = require_(path.join(ROOT, 'lib/formula-complex.js'));
const 包む = new Set(CX['文字を返す']);
const 相手 = [...new Set([...札, ...包む])].sort();

/* ★外へ 出る 物★＝★答えを 焼かない★ */
const 外へ = new Set(['WEBSERVICE', 'STOCKHISTORY', 'TRANSLATE', 'DETECTLANGUAGE']);

/* ★引数の 組★（`osu-wakeru.mjs` と 同じ 17通り＝★別の 組を 作らない★） */
const 候補 = ['(1)', '()', '(A1:A2,1)', '(1,1)', '(A1:A2)', '(1,1,1)', '("a")', '(A1)', '(1,1,1,1)',
  '(A1:B2,1,A1:A2)', '(A1:A2,A1:A2)',
  '(A1:A2,LAMBDA(v,v*2))', '(0,A1:A2,LAMBDA(a,b,a+b))', '(2,2,LAMBDA(r,c,r*c))',
  '(x,2,x*3)', '(x,x+1)', '("<a><b>1</b></a>","//b")'];

/** ★1つの 式を 本番の 道で 押す★（JS層 → convertFormula → エンジン） */
function 押す(式) {
  if (typeof EF._jsComputeFormula === 'function') {
    try {
      const r = EF._jsComputeFormula(0, 式);
      if (r !== null && r !== undefined) return { 道: 'JS層', 字: String(r) };
    } catch (e) { return { 道: 'JS層', 字: '★投げた★' }; }
  }
  let 後;
  try { 後 = EF.convertFormula(式); } catch (e) { return { 道: '変換', 字: '★投げた★' }; }
  try {
    hf.setSheetContent(SID, [[1, 3], [2, 4], [後]]);
    const v = hf.getCellValue({ sheet: SID, row: 2, col: 0 });
    if (v === null || v === undefined) return { 道: 'エンジン', 字: '' };
    if (typeof v === 'object' && v.type) return { 道: 'エンジン', 字: '#' + v.type + (v.value ? '' : '') };
    return { 道: 'エンジン', 字: String(v) };
  } catch (e) { return { 道: 'エンジン', 字: '★投げた★' }; }
}

/* ══ ★押す★ ══ */
/* ★★紙の 頭に「出どころ」を 書く★★（指示役1 の 決め・2026-09-15）
     ★書かないと「古い うちの 答え」を「正」として 突き合わせます★
     ＝★偽の 勝ちの 一番 静かな 形★＝★自分の 古い 答えと 自分を 比べて 100%★ */
const 行 = [
  '# ★出どころ★ … ★借り物（HyperFormula）が 出した 答え★（★実 Excel では ありません★）',
  '# ★取った 日★ … 2026-09-15 ／ ★取った 道★ … docs/measured/osu-86-karimono-no-ima.mjs',
  '# ★使い方★ … ★外した 後に これと 突き合わせて「外す前と 同じか」を 見る★',
  '# ★言えない 事★ … ★正しいか★（実 Excel の 答えは docs/measured/kansuu46/ が 持つ・86個中 66個）',
  ...指紋の行(require_, import.meta.url),
  '関数\t引数の組\t道\t出た字',
];
const 通り数 = {};
const 誤りでない数 = {};
let 押した = 0;
for (const f of 相手) {
  if (外へ.has(f)) {
    /* ★答えは 焼かない★＝★呼び方だけ★（本番の 道は 外へ 出させない） */
    const r = 押す('=' + f + '("x")');
    行.push(f + '\t★外へ 出る★\t' + r.道 + '\t★答えは 焼かない（呼び方だけ）＝' + r.字 + '★');
    通り数[f] = 0;
    continue;
  }
  let n = 0, 誤りでない = 0;
  for (const a of 候補) {
    const 式 = '=' + f + a;
    const r = 押す(式);
    if (r.字 === '★投げた★') continue;      /* ★投げた 組は 通り数に 入れない★ */
    n++;
    /* ★★誤りも「答え」に 数えたら ★全部 5通り以上★ に なりました★★（2026-09-15）
       ⇒★それでは「どれだけ 覚えて いるか」の 測りに なりません★
       ⇒★★誤りでない 答えを 別に 数えます★★（★分母を 2つ 出す★）
       ★誤りも 焼きます★＝★外した 後に 誤りの 出方が 変わったら それも 変化★ */
    if (!/^#[A-Z/0-9!?.]+$/.test(r.字.trim())) 誤りでない++;
    押した++;
    行.push(f + '\t' + a + '\t' + r.道 + '\t' + r.字);
  }
  通り数[f] = n;
  誤りでない数[f] = 誤りでない;
}

fs.writeFileSync(出す先, 行.join('\n') + '\n', 'utf8');

/* ══ ★数を 出す★ ══ */
function 段に分ける(表) {
  const 段 = { '★0通り★': 0, '1通り': 0, '2〜4通り': 0, '5通り以上': 0 };
  const 零 = [];
  for (const f of 相手) {
    if (外へ.has(f)) continue;
    const n = 表[f];
    if (n === 0) { 段['★0通り★']++; 零.push(f); }
    else if (n === 1) 段['1通り']++;
    else if (n <= 4) 段['2〜4通り']++;
    else 段['5通り以上']++;
  }
  return { 段, 零 };
}
const 全部 = 段に分ける(通り数);
const 中身 = 段に分ける(誤りでない数);
console.log('\n# ★借り物が 建って いる 今 の 答えを 焼いた★（2026-09-15）');
console.log('#   ★これは「うちの 今の 答え」★＝★正しいか は 測って いません★');
console.log('#   ★言えるのは「外す前と 同じか」だけ★\n');
console.log('★相手★ … ' + 相手.length + '個（足す ' + 札.size + ' ＋ 包む ' + 包む.size + '）');
console.log('★外へ 出る（答えを 焼かない）★ … ' + [...外へ].join(' '));
console.log('★焼いた 行★ … ' + 押した + '（引数の 組 ' + 候補.length + '通り × 関数）');
console.log('★出す先★ … ' + path.relative(ROOT, 出す先).replace(/\\/g, '/'));
console.log('\n★★通り数★★（★分母は 引数の 組 ' + 候補.length + '通り★）');
console.log('【①何か 返った】（★誤りも 数える★）');
for (const [k, v] of Object.entries(全部.段)) console.log('   ' + String(v).padStart(4) + '個  ' + k);
console.log('【★★②誤りでない 答えが 返った★★】（★こちらが 本当の 覚え具合★）');
for (const [k, v] of Object.entries(中身.段)) console.log('   ' + String(v).padStart(4) + '個  ' + k);
console.log('★★①だけ 見ると 全部 5通り以上に 見えます★★＝★分母を 出さない 緑は 嘘★');
if (中身.零.length) {
  console.log('\n★★誤りしか 返らなかった 関数★★（★外す 時に 比べる 物が 誤りだけ★）');
  for (let i = 0; i < 中身.零.length; i += 8) console.log('  ' + 中身.零.slice(i, i + 8).join(' '));
}
