import { describe, it, expect } from 'vitest';
import { compare } from '../iframe/src/core/comparator';
import type { BomFile, BomRow } from '../iframe/src/types';

describe('Comparator', () => {
	function createBomFile(rows: BomRow[], fileName: string = 'test.csv'): BomFile {
		return {
			fileName,
			rows,
			headers: ['designator', 'footprint', 'quantity', 'manufacturer', 'lcscPart', 'value', 'description'],
			rawHeaders: ['Designator', 'Footprint', 'Quantity', 'Manufacturer', 'LCSC Part', 'Value', 'Description'],
			rawRows: [],
			columnMappings: [
				{ sourceColumn: 'Designator', targetField: 'designator' },
				{ sourceColumn: 'Footprint', targetField: 'footprint' },
				{ sourceColumn: 'Quantity', targetField: 'quantity' },
				{ sourceColumn: 'Manufacturer', targetField: 'manufacturer' },
				{ sourceColumn: 'LCSC Part', targetField: 'partNumber' },
				{ sourceColumn: 'Value', targetField: 'value' },
				{ sourceColumn: 'Description', targetField: 'description' },
			],
		};
	}

	it('should detect added components', () => {
		const oldFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const newFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
			{ rowIndex: 2, designator: 'R2', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const result = compare(oldFile, newFile);
		
		expect(result.summary.added).toBe(1);
		expect(result.summary.removed).toBe(0);
		expect(result.summary.changed).toBe(0);
		expect(result.rows[1].type).toBe('added');
		expect(result.rows[1].newRow?.designator).toBe('R2');
	});

	it('should detect removed components', () => {
		const oldFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
			{ rowIndex: 2, designator: 'R2', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const newFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const result = compare(oldFile, newFile);
		
		expect(result.summary.added).toBe(0);
		expect(result.summary.removed).toBe(1);
		expect(result.summary.changed).toBe(0);
		expect(result.rows[1].type).toBe('removed');
		expect(result.rows[1].oldRow?.designator).toBe('R2');
	});

	it('should detect changed components', () => {
		const oldFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const newFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0603', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const result = compare(oldFile, newFile);
		
		expect(result.summary.added).toBe(0);
		expect(result.summary.removed).toBe(0);
		expect(result.summary.changed).toBe(1);
		expect(result.rows[0].type).toBe('changed');
		expect(result.rows[0].cellDiffs).toHaveLength(1);
		expect(result.rows[0].cellDiffs[0].field).toBe('footprint');
	});

	it('should detect same components', () => {
		const oldFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const newFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const result = compare(oldFile, newFile);
		
		expect(result.summary.same).toBe(1);
		expect(result.summary.changed).toBe(0);
		expect(result.rows[0].type).toBe('same');
	});

	it('should handle duplicate designators', () => {
		const oldFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
			{ rowIndex: 2, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const newFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
			{ rowIndex: 2, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const result = compare(oldFile, newFile);
		
		expect(result.summary.total).toBe(2);
		expect(result.summary.same).toBe(2);
	});

	it('should sort results by type and designator', () => {
		const oldFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const newFile = createBomFile([
			{ rowIndex: 1, designator: 'R1', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
			{ rowIndex: 2, designator: 'R10', footprint: '0805', quantity: '1', manufacturer: '', lcscPart: '', value: '', description: '' },
		]);

		const result = compare(oldFile, newFile);
		
		// Same should come before added
		expect(result.rows[0].type).toBe('same');
		expect(result.rows[1].type).toBe('added');
	});
});
