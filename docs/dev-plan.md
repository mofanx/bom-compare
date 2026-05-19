# BOM 对比工具 - 开发计划 V2

> 基于嘉立创 EDA 扩展 SDK（pro-api-sdk）进行开发，遵循现有构建体系和扩展规范。

## 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 构建工具 | esbuild（已有） | SDK 内置，IIFE 格式输出，不可更换 |
| 扩展入口 | src/index.ts | 导出注册函数，通过 extension.json 关联菜单 |
| UI 渲染 | iframe 内嵌页面 | SDK 标准方式，通过 eda API 打开 iframe 面板 |
| iframe 框架 | 原生 HTML + TypeScript | 扩展体积限制，避免引入 Vue/React 等框架 |
| iframe 构建 | esbuild 多入口 | 复用现有 esbuild 配置，新增 iframe 入口 |
| Excel 解析 | SheetJS (xlsx) | 成熟稳定，支持 xls/xlsx 读写，可 bundle 进 iframe |
| CSV 解析 | PapaParse | 轻量，支持流式解析和自动分隔符检测 |
| 编码检测 | jschardet | 自动识别 GBK/UTF-8 等编码 |
| 样式方案 | 原生 CSS（CSS 变量） | iframe 内独立样式，无冲突风险 |
| 状态管理 | 原生 JS 对象 | 项目规模适中，无需框架 |
| 国际化 | eda.sys_I18n + locales/ | 复用 SDK 内置 i18n 机制 |

---

## 项目结构（调整后）

```
bom-compare2/
├── build/                       # 构建输出和打包（已有）
│   ├── dist/                    # 编译输出
│   └── packaged.ts             # .eext 打包脚本（已有）
├── config/
│   ├── esbuild.common.ts       # 主入口构建配置（已有，需修改）
│   └── esbuild.prod.ts         # 生产构建脚本（已有）
├── iframe/                      # BOM 对比 UI 页面
│   ├── index.html              # iframe 主页面
│   ├── src/
│   │   ├── main.ts             # iframe JS 入口
│   │   ├── core/
│   │   │   ├── parser/
│   │   │   │   ├── index.ts    # 解析器统一入口
│   │   │   │   ├── csv-parser.ts
│   │   │   │   └── excel-parser.ts
│   │   │   ├── comparator.ts   # BOM 对比引擎
│   │   │   ├── column-mapper.ts # 列名智能映射
│   │   │   └── exporter.ts     # 导出功能
│   │   ├── ui/
│   │   │   ├── table.ts        # 虚拟滚动表格
│   │   │   ├── drop-zone.ts    # 拖拽区域
│   │   │   ├── dialog.ts       # 弹窗组件
│   │   │   ├── toolbar.ts      # 工具栏
│   │   │   └── summary.ts      # 汇总栏
│   │   ├── utils/
│   │   │   ├── encoding.ts     # 编码检测
│   │   │   ├── storage.ts      # 本地存储
│   │   │   └── hotkeys.ts      # 快捷键
│   │   └── types.ts            # 类型定义
│   └── styles/
│       ├── variables.css        # CSS 变量
│       ├── table.css            # 表格样式
│       ├── layout.css           # 布局样式
│       └── theme.css            # 主题适配
├── src/
│   └── index.ts                # 扩展入口（注册菜单、打开 iframe）
├── images/
│   └── logo.png                # 扩展图标（已有）
├── locales/                     # 国际化（已有）
│   ├── en.json
│   ├── zh-Hans.json
│   └── extensionJson/
├── tests/
│   ├── comparator.test.ts
│   ├── csv-parser.test.ts
│   └── fixtures/               # 测试用 BOM 文件
├── extension.json              # 扩展清单（已有，需修改）
├── package.json                # （已有，需添加依赖）
├── tsconfig.json               # （已有）
├── .edaignore                  # （已有，需更新）
└── docs/
    ├── features.md
    ├── prd.md
    └── dev-plan.md
```

---

## 架构说明

### 扩展入口（src/index.ts）

```
用户点击菜单 → extension.json headerMenus 触发 registerFn
→ src/index.ts 导出的函数被调用
→ 通过 eda API 打开 iframe 面板，加载 iframe/index.html
```

### iframe 页面（iframe/）

- 独立的 HTML 页面，由 esbuild 单独构建 JS bundle
- 所有 BOM 对比的 UI 和逻辑在 iframe 内运行
- 通过 postMessage 或 SDK 提供的通信机制与主扩展交互（如需要）
- 文件操作（打开/保存对话框）通过 iframe 内的 File API 或与主进程通信实现

### 构建流程

