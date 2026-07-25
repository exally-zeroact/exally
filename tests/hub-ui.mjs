// hub-ui.mjs — ★②UI 全ボタン検証★
//  本物の hub.html + js/hub.js を jsdom に読み込み、全画面・全タブ・全ボタンを実際にクリックして
//  「JS例外0・各画面が中身を描画」を確かめる。Kyually の tests/ui-smoke.mjs と同じハーネス。
//  Supabase(ネット)には繋がない=偽のデータ層を差し込んで、実データ相当の中身で描く。
//  依存: jsdom。未導入なら SKIP(exit 0) だが「スキップした」と明示する。
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
let JSDOM; try { ({ JSDOM } = await import('jsdom')); }
catch { console.log('SKIP: jsdom未導入=UIテストをスキップ(npm i -D jsdom)。★緑ではない★'); process.exit(0); }

let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  NG   ' + name + '\n       ' + (e && e.message)); } }
function ok(c, m) { if (!c) throw new Error(m || 'expected truthy'); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ── hub.html を読み込み、ローカルの script だけ順に流す(CDN/auth は除外=ネットに出ない) ── */
const html = fs.readFileSync(path.join(ROOT, 'hub.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])
  .filter(s => !/^https?:/.test(s) && !/supa-config|auth\.js/.test(s));
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.fetch = () => Promise.reject(new Error('no net'));
const errs = [];
win.addEventListener('error', e => errs.push('window.error: ' + (e.message || e)));
win.addEventListener('unhandledrejection', e => errs.push('unhandledrejection: ' + (e.reason && e.reason.message || e.reason)));
win.confirm = () => true;   // 削除の確認は「はい」で通す(テスト用の偽データのみ)
win.scrollTo = () => {};    // jsdom未実装の警告を消す(挙動には関係しない)
for (const src of srcs) {
  const el = doc.createElement('script');
  el.textContent = fs.readFileSync(path.join(ROOT, src), 'utf8');
  doc.body.appendChild(el);
}
const H = win.__EXALLY_TEST;
ok(H, '__EXALLY_TEST 露出(hub.js の init 成功)');

/* ── 偽のデータ層(SuiteDataと同じ形の返り) ── */
const db = {
  org: { yago: '株式会社ゼロアクト', addr: '愛媛県今治市1-2-3', tel: '0898-00-0000', invoiceNo: 'T1234567890123', businesses: ['代行', '空調'] },
  employees: [
    { id: 'e1', sort: 0, name: '山田 太郎', employmentType: '従業員', business: '空調', data: {} },
    { id: 'e2', sort: 1, name: '鈴木 花子', employmentType: '業務委託', business: '代行', data: {} },
    { id: 'e3', sort: 2, name: '佐藤 次郎', employmentType: '従業員', business: '', data: {} }
  ],
  partners: [{ id: 'pt_a', sort: 0, data: { name: '○○建設株式会社', keisho: '御中', addr: '松山市1-1', invoiceNo: '' } }],
  ledger: [
    { id: 'l1', employeeId: 'e2', ymd: '2026-07-01', data: { uriage: 4200, business: '代行' } },
    { id: 'l2', employeeId: 'e2', ymd: '2026-07-01', data: { uriage: 3800 } },
    { id: 'l3', employeeId: 'e1', ymd: '2026-07-05', data: { uriage: 210000 } },
    { id: 'l4', employeeId: 'e3', ymd: '2026-07-06', data: { uriage: 1000 } }
  ]
};
const calls = [];
let failNext = null;
const fakeSD = {
  org: {
    get: () => Promise.resolve(db.org),
    save: (patch) => { calls.push(['org.save', patch]); if (failNext === 'org') { failNext = null; return Promise.resolve({ ok: false, reason: 'no-user' }); } Object.assign(db.org, patch); return Promise.resolve({ ok: true, data: db.org }); }
  },
  employees: {
    list: () => Promise.resolve(db.employees.map(e => ({ ...e }))),
    patch: (id, p) => { calls.push(['emp.patch', id, p]); const e = db.employees.find(x => x.id === id); if (!e) return Promise.resolve({ ok: false, reason: 'not-found' }); Object.assign(e, p); return Promise.resolve({ ok: true }); }
  },
  partners: {
    list: () => Promise.resolve(db.partners.map(p => ({ ...p }))),
    upsert: (p) => { calls.push(['pt.upsert', p]); const id = p.id || ('pt_' + (db.partners.length + 1)); const ex = db.partners.find(x => x.id === id); if (ex) ex.data = p.data; else db.partners.push({ id, sort: 0, data: p.data }); return Promise.resolve({ ok: true, id }); },
    remove: (id) => { calls.push(['pt.remove', id]); db.partners = db.partners.filter(x => x.id !== id); return Promise.resolve({ ok: true }); }
  },
  ledger: {
    list: (q) => { calls.push(['ledger.list', q]); if (failNext === 'ledger') { failNext = null; return Promise.reject(new Error('台帳が多すぎて全部読めませんでした（1000/4200件）。期間を短く区切ってください')); } return Promise.resolve(db.ledger.filter(r => r.ymd >= q.from && r.ymd <= q.to && (!q.employeeId || r.employeeId === q.employeeId))); }
  },
  entitlements: { get: () => Promise.resolve({ plan: 'trial' }), ensure: () => Promise.resolve({ plan: 'trial', existed: true }) }
};

H.state.today = '2026-07-15';      // 現在時刻に依存させない
H._setSuiteData(fakeSD);
await H.loadAll();
await sleep(30);

/* ═══ 0. 未ログインで中身を見せない ═══ */
T('0. ★中身(.app)は最初 hidden＝未ログインで画面を見せない', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'hub.html'), 'utf8');
  ok(/<div class="app" id="app" hidden>/.test(raw), 'hub.html の .app に hidden が無い');
  const authSrc = fs.readFileSync(path.join(ROOT, 'js', 'auth.js'), 'utf8');
  ok(/a\.hidden\s*=\s*false/.test(authSrc), 'ログイン成功時に hidden を外していない');
  ok(/a\.hidden\s*=\s*true/.test(authSrc), 'ログイン画面に戻す時に hidden を付けていない');
});
doc.getElementById('app').hidden = false;   // 以降はログイン済みとして描画を見る

