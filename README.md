# rubick-keeweb

在 [Rubick](https://github.com/rubickCenter/rubick) 中通过关键词 **keeweb** 打开 [KeeWeb](https://github.com/keeweb/keeweb) 密码管理 Panel，界面与 KeeWeb 官方 Web 版一致。

## 功能

- 输入 `keeweb`、`KeeWeb`、`密码管理`、`kdbx` 打开 Panel
- 拖入或选中 `.kdbx` / `.kdb` 文件时可直接用 KeeWeb 打开
- Panel 内嵌 KeeWeb 官方 gh-pages 静态资源，UI 与操作保持一致
- 支持 KeeWeb 内置的本地文件、云同步、搜索、密码生成等 Web 版能力

## 环境要求

- [Rubick](https://rubick.vip/) 已安装
- Node.js ≥ 18

## 安装与调试

```bash
# 1. 克隆仓库
git clone <repo-url> rubick-keeweb
cd rubick-keeweb

# 2. 下载 KeeWeb 静态资源（约 2MB+）
npm run setup

# 3. 链接插件到 Rubick
npm run link

# 4. 在 Rubick 插件市场 → 开发者 → 安装本地插件，选择 public 目录
# 5. 重启 Rubick，输入 keeweb 使用
```

## 目录结构

```
rubick-keeweb/
├── public/                 # Rubick 插件根目录（安装时指向此目录）
│   ├── package.json        # 插件清单
│   ├── index.html          # Panel 壳层
│   ├── app.js              # Panel 逻辑
│   ├── preload.js          # 文件桥接
│   └── keeweb/             # KeeWeb gh-pages（npm run setup 生成）
├── scripts/
│   └── download-keeweb.mjs
└── docs/
    └── PRD.md
```

## 云存储 OAuth（可选）

KeeWeb 云同步需在 `public/keeweb/` 旁放置 `config.json`，可参考 KeeWeb Wiki：

- [Dropbox and GDrive](https://github.com/keeweb/keeweb/wiki/Dropbox-and-GDrive)

示例见 `public/keeweb-config.example.json`。

## 已知限制

- 内嵌为 KeeWeb **Web 版**（gh-pages），非 Desktop 版；YubiKey、Auto-Type 等桌面专有功能不可用
- 首次使用需执行 `npm run setup` 下载 KeeWeb 资源（未纳入 git）
- 云 OAuth 在 `file://` 环境下可能需要额外配置 redirect URI

## 许可证

MIT。KeeWeb 遵循其上游许可证，详见 [keeweb/keeweb](https://github.com/keeweb/keeweb)。
