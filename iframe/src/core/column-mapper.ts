import type { ColumnMapping, BomRow } from '../types';

const COLUMN_ALIASES: Record<keyof Omit<BomRow, 'rowIndex'>, string[]> = {
	designator: ['designator', '位号', 'ref', 'reference', 'refdes', 'ref des'],
	footprint: ['footprint', '封装', 'package', 'pkg'],
	quantity: ['quantity', '数量', 'qty', 'count'],
	manufacturer: ['manufacturer', '制造商', 'mfr', 'mfg', 'brand'],
	lcscPart: ['lcsc part', 'lcsc', '立创商城编号', 'lcsc part number', 'jlc part', 'jlcpcb part'],
	value: ['value', '值', 'val', '参数'],
	description: ['description', '描述', 'desc', '说明', 'comment'],
};

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
