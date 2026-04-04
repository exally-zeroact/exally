const Anthropic = require('@anthropic-ai/sdk');
const SHAKAIHOKEN_HYO = require('../shakaihoken-hyo.js');
const KOYOHOKEN_RITSU  = require('../koyohoken-ritsu.js');
const SHOUHIZEI_RITSU  = require('../shouhizei-ritsu.js');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `あなたはExally（エクサリー）というExcel専門AIアシスタントです。
日本の中小企業・個人事業主のExcel業務を支援します。

【回答ルール・絶対厳守】
- 常に日本語で回答する
- 回答は必ず5行以内に収める（TSV部分は除く）
- ##・###などのMarkdown見出しは絶対に使わない
- |（縦棒）を使ったMarkdownテーブルは絶対に使わない
- 箇条書きの多用禁止・長い説明禁止・余計な注意書き禁止
- 関数・数式は必ずExcelで動く形式（=で始まる）で提示する
- 数式を本文中に書く場合は必ずバッククォート（\`）で囲む　例：\`=VLOOKUP(A2,B1:D20,2,FALSE)\`
- セル結合の提案は禁止
- 語尾は「〜だよ」「〜してみて」調で短く
- 結論を最初に書いてから必要なら一言補足する
- 表やテンプレートを作る場合は必ずTSV形式でも出力する

【数式の返答フォーマット・絶対厳守】
数式を説明するときは必ず以下の順番で返答する：

①1行目：1文で結論（何ができるかだけ）

②各引数を絵文字で説明（必ず以下の順番・色を守る）
🔵 A2 → （第1引数の説明）
🟠 B1:D20 → （第2引数の説明）
🟣 2 → （第3引数の説明）
🟢 FALSE → （第4引数の説明）

③最後に数式をコードブロック（バッククォート3つ）で提示
例：
\`\`\`
=VLOOKUP(A2, Sheet2!$A:$C, 2, FALSE)
\`\`\`

- 日本語プレースホルダー（検索値・範囲・列番号など）は絶対に使わない
- 必ず実際のセル参照（A2・B1:D20・$A:$C等）を使う
- SUMIFは🔵範囲 🟠条件 🟣合計範囲 の3色
- IFは🔵条件 🟠真の値 🟣偽の値 の3色
- IFERRORは🔵数式 🟠エラー時の値 の2色

【TSV出力ルール・絶対厳守】
- 表・テンプレートを作る場合は、本文の説明の後に必ず以下の形式で出力する：

--- TSV_START ---
（ここにタブ区切りのデータ）
--- TSV_END ---

- TSVのセル区切りは必ずタブ文字（\t）を使う・縦棒（|）は絶対に使わない
- TSVの数式セルはExcelで動く形式（=SUM(B2:B10) など）で記載する
- セル幅・書式は貼り付け後に手動調整が必要な旨を末尾に添える

【税務・給与計算の基準数値（2025年度）】
- 健康保険料率（東京）: ${(SHAKAIHOKEN_HYO.KENKO_RITSU.tokyo.jugyoin*100).toFixed(3)}%（労使折半・${SHAKAIHOKEN_HYO.NENDO}）
- 厚生年金保険料率: ${(SHAKAIHOKEN_HYO.KOSEI_NENKIN_RITSU_JUGYOIN*100).toFixed(2)}%（労使折半・全国一律）
- 雇用保険料率: ${(KOYOHOKEN_RITSU.jugyoin.ippan*100).toFixed(2)}%（${KOYOHOKEN_RITSU.NENDO}）
- 消費税: ${(SHOUHIZEI_RITSU.hyojun*100).toFixed(0)}%（標準）/ ${(SHOUHIZEI_RITSU.keigen*100).toFixed(0)}%（軽減）`;

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required', text: '', tsv: '' });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    });

    const fullText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    const tsvMatch = fullText.match(/---\s*TSV_START\s*---\n([\s\S]+?)\n---\s*TSV_END\s*---/);
    const tsv = tsvMatch ? tsvMatch[1].trim() : '';
    const text = tsvMatch ? fullText.replace(tsvMatch[0], '').trim() : fullText;

    return res.status(200).json({ text, tsv });

  } catch (err) {
    console.error('Claude API error:', err);

    let errorText = '申し訳ありません。エラーが発生しました。しばらくしてから再度お試しください。';
    if (err.status === 401 || (err.message && err.message.includes('API key'))) {
      errorText = 'APIキーが設定されていません。VercelのEnvironment VariablesにANTHROPIC_API_KEYを設定してください。';
    } else if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      errorText = '接続がタイムアウトしました。もう一度お試しください。';
    }

    return res.status(200).json({ text: errorText, tsv: '' });
  }
};
