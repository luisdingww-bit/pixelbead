# 拼豆星球 PIXELBEAD

一个「**像素拼豆 × 乐高积木风 × 3D 打印**」的创作者站点 / 开源项目。
零门槛、超解压、万物皆可拼 —— 把屏幕里的像素，3D 打印成你桌上的真实积木。

## ✨ 核心功能

### 落地页 `index.html`
- 四大创作模块：**像素拼豆 / 玩具 / 掐丝珐琅 / 建筑**
- 社区作品墙（设计器实时生成的示例图案）
- 爆款灵感数据墙（源自小红书 / 抖音 / 新华网现象级趋势）
- 「设计即制造」3D 打印 CTA

### 在线拼豆设计器 `designer.html`（爆款引擎）
- 🎨 自由绘制：画笔 / 橡皮 / 填充 / 取色 / 撤销 / 重做
- 🎯 29 色 Perler / Hama 风格官方近似调色板
- 📷 **照片一键转像素图案**（纯本地，照片不上传服务器）
- 🧊 实时**等距 3D 积木预览**（乐高式立体渲染）
- 📦 一键导出：
  - `PNG` 图案图（分享 / 打印）
  - `STL` 3D 模型（直接丢进切片软件 3D 打印）
  - `CSV` 用豆量清单（采购表）

> 全部为纯静态、零依赖、纯前端实现，所有计算在浏览器本地完成。

## 🚀 本地预览
直接双击 `index.html` 即可；或起一个本地服务器（推荐，避免个别浏览器对本地文件的限制）：

```bash
python -m http.server 8080
# 然后访问 http://localhost:8080
```

## 🌐 部署到 GitHub Pages
1. 把本仓库推送到你的 GitHub（如 `luisdingww-bit/pixelbead`）。
2. 仓库 **Settings → Pages**，Source 选择 `Deploy from a branch` → `main` → `/ (root)`。
3. 等待约 1 分钟，访问 `https://<用户名>.github.io/pixelbead/`。

## 📁 目录结构
```
.
├── index.html              # 落地页
├── designer.html           # 拼豆设计器
├── assets/
│   ├── css/style.css       # 乐高积木风主题
│   └── js/
│       ├── bead-core.js    # 共享：颜色工具 + 绘制（drawBeads）
│       ├── patterns.js     # 调色板 + 程序化预设图案
│       ├── designer.js     # 设计器引擎（画板/3D/导出）
│       └── main.js         # 落地页交互（预览/画廊/动画）
└── README.md
```

## 🛠 技术栈
原生 HTML / CSS / JavaScript，无框架、无构建步骤。
关键实现：Canvas 2D 像素绘制、等距（isometric）投影 3D 渲染、ASCII STL 立方体几何生成。

---
© 2026 拼豆星球 PIXELBEAD · 由创作者用 ❤ 与 🧩 搭起来
