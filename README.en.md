# BOM Compare - BOM Comparison Tool

[中文](README.md) | English

An EasyEDA Pro extension for comparing differences between two BOM (Bill of Materials) files, presenting changes visually in a table format.

## Features

- **Multi-format Support**: Import CSV, TXT, XLS, XLSX formats
- **Smart Parsing**: Auto-detect file encoding (UTF-8, GBK, GB2312), header rows, and delimiters
- **Column Mapping**: Auto-match common Chinese/English column name variants with manual configuration support
- **Diff Comparison**: Compare column by column based on Designator, highlighting differences
- **Diff Navigation**: Jump to previous/next difference quickly, filter by type (Added/Missing/Changed/Same)
- **Synchronized Scrolling**: Left and right panels scroll together for easy line-by-line comparison
- **Export Report**: Export comparison results in CSV/XLSX format
- **Drag & Drop Import**: Load files by dragging them directly onto the panel
- **Virtual Scrolling**: Smooth rendering for BOM data with tens of thousands of rows
- **Internationalization**: Chinese/English interface switching
- **Keyboard Shortcuts**: Ctrl+D to compare, F3/Shift+F3 to navigate differences, Ctrl+F to search

## Layout

Side-by-side dual-panel layout with the old file on the left and the new file on the right:

- Top: File action bar (Browse, Clear, Save As)
- Middle: BOM data table (resizable columns, sorting, search)
- Bottom: Summary bar (statistics for Same/Changed/Added/Missing rows)

## Diff Highlighting

| Color | Meaning |
|-------|---------|
| Blue/Cyan cell | Value differs between old and new files |
| Orange/Yellow row | Component exists only in the new file |
| Red/Pink row | Component exists in the old file but missing in the new |
| No highlight | Identical |

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
│   └── src/
│       ├── main.ts         # Initialization entry
│       ├── types.ts        # Type definitions
│       ├── locales/        # i18n resources
│       ├── core/           # Core logic
│       │   ├── parser/     # File parsing (CSV, Excel)
│       │   ├── comparator.ts   # Comparison algorithm
│       │   ├── column-mapper.ts # Column mapping
│       │   └── exporter.ts     # Export
│       ├── ui/             # UI components
│       └── utils/          # Utility functions
├── tests/                  # Test cases and sample data
├── config/                 # esbuild build config
├── build/                  # Packaging scripts
└── extension.json          # Extension config
```

### Tech Stack

- TypeScript (strict mode)
- esbuild (build)
- Vitest (testing)
- xlsx / papaparse / jschardet (file parsing)
- @jlceda/pro-api-types (EDA extension API)

## Usage

After installing the extension, click **BOM Compare** in the top menu of EasyEDA Pro's homepage, schematic editor, or PCB editor.

## License

[Apache-2.0](LICENSE)
