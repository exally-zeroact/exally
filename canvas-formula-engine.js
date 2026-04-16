/**

- canvas-formula-engine.js - HyperFormula数式エンジンラッパー
- ================================================================
- 対応済みNG修正（全14件）:
- ① FALSE/TRUE → FALSE()/TRUE() 変換
- ② TEXT(”#,##0”) → JS toLocaleString() 代替
- ③ VALUE() → JS parseFloat() 代替
- ④ NUMBERVALUE() → JS parseFloat() 代替
- ⑤ RANK/RANK.EQ/RANK.AVG → JS実装
- ⑥ PERCENTILE/PERCENTILE.INC/PERCENTILE.EXC → JS実装
- ⑦ QUARTILE/QUARTILE.INC/QUARTILE.EXC → JS実装
- ⑧ BETADIST(3引数) → BETA.DIST変換
- ⑨ HYPGEOMDIST(4引数) → 第5引数FALSE()追加
- ⑩ NEGBINOMDIST(3引数) → 第4引数FALSE()追加
- ⑪ NORMSDIST(1引数) → 第2引数TRUE()追加
- ⑫ DATEVALUE() → JS Date.parse() 代替
- ⑬ ISREF() → JS正規表現で参照判定
- ⑭ SPLIT → スピル関数・今後対応
- ================================================================
  */

var hf = null;

var HF_ERR = {
‘DIV_BY_ZERO’:’#DIV/0!’,‘NUM’:’#NUM!’,‘NA’:’#N/A’,‘VALUE’:’#VALUE!’,
‘REF’:’#REF!’,‘NAME’:’#NAME?’,‘CYCLE’:’#CYCLE!’,‘NULL’:’#NULL!’,
‘SPILL’:’#SPILL!’,‘GETTING_DATA’:’#GETTING_DATA’
};

function initFormulaEngine(sheetNames) {
if(typeof HyperFormula === ‘undefined’) return;
hf = HyperFormula.buildEmpty({licenseKey:‘gpl-v3’});
for(var i=0;i<sheetNames.length;i++) hf.addSheet(sheetNames[i]);
}

function addSheetToEngine(name) {
if(!hf) return;
try { hf.addSheet(name); } catch(e) {}
}

