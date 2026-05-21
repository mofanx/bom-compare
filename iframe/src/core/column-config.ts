import type { FieldConfig } from '../types';
import { saveToStorage, loadFromStorage } from '../utils/storage';

const STORAGE_KEY = 'column-config';

const DEFAULT_FIELDS: FieldConfig[] = [
	{
		field: 'designator',
		label: 'Designator',
		labelZh: '位号',
		aliases: ['designator', '位号', 'refdes', 'ref des', 'reference', 'ref', 'reference designator', 'id'],
		isRequired: true,
	},
	{
		field: 'footprint',
		label: 'Footprint',
		labelZh: '封装',
		aliases: ['footprint', '封装', 'package', 'case', 'decal', 'pcb footprint', 'pcb package'],
		isRequired: false,
	},
	{
		field: 'quantity',
		label: 'Quantity',
		labelZh: '数量',
		aliases: ['quantity', '数量', 'qty', 'count', 'amount'],
		isRequired: false,
	},
	{
		field: 'manufacturer',
		label: 'Manufacturer',
		labelZh: '制造商',
		aliases: ['manufacturer', '制造商', 'mfg', 'vendor', 'brand'],
		isRequired: false,
	},
	{
		field: 'partNumber',
		label: 'Part Number',
		labelZh: '型号',
		aliases: ['partnumber', 'part number', '型号', 'pn', 'mpn', 'part no', 'lcsc part number', 'lcsc', 'supplier and ref', 'mfg part number', 'mfg part', 'part type'],
		isRequired: false,
	},
	{
		field: 'value',
		label: 'Value',
		labelZh: '值',
		aliases: ['value', '值', 'val', 'comment', 'designation', 'resistance', 'capacitance'],
		isRequired: false,
	},
	{
		field: 'description',
		label: 'Description',
		labelZh: '描述',
		aliases: ['description', '描述', '说明', 'desc', 'note', 'libref'],
		isRequired: false,
	},
];

export function getDefaultFields(): FieldConfig[] {
	return JSON.parse(JSON.stringify(DEFAULT_FIELDS));
}

export function getColumnConfig(): FieldConfig[] {
	return loadFromStorage<FieldConfig[]>(STORAGE_KEY, getDefaultFields());
}

export function saveColumnConfig(config: FieldConfig[]): void {
	saveToStorage(STORAGE_KEY, config);
}

export function resetColumnConfig(): FieldConfig[] {
	const defaults = getDefaultFields();
	saveColumnConfig(defaults);
	return defaults;
}

export function getActiveColumns(): Array<{ field: string; label: string; labelZh: string }> {
	return getColumnConfig().map(f => ({ field: f.field, label: f.label, labelZh: f.labelZh }));
}

export function getColumnAliases(): Record<string, string[]> {
	const config = getColumnConfig();
	const result: Record<string, string[]> = {};
	for (const f of config) {
		result[f.field] = f.aliases;
	}
	return result;
}
