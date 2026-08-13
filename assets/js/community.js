/* =========================================================
   拼豆星球 — 社区模板库数据
   基于各模块的预设图案，生成 window.COMMUNITY 列表，
   供落地页「社区模板库」与设计器「社区模板」面板复用。
   每个模板: { name, module, cols, rows, data, tag, author }
   ========================================================= */
(function(){
  'use strict';
  if(!window.MODULES) return;

  // 模拟社区作者（让模板墙更有「社区感」）
  const AUTHORS = [
    '@豆豆研究所', '@像素诗人', '@城市漫游者', '@手工作业明天交', '@花花日记',
    '@夜空便利店', '@蘑菇屋', '@笑脸收集者', '@周末手作', '@建筑系小王',
    '@拼豆老司机', '@一勺糖'
  ];
  const pick = (seed) => AUTHORS[Math.abs(seed) % AUTHORS.length];

  function fromModule(mod, base){
    return window.MODULES[mod].patterns.map((p, i) => ({
      name:   p.name,
      module: mod,
      cols:   p.cols,
      rows:   p.rows,
      data:   p.data,
      tag:    mod === 'pixel' ? '像素'
           : (p.landmark ? '世界地标' : '建筑'),
      author: pick(p.name.length * 3 + i + base)
    }));
  }

  const pixel = fromModule('pixel', 0);
  const arch  = fromModule('architecture', 100);
  window.COMMUNITY = pixel.concat(arch);
})();
