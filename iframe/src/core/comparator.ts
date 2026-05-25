import type { BomFile, BomRow, DiffResult, RowDiff, CellDiff, DiffSummary } from '../types';
import { STANDARD_COLUMNS } from '../types';

const COMPARE_FIELDS: Array<keyof BomRow> = ['footprint', 'quantity', 'manufacturer', 'partNumber', 'value', 'description'];

export function compare(oldFile: BomFile, newFile: BomFile): DiffResult {
	// 获取用户手动调整后的映射字段
	const oldMappedFields = getMappedFields(oldFile.columnMappings);
	const newMappedFields = getMappedFields(newFile.columnMappings);

	// 使用交集字段进行对比
	const compareFields = Array.from(new Set([...oldMappedFields, ...newMappedFields])).filter(f => f !== 'designator');

	const oldMap = buildDesignatorMap(oldFile.rows);
	const newMap = buildDesignatorMap(newFile.rows);

	const rows: RowDiff[] = [];
	const processedNew = new Set<string>();

	for (const [designator, oldRows] of oldMap) {
		const newRows = newMap.get(designator);
		if (!newRows || newRows.length === 0) {
			for (const oldRow of oldRows) {
				rows.push({ type: 'removed', oldRow, newRow: null, cellDiffs: [] });
			}
		} else {
			const count = Math.max(oldRows.length, newRows.length);
			for (let i = 0; i < count; i++) {
				const oldRow = oldRows[i] || null;
				const newRow = newRows[i] || null;

				if (!oldRow) {
					rows.push({ type: 'added', oldRow: null, newRow, cellDiffs: [] });
				} else if (!newRow) {
					rows.push({ type: 'removed', oldRow, newRow: null, cellDiffs: [] });
				} else {
					const cellDiffs = compareRows(oldRow, newRow, compareFields);
					rows.push({
						type: cellDiffs.length > 0 ? 'changed' : 'same',
						oldRow,
						newRow,
						cellDiffs,
					});
				}
			}
			processedNew.add(designator);
		}
	}

	for (const [designator, newRows] of newMap) {
		if (!processedNew.has(designator)) {
			for (const newRow of newRows) {
				rows.push({ type: 'added', oldRow: null, newRow, cellDiffs: [] });
			}
		}
	}

	rows.sort(sortRows);

	const summary: DiffSummary = {
		total: rows.length,
		same: rows.filter(r => r.type === 'same').length,
		changed: rows.filter(r => r.type === 'changed').length,
		added: rows.filter(r => r.type === 'added').length,
		removed: rows.filter(r => r.type === 'removed').length,
	};

	return { rows, summary, comparedColumns: compareFields as string[] };
}

function buildDesignatorMap(rows: BomRow[]): Map<string, BomRow[]> {
	const map = new Map<string, BomRow[]>();
	for (const row of rows) {
		const key = row.designator.trim();
		if (!map.has(key)) {
			map.set(key, []);
		}
		map.get(key)!.push(row);
	}
	return map;
}

function compareRows(oldRow: BomRow, newRow: BomRow, compareFields: Array<keyof BomRow>): CellDiff[] {
	const diffs: CellDiff[] = [];
	for (const field of compareFields) {
		const oldVal = String(oldRow[field] || '').trim();
		const newVal = String(newRow[field] || '').trim();
		if (oldVal !== newVal) {
			diffs.push({ field: field as string, oldValue: oldVal, newValue: newVal });
		}
	}
	return diffs;
}

function getMappedFields(columnMappings: any[]): Array<keyof BomRow> {
	return columnMappings
		.filter(m => m.targetField !== 'ignore')
		.map(m => m.targetField as keyof BomRow);
}

function sortRows(a: RowDiff, b: RowDiff): number {
	const typeOrder: Record<string, number> = { same: 0, changed: 0, removed: 1, added: 2 };
	const orderA = typeOrder[a.type] ?? 3;
	const orderB = typeOrder[b.type] ?? 3;

	if (orderA !== orderB) return orderA - orderB;

	const desA = (a.oldRow || a.newRow)?.designator || '';
	const desB = (b.oldRow || b.newRow)?.designator || '';
	return naturalSort(desA, desB);
}

function naturalSort(a: string, b: string): number {
	const re = /(\d+)/g;
	const aParts = a.split(re);
	const bParts = b.split(re);

	for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
		const ap = aParts[i] || '';
		const bp = bParts[i] || '';
		const an = Number(ap);
		const bn = Number(bp);

		if (!isNaN(an) && !isNaN(bn)) {
			if (an !== bn) return an - bn;
		} else {
			const cmp = ap.localeCompare(bp);
			if (cmp !== 0) return cmp;
		}
	}
	return 0;
}
