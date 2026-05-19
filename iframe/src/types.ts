export interface BomRow {
	rowIndex: number;
	designator: string;
	footprint: string;
	quantity: string;
	manufacturer: string;
	lcscPart: string;
	value: string;
	description: string;
	[key: string]: string | number;
}

export interface BomFile {
	fileName: string;
	rows: BomRow[];
	headers: string[];
	rawHeaders: string[];
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

export type FilterType = 'all' | 'diff' | 'added' | 'removed' | 'same';

export const STANDARD_COLUMNS: Array<{ field: keyof BomRow; label: string }> = [
	{ field: 'designator', label: '位号' },
	{ field: 'footprint', label: '封装' },
	{ field: 'quantity', label: '数量' },
	{ field: 'manufacturer', label: '制造商' },
	{ field: 'lcscPart', label: 'LCSC Part' },
	{ field: 'value', label: 'Value' },
	{ field: 'description', label: 'Description' },
];
