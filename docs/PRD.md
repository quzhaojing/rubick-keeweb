# Rubick-KeeWeb 插件产品需求文档（PRD）

| 项目 | 内容 |
|------|------|
| 产品名称 | rubick-keeweb |
| 版本 | v1.0-draft |
| 日期 | 2026-05-31 |
| 状态 | 草案 |

---

## 1. 背景与目标

### 1.1 背景

[KeeWeb](https://github.com/keeweb/keeweb) 是一款开源、跨平台的密码管理器，兼容 KeePass 的 `.kdbx` 格式，支持本地文件、Dropbox、Google Drive、OneDrive 及 WebDAV 等存储方式。其 Web 版与 Desktop 版在 UI 与功能上高度一致。

[Rubick](https://github.com/rubickCenter/rubick) 是基于 Electron 的插件化效率工具，通过关键词搜索呼出 UI 插件 Panel，插件以 `BrowserView` 方式加载，API 与 uTools 生态高度兼容。

用户希望在 Rubick 中通过输入关键词 **keeweb** 快速打开密码管理面板，**Panel 界面与 KeeWeb 原生体验保持一致**，且 **KeeWeb 的全部核心操作能力均可正常使用**，无需单独启动 KeeWeb Desktop 或浏览器访问 app.keeweb.info。

### 1.2 产品愿景

> 在 Rubick 搜索框输入 `keeweb`，即弹出与 KeeWeb 一致的密码管理 Panel，用户可完成 vault 打开、条目管理、云同步、密码生成等全部 KeeWeb 操作。

### 1.3 目标用户

- 已使用 Rubick 作为启动器的 Windows / macOS 用户
- 使用 KeePass / KeePassXC 生成 `.kdbx` 库，或希望迁移到 KeeWeb 工作流的用户
- 需要在桌面快捷入口中管理密码、又不想切换独立应用的用户

### 1.4 成功指标

| 指标 | 目标 |
|------|------|
| 关键词触发成功率 | ≥ 99%（安装插件后输入 keeweb 可稳定进入） |
| UI 一致性 | 与 KeeWeb Desktop/Web 主界面布局、主题、交互一致（允许 Rubick 外层搜索框存在） |
| 核心功能可用率 | P0 功能 100% 可用，P1 功能 ≥ 95% |
| 冷启动 Panel 时间 | ≤ 3s（本地 bundle 加载） |
| 用户数据安全 | 主密码与 vault 内容不落 Rubick 日志；遵循 KeeWeb 原有加密模型 |

### 1.5 非目标（Out of Scope v1.0）

- 不重写 KeeWeb 业务逻辑，不 fork 后大幅改造 UI
- 不替代 KeeWeb Desktop 安装包的全部能力（如独立系统托盘、全局自动更新安装包）
- 不在 v1.0 实现 Rubick 超级面板 / 全局快捷键独立入口（仅关键词触发）
- 不实现 KeeWeb 插件市场自定义插件的动态安装（可后续迭代）

---

## 2. 用户场景

### 2.1 主流程：关键词打开 Panel

```
用户唤起 Rubick → 输入 "keeweb" → 选择 KeeWeb 插件
    → Rubick 展开 Plugin Panel（全高度）
    → 展示 KeeWeb 主界面（与官方一致）
    → 用户选择打开/创建 vault → 输入主密码 → 管理条目
```

### 2.2 典型场景

| 编号 | 场景 | 期望行为 |
|------|------|----------|
| S1 | 打开本地 kdbx | 通过 KeeWeb 内置「Open / More storage options → File」流程打开；必要时由 preload 桥接本地文件选择 |
| S2 | 云存储同步 | Dropbox / GDrive / OneDrive OAuth 流程在 Panel 内完成，与 Web 版一致 |
| S3 | 搜索密码条目 | KeeWeb 统一搜索框可用，跨文件搜索行为不变 |
| S4 | 复制用户名/密码 | 剪贴板写入正常；可选集成 Rubick 通知提示「已复制」 |
| S5 | 新建/编辑条目 | 表单、标签、附件、保护字段等行为与 KeeWeb 一致 |
| S6 | 密码生成器 | 内置生成器可用，长度与字符集配置一致 |
| S7 | 主题切换 | Dark / Light 主题切换生效，状态持久化 |
| S8 | 拖放 kdbx / 附件 | 支持拖入 Rubick Panel 区域，由 KeeWeb 处理 |
| S9 | 退出插件 | 用户 Esc 或切换 Rubick 命令时，vault 锁定策略与 KeeWeb 一致 |
| S10 | 再次进入 | 保留 KeeWeb 上次会话状态（已打开文件列表、主题等），除非用户主动关闭 vault |

---

## 3. 功能需求

### 3.1 Rubick 插件集成（P0）

| ID | 需求 | 说明 |
|----|------|------|
| F-001 | 关键词匹配 | `features.cmds` 包含：`keeweb`、`KeeWeb`、`密码管理`、`kdbx`（可配置） |
| F-002 | UI 插件类型 | `pluginType: "ui"`，`main: "index.html"` |
| F-003 | Panel 尺寸 | 进入插件后调用 `rubick.setExpendHeight()` 展开至接近全屏（建议 ≥ 720px，可读取屏幕高度动态设置） |
| F-004 | 生命周期 | 在 `onPluginReady` / `onPluginEnter` 中初始化 KeeWeb；`onPluginOut` 时按 KeeWeb 策略处理锁定/清理 |
| F-005 | 插件元信息 | 名称、描述、logo、版本、homepage 符合 Rubick 上架规范 |
| F-006 | 子输入框 | 默认隐藏 Rubick 子搜索对 KeeWeb 的干扰；KeeWeb 使用自身搜索，不强制 `setSubInput` |

### 3.2 KeeWeb 界面一致性（P0）

| ID | 需求 | 说明 |
|----|------|------|
| F-010 | 完整 UI 渲染 | Panel 内加载 KeeWeb 完整应用（非简化版、非 iframe 裁剪关键区域） |
| F-011 | 布局一致 | 左侧文件列表、条目列表、详情面板、顶部工具栏与官方 KeeWeb 一致 |
| F-012 | 主题一致 | 支持 KeeWeb 内置 Dark/Light 及配色方案 |
| F-013 | 字体与图标 | 使用 KeeWeb 构建产物自带静态资源，不替换为 Rubick 风格 |
| F-014 | 无 Rubick 侵入式 UI | 插件壳层仅负责加载 KeeWeb，不叠加额外工具栏（调试入口除外） |

### 3.3 KeeWeb 核心操作对齐（P0 / P1）

以下能力须与 [KeeWeb 官方功能](https://keeweb.info/) 保持一致：

#### P0 — 必须实现

| 类别 | 功能点 |
|------|--------|
| Vault | 打开/创建/保存 `.kdbx`；多 vault 同时打开；关闭 vault |
| 条目 | 增删改查；分组；回收站；历史记录与回滚 |
| 安全 | 主密码解锁；保护字段；内存中敏感字段处理 |
| 搜索 | 全局搜索；高级搜索（字段、正则） |
| 工具 | 密码生成器 |
| 展示 | 列表/表格视图；颜色标记；条目图标 |
| 存储 | 本地文件读写（经 Electron/Rubick 桥接） |
| 云同步 | Dropbox、Google Drive、OneDrive 授权与同步 |
| 离线 | IndexedDB / 本地缓存策略与 KeeWeb 一致 |
| 剪贴板 | 复制用户名、密码、OTP 等 |

#### P1 — 重要但可二期验证

| 类别 | 功能点 |
|------|--------|
| 附件 | 条目附件上传、预览、内联图片查看 |
| 导入导出 | HTML、CSV 等 KeeWeb 支持的格式 |
| WebDAV | 自定义 WebDAV 服务器连接 |
| 快捷键 | KeeWeb 内置快捷键在 Panel 焦点内可用 |
| 自动锁定 | 超时锁定 vault，策略可配置 |
| KeeWeb 插件 | 官方 plugins 目录内预置插件兼容 |

#### P2 — 可选增强

| 类别 | 功能点 |
|------|--------|
| Rubick 联动 | 复制密码后 `rubick.showNotification` |
| 快速打开 | 检测到 `.kdbx` 文件拖入 Rubick 时自动进入插件（`cmds` type: files） |
| 最近 vault | 在 Rubick db 存最近路径（不含主密码） |

### 3.4 配置与设置（P1）

| ID | 需求 | 说明 |
|----|------|------|
| F-020 | 云 OAuth | 支持在插件目录或 userData 放置 KeeWeb `config.json`（Dropbox key 等） |
| F-021 | 默认存储 | 可配置默认打开方式（本地 / 上次 vault） |
| F-022 | Panel 高度 | 用户可配置默认展开高度 |

---

## 4. 技术方案

### 4.1 总体架构

```
┌─────────────────────────────────────────────┐
│                 Rubick 主进程                  │
│  BrowserView 加载 rubick-keeweb/index.html   │
└─────────────────────┬───────────────────────┘
                      │ preload.js (rubick API + KeeWeb 桥接)
┌─────────────────────▼───────────────────────┐
│           rubick-keeweb 插件壳层               │
│  index.html → 加载 KeeWeb 构建产物 (dist)      │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│     KeeWeb App (keeweb/keeweb 官方构建)        │
│  kdbx 加解密 / UI / 云同步 / IndexedDB         │
└─────────────────────────────────────────────┘
```

### 4.2 集成策略（推荐）

**方案 A：内嵌 KeeWeb 静态构建产物（推荐）**

1. 从 [keeweb/keeweb](https://github.com/keeweb/keeweb) 指定版本（建议 ≥ v1.19.0）执行官方构建，产出 `dist/` 静态资源。
2. 将构建产物放入插件 `public/keeweb/` 目录。
3. 插件 `index.html` 通过同源路径加载 KeeWeb 入口（如 `keeweb/index.html`）。
4. 在 `preload.js` 中补齐 KeeWeb Desktop 依赖的 Node/Electron 能力（文件对话框、路径、剪贴板等）。

**优点**：离线可用、UI 100% 一致、不依赖外网。  
**缺点**：插件包体积较大（需 gzip 与按需加载优化）。

**方案 B：iframe 加载远程 app.keeweb.info**

**不推荐**：网络依赖、OAuth 回调域问题、与「本地文件」能力受限，不符合 PRD 目标。

**方案 C：深度 fork KeeWeb 源码进 monorepo**

**不推荐 v1.0**：维护成本高，违背「界面与操作保持一致」的最小改动原则。

### 4.3 目录结构（建议）

```
rubick-keeweb/
├── public/
│   ├── package.json          # Rubick 插件清单
│   ├── index.html            # 壳层：挂载 KeeWeb + 调 setExpendHeight
│   ├── preload.js            # rubick API + KeeWeb native 桥接
│   └── keeweb/               # KeeWeb 官方 dist（构建时拷贝）
│       ├── index.html
│       ├── manifest.json
│       └── ...
├── scripts/
│   ├── build-keeweb.js       # 拉取/构建 KeeWeb
│   └── copy-dist.js
├── docs/
│   └── PRD.md
├── package.json
└── README.md
```

### 4.4 Rubick 插件配置示例

```json
{
  "name": "rubick-keeweb",
  "pluginName": "KeeWeb 密码管理",
  "description": "在 Rubick 中使用 KeeWeb 管理 KeePass kdbx 密码库",
  "author": "",
  "main": "index.html",
  "logo": "https://keeweb.info/img/logo.png",
  "version": "1.0.0",
  "preload": "preload.js",
  "pluginType": "ui",
  "features": [
    {
      "code": "keeweb",
      "explain": "打开 KeeWeb 密码管理器",
      "cmds": ["keeweb", "KeeWeb", "密码管理", "kdbx"]
    }
  ]
}
```

### 4.5 关键桥接点

KeeWeb Desktop 依赖 Electron 环境的部分需在 `preload.js` 映射：

| KeeWeb 需求 | Rubick 实现方式 |
|-------------|-----------------|
| 本地文件 open/save | `dialog` + `fs`（经 preload 暴露，或 rubick 扩展 API） |
| 剪贴板 | Electron clipboard / navigator.clipboard |
| 外部链接 | `rubick.shellOpenExternal` |
| 用户数据目录 | `rubick.getPath('userData')` 存放 config、缓存 |
| OAuth 回调 | 自定义 protocol 或 localhost 回调（对齐 KeeWeb desktop 实现） |
| 拖放文件 | BrowserView 默认 DnD + KeeWeb 事件 |

### 4.6 构建与版本

| 项 | 说明 |
|----|------|
| KeeWeb 版本 | 锁定 tag（如 `v1.19.0`），升级需回归测试 |
| Node | KeeWeb 构建要求 Node ≥ 20.9.0 |
| Rubick 版本 | 兼容 Rubick 最新稳定版及 uTools API 子集 |
| 许可证 | KeeWeb MIT；插件需保留 KeeWeb 版权声明 |

---

## 5. 非功能需求

### 5.1 安全

- 主密码、条目密码、OTP **不得**写入 Rubick 日志或 `rubick.db`。
- 仅可存储非敏感元数据（最近文件路径、主题、窗口高度）。
- 插件更新需重新审计 KeeWeb 上游安全公告。
- 云 OAuth token 存储遵循 KeeWeb 原有机制（IndexedDB / localStorage）。

### 5.2 性能

- 首次打开 Panel：KeeWeb 资源预加载或懒加载策略，目标 ≤ 3s。
- 再次打开：利用 KeeWeb 缓存，目标 ≤ 1s 可交互。
- `setExpendHeight` 仅在进入时调用一次，避免频繁重排。

### 5.3 兼容性

| 平台 | 优先级 |
|------|--------|
| Windows 10/11 | P0 |
| macOS | P1 |
| Linux | P2（随 Rubick 官方支持进度） |

### 5.4 可维护性

- KeeWeb 升级流程文档化：`npm run build:keeweb` 一键重建。
- 壳层代码与 KeeWeb dist 分离，便于 upstream 合并。

---

## 6. 交互与 UX 规范

### 6.1 进入插件

1. 用户输入 `keeweb` → 列表展示插件项（logo + 说明）。
2. 回车确认 → Rubick 主窗口展开 Panel。
3. KeeWeb 显示启动页 / 已打开 vault 列表（与官方一致）。

### 6.2 Panel 行为

- 宽度：跟随 Rubick 主窗口。
- 高度：默认屏幕可用高度的 85%–90%，最小高度 600px。
- 滚动：由 KeeWeb 内部处理，Rubick 壳层不出现双滚动条。

### 6.3 退出插件

- `Esc`：Rubick 默认行为；KeeWeb 应触发 vault 锁定（若已配置）。
- 切换其他 Rubick 命令：`onPluginOut` 回调中不强制清缓存，保留 KeeWeb 会话。

---

## 7. 验收标准

### 7.1 冒烟测试（必须通过）

- [ ] 安装插件后，输入 `keeweb` 可进入 Panel
- [ ] Panel 视觉与 KeeWeb Web/Desktop 主界面一致
- [ ] 打开本地 `.kdbx` 文件，主密码解锁成功
- [ ] 新建条目并保存，重新打开 vault 数据仍在
- [ ] 密码生成器可用
- [ ] Dark/Light 主题切换正常
- [ ] 复制密码到剪贴板成功

### 7.2 回归测试（P0 功能清单）

- [ ] Dropbox / GDrive / OneDrive 至少一种云存储完整走通 OAuth + 同步
- [ ] 多 vault 同时打开
- [ ] 搜索、标签、颜色标记、历史回滚
- [ ] 拖入 kdbx 文件打开
- [ ] 退出再进入，会话状态合理保留
- [ ] 敏感信息未出现在 DevTools 日志（抽样检查）

### 7.3 发布检查

- [ ] `npm link` 本地调试通过
- [ ] `public/package.json` 字段完整
- [ ] README 含安装、构建、config 说明
- [ ] 许可证与第三方声明完整

---

## 8. 里程碑

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| M1 脚手架 | rubick-plugin-cli 初始化、关键词触发、空 Panel 展开 | 可安装空壳插件 |
| M2 KeeWeb 嵌入 | 构建并内嵌 KeeWeb dist，UI 完整显示 | Panel 展示 KeeWeb |
| M3 本地 vault | preload 桥接本地文件读写 | 本地 kdbx 全流程 |
| M4 云同步 | OAuth + config.json 文档 | 至少一种云服务可用 |
| M5  polish | 性能、主题、DnD、通知 | Beta 可发布 |
| M6 上架 | npm publish + rubick 插件市场 PR | v1.0.0 |

---

## 9. 风险与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| KeeWeb 依赖 Electron API，Rubick BrowserView 权限不足 | 本地文件、OAuth 失败 | preload 精细桥接；参考 KeeWeb desktop 代码 |
| 插件包体积过大 | 下载与安装慢 | 压缩资源；可选分包下载 KeeWeb dist |
| 云 OAuth redirect URI 与插件环境不匹配 | 无法登录云盘 | 沿用 KeeWeb desktop redirect 方案 |
| Rubick Windows-only 阶段 | Linux 用户不可用 | PRD 标注平台优先级，跟进 Rubick 路线图 |
| KeeWeb 上游停更 | 安全漏洞 | 锁定版本 + 依赖 audit |

**外部依赖**：

- [keeweb/keeweb](https://github.com/keeweb/keeweb) 源码与构建链
- [rubickCenter/rubick](https://github.com/rubickCenter/rubick) 及插件 API
- [rubick-plugin-cli](https://github.com/rubickCenter/rubick-plugin-cli)

---

## 10. 开放问题

| # | 问题 | 建议决策 |
|---|------|----------|
| Q1 | Panel 是否全屏覆盖 Rubick 搜索框？ | 保留 Rubick 顶栏，Panel 在下方展开（与现有 UI 插件一致） |
| Q2 | 是否在 cmds 中支持直接拖入 `.kdbx`？ | v1.0 可选 P2；v1.1 实现 `type: files` |
| Q3 | KeeWeb 版本跟随 latest 还是锁定？ | 锁定 tag，手动升级 |
| Q4 | 是否提供中文 pluginName？ | 是，`KeeWeb 密码管理` |
| Q5 | 自建 OAuth app key 由谁配置？ | 高级用户自行填写 config.json，文档说明 |

---

## 11. 附录

### 11.1 参考链接

- KeeWeb 仓库：https://github.com/keeweb/keeweb
- KeeWeb 官网：https://keeweb.info/
- KeeWeb Web App：https://app.keeweb.info/
- Rubick 插件开发：https://rubickcenter.github.io/docs/dev/
- Rubick 插件 API：https://rubickcenter.github.io/docs/dev/api.html

### 11.2 术语

| 术语 | 说明 |
|------|------|
| Panel | Rubick 呼出 UI 插件后展开的内容区域 |
| vault | KeePass 密码库，`.kdbx` 文件 |
| 壳层 | rubick-keeweb 插件中除 KeeWeb 外的薄包装层 |

---

*文档结束*
