import type { ColumnMapping, BomRow } from '../types';

const COLUMN_ALIASES: Record<keyof Omit<BomRow, 'rowIndex'>, string[]> = {
	designator: ['designator', '位号', 'refdes', 'ref des', 'reference', 'ref', 'reference designator', 'id'],
	footprint: ['footprint', '封装', 'package', 'case', 'decal', 'pcb footprint', 'pcb package'],
	quantity: ['quantity', '数量', 'qty', 'count', 'amount'],
	manufacturer: ['manufacturer', '制造商', 'mfg', 'vendor', 'brand'],
	partNumber: ['partnumber', 'part number', '型号', 'pn', 'mpn', 'part no', 'lcsc part number', 'lcsc', 'supplier and ref', 'mfg part number', 'mfg part', 'part type'],
	value: ['value', '值', 'val', 'comment', 'designation', 'resistance', 'capacitance'],
	description: ['description', '描述', '说明', 'desc', 'note', 'libref']
};

export function mapSingleColumn(header: string): ColumnMapping {
	const normalized = header.toLowerCase().trim();
	for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
		if (aliases.some(alias => normalized === alias || normalized.includes(alias))) {
			return { sourceColumn: header, targetField: field as keyof BomRow };
		}
	}
	return { sourceColumn: header, targetField: 'ignore' as const };
}

export function mapColumns(rawHeaders: string[]): ColumnMapping[] {
	return rawHeaders.map((header) => {
		const normalized = header.toLowerCase().trim();
		for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
			if (aliases.some(alias => normalized === alias || normalized.includes(alias))) {
				return { sourceColumn: header, targetField: field as keyof BomRow };
			}
		}
		return { sourceColumn: header, targetField: 'ignore' as const };
	});
}
