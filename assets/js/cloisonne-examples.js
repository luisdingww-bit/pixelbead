/* =========================================================
   掐丝珐琅工作室 — 示例纹样（矢量单元数据 + 缩略图生成）
   每个示例 = 一组 cell（掐丝闭合线 / 开放线 / 点蓝填充 / 贴珠）
   既用于画板一键载入，也用于生成画廊缩略图 SVG。
   ========================================================= */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const W = 900, H = 680, CX = 450, CY = 340;
  const GOLD = '#d4af37';

  /* ---------- 几何生成 ---------- */
  function ellipse(cx, cy, rx, ry, n, rot) {
    const a = [];
    for (let i = 0; i < n; i++) {
      const t = rot + TAU * i / n;
      a.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
    }
    return a;
  }
  // 花瓣 / 叶片：基部在 (cx,cy)，沿 ang 方向伸出，最大半宽 wid（两端尖）
  function lobe(cx, cy, len, wid, ang) {
    const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx, n = 16;
    const up = [], lo = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, w = Math.sin(Math.PI * t) * wid;
      const bx = cx + dx * len * t, by = cy + dy * len * t;
      up.push([bx + px * w, by + py * w]);
    }
    for (let i = n; i >= 0; i--) {
      const t = i / n, w = Math.sin(Math.PI * t) * wid;
      const bx = cx + dx * len * t, by = cy + dy * len * t;
      lo.push([bx - px * w, by - py * w]);
    }
    return up.concat(lo);
  }
  // 绕中心一圈花瓣
  function ring(cx, cy, count, baseR, len, wid, startRot) {
    const a = [];
    for (let k = 0; k < count; k++) {
      const ang = startRot + TAU * k / count;
      a.push(lobe(cx + Math.cos(ang) * baseR, cy + Math.sin(ang) * baseR, len, wid, ang));
    }
    return a;
  }
  function centroid(pts) {
    let x = 0, y = 0;
    for (const p of pts) { x += p[0]; y += p[1]; }
    return [x / pts.length, y / pts.length];
  }

  const E = {
    blue: '#1b4f9c', red: '#c0392b', green: '#2e8b57', yellow: '#f2c14e',
    white: '#e8eef5', purple: '#7b3fa0', orange: '#e07b39', pink: '#e98aa6', black: '#1a1a1a'
  };

  /* ---------- 构建示例 ---------- */
  function build() {
    const ex = [];

    // 1 · 团花：经典对称，宝蓝 / 胭脂红交错
    {
      const cells = [];
      cells.push({ pts: ellipse(CX, CY, 46, 46, 40, 0), fill: E.yellow, bead: [CX, CY] });
      ring(CX, CY, 8, 46, 150, 46, -Math.PI / 2)
        .forEach((p, k) => cells.push({ pts: p, fill: k % 2 ? E.red : E.blue }));
      ring(CX, CY, 8, 196, 60, 30, -Math.PI / 2 + TAU / 16)
        .forEach(p => cells.push({ pts: p, fill: E.green }));
      ex.push({ id: 'rosette', name: '团花', desc: '经典对称团花，宝蓝胭脂红交错', tags: ['入门', '对称', '吉祥'], wireHex: GOLD, wireW: 5, cells });
    }

    // 2 · 牡丹：层叠花瓣
    {
      const cells = [];
      cells.push({ pts: ellipse(CX, CY, 30, 30, 32, 0), fill: E.yellow, bead: [CX, CY] });
      ring(CX, CY, 6, 30, 72, 42, -Math.PI / 2).forEach(p => cells.push({ pts: p, fill: E.red }));
      ring(CX, CY, 8, 96, 132, 62, -Math.PI / 2 + TAU / 16).forEach(p => cells.push({ pts: p, fill: E.pink }));
      ring(CX, CY, 6, 210, 96, 34, -Math.PI / 2).forEach(p => cells.push({ pts: p, fill: E.green }));
      ex.push({ id: 'peony', name: '牡丹', desc: '层叠花瓣，富贵花王', tags: ['进阶', '层叠', '富贵'], wireHex: GOLD, wireW: 5, cells });
    }

    // 3 · 鱼 · 年年有余
    {
      const cells = [];
      cells.push({ pts: ellipse(CX + 10, CY, 170, 80, 48, 0), fill: E.blue });
      cells.push({ pts: lobe(CX + 10 - 170, CY, 130, 92, Math.PI), fill: E.white });
      cells.push({ pts: lobe(CX + 10, CY - 80, 78, 52, -Math.PI / 2), fill: E.orange });
      cells.push({ pts: lobe(CX + 30, CY + 60, 60, 40, Math.PI * 0.62), fill: E.orange });
      cells.push({ pts: ellipse(CX + 150, CY - 18, 16, 16, 20, 0), fill: E.white, bead: [CX + 150, CY - 18] });
      [[CX + 40, CY - 20], [CX + 90, CY], [CX + 40, CY + 20]]
        .forEach(s => cells.push({ pts: ellipse(s[0], s[1], 18, 18, 18, 0), fill: E.white }));
      ex.push({ id: 'fish', name: '鱼 · 年年有余', desc: '游动肥鱼，点蓝金珠点睛', tags: ['吉祥', '年味', '动态'], wireHex: GOLD, wireW: 5, cells });
    }

    // 4 · 蝴蝶：双翅对称
    {
      const cells = [];
      cells.push({ pts: ellipse(CX, CY, 14, 92, 28, 0), fill: E.black });
      cells.push({ pts: lobe(CX, CY - 30, 160, 74, -0.5), fill: E.purple });
      cells.push({ pts: lobe(CX, CY - 30, 160, 74, Math.PI + 0.5), fill: E.purple });
      cells.push({ pts: lobe(CX, CY + 40, 118, 58, 0.5), fill: E.red });
      cells.push({ pts: lobe(CX, CY + 40, 118, 58, Math.PI - 0.5), fill: E.red });
      cells.push({ pts: ellipse(CX + 70, CY - 70, 22, 22, 20, 0), fill: E.blue });
      cells.push({ pts: ellipse(CX - 70, CY - 70, 22, 22, 20, 0), fill: E.blue });
      cells.push({ pts: [[CX, CY - 118], [CX + 18, CY - 160], [CX + 30, CY - 175]], open: true });
      cells.push({ pts: [[CX, CY - 118], [CX - 18, CY - 160], [CX - 30, CY - 175]], open: true });
      ex.push({ id: 'butterfly', name: '蝴蝶', desc: '对称双翅，紫红蓝点睛', tags: ['对称', '灵动', '美好'], wireHex: GOLD, wireW: 4, cells });
    }

    // 5 · 祥云：留白雅致
    {
      const cells = [];
      cells.push({ pts: ellipse(360, CY + 20, 56, 56, 36, 0), fill: E.white });
      cells.push({ pts: ellipse(470, CY - 10, 72, 72, 40, 0), fill: E.white });
      cells.push({ pts: ellipse(584, CY + 20, 54, 54, 36, 0), fill: E.white });
      cells.push({ pts: ellipse(470, CY - 10, 26, 26, 24, 0), fill: E.blue });
      cells.push({ pts: [[584, CY + 20], [640, CY + 40], [676, CY + 18], [700, CY + 44]], open: true });
      ex.push({ id: 'cloud', name: '祥云', desc: '如意云头，留白雅致', tags: ['极简', '留白', '雅致'], wireHex: GOLD, wireW: 5, cells });
    }

    return ex;
  }

  const EXAMPLES = build();

  /* ---------- 缩略图 SVG ---------- */
  function buildExampleSVG(spec) {
    let cells = '';
    for (const c of spec.cells) {
      const pts = c.pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      if (c.open) {
        cells += `<polyline points="${pts}" fill="none" stroke="${spec.wireHex}" stroke-width="${spec.wireW}" stroke-linejoin="round" stroke-linecap="round"/>`;
      } else {
        cells += `<polygon points="${pts}" fill="${c.fill}" stroke="${spec.wireHex}" stroke-width="${spec.wireW}" stroke-linejoin="round"/>`;
      }
      if (c.bead) cells += `<circle cx="${c.bead[0]}" cy="${c.bead[1]}" r="9" fill="url(#bg)"/>`;
    }
    return `<svg class="ex-svg" viewBox="0 0 900 680" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
<defs><radialGradient id="bg" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#fff6cf"/><stop offset="45%" stop-color="${GOLD}"/><stop offset="100%" stop-color="#7a5a14"/></radialGradient></defs>
<rect x="0" y="0" width="900" height="680" rx="28" fill="#10151c"/>
${cells}
</svg>`;
  }

  window.CLOISONNE_EXAMPLES = EXAMPLES;
  window.buildExampleSVG = buildExampleSVG;
  window.CLOISONNE_CENTROID = centroid;
})();
