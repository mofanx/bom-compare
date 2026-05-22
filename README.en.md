# BOM Compare - BOM Comparison Tool

[中文](README.md) | English

An EasyEDA Pro extension for comparing differences between two BOM (Bill of Materials) files, presenting changes visually in a table format.

## Features

### Core Features

- **Multi-format Support**: Import CSV, TXT, XLS, XLSX formats
- **Smart Parsing**: Auto-detect file encoding (UTF-8, GBK, GB2312), header rows, and delimiters
- **Column Mapping**: Auto-match common Chinese/English column name variants with manual configuration support
- **Diff Comparison**: Compare column by column based on Designator, highlighting differences
- **Diff Navigation**: Jump to previous/next difference quickly, filter by type (Added/Missing/Changed/Same)
- **Synchronized Scrolling**: Left and right panels scroll together for easy line-by-line comparison
- **Export Report**: Export comparison results in CSV/XLSX format

### User Experience

- **Drag & Drop Import**: Load files by dragging them directly onto the panel
- **Virtual Scrolling**: Smooth rendering for BOM data with tens of thousands of rows
- **Internationalization**: Chinese/English interface switching
- **Keyboard Shortcuts**: Ctrl+D to compare, F3/Shift+F3 to navigate differences, Ctrl+F to search
- **Column Resizing**: Drag to adjust column width, double-click to auto-fit content
- **Search & Locate**: Search by designator or keyword to quickly find target rows
- **Cell Copy**: Click cell to quickly copy content
- **Row Link Highlight**: Hover over a row to automatically highlight the corresponding designator row in the opposite panel

### Advanced Features

- **Duplicate Column Detection**: Automatically detect and warn about duplicate designators to avoid matching errors
- **Column Settings**: Customize which columns participate in comparison
- **Header Diff Comparison**: Specialized comparison of header differences between two files
- **Detail Popup**: Horizontal comparison layout showing detailed component change information
- **Real-time Editing**: Update comparison results in real-time after editing data
- **Recent Files**: Record recently opened file paths for quick reloading

## Layout

Side-by-side dual-panel layout with the old file on the left and the new file on the right:

- Top: File action bar (Import, Clear, Export)
- Middle: BOM data table (resizable columns, sorting, search)
- Bottom: Summary bar (statistics for Same/Changed/Added/Missing rows)

### Main Interface Screenshots

![Main Interface - Empty State](images/screenshot-main-empty.png)

## Diff Highlighting

| Color | Meaning |
|-------|---------|
| Blue/Cyan cell | Value differs between old and new files |
| Orange/Yellow row | Component exists only in the new file |
| Red/Pink row | Component exists in the old file but missing in the new |
| No highlight | Identical |

### Diff Display Screenshots

![Diff Highlight Example](images/screenshot-main-compare.png)


![Detail Popup](images/screenshot-detail-popup.png)

## Development

### Requirements

- Node.js >= 20.17.0

### Install Dependencies

```bash
npm install
```

### Common Commands

```bash
npm run compile    # Compile the project
npm run build      # Compile + package the extension
npm run lint       # Code linting
npm run fix        # Auto-fix code style
npm run test       # Run tests (watch mode)
npm run test:run   # Run tests (single run)
```

### Project Structure

