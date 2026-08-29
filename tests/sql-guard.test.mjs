/* sql-guard.test.mjs — ★本番の倉庫に SQLを当てる門番★（2026-08-29）
 *
 *  ★なぜ在るか★
 *    この倉庫には Exally本番 / 給与(Kyually)本番 / 代行請求 の 実データが 同居している。
 *    門番が 素通しなら、1回の当て間違いで 3アプリの 客のデータが 消える。
 *    ⇒ ★門番は「通す物を通す」だけでなく「止める物を 本当に 止める」まで 見る★
 *
 *  ★2層★
 *    ①本物の supabase/*.sql を 全部 食わせて 通る事
 *    ②わざと 危ない物を 食わせて ★1つ残らず 止まる事★
 *
 *  走らせ方: node tests/sql-guard.test.mjs [--self-test]
 *    --self-test … ★門番を わざと 壊して、この試験が 赤に なるか 見る★
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guard, findTargetTables, findDangerous, checkDoBlocks } from '../scripts/sql-guard.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const 壊す = process.argv.includes('--self-test');
let 緑 = 0, 赤 = 0;
function ok(名, 条件, 添え) {
  if (条件) { 緑++; console.log('  ok   ' + 名); }
  else { 赤++; console.log('  ★NG★ ' + 名 + (添え ? '  … ' + 添え : '')); }
}

/* ═══ ① 本物の SQL ═══════════════════════════════════════════
 *  ★repo の supabase/*.sql が 全部 通る、では ない★。
 *  部屋(schema)で 分ける前に 書いた 古い物が 在り、
 *  それは ★門番が 断るのが 正しい★。どちらの側かを ここに 書いておく。 */
console.log('\n[① repo の supabase/*.sql]');
const 当てる物 = ['2026-08-27_recipe.sql'];
const 当てない物 = {
  /* 部屋分けの前に 書いた物。public の pay_* を 作り、drop policy を 使う。
     ダッシュボードで 1回 貼る前提の 物（ファイル自身に そう書いてある）。 */
  'schema-exally.sql': '部屋(schema)分けの前の 物＝public の pay_* を触り drop policy を使う',
};
const SQLディレクトリ = path.join(ROOT, 'supabase');
const 本物 = fs.existsSync(SQLディレクトリ)
  ? fs.readdirSync(SQLディレクトリ).filter((f) => f.endsWith('.sql')).sort()
  : [];
ok('★supabase/*.sql が 1本以上 在る（試験が 空振りしていない）', 本物.length >= 1, '見つかった ' + 本物.length + '本');
ok('★どの .sql も「当てる/当てない」に 仕分けてある（新しい物を 黙って 通さない）',
  本物.every((f) => 当てる物.includes(f) || 当てない物[f]),
  '仕分けの無い物: ' + 本物.filter((f) => !当てる物.includes(f) && !当てない物[f]).join(', '));
for (const f of 当てる物) {
  const sql = fs.readFileSync(path.join(SQLディレクトリ, f), 'utf8');
  const g = guard(sql, { prefix: 'exally.' });
  ok('通る: ' + f, g.ok, g.reasons.join(' / '));
  ok('  触る棚が 全部 exally. の部屋: ' + f,
    g.tables.length > 0 && g.tables.every((t) => t.indexOf('exally.') === 0),
    g.tables.join(', '));
}
for (const f of Object.keys(当てない物)) {
  if (!本物.includes(f)) continue;
  const sql = fs.readFileSync(path.join(SQLディレクトリ, f), 'utf8');
  ok('★断るのが 正しい: ' + f + '（' + 当てない物[f] + '）', !guard(sql, { prefix: 'exally.' }).ok);
}

/* ═══ ①-b grant/revoke の 権限の名前を 文と 読み違えない ═══════
 *  ★2026-08-29 実測★＝ここを 直す時に「門番を 緩める」方へ 行きやすい。
 *  だから ★通る側と 止まる側を 必ず 対で 見る★。 */
console.log('\n[①-b 権限の名前 vs 本物の文]');
const 対 = [
  ['権限名の truncate は 通る', 'revoke update, truncate, references, trigger on exally.recipe from authenticated;', true],
  ['★本物の truncate 文は 止まる★', 'truncate exally.recipe;', false],
  ['★truncate table も 止まる★', 'truncate table exally.recipe;', false],
  ['★do $$ の中の truncate も 止まる★', 'do $$ begin truncate table exally.recipe; end $$;', false],
  ['revoke truncate on … は 通る', 'revoke truncate on exally.recipe from anon;', true],
  ['grant の中の delete は 通る', 'grant select, insert, delete on exally.recipe to authenticated;', true],
  ['★本物の delete 文は 止まる★', 'delete from exally.recipe;', false],
];
for (const [名, sql, 期待] of 対) {
  const g = guard(sql, { prefix: 'exally.' });
  ok(名, g.ok === 期待, g.reasons.join(' / '));
}

