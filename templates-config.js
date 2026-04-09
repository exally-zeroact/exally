// ===== TEMPLATES CONFIG =====
// テンプレートを追加する時はここにオブジェクトを追加するだけ
// previewHTML: CSSミニプレビュー用のHTML（実際の書類イメージ）

var TEMPLATES = [
  {
    id: 'payslip',
    name: '給料明細',
    desc: '月給・時給に対応。控除の自動計算付き',
    file: 'template-demo.html',
    tags: ['給与系', '人気'],
    hot: true,
    previewHTML: `
      <div style="background:#fff;border:1px solid #ddd;width:90%;padding:8px;font-size:7px;color:#333;font-family:'Noto Sans JP',sans-serif;">
        <div style="text-align:center;font-weight:700;font-size:9px;letter-spacing:2px;border-bottom:2px solid #333;padding-bottom:4px;margin-bottom:6px;">給 料 明 細 書</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>氏名：　　　　　様</span><span>支給日：</span>
        </div>
        <div style="background:#F0FAF4;padding:3px 5px;font-weight:700;font-size:7px;margin-bottom:2px;color:#3D9E72;">💰 支給</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
          <tr><td style="border:1px solid #ddd;padding:2px 3px;">基本給</td><td style="border:1px solid #ddd;padding:2px 3px;text-align:right;">¥250,000</td></tr>
          <tr><td style="border:1px solid #ddd;padding:2px 3px;">残業代</td><td style="border:1px solid #ddd;padding:2px 3px;text-align:right;">¥15,000</td></tr>
          <tr><td style="border:1px solid #ddd;padding:2px 3px;">交通費</td><td style="border:1px solid #ddd;padding:2px 3px;text-align:right;">¥12,000</td></tr>
        </table>
        <div style="background:#FFF5F5;padding:3px 5px;font-weight:700;font-size:7px;margin-bottom:2px;color:#C62828;">🔻 控除</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
          <tr><td style="border:1px solid #ddd;padding:2px 3px;">健康保険</td><td style="border:1px solid #ddd;padding:2px 3px;text-align:right;">¥13,700</td></tr>
          <tr><td style="border:1px solid #ddd;padding:2px 3px;">厚生年金</td><td style="border:1px solid #ddd;padding:2px 3px;text-align:right;">¥25,620</td></tr>
          <tr><td style="border:1px solid #ddd;padding:2px 3px;">所得税</td><td style="border:1px solid #ddd;padding:2px 3px;text-align:right;">¥6,160</td></tr>
        </table>
        <div style="background:#F8FEFC;border-top:2px solid #333;padding:3px 5px;display:flex;justify-content:space-between;font-weight:700;">
          <span>差引支給額</span><span style="color:#3D9E72;">¥231,520</span>
        </div>
      </div>
    `
  },
  {
    id: 'invoice',
    name: '請求書・見積書',
    desc: 'インボイス対応。電子判子・控除明細付き',
    file: 'seikyusyo-template.html',
    tags: ['請求系', '人気'],
    hot: true,
    previewHTML: `
      <div style="background:#fff;border:1px solid #ddd;width:90%;padding:8px;font-size:7px;color:#333;font-family:'Noto Sans JP',sans-serif;">
        <div style="text-align:center;font-weight:700;font-size:10px;letter-spacing:4px;border-bottom:2px solid #333;padding-bottom:4px;margin-bottom:6px;">請 求 書</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;">
          <div>
            <div style="font-weight:700;">○○株式会社 御中</div>
          </div>
          <div style="text-align:right;font-size:6px;line-height:1.8;">
            <div>発行日：2026/03/21</div>
            <div>支払期限：2026/04/30</div>
            <div style="font-weight:700;font-size:7px;">○○合同会社</div>
          </div>
        </div>
        <div style="font-size:6px;color:#4A6B5A;margin-bottom:4px;">下記の通り御請求申し上げます。</div>
        <div style="border:2px solid #333;padding:3px 6px;display:inline-flex;gap:8px;margin-bottom:6px;">
          <span style="font-weight:700;">ご請求金額</span>
          <span style="font-weight:700;">¥110,000</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:6px;">
          <tr style="background:#f0f0f0;"><th style="border:1px solid #ddd;padding:2px;">品名</th><th style="border:1px solid #ddd;padding:2px;">数量</th><th style="border:1px solid #ddd;padding:2px;">単価</th><th style="border:1px solid #ddd;padding:2px;">金額</th></tr>
          <tr><td style="border:1px solid #ddd;padding:2px;">Webデザイン</td><td style="border:1px solid #ddd;padding:2px;text-align:center;">1</td><td style="border:1px solid #ddd;padding:2px;text-align:right;">100,000</td><td style="border:1px solid #ddd;padding:2px;text-align:right;">100,000</td></tr>
        </table>
        <div style="text-align:right;margin-top:4px;font-size:6px;line-height:1.8;">
          <div>小計：¥100,000</div>
          <div>消費税(10%)：¥10,000</div>
          <div style="font-weight:700;border-top:1px solid #333;">合計：¥110,000</div>
        </div>
      </div>
    `
  }
];
