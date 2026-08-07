/* =========================================================
   拼豆星球 — 共享核心：颜色工具 & 绘制（供首页 + 设计器复用）
   ========================================================= */
function hexToRgb(h){ h=h.replace('#',''); if(h.length===3)h=h.split('').map(x=>x+x).join('');
  return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}; }
function rgbToHex(r,g,b){ const t=v=>('0'+Math.max(0,Math.min(255,Math.round(v))).toString(16)).slice(-2);
  return '#'+t(r)+t(g)+t(b); }
function shade(hex,amt){ const c=hexToRgb(hex); const f=amt>=0?amt:-amt;
  if(amt>=0) return rgbToHex(c.r+(255-c.r)*f, c.g+(255-c.g)*f, c.b+(255-c.b)*f);
  return rgbToHex(c.r*(1-f), c.g*(1-f), c.b*(1-f)); }

/* 把任意 hex 量化到最近调色板色（依赖 window.PALETTE，运行时已就绪） */
window.nearestPalette = function(hex){
  const target = hexToRgb(hex);
  let best = window.PALETTE[0], bestD = Infinity;
  for(const c of window.PALETTE){
    const r = hexToRgb(c.hex);
    const d = (r.r-target.r)**2 + (r.g-target.g)**2 + (r.b-target.b)**2;
    if(d < bestD){ bestD = d; best = c; }
  }
  return best.hex;
};

/* 通用：把网格画到任意 ctx（供画廊 / 预览复用） */
window.drawBeads = function(c, g, cols, rows, cell, board){
  c.clearRect(0,0,cols*cell,rows*cell);
  if(board){
    c.fillStyle='#ffffff'; c.fillRect(0,0,cols*cell,rows*cell);
    for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
      const cx=x*cell+cell/2, cy=y*cell+cell/2, r=cell*0.40;
      c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2);
      c.fillStyle='#eceff3'; c.fill();
      c.lineWidth=1; c.strokeStyle='#dde1e7'; c.stroke();
    }
  }
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
    const col=g[y][x]; if(!col) continue;
    const cx=x*cell+cell/2, cy=y*cell+cell/2, r=cell*0.44;
    const grad=c.createRadialGradient(cx-cell*0.14,cy-cell*0.14,r*0.1,cx,cy,r);
    grad.addColorStop(0,shade(col,0.40)); grad.addColorStop(0.55,col); grad.addColorStop(1,shade(col,-0.20));
    c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.fillStyle=grad; c.fill();
    c.beginPath(); c.ellipse(cx-cell*0.13,cy-cell*0.15,r*0.32,r*0.20,-0.5,0,Math.PI*2);
    c.fillStyle='rgba(255,255,255,0.55)'; c.fill();
  }
};
