# BOM Compare - BOM 对比工具

中文 | [English](README.en.md)

嘉立创 EDA Pro 扩展，用于对比两个 BOM（物料清单）文件的差异，以表格形式直观展示变更内容。

## 功能特性

- **多格式支持**：CSV、TXT、XLS、XLSX 格式导入
- **智能解析**：自动识别文件编码（UTF-8、GBK、GB2312）、表头行、分隔符
- **列名映射**：自动匹配常见中英文列名变体，支持手动配置映射关系
- **差异对比**：以位号（Designator）为基准，逐列对比并高亮差异
- **差异导航**：快速跳转上/下一处差异，支持按类型筛选（新增/缺失/变更/相同）
- **同步滚动**：左右面板联动滚动，方便逐行对照
- **导出报告**：支持导出对比结果为 CSV/XLSX 格式
- **拖拽导入**：直接拖拽文件到面板即可加载
- **虚拟滚动**：支持上万行 BOM 数据流畅渲染
- **国际化**：支持中文/英文界面切换
- **快捷键**：Ctrl+D 执行对比、F3/Shift+F3 跳转差异、Ctrl+F 搜索

## 界面布局

左右双面板布局，左侧为旧文件，右侧为新文件：

- 顶部：文件操作栏（浏览、清空、另存为）
- 中间：BOM 数据表格（支持列宽调整、排序、搜索）
- 底部：结果汇总栏（统计相同/差异/新增/缺失行数）

## 差异高亮

| 颜色 | 含义 |
|------|------|
| 蓝色/青色单元格 | 值在新旧文件中不同 |
| 橙色/黄色整行 | 新文件中多出的元器件 |
| 红色/粉色整行 | 旧文件中存在但新文件中缺失 |
| 无高亮 | 完全一致 |

## 开发

### 环境要求

- Node.js >= 20.17.0

### 安装依赖

```bash
npm install
```

### 常用命令

```bash
npm run compile    # 编译项目
npm run build      # 编译 + 打包扩展
npm run lint       # 代码检查
npm run fix        # 自动修复代码风格
npm run test       # 运行测试（watch 模式）
npm run test:run   # 运行测试（单次）
```

### 项目结构

```
├── src/                    # 扩展入口
│   └── index.ts            # 注册菜单，打开 iframe 窗口
├── iframe/                 # 主界面（iframe 内嵌页面）
│   ├── index.html          # 页面入口
│   ├── styles/             # 样式（CSS 变量、主题、布局、表格）
│   └── src/
│       ├── main.ts         # 初始化入口
│       ├── types.ts        # 类型定义
│       ├── locales/        # 国际化资源
│       ├── core/           # 核心逻辑
│       │   ├── parser/     # 文件解析（CSV、Excel）
│       │   ├── comparator.ts   # 对比算法
│       │   ├── column-mapper.ts # 列映射
│       │   └── exporter.ts     # 导出
│       ├── ui/             # UI 组件
│       └── utils/          # 工具函数
├── tests/                  # 测试用例及样本数据
├── config/                 # esbuild 构建配置
├── build/                  # 打包脚本
└── extension.json          # 扩展配置
```

### 技术栈

- TypeScript（strict 模式）
- esbuild（构建）
- Vitest（测试）
- xlsx / papaparse / jschardet（文件解析）
- @jlceda/pro-api-types（EDA 扩展 API）

## 使用方式

安装扩展后，在嘉立创 EDA Pro 的首页、原理图编辑器或 PCB 编辑器的顶部菜单中点击 **BOM Compare** 即可打开。

## 许可证

[Apache-2.0](LICENSE)