/* ═══ 1. ハブ ═══ */
T('1. ハブが出る・タイルは4つだけ', () => {
  ok(doc.getElementById('scr-hub').classList.contains('active'), 'ハブが表示されていない');
  ok(doc.querySelectorAll('#scr-hub .tile').length === 4, 'タイル数=' + doc.querySelectorAll('#scr-hub .tile').length);
});
T('1. 給料明細タイルは働くKyuallyへ繋がる(本物の行き先が1つある)', () => {
  const a = doc.getElementById('tile-payslip');
  ok(a.tagName === 'A', 'リンクでない');
  ok(a.getAttribute('href') === 'https://payslip-app-olive.vercel.app', 'href=' + a.getAttribute('href'));
  ok(a.getAttribute('target') === '_blank' && /noopener/.test(a.getAttribute('rel') || ''), '別タブ/noopenerでない');
});
T('1. 日次台帳は「準備中」と正直に出す', () => {
  const t = doc.getElementById('tile-ledger');
  ok(/準備中/.test(t.textContent), '準備中の表示が無い');
});
T('1. 日次台帳を押しても偽の画面に行かない(お知らせだけ)', () => {
  const before = doc.querySelector('.scr.active').id;
  doc.getElementById('tile-ledger').click();
  ok(doc.querySelector('.scr.active').id === before, '画面が動いた');
  ok(doc.getElementById('toast').classList.contains('on'), 'お知らせが出ていない');
  ok(/準備中/.test(doc.getElementById('toast').textContent), 'お知らせの中身=' + doc.getElementById('toast').textContent);
});

