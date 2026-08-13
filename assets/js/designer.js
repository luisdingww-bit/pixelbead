/* =========================================================
   拼豆星球 — 拼豆设计器引擎 designer.js
   ========================================================= */
(function(){
  'use strict';

  /* ---------- DOM ---------- */
  const canvas   = document.getElementById('beadCanvas');
  const ctx      = canvas.getContext('2d');
  const iso      = document.getElementById('isoCanvas');
  const ictx     = iso.getContext('2d');
  const paletteEl= document.getElementById('palette');
  const presetEl = document.getElementById('presets');
  const toolEls  = document.querySelectorAll('.tool');
  // 画板尺寸改由「板型预设」按钮控制（见 HTML #boardPresets）
  const statBeads= document.getElementById('statBeads');
  const statColors=document.getElementById('statColors');
  const beadTable= document.getElementById('beadTable');
  const fileInput= document.getElementById('photoInput');
  const toastEl  = document.getElementById('toast');

  /* ---------- 状态 ---------- */
  let COLS = 15, ROWS = 15, CELL = 30;
  let ZOOM = 1;                 // 画板显示缩放（0.4–3）
  let grid = [];               // grid[y][x] = hex | null
  let current = window.PALETTE[2].hex; // 默认红色
  let tool = 'pen';
  let symmetry = 'none';       // none | h | v | quad
  let shapeMode = null;        // null | line | rect | circle
  let drawing = false;
  let undoStack = [], redoStack = [];
  let shapeStart = null;       // 形状拖拽起点
  let pending = null;          // 实时绘制的预览网格

  /* ---------- 边框（展示框） ---------- */
  let frameOn = true, frameTheme = 'camera', frameColor = '#006CB7';
  const FRAME_PX = 34;
  let FRAME = frameOn ? FRAME_PX : 0;

  /* ---------- 模块切换（像素拼豆 / 建筑）---------- */
  function getModule(){
    const p = new URLSearchParams(location.search).get('m');
    return (p && window.MODULES && window.MODULES[p]) ? p : 'pixel';
  }
  let MODULE = getModule();
  function applyModule(m){
    if(!window.MODULES[m]) m='pixel';
    MODULE = m;
    const mod = window.MODULES[m];
    window.PALETTE  = mod.palette.slice();
    window.PATTERNS = mod.patterns;
    current = mod.palette[2] ? mod.palette[2].hex : mod.palette[0].hex;
    buildPalette(); buildPresets();
    const label = document.getElementById('moduleLabel');
    if(label) label.textContent = mod.label + '设计器';
    document.querySelectorAll('#moduleTabs .mtab').forEach(b=>b.classList.toggle('active', b.dataset.mod===m));
    const params = new URLSearchParams(location.search);
    const pname = params.get('p');
    let pat = mod.patterns[0];
    if(pname){
      const found = mod.patterns.find(p => p.name === pname);
      if(found) pat = found;
    }
    if(history.replaceState) history.replaceState(null, '', m==='pixel' ? location.pathname : '?m='+m + (pname ? '&p='+encodeURIComponent(pname) : ''));
    loadPattern(pat); // 默认载入首个模板，URL带 p 则加载指定图案
  }

  /* ---------- 初始化 ---------- */
  function blankGrid(c,r){ const g=[]; for(let y=0;y<r;y++){ const row=[]; for(let x=0;x<c;x++) row.push(null); g.push(row);} return g; }

  function setupCanvas(){
    CELL = Math.max(8, Math.floor(560/COLS*ZOOM));
    FRAME = frameOn ? FRAME_PX : 0;
    canvas.width = COLS*CELL + FRAME*2;
    canvas.height = ROWS*CELL + FRAME*2;
  }

  /* ---------- 主题边框（爆款/动漫/相机风） ---------- */
  function stud(c,x,y,r,col){
    c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fillStyle=col; c.fill();
    c.beginPath(); c.arc(x-r*0.3,y-r*0.3,r*0.42,0,Math.PI*2); c.fillStyle='rgba(255,255,255,.35)'; c.fill();
  }
  function heartPath(c,cx,cy,r){
    c.beginPath();
    const x=cx, y=cy;
    c.moveTo(x,y+r*0.3);
    c.bezierCurveTo(x-r*0.55,y-r*0.45, x-r*1.1,y+r*0.15, x,y+r*1.15);
    c.bezierCurveTo(x+r*1.1,y+r*0.15, x+r*0.55,y-r*0.45, x,y+r*0.3);
    c.closePath();
  }
  function starPath(c,cx,cy,R){
    c.beginPath();
    for(let i=0;i<10;i++){ const a=Math.PI/2+i*Math.PI/5; const r=i%2?R*0.42:R; c.lineTo(cx+Math.cos(a)*r, cy-Math.sin(a)*r); }
    c.closePath();
  }
  const FRAME_THEMES={
    lego:{ name:'乐高', emoji:'🧱', defaultColor:'#E3000B',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height;
        c.fillStyle=col; c.fillRect(0,0,w,h);
        c.lineWidth=3; c.strokeStyle=shade(col,-0.32); c.strokeRect(FRAME*0.5,FRAME*0.5,w-FRAME,h-FRAME);
        c.lineWidth=2; c.strokeStyle=shade(col,0.28); c.strokeRect(FRAME*0.5+3,FRAME*0.5+3,w-FRAME-6,h-FRAME-6);
        const sr=Math.max(3,FRAME*0.18), step=FRAME*1.35, sc=shade(col,0.30);
        for(let x=FRAME*0.5+step/2; x<w-FRAME*0.5; x+=step){ stud(c,x,FRAME*0.5+FRAME*0.34,sr,sc); stud(c,x,h-FRAME*0.5-FRAME*0.34,sr,sc); }
        for(let y=FRAME*0.5+step/2; y<h-FRAME*0.5; y+=step){ stud(c,FRAME*0.5+FRAME*0.34,y,sr,sc); stud(c,w-FRAME*0.5-FRAME*0.34,y,sr,sc); }
      }
    },
    camera:{ name:'相机', emoji:'📷', defaultColor:'#006CB7',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height, dark=shade(col,-0.35), light=shade(col,0.28);
        c.fillStyle=col; c.fillRect(0,0,w,h);
        // 顶部取景器
        c.fillStyle=dark; c.fillRect(bx+bw*0.38, FRAME*0.18, bw*0.24, FRAME*0.42);
        c.fillStyle=light; c.fillRect(bx+bw*0.40, FRAME*0.22, bw*0.20, FRAME*0.30);
        // 两侧装饰条
        c.fillStyle=dark; c.fillRect(FRAME*0.18, by+bh*0.35, FRAME*0.28, bh*0.30); c.fillRect(w-FRAME*0.46, by+bh*0.35, FRAME*0.28, bh*0.30);
        // 底部大镜头
        const lx=w/2, ly=h-FRAME*0.52, lr=FRAME*0.62;
        c.beginPath(); c.arc(lx,ly,lr,0,Math.PI*2); c.fillStyle='#1a1a1a'; c.fill(); c.lineWidth=3; c.strokeStyle=light; c.stroke();
        c.beginPath(); c.arc(lx,ly,lr*0.72,0,Math.PI*2); c.fillStyle=dark; c.fill();
        c.beginPath(); c.arc(lx-3,ly-3,lr*0.38,0,Math.PI*2); c.fillStyle='rgba(255,255,255,.22)'; c.fill();
        // 四角螺丝
        [[bx+8,by+8],[bx+bw-8,by+8],[bx+8,by+bh-8],[bx+bw-8,by+bh-8]].forEach(p=>{ c.beginPath(); c.arc(p[0],p[1],3,0,Math.PI*2); c.fillStyle=light; c.fill(); });
      }
    },
    polaroid:{ name:'拍立得', emoji:'🖼️', defaultColor:'#f4f4f4',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height;
        c.fillStyle=col; c.fillRect(0,0,w,h);
        // 照片区白边
        c.fillStyle='#fff'; c.fillRect(FRAME*0.45, FRAME*0.35, w-FRAME*0.9, h-FRAME*0.85);
        c.lineWidth=2; c.strokeStyle='rgba(0,0,0,.08)'; c.strokeRect(FRAME*0.45, FRAME*0.35, w-FRAME*0.9, h-FRAME*0.85);
        // 底部留白写字区
        c.fillStyle=col; c.fillRect(FRAME*0.45, h-FRAME*0.70, w-FRAME*0.9, FRAME*0.55);
        c.fillStyle='#aaa'; c.font='bold 10px sans-serif'; c.textAlign='center';
        c.fillText('LDPIXEL', w/2, h-FRAME*0.38);
      }
    },
    heart:{ name:'爱心', emoji:'💖', defaultColor:'#E3000B',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height;
        c.fillStyle=col; c.fillRect(0,0,w,h);
        c.fillStyle=shade(col,0.35);
        heartPath(c,w/2,FRAME*0.58,FRAME*0.55); c.fill();
        heartPath(c,FRAME*0.45,by+bh*0.22,FRAME*0.24); c.fill();
        heartPath(c,w-FRAME*0.45,by+bh*0.78,FRAME*0.24); c.fill();
        heartPath(c,FRAME*0.45,by+bh*0.78,FRAME*0.20); c.fill();
        heartPath(c,w-FRAME*0.45,by+bh*0.22,FRAME*0.20); c.fill();
      }
    },
    star:{ name:'星星', emoji:'⭐', defaultColor:'#FFD500',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height;
        c.fillStyle=col; c.fillRect(0,0,w,h);
        c.fillStyle=shade(col,0.25);
        const spots=[[w/2,FRAME*0.55],[FRAME*0.45,by+bh*0.18],[w-FRAME*0.45,by+bh*0.18],[FRAME*0.45,by+bh*0.82],[w-FRAME*0.45,by+bh*0.82]];
        spots.forEach((p,i)=>{ starPath(c,p[0],p[1],FRAME*(0.28-i*0.02)); c.fill(); });
        // 流星线条
        c.strokeStyle=shade(col,0.45); c.lineWidth=2; c.lineCap='round';
        [[bx+8,by+8,bx+22,by+22],[bx+bw-8,by+8,bx+bw-22,by+22],[bx+8,by+bh-8,bx+22,by+bh-22],[bx+bw-8,by+bh-8,bx+bw-22,by+bh-22]].forEach(l=>{ c.beginPath(); c.moveTo(l[0],l[1]); c.lineTo(l[2],l[3]); c.stroke(); });
      }
    },
    gamepad:{ name:'手柄', emoji:'🎮', defaultColor:'#1c1c1c',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height;
        c.fillStyle=col; c.fillRect(0,0,w,h);
        // 顶部横条
        c.fillStyle=shade(col,0.22); c.fillRect(FRAME*0.25, FRAME*0.22, w-FRAME*0.5, FRAME*0.38);
        // 左侧十字键
        const cx1=bx+FRAME*0.55, cy1=FRAME*0.42, u=FRAME*0.16;
        c.fillStyle='#eee'; c.fillRect(cx1-u/2, cy1-u*1.5, u, u*3); c.fillRect(cx1-u*1.5, cy1-u/2, u*3, u);
        // 右侧 AB 键
        const cx2=w-bx-FRAME*0.55, cy2=FRAME*0.42;
        c.beginPath(); c.arc(cx2-u*0.7,cy2-u*0.4,u*0.55,0,Math.PI*2); c.fillStyle='#E3000B'; c.fill();
        c.beginPath(); c.arc(cx2+u*0.7,cy2+u*0.4,u*0.55,0,Math.PI*2); c.fillStyle='#FFD500'; c.fill();
        // 底部 select/start
        c.fillStyle=shade(col,0.45); c.fillRect(bx+bw*0.25, h-FRAME*0.55, bw*0.18, FRAME*0.12); c.fillRect(bx+bw*0.57, h-FRAME*0.55, bw*0.18, FRAME*0.12);
      }
    },
    comic:{ name:'漫画框', emoji:'💬', defaultColor:'#fff',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height;
        c.fillStyle=col; c.fillRect(0,0,w,h);
        // 粗黑外框
        c.lineWidth=5; c.strokeStyle='#1a1a1a'; c.strokeRect(FRAME*0.35, FRAME*0.35, w-FRAME*0.7, h-FRAME*0.7);
        c.lineWidth=2; c.strokeStyle='#1a1a1a';
        // 底部尖角对话框
        c.beginPath(); c.moveTo(w/2-FRAME*0.55, h-FRAME*0.35); c.lineTo(w/2+FRAME*0.55, h-FRAME*0.35); c.lineTo(w/2, h-FRAME*0.08); c.closePath(); c.fillStyle=col; c.fill(); c.stroke();
        // 网点底纹
        c.fillStyle='rgba(0,0,0,.06)';
        for(let y=FRAME*0.5; y<h-FRAME*0.5; y+=7) for(let x=FRAME*0.5; x<w-FRAME*0.5; x+=7) if((x+y)%14===0) c.fillRect(x,y,2,2);
      }
    },
    sakura:{ name:'樱花', emoji:'🌸', defaultColor:'#ff9ec8',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height;
        c.fillStyle=col; c.fillRect(0,0,w,h);
        function petal(px,py,r,rot){
          c.save(); c.translate(px,py); c.rotate(rot);
          c.beginPath(); c.ellipse(0,-r*0.6,r*0.35,r*0.7,0,0,Math.PI*2); c.fill();
          c.restore();
        }
        function flower(px,py,r){ for(let i=0;i<5;i++) petal(px,py,r,i*Math.PI*2/5); c.beginPath(); c.arc(px,py,r*0.22,0,Math.PI*2); c.fillStyle='#fff7e0'; c.fill(); }
        c.fillStyle=shade(col,0.12);
        [[bx+FRAME*0.35,by+FRAME*0.35],[w-bx-FRAME*0.35,by+FRAME*0.35],[bx+FRAME*0.35,by+bh-FRAME*0.35],[w-bx-FRAME*0.35,by+bh-FRAME*0.35]].forEach(p=>flower(p[0],p[1],FRAME*0.32));
        // 飘落花瓣
        c.fillStyle=shade(col,0.25);
        [[w/2,FRAME*0.55],[FRAME*0.55,h/2],[w-FRAME*0.55,h/2]].forEach((p,i)=>petal(p[0],p[1],FRAME*(0.22-i*0.02), Math.PI/4+i));
      }
    },
    /* —— 新增：复古掌机 / 像素化 多样化边框 —— */
    psp:{ name:'PSP', emoji:'🕹️', defaultColor:'#1c1c1c',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height, dk=shade(col,-0.42), lt=shade(col,0.42);
        c.fillStyle=col; c.fillRect(0,0,w,h);
        c.fillStyle=lt; c.fillRect(FRAME*0.22, FRAME*0.16, w-FRAME*0.44, FRAME*0.12);            // 顶部高光
        c.fillStyle=dk; c.fillRect(FRAME*0.22, FRAME*0.06, bw*0.16, FRAME*0.1);                  // 左肩键
        c.fillStyle=dk; c.fillRect(w-FRAME*0.22-bw*0.16, FRAME*0.06, bw*0.16, FRAME*0.1);        // 右肩键
        const lx=bx+FRAME*0.52, ly=FRAME*0.52;                                                   // 左：摇杆
        c.fillStyle=dk; c.beginPath(); c.arc(lx,ly,FRAME*0.26,0,Math.PI*2); c.fill();
        c.fillStyle=shade(col,0.12); c.beginPath(); c.arc(lx,ly,FRAME*0.15,0,Math.PI*2); c.fill();
        const rx=w-bx-FRAME*0.52, ry=FRAME*0.52, r=FRAME*0.12;                                   // 右：△○×□ 四键
        [[0,-1,'#E3000B'],[1,0,'#FFD500'],[0,1,'#006CB7'],[-1,0,'#ffffff']].forEach(k=>{ c.fillStyle=k[2]; c.beginPath(); c.arc(rx+k[0]*FRAME*0.36, ry+k[1]*FRAME*0.36, r,0,Math.PI*2); c.fill(); });
        c.fillStyle=lt; c.beginPath(); c.arc(w/2, h-FRAME*0.52, FRAME*0.15,0,Math.PI*2); c.fill(); // 底部 home 键
        c.fillStyle=col; c.beginPath(); c.arc(w/2, h-FRAME*0.52, FRAME*0.08,0,Math.PI*2); c.fill();
      }
    },
    pixelcam:{ name:'像素相机', emoji:'📷', defaultColor:'#006CB7',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height, dk=shade(col,-0.4), lt=shade(col,0.4), px=Math.max(3,Math.round(FRAME*0.16));
        c.fillStyle=col; c.fillRect(0,0,w,h);
        c.fillStyle=dk; for(let y=FRAME*0.5; y<h-FRAME*0.5; y+=px*2) c.fillRect(FRAME*0.5, y, w-FRAME, 1); // 像素扫描线
        c.fillStyle=lt; c.fillRect(bx+bw*0.36, FRAME*0.22, bw*0.28, FRAME*0.32);                   // 顶部取景器（像素块）
        const cx=w/2, cy=h-FRAME*0.55, R=FRAME*0.42;                                             // 镜头：方块同心环（8-bit）
        [['#111111',R],['#444444',R*0.78],['#777777',R*0.56],['#aaaaaa',R*0.36],[lt,R*0.18]].forEach(([cc,rr])=>{ c.fillStyle=cc; c.fillRect(cx-rr, cy-rr, rr*2, rr*2); });
        c.fillStyle='rgba(255,255,255,.35)'; c.fillRect(cx-R*0.5, cy-R*0.5, px, px);             // 像素高光
        c.fillStyle='#E3000B'; c.fillRect(bx+bw*0.1, FRAME*0.32, px*1.6, px*1.6);                 // REC 像素点
      }
    },
    gameboy:{ name:'Game Boy', emoji:'🟢', defaultColor:'#8bac0f',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height, dk=shade(col,-0.5), lt=shade(col,0.55), screen='#0f380f', px=Math.max(2,Math.round(FRAME*0.1));
        c.fillStyle=col; c.fillRect(0,0,w,h);
        const sw=bw*0.6, sh=FRAME*0.46;                                                         // 屏幕区
        c.fillStyle=screen; c.fillRect(w/2-sw/2, FRAME*0.16, sw, sh);
        c.fillStyle=shade(screen,0.3); c.fillRect(w/2-sw/2+3, FRAME*0.16+3, sw-6, sh-6);
        const dx=bx+FRAME*0.52, dy=FRAME*0.56, u=FRAME*0.14;                                    // 十字键
        c.fillStyle=dk; c.fillRect(dx-u/2, dy-u*1.6, u, u*3.2); c.fillRect(dx-u*1.6, dy-u/2, u*3.2, u);
        const ax=w-bx-FRAME*0.52, ay=FRAME*0.56;                                               // A/B 圆键
        c.fillStyle=dk; c.beginPath(); c.arc(ax, ay+u*0.6, u*0.55,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(ax-u*1.05, ay-u*0.3, u*0.55,0,Math.PI*2); c.fill();
        c.fillStyle=dk; for(let i=0;i<4;i++) for(let j=0;j<4;j++) c.fillRect(bx+FRAME*0.3+i*px*1.4, h-FRAME*0.62+j*px*1.4, px, px); // 喇叭斜点
      }
    },
    vhs:{ name:'VHS 录像', emoji:'📼', defaultColor:'#3a2b5a',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height, dk=shade(col,-0.42), lt=shade(col,0.45);
        c.fillStyle=col; c.fillRect(0,0,w,h);
        c.fillStyle=lt; c.fillRect(FRAME*0.2, FRAME*0.18, w-FRAME*0.4, FRAME*0.22);             // 标签条
        c.fillStyle='#E3000B'; c.fillRect(FRAME*0.2, FRAME*0.18, w-FRAME*0.4, FRAME*0.07);
        const ry=h-FRAME*0.55, r=FRAME*0.24;                                                   // 两个卷轴
        [bx+bw*0.33, w-bx-bw*0.33].forEach(cx=>{
          c.fillStyle=dk; c.beginPath(); c.arc(cx,ry,r,0,Math.PI*2); c.fill();
          c.fillStyle=lt; c.beginPath(); c.arc(cx,ry,r*0.4,0,Math.PI*2); c.fill();
        });
        c.fillStyle='#ffffff'; c.fillRect(bx+bw*0.08, FRAME*0.52, FRAME*0.1, FRAME*0.18); c.fillRect(bx+bw*0.08+FRAME*0.16, FRAME*0.52, FRAME*0.1, FRAME*0.18); // PLAY
        c.fillStyle='rgba(0,0,0,.12)'; for(let y=FRAME*0.5; y<h-FRAME*0.4; y+=4) c.fillRect(FRAME*0.5, y, w-FRAME, 1); // 扫描线
      }
    },
    mosaic:{ name:'像素波点', emoji:'🔳', defaultColor:'#7b3ff2',
      draw(c,bx,by,bw,bh,col){
        const w=canvas.width, h=canvas.height, dk=shade(col,-0.32), px=Math.max(3,Math.round(FRAME*0.18));
        c.fillStyle=col; c.fillRect(0,0,w,h);
        c.fillStyle=dk;
        for(let y=FRAME*0.5; y<h-FRAME*0.5; y+=px) for(let x=FRAME*0.5; x<w-FRAME*0.5; x+=px){
          if(((x/px|0)+(y/px|0))%2===0) c.fillRect(x, y, px-1, px-1);                          // 8-bit 棋盘波点
        }
        c.fillStyle='#ffffff';
        [[FRAME*0.5,FRAME*0.5],[w-FRAME*0.5,FRAME*0.5],[FRAME*0.5,h-FRAME*0.5],[w-FRAME*0.5,h-FRAME*0.5]].forEach(p=>c.fillRect(p[0]-px/2, p[1]-px/2, px, px)); // 四角像素点
      }
    }
  };
  function getTheme(){ return FRAME_THEMES[frameTheme] || FRAME_THEMES.lego; }
  function drawFrame(c){
    const w=canvas.width, h=canvas.height, bx=FRAME, by=FRAME, bw=w-FRAME*2, bh=h-FRAME*2;
    const t=getTheme(); if(t&&t.draw) t.draw(c,bx,by,bw,bh,frameColor);
  }

  function renderCanvas(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(frameOn) drawFrame(ctx);
    ctx.save(); ctx.translate(FRAME,FRAME);
    drawBeads(ctx, grid, COLS, ROWS, CELL, true);
    // 形状预览（半透明当前色）
    if(pending){ ctx.globalAlpha=0.5; for(const [x,y] of pending){ if(x<0||y<0||x>=COLS||y>=ROWS) continue;
      const cx=x*CELL+CELL/2, cy=y*CELL+CELL/2, r=CELL*0.44;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=current; ctx.fill(); }
      ctx.globalAlpha=1; }
    ctx.restore();
  }
  function renderExtras(){
    renderIso();
    updateStats();
    iso.style.border = frameOn ? (Math.round(FRAME_PX*0.32))+'px solid '+frameColor : 'none';
    iso.style.borderRadius = frameOn ? '10px' : '0';
  }
  function render(){ renderCanvas(); renderExtras(); }

  /* ---------- 性能优化：拖动过程中的高频调用做 rAF 合并 ----------
     画板重绘(renderCanvas)很轻，但 3D 预览(renderIso)在大网格下要重画几万颗立方体，
     不能每次 pointermove 都跑。因此拖动时用 requestAnimationFrame 合并，并把 3D/统计
     延后到空闲帧，只在松手时做完整 render。 */
  let _extrasQueued=false;
  function scheduleExtras(){
    if(_extrasQueued) return;
    _extrasQueued=true;
    requestAnimationFrame(()=>{ _extrasQueued=false; renderExtras(); });
  }
  let _moveQueued=false, _moveCell=null;
  function queueDraw(c){
    _moveCell=c;
    if(_moveQueued) return;
    _moveQueued=true;
    requestAnimationFrame(()=>{
      _moveQueued=false;
      if(!drawing) return;
      if(shapeMode){ pending=previewShape(_moveCell.x,_moveCell.y); renderCanvas(); }
      else if(tool==='pen'||tool==='eraser'){ applyTool(_moveCell.x,_moveCell.y); renderCanvas(); }
      scheduleExtras();
    });
  }

  /* ---------- 等距 3D 积木预览 ---------- */
  function renderIso(){
    const W=iso.width, H=iso.height;
    ictx.clearRect(0,0,W,H);
    const tileW=40, tileH=20, lh=22;
    // 收集立方体原始坐标用于自适应
    const cubes=[];
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
      if(!grid[y][x]) continue;
      const ix=(x-y)*tileW/2, iy=(x+y)*tileH/2;
      cubes.push({x,y,ix,iy,col:grid[y][x]});
    }
    if(cubes.length===0){ ictx.fillStyle='#9aa0a6'; ictx.font='14px sans-serif'; ictx.textAlign='center';
      ictx.fillText('画点东西，看 3D 预览 ✨', W/2, H/2); return; }
    let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
    cubes.forEach(cb=>{ minX=Math.min(minX,cb.ix-tileW/2); maxX=Math.max(maxX,cb.ix+tileW/2);
      minY=Math.min(minY,cb.iy-lh-tileH/2); maxY=Math.max(maxY,cb.iy+tileH/2); });
    const pad=24;
    const sc=Math.min((W-2*pad)/(maxX-minX),(H-2*pad)/(maxY-minY));
    const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
    const TX=v=>(v-cx)*sc+W/2, TY=v=>(v-cy)*sc+H/2;

    cubes.sort((a,b)=>(a.x+a.y)-(b.x+b.y)); // 远→近
    cubes.forEach(cb=>{
      const ix=cb.ix, iy=cb.iy, col=cb.col;
      const topY=iy-lh, baseY=iy;
      const N=[TX(ix),TY(topY-tileH/2)], E=[TX(ix+tileW/2),TY(topY)], S=[TX(ix),TY(topY+tileH/2)], W=[TX(ix-tileW/2),TY(topY)];
      const Sb=[TX(ix),TY(baseY+tileH/2)], Wb=[TX(ix-tileW/2),TY(baseY)], Eb=[TX(ix+tileW/2),TY(baseY)];
      // 左面
      poly([W,S,Sb,Wb], shade(col,-0.22));
      // 右面
      poly([S,E,Eb,Sb], shade(col,-0.40));
      // 顶面
      poly([N,E,S,W], col);
      // 凸点
      ictx.beginPath(); ictx.ellipse(TX(ix),TY(topY),tileW*0.20*sc,tileH*0.20*sc,0,0,Math.PI*2);
      ictx.fillStyle=shade(col,0.28); ictx.fill();
    });
    function poly(pts,fill){ ictx.beginPath(); ictx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<pts.length;i++) ictx.lineTo(pts[i][0],pts[i][1]); ictx.closePath();
      ictx.fillStyle=fill; ictx.fill(); ictx.lineWidth=1; ictx.strokeStyle='rgba(0,0,0,.12)'; ictx.stroke(); }
  }

  /* ---------- 统计 & 用豆量 ---------- */
  function updateStats(){
    const counts={}; let n=0;
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const c=grid[y][x]; if(c){ n++; counts[c]=(counts[c]||0)+1; } }
    statBeads.textContent=n; statColors.textContent=Object.keys(counts).length;
    const names={}; window.PALETTE.forEach(p=>names[p.hex]=p.name);
    let rowsHtml='';
    Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).forEach(hex=>{
      rowsHtml+=`<tr><td><span class="dot" style="background:${hex}"></span>${names[hex]||hex}</td><td>${counts[hex]}</td></tr>`;
    });
    beadTable.innerHTML = rowsHtml || '<tr><td colspan="2" style="color:#aaa">还没有豆子～</td></tr>';
  }

  /* ---------- 撤销/重做 ---------- */
  function snapshot(){ undoStack.push(JSON.stringify(grid)); if(undoStack.length>40) undoStack.shift(); redoStack=[]; }
  function undo(){ if(!undoStack.length) return; redoStack.push(JSON.stringify(grid)); grid=JSON.parse(undoStack.pop()); render(); }
  function redo(){ if(!redoStack.length) return; undoStack.push(JSON.stringify(grid)); grid=JSON.parse(redoStack.pop()); render(); }

  /* ---------- 绘画 ---------- */
  function cellFromEvent(e){
    const rect=canvas.getBoundingClientRect();
    const sx=canvas.width/rect.width, sy=canvas.height/rect.height;
    const px=(e.clientX-rect.left)*sx, py=(e.clientY-rect.top)*sy;
    const x=Math.floor((px-FRAME)/CELL), y=Math.floor((py-FRAME)/CELL);
    if(x<0||y<0||x>=COLS||y>=ROWS) return null;
    return {x,y};
  }
  /* 按对称规则写入一个格子（返回所有镜像坐标） */
  function setCellSym(x,y,val){
    if(x<0||y<0||x>=COLS||y>=ROWS) return;
    if(symmetry==='none'||symmetry==='quad'){
      grid[y][x]=val;
      if(symmetry==='quad'){ grid[y][COLS-1-x]=val; grid[ROWS-1-y][x]=val; grid[ROWS-1-y][COLS-1-x]=val; }
    } else if(symmetry==='h'){
      grid[y][x]=val; grid[y][COLS-1-x]=val;
    } else if(symmetry==='v'){
      grid[y][x]=val; grid[ROWS-1-y][x]=val;
    }
  }
  function applyTool(x,y){
    if(tool==='pen') setCellSym(x,y,current);
    else if(tool==='eraser') setCellSym(x,y,null);
    else if(tool==='fill') bucketFill(x,y);
    else if(tool==='picker'){ if(grid[y][x]){ current=grid[y][x]; setCurrentSwatch(); } }
  }

  /* ---------- 形状工具（直线/方块/圆，按住拖拽） ---------- */
  function lineCells(x0,y0,x1,y1){
    const cells=[]; const dx=Math.abs(x1-x0), dy=Math.abs(y1-y0);
    const sx=x0<x1?1:-1, sy=y0<y1?1:-1; let err=dx-dy, x=x0, y=y0;
    while(true){ cells.push([x,y]); if(x===x1&&y===y1) break; const e2=2*err;
      if(e2>-dy){ err-=dy; x+=sx; } if(e2<dx){ err+=dx; y+=sy; } }
    return cells;
  }
  function rectCells(x0,y0,x1,y1){
    const cells=[]; const xa=Math.min(x0,x1), xb=Math.max(x0,x1), ya=Math.min(y0,y1), yb=Math.max(y0,y1);
    for(let y=ya;y<=yb;y++) for(let x=xa;x<=xb;x++) cells.push([x,y]);
    return cells;
  }
  function circleCells(cx,cy,r){
    const cells=[]; const r2=r*r;
    for(let y=Math.round(cy-r);y<=Math.round(cy+r);y++) for(let x=Math.round(cx-r);x<=Math.round(cx+r);x++){
      const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy<=r2) cells.push([x,y]);
    }
    return cells;
  }
  function previewShape(x1,y1){
    if(!shapeStart) return null;
    let cells=[];
    if(shapeMode==='line') cells=lineCells(shapeStart.x,shapeStart.y,x1,y1);
    else if(shapeMode==='rect') cells=rectCells(shapeStart.x,shapeStart.y,x1,y1);
    else if(shapeMode==='circle'){ const r=Math.sqrt((x1-shapeStart.x)**2+(y1-shapeStart.y)**2); cells=circleCells(shapeStart.x,shapeStart.y,r); }
    return cells;
  }
  function commitShape(x1,y1){
    const cells=previewShape(x1,y1);
    if(!cells) return;
    cells.forEach(([x,y])=>setCellSym(x,y,current));
  }
  function bucketFill(sx,sy){
    const target=grid[sy][sx]; const repl=current;
    if(target===repl) return;
    const stack=[[sx,sy]];
    while(stack.length){ const [x,y]=stack.pop();
      if(x<0||y<0||x>=COLS||y>=ROWS) continue;
      if(grid[y][x]!==target) continue;
      grid[y][x]=repl;
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
  }
  canvas.addEventListener('pointerdown',e=>{ const c=cellFromEvent(e); if(!c) return;
    snapshot(); drawing=true; canvas.setPointerCapture(e.pointerId);
    if(shapeMode){ shapeStart=c; pending=previewShape(c.x,c.y); renderCanvas(); scheduleExtras(); }
    else { applyTool(c.x,c.y); renderCanvas(); scheduleExtras(); }
  });
  canvas.addEventListener('pointermove',e=>{ if(!drawing) return; const c=cellFromEvent(e); if(!c) return; queueDraw(c); });
  window.addEventListener('pointerup',e=>{ if(!drawing) return; drawing=false;
    if(shapeMode){ const c=cellFromEvent(e); if(c) commitShape(c.x,c.y); shapeStart=null; pending=null; }
    render(); });

  /* ---------- 调色板（支持品牌色库） ---------- */
  let activeBrand = '';          // '' = 通用
  function activePalette(){
    if(activeBrand && window.BRANDS[activeBrand]) return window.BRANDS[activeBrand];
    return window.PALETTE;
  }
  function buildPalette(){
    const pal = activePalette();
    window.PALETTE = pal;       // 供 nearestPalette / 统计 使用
    paletteEl.innerHTML='';
    pal.forEach(p=>{
      const s=document.createElement('div'); s.className='swatch'; s.style.background=p.hex;
      s.title=(p.code? p.code+' ' : '')+p.name;
      s.dataset.hex=p.hex;
      s.addEventListener('click',()=>{ current=p.hex; setCurrentSwatch(); if(tool==='eraser'||tool==='picker') setTool('pen'); });
      paletteEl.appendChild(s);
    });
    if(!pal.some(p=>p.hex===current)) current = pal[2] ? pal[2].hex : pal[0].hex;
    setCurrentSwatch();
  }
  function setCurrentSwatch(){ document.querySelectorAll('.swatch').forEach(s=>s.classList.toggle('active', s.dataset.hex===current)); }

  /* ---------- 预设 ---------- */
  function buildPresets(){
    presetEl.innerHTML='';
    window.PATTERNS.forEach(p=>{
      const chip=document.createElement('button'); chip.className='preset-chip'; chip.textContent=p.name;
      chip.addEventListener('click',()=>{ snapshot(); loadPattern(p); toast('已载入：'+p.name); });
      presetEl.appendChild(chip);
    });
  }
  function loadPattern(p){
    COLS=p.cols; ROWS=p.rows;
    setupCanvas(); grid=blankGrid(COLS,ROWS);
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) grid[y][x]=p.data[y][x];
    render();
  }

  /* ---------- 工具切换 ---------- */
  function setTool(t){ tool=t; toolEls.forEach(el=>el.classList.toggle('active', el.dataset.tool===t)); }
  toolEls.forEach(el=>el.addEventListener('click',()=>setTool(el.dataset.tool)));

  /* ---------- 画板变换 / 板型预设 / 社区模板 ---------- */
  function resizeGrid(nc, nr){
    const g = blankGrid(nc, nr);
    for(let y=0;y<Math.min(ROWS,nr);y++)
      for(let x=0;x<Math.min(COLS,nc);x++)
        g[y][x] = grid[y][x];
    COLS=nc; ROWS=nr; grid=g;
  }
  function resetSymmetry(){
    symmetry='none';
    document.querySelectorAll('#symRow .tool').forEach(x=>x.classList.toggle('active', x.dataset.sym==='none'));
  }
  function afterTransform(msg){ resetSymmetry(); setupCanvas(); render(); toast(msg); }
  function rotateCW(){               // 顺时针 90°：每行反转后转置
    for(let y=0;y<ROWS;y++) grid[y].reverse();
    const ng=[]; for(let x=0;x<COLS;x++){ const row=[]; for(let y=0;y<ROWS;y++) row.push(grid[y][x]); ng.push(row); }
    grid=ng; const t=COLS; COLS=ROWS; ROWS=t; afterTransform('顺时针旋转 90°');
  }
  function rotateCCW(){              // 逆时针 90°：转置后每行反转
    const ng=[]; for(let x=0;x<COLS;x++){ const row=[]; for(let y=0;y<ROWS;y++) row.push(grid[y][x]); ng.push(row); }
    for(let y=0;y<ng.length;y++) ng[y].reverse();
    grid=ng; const t=COLS; COLS=ROWS; ROWS=t; afterTransform('逆时针旋转 90°');
  }
  function flipH(){ for(let y=0;y<ROWS;y++) for(let x=0;x<COLS/2;x++){ const t=grid[y][x]; grid[y][x]=grid[y][COLS-1-x]; grid[y][COLS-1-x]=t; } afterTransform('水平翻转'); }
  function flipV(){ for(let y=0;y<ROWS/2;y++) for(let x=0;x<COLS;x++){ const t=grid[y][x]; grid[y][x]=grid[ROWS-1-y][x]; grid[ROWS-1-y][x]=t; } afterTransform('垂直翻转'); }
  function zoomIn(){  ZOOM=Math.min(3, +(ZOOM+0.25).toFixed(2)); setupCanvas(); render(); updateZoomLabel(); }
  function zoomOut(){ ZOOM=Math.max(0.4, +(ZOOM-0.25).toFixed(2)); setupCanvas(); render(); updateZoomLabel(); }
  function zoomFit(){ ZOOM=1; setupCanvas(); render(); updateZoomLabel(); }
  function updateZoomLabel(){ const el=document.getElementById('zoomLabel'); if(el) el.textContent=Math.round(ZOOM*100)+'%'; }

  /* ---------- 社区模板：跨模块载入 ---------- */
  function loadCommunityTemplate(t){
    if(MODULE !== t.module) applyModule(t.module);
    const mod = window.MODULES[t.module];
    const found = mod.patterns.find(p => p.name === t.name);
    if(found){ snapshot(); loadPattern(found); toast('已载入社区模板：'+t.name); }
  }
  function buildCommunity(){
    const el=document.getElementById('community');
    if(!el || !window.COMMUNITY) return;
    el.innerHTML='';
    window.COMMUNITY.forEach(t=>{
      const chip=document.createElement('button'); chip.className='preset-chip';
      chip.textContent=t.name; chip.title=(t.tag||'')+(t.author?(' · '+t.author):'');
      chip.addEventListener('click',()=>loadCommunityTemplate(t));
      el.appendChild(chip);
    });
  }

  /* ---------- 照片转图案（颜色数 + 抖动） ---------- */
  function photoToGrid(img, nColors, dither){
    const tmp=document.createElement('canvas'); tmp.width=COLS; tmp.height=ROWS;
    const tctx=tmp.getContext('2d');
    tctx.drawImage(img,0,0,COLS,ROWS);
    let data=tctx.getImageData(0,0,COLS,ROWS).data;
    const pal=activePalette();
    // 先量化为 nColors 的代表色（按亮度+色相简单聚类）
    const reps=quantize(data, nColors, pal);
    const out=blankGrid(COLS,ROWS);
    const d=Float32Array.from({length:COLS*ROWS*3}, ()=>0);
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
      const i=(y*COLS+x)*4;
      let r=data[i], g=data[i+1], b=data[i+2];
      if(dither){ // Floyd–Steinberg
        const di=(y*COLS+x)*3; r+=d[di]; g+=d[di+1]; b+=d[di+2];
      }
      const best=nearestOf([clamp(r),clamp(g),clamp(b)], reps);
      out[y][x]=best.hex;
      if(dither){
        const di=(y*COLS+x)*3; const er=r-best.rgb[0], eg=g-best.rgb[1], eb=b-best.rgb[2];
        const add=(xx,yy,a)=>{ if(xx<0||yy<0||xx>=COLS||yy>=ROWS) return; const k=(yy*COLS+xx)*3; d[k]+=er*a; d[k+1]+=eg*a; d[k+2]+=eb*a; };
        add(x+1,y,7/16); add(x-1,y+1,3/16); add(x,y+1,5/16); add(x+1,y+1,1/16);
      }
    }
    return out;
  }
  function clamp(v){ return Math.max(0,Math.min(255,Math.round(v))); }
  function nearestOf(rgb, reps){
    let best=reps[0], bd=Infinity;
    for(const r of reps){ const dd=(r.rgb[0]-rgb[0])**2+(r.rgb[1]-rgb[1])**2+(r.rgb[2]-rgb[2])**2; if(dd<bd){bd=dd;best=r;} }
    return best;
  }
  function quantize(data, nColors, pal){
    // 取调色板中最接近图像主色的 nColors 个
    const used=new Set();
    const acc={};
    for(let i=0;i<data.length;i+=4){ const key=(data[i]>>4)+','+(data[i+1]>>4)+','+(data[i+2]>>4); acc[key]=(acc[key]||0)+1; }
    const buckets=Object.keys(acc).map(k=>{ const [r,g,b]=k.split(',').map(n=>parseInt(n)*16); return {rgb:[r,g,b],n:acc[k]}; });
    // 用调色板代表色
    const reps=pal.map(p=>{ const c=hexToRgb(p.hex); return {hex:p.hex, rgb:[c.r,c.g,c.b], w:0}; });
    buckets.forEach(bk=>{ const near=nearestOf(bk.rgb, reps); near.w+=bk.n; });
    reps.sort((a,b)=>b.w-a.w);
    return reps.slice(0,Math.min(nColors, reps.length));
  }
  let pendingImg=null;
  function updatePhotoDims(){
    if(!pendingImg) return;
    const w=parseInt(document.getElementById('phWidth').value);
    const square=document.getElementById('phSquare').checked;
    let cols, rows;
    if(square){ cols=w; rows=w; }
    else {
      const ar=pendingImg.width/pendingImg.height;
      cols=w; rows=Math.max(1, Math.round(w/ar));
      // 限制极端比例下的边长，避免性能/清晰度过差
      const cap=200; if(cols>cap){ cols=cap; rows=Math.max(1,Math.round(cols/ar)); }
      if(rows>cap){ rows=cap; cols=Math.max(1,Math.round(rows*ar)); }
    }
    document.getElementById('phDims').textContent=`将生成 ${cols} × ${rows} 网格（约 ${cols*rows} 颗豆）`;
  }
  fileInput.addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    const img=new Image(); const url=URL.createObjectURL(f);
    img.onload=()=>{
      pendingImg=img;
      document.getElementById('photoOpts').style.display='block';
      document.getElementById('phExport').disabled=true;
      updatePhotoDims();
      toast('已选图片，调好网格宽度 / 颜色数后点「转换生成图纸」');
    };
    img.src=url;
  });
  document.getElementById('phWidth').addEventListener('input',e=>{
    document.getElementById('phWidthV').textContent=e.target.value; updatePhotoDims();
  });
  document.getElementById('phSquare').addEventListener('change',updatePhotoDims);
  document.getElementById('phColors').addEventListener('input',e=>{ document.getElementById('phColorsV').textContent=e.target.value; });
  document.getElementById('phConvert').addEventListener('click',()=>{
    if(!pendingImg) return;
    const w=parseInt(document.getElementById('phWidth').value);
    const n=parseInt(document.getElementById('phColors').value);
    const dith=document.getElementById('phDither').checked;
    const square=document.getElementById('phSquare').checked;
    // 计算网格行列（适配图片比例）
    let cols, rows;
    if(square){ cols=w; rows=w; }
    else {
      const ar=pendingImg.width/pendingImg.height;
      cols=w; rows=Math.max(1, Math.round(w/ar));
      const cap=200; if(cols>cap){ cols=cap; rows=Math.max(1,Math.round(cols/ar)); }
      if(rows>cap){ rows=cap; cols=Math.max(1,Math.round(rows*ar)); }
    }
    COLS=cols; ROWS=rows;
    snapshot(); grid=photoToGrid(pendingImg, n, dith); setupCanvas(); render();
    setTool('pen');
    document.getElementById('phExport').disabled=false;
    toast('已生成 '+COLS+'×'+ROWS+' 拼豆图纸（'+n+' 色'+(dith?'+抖动':'')+'）· 右侧可导出');
  });
  document.getElementById('phExport').addEventListener('click',()=>{
    if(!pendingImg && statBeads.textContent==='0'){ toast('请先转换一张图片'); return; }
    exportPDF();
  });

  /* ---------- 文字 / 网址转图案 ---------- */
  function textToGrid(text){
    text = (text||'LD').toString().slice(0,12);
    const cw=7, ch=9, gap=1;                      // 每个字符 7×9 点阵
    const lines=[text.toUpperCase()];
    const cols = text.length*cw + (text.length-1)*gap;
    const rows = ch;
    const g=blankGrid(Math.max(cols,COLS),rows);
    // 简易 5×7 字体（仅字母数字 + 常用符号）
    const FONT={ 'A':[14,17,17,31,17,17,17],'B':[30,17,17,30,17,17,30],'C':[14,17,16,16,16,17,14],
      'D':[30,17,17,17,17,17,30],'E':[31,16,16,30,16,16,31],'F':[31,16,16,30,16,16,16],'G':[14,17,16,19,17,17,14],
      'H':[17,17,17,31,17,17,17],'I':[14,4,4,4,4,4,14],'J':[7,2,2,2,18,18,12],'K':[17,17,18,28,18,17,17],
      'L':[16,16,16,16,16,16,31],'M':[17,27,21,21,17,17,17],'N':[17,25,21,19,17,17,17],'O':[14,17,17,17,17,17,14],
      'P':[30,17,17,30,16,16,16],'Q':[14,17,17,17,21,18,13],'R':[30,17,17,30,18,17,17],'S':[15,16,16,14,1,1,30],
      'T':[31,4,4,4,4,4,4],'U':[17,17,17,17,17,17,14],'V':[17,17,17,17,17,10,4],'W':[17,17,17,21,21,27,17],
      'X':[17,17,10,4,10,17,17],'Y':[17,17,10,4,4,4,4],'Z':[31,1,2,4,8,16,31],
      '0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],'3':[30,1,2,6,1,17,14],
      '4':[2,6,10,18,31,2,2],'5':[31,16,30,1,1,17,14],'6':[14,16,16,30,17,17,14],'7':[31,1,2,4,8,8,8],
      '8':[14,17,17,14,17,17,14],'9':[14,17,17,15,1,1,14],' ':[],'.':[0,0,0,0,0,0,4],':':[0,4,0,0,4,0,0],
      '@':[14,17,19,21,20,16,14],'/':[1,1,2,4,8,16,16],'-':[0,0,0,31,0,0,0],'_':[0,0,0,0,0,0,31] };
    let ox=0;
    for(const ch of text.toUpperCase()){
      const glyph=FONT[ch]||FONT[' '];
      for(let r=0;r<7;r++){ const row=glyph[r]||0; for(let c=0;c<5;c++){ if((row>>(4-c))&1) g[r+1][ox+c]=current; } }
      ox+=cw+gap;
    }
    return { data:g, cols:Math.max(cols,COLS), rows:rows };
  }
  document.getElementById('btnText').addEventListener('click',()=>{
    const t=document.getElementById('textInput').value.trim();
    if(!t){ toast('请先输入文字'); return; }
    const r=textToGrid(t); COLS=r.cols; ROWS=r.rows;
    setupCanvas(); grid=r.data; snapshot(); render(); toast('已生成文字图案：'+t);
  });

  /* ---------- 导出 PDF 图纸（纯前端，无依赖） ---------- */
  function exportPDF(){
    const pal=activePalette();
    const counts={}; let n=0;
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const c=grid[y][x]; if(c){ n++; counts[c]=(counts[c]||0)+1; } }
    const used=Object.keys(counts).map(hex=>{
      const p=pal.find(p=>p.hex.toUpperCase()===hex.toUpperCase()) || {code:'?',name:'色',hex:hex};
      return {code:p.code||'?', name:p.name||'色', hex:hex, n:counts[hex]};
    }).sort((a,b)=>b.n-a.n);

    const cellPx=22, pad=28, legendW=210;
    const gridW=COLS*cellPx, gridH=ROWS*cellPx;
    const W=gridW+legendW+pad*2, H=gridH+pad*2+46;
    const pdf=[
      `%PDF-1.4`,
      `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`,
      `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj`,
      `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${W} ${H}]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj`,
      `4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj`
    ];
    // 内容流
    let s=`q\n`;
    // 标题
    s+=`BT /F1 16 Tf 28 30 Td (LDPIXELBEAD - 拼豆图纸 ${COLS}x${ROWS}) Tj ET\n`;
    s+=`BT /F1 10 Tf 28 46 Td (用豆 ${n} 颗 / ${used.length} 色) Tj ET\n`;
    // 网格背景白底
    s+=`0.98 0.98 0.98 rg ${pad} ${pad} ${gridW} ${gridH} re f\n`;
    // 单元格：色块 + 符号（颜色序号字母）
    const letter=(i)=>String.fromCharCode(65+i);
    const hex2rgb=h=>{const c=hexToRgb(h);return [c.r/255,c.g/255,c.b/255];};
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
      const c=grid[y][x]; if(!c) continue;
      const idx=used.findIndex(u=>u.hex.toUpperCase()===c.toUpperCase());
      const [r,g,b]=hex2rgb(c);
      const px=pad+x*cellPx, py=H-(pad+(y+1)*cellPx);
      s+=`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${px} ${py} ${cellPx} ${cellPx} re f\n`;
      s+=`0.6 0.6 0.6 rg 0.5 w ${px} ${py} ${cellPx} ${cellPx} re S\n`;
      s+=`BT /F1 9 Tf ${px+4} ${py+8} Td (${letter(idx)}) Tj ET\n`;
    }
    if(n===0){ s+=`0.5 0.5 0.5 rg BT /F1 14 Tf ${pad+gridW/2-40} ${H/2} Td (空图案) Tj ET\n`; }
    // 图例 + 采购单
    const lx=pad+gridW+24, lyTop=H-pad-20;
    s+=`BT /F1 12 Tf ${lx} ${lyTop} Td (色号图例 / 采购单) Tj ET\n`;
    let yy=lyTop-22;
    used.forEach((u,i)=>{
      const [r,g,b]=hex2rgb(u.hex);
      s+=`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${lx} ${yy-10} 14 14 re f\n`;
      s+=`0.5 0.5 0.5 rg 0.5 w ${lx} ${yy-10} 14 14 re S\n`;
      s+=`BT /F1 9 Tf ${lx+18} ${yy} Td (${letter(i)} ${u.code} ${u.name} x${u.n}) Tj ET\n`;
      yy-=20;
    });
    s+=`Q\n`;
    const stream=`5 0 obj<</Length ${s.length}>>stream\n${s}\nendstream endobj`;
    pdf.push(stream);
    const objs=pdf.length+1;
    // 正确计算各对象字节偏移
    let body=''; const offs=[0];
    pdf.forEach(o=>{ offs.push(('%PDF-1.4\n'+body).length); body+=o+'\n'; });
    let xref=`xref\n0 ${objs}\n0000000000 65535 f \n`;
    for(let i=1;i<objs;i++){ xref+=String(offs[i]).padStart(10,'0')+' 00000 n \n'; }
    const pdfStr=`%PDF-1.4\n`+body+`trailer\n<</Size ${objs}/Root 1 0 R>>\nstartxref\n${('%PDF-1.4\n'+body).length}\n%%EOF`;
    downloadBlob(new Blob([pdfStr],{type:'application/pdf'}), '拼豆图纸.pdf');
    toast('PDF 图纸已导出（符号格+图例+采购单）');
  }
  function exportPNG(){
    const sc=20; const fr = frameOn ? Math.round(FRAME_PX*sc/30) : 0;
    const off=document.createElement('canvas'); off.width=COLS*sc+fr*2; off.height=ROWS*sc+fr*2;
    const octx=off.getContext('2d');
    if(frameOn){
      const t=getTheme();
      // 模拟 canvas 坐标系调用主题 draw（主题函数读取 canvas.width/height，这里临时赋值）
      const savedW=canvas.width, savedH=canvas.height;
      canvas.width=off.width; canvas.height=off.height;
      t.draw(octx, fr, fr, off.width-fr*2, off.height-fr*2, frameColor);
      canvas.width=savedW; canvas.height=savedH;
    }
    octx.save(); octx.translate(fr,fr);
    window.drawBeads(octx,grid,COLS,ROWS,sc,true);
    octx.restore();
    off.toBlob(b=>downloadBlob(b,'拼豆图案.png'));
  }

  /* ---------- 导出 STL（3D 打印） ---------- */
  function exportSTL(){
    const pitch=1; // 单位
    let facets='';
    const addBox=(x0,y0,z0,sx,sy,sz)=>{
      const x1=x0+sx,y1=y0+sy,z1=z0+sz;
      const A=[x0,y0,z0],B=[x1,y0,z0],C=[x1,y1,z0],D=[x0,y1,z0];
      const E=[x0,y0,z1],F=[x1,y0,z1],G=[x1,y1,z1],H=[x0,y1,z1];
      const tri=(p,q,r,n)=>{ facets+=`facet normal ${n[0]} ${n[1]} ${n[2]}\n outer loop\n  vertex ${p[0]} ${p[1]} ${p[2]}\n  vertex ${q[0]} ${q[1]} ${q[2]}\n  vertex ${r[0]} ${r[1]} ${r[2]}\n endloop\nendfacet\n`; };
      // 底面 -z
      tri(A,C,B,[0,0,-1]); tri(A,D,C,[0,0,-1]);
      // 顶面 +z
      tri(E,F,G,[0,0,1]); tri(E,H,G,[0,0,1]);
      // 前面 y0 -y
      tri(A,B,F,[0,-1,0]); tri(A,E,F,[0,-1,0]);
      // 后面 y1 +y
      tri(D,G,C,[0,1,0]); tri(D,H,G,[0,1,0]);
      // 左面 x0 -x
      tri(A,E,H,[-1,0,0]); tri(A,H,D,[-1,0,0]);
      // 右面 x1 +x
      tri(B,G,F,[1,0,0]); tri(B,C,G,[1,0,0]);
    };
    // 底板
    addBox(0,0,0,COLS*pitch,ROWS*pitch,0.18);
    // 边框墙（展示框，可随件一起 3D 打印）
    if(frameOn){
      const t=0.5, zh=0.9;
      addBox(-t,0,0.18, COLS*pitch+2*t, t, zh);
      addBox(-t,ROWS*pitch-t,0.18, COLS*pitch+2*t, t, zh);
      addBox(-t,0,0.18, t, ROWS*pitch, zh);
      addBox(COLS*pitch,0,0.18, t, ROWS*pitch, zh);
    }
    // 每颗豆 = 一个凸点方块
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
      if(!grid[y][x]) continue;
      addBox(x*pitch+0.07, y*pitch+0.07, 0.18, 0.86*pitch, 0.86*pitch, 0.62);
    }
    const stl=`solid pixelbead\n${facets}endsolid pixelbead\n`;
    downloadBlob(new Blob([stl],{type:'model/stl'}),'拼豆积木.stl');
    toast('STL 已导出，可丢进切片软件 3D 打印！');
  }

  /* ---------- 导出用豆量清单 CSV ---------- */
  function exportList(){
    const counts={}; const names={};
    window.PALETTE.forEach(p=>names[p.hex]=p.name);
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const c=grid[y][x]; if(c) counts[c]=(counts[c]||0)+1; }
    let csv='颜色,色号,数量\n';
    Object.keys(counts).forEach(hex=>{ csv+=`${names[hex]||hex},${hex},${counts[hex]}\n`; });
    csv+=`合计,,${Object.values(counts).reduce((a,b)=>a+b,0)}\n`;
    downloadBlob(new Blob([csv],{type:'text/csv'}),'用豆量清单.csv');
    toast('用豆量清单已导出');
  }

  /* ---------- 复制分享链接（把当前画板编码进 URL） ---------- */
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function b64urlEncode(str){ return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function b64urlDecode(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); return decodeURIComponent(escape(atob(s))); }
  function encodeDesign(){
    const colors=[], idx={};
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const c=grid[y][x]; if(c && !(c in idx)){ idx[c]=colors.length+1; colors.push(c); } }
    if(colors.length>64) return null;            // 颜色过多暂不支持
    let g='';
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const c=grid[y][x]; g += c ? B64[idx[c]] : '.'; }
    const meta={c:COLS,r:ROWS,br:activeBrand||'',p:colors};
    return b64urlEncode(JSON.stringify(meta)+'|'+g);
  }
  function copyText(t){
    const done=()=>toast('链接已复制，发给朋友即可同款画板 ✨');
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(done).catch(()=>fallbackCopy(t,done));
    } else fallbackCopy(t,done);
  }
  function fallbackCopy(t,done){
    const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.top='-9999px';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try{ document.execCommand('copy'); if(done) done(); }catch(e){ toast('复制失败，请手动复制链接'); }
    document.body.removeChild(ta);
  }
  function exportShare(){
    let n=0; for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(grid[y][x]) n++;
    if(n===0){ toast('画板还是空的，先画点东西吧～'); return; }
    const code=encodeDesign();
    if(!code){ toast('颜色超过 64 种，暂不支持分享链接'); return; }
    if(code.length>32000){ toast('图案太大，暂不支持分享链接（请缩小画板）'); return; }
    const q = MODULE!=='pixel' ? '?m='+MODULE : '';
    copyText(location.origin + location.pathname + q + '#d=' + code);
  }
  function loadFromHash(){
    if(!location.hash.startsWith('#d=')) return;
    try{
      const raw=b64urlDecode(location.hash.slice(3));
      const sep=raw.indexOf('|'); if(sep<0) return;
      const meta=JSON.parse(raw.slice(0,sep)), g=raw.slice(sep+1);
      if(!meta.c||!meta.r||!Array.isArray(meta.p)) return;
      COLS=meta.c|0; ROWS=meta.r|0; grid=blankGrid(COLS,ROWS);
      let i=0;
      for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
        const ch=g[i++]; grid[y][x] = (ch && ch!=='.') ? (meta.p[B64.indexOf(ch)-1]||null) : null;
      }
      if(meta.br){ activeBrand=meta.br; const sel=document.getElementById('brandSel'); if(sel) sel.value=meta.br; buildPalette(); }
      setupCanvas(); render();
      toast('已载入分享的设计 ✨');
      history.replaceState(null,'', location.pathname + location.search); // 消费掉 hash，避免刷新重触发
    }catch(e){ console.warn('分享链接解析失败', e); }
  }

  /* ---------- 新手引导（首次访问一次性提示） ---------- */
  function setupOnboard(){
    try{ if(localStorage.getItem('pb_onboard_v1')) return; }catch(e){}
    const ov=document.getElementById('onboard'); if(!ov) return;
    ov.classList.add('show');
    const close=()=>{ ov.classList.remove('show'); try{ localStorage.setItem('pb_onboard_v1','1'); }catch(e){} };
    ov.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));
    ov.addEventListener('click',e=>{ if(e.target===ov) close(); });
  }

  function downloadBlob(blob,name){ const a=document.createElement('a'); const url=URL.createObjectURL(blob);
    a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2200); }

  /* ---------- 绑定导出按钮 ---------- */
  document.getElementById('btnPng').addEventListener('click',exportPNG);
  document.getElementById('btnStl').addEventListener('click',exportSTL);
  document.getElementById('btnList').addEventListener('click',exportList);
  document.getElementById('btnUndo').addEventListener('click',undo);
  document.getElementById('btnRedo').addEventListener('click',redo);
  document.getElementById('btnClear').addEventListener('click',()=>{ snapshot(); grid=blankGrid(COLS,ROWS); render(); toast('已清空'); });
  document.getElementById('btnPhoto').addEventListener('click',()=>fileInput.click());
  document.getElementById('btnPdf').addEventListener('click',exportPDF);
  document.getElementById('btnShare').addEventListener('click',exportShare);

  /* ---------- 对称镜像 ---------- */
  document.querySelectorAll('#symRow .tool').forEach(b=>{
    b.addEventListener('click',()=>{ symmetry=b.dataset.sym;
      document.querySelectorAll('#symRow .tool').forEach(x=>x.classList.toggle('active', x.dataset.sym===symmetry));
      toast('对称：'+b.textContent.trim()); });
  });
  /* ---------- 形状工具 ---------- */
  document.querySelectorAll('#shapeRow .tool').forEach(b=>{
    b.addEventListener('click',()=>{ shapeMode = (shapeMode===b.dataset.shape)? null : b.dataset.shape;
      document.querySelectorAll('#shapeRow .tool').forEach(x=>x.classList.toggle('active', x.dataset.shape===shapeMode));
      if(shapeMode){ setTool('pen'); toast('形状：'+b.textContent.trim()+'（画板拖拽绘制）'); }
      else toast('形状：关'); });
  });
  /* ---------- 品牌色库切换 ---------- */
  document.getElementById('brandSel').addEventListener('change',e=>{
    activeBrand=e.target.value; buildPalette();
    toast(activeBrand? ('已切到 '+activeBrand+' 色库') : '已切回通用色');
  });

  /* ---------- 边框 UI ---------- */
  const FRAME_COLORS=[{name:'红',hex:'#E3000B'},{name:'粉',hex:'#ff9ec8'},{name:'黄',hex:'#FFD500'},{name:'蓝',hex:'#006CB7'},{name:'黑',hex:'#1c1c1c'},{name:'白',hex:'#f4f4f4'}];
  function frameThumbSVG(theme,color){
    const size=44, f=10;
    // 用 offscreen canvas 生成 data URI 缩略图
    const oc=document.createElement('canvas'); oc.width=size; oc.height=size;
    const ox=oc.getContext('2d');
    // 临时把画布与边框带宽缩到缩略图尺寸，让边框装饰真实可见（否则 FRAME=34 会把装饰挤到画布外）
    const savedW=canvas.width, savedH=canvas.height, savedF=FRAME;
    canvas.width=size; canvas.height=size; FRAME=f;
    theme.draw(ox, f, f, size-f*2, size-f*2, color);
    canvas.width=savedW; canvas.height=savedH; FRAME=savedF;
    return oc.toDataURL('image/png');
  }
  function buildFrameUI(){
    const fc=document.getElementById('frameColors'); if(!fc) return; fc.innerHTML='';
    // 主题网格
    const gridWrap=document.createElement('div'); gridWrap.className='frame-theme-grid';
    Object.keys(FRAME_THEMES).forEach(k=>{
      const t=FRAME_THEMES[k];
      const b=document.createElement('button'); b.className='frame-theme'+(k===frameTheme?' on':''); b.title=t.name;
      const img=document.createElement('img'); img.src=frameThumbSVG(t,frameColor); img.alt=t.name; img.width=44; img.height=44;
      const lab=document.createElement('span'); lab.textContent=t.emoji+' '+t.name;
      b.appendChild(img); b.appendChild(lab);
      b.addEventListener('click',()=>{
        frameTheme=k;
        // 若当前色与该主题默认色差异过大可自动换色，但保留用户选择更可控：仅当主题为 polaroid/comic 且当前深色时切白
        if((k==='polaroid'||k==='comic') && (frameColor==='#1c1c1c'||frameColor==='#006CB7')) frameColor='#f4f4f4';
        gridWrap.querySelectorAll('.frame-theme').forEach(x=>x.classList.remove('on')); b.classList.add('on');
        // 刷新所有缩略图（颜色可能已变）
        gridWrap.querySelectorAll('.frame-theme').forEach((x,idx)=>{ const key=Object.keys(FRAME_THEMES)[idx]; x.querySelector('img').src=frameThumbSVG(FRAME_THEMES[key],frameColor); });
        if(frameOn){ setupCanvas(); render(); }
      });
      gridWrap.appendChild(b);
    });
    fc.appendChild(gridWrap);
    // 颜色选择
    const colorWrap=document.createElement('div'); colorWrap.className='frame-color-row';
    FRAME_COLORS.forEach(c=>{
      const s=document.createElement('div'); s.className='fs'+(c.hex===frameColor?' on':''); s.style.background=c.hex; s.title=c.name;
      s.addEventListener('click',()=>{
        frameColor=c.hex;
        colorWrap.querySelectorAll('.fs').forEach(x=>x.classList.remove('on')); s.classList.add('on');
        // 刷新主题缩略图颜色
        gridWrap.querySelectorAll('.frame-theme').forEach((x,idx)=>{ const key=Object.keys(FRAME_THEMES)[idx]; x.querySelector('img').src=frameThumbSVG(FRAME_THEMES[key],frameColor); });
        if(frameOn) render();
      });
      colorWrap.appendChild(s);
    });
    fc.appendChild(colorWrap);
    const btn=document.getElementById('btnFrame');
    if(btn){
      btn.classList.toggle('on',frameOn); btn.textContent=frameOn?'边框：开':'边框：关';
      btn.onclick=()=>{ frameOn=!frameOn; btn.classList.toggle('on',frameOn); btn.textContent=frameOn?'边框：开':'边框：关'; setupCanvas(); render(); };
    }
  }

  /* ---------- 启动 ---------- */
  setupCanvas(); grid=blankGrid(COLS,ROWS);
  setTool('pen');
  iso.width=600; iso.height=440;
  applyModule(MODULE);                 // 按 URL ?m= 载入对应模块的调色板 / 预设 / 首个模板
  buildFrameUI();
  buildCommunity();
  updateZoomLabel();
  loadFromHash();      // 若通过「复制分享链接」打开，还原对方画板
  setupOnboard();      // 首次访问弹出一次性新手引导

  /* 板型预设（标准拼豆板尺寸） */
  document.querySelectorAll('#boardPresets .bp').forEach(b=>{
    b.addEventListener('click',()=>{
      const nc=+b.dataset.c, nr=+b.dataset.r;
      snapshot(); resizeGrid(nc,nr); setupCanvas(); render();
      document.querySelectorAll('#boardPresets .bp').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      toast(`画板调整为 ${nc}×${nr}`);
    });
  });
  /* 画布变换：旋转 / 翻转 / 缩放 */
  const bindX=(id,fn)=>{ const e=document.getElementById(id); if(e) e.addEventListener('click',()=>{ snapshot(); fn(); }); };
  bindX('rotL', rotateCCW); bindX('rotR', rotateCW); bindX('flipH', flipH); bindX('flipV', flipV);
  bindX('zoomIn', zoomIn); bindX('zoomOut', zoomOut); bindX('zoomFit', zoomFit);

  /* ---------- 移动端：左栏工具抽屉折叠 ---------- */
  const leftToggle=document.getElementById('leftToggle');
  const leftPanel=document.getElementById('leftPanel');
  if(leftToggle && leftPanel){
    const mq=window.matchMedia('(max-width:960px)');
    if(mq.matches){ leftPanel.classList.add('collapsed'); leftToggle.setAttribute('aria-expanded','false'); }
    leftToggle.addEventListener('click',()=>{
      const collapsed=leftPanel.classList.toggle('collapsed');
      leftToggle.setAttribute('aria-expanded', collapsed?'false':'true');
    });
  }

  document.querySelectorAll('#moduleTabs .mtab').forEach(b=>{
    b.addEventListener('click',()=>applyModule(b.dataset.mod));
  });
})();
