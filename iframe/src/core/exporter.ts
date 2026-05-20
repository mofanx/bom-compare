import type { DiffResult, BomFile } from '../types';
import * as XLSX from 'xlsx';

export function exportReport(result: DiffResult): void {
	const wb = XLSX.utils.book_new();

	// Sheet 1: Summary
	const summaryData = [
		['BOM 对比报告'],
		[''],
		['统计项', '数量'],
		['总行数', result.summary.total],
		['完全相同', result.summary.same],
		['有差异', result.summary.changed],
		['新增', result.summary.added],
		['缺失', result.summary.removed],
		[''],
		['对比列', result.comparedColumns.join(', ')],
	];
	const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
	XLSX.utils.book_append_sheet(wb, summarySheet, '变更摘要');

	// Sheet 2: Detail
	const detailHeaders = ['差异类型', '位号', '字段', '旧值', '新值'];
	const detailData: (string | number)[][] = [detailHeaders];

	for (const row of result.rows) {
		if (row.type === 'same') continue;

		const designator = (row.oldRow || row.newRow)?.designator || '';

		if (row.type === 'added') {
			detailData.push(['新增', designator, '-', '-', '-']);
		} else if (row.type === 'removed') {
			detailData.push(['缺失', designator, '-', '-', '-']);
		} else if (row.type === 'changed') {
			for (const diff of row.cellDiffs) {
				detailData.push(['变更', designator, diff.field, diff.oldValue, diff.newValue]);
			}
		}
	}

	const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
	XLSX.utils.book_append_sheet(wb, detailSheet, '差异明细');

	const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
	const blob = new Blob([wbout], { type: 'application/octet-stream' });
	downloadBlob(blob, 'bom-compare-report.xlsx');
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
			// User cancelled or error occurred, fall back to traditional download
			if ((err as Error).name !== 'AbortError') {
				console.error('File picker failed, falling back to download:', err);
			}
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
