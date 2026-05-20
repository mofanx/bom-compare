import type { BomFile, BomRow, RowDiff } from '../types';
import { STANDARD_COLUMNS, getColumnLetter } from '../types';
import { state } from './state';
import { initSyncScroll } from './layout';
import { showRowDetailDialog, showHeaderDetailDialog } from './dialog';
import { addResizeHandles, initColumnResize } from './column-resize';
import { addTooltipSupport } from './tooltip';
import { initEditableTable } from './editable';
import { showToast } from './drop-zone';
import { getLanguage, t } from '../utils/i18n';
import { mapSingleColumn } from '../core/column-mapper';

export function renderTable(container: HTMLElement, bomFile: BomFile, side: 'old' | 'new'): void {
	const table = document.createElement('table');
	table.className = 'bom-table';

	const thead = document.createElement('thead');

	// 唯一的 thead 行：预设表头（映射列名）
	const presetHeaderRow = document.createElement('tr');
	presetHeaderRow.className = 'preset-header-row';

	const presetNumTh = document.createElement('th');
	presetNumTh.textContent = '#';
	presetNumTh.style.width = '40px';
	presetHeaderRow.appendChild(presetNumTh);

	for (let i = 0; i < bomFile.rawHeaders.length; i++) {
		presetHeaderRow.appendChild(createPresetHeaderTh(i, bomFile, side));
	}

	thead.appendChild(presetHeaderRow);
	table.appendChild(thead);

	// tbody: 第一行是原始表头（行号 1），后续是数据行（行号 2 起）
	const tbody = document.createElement('tbody');
	tbody.appendChild(createRawHeaderRow(bomFile));

	for (let i = 0; i < bomFile.rows.length; i++) {
		const row = bomFile.rows[i];
		const rawValues = bomFile.rawRows[i] || [];
		tbody.appendChild(createDataRow(row, bomFile.columnMappings, rawValues));
	}

	table.appendChild(tbody);

	container.innerHTML = '';
	container.appendChild(table);
	addResizeHandles(table);
	initEditableTable(table);
}

function updateColumnMapping(columnIndex: number, targetField: string, bomFile: BomFile, side: 'old' | 'new'): void {
	const prevField = bomFile.columnMappings[columnIndex].targetField;
	bomFile.columnMappings[columnIndex].targetField = targetField as any;

	// 同步更新 rows 中对应字段的值（rawRows 保有原始数据）
	if (targetField !== 'ignore') {
		// 新字段从 rawRows 写入 rows
		for (let i = 0; i < bomFile.rows.length; i++) {
			const raw = bomFile.rawRows[i]?.[columnIndex] ?? '';
			(bomFile.rows[i] as any)[targetField] = raw;
		}
	}
	if (prevField !== 'ignore' && prevField !== targetField) {
		// 旧字段从其他列重新计算（找是否还有其他列映射到该字段）
		const stillMapped = bomFile.columnMappings.some((m, idx) => idx !== columnIndex && m.targetField === prevField);
		if (!stillMapped) {
			for (let i = 0; i < bomFile.rows.length; i++) {
				(bomFile.rows[i] as any)[prevField] = '';
			}
		}
	}

	if (side === 'old') {
		state.oldFile = bomFile;
	} else {
		state.newFile = bomFile;
	}

	if (state.diffResult) {
		document.dispatchEvent(new CustomEvent('bom:recompare'));
	} else {
		const tableId = side === 'old' ? 'table-left' : 'table-right';
		const container = document.getElementById(tableId)!;
		renderTable(container, bomFile, side);
	}
	showToast(t('mappingUpdated'), 'success');
}

