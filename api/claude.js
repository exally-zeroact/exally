const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `あなたはExally（エクサリー）というExcel専門AIアシスタントです。
日本の中小企業・個人事業主のExcel業務を支援します。

【回答ルール】
- 常に日本語で回答する
- 関数・数式は必ずExcelで動く形式（=で始まる）で提示する
- 初心者でも理解できるよう、簡潔に説明する
- セル結合の提案は禁止
- 表やテンプレートを作る場合は必ずTSV形式でも出力する

【TSV出力ルール】
- 表・テンプレートを作る場合は、本文の説明の後に必ず以下の形式で出力する：

--- TSV_START ---
（ここにタブ区切りのデータ）
--- TSV_END ---

- TSVの数式セルはExcelで動く形式（=SUM(B2:B10) など）で記載する
- セル幅・書式は貼り付け後に手動調整が必要な旨を末尾に添える

【税務・給与計算の基準数値（2025年度）】
- 健康保険料率（東京）: 4.955%（労使折半）
- 厚生年金保険料率: 9.15%（労使折半）
- 雇用保険料率: 0.55%（令和7年度）
- 消費税: 10%（標準）/ 8%（軽減）`;

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
