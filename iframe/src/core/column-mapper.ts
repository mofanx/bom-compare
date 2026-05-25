import type { ColumnMapping, BomRow, DuplicateColumn } from '../types';
import { getColumnAliases } from './column-config';

export function mapSingleColumn(header: string): ColumnMapping {
	const aliases = getColumnAliases();
	const normalized = header.toLowerCase().trim();
	for (const [field, fieldAliases] of Object.entries(aliases)) {
		if (fieldAliases.some(alias => normalized === alias)) {
			return { sourceColumn: header, targetField: field as keyof BomRow };
		}
	}
	return { sourceColumn: header, targetField: 'ignore' as const };
}

export function mapColumns(rawHeaders: string[]): ColumnMapping[] {
	const aliases = getColumnAliases();
	const mappedFields = new Set<keyof BomRow>();
	const duplicateColumns: DuplicateColumn[] = [];
	const fieldMap = new Map<keyof BomRow, string[]>(); // targetField -> sourceColumns

	const mappings = rawHeaders.map((header) => {
		const normalized = header.toLowerCase().trim();
		for (const [field, fieldAliases] of Object.entries(aliases)) {
			if (fieldAliases.some(alias => normalized === alias)) {
				const targetField = field as keyof BomRow;
				
				// Track all columns that map to this field
				if (!fieldMap.has(targetField)) {
					fieldMap.set(targetField, []);
				}
				fieldMap.get(targetField)!.push(header);

				// If this field was already mapped, mark as duplicate
				if (mappedFields.has(targetField)) {
					return { sourceColumn: header, targetField: 'ignore' as const };
				}
				
				mappedFields.add(targetField);
				return { sourceColumn: header, targetField };
			}
		}
		return { sourceColumn: header, targetField: 'ignore' as const };
	});

	// Build duplicate columns info
	for (const [targetField, sourceColumns] of fieldMap.entries()) {
		if (sourceColumns.length > 1) {
			// First column is kept, rest are duplicates
			const firstColumn = sourceColumns[0];
			const conflictColumns = sourceColumns.slice(1);
			duplicateColumns.push({
				sourceColumn: firstColumn,
				targetField,
				conflictWith: conflictColumns
			});
		}
	}

	// Store duplicate info in a global variable for later retrieval
	// (This is a simple approach; could be improved by returning a tuple)
	(mapColumns as any).duplicateColumns = duplicateColumns;

	return mappings;
}

export function getDuplicateColumns(): DuplicateColumn[] {
	return (mapColumns as any).duplicateColumns || [];
}
