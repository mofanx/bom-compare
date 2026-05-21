import type { ColumnMapping, BomRow } from '../types';
import { getColumnAliases } from './column-config';

export function mapSingleColumn(header: string): ColumnMapping {
	const aliases = getColumnAliases();
	const normalized = header.toLowerCase().trim();
	for (const [field, fieldAliases] of Object.entries(aliases)) {
		if (fieldAliases.some(alias => normalized === alias || normalized.includes(alias))) {
			return { sourceColumn: header, targetField: field as keyof BomRow };
		}
	}
	return { sourceColumn: header, targetField: 'ignore' as const };
}

export function mapColumns(rawHeaders: string[]): ColumnMapping[] {
	const aliases = getColumnAliases();
	return rawHeaders.map((header) => {
		const normalized = header.toLowerCase().trim();
		for (const [field, fieldAliases] of Object.entries(aliases)) {
			if (fieldAliases.some(alias => normalized === alias || normalized.includes(alias))) {
				return { sourceColumn: header, targetField: field as keyof BomRow };
			}
		}
		return { sourceColumn: header, targetField: 'ignore' as const };
	});
}
