/* =========================================================
   拼豆星球 — 落地页交互 main.js
   ========================================================= */
(function(){
  'use strict';

  /* 1. 设计器预告：循环展示预设图案 */
  const teaser = document.getElementById('teaserCanvas');
  if(teaser && window.drawBeads && window.PATTERNS){
    const tctx = teaser.getContext('2d');
    let idx = 0;
    function drawTeaser(){
      const p = window.PATTERNS[idx % window.PATTERNS.length];
      const cell = Math.floor(teaser.width / p.cols);
      window.drawBeads(tctx, p.data, p.cols, p.rows, cell, true);
      idx++;
    }
    drawTeaser();
    setInterval(drawTeaser, 2600);
  }

  /* 2. 社区模板库（点击 deep-link 进入设计器载入编辑） */
  const grid = document.getElementById('gallery-grid');
  if(grid && window.COMMUNITY && window.drawBeads){
    const items = window.COMMUNITY;
    items.forEach(it=>{
      const p = { cols:it.cols, rows:it.rows, data:it.data };
      const cell = Math.max(4, Math.floor(110 / Math.max(p.cols, p.rows))); // 统一缩略图尺寸
      const card = document.createElement('a');
      card.className = 'art-card reveal';
      card.href = 'designer.html?m=' + it.module + '&p=' + encodeURIComponent(it.name);
      card.target = '_blank'; card.rel = 'noopener';
      card.title = '点击进入设计器编辑：' + it.name;
      const cv = document.createElement('canvas');
      cv.width = p.cols*cell; cv.height = p.rows*cell;
      window.drawBeads(cv.getContext('2d'), p.data, p.cols, p.rows, cell, true);
      const meta = document.createElement('div'); meta.className='meta';
      meta.innerHTML = `<b>${it.name}</b><small>${it.tag} · ${it.author} · ${p.cols}×${p.rows}</small>`;
      card.appendChild(cv); card.appendChild(meta);
      grid.appendChild(card);
    });
  }

  /* 3. 滚动揭示动画 */
  const els = document.querySelectorAll('.sec-head,.module,.teaser,.cta-box,.buzz,.art-card');
  els.forEach(e=>e.classList.add('reveal'));
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((ents)=>{
      ents.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    },{ threshold:.1 });
    els.forEach(e=>io.observe(e));
  } else {
    els.forEach(e=>e.classList.add('in'));
  }
})();
