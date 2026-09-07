/* ima-doko-e-dete-iru.mjs — ★今 画面が 外へ 出ている 先を 全部 並べる★（2026-09-07）
 *
 *  ★★なぜ 機械で 撃つのか（字で 探しては いけない）★★
 *    repo を 字で 探すと `schemas.openxmlformats.org` が ★33回★ 出ます。
 *    ⇒ でも これは ★XML の 名札★で ★1回も 取りに 行きません★。
 *    ⇒★★字で 探した 数を そのまま 出すと 嘘に なります★★
 *    ⇒ だから ★本物の Chrome で 開いて、出て行った 物を 数えます★。
 *
 *  ★★測り方★★
 *    Chrome の `--log-net-log` で ★実際に 出た 通信★を 記録して 相手を 数える。
 *    ⇒ 字で 探した 一覧と ★突き合わせて 差を 出す★（どちらが 多いかを 見る）
 *
 *  ★★Chrome 自身も 外へ 出ます（ここで 1回 間違えました）★★
 *    最初に 数えたら ★18の 相手★が 出て、私は それを そのまま 書きかけました。
 *    ⇒ 中を 見たら ★大半が Chrome 自身の 用事★でした
 *      （辞書の 取り寄せ・時計合わせ・拡張の 更新・Google への 問い合わせ）
 *    ⇒★★画面が 出した 物と 混ざっていた★★
 *    ⇒ 直し … ★先に `about:blank` を 開いて 同じ 記録を 取り、それを 引く★
 *      ＝★比べる 相手を 先に 作る★
 *
 *  ★★この 測りで 分かる 事／分からない 事★★
 *    分かる … ★画面を 開いた だけで 出る 先★
 *    ★分からない★ … 押さないと 出ない 先（AIに 聞く／倉庫に 入る／ファイルを 開く）
 *      ⇒★その 分は 別に 押して 数える 必要が 在る＝★半分です★★
 *
 *  使い方: node docs/measured/soto/ima-doko-e-dete-iru.mjs [url]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ここ = path.dirname(fileURLToPath(import.meta.url));
const 相手 = process.argv[2] || 'https://exally.vercel.app/book.html';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const 仮 = fs.mkdtempSync(path.join(os.tmpdir(), 'netlog-'));
const 記録 = path.join(仮, 'net.json');

async function 撃つ(開く, 名) {
  const 部屋 = fs.mkdtempSync(path.join(仮, 名 + '-'));
  const 記 = path.join(部屋, 'net.json');
  const ch = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    /* ★Chrome 自身の 用事を 止める★＝引き算だけでは 毎回 数が 変わった
       （辞書・拡張の 更新・checkin は ★出る 回と 出ない 回★が 在る） */
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--no-service-autorun', '--disable-extensions',
    '--disable-client-side-phishing-detection', '--safebrowsing-disable-auto-update',
    '--metrics-recording-only', '--disable-domain-reliability',
    '--user-data-dir=' + path.join(部屋, 'u'),
    '--log-net-log=' + 記, '--net-log-capture-mode=Default',
    '--virtual-time-budget=15000', '--dump-dom', 開く,
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  await new Promise((ok) => { ch.on('exit', ok); setTimeout(() => { try { ch.kill(); } catch (e) { /* もう 死んでいる */ } ok(); }, 40000); });
  await new Promise((ok) => setTimeout(ok, 800));
  if (!fs.existsSync(記)) return null;
  const 生 = fs.readFileSync(記, 'utf-8');
  const 出 = new Map();
  for (const m of 生.matchAll(/"url":\s*"((?:[^"\\]|\\.)*)"/g)) {
    const u = m[1].replace(/\\u003C/g, '<').replace(/\\\//g, '/');
    if (!/^https?:/.test(u)) continue;
    let h = '';
    try { h = new URL(u).host; } catch (e) { continue; }
    if (!出.has(h)) 出.set(h, []);
    const 並 = 出.get(h);
    if (並.length < 3) 並.push(u.length > 110 ? u.slice(0, 110) + '…' : u);
  }
  return 出;
}

/* ★先に 比べる 相手を 作る★＝何も 無い ページで Chrome 自身の 用事を 数える
   ★1回では 足りない★＝Chrome の 用事は ★毎回 同じでは ない★（辞書は 1回 取ったら 取らない 等）
   ⇒★3回 撃って 出た 物を 全部 「Chrome の 用事」に する★ */
const 何もない = new Map();
for (let i = 0; i < 3; i++) {
  const r = await 撃つ('about:blank', 'karappo' + i);
  if (r) for (const [h, v] of r) if (!何もない.has(h)) 何もない.set(h, v);
}
const 全部 = await 撃つ(相手, 'honban');
if (!何もない.size || !全部) { console.log('★記録が 出来なかった★'); process.exit(1); }