/* ═══ 2. 共有データ: 会社 ═══ */
T('2. 会社の情報がクラウドの値で埋まっている', () => {
  H.show('scr-data');
  ok(doc.getElementById('org-yago').value === '株式会社ゼロアクト', 'yago=' + doc.getElementById('org-yago').value);
  ok(doc.getElementById('org-invoice').value === 'T1234567890123');
});
T('2. 事業のチップが出る', () => {
  const chips = doc.querySelectorAll('#org-biz-chips .chip');
  ok(chips.length === 2, 'チップ数=' + chips.length);
  ok(/代行/.test(chips[0].textContent));
});
await (async () => {
  doc.getElementById('org-yago').value = '株式会社テスト';
  doc.getElementById('org-save').click(); await sleep(30);
  T('2. 保存すると成功が画面に出る', () => {
    ok(/保存しました/.test(doc.getElementById('org-msg').textContent), 'msg=' + doc.getElementById('org-msg').textContent);
    ok(db.org.yago === '株式会社テスト', 'クラウドに渡っていない');
  });
  failNext = 'org';
  doc.getElementById('org-save').click(); await sleep(30);
  T('2. ★保存に失敗したら「保存しました」と嘘をつかない', () => {
    const m = doc.getElementById('org-msg');
    ok(!/保存しました/.test(m.textContent), '失敗なのに成功と出た: ' + m.textContent);
    ok(m.className.indexOf('err') >= 0, '赤くなっていない');
    ok(/ログイン/.test(m.textContent), '理由が日本語で出ていない: ' + m.textContent);
  });
})();
await (async () => {
  doc.getElementById('org-biz-new').value = 'EC';
  doc.getElementById('org-biz-add').click(); await sleep(30);
  T('2. 事業を追加できる・入力欄が空に戻る', () => {
    ok(doc.querySelectorAll('#org-biz-chips .chip').length === 3, 'チップが増えていない');
    ok(doc.getElementById('org-biz-new').value === '', '入力欄が残っている');
  });
  doc.getElementById('org-biz-new').value = 'EC';
  doc.getElementById('org-biz-add').click(); await sleep(10);
  T('2. 同じ事業は二重に足せない', () => {
    ok(doc.querySelectorAll('#org-biz-chips .chip').length === 3, '重複して増えた');
    ok(/もうあります/.test(doc.getElementById('org-biz-msg').textContent));
  });
  // 今足した EC(最後)を消す。先頭を消すと「代行/空調」が減って後のテストの前提が変わるため。
  [...doc.querySelectorAll('#org-biz-chips [data-biz-del]')].pop().click(); await sleep(30);
  T('2. 事業を削除できる', () => {
    ok(doc.querySelectorAll('#org-biz-chips .chip').length === 2, '減っていない');
    ok(JSON.stringify(H.state.businesses) === '["代行","空調"]', '残った事業=' + JSON.stringify(H.state.businesses));
  });
})();

/* ═══ 3. 共有データ: 人 ═══ */
T('3. 人の一覧が出る・雇用形態と事業が見える', () => {
  H.showTab('emp');
  const rows = doc.querySelectorAll('#emp-rows .row');
  ok(rows.length === 3, '行数=' + rows.length);
  ok(/山田 太郎/.test(rows[0].textContent));
  ok(/業務委託/.test(rows[1].textContent), '雇用形態が出ていない');
  ok(/事業なし/.test(rows[2].textContent), '事業未設定が分かるようになっていない');
});
T('3. ★給与の項目は画面に出さない(二重管理を作らない)', () => {
  const t = doc.getElementById('pane-emp').textContent;
  ['基本給', '時給', '扶養', '社会保険', '通勤', '住民税'].forEach(w => {
    ok(t.indexOf(w) < 0, '給与の項目が出ている: ' + w);
  });
});
T('3. ★人を追加/削除するボタンが無い(源は給料明細アプリ)', () => {
  const html = doc.getElementById('pane-emp').innerHTML;
  ok(!/従業員を追加|＋ 人|人を追加/.test(html), '追加ボタンがある');
  ok(!/data-del-emp|人を削除/.test(html), '削除ボタンがある');
});
await (async () => {
  doc.querySelector('#emp-rows [data-emp="e1"]').click(); await sleep(10);
  T('3. 人をタップすると編集が開き、今の値が入っている', () => {
    ok(doc.getElementById('emp-edit').style.display !== 'none', '開いていない');
    ok(doc.getElementById('emp-edit-name').textContent === '山田 太郎');
    ok(doc.getElementById('emp-type').value === '従業員', 'type=' + doc.getElementById('emp-type').value);
    ok(doc.getElementById('emp-biz').value === '空調', 'biz=' + doc.getElementById('emp-biz').value);
  });
  doc.getElementById('emp-type').value = '業務委託';
  doc.getElementById('emp-biz').value = '代行';
  doc.getElementById('emp-save').click(); await sleep(30);
  T('3. 保存すると一覧に反映され、渡すのは2つのキーだけ', () => {
    const c = calls.filter(c => c[0] === 'emp.patch').pop();
    ok(c, 'patch が呼ばれていない');
    ok(JSON.stringify(Object.keys(c[2]).sort()) === '["business","employmentType"]', '渡したキー=' + Object.keys(c[2]));
    ok(/業務委託/.test(doc.querySelector('#emp-rows [data-emp="e1"]').textContent), '一覧が更新されていない');
    ok(doc.getElementById('emp-edit').style.display === 'none', '編集が閉じていない');
  });
  doc.querySelector('#emp-rows [data-emp="e3"]').click(); await sleep(10);
  doc.getElementById('emp-cancel').click(); await sleep(10);
  T('3. やめるで閉じる', () => ok(doc.getElementById('emp-edit').style.display === 'none'));
})();

