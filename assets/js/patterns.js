/* =========================================================
   拼豆星球 — 调色板 & 预设图案
   全局: window.PALETTE, window.PATTERNS
   ========================================================= */

/* Perler / Hama 风格官方近似色（名称 + hex） */
window.PALETTE = [
  { name: '白',   hex: '#FCFCFC' },
  { name: '黑',   hex: '#1A1A1A' },
  { name: '红',   hex: '#E3000B' },
  { name: '橙',   hex: '#FF7A00' },
  { name: '黄',   hex: '#FFD500' },
  { name: '绿',   hex: '#00A650' },
  { name: '蓝',   hex: '#006CB7' },
  { name: '青',   hex: '#00B6C4' },
  { name: '紫',   hex: '#7B2FBF' },
  { name: '粉',   hex: '#FF5CA8' },
  { name: '浅粉', hex: '#FFC2D9' },
  { name: '棕',   hex: '#6B4226' },
  { name: '浅棕', hex: '#C8A06A' },
  { name: '灰',   hex: '#9AA0A6' },
  { name: '深灰', hex: '#5F6368' },
  { name: '米白', hex: '#FFF1D6' },
  { name: '薄荷', hex: '#7BE0AD' },
  { name: '天蓝', hex: '#7EC8FF' },
  { name: '海军', hex: '#1B2A6B' },
  { name: '酒红', hex: '#8E1B3A' },
  { name: '金',   hex: '#F4C430' },
  { name: '银',   hex: '#D9DCE1' },
  { name: '青柠', hex: '#B6E21A' },
  { name: '桃',   hex: '#FFB38A' },
  { name: '紫红', hex: '#C11D6F' },
  { name: '橄榄', hex: '#6E7B1E' },
  { name: '雪青', hex: '#C9B6FF' },
  { name: '咖啡', hex: '#3B2417' }
];

/* ---------- 程序化生成预设图案 ---------- */
function makeGrid(cols, rows, fn){
  const data = [];
  for(let y=0;y<rows;y++){
    const r = [];
    for(let x=0;x<cols;x++) r.push(fn(x,y,cols,rows));
    data.push(r);
  }
  return data;
}
const C = name => (window.PALETTE.find(p=>p.name===name)||{}).hex || '#000';

const heart = makeGrid(15,13,(x,y,c,r)=>{
  const nx = (x-(c-1)/2)/((c-1)/2);
  const ny = ((r-1)/2 - y)/((r-1)/2);
  const v = Math.pow(nx*nx + ny*ny -1,3) - nx*nx*ny*ny*ny;
  return v <= 0 ? C('红') : null;
});

const gem = makeGrid(15,15,(x,y,c,r)=>{
  const nx = (x-(c-1)/2)/((c-1)/2);
  const ny = ((r-1)/2 - y)/((r-1)/2);
  return Math.abs(nx)+Math.abs(ny) <= 0.86 ? C('青') : null;
});

const flower = makeGrid(15,15,(x,y,c,r)=>{
  const nx = (x-(c-1)/2)/((c-1)/2);
  const ny = ((r-1)/2 - y)/((r-1)/2);
  const d = Math.sqrt(nx*nx+ny*ny);
  const petal = d <= 0.62;
  const center = d <= 0.24;
  const stem = (Math.abs(nx) < 0.07 && ny < -0.2 && ny > -0.78);
  const leaf = (ny < -0.45 && Math.abs(nx) > 0.18 && Math.abs(nx) < 0.42 && Math.abs(nx) + (-ny)*0.6 < 0.7);
  if(center) return C('黄');
  if(petal) return C('粉');
  if(stem || leaf) return C('绿');
  return null;
});