```
npm run build
  ↓
esbuild 构建 src/index.ts → dist/index.js（扩展入口，IIFE）
esbuild 构建 iframe/src/main.ts → iframe/bundle.js（iframe 逻辑）
  ↓
packaged.ts 打包为 .eext（包含 dist/、iframe/、extension.json 等）
```

---

## 开发里程碑

### Phase 1：项目配置与基础搭建（2 天）

| 任务 | 预估 | 产出 |
|------|------|------|
| 安装依赖（npm install） | 0.1d | node_modules |
| 修改 extension.json（名称、菜单注册） | 0.2d | 扩展元数据配置 |
| 修改 src/index.ts（注册菜单函数，打开 iframe） | 0.3d | 扩展入口逻辑 |
| 调整 esbuild 配置（新增 iframe 构建入口） | 0.3d | 多入口构建 |
| 搭建 iframe/index.html 基础页面结构 | 0.3d | 可运行的空白 iframe 页面 |
| 添加运行时依赖（xlsx、papaparse、jschardet） | 0.2d | package.json 更新 |
| 更新 .edaignore | 0.1d | 打包规则 |
| 验证：扩展安装后可打开 iframe 面板 | 0.5d | 端到端验证 |

**交付标准**：扩展安装到嘉立创 EDA 后，点击菜单可打开 BOM 对比的空白 iframe 面板。

---

### Phase 2：文件解析层（2.5 天）

| 任务 | 预估 | 产出 |
|------|------|------|
| 类型定义（BomRow, BomFile, DiffResult 等） | 0.5d | types.ts |
| CSV/TXT 解析器（PapaParse 封装） | 0.5d | csv-parser.ts |
| Excel 解析器（SheetJS 封装） | 0.5d | excel-parser.ts |
| 编码检测集成 | 0.3d | encoding.ts |
| 列名智能映射 | 0.5d | column-mapper.ts |
| 单元测试 | 0.2d | 解析器测试 |

**交付标准**：能正确解析 CSV/TXT/XLS/XLSX 格式 BOM 文件，输出统一的 BomRow[] 结构。

---

### Phase 3：对比引擎（1.5 天）

| 任务 | 预估 | 产出 |
|------|------|------|
| 对比算法实现（位号匹配 + 字段对比） | 0.5d | comparator.ts |
| 差异分类（相同/变更/新增/缺失） | 0.3d | DiffResult 结构 |
| 重复位号处理 | 0.2d | 边界 case |
| 单元测试 | 0.5d | comparator.test.ts |

**交付标准**：给定两组 BomRow[]，输出完整的 DiffResult。

---

### Phase 4：核心 UI 实现（4 天）

| 任务 | 预估 | 产出 |
|------|------|------|
| 主布局（左右面板 + 可调分隔栏） | 0.5d | layout.css + HTML 结构 |
| 文件操作栏（路径显示、按钮） | 0.3d | toolbar.ts |
| 拖拽导入区域 | 0.5d | drop-zone.ts |
| BOM 表格渲染（含虚拟滚动） | 1.5d | table.ts |
| 差异高亮着色 | 0.5d | 表格渲染逻辑 |
| 同步滚动 | 0.3d | 左右面板联动 |
| 结果汇总栏 | 0.4d | summary.ts |

**交付标准**：完整对比流程可走通——拖入文件 → 执行对比 → 查看高亮结果。

---

### Phase 5：增强交互（2.5 天）

| 任务 | 预估 | 产出 |
|------|------|------|
| 列映射配置弹窗 | 0.5d | dialog.ts |
| 行详情对比弹窗 | 0.5d | dialog.ts |
| 差异导航（上/下一处） | 0.3d | 导航逻辑 |
| 差异筛选（全部/差异/新增/缺失） | 0.3d | 筛选逻辑 |
| 搜索定位 | 0.3d | 搜索 UI + 逻辑 |
| 行联动高亮 | 0.2d | hover 事件 |
| 列排序 | 0.4d | 排序逻辑 |

**交付标准**：所有 P1 交互功能可用。

---

### Phase 6：导出与持久化（1.5 天）

| 任务 | 预估 | 产出 |
|------|------|------|
| 导出 CSV | 0.3d | exporter.ts |
| 导出 XLSX | 0.3d | exporter.ts |
| 导出对比报告 | 0.4d | 报告生成 |
| 本地存储（最近文件、列映射、设置） | 0.3d | storage.ts |
| Sheet 选择器（Excel 多 Sheet） | 0.2d | UI 组件 |

**交付标准**：导出功能正常，用户配置持久化。

---

### Phase 7：体验打磨（1.5 天）