/* ═══ 4. 共有データ: 取引先 ═══ */
await (async () => {
  H.showTab('pt');
  T('4. 取引先の一覧が出る', () => {
    ok(doc.querySelectorAll('#pt-rows .row').length === 1, '行数=' + doc.querySelectorAll('#pt-rows .row').length);
  });
  doc.getElementById('pt-add').click(); await sleep(10);
  T('4. 追加を押すと空のフォームが開く(削除ボタンは出さない)', () => {
    ok(doc.getElementById('pt-edit').style.display !== 'none');
    ok(doc.getElementById('pt-name').value === '', '前の値が残っている');
    ok(doc.getElementById('pt-del').style.display === 'none', '新規なのに削除が出ている');
  });
  doc.getElementById('pt-save').click(); await sleep(20);
  T('4. 名称が空なら保存させない', () => {
    ok(/名称を入れて/.test(doc.getElementById('pt-edit-msg').textContent), 'msg=' + doc.getElementById('pt-edit-msg').textContent);
    ok(db.partners.length === 1, '空のまま保存された');
  });
  doc.getElementById('pt-name').value = '△△工務店';
  doc.getElementById('pt-save').click(); await sleep(40);
  T('4. 取引先を追加できる', () => {
    ok(db.partners.length === 2, 'クラウドに増えていない');
    ok(doc.querySelectorAll('#pt-rows .row').length === 2, '一覧が更新されていない');
    ok(doc.getElementById('pt-edit').style.display === 'none', 'フォームが閉じていない');
  });
  doc.querySelector('#pt-rows [data-pt="pt_a"]').click(); await sleep(10);
  T('4. 既存をタップすると値が入り、削除ボタンが出る', () => {
    ok(doc.getElementById('pt-name').value === '○○建設株式会社');
    ok(doc.getElementById('pt-del').style.display !== 'none');
  });
  doc.getElementById('pt-del').click(); await sleep(40);
  T('4. 削除できる(確認あり)', () => {
    ok(db.partners.length === 1, '消えていない');
    ok(doc.getElementById('pt-edit').style.display === 'none');
  });
  doc.getElementById('pt-add').click(); await sleep(5);
  doc.getElementById('pt-cancel').click(); await sleep(5);
  T('4. やめるで閉じる', () => ok(doc.getElementById('pt-edit').style.display === 'none'));
})();