/* ★引いても 残る Chrome の 用事★
   相手の 名前が ★毎回 変わる★物が 在る（例 r4---sn-xxxx.gvt1.com）
   ⇒ 名前では 引けないので ★道（path）で 見分ける★
   ⇒★見分けた 物は 消さずに「Chrome の 用事」として 別に 並べる★（隠さない） */
const CHROMEの道 = [
  ['/edgedl/chromewebstore/', '拡張の 取り寄せ'],
  ['/edgedl/chrome/dict/', '日本語の 辞書'],
  ['content-autofill.googleapis.com', '自動入力の 問い合わせ'],
  ['/chrome-variations/', '設定の 取り寄せ'],
];
const Chromeの物 = new Map();
const 住所 = new Map();
for (const [h, v] of 全部) {
  if (何もない.has(h)) continue;
  const 訳 = CHROMEの道.find(([み]) => h.includes(み) || v.some((u) => u.includes(み)));
  if (訳) Chromeの物.set(h, 訳[1]); else 住所.set(h, v);
}

/* ★字で 探した 一覧（比べる 相手）★ */
const ROOT = path.join(ここ, '..', '..', '..');
const 字で = new Map();
const 見る = (p) => {
  const s = fs.readFileSync(p, 'utf-8');
  for (const m of s.matchAll(/https?:\/\/[a-zA-Z0-9._-]+/g)) {
    const h = m[0].replace(/^https?:\/\//, '');
    字で.set(h, (字で.get(h) || 0) + 1);
  }
};
for (const f of ['book.html', 'hub.html', 'chat.html']) {
  const p = path.join(ROOT, f); if (fs.existsSync(p)) 見る(p);
}
for (const d of ['js', 'lib']) {
  const dp = path.join(ROOT, d); if (!fs.existsSync(dp)) continue;
  for (const f of fs.readdirSync(dp)) if (/\.js$/.test(f)) 見る(path.join(dp, f));
}

const 出 = [];
const 言う = (s) => { 出.push(s); console.log(s); };

言う('# ★今 画面が 外へ 出ている 先★（' + new Date().toISOString().slice(0, 10) + '）');
言う('');
言う('★開いた 物 … ' + 相手 + '★');
言う('★本物の Chrome の 通信の 記録から 数えた（字で 探したのでは ない）★');
言う('');
言う('## ★本当に 出て行った 相手（画面が 出した 物だけ）★');
言う('');
言う('  ★Chrome 自身の 用事 … ' + 何もない.size + 'の 相手（何も 無い ページで 数えて 引いた）★');
言う('  ★引く前 … ' + 全部.size + '／引いた後 … ' + [...全部.keys()].filter((h) => !何もない.has(h)).length + '★');
言う('');
const 並び = [...住所.keys()].sort();
for (const h of 並び) {
  言う('  ★' + h + '★');
  for (const u of 住所.get(h)) 言う('      ' + u);
}
言う('');
言う('  ★★画面が 出した 相手の 数 … ' + 並び.length + '★★');
言う('');
言う('## ★引いても 残った Chrome 自身の 用事（道で 見分けた／隠さず 並べる）★');
言う('');
for (const [h, 訳] of Chromeの物) 言う('  ' + h + '  … ' + 訳);
if (!Chromeの物.size) 言う('  なし');
言う('');
言う('## ★字で 探すと どう 見えるか（比べる）★');
言う('');
const 字並び = [...字で.entries()].sort((a, b) => b[1] - a[1]);
for (const [h, n] of 字並び) {
  言う('  ' + (n + '回').padEnd(6) + h + '  … ' + (住所.has(h) ? '★本当に 出た★' : '出ていない（名札 か 押した 時だけ）'));
}
言う('');
const 出ていない = 字並び.filter(([h]) => !住所.has(h)).length;
言う('  ★字では ' + 字並び.length + '件／うち ★' + 出ていない + '件は 1回も 出ていない★★');
言う('  ⇒ ★字で 探した 数を そのまま 出すと 嘘に なる★');
言う('');
言う('## ★この 測りが 見ていない 物（隠さず 書く）★');
言う('');
言う('  ★押さないと 出ない 先★ … AIに 聞く（/api/claude）／倉庫（supabase）／');
言う('  「Web から」の 窓（お客さんが 打った 住所）／絵の 貼り付け');
言う('  ⇒ ★この 測りは「開いた だけ」＝半分です★');

fs.writeFileSync(path.join(ここ, 'ima-doko-e-dete-iru.txt'), 出.join('\n') + '\n', { encoding: 'utf-8' });
console.log('\n★書いた … docs/measured/soto/ima-doko-e-dete-iru.txt★');