const smiley = makeGrid(15,15,(x,y,c,r)=>{
  const nx = (x-(c-1)/2)/((c-1)/2);
  const ny = ((r-1)/2 - y)/((r-1)/2);
  const d = Math.sqrt(nx*nx+ny*ny);
  if(d > 0.85) return null;
  // 眼睛
  if(((nx>-0.55&&nx<-0.15)&&(ny>0.25&&ny<0.6)) || ((nx>0.15&&nx<0.55)&&(ny>0.25&&ny<0.6))) return C('黑');
  // 嘴（弧线）
  if(ny < -0.1 && ny > -0.55 && Math.abs(nx) < (0.55 + ny*0.9)) return C('黑');
  return C('黄');
});

const star = makeGrid(15,15,(x,y,c,r)=>{
  const cx=(c-1)/2, cy=(r-1)/2;
  const dx=x-cx, dy=y-cy;
  const ang = Math.atan2(dy,dx);          // -pi..pi
  const rad = Math.sqrt(dx*dx+dy*dy)/((c-1)/2); // 0..~1.41
  const k = 5; // 五角星
  const starR = 0.92;
  const val = Math.cos(k*ang);
  const boundary = starR * (0.42 + 0.58*Math.abs(val));
  return rad <= boundary ? C('黄') : null;
});

const mushroom = makeGrid(15,15,(x,y,c,r)=>{
  const nx = (x-(c-1)/2)/((c-1)/2);
  const ny = ((r-1)/2 - y)/((r-1)/2);
  // 菌盖（上半圆）
  const cap = ny > 0.05 && Math.sqrt(nx*nx + ((ny-0.05)*1.25)**2) <= 0.85;
  // 白点
  const spot = cap && (((nx-0.4)**2+((ny-0.45)*1.2)**2)<0.02 || ((nx+0.42)**2+((ny-0.4)*1.2)**2)<0.018 || ((nx+0.05)**2+((ny-0.7)*1.2)**2)<0.014);
  // 菌柄
  const stem = ny <= 0.05 && Math.abs(nx) < 0.30 && ny > -0.85;
  if(spot) return C('白');
  if(cap) return C('红');
  if(stem) return C('浅棕');
  return null;
});

/* 导出预设列表（每个 pattern: {name, cols, rows, data:[][]} ） */
window.PATTERNS = [
  { name:'爱心',   cols:15, rows:13, data:heart },
  { name:'宝石',   cols:15, rows:15, data:gem },
  { name:'小花',   cols:15, rows:15, data:flower },
  { name:'笑脸',   cols:15, rows:15, data:smiley },
  { name:'星星',   cols:15, rows:15, data:star },
  { name:'蘑菇',   cols:15, rows:15, data:mushroom }
];

/* =========================================================
   模块注册表 —— 供设计器按模块切换调色板 & 预设图案
   每个模块: { label, palette:[{name,hex}], patterns:[{name,cols,rows,data}] }
   ========================================================= */

const CLOISONNE_PALETTE = [
  { name:'宝蓝',   hex:'#006CB7' },
  { name:'胭脂红', hex:'#E3000B' },
  { name:'松绿',   hex:'#00A650' },
  { name:'鎏金',   hex:'#F4C430' },
  { name:'象牙白', hex:'#FCFCFC' },
  { name:'墨黑',   hex:'#1A1A1A' },
  { name:'青碧',   hex:'#00B6C4' },
  { name:'紫晶',   hex:'#7B2FBF' },
  { name:'银',     hex:'#D9DCE1' },
  { name:'桃',     hex:'#FFB38A' }
];

const ARCH_PALETTE = [
  { name:'混凝土', hex:'#9AA0A6' },
  { name:'砖红',   hex:'#E3000B' },
  { name:'玻璃蓝', hex:'#006CB7' },
  { name:'石灰白', hex:'#FCFCFC' },
  { name:'暖石',   hex:'#C8A06A' },
  { name:'深蓝',   hex:'#1B2A6B' },
  { name:'橄榄绿', hex:'#00A650' },
  { name:'墨',     hex:'#1A1A1A' },
  { name:'金',     hex:'#F4C430' },
  { name:'青',     hex:'#00B6C4' },
  { name:'天蓝',   hex:'#7EC8FF' },
  { name:'黄',     hex:'#FFD500' },
  { name:'棕',     hex:'#6B4226' },
  { name:'粉',     hex:'#FF5CA8' },
  { name:'紫',     hex:'#7B2FBF' },
  { name:'薄荷',   hex:'#7BE0AD' }
];

