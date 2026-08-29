// ============================================================
// scripts/sql-guard.mjs
// ★本番の倉庫にSQLを当てる前の門番（純ロジック・試験の対象）2026-08-29★
//
//   ★この倉庫（tnfwipbgfgjaymlszeid）には
//     Exally本番 / 給与(Kyually)本番 / 代行請求 の 実データが 同居している★。
//   だから ★足すだけ・締めるだけ★ 以外は 1文字も 通さない。
//
//   ★形は 飲み屋(nomiya-app)・ダイコメ(Daikou-app-test)の門番から 借りた★
//   （借りてよいのは 道具・測り方・試験。数字と画面は 各アプリの物）。
//   ★Exally用に 変えた所は 3つ★
//     ①棚の名前ではなく ★部屋(schema)で 締める★＝`exally.` で始まる物だけ
//       （倉庫はアプリごとの部屋に 分けてある。棚の頭文字では 締められない）
//     ②`revoke` を ★締める向きに限って 通す★（借り元は 全部 止めていた）
//       ＝revoke は 権限を 減らす向き。ただし ★exally. の棚に対してだけ★。
//     ③`do $$ … $$` を ★中を読んで 判定する★（借り元は 読めないので 全部 止めていた）
//       ＝2回当てても落ちない書き方（policy が在るか見てから作る）に 必要。
//       中で 走らせてよいのは ★create policy … on exally.… だけ★。
//
//   ▼止める物
//     drop / truncate / delete / update / insert /
//     exally. 以外の 部屋に 触る物 / do $$ の中に 許した物以外が 入っている物
//   ▼通す物
//     create table / create index / create policy / alter table … enable row level security /
//     comment on / grant / revoke（exally. の棚に対してのみ）/ select（確認用）
// ============================================================

/** ★正規表現が 文字列やコメントの中身に 引っかからないように 消す★
 *  do $$ … $$ は ★中を 別に 調べる★ ので、印だけ 残して 場所が 分かるようにする。 */
export function stripNoise(sql, opts) {
  const doBlocks = [];
  let s = String(sql == null ? '' : sql);
  s = s.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
    doBlocks.push(m.slice(2, -2));
    return ' $do$ ';
  });
  s = s.replace(/--[^\n]*/g, ' ');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/'(?:[^']|'')*'/g, "''");
  s = s.replace(/"(?:[^"]|"")*"/g, '""');
  /* ★grant/revoke の「権限の名前の並び」を 落とす★
     ＝`revoke update, truncate, references, trigger on exally.recipe from authenticated`
       の update / truncate は ★権限の名前★であって 文ではない。
     ★2026-08-29 実測★＝これを落とさないと 本物の recipe.sql が「truncate が入っている」で
     止まった。★門番を 緩めたのではなく 読み違いを 直した★
     （本物の truncate 文と do $$ の中の truncate は 試験で 止まる事を 見ている）。 */
  s = s.replace(/\b(grant|revoke)\b[\s\S]*?\bon\b/gi, function (m, kw) { return kw + ' on '; });
  if (opts && opts.collect) opts.collect.doBlocks = doBlocks;
  return s;
}

