import type { BomRow } from '../types';
import { state } from './state';
import { mapSingleColumn } from '../core/column-mapper';
import { renderTable } from './table';
import { renderDiffResult } from './table';
import { showToast } from './drop-zone';
import { t } from '../utils/i18n';

let editingCell: { td: HTMLTableCellElement; input: HTMLInputElement } | null = null;

export function commitEditing(): void {
	if (editingCell) stopEditing(true);
}

export function initEditableTable(table: HTMLTableElement): void {
	table.addEventListener('dblclick', handleCellDblClick);
	document.addEventListener('click', handleDocumentClick);
	document.addEventListener('keydown', handleKeyDown);
}

function handleCellDblClick(e: MouseEvent): void {
	const target = e.target as HTMLElement;
	const td = target.closest('td') as HTMLTableCellElement;

	if (!td || td.classList.contains('cell-no-edit') || td.querySelector('input')) return;

	startEditing(td);
}

function startEditing(td: HTMLTableCellElement): void {
	if (editingCell) stopEditing();

	const currentValue = td.textContent || '';
	const input = document.createElement('input');
	input.type = 'text';
	input.value = currentValue;
	input.style.width = '100%';
	input.style.height = '100%';
	input.style.border = 'none';
	input.style.background = 'transparent';
	input.style.color = 'inherit';
	input.style.fontSize = 'inherit';
	input.style.fontFamily = 'inherit';
	input.style.outline = 'none';
	input.style.padding = '0';
	input.style.margin = '0';

	td.innerHTML = '';
	td.appendChild(input);
	input.focus();
	input.select();

	editingCell = { td, input };
}

function stopEditing(save: boolean = true): void {
	if (!editingCell) return;

	const { td, input } = editingCell;

	if (save) {
		const newValue = input.value.trim();
		td.textContent = newValue;

		const tr = td.closest('tr') as HTMLTableRowElement;
		const table = td.closest('table') as HTMLTableElement;
		const container = table.parentElement;

		let side: 'old' | 'new' | null = null;
		if (container?.id === 'table-left') side = 'old';
		else if (container?.id === 'table-right') side = 'new';

		if (side) {
			const isHeaderRow = tr.dataset.rowType === 'header';
			const cellIndex = Array.from(tr.children).indexOf(td) - 1; // -1 for row number column
			const bomFile = side === 'old' ? state.oldFile : state.newFile;

			if (bomFile && cellIndex >= 0 && cellIndex < bomFile.columnMappings.length) {
				if (isHeaderRow) {
					// 原始表头行编辑：更新 rawHeaders + 触发列名重新匹配
					const oldValue = bomFile.rawHeaders[cellIndex];
					if (newValue !== oldValue) {
						const prevMapping = bomFile.columnMappings[cellIndex];
						bomFile.rawHeaders[cellIndex] = newValue;
						const newMapping = mapSingleColumn(newValue);
						bomFile.columnMappings[cellIndex] = newMapping;
						td.title = newValue;

						// 同步更新 rows 中对应字段（rawRows 保有原始数据）
						const prevField = String(prevMapping.targetField);
						const nextField = String(newMapping.targetField);
						if (nextField !== 'ignore') {
							for (let i = 0; i < bomFile.rows.length; i++) {
								(bomFile.rows[i] as any)[nextField] = bomFile.rawRows[i]?.[cellIndex] ?? '';
							}
						}
						if (prevField !== 'ignore' && prevField !== nextField) {
							const stillMapped = bomFile.columnMappings.some((m, idx) => idx !== cellIndex && String(m.targetField) === prevField);
							if (!stillMapped) {
								for (let i = 0; i < bomFile.rows.length; i++) {
									(bomFile.rows[i] as any)[prevField] = '';
								}
							}
						}

						if (side === 'old') state.oldFile = bomFile;
						else state.newFile = bomFile;

						if (state.diffResult) {
							document.dispatchEvent(new CustomEvent('bom:recompare'));
						} else {
							const tableId = side === 'old' ? 'table-left' : 'table-right';
							const container = document.getElementById(tableId)!;
							renderTable(container, bomFile, side);
						}
						showToast(t('mappingUpdated'), 'success');
					}
				} else {
					// 数据行编辑：更新 rows 和 rawRows
					const mapping = bomFile.columnMappings[cellIndex];

					// ignore 列不参与对比，仅更新 rawRows 显示，不写入 rows
					const rowIndex = parseInt(tr.dataset.rowIndex || '-1', 10);
					if (rowIndex >= 0) {
						if (rowIndex < bomFile.rawRows.length) {
							bomFile.rawRows[rowIndex][cellIndex] = newValue;
						}
						if (mapping.targetField !== 'ignore' && rowIndex < bomFile.rows.length) {
							const field = mapping.targetField as keyof BomRow;
							bomFile.rows[rowIndex][field] = newValue;

							if (state.diffResult) {
								document.dispatchEvent(new CustomEvent('bom:recompare'));
							}
						}
					}
				}
			}
		}
	} else {
		td.textContent = editingCell.input.value;
	}

	editingCell = null;
}


function handleDocumentClick(e: MouseEvent): void {
	if (!editingCell) return;

	const target = e.target as HTMLElement;
	if (target !== editingCell.input && !editingCell.input.contains(target)) {
		stopEditing(true);
	}
}

function handleKeyDown(e: KeyboardEvent): void {
	if (!editingCell) return;

	if (e.key === 'Enter') {
		e.preventDefault();
		stopEditing(true);
	} else if (e.key === 'Escape') {
		e.preventDefault();
		stopEditing(false);
	} else if (e.key === 'Tab') {
		e.preventDefault();
		stopEditing(true);

		const currentTd = editingCell.td;
		const tr = currentTd.closest('tr') as HTMLTableRowElement;
		const cells = Array.from(tr.querySelectorAll('td'));
		const currentIndex = cells.indexOf(currentTd);
		const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;

		if (nextIndex >= 0 && nextIndex < cells.length) {
			startEditing(cells[nextIndex] as HTMLTableCellElement);
		}
	}
}