/* ---- 掐丝珐琅预设 ---- */
const cloisonne_flower = makeGrid(15,15,(x,y,c,r)=>{
  const nx=(x-(c-1)/2)/((c-1)/2), ny=((r-1)/2-y)/((r-1)/2);
  const d=Math.sqrt(nx*nx+ny*ny);
  if(d>0.86) return null;
  if(d<0.16) return C('金');
  if(d<0.40) return C('胭脂红');
  if(d<0.62) return C('宝蓝');
  return C('象牙白');
});

const cloisonne_lattice = makeGrid(15,15,(x,y,c,r)=>{
  if(((x+y)%3===0) || ((x-y+15)%3===0)) return C('宝蓝');
  return C('象牙白');
});

const cloisonne_cloud = makeGrid(15,15,(x,y,c,r)=>{
  const inC=(cx,cy,rad)=>{const dx=x-cx,dy=y-cy;return dx*dx+dy*dy<=rad*rad;};
  if(inC(5,9,3)||inC(9,9,3)||inC(7,6,2.4)) return C('青碧');
  if(inC(7,9,1.6)) return C('宝蓝');
  return null;
});

const CLOISONNE_PATTERNS = [
  { name:'团花',   cols:15, rows:15, data:cloisonne_flower },
  { name:'菱格',   cols:15, rows:15, data:cloisonne_lattice },
  { name:'祥云',   cols:15, rows:15, data:cloisonne_cloud }
];

/* ---- 建筑预设 ---- */
const arch_pearl = makeGrid(15,19,(x,y,c,r)=>{
  const col=C('混凝土'), red=C('砖红');
  if(y<=1 && x===7) return C('金');
  { const dx=x-7,dy=y-5;  if(dx*dx+dy*dy<=4)  return red; }   // 小球
  { const dx=x-7,dy=y-11; if(dx*dx+dy*dy<=9)  return red; }   // 大球
  if(x===7 && y>=2 && y<=15) return col;                       // 柱
  if(y>=16 && x>=5 && x<=9) return col;                        // 基座
  return null;
});

const arch_tower = makeGrid(15,19,(x,y,c,r)=>{
  if(x<3||x>11||y<3) return null;
  if(y>=18) return C('混凝土');
  return ((x+y)%2===0) ? C('石灰白') : C('玻璃蓝');
});

const arch_house = makeGrid(15,13,(x,y,c,r)=>{
  const cx=7;
  if(y<=4 && Math.abs(x-cx) <= (4-y)+1) return C('砖红');     // 屋顶
  if(y>4 && y<=10 && x>=4 && x<=10){
    if(y>=8 && x>=6 && x<=8) return C('深蓝');                 // 门
    return C('暖石');                                          // 墙
  }
  return null;
});

const ARCH_PATTERNS = [
  { name:'东方明珠', cols:15, rows:19, data:arch_pearl },
  { name:'摩天楼',   cols:15, rows:19, data:arch_tower },
  { name:'小屋',     cols:15, rows:13, data:arch_house }
];

/* =========================================================
   世界地标像素图案（城市风景系列）
   ========================================================= */
