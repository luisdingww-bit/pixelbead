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

  /* ---------- 模块切换（像素拼豆 / 掐丝珐琅 / 建筑）---------- */
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
    if(m==='cloisonne') showProcessGuide(); else hideProcessGuide();
  }

  /* ---------- 掐丝珐琅 七道工序引导 ---------- */
  const CLOISONNE_STEPS = [
    { n:1, name:'贴线稿', img:'assets/img/process-1.svg', title:'贴线稿',
      desc:'设计器图纸贴胎板做底稿',
      tip:'在上方画板排好纹样，点「⬇ PNG 图案图」导出线稿，贴在铜胎板上就是掐丝底稿。',
      action:{ label:'🎨 去画板排纹样', go:'canvas' } },
    { n:2, name:'涂胶', img:'assets/img/process-2.svg', title:'涂胶',
      desc:'边缘薄涂粘接胶',
      tip:'沿纹样边缘薄薄涂一层粘接胶，等半干、不粘手时再上丝。' },
    { n:3, name:'掐丝', img:'assets/img/process-3.svg', title:'掐丝',
      desc:'弯出细金线，立起筋骨',
      tip:'按线稿弯出细铜/金线，用镊子立起纹样筋骨，决定成品轮廓。' },
    { n:4, name:'调砂', img:'assets/img/process-4.svg', title:'调砂',
      desc:'调出珐琅釉料',
      tip:'按比例调出各色珐琅釉料，磨成细砂、加水调到合适稠度。' },
    { n:5, name:'点蓝', img:'assets/img/process-5.svg', title:'点蓝',
      desc:'填釉料进丝间',
      tip:'用毛笔把釉料填进丝与丝之间，颜色饱满、不透底。' },
    { n:6, name:'贴珠', img:'assets/img/process-6.svg', title:'贴珠',
      desc:'花心点鎏金珠',
      tip:'在花心与丝端点上鎏金珠，增加立体贵气与高光。' },
    { n:7, name:'成品展示', img:'assets/img/process-7.svg', title:'成品展示',
      desc:'烧制磨光后胸针完成',
      tip:'入窑烧制、冷却后反复磨光，一枚国风珐琅胸针就完成了！' }
  ];
  let procStep = 0;
  const procSec    = document.getElementById('processGuide');
  const procSteps  = document.getElementById('procSteps');
  const procImg    = document.getElementById('procImg');
  const procNo     = document.getElementById('procNo');
  const procTitle  = document.getElementById('procTitle');
  const procDesc   = document.getElementById('procDesc');
  const procTip    = document.getElementById('procTip');
  const procBar    = document.getElementById('procBar');
  const procPrev   = document.getElementById('procPrev');
  const procNext   = document.getElementById('procNext');
  const procAction = document.getElementById('procAction');

  function buildProcChips(){
    if(!procSteps) return;
    procSteps.innerHTML='';
    CLOISONNE_STEPS.forEach((s,i)=>{
      const chip=document.createElement('button');
      chip.className='proc-chip'; chip.dataset.i=i;
      chip.innerHTML='<span class="num">'+s.n+'</span>'+s.name;
      chip.addEventListener('click',()=>setStep(i));
      procSteps.appendChild(chip);
    });
  }
  function setStep(i){
    if(!procSec) return;
    procStep = Math.max(0, Math.min(CLOISONNE_STEPS.length-1, i));
    const s = CLOISONNE_STEPS[procStep];
    procImg.src = s.img; procImg.alt = s.title;
    procNo.textContent = s.n + ' / ' + CLOISONNE_STEPS.length;
    procTitle.textContent = s.title;
    procDesc.textContent = s.desc;
    procTip.textContent = s.tip;
    procBar.style.width = ((procStep+1)/CLOISONNE_STEPS.length*100) + '%';
    procSteps.querySelectorAll('.proc-chip').forEach((c,ci)=>{
      c.classList.toggle('active', ci===procStep);
      c.classList.toggle('done', ci<procStep);
    });
    procPrev.disabled = (procStep===0);
    procNext.textContent = (procStep===CLOISONNE_STEPS.length-1) ? '完成 ✓' : '下一步 →';
    if(s.action){ procAction.style.display=''; procAction.textContent=s.action.label; }
    else { procAction.style.display='none'; }
  }
  function showProcessGuide(){
    if(!procSec) return;
    buildProcChips(); setStep(0); procSec.hidden=false;
  }
  function hideProcessGuide(){ if(procSec) procSec.hidden=true; }

  if(procPrev) procPrev.addEventListener('click',()=>setStep(procStep-1));
  if(procNext) procNext.addEventListener('click',()=>{
    if(procStep===CLOISONNE_STEPS.length-1){ toast('七道工序完成，去烧制你的珐琅胸针吧！'); return; }
    setStep(procStep+1);
  });
  if(procAction) procAction.addEventListener('click',()=>{
    const a=CLOISONNE_STEPS[procStep].action;
    if(a && a.go==='canvas'){ const cv=document.getElementById('beadCanvas'); if(cv) cv.scrollIntoView({behavior:'smooth',block:'center'}); }
  });

  /* ---------- 初始化 ---------- */
  function blankGrid(c,r){ const g=[]; for(let y=0;y<r;y++){ const row=[]; for(let x=0;x<c;x++) row.push(null); g.push(row);} return g; }

  function setupCanvas(){
    CELL = Math.max(14, Math.floor(560/COLS));
    canvas.width = COLS*CELL;
    canvas.height = ROWS*CELL;
  }

  function render(){
    drawBeads(ctx, grid, COLS, ROWS, CELL, true);
    renderIso();
    updateStats();
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
    const x=Math.floor(px/CELL), y=Math.floor(py/CELL);
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

  /* ---------- 导出 PNG ---------- */
  function exportPNG(){
    const sc=20; const off=document.createElement('canvas'); off.width=COLS*sc; off.height=ROWS*sc;
    const octx=off.getContext('2d'); window.drawBeads(octx,grid,COLS,ROWS,sc,true);
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

  /* ---------- 启动 ---------- */
  setupCanvas(); grid=blankGrid(COLS,ROWS);
  setTool('pen');
  iso.width=600; iso.height=440;
  applyModule(MODULE);                 // 按 URL ?m= 载入对应模块的调色板 / 预设 / 首个模板
  document.querySelectorAll('#moduleTabs .mtab').forEach(b=>{
    b.addEventListener('click',()=>{ applyModule(b.dataset.mod);
      if(b.dataset.mod==='cloisonne' && procSec) procSec.scrollIntoView({behavior:'smooth',block:'nearest'}); });
  });
})();
