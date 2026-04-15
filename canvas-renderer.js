/**
 * canvas-renderer.js - Canvasグリッド描画関数
 * ================================================================
 * 参照するグローバル変数（canvas-grid.html側で定義）:
 *   ctx, canvas, wrapW, wrapH, dpr, scale
 *   scrollTop, scrollLeft, HDR_W, HDR_H, COL_W, ROW_H, COLS, ROWS
 *   selR1, selC1, selR2, selC2
 *   C_HDR_BG, C_HDR_TXT, C_HDR_LINE, C_CELL_BG, C_CELL_LINE
 *   C_SEL_BG, C_SEL_HDR, C_SEL_BORDER, C_CELL_TXT, C_FORMULA
 *   sheets, activeSheet
 *   getCell(), cW(), rH(), colX(), rowY(), xToC(), yToR()
 * ================================================================
 */

function colLetter(c){ var s=''; c+=1; while(c>0){ s=String.fromCharCode(64+((c-1)%26+1))+s; c=Math.floor((c-1)/26); } return s; }

function cellAddr(r,c){ return colLetter(c)+(r+1); }

function updateBar(){
  var addr = cellAddr(selR1,selC1);
  var scaleStr = scale!==1 ? ' ×'+Math.round(scale*10)/10 : '';
  document.getElementById('cell-addr').value = addr+scaleStr;
  var cell=getCell(selR1,selC1);
  document.getElementById('formula-input').value=cell.f||'';
}

function render() {
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,wrapW,wrapH);

  var sC=xToC(HDR_W), sR=yToR(HDR_H), eC=sC, eR=sR;
  while(colX(eC)<wrapW && eC<COLS-1) eC++;
  while(rowY(eR)<wrapH && eR<ROWS-1) eR++;

  // 1. セル白背景
  ctx.fillStyle=C_CELL_BG;
  ctx.fillRect(HDR_W,HDR_H,wrapW,wrapH);

  // 2. 選択セル背景
  ctx.fillStyle=C_SEL_BG;
  for(var r=Math.max(sR,selR1);r<=Math.min(eR+1,selR2);r++)
    for(var c=Math.max(sC,selC1);c<=Math.min(eC+1,selC2);c++)
      ctx.fillRect(colX(c),rowY(r),cW(c),rH(r));

  // 3. グリッド線
  ctx.strokeStyle=C_CELL_LINE; ctx.lineWidth=0.5; ctx.beginPath();
  for(var r=sR;r<=eR+2;r++){
    var ly=Math.round(rowY(r))+0.5; if(ly<=HDR_H||ly>wrapH) continue;
    ctx.moveTo(HDR_W,ly); ctx.lineTo(wrapW,ly);
  }
  for(var c=sC;c<=eC+2;c++){
    var lx=Math.round(colX(c))+0.5; if(lx<=HDR_W||lx>wrapW) continue;
    ctx.moveTo(lx,HDR_H); ctx.lineTo(lx,wrapH);
  }
  ctx.stroke();

  // 4. セルテキスト
  for(var r=sR;r<=eR+1;r++) for(var c=sC;c<=eC+1;c++) drawText(r,c);

  // 5. ヘッダー背景
  ctx.fillStyle=C_HDR_BG;
  ctx.fillRect(0,0,wrapW,HDR_H);
  ctx.fillRect(0,0,HDR_W,wrapH);

  // 6. 選択ヘッダー強調
  ctx.fillStyle=C_SEL_HDR;
  for(var c=selC1;c<=selC2;c++) ctx.fillRect(colX(c),0,cW(c),HDR_H);
  for(var r=selR1;r<=selR2;r++) ctx.fillRect(0,rowY(r),HDR_W,rH(r));

  // 7. ヘッダー線
  ctx.strokeStyle=C_HDR_LINE; ctx.lineWidth=0.5; ctx.beginPath();
  for(var c=sC;c<=eC+2;c++){
    var lx=Math.round(colX(c))+0.5; if(lx<=HDR_W||lx>wrapW) continue;
    ctx.moveTo(lx,0); ctx.lineTo(lx,HDR_H);
  }
  for(var r=sR;r<=eR+2;r++){
    var ly=Math.round(rowY(r))+0.5; if(ly<=HDR_H||ly>wrapH) continue;
    ctx.moveTo(0,ly); ctx.lineTo(HDR_W,ly);
  }
  ctx.moveTo(HDR_W+0.5,0); ctx.lineTo(HDR_W+0.5,wrapH);
  ctx.moveTo(0,HDR_H+0.5); ctx.lineTo(wrapW,HDR_H+0.5);
  ctx.stroke();
  var lastColX = Math.round(colX(COLS))+0.5;
  var lastRowY = Math.round(rowY(ROWS))+0.5;
  ctx.strokeStyle='#3D9E72'; ctx.lineWidth=1.5; ctx.beginPath();
  if(lastColX>HDR_W && lastColX<=wrapW){ ctx.moveTo(lastColX,0); ctx.lineTo(lastColX,wrapH); }
  if(lastRowY>HDR_H && lastRowY<=wrapH){ ctx.moveTo(0,lastRowY); ctx.lineTo(wrapW,lastRowY); }
  ctx.stroke();

  // 8. ヘッダーテキスト
  ctx.textBaseline='middle';
  ctx.textAlign='center';
  var fw=scale<0.75?'normal':'bold';
  var fs=Math.max(9,Math.round(11*Math.min(scale,1.5)));
  ctx.font=fw+' '+fs+'px "Noto Sans JP",sans-serif';
  for(var c=sC;c<=eC+1;c++){
    var x=colX(c),w=cW(c); if(x+w<0||x>wrapW) continue;
    ctx.fillStyle=(c>=selC1&&c<=selC2)?'#1E88E5':C_HDR_TXT;
    ctx.fillText(colLetter(c),x+w/2,HDR_H/2);
  }
  ctx.textAlign='right';
  var rf=Math.max(9,Math.round(11*Math.min(scale,1.5)));
  ctx.font=rf+'px "Noto Sans JP",sans-serif';
  for(var r=sR;r<=eR+1;r++){
    var y=rowY(r),h=rH(r); if(y+h<0||y>wrapH) continue;
    ctx.fillStyle=(r>=selR1&&r<=selR2)?'#1E88E5':C_HDR_TXT;
    ctx.fillText(r+1,HDR_W-4,y+h/2);
  }

  // 9. 左上角
  ctx.fillStyle=C_HDR_BG;
  ctx.fillRect(0,0,HDR_W,HDR_H);
  ctx.strokeStyle=C_HDR_LINE; ctx.lineWidth=0.5;
  ctx.strokeRect(0.5,0.5,HDR_W-0.5,HDR_H-0.5);

  // 10. 選択枠（最前面）
  drawSel();
}

