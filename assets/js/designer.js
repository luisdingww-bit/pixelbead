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
  const sizeSel  = document.getElementById('gridSize');
  const statBeads= document.getElementById('statBeads');
  const statColors=document.getElementById('statColors');
  const beadTable= document.getElementById('beadTable');
  const fileInput= document.getElementById('photoInput');
  const toastEl  = document.getElementById('toast');

  /* ---------- 状态 ---------- */
  let COLS = 15, ROWS = 15, CELL = 30;
  let grid = [];               // grid[y][x] = hex | null
  let current = window.PALETTE[2].hex; // 默认红色
  let tool = 'pen';
  let drawing = false;
  let undoStack = [], redoStack = [];

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
    if(history.replaceState) history.replaceState(null, '', m==='pixel' ? location.pathname : '?m='+m);
    loadPattern(mod.patterns[0]); // 载入首个模板，给第一眼惊艳
  }

  /* ---------- 初始化 ---------- */
  function blankGrid(c,r){ const g=[]; for(let y=0;y<r;y++){ const row=[]; for(let x=0;x<c;x++) row.push(null); g.push(row);} return g; }

  function setupCanvas(){
    CELL = Math.max(14, Math.floor(560/COLS));
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
    }
  };
  function getTheme(){ return FRAME_THEMES[frameTheme] || FRAME_THEMES.lego; }
  function drawFrame(c){
    const w=canvas.width, h=canvas.height, bx=FRAME, by=FRAME, bw=w-FRAME*2, bh=h-FRAME*2;
    const t=getTheme(); if(t&&t.draw) t.draw(c,bx,by,bw,bh,frameColor);
  }

  function render(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(frameOn) drawFrame(ctx);
    ctx.save(); ctx.translate(FRAME,FRAME);
    drawBeads(ctx, grid, COLS, ROWS, CELL, true);
    ctx.restore();
    renderIso();
    updateStats();
    iso.style.border = frameOn ? (Math.round(FRAME_PX*0.32))+'px solid '+frameColor : 'none';
    iso.style.borderRadius = frameOn ? '10px' : '0';
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
  function applyTool(x,y){
    if(tool==='pen') grid[y][x]=current;
    else if(tool==='eraser') grid[y][x]=null;
    else if(tool==='fill') bucketFill(x,y);
    else if(tool==='picker'){ if(grid[y][x]){ current=grid[y][x]; setCurrentSwatch(); } }
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
    snapshot(); drawing=true; canvas.setPointerCapture(e.pointerId); applyTool(c.x,c.y); render(); });
  canvas.addEventListener('pointermove',e=>{ if(!drawing) return; const c=cellFromEvent(e); if(!c) return;
    if(tool==='pen'||tool==='eraser'){ applyTool(c.x,c.y); render(); } });
  window.addEventListener('pointerup',()=>{ drawing=false; });

  /* ---------- 调色板 ---------- */
  function buildPalette(){
    paletteEl.innerHTML='';
    window.PALETTE.forEach(p=>{
      const s=document.createElement('div'); s.className='swatch'; s.style.background=p.hex; s.title=p.name;
      s.dataset.hex=p.hex;
      s.addEventListener('click',()=>{ current=p.hex; setCurrentSwatch(); if(tool==='eraser'||tool==='picker') setTool('pen'); });
      paletteEl.appendChild(s);
    });
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
    COLS=p.cols; ROWS=p.rows; sizeSel.value = (COLS===ROWS? COLS : '15');
    setupCanvas(); grid=blankGrid(COLS,ROWS);
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) grid[y][x]=p.data[y][x];
    render();
  }

  /* ---------- 工具切换 ---------- */
  function setTool(t){ tool=t; toolEls.forEach(el=>el.classList.toggle('active', el.dataset.tool===t)); }
  toolEls.forEach(el=>el.addEventListener('click',()=>setTool(el.dataset.tool)));

  /* ---------- 网格尺寸 ---------- */
  sizeSel.addEventListener('change',()=>{ const v=parseInt(sizeSel.value); COLS=v; ROWS=v; snapshot();
    setupCanvas(); grid=blankGrid(COLS,ROWS); render(); });

  /* ---------- 照片转图案 ---------- */
  fileInput.addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    const img=new Image(); const url=URL.createObjectURL(f);
    img.onload=()=>{
      const tmp=document.createElement('canvas'); tmp.width=COLS; tmp.height=ROWS;
      const tctx=tmp.getContext('2d'); tctx.drawImage(img,0,0,COLS,ROWS);
      const data=tctx.getImageData(0,0,COLS,ROWS).data;
      snapshot(); grid=blankGrid(COLS,ROWS);
      for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
        const i=(y*COLS+x)*4; const hex=rgbToHex(data[i],data[i+1],data[i+2]);
        grid[y][x]=window.nearestPalette(hex);
      }
      render(); URL.revokeObjectURL(url); toast('照片已转成 '+COLS+'×'+ROWS+' 图案！');
    };
    img.src=url;
  });

  /* ---------- 导出 PNG（含主题边框） ---------- */
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

  /* ---------- 边框 UI ---------- */
  const FRAME_COLORS=[{name:'红',hex:'#E3000B'},{name:'粉',hex:'#ff9ec8'},{name:'黄',hex:'#FFD500'},{name:'蓝',hex:'#006CB7'},{name:'黑',hex:'#1c1c1c'},{name:'白',hex:'#f4f4f4'}];
  function frameThumbSVG(theme,color){
    const size=44, f=10;
    const bg=theme.defaultColor==='#f4f4f4'?'#e8e8e8':theme.defaultColor;
    // 用 offscreen canvas 生成 data URI 缩略图
    const oc=document.createElement('canvas'); oc.width=size; oc.height=size;
    const ox=oc.getContext('2d');
    // 临时让主题 draw 渲染到缩略图（模拟完整 canvas 尺寸）
    const savedW=canvas.width, savedH=canvas.height;
    canvas.width=size; canvas.height=size;
    theme.draw(ox, f, f, size-f*2, size-f*2, color);
    canvas.width=savedW; canvas.height=savedH;
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
  document.querySelectorAll('#moduleTabs .mtab').forEach(b=>{
    b.addEventListener('click',()=>applyModule(b.dataset.mod));
  });
})();
