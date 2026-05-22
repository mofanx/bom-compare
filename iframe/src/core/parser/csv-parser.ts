import type { BomFile, BomRow, ColumnMapping } from '../../types';
import { mapColumns, getDuplicateColumns } from '../column-mapper';
import { getColumnConfig } from '../column-config';

const SEPARATORS = ['\t', ',', ';', '|'];

function detectSeparator(text: string): string {
	const firstLine = text.split(/\r?\n/)[0] || '';
	let best = ',';
	let maxCount = 0;

	for (const sep of SEPARATORS) {
		const count = firstLine.split(sep).length - 1;
		if (count > maxCount) {
			maxCount = count;
			best = sep;
		}
	}
	return best;
}

function parseCSVLine(line: string, separator: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"' && line[i + 1] === '"') {
				current += '"';
				i++;
			} else if (ch === '"') {
				inQuotes = false;
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === separator) {
				fields.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}
	}
	fields.push(current.trim());
	return fields;
}

export function parseCSV(text: string, fileName: string): BomFile {
	const separator = detectSeparator(text);
	const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

	if (lines.length === 0) {
		return { fileName, rows: [], headers: [], rawHeaders: [], rawRows: [], columnMappings: [] };
	}

	const headerLineIndex = findHeaderLine(lines);
	const rawHeaders = parseCSVLine(lines[headerLineIndex], separator);
	const columnMappings = mapColumns(rawHeaders);
	const headers = columnMappings.map(m => String(m.targetField));
	const duplicateColumns = getDuplicateColumns();

	const rows: BomRow[] = [];
	const rawRows: string[][] = [];
	for (let i = headerLineIndex + 1; i < lines.length; i++) {
		const fields = parseCSVLine(lines[i], separator);
		if (fields.every(f => f === '')) continue;

		const row = createBomRow(fields, columnMappings, rows.length);
		if (row.designator) {
			rows.push(row);
			rawRows.push(fields);
		}
	}

	return { fileName, rows, headers, rawHeaders, rawRows, columnMappings, duplicateColumns };
}

function findHeaderLine(lines: string[]): number {
	const config = getColumnConfig();
	const designatorField = config.find(f => f.field === 'designator');
	const keywords = designatorField ? designatorField.aliases : ['designator', '位号', 'ref', 'reference'];
	for (let i = 0; i < Math.min(5, lines.length); i++) {
		const lower = lines[i].toLowerCase();
		if (keywords.some(kw => lower.includes(kw))) {
			return i;
		}
	}
	return 0;
}

function createBomRow(fields: string[], mappings: ColumnMapping[], rowIndex: number): BomRow {
	const config = getColumnConfig();
	const row: BomRow = { rowIndex } as BomRow;
	for (const f of config) {
		(row as any)[f.field] = '';
	}

	for (let i = 0; i < mappings.length && i < fields.length; i++) {
		const target = mappings[i].targetField;
		if (target !== 'ignore') {
			row[target] = fields[i];
		}
	}

	return row;
}