| 任务 | 预估 | 产出 |
|------|------|------|
| 快捷键支持 | 0.3d | hotkeys.ts |
| 空状态引导 UI | 0.3d | 拖拽引导动画 |
| 加载进度条 | 0.2d | 大文件反馈 |
| 列宽拖拽调整 | 0.3d | 表格交互 |
| Tooltip（单元格内容截断） | 0.2d | 悬停提示 |
| 嘉立创 EDA 主题适配 | 0.2d | CSS 变量对齐 |

**交付标准**：交互流畅，视觉与嘉立创 EDA 风格一致。

---

### Phase 8：国际化与测试（2 天）

| 任务 | 预估 | 产出 |
|------|------|------|
| iframe 内 i18n 模块实现（翻译函数 + 语言切换） | 0.3d | iframe/src/utils/i18n.ts |
| 中英文翻译词典（所有 UI 文案） | 0.3d | iframe/src/locales/zh-Hans.ts, en.ts |
| 所有 UI 组件接入 i18n（替换硬编码文案） | 0.4d | 各组件改造 |
| 语言切换 UI 入口 + 跟随 EDA 主程序语言 | 0.2d | 工具栏语言按钮 |
| 语言偏好持久化（localStorage） | 0.1d | storage.ts |
| 补充 locales/ 翻译文件（扩展菜单） | 0.1d | locales/*.json |
| 端到端测试（各格式文件） | 0.2d | 测试覆盖 |
| 大文件性能测试（5000+ 行） | 0.2d | 性能验证 |
| 最终打包验证（.eext 安装测试） | 0.2d | 发布就绪 |

**交付标准**：所有 UI 文案支持中英切换，语言偏好持久化，无阻塞性 Bug，.eext 包可正常安装使用。

---

## 总工期

| 阶段 | 工期 |
|------|------|
| Phase 1: 项目配置与基础搭建 | 2 天 |
| Phase 2: 文件解析层 | 2.5 天 |
| Phase 3: 对比引擎 | 1.5 天 |
| Phase 4: 核心 UI 实现 | 4 天 |
| Phase 5: 增强交互 | 2.5 天 |
| Phase 6: 导出与持久化 | 1.5 天 |
| Phase 7: 体验打磨 | 1.5 天 |
| Phase 8: 国际化与测试 | 2 天 |
| **合计** | **17.5 天** |

---

## 关键技术决策

### 1. iframe 内 UI 方案

不使用 Vue/React 等框架，原因：
- 扩展包体积限制（.eext 需尽量小）
- iframe 内逻辑相对独立，原生 DOM 操作足够
- 减少构建复杂度，esbuild 直接 bundle TypeScript

如果后续 UI 复杂度显著增加，可考虑引入 Preact（3KB）作为轻量替代。

### 2. 文件访问方式

- iframe 内使用 HTML5 File API（`<input type="file">` + Drag & Drop）
- 不依赖 Node.js 文件系统 API
- 导出使用 Blob + download 触发浏览器下载

### 3. 虚拟滚动

自研轻量虚拟滚动：
- 固定行高，计算可视区域需要渲染的行范围
- 仅渲染可视区域 ± 缓冲区的 DOM 节点
- 滚动时动态替换内容，保持 DOM 节点数恒定

### 4. 构建配置调整

esbuild.common.ts 需新增 iframe bundle 入口：
```typescript
entryPoints: {
  index: './src/index',           // 扩展主入口
  'iframe/bundle': './iframe/src/main',  // iframe JS
}
```

---

## 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| eda iframe API 不熟悉 | 可能无法正确打开面板 | Phase 1 优先验证 iframe 打开方式，查阅 SDK 文档 |
| SheetJS 体积过大 | .eext 包超限 | 评估按需引入（仅 read 模块），或使用 xlsx-lite |
| iframe 与主进程通信受限 | 文件对话框等功能受阻 | 优先使用 iframe 内 File API，降低对主进程依赖 |
| 虚拟滚动自研复杂度 | 开发周期超预期 | 先实现基础版本（固定行高），后续优化 |
| 不同 BOM 格式差异大 | 解析失败率高 | 收集真实样本，列名映射表持续扩充 |

---

## 开发原则

1. **SDK 规范优先**：严格遵循嘉立创 EDA 扩展开发规范，不绕过 SDK 机制
2. **最小依赖**：iframe 内尽量减少第三方库，控制包体积
3. **渐进验证**：每个 Phase 结束后在 EDA 中实际安装验证
4. **核心流程优先**：先保证"加载 → 对比 → 查看"链路，再叠加增强功能
5. **真实数据驱动**：使用真实 BOM 文件测试，不依赖人造数据