function drawText(r,c){
  var x=colX(c),y=rowY(r),w=cW(c),h=rH(r);
  if(x+w<HDR_W||x>wrapW||y+h<HDR_H||y>wrapH) return;
  var cell=getCell(r,c);
  var display = (cell.d!==undefined && cell.d!=='') ? cell.d : cell.v;
  if(!display) return;
  var isFormula = cell.f && cell.f[0]==='=';
  var showRaw = isFormula && cell.d===cell.f;
  ctx.fillStyle = showRaw ? C_FORMULA : C_CELL_TXT;
  ctx.font=Math.max(9,Math.min(13,Math.round(12*scale)))+'px "Noto Sans JP",sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.save(); ctx.rect(x+1,y,w-2,h); ctx.clip();
  ctx.fillText(display,x+4,y+h/2);
  ctx.restore();
}

function drawSel(){
  var x1=colX(selC1),y1=rowY(selR1);
  var x2=colX(selC2)+cW(selC2),y2=rowY(selR2)+rH(selR2);
  ctx.save();
  ctx.rect(HDR_W,HDR_H,wrapW-HDR_W,wrapH-HDR_H); ctx.clip();
  ctx.strokeStyle=C_SEL_BORDER; ctx.lineWidth=2;
  ctx.strokeRect(x1+1,y1+1,x2-x1-2,y2-y1-2);
  ctx.fillStyle=C_SEL_BORDER;
  ctx.beginPath(); ctx.arc(x2,y2,7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(x2,y2,3.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
