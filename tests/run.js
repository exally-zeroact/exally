/* run.js — Exally のテストを全部走らせる(依存ゼロ・node だけ)
 *   node tests/run.js
 * 各テストファイルは自分で実行して、失敗があれば exit 1 を返す約束。
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const FILES = [
  'stamp.test.mjs',         // キャッシュバスター(?v=)の道具そのもの
  ['sql-guard.test.mjs', '--self-test'],  // ★倉庫にSQLを当てる門番（本番の実データが同居している）★
  ['empty-ref-zero.test.mjs', '--self-test'],  // ★式が空セルを指したら Excelは0（実物2,918本が これで合う）★
  ['filter-shape.test.mjs', '--self-test'],    // ★FILTERの形／_xlws.の印／範囲の鎖（実物52+10本が これで合う）★
  ['no-lookbehind.test.mjs', '--self-test'],  // ★後読み正規表現＝旧iOS Safariで かたまりが丸ごと動かない★
  ['ribbon.test.mjs', '--self-test'],        // ★リボン＝Excelと同じ配置／押して 届くかまで 見る★
  ['ribbon-label.test.mjs', '--self-test'], // ★札が 箱に 収まり 同じに 見えない（08-30 監査役の 差し戻し）★
  ['ribbon-scope.test.mjs', '--self-test'], // ★空の箱を (a)これから/(b)付けません/(c)出さない に 分ける★
  ['view-extras.test.mjs', '--self-test'],  // ★表示｜表示＝測り直しで 見つけた 組★
  ['type-to-edit.test.mjs', '--self-test'],  // ★セルを 選んで いきなり 打つ（08-30 いうえおあ）★
  ['unused-param.test.mjs', '--self-test'], // ★持っているのに 渡していない 口が 増えていないか★
  ['ribbon-keytips.test.mjs', '--self-test'], // ★Alt の キーが 実 Excel と 同じ順で 効くか★
  ['ctx-menu-items.test.mjs', '--self-test'], // ★右クリックの 中身が 実 Excel に 追いついているか★
  ['header-footer.test.mjs', '--self-test'], // ★紙の 上と 下に 入れる 字（印は 実 Excel に 刷らせて 測った）★
  ['ribbon-launcher.test.mjs', '--self-test'], // ★組の 右下の ↘（開く先の 窓は 既に 在る）★
  ['ribbon-context.test.mjs', '--self-test'], // ★コンテキストタブ 8タブ／235部品の 正本★
  ['formula-extra.test.mjs', '--self-test'], // ★足りない 関数 12個（答えは 実 Excel の 実測）★
  ['valign.test.mjs', '--self-test'],        // ★上下揃え＝実Excelの既定は中央（実測）★
  ['clear.test.mjs', '--self-test'],         // ★クリア3通り＝中身だけ/書式だけ/すべて（実測）★
  ['ribbon-features.test.mjs', '--self-test'],  // ★数式の表示／再計算／ズーム／重複の削除★
  ['named-ranges.test.mjs', '--self-test'],  // ★名前の定義＝日本語の名前をエンジンに渡す前に開く★
  ['split-columns.test.mjs', '--self-test'], // ★区切り位置＝実Excelの TextToColumns どおり★
  ['chart.test.mjs', '--self-test'],         // ★グラフ＝実Excelの既定（360x216・凡例は2本以上）★
  ['comment.test.mjs', '--self-test'],       // ★コメント＝実Excelどおり（作者つき・赤い印だけ）★
  ['page-setup.test.mjs', '--self-test'],    // ★ページ設定＝実Excelの既定（A4縦・枠線も見出しも刷らない）★
  ['protect.test.mjs', '--self-test'],       // ★シートの保護＝実Excelどおり（既定は全セルロック・保護して初めて効く）★
  ['decimal-painter.test.mjs', '--self-test'], // ★小数の増減（上限30桁は実測）／書式のコピー（中身は写さない）★
  ['shift-cells.test.mjs', '--self-test'],   // ★セルの挿入/削除＝実Excelどおり（選んだ列だけ動く）★
  ['cell-styles.test.mjs', '--self-test'],   // ★セルのスタイル＝実Excelから読んだ真値（BGR→RGB）★
  ['sort2.test.mjs', '--self-test'],         // ★並べ替え2つの鍵＝実Excelの並びと一致★
  ['view-toggle.test.mjs', '--self-test'],
  ['link.test.mjs', '--self-test'],
  ['select-all-statusbar.test.mjs', '--self-test'], // ★Ctrl+A（すべて選ぶ）で 帯が落ちない（170億マスを 積もうとして 死んでいた）★         // ★リンク＝実Excelどおり（#467886の下線）／javascript:とdata:は弾く★   // ★表示の切り替え＝実Excelの既定（見出しも枠線も出す）★
  ['chart-types.test.mjs', '--self-test'],   /* ★グラフの種類（凡例の出る/出ない・軸の数・四分位は実測）★ */
  ['sparkline.test.mjs', '--self-test'],     /* ★スパークライン＝実測（飾りなし・勝敗だけマイナス別・縦軸は1本ごと・空は隙間）★ */
  ['formula-bar-type.test.mjs', '--self-test'], /* ★数を入れると 数式バーが落ちて セル選択そのものが 出来なくなっていた★ */
  ['table.test.mjs', '--self-test'],         /* ★テーブル(Ctrl+T)＝実測／行列を足しても 付箋・リンク・表が 置いていかれない★ */
  ['symbol-form.test.mjs', '--self-test'],   /* ★記号と特殊文字（並びは未測定＝理由つき）／フォーム（実測＝まわりの塊）★ */
  ['formula-tab.test.mjs', '--self-test'],   /* ★数式タブ＝計算方法(実測 既定は自動)／選択範囲から名前(見出しは入らない)／無い関数を出さない★ */
  ['view-review-tab.test.mjs', '--self-test'], /* ★ズーム(実測10〜400)／ブックの保護(守るとシートが足せない)／許可範囲／ブックの数★ */
  ['data-tab.test.mjs', '--self-test'],      /* ★フラッシュフィル(1つの見本で覚える)／再適用／ゴールシーク(実測100回・0.001)★ */
  ['home-tab.test.mjs', '--self-test'],      /* ★ホーム＝フォント(在るか測る)／文字の向き(実測の数)／クリップボード24個★ */
  ['pivot.test.mjs', '--self-test'],         /* ★ピボット＝実測の形と 数（列なしは2列だけ）／読みで並べない事も 書く★ */
  ['data-tab2.test.mjs', '--self-test'],     /* ★統合／アウトライン(実測 段2・1段で隠れる)／スライサー(見た目は未測定)★ */
  ['forecast.test.mjs', '--self-test'],      /* ★予測シート＝実測(傾き20・切片80・7つ目220)と 同じ／点検／メモ★ */
  ['automation.test.mjs', '--self-test'],    /* ★自動化＝Officeスクリプトの見本と同じ中身を うちの道具で（10項目）★ */
  ['csv-in.test.mjs', '--self-test'],        /* ★CSV読み込み＝実測どおり（"…"の中のカンマ・""・中の改行）／化けたらShift_JIS★ */
  ['objects.test.mjs', '--self-test'],       /* ★浮かぶ物（画像・図形・テキスト）＝形の番号と重なりは実測・色は写さない★ */
  ['ink.test.mjs', '--self-test'],           /* ★描画（手書き）＝ペンの色と太さは 正本の 項目名どおり／線もシートの座標★ */
  ['arrange.test.mjs', '--self-test'],
  ['view-window.test.mjs', '--self-test'],
  ['no-missing-call.test.mjs', '--self-test'],
  'name-vs-body.test.mjs',                   /* ★「わざと壊して赤になるか」と名乗るのに 何も壊していない試験を 探す（08-30 監査役）★ */
  ['theme.test.mjs', '--self-test'],
  ['boolean.test.mjs', '--self-test'],
  ['insert-diagram.test.mjs', '--self-test'],
  ['data-conn.test.mjs', '--self-test'],
  ['review2.test.mjs', '--self-test'],
  ['xml-dev.test.mjs', '--self-test'],
  ['shape-map-time.test.mjs', '--self-test'],
  ['model-web-data.test.mjs', '--self-test'], /* ★3Dは対角線で合わせて どの向きでも はみ出さない／つなぐ相手は1つずつ★ */ /* ★手書き→図形12/12／升目の日本地図47／日付の通し番号は実測と7/7★ */       /* ★XML＝結ぶ前は読めない・出せない（実測）／2つの読み取りで答えを合わせる★ */       /* ★校閲＝実Excelが測った6語と同じ答え／日本語は通す／見やすさは4.5:1★ */     /* ★詳細設定＝実測4通りの行数／つなぎ台帳＝出来ない更新は そう言う★ */ /* ★図解＝型159・節5は実測／字は形の後に出す（重なる丸で隠れた）／アイコンと数式はうちで描く★ */       /* ★TRUE/FALSEは大文字で出す／SUMは足さない・＋は数になる（実Excel実測）★ */         /* ★テーマ＝12の役割・濃淡は実Excelと15/15一致（0〜240で切り捨て）／色は写さない★ */ /* ★呼んでいるのに 無い 働きを 機械で 探す（08-30 colName 事故）★ */ /* ★表示タブ＝表示の番号1/2/3・分割はPanes4・窓の名前は空白2つ／紙の切れ目は列8で実Excelと同じ★ */       /* ★配置・回転・まとめる＋拡大縮小印刷＝そろえた後の 数は 実測どおり／倍率は 紙に 本当に 効く★ */
  'suite-data.test.js',     // E0 共有データ層の契約
  'aggregate.test.js',      // E1 事業別集計(純関数)
  'ledger-source.test.js',  // E2 台帳→期間の実績値(ctx)
  'cross-agg.test.js',      // E5 横断集計(事業別のまとめ)
  'hub-ui.mjs',             // E1 UI 全ボタン(jsdom)
  'grid-xlsx.test.mjs',     // ★グリッド→xlsx の変換と「落ちる物」の警告(+ toHFVal との同期)
  'grid-date.test.mjs',     // ★打った日付が日付として計算できるか(+30が2056にならない)＋数を日付に化けさせない
  ['grid-date.test.mjs', '--self-test'],
  'grid-colwidth.test.mjs', // ★渡した相手の画面で ######## にならないか(日付の列に幅を付ける)
  ['grid-colwidth.test.mjs', '--self-test'],
  'typed-value.test.mjs',                 // ★E3: 1,234 が文字列で合計に入らない(金が落ちる・期限9/30)
  ['typed-value.test.mjs', '--self-test'],
  'no-duplicate-libs.test.mjs', // ★同じ物を2箇所に置かせない(法定データのコピペ・ドリフト防止)
  'refs-resolve.test.mjs',      // ★読んでいるファイルが実在するか(require/importも参照として数える)
  ['refs-resolve.test.mjs', '--self-test'], // ★わざと壊して赤になるかの自己確認
  'api-claude.test.mjs',        // ★チャットが客に言う基準数値(実数リテラル・NaN混入検知)
  ['api-claude.test.mjs', '--self-test'],  // ★失敗しても200で「答えのふり」をしていた穴(2026-08-22)
  'ios-unsupported.test.mjs',   // ★iPhoneで動かない書き方(type=month/octet-stream/writeFile/Blob散在)
  ['ios-unsupported.test.mjs', '--self-test'],
  'op-registry.test.mjs',       // ★契約の入口(二重登録は投げる)
  'op-boundary.test.mjs',       // ★契約の線(⑤呼ばれているか/⑧面を呼び返していないか/provenance必須)
  ['op-boundary.test.mjs', '--self-test'],
  'no-hardcoded-statutory.test.mjs',      // ★法定の率・額を配信物の文に直書きさせない(説明文だけ年度で取り残される事故)
  ['no-hardcoded-statutory.test.mjs', '--self-test'], // ★わざと壊して赤になるか＋誤検知が出ないか
  'no-hardcoded-supa.test.mjs',           // ★倉庫の向き先を js/supa-config.js 以外に書かせない(テストrepoが本番倉庫を触る事故)
  ['no-hardcoded-supa.test.mjs', '--self-test'], // ★わざと壊して赤になるか＋誤検知が出ないか
  'no-silent-optional.test.mjs',          // ★typeof で守って「無ければ黙って素通り」を許さない(14シート開いてもタブが1枚だった事故)
  ['no-silent-optional.test.mjs', '--self-test'],
  'smart-rounding.test.mjs',              // ★計算の結果を14桁で丸めさせない(消費税が1円ズレる)
  ['smart-rounding.test.mjs', '--self-test'],
  'text-format.test.mjs',                 // ★TEXT()の書式コード(曜日aaa/月名/時刻の分)。実物730本がシリアル値のまま出ていた
  ['text-format.test.mjs', '--self-test'],
  'no-dead-ui.test.mjs',                  // ★出来ていない物のボタン/画面を止める窓/中の言葉(STEP6・実装予定)を客に見せない
  ['no-dead-ui.test.mjs', '--self-test'],
  'cross-sheet.test.mjs',                 // ★他のシートを参照している合計が黙って小さくならないか(527,000が186,000になった)
  'table-refs.test.mjs',                  // ★表の名前での参照(Table[列名])→A1範囲。実物の式11,669本が1本残らず#ERRORだった
  ['table-refs.test.mjs', '--self-test'], // ★わざと壊して赤になるかの自己確認(16通り)
  'kobore.test.mjs',                      // ★足した関数が2つ以上返せるか＝本番に前から在った穴（エンジンに通して打つ）
  ['kobore.test.mjs', '--self-test'],     // ★大きさの宣言を外して 赤になるか
  'bahttext.test.mjs',                    // ★BAHTTEXT＝タイ語の金額。答えは実Excelに116通り打たせた真値
  ['bahttext.test.mjs', '--self-test'],   // ★本物の部品を11通り壊して 赤になるか
  'hyou-no-soto.test.mjs',                // ★診断2本目「ほかの表の その行を見ている」＝実物で62か所（直し方まで出す）
  ['hyou-no-soto.test.mjs', '--self-test'],// ★本物の部品を11通り壊して 赤になるか
  'book-open.test.mjs',                   // ★受け取ったブックを「開いて何も変えずに保存」しても壊れない(実機で出た事故)
  'diff-preview.test.mjs',                // ★直す前に必ず見せる(方針ver.6の②)。1直しで3シート18本 書き換わる
  ['diff-preview.test.mjs', '--self-test'],
  'word-export-import.test.mjs',          // ★言い方を「書き出す↔読み込む」に固定(同じ動きに2通りの名前を付けない)
  ['word-export-import.test.mjs', '--self-test'],
  'excel-parity.test.mjs',                // ★Excelとの差を機械で数え直す(表が古くなったら赤)
  ['excel-parity.test.mjs', '--self-test'],
  'grid-refedit.test.mjs',                // ★式の中の参照を直せるか(=B1+30 の B1 を A1 に直す)
  ['grid-refedit.test.mjs', '--self-test'],
  'grid-edit-ui.mjs',                     // ★本物の book.html で insertRefAddr を動かす(画面の中で直せるか)
  'excel-shortcuts.test.mjs',             // ★Excelと同じキー割り当てを 本物の画面に実際に押して確かめる(真値は実Excelから機械で取った)
  ['excel-shortcuts.test.mjs', '--self-test'],
  'mobile-labels.test.mjs',               // ★スマホの幅で 字を消して「絵だけ」にするのを禁じる(司さんのiPhoneで 📂💾📊 の絵だけになっていた)
  ['mobile-labels.test.mjs', '--self-test'],
  'grid-sort.test.mjs',                   // ★並べ替え(実Excelを COM で動かして測った並び順・見出し判定・式の運ばれ方)
  ['grid-sort.test.mjs', '--self-test'],
  'grid-filter.test.mjs',                 // ★絞り込み(実Excelで実測: 行は消えず隠れるだけ・★合計は変わらない★)
  ['grid-filter.test.mjs', '--self-test'],
  'grid-freeze.test.mjs',                 // ★ウィンドウ枠の固定(実Excelで実測)＋描き方を触った後に 前からある物が壊れていないか
  ['grid-freeze.test.mjs', '--self-test'],
  'grid-find.test.mjs',                   // ★検索と置換(実Excelで実測: ★置換は式を見る＝答えが変わる★／* ? ~ のワイルドカード)
  ['grid-find.test.mjs', '--self-test'],
  'grid-print.test.mjs',                  // ★印刷(実Excelの既定＝A4縦・余白・枠線なし)＋★白紙の印刷ダイアログを出さない★
  ['grid-print.test.mjs', '--self-test'],
  'grid-valid.test.mjs',                  // ★入力の決まり(一覧から選ぶ/整数の範囲)＝打った時だけ止める・合っていない値を数える
  ['grid-valid.test.mjs', '--self-test'],
  'grid-stats.test.mjs',                  // ★選んだ所の合計・平均・個数(帯)＝黙って小さい合計を出さない
  ['grid-stats.test.mjs', '--self-test'],
  'ctx-menu.test.mjs',                    // ★右クリックが画面の中に収まる(743pxが619pxの画面で 上へ470px はみ出した事故)
  ['ctx-menu.test.mjs', '--self-test'],
  'ctx-menu-a-ui.test.mjs',               // ★本物の画面で 右クリックを出す(灰・一覧が長い時の 切り替え)
  ['ctx-menu-a-ui.test.mjs', '--self-test'],
  'yakusoku.test.mjs',                    // ★画面に 書いてある「約束」を 押して 確かめる(字が緑でも 起きない事が在る)
  ['yakusoku.test.mjs', '--self-test'],
  'shift-mado.test.mjs',                  // ★挿入/削除で どちらへ詰めるかを聞く窓(4つ・本当に その向きに 動くか)
  ['shift-mado.test.mjs', '--self-test'],
  'cond-format.test.mjs',                 // ★条件付き書式の当たり判定(実Excelの真値と突き合わせ)
  ['cond-format.test.mjs', '--self-test'],
  'cond-format-ui.test.mjs',              // ★本物の画面で 実際に押す(部品が緑=画面で使える ではない)
  ['cond-format-ui.test.mjs', '--self-test'],
  'ref-graph-forms.test.mjs',             // ★Excelの仕様の側から形を1つずつ（41形＋重い形3つ）
  ['ref-graph-forms.test.mjs', '--self-test'],
  'ref-graph.test.mjs',                   // ★ブック全体の参照の網（別シート401本を落とさない・固まらない）
  ['ref-graph.test.mjs', '--self-test'],
  'book-scan-ui.test.mjs',                // ★調べている間の知らせ（300ms・何枚目・％・必ず消す）
  ['book-scan-ui.test.mjs', '--self-test'],
  'html-script-syntax.test.mjs',          // ★HTMLの中の<script>が 構文で死んでいないか（lint緑・テスト緑でも 死ぬ）
  ['html-script-syntax.test.mjs', '--self-test'],
  'kirikae-egaku.test.mjs',               // ★切り替えた行が「画面に描かれる所」に在るか（選ばれた数ではなく 描かれた物）
  ['kirikae-egaku.test.mjs', '--self-test'],
  'kirikae.test.mjs',                     // ★切り替え＝見る人・見る月を変える（シートは増えない・戻すと元どおり）
  ['kirikae.test.mjs', '--self-test'],
  'vba-tejun.test.mjs',                   // ★マクロから 手順を取り出して レシピにする（取り出せた分だけ・数で言う）
  ['vba-tejun.test.mjs', '--self-test'],
  'vba-ui.test.mjs',                      // ★マクロが 何をしているかを 画面で 出す（描かれた字で 数える）
  ['vba-ui.test.mjs', '--self-test'],
  'vba.test.mjs',                         // ★マクロ（VBA）を 読む・見立てる＝読めた≠正しく読めた・AIには要約だけ
  ['vba.test.mjs', '--self-test'],
  'kikan.test.mjs',                       // ★何月分・◯日からの分（締め期間は Timeally が正本・124通り）
  ['kikan.test.mjs', '--self-test'],
  'kiridashi-jitsubutsu.test.mjs',        // ★司さんの実物で 1人分×何月分を 切り出す（描かれた字で 数え直す）
  ['kiridashi-jitsubutsu.test.mjs', '--self-test'],
  'recipe-ui.test.mjs',                   // ★8-③ 覚えた手順を 画面で押す（AIを呼ぶ前に 機械が当てる・上限を置かない）
  ['recipe-ui.test.mjs', '--self-test'],
  'teian.test.mjs',                       // ★8 提案＝うちから「こう直せますよ」（0円・向こうから出る）
  ['teian.test.mjs', '--self-test'],
  'chizu-horu.test.mjs',                  // ★7 地図＋掘る（地図は数千文字・掘りっぱなしにしない・金額はAIに書かせない）
  ['chizu-horu.test.mjs', '--self-test'],
  'recipe.test.mjs',                      // ★6 レシピ＝手順を覚えて 2回目からはAIを呼ばない（記録の行数で数える）
  ['recipe.test.mjs', '--self-test'],
  'rireki.test.mjs',                      // ★6 履歴＝見る場所（別の入り口から同じに見える・客のブックにタブ0件）
  ['rireki.test.mjs', '--self-test'],
  'chuki.test.mjs',                       // ★注記を外してから読む（見張りの共通部品・同じ型を3回踏んだので決まりにした）
  ['chuki.test.mjs', '--self-test'],
  'ai-genkai.test.mjs',                   // ★掘る数と 叩ける数の 噛み合わせ（2026-09-05）
  ['ai-genkai.test.mjs', '--self-test'],  //   ＝15回叩いて10回で止まり 掘りを全部捨てていた
  'eol.test.mjs',                         // ★行の終わりが CRLF に なると わざと壊す試験が 掴めず
  ['eol.test.mjs', '--self-test'],        //   黙って赤に なる（2026-09-05 に 17本 落ちた）
  'shindan.test.mjs',                     // ★5 E2診断1本目＝消えた参照が IFERROR で隠れている（実物122本）
  ['shindan.test.mjs', '--self-test'],
  'shindan-ui.test.mjs',                  // ★本物の画面で 知らせ・一覧・場所へ行く＋直した所の控え
  ['shindan-ui.test.mjs', '--self-test'],
  'ai-jiko-dome.test.mjs',                // ★4 事故止め（1分10回・1日100回・40,000字・2万トークン・429の言い方・記録）
  ['ai-jiko-dome.test.mjs', '--self-test'],
  'xlsm-vba.test.mjs',                    // ★VBA入り(.xlsm)＝開ける・VBAは1バイトも触らない・動かさない・言葉で先に言う
  ['xlsm-vba.test.mjs', '--self-test'],
  'login-gate.test.mjs',                  // ★表の画面にもログイン／忘れた人の逃げ道（無いと二度と入れない）
  ['login-gate.test.mjs', '--self-test'],
  'ai-reason.test.mjs',                   // ★AIに繋がらない時の理由と次の一手／★空のセルでAIを呼ばない(お金)★
  ['ai-reason.test.mjs', '--self-test'],
  'no-dark-green.test.mjs',               // ★使わないと決めた濃い緑(コードは直ったのにCLAUDE.mdの色の表が教え続けていた)
  ['no-dark-green.test.mjs', '--self-test'],
  // P1② 版対応 検証ハーネス
  'excel-version.test.mjs', // ★その式が相手のExcelで動くか(Excelに無い23個＝常時 / 版マーカー14個＝版連動)
  ['excel-version.test.mjs', '--self-test'],
  'xlsx-harness/roundtrip.test.mjs',        // 数式入りxlsxの往復(SheetJS・★新関数の _xlfn.)
  'xlsx-harness/bare-form.test.mjs',        // ★「客が最初に書く形」のケースが無い関数を赤にする(R19の再発防止)
  'xlsx-harness/alias.test.mjs',            // ★日本語UI名→本名(JIS→DBCS / YEN→DOLLAR。入口=エンジン/出口=書き出し)
  'xlsx-harness/xlfn-coverage.test.mjs',    // ★書き出す関数名が分類済みか(_xlfn.の付け忘れを止める)
  'xlsx-harness/version-scope.test.mjs',    // ★「版対応はここまで」の記述と実装がズレたら赤
  'xlsx-harness/compare.mjs',               // Excelの真値と突合(新規の不一致があれば赤)
  ['xlsx-harness/compare.mjs', '--self-test'], // ★わざと壊して赤になるかの自己確認
  ['xlsx-harness/nesting-audit.mjs', '--probe', '--check'] // ★入れ子で壊れる式が増えていないか
];

