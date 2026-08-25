# 競合を調べた（2026-08-25）★数字と出典つき★

> ★これは「読んだ物」の記録。うちの都合で良く書かない★。
> ★負けている所を先に書く★（勝っている所だけ書くと 判断を誤らせる）。

---

## 0. まとめ（1画面）

| 相手 | 何が強いか | 何が出来ないか | 値段 |
|---|---|---|---|
| ★Claude for Excel★（Anthropic） | ★#REF! / #VALUE! / 循環参照を 元まで辿って直しを出す★＝レビューで一番 褒められている／複数タブを跨いで 依存を追う／Copilotより上と評価 | ★Excelが要る★（Officeアドイン）／★Excel 2016・2019 の買い切りでは動かない★／VBAは書くだけで実行しない／会話の記録が残らない／★Proだと「5分で上限」「表の整形2回＋エラー確認1回＋計算1回」で使い切った★という報告 | Pro $20/月（年払い$17）〜／★重い人は Max $100〜$200/月★ |
| Microsoft Copilot（Excel） | Officeに最初から居る／Agent Mode | ★開いているブックしか触れない（別ファイル・メール・社内データは 編集の流れから触れない）★／★表(テーブル)にしていない範囲では 式も並べ替えもグラフも作らない★ | M365 の契約に付く |
| ★診断の専用ツール★（PerfectXL / Spreadsheet Detective / Operis OAK / ExcelAnalyzer / XLAudit） | ★式の不揃い・循環参照・エラー・外部リンク切れ・隠れた物を 機械で洗い出す★（うちの★5と同じ土俵）／PerfectXLは2026 Global Excel Awards のBest Add-in | ★ほぼ全部 Excelアドイン（Windows前提・入れる作業が要る）★／★見つけるだけで 直さない★／日本語の説明は無い／値段が高い | ★年 $249〜$2,000超★（PerfectXLは要問合せ） |
| Excel Risk Check | ★入れずにブラウザだけ・無料★／全シートを跨いで 式・名前・条件付き書式まで見る／0〜100の点数 | ★見つけるだけ・直さない★／.xlsx/.xlsm のみ／★10MBで30秒★が目安／英語 | 無料 |

---

## 1. ★うちが勝てる所（数字で言える）★

1. **Excelが要らない**
   Claude for Excel は ★Officeアドイン★＝Excelが要る。★2016/2019の買い切りでは動かない★。
   Copilot も ★開いているブック★が前提。
   ⇒ うちは ★ブラウザだけで開いて 直して 書き出す★。★「Excelが無くても動きます」は 嘘ではない★。

2. **.xlsb を読める**
   Claude.ai へのアップロードは ★.xlsx 30MBまで・.xlsb は載っていない★。
   ⇒ ★司さんの実物は .xlsb（382,313バイト・15,126本の式）★。うちは ★式の一致率100.0%★で読める。

3. **上限の作りが逆**
   相手は ★毎回 ブック全体を読む★＝Proで数分・数タスクで上限。
   うちは ★参照の網を うちで作る（0円・0.06秒）★＋★AIには要る所だけ渡す★＋
   ★レシピは2回目からAIを呼ばない★。＝★使うほど 差が開く★。

4. **見つけるのは機械・直すのはうち**
   診断の専用ツールは ★見つけるだけで 直さない★。
   Claude for Excel は ★直しを出すが Excelが要る★。
   ⇒ ★機械が0円で見つけて、その場で直して、元のファイルは1バイトも触らない★＝この組み合わせは 見当たらない。

---

## 2. ★負けている／油断できない所★

1. ★#REF!・循環参照を「元まで辿って直す」は 相手の一番 褒められている機能★。
   ＝ ★ここは「同じ事が出来る」では足りない。うちが上でないと 選ぶ理由にならない★。
2. ★診断は 専用ツールが 10年以上やっている土俵★（PerfectXL・OAK・Spreadsheet Detective）。
   ＝ ★「うちが初めて」では ない★。うちの差は ★入れずに使える／日本語／その場で直す★の3つ。
3. ★無料で同じ事をする物が 既に在る★（Excel Risk Check・ブラウザ・無料・全シート）。
   ＝ ★診断だけでは お金を取れない★。★直す・繰り返す（レシピ）まで含めて 値段が付く★。
4. Copilot は ★M365に最初から入っている★＝「追加でお金を払う理由」を 毎回 説明する必要がある。

---

## 3. ★この記録から出る「作り方」への影響★

- ★5（E2診断）は ★他社が既にやっている★＝★出す物の質で比べられる★。
  ⇒ ★「見つけた数」ではなく「直せた数・お金がいくら救われたか」で見せる★
    （例：★見ている先が空で 合計が 527,000→186,000 になっていた★＝うちが実際に見つけた型）。
- ★1（形の総ざらい）は ★世の中のExcel★に合わせる。うちの本1冊は「1例」でしかない。
  ⇒ INDIRECT が うちの本で0本でも ★在庫表・シフト表・原価表には 普通に在る★。
- ★9（値段）は ★Pro $20 と Max $100 の間★が 相手の実勢。
  ⇒ ★「上限で止まらない」を 値段の根拠にできる★（相手は数分で止まる）。

---

## 出典（2026-08-25 に読んだ）

- Claude for Excel の評価・上限・出来ない事 … https://aitoolsreview.co.uk/insights/claude-for-excel
- Claude for Excel の値段まとめ … https://www.aiawareness.ai/claude-for-excel-pricing-plans-and-usage-limits/ ／ https://pivotxl.com/claude-for-excel-price/
- Claude のファイル上限（.xlsx 30MB・20ファイル） … https://support.claude.com/en/articles/8241126-upload-files-to-claude ／ https://www.datastudios.org/post/claude-ai-spreadsheet-reading-formats-limits-features-etc
- Copilot Agent Mode の制限（開いているブックのみ・表でないと動かない） … https://techcommunity.microsoft.com/blog/microsoftmechanicsblog/microsoft-excel-power-user-updates--agent-mode-copilot-function--formula-ai/4465676 ／ https://sagnikbhattacharya.com/blog/copilot-agentic-ga-2026
- 診断の専用ツール … https://www.perfectxl.com/products/perfectxl-risk-finder/ ／ https://www.spreadsheetdetective.com/ ／ https://www.operisanalysiskit.com/ ／ https://spreadsheetsoftware.com/excelanalyzer/
- 無料・ブラウザだけの診断 … https://excelriskcheck.com/spreadsheet-audit-tool/
- 値段帯（年 $249〜$2,000超） … https://excelriskcheck.com/excel-audit-tool-free/