// 创建预设表头单元格（单击弹出映射下拉框）
function createPresetHeaderTh(columnIndex: number, bomFile: BomFile, side: 'old' | 'new'): HTMLTableCellElement {
	const lang = getLanguage();
	const mapping = bomFile.columnMappings[columnIndex];
	const th = document.createElement('th');
	th.className = 'preset-header';
	th.style.width = '80px';
	th.style.minWidth = '80px';
	th.style.cursor = 'pointer';
	th.title = t('clickToRemap');

	if (mapping.targetField === 'ignore') {
		th.textContent = getColumnLetter(columnIndex);
		th.classList.add('unmapped');
		th.style.background = 'var(--bg-hover)';
		th.style.color = 'var(--text-muted)';
		th.style.paddingLeft = '10px';
	} else {
		const standardCol = STANDARD_COLUMNS.find(col => col.field === mapping.targetField);
		th.textContent = standardCol ? (lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label) : String(mapping.targetField);
		th.classList.add('mapped');
	}

	th.addEventListener('click', (e) => {
		e.stopPropagation();
		if (!th.querySelector('select')) {
			showMappingDropdown(th, columnIndex, String(mapping.targetField), bomFile, side);
		}
	});

	return th;
}

// 创建原始表头行（作为 tbody 第一行，行号 1，单元格样式）
function createRawHeaderRow(bomFile: BomFile, side: 'old' | 'new' = 'old'): HTMLTableRowElement {
	const tr = document.createElement('tr');
	tr.dataset.rowType = 'header';

	const numTd = document.createElement('td');
	numTd.textContent = '1';
	tr.appendChild(numTd);

	for (let i = 0; i < bomFile.rawHeaders.length; i++) {
		const td = document.createElement('td');
		td.textContent = bomFile.rawHeaders[i];
		td.title = bomFile.rawHeaders[i];

		if (bomFile.columnMappings[i].targetField === 'ignore') {
			td.style.background = 'var(--bg-hover)';
			td.style.color = 'var(--text-muted)';
		}

		addTooltipSupport(td);
		tr.appendChild(td);
	}

	if (side === 'new') {
		const actionTd = document.createElement('td');
		actionTd.style.position = 'sticky';
		actionTd.style.right = '0';
		actionTd.style.background = 'var(--bg-surface)';
		actionTd.style.zIndex = '1';
		const btn = document.createElement('button');
		btn.className = 'btn-detail';
		btn.textContent = '详情';
		btn.addEventListener('click', () => {
			showHeaderDetailDialog(state.oldFile, state.newFile);
		});
		actionTd.appendChild(btn);
		tr.appendChild(actionTd);
	}

	return tr;
}

function showMappingDropdown(th: HTMLTableCellElement, columnIndex: number, currentField: string, bomFile: BomFile, side: 'old' | 'new'): void {
	const lang = getLanguage();
	const select = document.createElement('select');
	select.className = 'column-mapping-select';
	select.style.width = '100%';
	select.style.height = '100%';
	select.style.border = '1px solid var(--border)';
	select.style.background = 'var(--bg-elevated)';
	select.style.color = 'var(--text-secondary)';
	select.style.cursor = 'pointer';
	select.style.fontSize = 'inherit';
	select.style.borderRadius = '3px';
	select.style.padding = '0 2px';

	const matchedFields = new Set<string>();
	bomFile.columnMappings.forEach((mapping, idx) => {
		if (idx !== columnIndex && mapping.targetField !== 'ignore') {
			matchedFields.add(String(mapping.targetField));
		}
	});

	STANDARD_COLUMNS.forEach(col => {
		if (matchedFields.has(String(col.field))) return;

		const option = document.createElement('option');
		option.value = String(col.field);
		option.textContent = lang === 'zh-Hans' ? col.labelZh : col.label;
		option.style.background = 'var(--bg-elevated)';
		option.style.color = 'var(--text-secondary)';
		select.appendChild(option);
	});

	const columnLetter = getColumnLetter(columnIndex);
	const columnLetterOption = document.createElement('option');
	columnLetterOption.value = 'ignore';
	columnLetterOption.textContent = columnLetter;
	columnLetterOption.style.background = 'var(--bg-elevated)';
	columnLetterOption.style.color = 'var(--text-muted)';
	select.appendChild(columnLetterOption);

	if (currentField === 'ignore') {
		select.value = 'ignore';
	} else if (!matchedFields.has(currentField)) {
		select.value = currentField;
	} else {
		select.value = 'ignore';
	}

	select.addEventListener('change', (e) => {
		const selectedField = (e.target as HTMLSelectElement).value;
		updateColumnMapping(columnIndex, selectedField, bomFile, side);
	});

	select.addEventListener('blur', () => {
		if (th.contains(select)) {
			th.removeChild(select);
			restorePresetHeaderText(th, columnIndex, bomFile);
		}
	});

	th.textContent = '';
	th.appendChild(select);
	select.focus();
}