/* ★直に叩いた時だけ 走る★（2026-08-29）
   ここを 守らないと 一覧を 読むだけの道具が ★全部の試験を 走らせてしまう★（実際に 起きた）。 */
if (require.main !== module) { module.exports = { FILES }; return; }

let ng = 0;
const 失敗一覧 = [];
for (const f of FILES) {
  const [file, ...args] = Array.isArray(f) ? f : [f];
  console.log('\n=== ' + file + (args.length ? ' ' + args.join(' ') : '') + ' ===');
  /* ★落ちた理由を必ず出す（2026-08-23）★
     CIで1回 赤になったのに ★同じコミットを回し直したら緑★＝★ムラ★だった。
     その時 出ていたのは「★ N ファイルで失敗」だけで、
     ★中で死んだのか（signal）／自分で1を返したのか（status）が 分からなかった★。
     ⇒ ★どちらかを 必ず1行 出す★（次に赤くなった時、新しい壊れ か ムラ かを その場で見分ける） */
  /* ★中で殺される(SIGTRAP)のを止める（2026-08-24）★
     CIで excel-parity が ★signal=SIGTRAP★ で死んだ＝V8 が力尽きた（本物の壊れではない）。
     本物の画面(book.html)を jsdom に丸ごと載せる検査は 重い。★積める量を増やす★。
     ⇒ 落ちた理由を出す1行が無ければ ★「新しい壊れ」と区別できなかった★ */
  try { execFileSync(process.execPath, ['--max-old-space-size=4096', path.join(__dirname, file), ...args], { stdio: 'inherit' }); }
  catch (e) {
    ng++;
    const 印 = e && e.signal ? ('★中で殺された(signal=' + e.signal + ')★＝新しい壊れではない可能性')
      : ('自分で ' + (e && e.status !== undefined && e.status !== null ? e.status : '?') + ' を返した');
    console.log('  ★落ちた★ ' + file + (args.length ? ' ' + args.join(' ') : '') + ' … ' + 印);
    失敗一覧.push(file + (args.length ? ' ' + args.join(' ') : '') + '（' + 印 + '）');
  }
}
console.log('\n' + (ng ? '★ ' + ng + ' ファイルで失敗' : '全テストファイル 緑'));
for (const 名 of 失敗一覧) console.log('   ・' + 名);
process.exit(ng ? 1 : 0);
