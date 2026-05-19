import { describe, it, expect } from 'vitest';
import { parseCSV } from '../iframe/src/core/parser/csv-parser';

describe('CSV Parser', () => {
	it('should parse simple CSV with comma separator', () => {
		const csvText = 'Designator,Footprint,Quantity\nR1,0805,1\nR2,0805,2';
		const result = parseCSV(csvText, 'test.csv');
		
		expect(result.fileName).toBe('test.csv');
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0].designator).toBe('R1');
		expect(result.rows[0].footprint).toBe('0805');
		expect(result.rows[0].quantity).toBe('1');
	});

	it('should parse CSV with tab separator', () => {
		const csvText = 'Designator\tFootprint\tQuantity\nR1\t0805\t1\nR2\t0805\t2';
		const result = parseCSV(csvText, 'test.csv');
		
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0].designator).toBe('R1');
	});

	it('should handle quoted fields', () => {
		const csvText = 'Designator,Footprint\nR1,"0805, 0603"\nR2,0805';
		const result = parseCSV(csvText, 'test.csv');
		
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0].footprint).toBe('0805, 0603');
	});

	it('should detect header line with keywords', () => {
		const csvText = 'Some header\nDesignator,Footprint\nR1,0805\nR2,0805';
		const result = parseCSV(csvText, 'test.csv');
		
		expect(result.rows).toHaveLength(2);
	});

	it('should handle empty lines', () => {
		const csvText = 'Designator,Footprint\nR1,0805\n\nR2,0805';
		const result = parseCSV(csvText, 'test.csv');
		
		expect(result.rows).toHaveLength(2);
	});

	it('should map column names to standard fields', () => {
		const csvText = '位号,封装,数量\nR1,0805,1\nR2,0805,2';
		const result = parseCSV(csvText, 'test.csv');
		
		expect(result.rows[0].designator).toBe('R1');
		expect(result.rows[0].footprint).toBe('0805');
		expect(result.rows[0].quantity).toBe('1');
	});

	it('should return empty result for empty CSV', () => {
		const result = parseCSV('', 'test.csv');
		
		expect(result.rows).toHaveLength(0);
		expect(result.headers).toHaveLength(0);
	});
});