function restorePresetHeaderText(th: HTMLTableCellElement, columnIndex: number, bomFile: BomFile): void {
	const lang = getLanguage();
	const mapping = bomFile.columnMappings[columnIndex];

	if (mapping.targetField === 'ignore') {
		th.textContent = getColumnLetter(columnIndex);
		th.classList.add('unmapped');
		th.classList.remove('mapped');
		th.style.background = 'var(--bg-hover)';
		th.style.color = 'var(--text-muted)';
	} else {
		const standardCol = STANDARD_COLUMNS.find(col => col.field === mapping.targetField);
		th.textContent = standardCol ? (lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label) : String(mapping.targetField);
		th.classList.remove('unmapped');
		th.classList.add('mapped');
		th.style.background = '';
		th.style.color = '';
	}
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

	// 预设表头行
	const presetHeaderRow = document.createElement('tr');
	presetHeaderRow.className = 'preset-header-row';

	const presetNumTh = document.createElement('th');
	presetNumTh.textContent = '#';
	presetNumTh.style.width = '40px';
	presetHeaderRow.appendChild(presetNumTh);

	if (bomFile && bomFile.columnMappings) {
		for (let i = 0; i < bomFile.columnMappings.length; i++) {
			presetHeaderRow.appendChild(createPresetHeaderTh(i, bomFile, side));
		}
	} else {
		for (const col of STANDARD_COLUMNS) {
			const th = document.createElement('th');
			th.textContent = col.label;
			th.style.width = '80px';
			th.style.minWidth = '80px';
			presetHeaderRow.appendChild(th);
		}
	}

	if (side === 'new') {
		const actionTh = document.createElement('th');
		actionTh.textContent = '操作';
		actionTh.style.width = '60px';
		actionTh.style.position = 'sticky';
		actionTh.style.right = '0';
		actionTh.style.background = 'var(--bg-elevated)';
		actionTh.style.zIndex = '2';
		presetHeaderRow.appendChild(actionTh);
	}

	thead.appendChild(presetHeaderRow);
	table.appendChild(thead);

	// tbody: 原始表头行 + diff 数据行
	const tbody = document.createElement('tbody');

	if (bomFile) {
		tbody.appendChild(createRawHeaderRow(bomFile, side));
	}

	for (let i = 0; i < rows.length; i++) {
		const rowDiff = rows[i];
		const row = side === 'old' ? rowDiff.oldRow : rowDiff.newRow;
		const columnMappings = bomFile?.columnMappings;
		const rawValues = columnMappings ? (side === 'old' ? state.oldFile?.rawRows : state.newFile?.rawRows)?.[row?.rowIndex ?? -1] : undefined;
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
	tr.dataset.rowIndex = String(row.rowIndex);

	const numTd = document.createElement('td');
	numTd.textContent = String(row.rowIndex + 2);
	tr.appendChild(numTd);

	for (let i = 0; i < columnMappings.length; i++) {
		const mapping = columnMappings[i];
		const td = document.createElement('td');
		td.textContent = rawValues[i] || '';
		td.title = rawValues[i] || '';

		if (mapping.targetField === 'ignore') {
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
	if (row) tr.dataset.rowIndex = String(row.rowIndex);

	const rowClass = getRowClass(rowDiff.type, side);
	if (rowClass) tr.className = rowClass;

	const numTd = document.createElement('td');
	numTd.textContent = row ? String(row.rowIndex + 2) : '';
	tr.appendChild(numTd);

	const changedFields = new Set(rowDiff.cellDiffs.map(d => d.field));

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
		actionTd.style.position = 'sticky';
		actionTd.style.right = '0';
		actionTd.style.background = 'var(--bg-surface)';
		actionTd.style.zIndex = '1';
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
}