```
├── src/                    # Extension entry
│   └── index.ts            # Register menu, open iframe window
├── iframe/                 # Main UI (iframe embedded page)
│   ├── index.html          # Page entry
│   ├── styles/             # Styles (CSS variables, themes, layout, tables)
│   │   ├── variables.css
│   │   ├── theme.css
│   │   ├── layout.css
│   │   └── table.css
│   └── src/
│       ├── main.ts         # Initialization entry
│       ├── types.ts        # Type definitions
│       ├── locales/        # i18n resources
│       │   ├── zh-Hans.ts
│       │   └── en.ts
│       ├── core/           # Core logic
│       │   ├── parser/     # File parsing (CSV, Excel)
│       │   ├── comparator.ts   # Comparison algorithm
│       │   ├── column-mapper.ts # Column mapping
│       │   ├── column-config.ts # Column configuration
│       │   └── exporter.ts     # Export
│       ├── ui/             # UI components
│       │   ├── table.ts        # Table component
│       │   ├── toolbar.ts      # Toolbar
│       │   ├── state.ts        # State management
│       │   ├── summary.ts      # Summary bar
│       │   ├── dialog.ts        # Dialog
│       │   ├── column-settings-dialog.ts # Column settings dialog
│       │   ├── sheet-selector.ts    # Sheet selector
│       │   ├── drop-zone.ts        # Drop zone
│       │   ├── editable.ts         # Editable cell
│       │   ├── loading.ts          # Loading state
│       │   ├── tooltip.ts         # Tooltip
│       │   ├── column-resize.ts    # Column resize
│       │   └── layout.ts          # Layout
│       └── utils/          # Utility functions
│           ├── i18n.ts      # Internationalization
│           ├── encoding.ts  # Encoding detection
│           ├── hotkeys.ts   # Keyboard shortcuts
│           └── storage.ts   # Local storage
├── tests/                  # Test cases and sample data
│   ├── comparator.test.ts
│   ├── csv-parser.test.ts
│   └── data/               # Test sample data
├── locales/                # Extension menu i18n
│   ├── zh-Hans.json
│   ├── en.json
│   └── extensionJson/      # Extension registration menu translation
│       ├── zh-Hans.json
│       └── en.json
├── docs/                   # Documentation
│   ├── prd.md              # Product requirements document
│   ├── features.md         # Feature requirements document
│   ├── dev-plan.md         # Development plan
│   └── easyeda-iframe-bug-workaround.md
├── config/                 # esbuild build config
│   ├── esbuild.common.ts
│   └── esbuild.prod.ts
├── build/                  # Packaging scripts
│   └── packaged.ts
├── images/                 # Image resources
│   └── logo.png
├── dist/                   # Build output (gitignore)
├── extension.json          # Extension config
├── package.json            # Project dependencies and scripts config
├── tsconfig.json           # TypeScript compilation config
├── vitest.config.ts        # Vitest testing config
└── eslint.config.mjs       # ESLint linting config
```

### Tech Stack

- TypeScript (strict mode)
- esbuild (build)
- Vitest (testing)
- xlsx / papaparse / jschardet (file parsing)
- @jlceda/pro-api-types (EDA extension API)

## Usage

### Quick Start

1. After installing the extension, click **BOM Compare** in the top menu of EasyEDA Pro's homepage, schematic editor, or PCB editor
2. Click the "Import" button on the left panel to select the old version BOM file
3. Click the "Import" button on the right panel to select the new version BOM file
4. Click the "Run BOM Compare" button, or use the shortcut Ctrl+D
5. View the comparison results and use the diff navigation buttons to quickly locate changes

### Detailed Usage Steps

#### Step 1: Load Files

- **Method 1**: Click the "Import" button to select a BOM file from the file selector
- **Method 2**: Drag and drop the file directly onto the corresponding panel area

Supported file formats:
- CSV (.csv)
- TXT (.txt)
- XLS (.xls)
- XLSX (.xlsx)


#### Step 2: Configure Column Mapping (if needed)

If file column names cannot be automatically matched, the system will display a column mapping configuration panel:
- Left side shows the source file column names
- Right side selects the corresponding standard column names
- You can choose "Ignore this column"
- Configuration is automatically saved and applied next time you load files of the same format


![Column Mapping Configuration](images/screenshot-column-mapping.png)

#### Step 3: Run Comparison

- Click the "Run BOM Compare" button, or use the shortcut Ctrl+D
- The system will compare based on Designator as the reference
- By default, all columns are compared, but you can customize this in column settings


#### Step 4: View Results

- The bottom summary bar displays statistics: Same, Changed, Added, Removed row counts
- Use the "Previous Difference" / "Next Difference" buttons to quickly jump
- Use the filter to view by type: All/Changed Only/Added Only/Removed Only/Same Only
- Click the "Detail" button at the end of the row to view horizontal comparison details


#### Step 5: Export Report

- Click the "Export" button to export the current BOM data
- Click "Export Report" to generate a report containing change summary and detailed differences


## FAQ

### Q: What file formats are supported?

A: CSV, TXT, XLS, XLSX formats are supported. The system automatically detects file encoding (UTF-8, GBK, GB2312).

### Q: How do I compare two BOM files with different column names?

A: The system automatically matches common Chinese/English column name variants. If automatic matching fails, you can manually specify the correspondence.

### Q: What is the comparison reference?

A: Designator is used as the comparison reference. The system matches rows on the left and right sides based on designator, then compares the values of other fields column by column.

### Q: How do I quickly locate differences?

A: Use the "Previous Difference" / "Next Difference" buttons, or use the shortcuts F3/Shift+F3. You can also use the filter to view by type.

### Q: What does the exported report contain?

A: The exported report contains three sheets: Change Summary, Difference Details, and Full Comparison.

## Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| Ctrl+D | Run BOM comparison |
| F3 | Next difference |
| Shift+F3 | Previous difference |
| Ctrl+F | Search |

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version update history.