const LMAP = {
  '.':'#7EC8FF', // 天空
  'W':'#FCFCFC', // 云/白墙
  'K':'#1A1A1A', // 黑
  'S':'#5F6368', // 钢/深灰
  'G':'#00A650', // 绿（自由女神/草地）
  'B':'#E3000B', // 砖红
  'Y':'#FFD500', // 金/金字塔
  'N':'#1B2A6B', // 海军蓝
  'R':'#6B4226', // 棕
  'E':'#006CB7', // 蓝
  'C':'#00B6C4', // 青
  'M':'#7BE0AD', // 薄荷（山水/草地）
  'O':'#C8A06A', // 暖石
  'P':'#FFC2D9'  // 浅粉
};
function landmarkMap(name, rows){
  const data=[];
  for(let y=0;y<rows.length;y++){
    const row=[];
    for(let x=0;x<rows[y].length;x++){
      const ch=rows[y][x];
      row.push(LMAP[ch] || null);
    }
    data.push(row);
  }
  return { name, cols:rows[0].length, rows:rows.length, data };
}

/* ---- 字符图地标 ---- */
const landmark_eiffel = landmarkMap('埃菲尔铁塔', [
  '....................',
  '..........K.........',
  '..........K.........',
  '.........KKK........',
  '.........KKK........',
  '..........K.........',
  '..........K.........',
  '.........KSK........',
  '........KSSSK.......',
  '.......KSSSSSK......',
  '......KSSSSSSSK.....',
  '.....KSSSSSSSSSK....',
  '....KSSSSSSSSSSSK...',
  '...KSSSSSSSSSSSSSK..',
  '..KSSSSSSSSSSSSSSSK.',
  '.KSSSSSSSSSSSSSSSSSK',
  '.KSSSSSSSSSSSSSSSSSK',
  'WWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWW'
]);

const landmark_opera = landmarkMap('悉尼歌剧院', [
  '.........WWWWW......',
  '........WW...WW.....',
  '.......WW.....WW....',
  '......WW.......WW...',
  '.....WW.........WW..',
  '....WW...........WW.',
  '...WW.............WW',
  '..WW...............W',
  '.WW.................',
  'WW..................',
  'WW.......WWWWW......',
  '.WW.....WW...WW.....',
  '..WW...WW.....WW....',
  '...WW.WW.......WW...',
  '....WWW.........WW..',
  '.....W...........WW.',
  '..................WW',
  'EEEEEEEEEEEEEEEEEEEE',
  'EEEEEEEEEEEEEEEEEEEE',
  'EEEEEEEEEEEEEEEEEEEE'
]);

const landmark_bigben = landmarkMap('大本钟', [
  '.........KKK........',
  '..........K.........',
  '.........KKK........',
  '..........K.........',
  '.........KKK........',
  '.........KKK........',
  '.........KKK........',
  '.......RRRRRRR......',
  '.......RWWWWWR......',
  '.......RWBWBWR......',
  '.......RWBWBWR......',
  '.......RWWWWWR......',
  '.......RRRRRRR......',
  '.........RR.........',
  '.........RR.........',
  '.........RR.........',
  '.......RRRRRRR......',
  '.......RRRRRRR......',
  'WWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWW'
]);

const landmark_sophia = landmarkMap('圣索菲亚教堂', [
  '..........K.........',
  '..........K.........',
  '.........YYY........',
  '........YYYYY.......',
  '.......YYYYYYY......',
  '.......YYYYYYY......',
  '........YYYYY.......',
  '.........YYY........',
  '.........KKK........',
  '........WWWWW.......',
  '.......WWWWWWW......',
  '......WWWWWWWWW.....',
  '.....WWWWWWWWWWW....',
  '....WWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWW..',
  '...WWWWWWWWWWWWWWW..',
  '...W..WWWWWWWWW..W..',
  '......WWWWWWWWW.....',
  'NNNNNNNNNNNNNNNNNNNN',
  'NNNNNNNNNNNNNNNNNNNN'
]);