const DANGER = [
  { name: 'drop', re: /\bdrop\s+(table|policy|column|index|schema|view|function|trigger|type|database|role)\b/i },
  { name: 'truncate', re: /\btruncate\s+(?:table\s+)?[a-z_"]/i },
  { name: 'delete', re: /\bdelete\s+from\b/i },
  { name: 'update', re: /\bupdate\s+[a-z_][\w.]*\s+set\b/i },
  { name: 'insert', re: /\binsert\s+into\b/i },
  { name: 'alter-drop', re: /\balter\s+table\s+[^;]*\bdrop\b/i },
  { name: 'create-function', re: /\bcreate\s+(or\s+replace\s+)?function\b/i },  // 実行権が既定でPUBLIC
  { name: 'grant-all-public', re: /\bgrant\b[^;]*\bto\s+public\b/i },
];

export function findDangerous(sql) {
  const s = stripNoise(sql);
  const hits = [];
  for (const d of DANGER) {
    const m = s.match(d.re);
    if (m) hits.push({ kind: d.name, at: m[0].replace(/\s+/g, ' ').trim() });
  }
  return hits;
}

/** ★このSQLが 触る棚を 部屋つきで 全部 拾う★（exally.recipe の形） */
export function findTargetTables(sql) {
  const s = stripNoise(sql);
  const out = new Set();
  const N = '([a-z_][\\w]*(?:\\.[a-z_][\\w]*)?)';
  const pats = [
    new RegExp('\\bcreate\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?' + N, 'gi'),
    new RegExp('\\balter\\s+table\\s+(?:if\\s+exists\\s+)?' + N, 'gi'),
    new RegExp('\\bcreate\\s+(?:unique\\s+)?index\\s+(?:concurrently\\s+)?(?:if\\s+not\\s+exists\\s+)?[\\w]+\\s+on\\s+' + N, 'gi'),
    new RegExp('\\bcreate\\s+policy\\s+[\\w]+\\s+on\\s+' + N, 'gi'),
    new RegExp('\\bcomment\\s+on\\s+column\\s+' + N + '\\.', 'gi'),
    new RegExp('\\bcomment\\s+on\\s+table\\s+' + N, 'gi'),
    new RegExp('\\bgrant\\s+[^;]*?\\bon\\s+(?:table\\s+)?' + N, 'gi'),
    new RegExp('\\brevoke\\s+[^;]*?\\bon\\s+(?:table\\s+)?' + N, 'gi'),
  ];
  for (const re of pats) {
    let m;
    while ((m = re.exec(s)) !== null) out.add(m[1].toLowerCase());
  }
  return Array.from(out).sort();
}

/** ★do $$ … $$ の 中を 読む★
 *  通すのは 次の形だけ:
 *    begin / end / if … then / end if / 空行
 *    if not exists ( select … )               … 在るか 見るだけ
 *    execute 'create policy … on exally.… '   … 作るだけ
 *  1つでも 外れたら 落とす（★読めない塊を 通さない★）。 */
export function checkDoBlocks(sql, prefix) {
  const box = {};
  stripNoise(sql, { collect: box });
  const 塊 = box.doBlocks || [];
  const reasons = [];
  for (let i = 0; i < 塊.length; i++) {
    const 中 = String(塊[i]);
    // execute の中身（文字列）を 取り出して 別に 見る
    const 走らせる = [];
    let 残り = 中.replace(/\bexecute\s+'((?:[^']|'')*)'/gi, (m, s1) => {
      走らせる.push(String(s1).replace(/''/g, "'"));
      return ' $exec$ ';
    });
    for (const 文 of 走らせる) {
      const re = new RegExp('^\\s*create\\s+policy\\s+[\\w]+\\s+on\\s+' + prefix.replace('.', '\\.') + '[a-z_][\\w]*\\b', 'i');
      if (!re.test(文)) {
        reasons.push('do $$ の中で 許していない物を 走らせようとしている: ' + 文.slice(0, 80));
      }
    }
    // 残り（走らせる物を除いた地の文）に 危ない書き方が 無いか
    残り = 残り.replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, "''");
    for (const d of DANGER) {
      const m = 残り.match(d.re);
      if (m) reasons.push('do $$ の中に 消す/書き換える書き方: ' + d.kind + ' → ' + m[0].trim());
    }
    // 地の文に 許していない命令が 無いか（select と 制御構文だけ）
    const 許す = /\b(begin|end|if|not|exists|select|from|where|and|or|then|is|null|true|false|declare)\b/gi;
    const 語 = 残り.replace(/\$exec\$/g, ' ').replace(/[^a-z_]+/gi, ' ').trim().split(/\s+/).filter(Boolean);
    for (const w of 語) {
      if (!許す.test(w)) {
        許す.lastIndex = 0;
        // pg_policy / polname / polrelid / regclass など 見るための名前は 通す
        if (/^(pg_[\w]*|pol[\w]*|regclass|exally|recipe|[\w]*_[\w]*)$/i.test(w)) continue;
        reasons.push('do $$ の中に 読めない語: ' + w);
      }
      許す.lastIndex = 0;
    }
  }
  return { 数: 塊.length, reasons };
}

/** ★門★ 通すか 止めるか */
export function guard(sql, opts) {
  const prefix = (opts && opts.prefix) || 'exally.';
  const reasons = [];

  for (const d of findDangerous(sql)) {
    reasons.push('消す/書き換える書き方が入っている: ' + d.kind + ' → ' + d.at);
  }

  const tables = findTargetTables(sql);
  const foreign = tables.filter((t) => t.indexOf(prefix) !== 0);
  for (const t of foreign) reasons.push('★他の部屋の棚に触ろうとしている★: ' + t + '（通すのは ' + prefix + ' だけ）');

  const dob = checkDoBlocks(sql, prefix);
  for (const r of dob.reasons) reasons.push(r);

  if (!tables.length && !/\bselect\b/i.test(stripNoise(sql))) {
    reasons.push('何をする物か読み取れない（棚も select も無い）');
  }

  return { ok: reasons.length === 0, reasons, tables, doBlocks: dob.数 };
}
