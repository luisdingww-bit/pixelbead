#!/usr/bin/env node
/**
 * deploy-surge.mjs —— 把 pixelbead 站点一键部署到多个 Surge 域名（"多个端"）
 *
 * 用法（在本机、已登录 Surge 的环境运行）：
 *   node deploy-surge.mjs
 *
 * 可选：用 token 免交互
 *   set SURGE_TOKEN=xxxx   # Windows PowerShell
 *   SURGE_TOKEN=xxxx node deploy-surge.mjs   # macOS/Linux
 *
 * 说明：
 *   - 会先把站点文件复制到一个干净的临时目录 .surge-dist（排除 .git / .workbuddy 等），
 *     再分别 surge 到下面每个域名，保证隐私文件不会泄露。
 *   - 想加更多端，直接在 DOMAINS 数组里加域名即可。
 */

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== 配置：要生成的多个 Surge 端（域名）=====
const DOMAINS = [
  'pixelbead.surge.sh',     // 主端
  // 想加更多端，在下面加域名即可（例如 'pixelbead-cn.surge.sh'）
];

// 要打包进部署目录的站点文件 / 目录
const INCLUDES = [
  'index.html',
  'toys.html',
  'cloisonne.html',
  'cloisonne-studio.html',
  'architecture.html',
  'designer.html',
  '200.html',
  'README.md',
  'LICENSE',
  'assets',
];

const DIST = join(__dirname, '.surge-dist');

function log(msg) {
  console.log(`\n\x1b[36m▶\x1b[0m ${msg}`);
}

// 1) 构建干净的部署目录
log('构建干净部署目录 .surge-dist ...');
if (existsSync(DIST)) {
  try { rmSync(DIST, { recursive: true, force: true }); }
  catch (e) { console.warn('  ⚠ 清理旧目录失败，继续覆盖：', e.message); }
}
mkdirSync(DIST, { recursive: true });
for (const item of INCLUDES) {
  const src = join(__dirname, item);
  if (!existsSync(src)) {
    console.warn(`  ⚠ 跳过不存在: ${item}`);
    continue;
  }
  cpSync(src, join(DIST, item), { recursive: true });
}
console.log('  ✓ 已复制:', INCLUDES.filter((i) => existsSync(join(__dirname, i))).join(', '));

// 2) 逐个域名部署（使用本机 `surge login` 的缓存登录；不要传 --token，
//    `surge token` 打印的串不能用于 --token 参数）
for (const domain of DOMAINS) {
  log(`部署到 ${domain} ...`);
  const args = ['surge@latest', DIST, domain];
  const res = spawnSync('npx', ['--yes', ...args], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`\n\x1b[31m✗ 部署 ${domain} 失败（退出码 ${res.status}）\x1b[0m`);
    console.error('  请确认：①已 `surge login` 或设置了 SURGE_TOKEN；②域名未被他人占用。');
    process.exitCode = 1;
  } else {
    console.log(`\x1b[32m  ✓ ${domain} 已上线\x1b[0m  →  https://${domain}`);
  }
}

// 3) 清理临时目录
try {
  rmSync(DIST, { recursive: true, force: true });
  log('清理 .surge-dist 完成。');
} catch (e) {
  console.warn('  ⚠ 清理 .surge-dist 失败，可手动删除：', e.message);
}
console.log('\n🎉 全部端部署结束。');
