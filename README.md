# X榜单 · X中文区博主的每日情报站（复刻版 + 零成本实时数据管道）

高保真复刻 [xbangdan.com](https://xbangdan.com/) 的前端数据门户，并内置 **\$0/月全栈免费实时数据接入管道**（GitHub Actions 每小时同步 + 合规免费数据源 + 静态 JSON 托管）。

## 核心目录结构

- `index.html` / `styles.css` / `app.js` / `data.js` / `api.js` — 零依赖前端与实时快照拉取客户端（带离线自动兜底）
- `scripts/analytics.mjs` — 08:00 (Asia/Shanghai) 切天逻辑与 7 条统计口径引擎
- `scripts/analytics.test.mjs` — 统计口径自动化单元测试（`npm test`）
- `scripts/providers/` — 可插拔免费数据源适配器（`github.mjs`、`hackernews.mjs`、`bluesky.mjs`、`x-provider.mjs` 含免费 X oEmbed）
- `scripts/sync.mjs` — 小时级聚合脚本，产出 `data/latest.json`、`data/daily/YYYY-MM-DD.json` 与 `data/sync-status.json`
- `.github/workflows/sync-data.yml` — GitHub Actions 每小时定时同步工作流（\$0/月）

## 本地运行与测试

```bash
# 1. 运行统计口径单元测试
npm test

# 2. 手动执行一次免费实时数据同步（生成 data/latest.json）
npm run sync

# 3. 启动本地静态服务
npm run dev
```

## 部署（\$0/月）

1. 将本仓库推送至 GitHub，开启 GitHub Actions 写入权限，`.github/workflows/sync-data.yml` 将每小时自动更新 `data/latest.json`。
2. 在 **GitHub Pages** 或 **Cloudflare Pages** 绑定本仓库即可免费上线。
3. 未来如需升级接入 X 付费/商业数据源，只需在 GitHub Secrets 中配置 `X_DATA_PROVIDER_URL` 与 `X_DATA_PROVIDER_KEY`，无需修改前端代码。
