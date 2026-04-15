/**
 * canvas-ai.js - AIテキスト整形・数式カラーライズ・書き込み抽出
 * ================================================================
 * 完全独立: DOM・グローバル状態に依存しない
 * ================================================================
 */

function colorizeFormula(text){
  var lp='[\\(（]',rp='[\\)）]',cm='[,，]';
  var reVL=new RegExp('=VLOOKUP'+lp+'([^,，]+)'+cm+'([^,，]+)'+cm+'([^,，]+)'+cm+'\\s*(FALSE|TRUE)\\s*'+rp,'gi');
  text=text.replace(reVL,function(m,a1,a2,a3,a4){return '=VLOOKUP(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>, <span class="arg-purple">'+a3.trim()+'</span>, <span class="arg-green">'+a4.trim()+'</span>)';});
  var reSI=new RegExp('=SUMIF'+lp+'([^,，]+)'+cm+'([^,，]+)'+cm+'([^)）]+)'+rp,'gi');
  text=text.replace(reSI,function(m,a1,a2,a3){return '=SUMIF(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>, <span class="arg-purple">'+a3.trim()+'</span>)';});
  var reIF=new RegExp('=IF'+lp+'([^,，]+)'+cm+'([^,，]+)'+cm+'([^)）]+)'+rp,'gi');
  text=text.replace(reIF,function(m,a1,a2,a3){return '=IF(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>, <span class="arg-purple">'+a3.trim()+'</span>)';});
  var reCI=new RegExp('=COUNTIF'+lp+'([^,，]+)'+cm+'([^)）]+)'+rp,'gi');
  text=text.replace(reCI,function(m,a1,a2){return '=COUNTIF(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>)';});
  var b='\uD83D\uDD35',o='\uD83D\uDFE0',p='\uD83D\uDFE3',g='\uD83D\uDFE2';
  text=text.replace(new RegExp(b+'\\s*\\*\\*([^*]+)\\*\\*','g'),b+' <span class="arg-blue">$1</span>');
  text=text.replace(new RegExp(o+'\\s*\\*\\*([^*]+)\\*\\*','g'),o+' <span class="arg-orange">$1</span>');
  text=text.replace(new RegExp(p+'\\s*\\*\\*([^*]+)\\*\\*','g'),p+' <span class="arg-purple">$1</span>');
  text=text.replace(new RegExp(g+'\\s*\\*\\*([^*]+)\\*\\*','g'),g+' <span class="arg-green">$1</span>');
  return text;
}

function colorizeFormulaBlock(f){
  f=f.replace(/VLOOKUP\s*\(([^,()]+),\s*([^,()]+),\s*([^,()]+),\s*(FALSE|TRUE)\s*\)/gi,function(m,a1,a2,a3,a4){return 'VLOOKUP(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>, <span class="arg-purple">'+a3.trim()+'</span>, <span class="arg-green">'+a4.trim()+'</span>)';});
  f=f.replace(/SUMIF\s*\(([^,()]+),\s*([^,()]+),\s*([^,()]+)\)/gi,function(m,a1,a2,a3){return 'SUMIF(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>, <span class="arg-purple">'+a3.trim()+'</span>)';});
  f=f.replace(/COUNTIF\s*\(([^,()]+),\s*([^,()]+)\)/gi,function(m,a1,a2){return 'COUNTIF(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>)';});
  f=f.replace(/(?<![A-Z])IF\s*\(([^,()]+),\s*([^,()]+),\s*([^,()]+)\)/gi,function(m,a1,a2,a3){return 'IF(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>, <span class="arg-purple">'+a3.trim()+'</span>)';});
  f=f.replace(/ROUND\s*\(([^,()]+),\s*([^,()]+)\)/gi,function(m,a1,a2){return 'ROUND(<span class="arg-blue">'+a1.trim()+'</span>, <span class="arg-orange">'+a2.trim()+'</span>)';});
  return f;
}

function formatAIText(text){
  var blocks = [];
  text = text.replace(/```[\w]*\n?([\s\S]*?)```/g, function(m,c){
    var raw = c.trim();
    var colored = colorizeFormulaBlock(raw);
    blocks.push({colored:colored, raw:raw});
    return '\x00BLOCK'+(blocks.length-1)+'\x00';
  });
  text = colorizeFormula(text);
  text = text.replace(/`([^`]+)`/g,'<span class="inline-code">$1</span>');
  text = text.replace(/\n/g,'<br>');
  text = text.replace(/\x00BLOCK(\d+)\x00/g, function(m,idx){
    var b = blocks[parseInt(idx)];
    var safeRaw = b.raw.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div class="formula-block">'+b.colored+'</div>'
      +'<button class="copy-btn" onclick="copyText(this,\''+safeRaw+'\')">📋 数式をコピー</button>';
  });
  return text;
}

function extractWriteAction(text){
  var idx = text.indexOf('"action"');
  if(idx === -1) return null;
  var start = text.lastIndexOf('{', idx);
  if(start === -1) return null;
  var depth = 0;
  for(var i = start; i < text.length; i++){
    if(text[i] === '{') depth++;
    else if(text[i] === '}'){
      depth--;
      if(depth === 0){
        try {
          var json = JSON.parse(text.substring(start, i+1));
          if(json.action === 'write') return { json:json, start:start, end:i+1 };
        } catch(e) { return null; }
      }
    }
  }
  return null;
}
