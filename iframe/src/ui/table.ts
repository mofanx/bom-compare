import type { BomFile, BomRow, RowDiff } from '../types';
import { STANDARD_COLUMNS, getColumnLetter } from '../types';
import { state } from './state';
import { initSyncScroll } from './layout';
import { showRowDetailDialog } from './dialog';
import { addResizeHandles, initColumnResize } from './column-resize';
import { addTooltipSupport } from './tooltip';
import { initEditableTable } from './editable';
import { showToast } from './drop-zone';
import { getLanguage } from '../utils/i18n';

export function renderTable(container: HTMLElement, bomFile: BomFile, side: 'old' | 'new'): void {
	const table = document.createElement('table');
	table.className = 'bom-table';

	const thead = document.createElement('thead');
	const lang = getLanguage();

	// 第一层表头：预设表头（显示列序号或映射的预设列名）
	const presetHeaderRow = document.createElement('tr');
	presetHeaderRow.className = 'preset-header-row';

	const presetNumTh = document.createElement('th');
	presetNumTh.textContent = '#';
	presetNumTh.style.width = '40px';
	presetHeaderRow.appendChild(presetNumTh);

	for (let i = 0; i < bomFile.rawHeaders.length; i++) {
		const mapping = bomFile.columnMappings[i];
		const presetTh = document.createElement('th');
		presetTh.className = 'preset-header';
		presetTh.style.width = '80px';
		presetTh.style.minWidth = '80px';

		if (mapping.targetField === 'ignore') {
			// 未匹配，显示列字母和下拉选择框
			presetTh.textContent = getColumnLetter(i);
			presetTh.classList.add('unmapped');
			presetTh.style.background = 'var(--bg-hover)';
			presetTh.style.color = 'var(--text-muted)';

			const select = document.createElement('select');
			select.className = 'column-mapping-select';
			select.style.width = '100%';
			select.style.height = '100%';
			select.style.border = 'none';
			select.style.background = 'transparent';
			select.style.color = 'inherit';
			select.style.cursor = 'pointer';

			STANDARD_COLUMNS.forEach(col => {
				const option = document.createElement('option');
				option.value = String(col.field);
				option.textContent = lang === 'zh-Hans' ? col.labelZh : col.label;
				select.appendChild(option);
			});

			const ignoreOption = document.createElement('option');
			ignoreOption.value = 'ignore';
			ignoreOption.textContent = '忽略';
			select.appendChild(ignoreOption);

			select.value = 'ignore';

			select.addEventListener('change', (e) => {
				const selectedField = (e.target as HTMLSelectElement).value;
				updateColumnMapping(i, selectedField, bomFile, side);
			});

			presetTh.appendChild(select);
		} else {
			// 已匹配，显示预设列名
			const standardCol = STANDARD_COLUMNS.find(col => col.field === mapping.targetField);
			presetTh.textContent = standardCol ? (lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label) : String(mapping.targetField);
			presetTh.classList.add('mapped');
			presetTh.dataset.columnIndex = String(i);
			presetTh.dataset.side = side;
			presetTh.dataset.targetField = String(mapping.targetField);
		}

		presetHeaderRow.appendChild(presetTh);
	}

	thead.appendChild(presetHeaderRow);

	// 第二层表头：原始表头
	const rawHeaderRow = document.createElement('tr');
	rawHeaderRow.className = 'raw-header-row';

	const rawNumTh = document.createElement('th');
	rawNumTh.textContent = '#';
	rawNumTh.style.width = '40px';
	rawHeaderRow.appendChild(rawNumTh);

	for (const rawHeader of bomFile.rawHeaders) {
		const rawTh = document.createElement('th');
		rawTh.textContent = rawHeader;
		rawTh.className = 'raw-header';
		rawHeaderRow.appendChild(rawTh);
	}

	thead.appendChild(rawHeaderRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	for (let i = 0; i < bomFile.rows.length; i++) {
		const row = bomFile.rows[i];
		const rawValues = bomFile.rawRows[i] || [];
		const tr = createDataRow(row, bomFile.columnMappings, rawValues);
		tbody.appendChild(tr);
	}
	table.appendChild(tbody);

	container.innerHTML = '';
	container.appendChild(table);
	addResizeHandles(table);
	initEditableTable(table);
}

function updateColumnMapping(columnIndex: number, targetField: keyof BomRow, bomFile: BomFile, side: 'old' | 'new'): void {
	bomFile.columnMappings[columnIndex].targetField = targetField;

	// 更新状态
	if (side === 'old') {
		state.oldFile = bomFile;
	} else {
		state.newFile = bomFile;
	}

	// 如果在diff结果视图中，重新执行对比
	if (state.diffResult) {
		const { compare } = require('../core/comparator');
		const result = compare(state.oldFile, state.newFile);
		state.diffResult = result;
		renderDiffResult();
		showToast('列映射已更新，对比结果已刷新', 'success');
	} else {
		// 重新渲染预览表格
		const tableId = side === 'old' ? 'table-left' : 'table-right';
		const container = document.getElementById(tableId)!;
		renderTable(container, bomFile, side);
		showToast('列映射已更新', 'success');
	}
}

function showMappingDropdown(th: HTMLTableCellElement, columnIndex: number, currentField: string, bomFile: BomFile, side: 'old' | 'new'): void {
	const lang = getLanguage();
	const select = document.createElement('select');
	select.className = 'column-mapping-select';
	select.style.width = '100%';
	select.style.height = '100%';
	select.style.border = 'none';
	select.style.background = 'transparent';
	select.style.color = 'inherit';
	select.style.cursor = 'pointer';

	// Get already matched fields (excluding current column)
	const matchedFields = new Set<keyof BomRow>();
	bomFile.columnMappings.forEach((mapping, idx) => {
		if (idx !== columnIndex && mapping.targetField !== 'ignore') {
			matchedFields.add(mapping.targetField);
		}
	});

	// Add available standard columns (not already matched)
	STANDARD_COLUMNS.forEach(col => {
		// Skip if already matched by another column
		if (matchedFields.has(col.field)) return;

		const option = document.createElement('option');
		option.value = String(col.field);
		option.textContent = lang === 'zh-Hans' ? col.labelZh : col.label;
		select.appendChild(option);
	});

	// Add column letter option (represents ignore)
	const columnLetter = getColumnLetter(columnIndex);
	const columnLetterOption = document.createElement('option');
	columnLetterOption.value = 'ignore';
	columnLetterOption.textContent = columnLetter; // Show A, B, C, etc.
	select.appendChild(columnLetterOption);

	// Set current value
	if (currentField === 'ignore') {
		select.value = 'ignore';
	} else {
		// If current field is already matched by another column, it won't be in the dropdown
		// In that case, we need to add it back as an option
		if (!matchedFields.has(currentField as keyof BomRow)) {
			select.value = currentField;
		} else {
			// Current field is matched by another column, default to ignore
			select.value = 'ignore';
		}
	}

	select.addEventListener('change', (e) => {
		const selectedField = (e.target as HTMLSelectElement).value;
		updateColumnMapping(columnIndex, selectedField as keyof BomRow, bomFile, side);
	});

	select.addEventListener('blur', () => {
		// Remove select when focus is lost
		if (th.contains(select)) {
			th.removeChild(select);
			// Restore original text based on current mapping
			const mapping = bomFile.columnMappings[columnIndex];
			if (mapping.targetField === 'ignore') {
				th.textContent = getColumnLetter(columnIndex);
				th.classList.add('unmapped');
				th.style.background = 'var(--bg-hover)';
				th.style.color = 'var(--text-muted)';
				th.classList.remove('mapped');
				delete th.dataset.field;
			} else {
				const standardCol = STANDARD_COLUMNS.find(col => col.field === mapping.targetField);
				th.textContent = standardCol ? (lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label) : String(mapping.targetField);
				th.classList.remove('unmapped');
				th.classList.add('mapped');
				th.style.background = '';
				th.style.color = '';
				th.dataset.field = String(mapping.targetField);
			}
		}
	});

	// Clear th content and add select
	th.textContent = '';
	th.appendChild(select);
	select.focus();
}

export function renderDiffResult(): void {
	if (!state.diffResult) return;

	const leftContainer = document.getElementById('table-left')!;
	const rightContainer = document.getElementById('table-right')!;

	leftContainer.style.display = 'block';
	rightContainer.style.display = 'block';
	(document.getElementById('drop-zone-left')! as HTMLElement).style.display = 'none';
	(document.getElementById('drop-zone-right')! as HTMLElement).style.display = 'none';
	(document.querySelector('#panel-left .panel-label')! as HTMLElement).style.display = 'none';
	(document.querySelector('#panel-right .panel-label')! as HTMLElement).style.display = 'none';

	const filteredRows = filterRows(state.diffResult.rows);

	renderDiffTable(leftContainer, filteredRows, 'old');
	renderDiffTable(rightContainer, filteredRows, 'new');

	initSyncScroll();
}

function renderDiffTable(container: HTMLElement, rows: RowDiff[], side: 'old' | 'new'): void {
	const table = document.createElement('table');
	table.className = 'bom-table';

	const bomFile = side === 'old' ? state.oldFile : state.newFile;
	const thead = document.createElement('thead');

	// 第一层表头：预设表头
	const presetHeaderRow = document.createElement('tr');
	presetHeaderRow.className = 'preset-header-row';

	const presetNumTh = document.createElement('th');
	presetNumTh.textContent = '#';
	presetNumTh.style.width = '40px';
	presetHeaderRow.appendChild(presetNumTh);

	if (bomFile && bomFile.columnMappings) {
		const lang = getLanguage();
		for (let i = 0; i < bomFile.columnMappings.length; i++) {
			const mapping = bomFile.columnMappings[i];
			const th = document.createElement('th');
			th.className = 'preset-header';
			th.style.width = '80px';
			th.style.minWidth = '80px';

			if (mapping.targetField === 'ignore') {
				th.textContent = getColumnLetter(i);
				th.classList.add('unmapped');
				th.style.background = 'var(--bg-hover)';
				th.style.color = 'var(--text-muted)';

				// 未匹配列也支持双击修改映射
				th.addEventListener('dblclick', () => showMappingDropdown(th, i, String(mapping.targetField), bomFile, side));
			} else {
				const standardCol = STANDARD_COLUMNS.find(col => col.field === mapping.targetField);
				th.textContent = standardCol ? (lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label) : String(mapping.targetField);
				th.classList.add('mapped');
				th.dataset.field = String(mapping.targetField);
				th.style.cursor = 'pointer';
				th.title = '单击排序，双击修改映射';
				th.addEventListener('click', () => handleColumnSort(String(mapping.targetField)));

				// 双击显示下拉框修改映射
				th.addEventListener('dblclick', (e) => {
					e.stopPropagation();
					showMappingDropdown(th, i, String(mapping.targetField), bomFile, side);
				});

				// Show sort indicator
				if (state.sortField === String(mapping.targetField)) {
					const indicator = document.createElement('span');
					indicator.textContent = state.sortDirection === 'asc' ? ' ↑' : ' ↓';
					indicator.style.marginLeft = '4px';
					th.appendChild(indicator);
				}
			}

			presetHeaderRow.appendChild(th);
		}
	} else {
		// Fallback to STANDARD_COLUMNS
		for (const col of STANDARD_COLUMNS) {
			const th = document.createElement('th');
			th.textContent = col.label;
			th.dataset.field = String(col.field);
			th.style.width = '80px';
			th.style.minWidth = '80px';
			th.style.cursor = 'pointer';
			th.title = '点击排序';
			th.addEventListener('click', () => handleColumnSort(String(col.field)));

			// Show sort indicator
			if (state.sortField === String(col.field)) {
				const indicator = document.createElement('span');
				indicator.textContent = state.sortDirection === 'asc' ? ' ↑' : ' ↓';
				indicator.style.marginLeft = '4px';
				th.appendChild(indicator);
			}

			presetHeaderRow.appendChild(th);
		}
	}

	if (side === 'new') {
		const actionTh = document.createElement('th');
		actionTh.textContent = '操作';
		actionTh.style.width = '80px';
		presetHeaderRow.appendChild(actionTh);
	}

	thead.appendChild(presetHeaderRow);

	// 第二层表头：原始表头
	if (bomFile && bomFile.rawHeaders) {
		const rawHeaderRow = document.createElement('tr');
		rawHeaderRow.className = 'raw-header-row';

		const rawNumTh = document.createElement('th');
		rawNumTh.textContent = '#';
		rawNumTh.style.width = '40px';
		rawHeaderRow.appendChild(rawNumTh);

		for (const rawHeader of bomFile.rawHeaders) {
			const rawTh = document.createElement('th');
			rawTh.textContent = rawHeader;
			rawTh.className = 'raw-header';
			rawHeaderRow.appendChild(rawTh);
		}

		if (side === 'new') {
			const actionTh = document.createElement('th');
			actionTh.textContent = '';
			actionTh.style.width = '80px';
			rawHeaderRow.appendChild(actionTh);
		}

		thead.appendChild(rawHeaderRow);
	}

	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	for (let i = 0; i < rows.length; i++) {
		const rowDiff = rows[i];
		const row = side === 'old' ? rowDiff.oldRow : rowDiff.newRow;
		const columnMappings = bomFile?.columnMappings;
		const rawValues = columnMappings ? (side === 'old' ? state.oldFile?.rawRows : state.newFile?.rawRows)?.[row?.rowIndex || 0] : undefined;
		const tr = createDiffRow(row, rowDiff, side, i, columnMappings, rawValues);
		tbody.appendChild(tr);
	}
	table.appendChild(tbody);

	container.innerHTML = '';
	container.appendChild(table);
	addResizeHandles(table);
	initEditableTable(table);
}

function createDataRow(row: BomRow, columnMappings: any[], rawValues: string[]): HTMLTableRowElement {
	const tr = document.createElement('tr');

	const numTd = document.createElement('td');
	numTd.textContent = String(row.rowIndex);
	tr.appendChild(numTd);

	for (let i = 0; i < columnMappings.length; i++) {
		const mapping = columnMappings[i];
		const td = document.createElement('td');
		// 始终使用原始值显示，确保映射后仍然可见
		td.textContent = rawValues[i] || '';
		td.title = rawValues[i] || '';

		if (mapping.targetField === 'ignore') {
			// 未匹配列通过底色标识
			td.style.background = 'var(--bg-hover)';
			td.style.color = 'var(--text-muted)';
		}

		addTooltipSupport(td);
		tr.appendChild(td);
	}

	return tr;
}

function createDiffRow(row: BomRow | null, rowDiff: RowDiff, side: 'old' | 'new', index: number, columnMappings?: any[], rawValues?: string[]): HTMLTableRowElement {
	const tr = document.createElement('tr');
	tr.dataset.index = String(index);

	const rowClass = getRowClass(rowDiff.type, side);
	if (rowClass) tr.className = rowClass;

	const numTd = document.createElement('td');
	numTd.textContent = row ? String(row.rowIndex) : '';
	tr.appendChild(numTd);

	const changedFields = new Set(rowDiff.cellDiffs.map(d => d.field));

	// Use columnMappings if available, otherwise use STANDARD_COLUMNS
	if (columnMappings && rawValues) {
		for (let i = 0; i < columnMappings.length; i++) {
			const mapping = columnMappings[i];
			const td = document.createElement('td');
			td.textContent = rawValues[i] || '';
			td.title = rawValues[i] || '';

			if (mapping.targetField !== 'ignore' && rowDiff.type === 'changed' && changedFields.has(String(mapping.targetField))) {
				td.classList.add('cell-changed');
			} else if (mapping.targetField === 'ignore') {
				td.style.background = 'var(--bg-hover)';
				td.style.color = 'var(--text-muted)';
			}
			addTooltipSupport(td);
			tr.appendChild(td);
		}
	} else {
		for (const col of STANDARD_COLUMNS) {
			const td = document.createElement('td');
			td.textContent = row ? String(row[col.field] || '') : '';
			td.title = row ? String(row[col.field] || '') : '';

			if (rowDiff.type === 'changed' && changedFields.has(String(col.field))) {
				td.classList.add('cell-changed');
			}
			addTooltipSupport(td);
			tr.appendChild(td);
		}
	}

	if (side === 'new') {
		const actionTd = document.createElement('td');
		if (rowDiff.type !== 'same' && (rowDiff.oldRow || rowDiff.newRow)) {
			const btn = document.createElement('button');
			btn.className = 'btn-detail';
			btn.textContent = '详情';
			btn.addEventListener('click', () => showDetailDialog(rowDiff));
			actionTd.appendChild(btn);
		}
		tr.appendChild(actionTd);
	}

	// Hover linkage
	tr.addEventListener('mouseenter', () => {
		highlightLinkedRow(index, side === 'old' ? 'new' : 'old');
	});
	tr.addEventListener('mouseleave', () => {
		clearLinkedHighlight();
	});

	return tr;
}

function getRowClass(type: string, side: 'old' | 'new'): string {
	switch (type) {
		case 'changed': return 'row-changed';
		case 'added': return side === 'new' ? 'row-added' : '';
		case 'removed': return side === 'old' ? 'row-removed' : '';
		default: return 'row-same';
	}
}

function filterRows(rows: RowDiff[]): RowDiff[] {
	let filtered = rows;

	if (state.filter !== 'all') {
		filtered = filtered.filter(row => {
			switch (state.filter) {
				case 'diff': return row.type === 'changed';
				case 'added': return row.type === 'added';
				case 'removed': return row.type === 'removed';
				case 'same': return row.type === 'same';
				default: return true;
			}
		});
	}

	if (state.searchKeyword) {
		const kw = state.searchKeyword.toLowerCase();
		filtered = filtered.filter(row => {
			const designator = (row.oldRow || row.newRow)?.designator || '';
			return designator.toLowerCase().includes(kw);
		});
	}

	// Apply sorting
	if (state.sortField) {
		filtered = [...filtered].sort((a, b) => {
			const rowA = a.oldRow || a.newRow;
			const rowB = b.oldRow || b.newRow;

			if (!rowA || !rowB) return 0;

			const valA = String(rowA[state.sortField as keyof BomRow] || '').toLowerCase();
			const valB = String(rowB[state.sortField as keyof BomRow] || '').toLowerCase();

			const comparison = valA.localeCompare(valB);
			return state.sortDirection === 'asc' ? comparison : -comparison;
		});
	}

	return filtered;
}

function handleColumnSort(field: string): void {
	if (state.sortField === field) {
		// Toggle direction
		state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
	} else {
		// New field, default to asc
		state.sortField = field;
		state.sortDirection = 'asc';
	}

	// Re-render with new sort
	if (state.diffResult) {
		renderDiffResult();
	}
}

function highlightLinkedRow(index: number, targetSide: 'old' | 'new'): void {
	const containerId = targetSide === 'old' ? 'table-left' : 'table-right';
	const container = document.getElementById(containerId);
	if (!container) return;

	const targetRow = container.querySelector(`tr[data-index="${index}"]`);
	if (targetRow) {
		targetRow.classList.add('row-highlight');
	}
}

function clearLinkedHighlight(): void {
	document.querySelectorAll('.row-highlight').forEach(el => {
		el.classList.remove('row-highlight');
	});
}

function showDetailDialog(rowDiff: RowDiff): void {
	showRowDetailDialog(rowDiff);
}

export function initRowHoverHighlight(): void {
	// Row hover highlighting is already implemented in createDiffRow
	// This function is a placeholder for future initialization if needed
}