const landmark_qingdao = landmarkMap('五月的风', [
  '....................',
  '.........B..........',
  '........BBB.........',
  '.......BBBBB........',
  '......BBBBBBB.......',
  '.....BBBBBBBBB......',
  '....BBBBBBBBBBB.....',
  '...BBBBBBBBBBBBB....',
  '..BBBBBBBBBBBBBBB...',
  '.BBBBBBBBBBBBBBBBB..',
  'BBBBBBBBBBBBBBBBBBB.',
  '.BBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBB...',
  '...BBBBBBBBBBBBB....',
  '....BBBBBBBBBBB.....',
  '.....BBBBBBBBB......',
  '......BBBBBBB.......',
  '.......BBBBB........',
  'EEEEEEEEEEEEEEEEEEEE',
  'EEEEEEEEEEEEEEEEEEEE'
]);

const landmark_santorini = landmarkMap('大理蓝白', [
  '.........WWW........',
  '........WWWWW.......',
  '.......WW...WW......',
  '......WW.....WW.....',
  '.....WW.......WW....',
  '....WW.........WW...',
  '...WWWWWWWWWWWWWWW..',
  '..WWWWWWWWWWWWWWWWW.',
  '.WWWWWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWWWWW',
  '.WW..WWWWWWWWWWW..WW',
  '.WW..WWWWWWWWWWW..WW',
  '.WW..WWWWWWWWWWW..WW',
  '.WW..WWWWWWWWWWW..WW',
  '.WW..WWWWWWWWWWW..WW',
  '.WW..WWWWWWWWWWW..WW',
  'EEEEEEEEEEEEEEEEEEEE',
  'EEEEEEEEEEEEEEEEEEEE',
  'EEEEEEEEEEEEEEEEEEEE',
  'EEEEEEEEEEEEEEEEEEEE'
]);

/* ---- 程序化地标 ---- */
const landmark_pyramid = makeGrid(20,20,(x,y,c,r)=>{
  if(y>=17) return C('暖石'); // 沙地
  const cx=c/2, h=16;
  const slope = Math.abs(x-cx) * (h/(c/2));
  if(y >= 16-slope) return C('黄');
  return C('天蓝');
});

const landmark_tokyo = makeGrid(20,20,(x,y,c,r)=>{
  const cx=c/2;
  if(y>=17) return C('白'); // 地面
  if(Math.abs(x-cx)<=1 && y>=2) return C('白');
  const towerW = 2 + Math.floor((17-y)/2.2);
  if(y>=2 && Math.abs(x-cx)<=towerW){
    if((x+y)%3===0) return C('砖红');
    return C('白');
  }
  if(y<4 && Math.abs(x-cx)<=4) return C('天蓝');
  return C('天蓝');
});

const landmark_tiantan = makeGrid(20,20,(x,y,c,r)=>{
  const cx=c/2;
  if(y>=17) return C('暖石');
  const roof = y=>{
    if(y>=4 && y<=6 && Math.abs(x-cx)<=(y-1)) return C('青');
    if(y>=7 && y<=9 && Math.abs(x-cx)<=(10-y)) return C('青');
    if(y>=10 && y<=12 && Math.abs(x-cx)<=(y-6)) return C('青');
    if(y>=13 && y<=15 && Math.abs(x-cx)<=(15-y)) return C('青');
    return null;
  };
  const col = roof(y);
  if(col) return col;
  if(y>=13 && y<=16 && Math.abs(x-cx)<=1) return C('砖红');
  if(y>=11 && y<=12 && Math.abs(x-cx)<=3) return C('石灰白');
  return C('天蓝');
});

const landmark_liberty = makeGrid(20,20,(x,y,c,r)=>{
  const cx=c/2;
  if(y>=17) return C('暖石');
  // 火炬
  if(y>=1 && y<=3 && x===10) return C('黄');
  if(y===0 && x>=8 && x<=12) return C('黄');
  // 头
  if(y>=4 && y<=6 && Math.abs(x-cx)<=2) return C('绿');
  // 身体
  if(y>=7 && y<=13 && Math.abs(x-cx)<=1) return C('绿');
  // 裙摆
  if(y>=14 && y<=16 && Math.abs(x-cx)<=(y-11)) return C('绿');
  return C('天蓝');
});