/* ═══ 5. 集計 ═══ */
await (async () => {
  H.show('scr-agg'); await sleep(40);
  // この時点の前提: テスト3で e1(山田)の事業を 空調→代行 に変えた。台帳は
  //   l1 e2 代行(行で明示) 4200 / l2 e2 (人の既定=代行) 3800 / l3 e1 (人の既定=代行) 210000 / l4 e3 (事業なし) 1000
  //   → 代行 218,000(3件) / 未分類 1,000(1件) / 合計 219,000(4件)。空調は台帳が無いので出ない。
  T('5. 今月の期間が出て、事業別の数字が出る', () => {
    ok(/2026-07-01 〜 2026-07-31/.test(doc.getElementById('agg-range').textContent), 'range=' + doc.getElementById('agg-range').textContent);
    const rows = doc.querySelectorAll('#agg-body .agg-row');
    ok(rows.length === 2, '行数=' + rows.length);
  });
  T('5. ★実数値で合っている(代行218,000/3件・未分類1,000/1件・合計219,000/4件)', () => {
    const txt = doc.getElementById('agg-body').textContent.replace(/\s+/g, '');
    ok(/代行/.test(txt) && /¥218,000/.test(txt), '代行の売上が違う: ' + txt);
    ok(/未分類/.test(txt) && /¥1,000/.test(txt), '未分類が違う: ' + txt);
    ok(/合計4¥219,000/.test(txt), '合計が違う: ' + txt);
    ok(!/空調/.test(txt), '台帳が無い事業まで出ている: ' + txt);
  });
  T('5. 並びは多い順・未分類は最後・バーが出る', () => {
    const names = [...doc.querySelectorAll('#agg-body .agg-b')].map(e => e.textContent.replace(/\d+%/, '').trim());
    ok(names[0].indexOf('代行') === 0 && names[names.length - 1].indexOf('未分類') === 0, '並び=' + names.join(','));
    ok(doc.querySelectorAll('#agg-body .agg-bar > i').length === 2, 'バーが無い');
  });
  T('5. ★散布図や円グラフを作っていない', () => {
    const h = doc.getElementById('scr-agg').innerHTML;
    ok(!/<canvas|<svg[^>]*chart|scatter|pie/i.test(h), '凝ったグラフがある');
  });
  doc.getElementById('agg-kind').value = 'lastMonth';
  doc.getElementById('agg-kind').dispatchEvent(new win.Event('change')); await sleep(40);
  T('5. 先月に切り替わり、記録が無ければ正直に空を出す(数字を作らない)', () => {
    ok(/2026-06-01 〜 2026-06-30/.test(doc.getElementById('agg-range').textContent));
    const t = doc.getElementById('agg-body').textContent;
    ok(/まだありません/.test(t), '空状態が出ていない: ' + t);
    ok(!/¥/.test(t), '0件なのに金額が出ている');
  });
  doc.getElementById('agg-kind').value = 'custom';
  doc.getElementById('agg-kind').dispatchEvent(new win.Event('change')); await sleep(10);
  T('5. 期間指定にすると日付欄が出る', () => {
    ok(doc.getElementById('agg-custom').classList.contains('on'), '日付欄が出ていない');
  });
  doc.getElementById('agg-from').value = '2026-07-31';
  doc.getElementById('agg-to').value = '2026-07-01';
  doc.getElementById('agg-reload').click(); await sleep(30);
  T('5. 開始日と終了日が逆なら、数字を出さずに教える', () => {
    ok(/終了日が開始日より前/.test(doc.getElementById('agg-msg').textContent), 'msg=' + doc.getElementById('agg-msg').textContent);
    ok(doc.getElementById('agg-body').innerHTML === '', '数字が残っている');
  });
  doc.getElementById('agg-from').value = '2026-07-01';
  doc.getElementById('agg-to').value = '2026-07-31';
  failNext = 'ledger';
  doc.getElementById('agg-reload').click(); await sleep(40);
  T('5. ★件数上限で全部読めない時は、合計を出さずに「期間を短く」と出す', () => {
    const m = doc.getElementById('agg-msg').textContent;
    ok(/期間を短く/.test(m), 'msg=' + m);
    ok(doc.getElementById('agg-body').innerHTML === '', '嘘の合計が残っている');
  });
})();

/* ═══ 6. 画面移動と全ボタン ═══ */
T('6. 下部タブで3画面を行き来できる', () => {
  ['scr-hub', 'scr-data', 'scr-agg'].forEach(id => {
    doc.querySelector('.bn-i[data-go="' + id + '"]').click();
    ok(doc.getElementById(id).classList.contains('active'), id + ' に行けない');
    ok(doc.querySelector('.bn-i[data-go="' + id + '"]').classList.contains('active'), id + ' のタブが光らない');
  });
});
await (async () => {
  // 全ボタンを総当たりでクリックして例外0を確認(ログアウト等は無いので全部押せる)
  const before = errs.length;
  const btns = [...doc.querySelectorAll('button')];
  for (const b of btns) { try { b.click(); } catch (e) { errs.push('click例外: ' + (b.id || b.textContent).slice(0, 20) + ' — ' + e.message); } }
  await sleep(60);
  T('6. ★全ボタン(' + btns.length + '個)を押しても例外0', () => {
    ok(errs.length === before, '例外:\n       ' + errs.slice(before).join('\n       '));
  });
})();

T('7. ここまでで JS例外・未処理の失敗が0', () => {
  ok(errs.length === 0, errs.join('\n       '));
});

console.log('\nhub-ui: ' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
