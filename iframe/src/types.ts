export interface BomRow {
	rowIndex: number;
	designator: string;
	footprint: string;
	quantity: string;
	manufacturer: string;
	partNumber: string;
	value: string;
	description: string;
	[key: string]: string | number;
}

export interface BomFile {
	fileName: string;
	rows: BomRow[];
	headers: string[];
	rawHeaders: string[];
	rawRows: string[][];
	columnMappings: ColumnMapping[];
	duplicateColumns?: DuplicateColumn[];
}

export type DiffType = 'same' | 'changed' | 'added' | 'removed';

export interface CellDiff {
	field: string;
	oldValue: string;
	newValue: string;
}

export interface RowDiff {
	type: DiffType;
	oldRow: BomRow | null;
	newRow: BomRow | null;
	cellDiffs: CellDiff[];
}

export interface DiffResult {
	rows: RowDiff[];
	summary: DiffSummary;
	comparedColumns: string[];
}

export interface DiffSummary {
	total: number;
	same: number;
	changed: number;
	added: number;
	removed: number;
}

export interface ColumnMapping {
	sourceColumn: string;
	targetField: keyof BomRow | 'ignore';
}

export interface DuplicateColumn {
	sourceColumn: string;
	targetField: keyof BomRow;
	conflictWith: string[];
}

export type FilterType = 'all' | 'diff' | 'added' | 'removed' | 'same';

export interface FieldConfig {
	field: string;
	label: string;
	labelZh: string;
	aliases: string[];
	isRequired: boolean;
}

/** Fallback constant — use getActiveColumns() from column-config for dynamic config */
export const STANDARD_COLUMNS: Array<{ field: keyof BomRow; label: string; labelZh: string }> = [
	{ field: 'designator', label: 'Designator', labelZh: '位号' },
	{ field: 'footprint', label: 'Footprint', labelZh: '封装' },
	{ field: 'quantity', label: 'Quantity', labelZh: '数量' },
	{ field: 'manufacturer', label: 'Manufacturer', labelZh: '制造商' },
	{ field: 'partNumber', label: 'Part Number', labelZh: '型号' },
	{ field: 'value', label: 'Value', labelZh: '值' },
	{ field: 'description', label: 'Description', labelZh: '描述' },
];

export function getColumnLetter(index: number): string {
	let letter = '';
	let num = index;
	while (num >= 0) {
		letter = String.fromCharCode((num % 26) + 65) + letter;
		num = Math.floor(num / 26) - 1;
	}
	return letter;
}