const landmark_guilin = makeGrid(20,20,(x,y,c,r)=>{
  // 山
  const peaks=[{x:3,h:12},{x:7,h:8},{x:12,h:14},{x:16,h:10}];
  for(const pk of peaks){
    if(Math.abs(x-pk.x)<=(20-y)*(pk.h/20) && y>=20-pk.h) return C('绿');
  }
  // 水
  if(y>=16) return C('青');
  // 天空
  return C('天蓝');
});

const landmark_potala = makeGrid(20,20,(x,y,c,r)=>{
  const cx=c/2;
  if(y>=17) return C('暖石');
  // 白宫基座
  if(y>=10 && Math.abs(x-cx)<=7) return C('石灰白');
  // 红宫
  if(y>=3 && y<=9 && Math.abs(x-cx)<=4) return C('砖红');
  // 金顶
  if(y>=1 && y<=2 && Math.abs(x-cx)<=3) return C('金');
  if(y===0 && Math.abs(x-cx)<=1) return C('金');
  return C('天蓝');
});

const LANDMARK_PATTERNS = [
  landmark_eiffel,
  landmark_opera,
  landmark_bigben,
  landmark_sophia,
  landmark_qingdao,
  landmark_santorini,
  { name:'金字塔', cols:20, rows:20, data:landmark_pyramid },
  { name:'东京塔', cols:20, rows:20, data:landmark_tokyo },
  { name:'天坛',   cols:20, rows:20, data:landmark_tiantan },
  { name:'自由女神', cols:20, rows:20, data:landmark_liberty },
  { name:'桂林山水', cols:20, rows:20, data:landmark_guilin },
  { name:'布达拉宫', cols:20, rows:20, data:landmark_potala }
];

window.MODULES = {
  pixel:        { label:'像素拼豆', palette: window.PALETTE,         patterns: window.PATTERNS },
  architecture: { label:'建筑',     palette: ARCH_PALETTE,          patterns: ARCH_PATTERNS.concat(LANDMARK_PATTERNS) }
};

/* =========================================================
   拼豆品牌色库（对标 PixelBeads：Hama / Perler / Artkal / Nabbi）
   每个品牌 = 近似官方色号（code + name + hex）
   ========================================================= */
