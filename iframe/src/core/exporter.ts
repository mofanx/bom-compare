import type { DiffResult, BomFile } from '../types';
import * as XLSX from 'xlsx';
import { t } from '../utils/i18n';
import { getActiveColumns } from './column-config';
import { state } from '../ui/state';

export async function exportReport(result: DiffResult): Promise<void> {
	const wb = XLSX.utils.book_new();

	// Sheet 1: Summary
	const summaryData = [
		[t('bomCompareReport')],
		[''],
		[t('statisticItem'), t('count')],
		[t('totalRows'), result.summary.total],
		[t('identical'), result.summary.same],
		[t('differences'), result.summary.changed],
		[t('addedRows'), result.summary.added],
		[t('removedRows'), result.summary.removed],
		[''],
	];

	// Add header differences if files are loaded
	if (state.oldFile && state.newFile) {
		const activeColumns = getActiveColumns();
		const headerRow = ['', ...activeColumns.map(col => t(col.field))];
		const oldHeaderRow = [t('oldFileHeader')];
		const newHeaderRow = [t('newFileHeader')];

		for (const col of activeColumns) {
			const field = col.field;
			// Get the original header from the file based on column mapping
			const oldMapping = state.oldFile.columnMappings.find(m => m.targetField === field);
			const newMapping = state.newFile.columnMappings.find(m => m.targetField === field);

			const oldHeader = oldMapping ? oldMapping.sourceColumn : '-';
			const newHeader = newMapping ? newMapping.sourceColumn : '-';

			oldHeaderRow.push(oldHeader);
			newHeaderRow.push(newHeader);
		}

		summaryData.push([t('compareHeaderDiff')]);
		summaryData.push(headerRow);
		summaryData.push(oldHeaderRow);
		summaryData.push(newHeaderRow);
		summaryData.push(['']);
	}

	summaryData.push([t('comparedColumns'), result.comparedColumns.join(', ')]);
	const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
	XLSX.utils.book_append_sheet(wb, summarySheet, t('summarySheet'));

	// Sheet 2: Detail
	const detailHeaders = [t('diffType'), t('designator'), t('field'), t('oldValue'), t('newValue')];
	const detailData: (string | number)[][] = [detailHeaders];

	for (const row of result.rows) {
		if (row.type === 'same') continue;

		const designator = (row.oldRow || row.newRow)?.designator || '';

		if (row.type === 'added') {
			detailData.push([t('new'), designator, '-', '-', '-']);
		} else if (row.type === 'removed') {
			detailData.push([t('missing'), designator, '-', '-', '-']);
		} else if (row.type === 'changed') {
			for (const diff of row.cellDiffs) {
				detailData.push([t('change'), designator, diff.field, diff.oldValue, diff.newValue]);
			}
		}
	}

	const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
	XLSX.utils.book_append_sheet(wb, detailSheet, t('detailSheet'));

	// Sheet 3: Full Comparison
	const activeColumns = getActiveColumns();
	const fullCompareHeaders = [t('diffType'), t('designator'), t('rowNumber'), ...activeColumns.map(col => t(col.field))];
	const fullCompareData: (string | number)[][] = [fullCompareHeaders];

	for (const row of result.rows) {
		if (row.type === 'same') continue;

		const designator = (row.oldRow || row.newRow)?.designator || '';
		const diffTypeLabel = row.type === 'added' ? t('new') : row.type === 'removed' ? t('missing') : t('change');

		// Format row number: "Old 6 / New 7" or "New 8" or "Old 5"
		let rowNumber = '';
		if (row.type === 'added') {
			const rowNum = row.newRow ? row.newRow.rowIndex + 2 : '?';
			rowNumber = `${t('newFile')} ${rowNum}`;
		} else if (row.type === 'removed') {
			const rowNum = row.oldRow ? row.oldRow.rowIndex + 2 : '?';
			rowNumber = `${t('oldFile')} ${rowNum}`;
		} else {
			const oldNum = row.oldRow ? row.oldRow.rowIndex + 2 : '?';
			const newNum = row.newRow ? row.newRow.rowIndex + 2 : '?';
			rowNumber = `${t('oldFile')} ${oldNum} / ${t('newFile')} ${newNum}`;
		}

		const rowData: (string | number)[] = [diffTypeLabel, designator, rowNumber];

		for (const col of activeColumns) {
			const field = col.field;
			const oldVal = row.oldRow ? String(row.oldRow[field] || '') : '';
			const newVal = row.newRow ? String(row.newRow[field] || '') : '';

			if (row.type === 'added') {
				rowData.push(newVal || '-');
			} else if (row.type === 'removed') {
				rowData.push(oldVal || '-');
			} else {
				// For changed rows, show old -> new if different
				if (oldVal !== newVal) {
					rowData.push(`${oldVal} → ${newVal}`);
				} else {
					rowData.push(oldVal || '-');
				}
			}
		}

		fullCompareData.push(rowData);
	}

	const fullCompareSheet = XLSX.utils.aoa_to_sheet(fullCompareData);
	XLSX.utils.book_append_sheet(wb, fullCompareSheet, t('fullCompareSheet'));

	const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
	const blob = new Blob([wbout], { type: 'application/octet-stream' });
	await downloadBlobWithPicker(blob, 'bom-compare-report.xlsx');
}

export function exportCSV(rows: Record<string, string>[], fileName: string): void {
	const headers = Object.keys(rows[0] || {});
	const lines = [headers.join(',')];

	for (const row of rows) {
		const values = headers.map(h => {
			const val = row[h] || '';
			return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
		});
		lines.push(values.join(','));
	}

	const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
	downloadBlob(blob, fileName);
}

function downloadBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

async function downloadBlobWithPicker(blob: Blob, fileName: string): Promise<void> {
	// Try to use File System Access API if available
	if ('showSaveFilePicker' in window) {
		try {
			const fileHandle = await (window as any).showSaveFilePicker({
				suggestedName: fileName,
				types: [{
					description: 'Excel file',
					accept: {
						'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
					},
				}],
			});
			const writable = await fileHandle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (err) {
			if ((err as Error).name === 'AbortError') {
				throw err;
			}
			console.error('File picker failed, falling back to download:', err);
		}
	}

	// Fall back to traditional download
	downloadBlob(blob, fileName);
}

export async function exportBomFile(bomFile: BomFile, fileName: string): Promise<void> {
	const wb = XLSX.utils.book_new();

	// Use rawHeaders and rawRows to export original data with modifications
	const data: string[][] = [];

	// Add headers
	if (bomFile.rawHeaders) {
		data.push([...bomFile.rawHeaders]);
	}

	// Add rows
	if (bomFile.rawRows) {
		for (const row of bomFile.rawRows) {
			data.push([...row]);
		}
	}

	const sheet = XLSX.utils.aoa_to_sheet(data);
	XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');

	const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
	const blob = new Blob([wbout], { type: 'application/octet-stream' });
	await downloadBlobWithPicker(blob, fileName);
}