/* ═══ ② わざと 危ない物 ＝ ★全部 止まる事★ ═══════════════════ */
console.log('\n[② 危ない物が 1つ残らず 止まる]');
const 止めたい = [
  ['棚を消す',            'drop table exally.recipe;'],
  ['中身を空にする',      'truncate exally.recipe;'],
  ['行を消す',            'delete from exally.recipe where id > 0;'],
  ['行を書き換える',      'update exally.recipe set na = \'x\';'],
  ['行を足す',            'insert into exally.recipe (na) values (\'x\');'],
  ['列を消す',            'alter table exally.recipe drop column na;'],
  ['決まりを消す',        'drop policy recipe_jibun_no_mono_yomu on exally.recipe;'],
  ['★他の部屋の棚★',     'create table public.nanika (id int);'],
  ['★給与の部屋★',       'alter table kyuyo.meisai enable row level security;'],
  ['★部屋なしの棚★',     'create table recipe (id int);'],
  ['★誰でも触れる関数★', 'create function exally.f() returns int as $$ select 1 $$ language sql;'],
  ['★全員に権限★',       'grant select on exally.recipe to public;'],
  ['do$$の中で消す',      'do $$ begin delete from exally.recipe; end $$;'],
  ['do$$の中で他の部屋',  'do $$ begin execute \'create policy p on public.x for select to authenticated using (true)\'; end $$;'],
  ['do$$の中で棚を作る',  'do $$ begin execute \'create table exally.z (id int)\'; end $$;'],
  ['空っぽ',              '-- 何も無い\n'],
];
for (const [名, sql] of 止めたい) {
  const g = guard(sql, { prefix: 'exally.' });
  ok('止まる: ' + 名, !g.ok, '★通してしまった★ tables=' + g.tables.join(','));
}

/* ═══ ③ 通してよい物は 通る（締めすぎていないか）═══════════════ */
console.log('\n[③ 足すだけ・締めるだけ は 通る]');
const 通したい = [
  ['棚を作る',    'create table if not exists exally.a (id int);'],
  ['索引',        'create index if not exists a_idx on exally.a (id);'],
  ['RLSを入れる', 'alter table exally.a enable row level security;'],
  ['決まりを作る','create policy p on exally.a for select to authenticated using (true);'],
  ['説明を付ける','comment on table exally.a is \'説明\';'],
  ['権限を渡す',  'grant select on exally.a to authenticated;'],
  ['★権限を減らす（締める向き）★', 'revoke all on exally.a from anon;'],
  ['確認のselect','select count(*) from exally.a;'],
];
for (const [名, sql] of 通したい) {
  const g = guard(sql, { prefix: 'exally.' });
  ok('通る: ' + 名, g.ok, g.reasons.join(' / '));
}

/* ═══ ④ 部品ごと ═══════════════════════════════════════════ */
console.log('\n[④ 部品ごと]');
ok('★部屋つきで 棚を拾う★',
  findTargetTables('create table exally.recipe (id int);').join(',') === 'exally.recipe',
  findTargetTables('create table exally.recipe (id int);').join(','));
ok('★grant/revoke の棚も 拾う★',
  findTargetTables('revoke all on exally.recipe from anon;').join(',') === 'exally.recipe');
ok('★コメントの中の drop は 拾わない★',
  findDangerous('-- drop table exally.recipe\ncreate table exally.a (id int);').length === 0);
ok('★文字列の中の drop は 拾わない★',
  findDangerous("comment on table exally.a is 'drop table のこと';").length === 0);
ok('★do $$ の数を 数える★', checkDoBlocks('do $$ begin end $$;', 'exally.').数 === 1);

console.log('\nsql-guard: ' + 緑 + '/' + (緑 + 赤) + ' passed');
if (壊す) {
  console.log('★--self-test＝この下で わざと 壊した物を 食わせる（赤が 出れば 見張りは 生きている）★');
  const 抜け道 = [
    'DROP TABLE exally.recipe;',                 // 大文字
    'drop   table   exally.recipe;',             // 空白だらけ
    'create table  KYUYO.meisai (id int);',      // 大文字の 他の部屋
  ];
  let 通ってしまった = 0;
  for (const s of 抜け道) if (guard(s, { prefix: 'exally.' }).ok) { 通ってしまった++; console.log('  ★素通り★ ' + s); }
  if (通ってしまった) { console.log('★抜け道 ' + 通ってしまった + '件★'); process.exit(1); }
  console.log('  ok   抜け道 0件');
}
process.exit(赤 ? 1 : 0);
