<p align="center">
  <a href="https://pixelbead.surge.sh"><img alt="Live Demo" src="https://img.shields.io/badge/%E2%96%B6_Live_Demo-ff4757?style=for-the-badge"></a>
  <img alt="Stars" src="https://img.shields.io/github/stars/luisdingww-bit/pixelbead?style=for-the-badge&color=ffd32a">
  <img alt="Last Commit" src="https://img.shields.io/github/last-commit/luisdingww-bit/pixelbead?style=for-the-badge">
</p>

<h1 align="center">PIXELBEAD · 拼豆星球</h1>

<p align="center">像素拼豆 × 乐高积木风 × 3D 打印 创作者站点</p>

> [!NOTE]
> 把像素艺术和 3D 打印玩到一起：拼豆模板、玩具、掐丝珐琅、建筑四大模块，浏览器里设计、一键出图 / 出模。

## ✨ 亮点 / Features
- 四大模块：像素拼豆 / 玩具 / 掐丝珐琅 / 建筑
- 浏览器内设计并预览，导出可打印素材
- LEGO 积木风视觉 + 3D 打印工作流
- 中英双语、响应式 premium UI

## 🚀 在线体验 / Live Demo
打开 **[Live Demo](https://pixelbead.surge.sh)** 即可免安装、纯浏览器体验。

## 🛠 技术栈 / Tech Stack
`React` `TypeScript` `Vite` `Tailwind CSS` `Three.js`

## 🔗 相关项目 / More by Louis Ding
- [实时热搜抽卡小游戏](https://luisdingww-bit.github.io/hot-pull/) — 实时热搜抽卡小游戏
- [摄像头蜘蛛侠面具](https://luisdingww-bit.github.io/spider-verse-nebula/) — 摄像头蜘蛛侠面具
- [个人作品集](https://louis-ding.surge.sh) — 个人作品集
- [图生 3D 打印工坊](https://snapprint.surge.sh/) — 图生 3D 打印工坊
- [龙族同人站](https://dragonraja-ding-ldcrew.surge.sh) — 龙族同人站

## 📄 License
以仓库内 `LICENSE` 文件为准（同人作品标注 CC BY-NC 4.0 者仅限非商用）。

---

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

## 🌊 部署到 Surge（多个端 / 多域名）
把同一个 pixelbead 站点一键部署成多个 Surge 网站（多域名镜像）。

1. 安装并登录 Surge（本机只需一次）：
   ```bash
   npm install -g surge
   surge login          # 浏览器授权，记住账号
   ```
2. 一键部署到所有配置的域名：
   ```bash
   node deploy-surge.mjs
   ```
   - 多个端在 `deploy-surge.mjs` 顶部的 `DOMAINS` 数组里配置（默认 `pixelbead.surge.sh` + `pixelbead-2.surge.sh`，可任意增删改名）。
   - 部署走本机 `surge login` 的**缓存登录**（无需 token）。注意：`surge token` 打印的串**不能**用于 `--token` 参数（Surge 怪癖），CI 场景需用 Surge 后台的真实 API Token。
   - 脚本会先复制出干净的 `.surge-dist/`（自动排除 `.git` / `.workbuddy` 等），再逐个 `surge` 上去，部署完自动清理。
3. 访问：`https://pixelbead.surge.sh` 以及你配置的其它域名。

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
© 2026 LDPIXELBEAD · 由创作者用 ❤ 与 🧩 搭起来

## 📄 License
本项目基于 [MIT License](./LICENSE) 开源，可自由使用、修改与分发，请保留版权声明。
