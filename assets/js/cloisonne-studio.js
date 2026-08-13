/* =========================================================
   掐丝珐琅工作室 — 自由手绘编辑器引擎
   不是网格拼豆：自由掐丝描金线 + 点蓝填充 + 贴鎏金珠
   ========================================================= */
(function(){
  'use strict';
  const W = 900, H = 680;
  const SAVE_KEY = 'ldpixelbead_cloisonne_v1';

  /* ---------- DOM ---------- */
  const canvas  = document.getElementById('clCanvas');
  const ctx     = canvas.getContext('2d');
  const plateEl = document.getElementById('plate');
  const guideEl = document.getElementById('guideImg');
  const toastEl = document.getElementById('toast');
  const fileInput = document.getElementById('guideUpload');
  canvas.width = W; canvas.height = H;

  /* ---------- 数据 ---------- */
  const WIRE_COLORS = [
    {name:'鎏金', hex:'#d4af37'}, {name:'银丝', hex:'#cfd6dd'},
    {name:'铜丝', hex:'#b5722e'}, {name:'墨丝', hex:'#1c1c1c'}
  ];
  const ENAMEL_COLORS = [
    {name:'宝蓝', hex:'#1b4f9c'}, {name:'胭脂红', hex:'#c0392b'}, {name:'松绿', hex:'#2e8b57'},
    {name:'琉璃黄', hex:'#f2c14e'}, {name:'月白', hex:'#e8eef5'}, {name:'紫晶', hex:'#7b3fa0'},
    {name:'橘', hex:'#e07b39'}, {name:'黛黑', hex:'#1a1a1a'}, {name:'胭脂粉', hex:'#e98aa6'},
    {name:'湖绿', hex:'#3fb6a8'}
  ];
  const PLATES = [
    {name:'墨胎', hex:'#10151c'}, {name:'铜胎', hex:'#6e4a2e'}, {name:'月白胎', hex:'#e9eef3'}
  ];

  /* ---------- 状态 ---------- */
  let tool = 'wire';
  let wireColor = WIRE_COLORS[0].hex;
  let fillColor = ENAMEL_COLORS[0].hex;
  let wireW = 6, beadR = 11, eraseR = 16;
  let plateColor = PLATES[0].hex;
  let drawing = false, last = null;
  const undoStack = [], redoStack = [];

  /* ---------- 工具函数 ---------- */
  function hexToRgb(h){ h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200); }
  function getPos(e){
    const r=canvas.getBoundingClientRect();
    return { x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) };
  }
  function snapshot(){ undoStack.push(ctx.getImageData(0,0,W,H)); if(undoStack.length>30) undoStack.shift(); redoStack.length=0; }
  function restore(img){ ctx.putImageData(img,0,0); }
  function undo(){ if(!undoStack.length) return; redoStack.push(ctx.getImageData(0,0,W,H)); restore(undoStack.pop()); scheduleSave(); }
  function redo(){ if(!redoStack.length) return; undoStack.push(ctx.getImageData(0,0,W,H)); restore(redoStack.pop()); scheduleSave(); }
  function revertLast(){ if(undoStack.length){ restore(undoStack.pop()); redoStack.length=0; } }

  /* ---------- 绘画：掐丝（描金线） ---------- */
  function drawSeg(a,b){
    ctx.save();
    ctx.globalCompositeOperation='source-over';
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=5; ctx.shadowOffsetY=2;
    ctx.strokeStyle=wireColor; ctx.lineWidth=wireW;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.restore();
  }

  /* ---------- 绘画：贴珠（鎏金珠） ---------- */
  function stampBead(p){
    const r=beadR, g=ctx.createRadialGradient(p.x-r*0.32,p.y-r*0.32,r*0.1,p.x,p.y,r);
    g.addColorStop(0,'#fff6cf'); g.addColorStop(.45,wireColor); g.addColorStop(1,'#7a5a14');
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.45)'; ctx.shadowBlur=4; ctx.shadowOffsetY=2;
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    ctx.lineWidth=1; ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.stroke();
    ctx.restore();
  }

  /* ---------- 绘画：橡皮（destination-out） ---------- */
  function eraseSeg(a,b){
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='rgba(0,0,0,1)'; ctx.lineWidth=eraseR*2;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.restore();
  }
  function eraseDot(p){ eraseSeg(p,p); }

  /* ---------- 绘画：点蓝（flood fill） ---------- */
  function floodFill(p){
    const img=ctx.getImageData(0,0,W,H), d=img.data;
    const i0=(Math.round(p.y)*W+Math.round(p.x))*4;
    const sr=d[i0],sg=d[i0+1],sb=d[i0+2],sa=d[i0+3];
    const [fr,fg,fb]=hexToRgb(fillColor);
    const TOL=110*110*4;
    function match(i){ const dr=d[i]-sr,dg=d[i+1]-sg,db=d[i+2]-sb,da=d[i+3]-sa; return (dr*dr+dg*dg+db*db+da*da)<=TOL; }
    if(sa===255 && sr===fr && sg===fg && sb===fb) return 0;
    const stack=[[Math.round(p.x),Math.round(p.y)]]; let changed=0;
    while(stack.length){
      const [x,y]=stack.pop();
      if(x<0||y<0||x>=W||y>=H) continue;
      const i=(y*W+x)*4;
      if(!match(i)) continue;
      d[i]=fr; d[i+1]=fg; d[i+2]=fb; d[i+3]=255; changed++;
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    ctx.putImageData(img,0,0);
    return changed;
  }

  /* ---------- 指针事件 ---------- */
  canvas.addEventListener('pointerdown',e=>{
    const p=getPos(e); canvas.setPointerCapture(e.pointerId);
    if(tool==='wire'){ snapshot(); drawing=true; last=p; drawSeg(p,p); scheduleSave(); }
    else if(tool==='erase'){ snapshot(); drawing=true; last=p; eraseDot(p); scheduleSave(); }
    else if(tool==='bead'){ snapshot(); stampBead(p); scheduleSave(); }
    else if(tool==='fill'){
      snapshot(); const changed=floodFill(p);
      if(changed > W*H*0.55){ revertLast(); toast('⚠️ 先用「掐丝」把区域围起来，再点蓝'); }
      else { scheduleSave(); toast('已点蓝 ✦'); }
    }
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drawing) return; const p=getPos(e);
    if(tool==='wire'){ drawSeg(last,p); last=p; }
    else if(tool==='erase'){ eraseSeg(last,p); last=p; }
  });
  canvas.addEventListener('pointerup',()=>{ if(drawing){ drawing=false; scheduleSave(); } });
  canvas.addEventListener('pointercancel',()=>{ drawing=false; });

  /* ---------- 调色板 / 笔触 UI ---------- */
  function buildSwatches(container, list, isOn, onPick){
    container.classList.add('has-name');
    container.innerHTML='';
    list.forEach(c=>{
      const s=document.createElement('div'); s.className='st-swatch'; s.style.background=c.hex; s.title=c.name;
      const nm=document.createElement('span'); nm.className='nm'; nm.textContent=c.name; s.appendChild(nm);
      if(isOn(c.hex)) s.classList.add('on');
      s.addEventListener('click',()=>{ onPick(c.hex);
        container.querySelectorAll('.st-swatch').forEach(x=>x.classList.remove('on')); s.classList.add('on'); });
      container.appendChild(s);
    });
  }
  function setTool(t){ tool=t; document.querySelectorAll('.st-tool').forEach(el=>el.classList.toggle('active', el.dataset.tool===t)); }

  /* ---------- 七道工序引导 ---------- */
  const STEPS=[
    {n:1,name:'贴线稿',img:'assets/img/process-1.svg',title:'贴线稿',tool:null,
     desc:'把线稿 / 图纸贴在胎板上做底稿',
     tip:'开启下方「线稿底图」，或直接上传你的手绘稿，作为描线参考。',
     action:{label:'👁 开启线稿底图',do:()=>{ toggleGuide(true); document.getElementById('clCanvas').scrollIntoView({behavior:'smooth',block:'center'}); }}},
    {n:2,name:'涂胶',img:'assets/img/process-2.svg',title:'涂胶',tool:null,
     desc:'边缘薄涂粘接胶',
     tip:'沿纹样边缘薄薄涂一层粘接胶，等半干、不粘手时再上丝——这里是实物步骤，画板上可跳过。'},
    {n:3,name:'掐丝',img:'assets/img/process-3.svg',title:'掐丝',tool:'wire',
     desc:'弯出细金线，立起筋骨',
     tip:'选好丝色与粗细，沿底稿描出金线轮廓——这就是图案的筋骨。'},
    {n:4,name:'调砂',img:'assets/img/process-4.svg',title:'调砂',tool:null,
     desc:'调出珐琅釉料',
     tip:'在右侧「釉色」里挑好每个区域的颜色，心里排好配色再动手。'},
    {n:5,name:'点蓝',img:'assets/img/process-5.svg',title:'点蓝',tool:'fill',
     desc:'填釉料进丝间',
     tip:'点选釉色后，在丝与丝之间点击填充，颜色饱满、不透底；没围住的区域会提醒你先掐丝。'},
    {n:6,name:'贴珠',img:'assets/img/process-6.svg',title:'贴珠',tool:'bead',
     desc:'花心点鎏金珠',
     tip:'在花心、丝端点一下，点上鎏金珠，增加立体贵气与高光。'},
    {n:7,name:'成品展示',img:'assets/img/process-7.svg',title:'成品展示',tool:null,
     desc:'烧制磨光后胸针完成',
     tip:'烧制磨光后，点「导出 PNG」保存你的珐琅作品，或直接发去定制实物。',
     action:{label:'⬇ 导出作品 PNG',do:()=>exportPNG()}}
  ];
  let stepIdx=0;
  const procSteps=document.getElementById('procSteps');
  const procImg=document.getElementById('procImg');
  const procNo=document.getElementById('procNo');
  const procTitle=document.getElementById('procTitle');
  const procDesc=document.getElementById('procDesc');
  const procTip=document.getElementById('procTip');
  const procBar=document.getElementById('procBar');
  const procPrev=document.getElementById('procPrev');
  const procNext=document.getElementById('procNext');
  const procAction=document.getElementById('procAction');

  function buildChips(){
    procSteps.innerHTML='';
    STEPS.forEach((s,i)=>{
      const c=document.createElement('button'); c.className='proc-chip'; c.dataset.i=i;
      c.innerHTML='<span class="num">'+s.n+'</span>'+s.name;
      c.addEventListener('click',()=>setStep(i));
      procSteps.appendChild(c);
    });
  }
  function setStep(i){
    stepIdx=Math.max(0,Math.min(STEPS.length-1,i));
    const s=STEPS[stepIdx];
    procImg.src=s.img; procImg.alt=s.title;
    procNo.textContent=s.n+' / '+STEPS.length;
    procTitle.textContent=s.title; procDesc.textContent=s.desc; procTip.textContent=s.tip;
    procBar.style.width=((stepIdx+1)/STEPS.length*100)+'%';
    procSteps.querySelectorAll('.proc-chip').forEach((c,ci)=>{ c.classList.toggle('active',ci===stepIdx); c.classList.toggle('done',ci<stepIdx); });
    procPrev.disabled=(stepIdx===0);
    procNext.textContent=(stepIdx===STEPS.length-1)?'完成 ✓':'下一步 →';
    if(s.tool) setTool(s.tool);
    if(s.action){ procAction.style.display=''; procAction.textContent=s.action.label; }
    else procAction.style.display='none';
  }
  if(procPrev) procPrev.addEventListener('click',()=>setStep(stepIdx-1));
  if(procNext) procNext.addEventListener('click',()=>{
    if(stepIdx===STEPS.length-1){ toast('七道工序完成，导出你的珐琅作品吧！'); return; }
    setStep(stepIdx+1);
  });
  if(procAction) procAction.addEventListener('click',()=>{ const a=STEPS[stepIdx].action; if(a&&a.do) a.do(); });

  /* ---------- 线稿底图 ---------- */
  let guideOn=false;
  function toggleGuide(on){
    guideOn=(on===undefined)? !guideOn : on;
    guideEl.hidden=!guideOn;
    document.getElementById('btnGuide').classList.toggle('on',guideOn);
    document.getElementById('btnGuide').textContent=guideOn?'👁 线稿底图：开':'👁 线稿底图：关';
  }
  if(fileInput) fileInput.addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    const url=URL.createObjectURL(f); guideEl.src=url; toggleGuide(true); toast('已载入你的线稿稿');
  });

  /* ---------- 胎板 ---------- */
  function setPlate(hex){ plateColor=hex; plateEl.style.background=hex;
    document.querySelectorAll('.st-seg.plate button').forEach(b=>b.classList.toggle('on',b.dataset.hex===hex)); }

  /* ---------- 清空 / 存草稿 / 读草稿 / 导出 ---------- */
  function clearCanvas(){ snapshot(); ctx.clearRect(0,0,W,H); scheduleSave(); toast('已清空画板'); }
  function scheduleSave(){ clearTimeout(scheduleSave._t); scheduleSave._t=setTimeout(saveWork,400); }
  function saveWork(){ try{ localStorage.setItem(SAVE_KEY, canvas.toDataURL('image/png')); }catch(e){} }
  function loadWork(){
    const d=localStorage.getItem(SAVE_KEY); if(!d) return false;
    const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0); img.src=d; return true;
  }
  function exportPNG(){
    const tmp=document.createElement('canvas'); tmp.width=W; tmp.height=H;
    const t=tmp.getContext('2d'); t.fillStyle=plateColor; t.fillRect(0,0,W,H); t.drawImage(canvas,0,0);
    tmp.toBlob(b=>{
      const a=document.createElement('a'); const url=URL.createObjectURL(b);
      a.href=url; a.download='掐丝珐琅作品.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    },'image/png');
    toast('已导出 PNG ✦');
  }

  /* ---------- 示例画廊：一键载入可编辑纹样 ---------- */
  function drawPolyline(pts, closed){
    for(let i=0;i<pts.length-1;i++) drawSeg({x:pts[i][0],y:pts[i][1]},{x:pts[i+1][0],y:pts[i+1][1]});
    if(closed && pts.length>1) drawSeg({x:pts[pts.length-1][0],y:pts[pts.length-1][1]},{x:pts[0][0],y:pts[0][1]});
  }
  // 把一整个示例（掐丝 + 点蓝 + 贴珠）铺到画板，之后用户仍可自由编辑
  function loadExample(spec){
    snapshot();
    ctx.clearRect(0,0,W,H);
    wireColor = spec.wireHex; wireW = spec.wireW || 5;
    if(wireSl){ wireSl.value = wireW; wireVal.textContent = wireW; }
    buildSwatches(document.getElementById('wirePalette'), WIRE_COLORS, h=>h===wireColor, h=>wireColor=h);
    // 1) 先掐全部丝线（闭合线围出区域，开放线作装饰）
    for(const c of spec.cells){ drawPolyline(c.pts, !c.open); }
    // 2) 再点蓝（每区域填对应釉色）
    for(const c of spec.cells){
      if(c.open || !c.fill) continue;
      const seed = window.CLOISONNE_CENTROID(c.pts);
      fillColor = c.fill;
      floodFill({x:seed[0], y:seed[1]});
    }
    // 3) 最后贴鎏金珠
    for(const c of spec.cells){ if(c.bead) stampBead({x:c.bead[0], y:c.bead[1]}); }
    scheduleSave();
    document.getElementById('clCanvas').scrollIntoView({behavior:'smooth', block:'center'});
    toast('已载入示例：'+spec.name+' ✦ 可继续自由编辑');
  }
  function buildGallery(){
    const gal = document.getElementById('exGallery');
    if(!gal || !window.CLOISONNE_EXAMPLES) return;
    window.CLOISONNE_EXAMPLES.forEach(spec=>{
      const card = document.createElement('button'); card.className = 'ex-card'; card.type = 'button';
      const tags = spec.tags.map(t=>'<span class="ex-tag">'+t+'</span>').join('');
      card.innerHTML =
        '<div class="ex-thumb">'+window.buildExampleSVG(spec)+'</div>'+
        '<div class="ex-name">'+spec.name+'</div>'+
        '<div class="ex-desc">'+spec.desc+'</div>'+
        '<div class="ex-tags">'+tags+'</div>';
      card.addEventListener('click', ()=>loadExample(spec));
      gal.appendChild(card);
    });
  }

  /* ---------- 绑定 UI ---------- */
  document.querySelectorAll('.st-tool').forEach(el=>el.addEventListener('click',()=>setTool(el.dataset.tool)));
  document.getElementById('btnUndo').addEventListener('click',undo);
  document.getElementById('btnRedo').addEventListener('click',redo);
  document.getElementById('btnClear').addEventListener('click',clearCanvas);
  document.getElementById('btnSave').addEventListener('click',()=>{ saveWork(); toast('草稿已保存（本地）'); });
  document.getElementById('btnExport').addEventListener('click',exportPNG);
  document.getElementById('btnGuide').addEventListener('click',()=>toggleGuide());
  document.getElementById('btnUpload').addEventListener('click',()=>fileInput.click());

  const wireSl=document.getElementById('wireWidth'), wireVal=document.getElementById('wireWidthVal');
  const beadSl=document.getElementById('beadSize'), beadVal=document.getElementById('beadSizeVal');
  if(wireSl) wireSl.addEventListener('input',()=>{ wireW=+wireSl.value; wireVal.textContent=wireW; });
  if(beadSl) beadSl.addEventListener('input',()=>{ beadR=+beadSl.value; eraseR=beadR*1.5; beadVal.textContent=beadR; });

  /* ---------- 启动 ---------- */
  buildSwatches(document.getElementById('wirePalette'), WIRE_COLORS, h=>h===wireColor, h=>wireColor=h);
  buildSwatches(document.getElementById('enamelPalette'), ENAMEL_COLORS, h=>h===fillColor, h=>fillColor=h);
  const plateSeg=document.querySelector('.st-seg.plate');
  if(plateSeg){ PLATES.forEach(p=>{ const b=document.createElement('button'); b.dataset.hex=p.hex; b.textContent=p.name;
    b.addEventListener('click',()=>setPlate(p.hex)); plateSeg.appendChild(b); }); setPlate(plateColor); }
  buildChips(); setStep(0); setTool('wire'); loadWork(); buildGallery();
  document.getElementById('moduleLabel').textContent='掐丝珐琅工作室';
})();
