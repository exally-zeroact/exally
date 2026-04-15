/**
 * canvas-formula-engine.js - HyperFormula数式エンジンラッパー
 * ================================================================
 * 依存: hyperformula CDN（canvas-grid.htmlで先に読み込むこと）
 * 完全独立: DOM・グローバル状態に依存しない
 * ================================================================
 */

var hf = null;

var HF_ERR = {
  'DIV_BY_ZERO':'#DIV/0!','NUM':'#NUM!','NA':'#N/A','VALUE':'#VALUE!',
  'REF':'#REF!','NAME':'#NAME?','CYCLE':'#CYCLE!','NULL':'#NULL!',
  'SPILL':'#SPILL!','GETTING_DATA':'#GETTING_DATA'
};

// シート名の配列を受け取ってHFを初期化
function initFormulaEngine(sheetNames) {
  if(typeof HyperFormula === 'undefined') return;
  hf = HyperFormula.buildEmpty({licenseKey:'gpl-v3'});
  for(var i=0;i<sheetNames.length;i++) hf.addSheet(sheetNames[i]);
}

// HFからdisplay文字列を取得（内部ヘルパー）
function _hfGetDisplay(sheet, r, c) {
  try {
    var val = hf.getCellValue({sheet:sheet, row:r, col:c});
    if(val===null||val===undefined) return '';
    if(typeof val==='object'&&val.type) return HF_ERR[val.type]||('#'+val.type);
    return String(val);
  } catch(e) { return '#ERR'; }
}

// セルに値をセット → 計算済み表示文字列を返す（HF未初期化時はnullを返す）
function setCellFormula(sheet, r, c, v) {
  if(!hf) return null;
  try {
    hf.setCellContents({sheet:sheet, row:r, col:c}, (v===''||v===null||v===undefined) ? null : v);
    return _hfGetDisplay(sheet, r, c);
  } catch(e) { return null; }
}

// undoで値を戻す（setCellFormulaと同じ処理・意味的に分離）
function undoCellFormula(sheet, r, c, v) {
  return setCellFormula(sheet, r, c, v);
}

// シート追加時にHFへ同期
function addSheetToEngine(name) {
  if(!hf) return;
  try { hf.addSheet(name); } catch(e) {}
}