window.BRANDS = {
  Hama: [
    {code:'H01',name:'白',hex:'#FFFFFF'},{code:'H02',name:'奶油',hex:'#F5E9C8'},{code:'H03',name:'黄',hex:'#FFD500'},
    {code:'H07',name:'橙',hex:'#FF7A00'},{code:'H10',name:'红',hex:'#E3000B'},{code:'H14',name:'粉',hex:'#FF5CA8'},
    {code:'H19',name:'浅粉',hex:'#FFC2D9'},{code:'H24',name:'酒红',hex:'#8E1B3A'},{code:'H28',name:'紫',hex:'#7B2FBF'},
    {code:'H32',name:'蓝',hex:'#006CB7'},{code:'H36',name:'天蓝',hex:'#7EC8FF'},{code:'H41',name:'青',hex:'#00B6C4'},
    {code:'H45',name:'绿',hex:'#00A650'},{code:'H49',name:'薄荷',hex:'#7BE0AD'},{code:'H53',name:'橄榄',hex:'#6E7B1E'},
    {code:'H57',name:'棕',hex:'#6B4226'},{code:'H61',name:'浅棕',hex:'#C8A06A'},{code:'H65',name:'灰',hex:'#9AA0A6'},
    {code:'H69',name:'深灰',hex:'#5F6368'},{code:'H73',name:'黑',hex:'#1A1A1A'},{code:'H77',name:'金',hex:'#F4C430'},
    {code:'H81',name:'海军',hex:'#1B2A6B'}
  ],
  Perler: [
    {code:'P01',name:'白',hex:'#FFFFFF'},{code:'P02',name:'奶油',hex:'#F3E7C9'},{code:'P03',name:'黄',hex:'#FFCE00'},
    {code:'P07',name:'橙',hex:'#FF7A00'},{code:'P10',name:'红',hex:'#DA251D'},{code:'P14',name:'粉',hex:'#FF7FB0'},
    {code:'P19',name:'浅粉',hex:'#FFCFE3'},{code:'P24',name:'酒红',hex:'#8E1B3A'},{code:'P28',name:'紫',hex:'#7B2FBF'},
    {code:'P32',name:'蓝',hex:'#0A6CB6'},{code:'P36',name:'天蓝',hex:'#8FD2F0'},{code:'P41',name:'青',hex:'#00B6C4'},
    {code:'P45',name:'绿',hex:'#00A651'},{code:'P49',name:'薄荷',hex:'#9BE3C0'},{code:'P53',name:'橄榄',hex:'#6E7B1E'},
    {code:'P57',name:'棕',hex:'#7A4A2B'},{code:'P61',name:'浅棕',hex:'#CDA979'},{code:'P65',name:'灰',hex:'#9AA0A6'},
    {code:'P69',name:'黑',hex:'#1A1A1A'},{code:'P77',name:'金',hex:'#E8B23A'},{code:'P81',name:'海军',hex:'#233A8C'}
  ],
  Artkal: [
    {code:'A01',name:'白',hex:'#FFFFFF'},{code:'A02',name:'米白',hex:'#FBF3DE'},{code:'A03',name:'黄',hex:'#FFD400'},
    {code:'A07',name:'橙',hex:'#FF7A1A'},{code:'A10',name:'红',hex:'#E3000B'},{code:'A14',name:'粉',hex:'#FF63A8'},
    {code:'A19',name:'浅粉',hex:'#FFC6DD'},{code:'A24',name:'酒红',hex:'#991B3A'},{code:'A28',name:'紫',hex:'#8431C4'},
    {code:'A32',name:'蓝',hex:'#0072C6'},{code:'A36',name:'天蓝',hex:'#86C9F2'},{code:'A41',name:'青',hex:'#00B7CB'},
    {code:'A45',name:'绿',hex:'#00A857'},{code:'A49',name:'薄荷',hex:'#7FE0B4'},{code:'A53',name:'青柠',hex:'#B6E21A'},
    {code:'A57',name:'棕',hex:'#6E4A2E'},{code:'A61',name:'浅棕',hex:'#C9A36A'},{code:'A65',name:'灰',hex:'#9AA0A6'},
    {code:'A69',name:'黑',hex:'#1A1A1A'},{code:'A77',name:'金',hex:'#F2C233'},{code:'A81',name:'海军',hex:'#1B2A6B'}
  ],
  Nabbi: [
    {code:'N01',name:'白',hex:'#FCFCFC'},{code:'N02',name:'奶油',hex:'#F6EAC9'},{code:'N03',name:'黄',hex:'#FFD200'},
    {code:'N07',name:'橙',hex:'#FF7A00'},{code:'N10',name:'红',hex:'#E3000B'},{code:'N14',name:'粉',hex:'#FF6FA6'},
    {code:'N19',name:'浅粉',hex:'#FFC9DE'},{code:'N24',name:'酒红',hex:'#8E1B3A'},{code:'N28',name:'紫',hex:'#7B2FBF'},
    {code:'N32',name:'蓝',hex:'#0B66B0'},{code:'N36',name:'天蓝',hex:'#8FD0EF'},{code:'N41',name:'青',hex:'#00B6C4'},
    {code:'N45',name:'绿',hex:'#00A651'},{code:'N49',name:'薄荷',hex:'#8FE1BC'},{code:'N53',name:'橄榄',hex:'#6E7B1E'},
    {code:'N57',name:'棕',hex:'#6B4226'},{code:'N65',name:'灰',hex:'#9AA0A6'},{code:'N69',name:'黑',hex:'#1A1A1A'},
    {code:'N77',name:'金',hex:'#F4C430'}
  ]
};
window.BRAND_NAMES = Object.keys(window.BRANDS);

