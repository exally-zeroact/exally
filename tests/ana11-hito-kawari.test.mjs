/* ana11-hito-kawari.test.mjs — ★ログインが切れて 別の人が 入っても 前の人の 本が 見えない★（2026-11-14・穴11）
 *  ★なぜ★ ログインが 切れると auth.js は 画面に 鍵を 掛ける（body.exally-locked）だけで、本は 画面の 中に 残る。
 *    別の人が ログインの 窓から 入ると 鍵が 外れて、前の人の 板・取り消しの 控え・直した所が そのまま 見えていた。
 *  ★同じ人が 入り直した 時は 打った 物を 残す★（ログインが 切れただけで 仕事を 捨てない）。
 *  使い方: node tests/ana11-hito-kawari.test.mjs ／ --self-test＝守りを 1本ずつ 抜いて 回し、どれも 赤に なるか
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/* ★守り（js/auth.js の 字）＝--self-test=<名> で 1本だけ 抜く★ */
const 守り = {
  'ログインの比べ': ['if (今の人 && 印 !== 今の人) { 読み直す(); return; }', ''],
  '合図の比べ': ['if (今の人 && 人の印(s.user) !== 今の人) 読み直す();', ''],
  '分からない時': ['if (人の印(u)) afterLogin(u); else 違う人();', 'if (人の印(u)) afterLogin(u); else hide();'],
  '引き直しが投げる': ['}).catch(function () { 違う人(); });', '}).catch(function () { hide(); });'],
  '先に鍵': ['    show();                                   /* ★先に 鍵★', '    /* ★先に 鍵★'],
};
if (process.argv.includes('--self-test')) {
  const { spawnSync } = await import('node:child_process');
  let 抜けない = 0;
  for (const 名 of Object.keys(守り)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--self-test=' + 名], { encoding: 'utf8' });
    const 赤 = (r.stdout.match(/^\s+NG /mg) || []).length;
    console.log((r.status !== 0 && 赤 > 0 ? '  ok   ' : '  NG   ') + '守り「' + 名 + '」を 抜く→赤 ' + 赤 + (r.status === 2 ? '（抜く字が 見つからない）' : ''));
    if (!(r.status === 1 && 赤 > 0)) 抜けない++;
  }
  console.log(抜けない ? '\n★守りを 抜いても 赤に ならない 物が ' + 抜けない + '本＝試験が 空振り★' : '\n守り ' + Object.keys(守り).length + '本 全部 赤');
  process.exit(抜けない ? 1 : 0);
}
const 抜く名 = (process.argv.find((a) => a.startsWith('--self-test=')) || '').slice('--self-test='.length);
const 字を変える = (src, code) => {
  if (!抜く名 || !/js[\/]auth\.js$/.test(src)) return code;
  const [元, 代わり] = 守り[抜く名] || [];
  if (!元 || !code.includes(元)) { console.log('★抜く字が 見つからない: ' + 抜く名); process.exit(2); }
  return code.replace(元, 代わり);
};
let pass = 0, fail = 0;
const T = async (n, fn) => { try { await fn(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  NG   ' + n + '\n       ' + (e && e.message)); } };
const ok = (c, m) => { if (!c) throw new Error(m || 'expected truthy'); };
const eq = (a, b, m) => { if (a !== b) throw new Error((m ? m + ': ' : '') + '期待=' + JSON.stringify(b) + ' 実際=' + JSON.stringify(a)); };

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); }
catch { console.log('★jsdomが入っていません（SKIPを緑と呼ばない）。npm ci してください。'); process.exit(1); }

const html = fs.readFileSync(path.join(ROOT, 'book.html'), 'utf8');
const CANVAS_STUB = `
(function(){
  var noop=function(){};
  var ctx=new Proxy({}, { get:function(t,k){
    if(k==='measureText') return function(){ return {width:40}; };
    if(k==='canvas') return {width:800,height:600};
    if(k==='getImageData') return function(){ return {data:[]}; };
    if(k==='createLinearGradient'||k==='createPattern') return function(){ return {addColorStop:noop}; };
    return noop;
  }});
  HTMLCanvasElement.prototype.getContext=function(){ return ctx; };
})();`;

/* ★作り物の 倉庫（supabase-js は CDN なので 試験では 読まない）★
   起動の時は A で 入っている。signInWithPassword は 打った メールの 人で 入る。 */
function 倉庫を作る(w) {
  const 見張り = [];
  const 断る = () => Promise.resolve({ data: null, error: { message: 'no net' } });
  const 何でも = new Proxy(function () {}, { get: () => 何でも, apply: () => ({ then: (a, b) => 断る().then(a, b) }) });
  const 人 = (email) => ({ id: 'uid-' + email.charAt(0), email });
  let 今のセッション = { user: 人('a@example.com') };
  const sb = {
    auth: {
      getSession: () => w.__引き直し === 'null' ? Promise.resolve({ data: { session: null } })
        : w.__引き直し === 'reject' ? Promise.reject(new Error('net'))
        : Promise.resolve({ data: { session: 今のセッション } }),
      onAuthStateChange: (cb) => { 見張り.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: ({ email }) => { 今のセッション = { user: 人(email) }; return Promise.resolve({ data: { user: 人(email) }, error: null }); },
      signUp: 断る, signOut: () => Promise.resolve({ error: null }),
      getUser: () => Promise.resolve({ data: { user: 今のセッション && 今のセッション.user } }),
    },
    from: () => 何でも, storage: 何でも, functions: 何でも, rpc: 断る,
  };
  w.supabase = { createClient: () => sb };
  /* ★合図を流す★＝別のタブ・再設定のリンクで セッションが 替わる 時は auth-js が この形で 全タブへ 流す */
  w.__合図 = (名, email) => { 今のセッション = email ? { user: 人(email) } : null; 見張り.forEach((cb) => cb(名, 今のセッション)); };
  w.__切れる = () => w.__合図('SIGNED_OUT', null);
}

const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), {
  runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
  beforeParse(w) {
    w.fetch = () => Promise.reject(new Error('no net'));
    w.scrollTo = () => {}; w.alert = () => {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    w.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    w.cancelAnimationFrame = () => {};
    w.eval(CANVAS_STUB);
    倉庫を作る(w);
  },
});
const win = dom.window, doc = win.document;
doc.hasFocus = () => true;
const inject = (code) => { const el = doc.createElement('script'); el.textContent = code; doc.body.appendChild(el); };
for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1].split('?')[0]).filter((s) => !/^https?:/.test(s))) {
  const p = path.join(ROOT, src);
  if (fs.existsSync(p)) { try { inject(字を変える(src, fs.readFileSync(p, 'utf8'))); } catch (e) { /* 続ける */ } }
  /* ★ログインの 窓の onLogin を 掴む★（再設定の 窓は ok(null) で 呼ぶ＝exally-login.js:285） */
  if (/exally-login\.js$/.test(src) && win.ExallyLogin) {
    const 元 = win.ExallyLogin.mount;
    win.ExallyLogin.mount = function (o) { win.__onLogin = o && o.onLogin; return 元.apply(this, arguments); };
  }
}
for (const m of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) { try { inject(m[1]); } catch (e) { /* 続ける */ } }
try { doc.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { /* 続ける */ }
try { win.dispatchEvent(new win.Event('load')); } catch (e) { /* 続ける */ }

const 待つ = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const 鍵 = () => doc.body.classList.contains('exally-locked');
const 入る = async (email) => {
  doc.getElementById('loginEmail').value = email;
  doc.getElementById('loginPass').value = 'pw-123456';
  doc.getElementById('btnLogin').click();
  await 待つ(60);
};
const A1 = () => win.eval('getCell(0,0).v');
const 控えの数 = () => win.eval('undoStack.length');

await 待つ(200);
/* ★読み直す は 差し替えて 数える★（jsdom は location.reload を 持たない） */
let 読み直した = 0;
if (win.Auth) win.Auth.読み直す = () => { 読み直した++; };
const 読み直しを数える = async (名, fn, 期待) => {
  const 前 = 読み直した; await fn(); await 待つ(60);
  eq(読み直した - 前, 期待, 名 + ' の 読み直し');
};

await T('起動＝A で 入っていて 鍵が 外れている（作り物の 倉庫が 効いている）', async () => {
  ok(!鍵(), 'body.exally-locked が 付いたまま＝作り物の 倉庫が 効いていない（試験の 空振り）');
  ok(typeof win.__onLogin === 'function', 'onLogin を 掴めていない（試験の 空振り）');
});

await T('A が 打つ→板と 取り消しの 控えに 入る', async () => {
  win.eval("setCell(0,0,'Aの秘密')");
  eq(A1(), 'Aの秘密');
  ok(控えの数() > 0, '控えが 積まれていない');
});

await T('同じ人の 合図（SIGNED_IN・TOKEN_REFRESHED の A）→何もしない', async () => {
  await 読み直しを数える('SIGNED_IN(A)', () => win.__合図('SIGNED_IN', 'a@example.com'), 0);
  await 読み直しを数える('TOKEN_REFRESHED(A)', () => win.__合図('TOKEN_REFRESHED', 'a@example.com'), 0);
  ok(!鍵(), '同じ人で 鍵が 掛かった');
});

await T('ログインが 切れる→鍵→同じ人（A）が 入り直す→読み直さない・打った 物は 残る', async () => {
  win.__切れる(); await 待つ();
  ok(鍵(), '鍵が 掛からない');
  await 読み直しを数える('A で 入り直す', () => 入る('a@example.com'), 0);
  ok(!鍵(), '入っても 鍵が 外れない');
  eq(A1(), 'Aの秘密');
});

await T('★切れて 別の人（B）が ログインの 窓から 入る→鍵の まま 読み直す★', async () => {
  win.__切れる(); await 待つ();
  await 読み直しを数える('B で 入る', () => 入る('b@example.com'), 1);
  ok(鍵(), '鍵が 外れて B に A の 板が 見えた（A1＝' + JSON.stringify(A1()) + '）');
});

await T('★別のタブで B が 入る（SIGNED_IN(B)・切れずに 替わる）→鍵を 掛けて 読み直す★', async () => {
  win.__合図('SIGNED_IN', 'a@example.com'); await 入る('a@example.com');   /* A に 戻して 鍵を 外す */
  ok(!鍵(), '前の 試験の 後始末で 鍵が 外れない');
  await 読み直しを数える('SIGNED_IN(B)', () => win.__合図('SIGNED_IN', 'b@example.com'), 1);
  ok(鍵(), 'A の タブが B の 鍵で 開いたまま');
});

await T('★再設定の リンク（PASSWORD_RECOVERY(B)）→鍵を 掛けて 読み直す★', async () => {
  win.__合図('SIGNED_IN', 'a@example.com'); await 入る('a@example.com');
  await 読み直しを数える('PASSWORD_RECOVERY(B)', () => win.__合図('PASSWORD_RECOVERY', 'b@example.com'), 1);
  ok(鍵(), '再設定で 替わったのに 鍵が 掛からない');
});

/* ★A に 戻す★＝ログインの 窓に 頼らない（再設定の 合図で 窓の 中身が「決める画面」に 替わる＝exally-login.js:313） */
const Aに戻す = async () => {
  win.__引き直し = 'normal';
  win.__合図('SIGNED_IN', 'a@example.com'); await 待つ();
  win.__onLogin({ id: 'uid-a', email: 'a@example.com' }); await 待つ(60);
  ok(!鍵(), 'A に 戻しても 鍵が 外れない（試験の 後始末）');
};
const 分からない = async (名, 引き直し) => {
  await Aに戻す();
  win.__切れる(); await 待つ();
  win.__引き直し = 引き直し;
  const 前 = 読み直した;
  win.__onLogin(null); await 待つ(80);
  eq(読み直した - 前, 1, 名 + ' の 読み直し');
  ok(鍵(), 名 + '＝人が 分からないのに 鍵が 外れた');
  win.__引き直し = 'normal';
};
await T('★人が 分からない（onLogin(null)・引き直すと B）→鍵の まま 読み直す★', async () => {
  await Aに戻す();
  win.__切れる(); await 待つ();
  win.__合図('SIGNED_IN', 'b@example.com'); await 待つ();   /* 倉庫は B に 替わった（鍵の 間なので 板は 見えない） */
  const 前 = 読み直した;
  win.__onLogin(null); await 待つ(80);
  ok(読み直した - 前 >= 1, '人が 分からないのに 読み直さない');
  ok(鍵(), '人が 分からないのに 鍵が 外れた');
});
await T('★人が 分からない・引き直しても 空（getSession が null）→違う 人として 鍵の まま 読み直す★', async () => {
  await 分からない('引き直しが 空', 'null');
});
await T('★人が 分からない・引き直しが 投げる（getSession が reject）→違う 人として 鍵の まま 読み直す★', async () => {
  await 分からない('引き直しが 投げる', 'reject');
});

console.log(`
${pass} ok / ${fail} NG`);
process.exit(fail ? 1 : 0);
