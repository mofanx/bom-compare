import type { BomFile, BomRow, ColumnMapping } from '../../types';
import { mapColumns, getDuplicateColumns } from '../column-mapper';
import { getColumnConfig } from '../column-config';
import * as XLSX from 'xlsx';

export function parseExcel(data: ArrayBuffer, fileName: string, sheetName?: string): BomFile {
	const workbook = XLSX.read(data, { type: 'array' });
	const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];

	if (!sheet) {
		return { fileName, rows: [], headers: [], rawHeaders: [], rawRows: [], columnMappings: [] };
	}

	const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
	const lines = jsonData.filter(row => row.some(cell => String(cell).trim() !== ''));

	if (lines.length === 0) {
		return { fileName, rows: [], headers: [], rawHeaders: [], rawRows: [], columnMappings: [] };
	}

	const headerLineIndex = findHeaderLine(lines);
	const rawHeaders = lines[headerLineIndex].map(h => String(h).trim());
	const columnMappings = mapColumns(rawHeaders);
	const headers = columnMappings.map(m => String(m.targetField));
	const duplicateColumns = getDuplicateColumns();

	const rows: BomRow[] = [];
	const rawRows: string[][] = [];
	for (let i = headerLineIndex + 1; i < lines.length; i++) {
		const fields = lines[i].map(cell => String(cell).trim());
		const row = createBomRow(fields, columnMappings, rows.length);
		if (row.designator) {
			rows.push(row);
			rawRows.push(fields);
		}
	}

	return { fileName, rows, headers, rawHeaders, rawRows, columnMappings, duplicateColumns };
}

export function getSheetNames(data: ArrayBuffer): string[] {
	const workbook = XLSX.read(data, { type: 'array' });
	return workbook.SheetNames;
}

function findHeaderLine(lines: string[][]): number {
	const config = getColumnConfig();
	const designatorField = config.find(f => f.field === 'designator');
	const keywords = designatorField ? designatorField.aliases : ['designator', '位号', 'ref', 'reference'];
	for (let i = 0; i < Math.min(5, lines.length); i++) {
		const lower = lines[i].map(c => String(c).toLowerCase()).join(' ');
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
