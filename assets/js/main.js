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

  /* 2. 社区作品墙 */
  const grid = document.getElementById('gallery-grid');
  if(grid && window.PATTERNS && window.drawBeads){
    const items = [
      { p:0, t:'爱心钥匙扣',   a:'@手工作业明天交' },
      { p:2, t:'像素小花',     a:'@花花日记' },
      { p:3, t:'今天也要开心', a:'@笑脸收集者' },
      { p:4, t:'许愿小星星',   a:'@夜空便利店' },
      { p:5, t:'蘑菇小屋',     a:'@蘑菇屋' },
      { p:1, t:'薄荷宝石',     a:'@矿物标本' },
      { p:0, t:'红心挂件',     a:'@豆豆研究所' },
      { p:3, t:'笑脸徽章',     a:'@周末手作' }
    ];
    const cell = 10;
    items.forEach(it=>{
      const p = window.PATTERNS[it.p];
      const card = document.createElement('div'); card.className='art-card';
      const cv = document.createElement('canvas');
      cv.width = p.cols*cell; cv.height = p.rows*cell;
      window.drawBeads(cv.getContext('2d'), p.data, p.cols, p.rows, cell, true);
      const meta = document.createElement('div'); meta.className='meta';
      meta.innerHTML = `<b>${it.t}</b><small>${it.a} · ${p.cols}×${p.rows}</small>`;
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