function _hfGetDisplay(sheet, r, c) {
try {
var val = hf.getCellValue({sheet:sheet, row:r, col:c});
if(val===null||val===undefined) return ‘’;
if(typeof val===‘object’&&val.type) return HF_ERR[val.type]||(’#’+val.type);
return String(val);
} catch(e) { return ‘#ERR’; }
}

function _toRC(addr) {
var m = addr.match(/^([A-Z]+)(\d+)$/i);
if(!m) return null;
var col=0;
for(var i=0;i<m[1].length;i++) col=col*26+(m[1].toUpperCase().charCodeAt(i)-64);
return {r:parseInt(m[2])-1, c:col-1};
}

function _getRangeVals(sheet, rangeStr) {
var m = rangeStr.match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
if(!m||!hf) return [];
var s=_toRC(m[1]), e=_toRC(m[2]), vals=[];
for(var r=s.r;r<=e.r;r++)
for(var c=s.c;c<=e.c;c++){
var v=hf.getCellValue({sheet,row:r,col:c});
if(typeof v===‘number’) vals.push(v);
}
return vals;
}

function _getSingleVal(sheet, ref) {
var rc=_toRC(ref);
if(!rc||!hf) return null;
return hf.getCellValue({sheet,row:rc.r,col:rc.c});
}

function _applyTextFormat(num, fmt) {
if(/^#,##0(.0+)?$/.test(fmt)) {
var d = fmt.indexOf(’.’)===-1 ? 0 : fmt.length-fmt.indexOf(’.’)-1;
return num.toLocaleString(‘ja-JP’,{minimumFractionDigits:d,maximumFractionDigits:d});
}
if(/^0+(.0+)?$/.test(fmt)) {
var d = fmt.indexOf(’.’)===-1 ? 0 : fmt.length-fmt.indexOf(’.’)-1;
return num.toFixed(d);
}
if(fmt===‘0%’) return Math.round(num*100)+’%’;
if(fmt===‘0.00%’) return (num*100).toFixed(2)+’%’;
return String(num);
}

function _jsRank(val, vals, order) {
var sorted = vals.slice().sort(function(a,b){return order===0?b-a:a-b;});
var rank = sorted.indexOf(val)+1;
return rank>0 ? rank : ‘#N/A’;
}

function _jsPercentile(vals, k) {
var s=vals.slice().sort(function(a,b){return a-b;}), n=s.length;
var idx=k*(n-1), lo=Math.floor(idx), hi=Math.ceil(idx);
if(lo===hi) return s[lo];
return s[lo]+(idx-lo)*(s[hi]-s[lo]);
}

function _jsQuartile(vals, q) {
return _jsPercentile(vals, [0,0.25,0.5,0.75,1][q]);
}

function _jsDateValue(str) {
var m = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
if(!m) return null;
var d = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
return Math.round((d - new Date(1899,11,30))/86400000);
}

function _jsValue(x) {
var n = parseFloat(String(x).replace(/,/g,’’));
return isNaN(n) ? null : n;
}

function convertFormula(f) {
if(!f||f[0]!==’=’) return f;
f = f.replace(/\bFALSE\b(?!\s*()/g, ‘FALSE()’);
f = f.replace(/\bTRUE\b(?!\s*()/g, ‘TRUE()’);
f = f.replace(/\bNORMSDIST\s*(([^,)]+))/gi, ‘NORMSDIST($1,TRUE())’);
f = f.replace(/\bBETADIST\s*(([^,()]+,[^,()]+,[^,()]+))/gi, ‘BETA.DIST($1,TRUE())’);
f = f.replace(/\bHYPGEOMDIST\s*(([^()]+))/gi, function(m, args) {
return args.split(’,’).length===4 ? ‘HYPGEOMDIST(’+args+’,FALSE())’ : m;
});
f = f.replace(/\bNEGBINOMDIST\s*(([^()]+))/gi, function(m, args) {
return args.split(’,’).length===3 ? ‘NEGBINOMDIST(’+args+’,FALSE())’ : m;
});
f = f.replace(/\bISREF\s*(([^)]+))/gi, function(m, arg) {
return /^[A-Z]+\d+(:[A-Z]+\d+)?$/i.test(arg.trim()) ? ‘TRUE()’ : ‘FALSE()’;
});
return f;
}

function _jsComputeFormula(sheet, v) {
if(!v||v[0]!==’=’||!hf) return null;
var f = v.slice(1).trim();

var mText = f.match(/^TEXT\s*(([A-Z]+\d+)\s*,\s*”([^”]+)”\s*)$/i);
if(mText) {
var num = _getSingleVal(sheet, mText[1]);
if(typeof num===‘number’) return _applyTextFormat(num, mText[2]);
}

var mVal = f.match(/^(?:VALUE|NUMBERVALUE)\s*(([^)]+))$/i);
if(mVal) {
var arg = mVal[1].trim().replace(/^[”’]|[”’]$/g,’’);
var sv = _getSingleVal(sheet, arg);
var n = _jsValue(sv!==null ? sv : arg);
return n!==null ? String(n) : ‘#VALUE!’;
}

var mRank = f.match(/^RANK(?:.EQ|.AVG)?\s*(([A-Z]+\d+)\s*,\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*([01])\s*)$/i);
if(mRank) {
var val = _getSingleVal(sheet, mRank[1]);
var vals = _getRangeVals(sheet, mRank[2]);
if(val!==null && vals.length) return String(_jsRank(val, vals, parseInt(mRank[3])));
}

var mPerc = f.match(/^PERCENTILE(?:.INC|.EXC)?\s*(([A-Z]+\d+:[A-Z]+\d+)\s*,\s*([0-9.]+)\s*)$/i);
if(mPerc) {
var vals = _getRangeVals(sheet, mPerc[1]);
if(vals.length) return String(_jsPercentile(vals, parseFloat(mPerc[2])));
}

var mQuart = f.match(/^QUARTILE(?:.INC|.EXC)?\s*(([A-Z]+\d+:[A-Z]+\d+)\s*,\s*([0-4])\s*)$/i);
if(mQuart) {
var vals = _getRangeVals(sheet, mQuart[1]);
if(vals.length) return String(_jsQuartile(vals, parseInt(mQuart[2])));
}

var mDate = f.match(/^DATEVALUE\s*(\s*”([^”]+)”\s*)$/i);
if(mDate) {
var serial = _jsDateValue(mDate[1]);
return serial!==null ? String(serial) : ‘#VALUE!’;
}

return null;
}

function setCellFormula(sheet, r, c, v) {
if(!hf) return null;
try {
var jsResult = _jsComputeFormula(sheet, v);
if(jsResult !== null) {
hf.setCellContents({sheet,row:r,col:c}, (v===’’||v===null||v===undefined) ? null : v);
return jsResult;
}
var converted = (v&&v[0]===’=’) ? convertFormula(v) : v;
hf.setCellContents({sheet,row:r,col:c}, (converted===’’||converted===null||converted===undefined) ? null : converted);
return _hfGetDisplay(sheet, r, c);
} catch(e) { return null; }
}

function undoCellFormula(sheet, r, c, v) {
return setCellFormula(sheet, r, c, v);
}

function recalcSheet(sheetIdx, data) {
if(!hf) return;
var keys = Object.keys(data);
for(var i=0;i<keys.length;i++){
var cell = data[keys[i]];
if(cell.f && cell.f[0]===’=’){
var parts = keys[i].split(’,’);
var r=parseInt(parts[0]), c=parseInt(parts[1]);
var jsResult = _jsComputeFormula(sheetIdx, cell.f);
cell.d = jsResult!==null ? jsResult : _hfGetDisplay(sheetIdx, r, c);
}
}
}
