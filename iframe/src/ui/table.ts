import type { BomFile, BomRow, RowDiff, DiffResult } from '../types';
import { getColumnLetter } from '../types';
import { getActiveColumns } from '../core/column-config';
import { state } from './state';
import { initSyncScroll, equalizeScrollHeight } from './layout';
import { showRowDetailDialog, showHeaderDetailDialog } from './dialog';
import { addResizeHandles, initColumnResize } from './column-resize';
import { addTooltipSupport } from './tooltip';
import { initEditableTable } from './editable';
import { showToast } from './drop-zone';
import { getLanguage, t } from '../utils/i18n';
import { mapSingleColumn } from '../core/column-mapper';
import { renderSummary } from './summary';

let _measureSpan: HTMLSpanElement | null = null;

function measureText(text: string): number {
	if (!_measureSpan) {
		_measureSpan = document.createElement('span');
		_measureSpan.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:500 11px system-ui,sans-serif;';
		document.body.appendChild(_measureSpan);
	}
	_measureSpan.textContent = text;
	return _measureSpan.offsetWidth;
}

function calcActionColumnWidth(): string {
	const headerWidth = Math.max(measureText('操作'), measureText('ACTION'));
	const buttonWidth = Math.max(measureText('详情'), measureText('Detail'));
	// header: text + 20 (td padding)
	// button: text + 18 (button padding 16 + border 2) + 20 (td padding)
	const colWidth = Math.max(headerWidth + 20, buttonWidth + 40);
	return colWidth + 'px';
}

export function renderTable(container: HTMLElement, bomFile: BomFile, side: 'old' | 'new'): void {
	const table = document.createElement('table');
	table.className = 'bom-table';
	table.id = side === 'old' ? 'table-left' : 'table-right';

	const thead = document.createElement('thead');

	// 唯一的 thead 行：预设表头（映射列名）
	const presetHeaderRow = document.createElement('tr');
	presetHeaderRow.className = 'preset-header-row';

	const presetNumTh = document.createElement('th');
	presetNumTh.textContent = '#';
	presetNumTh.style.width = '40px';
	presetNumTh.dataset.field = 'rowIndex';
	presetNumTh.style.position = 'sticky';
	presetNumTh.style.top = '0';
	presetNumTh.style.zIndex = '2';
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
	th.style.position = 'sticky';
	th.style.top = '0';
	th.style.zIndex = '2';
	th.title = t('clickToRemap');

	if (mapping.targetField === 'ignore') {
		const rh1 = th.querySelector('.column-resize-handle');
		th.textContent = getColumnLetter(columnIndex);
		if (rh1) th.appendChild(rh1);
		th.classList.add('unmapped');
		th.style.background = 'var(--bg-hover)';
		th.style.color = 'var(--text-muted)';
		th.style.paddingLeft = '10px';
	} else {
		const standardCol = getActiveColumns().find(col => col.field === mapping.targetField);
		const rh2 = th.querySelector('.column-resize-handle');
		th.textContent = standardCol ? (lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label) : String(mapping.targetField);
		if (rh2) th.appendChild(rh2);
		th.classList.add('mapped');
	}

	th.dataset.field = String(mapping.targetField);

	th.addEventListener('click', (e) => {
		const rect = th.getBoundingClientRect();
		if (rect.right - e.clientX < 12) return;
		e.stopPropagation();
		if (!th.querySelector('select')) {
			showMappingDropdown(th, columnIndex, String(mapping.targetField), bomFile, side);
		}
	});

	return th;
}

// 检查表头是否有差异
function hasHeaderDiff(): boolean {
	if (!state.oldFile || !state.newFile) return false;

	const oldMappings = state.oldFile.columnMappings;
	const newMappings = state.newFile.columnMappings;
	const oldHeaders = state.oldFile.rawHeaders;
	const newHeaders = state.newFile.rawHeaders;

	// 收集两侧都有映射的预设字段（取并集）
	const mappedFields = new Set<string>();
	for (const m of oldMappings) { if (m.targetField !== 'ignore') mappedFields.add(String(m.targetField)); }
	for (const m of newMappings) { if (m.targetField !== 'ignore') mappedFields.add(String(m.targetField)); }

	// 检查每个映射字段的表头是否相同
	for (const field of mappedFields) {
		const oldIdx = oldMappings.findIndex(m => String(m.targetField) === field);
		const newIdx = newMappings.findIndex(m => String(m.targetField) === field);
		const oldVal = oldIdx >= 0 ? (oldHeaders[oldIdx] || '') : '';
		const newVal = newIdx >= 0 ? (newHeaders[newIdx] || '') : '';
		if (oldVal !== newVal) return true;
	}

	return false;
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

	// 始终创建详情列单元格，保持列的一致性
	if (side === 'new') {
		const actionTd = document.createElement('td');
		actionTd.style.position = 'sticky';
		actionTd.style.right = '0';
		actionTd.style.background = 'var(--bg-surface)';
		actionTd.style.zIndex = '10';

		// 只在表头有差异时显示详情按钮
		if (hasHeaderDiff()) {
			const btn = document.createElement('button');
			btn.className = 'btn-detail';
			btn.textContent = t('detail');
			btn.addEventListener('click', () => {
				showHeaderDetailDialog(state.oldFile, state.newFile);
			});
			actionTd.appendChild(btn);
		}

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

	getActiveColumns().forEach(col => {
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

	const resizeHandle = th.querySelector('.column-resize-handle');
	th.textContent = '';
	th.appendChild(select);
	if (resizeHandle) th.appendChild(resizeHandle);
	select.focus();
}

function restorePresetHeaderText(th: HTMLTableCellElement, columnIndex: number, bomFile: BomFile): void {
	const lang = getLanguage();
	const mapping = bomFile.columnMappings[columnIndex];

	if (mapping.targetField === 'ignore') {
		const rh = th.querySelector('.column-resize-handle');
		th.textContent = getColumnLetter(columnIndex);
		if (rh) th.appendChild(rh);
		th.classList.add('unmapped');
		th.classList.remove('mapped');
		th.style.background = 'var(--bg-hover)';
		th.style.color = 'var(--text-muted)';
	} else {
		const standardCol = getActiveColumns().find(col => col.field === mapping.targetField);
		const rh2 = th.querySelector('.column-resize-handle');
		th.textContent = standardCol ? (lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label) : String(mapping.targetField);
		if (rh2) th.appendChild(rh2);
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

	// 显示差异导航和筛选按钮
	(document.getElementById('btn-prev-diff')! as HTMLElement).classList.add('visible');
	(document.getElementById('btn-next-diff')! as HTMLElement).classList.add('visible');
	(document.getElementById('filter-select')! as HTMLElement).classList.add('visible');
	(document.getElementById('btn-export')! as HTMLElement).classList.add('visible');

	const filteredRows = filterRows(state.diffResult.rows);

	renderDiffTable(leftContainer, filteredRows, 'old');
	renderDiffTable(rightContainer, filteredRows, 'new');

	renderSummary(state.diffResult);
	initSyncScroll();
	equalizeScrollHeight();

	// 如果有搜索关键词，重新应用高亮
	if (state.searchKeyword) {
		applyHighlight();
	}
}

function renderDiffTable(container: HTMLElement, rows: RowDiff[], side: 'old' | 'new'): void {
	const table = document.createElement('table');
	table.className = 'bom-table';
	table.id = side === 'old' ? 'table-left' : 'table-right';

	const bomFile = side === 'old' ? state.oldFile : state.newFile;
	const thead = document.createElement('thead');

	// 预设表头行
	const presetHeaderRow = document.createElement('tr');
	presetHeaderRow.className = 'preset-header-row';

	const presetNumTh = document.createElement('th');
	presetNumTh.textContent = '#';
	presetNumTh.style.width = '40px';
	presetNumTh.dataset.field = 'rowIndex';
	presetNumTh.style.position = 'sticky';
	presetNumTh.style.top = '0';
	presetNumTh.style.zIndex = '2';
	presetHeaderRow.appendChild(presetNumTh);

	if (bomFile && bomFile.columnMappings) {
		for (let i = 0; i < bomFile.columnMappings.length; i++) {
			presetHeaderRow.appendChild(createPresetHeaderTh(i, bomFile, side));
		}
	} else {
		for (const col of getActiveColumns()) {
			const th = document.createElement('th');
			th.textContent = col.label;
			th.style.width = '80px';
			th.style.minWidth = '80px';
			presetHeaderRow.appendChild(th);
		}
	}

	if (side === 'new') {
		const actionTh = document.createElement('th');
		actionTh.textContent = t('action');
		actionTh.style.width = calcActionColumnWidth();
		actionTh.style.whiteSpace = 'nowrap';
		actionTh.className = 'preset-header-action';
		actionTh.style.background = 'var(--bg-elevated)';
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
	numTd.dataset.field = 'rowIndex';
	tr.appendChild(numTd);

	for (let i = 0; i < columnMappings.length; i++) {
		const mapping = columnMappings[i];
		const td = document.createElement('td');
		td.textContent = rawValues[i] || '';
		td.title = rawValues[i] || '';
		td.dataset.field = String(mapping.targetField);

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
	numTd.dataset.field = 'rowIndex';
	tr.appendChild(numTd);

	const changedFields = new Set(rowDiff.cellDiffs.map(d => d.field));

	if (columnMappings) {
		// Always use columnMappings to ensure consistent column count across all rows
		for (let i = 0; i < columnMappings.length; i++) {
			const mapping = columnMappings[i];
			const td = document.createElement('td');
			td.dataset.field = String(mapping.targetField);
			
			// Use rawValues if available, otherwise use row data or empty string
			if (rawValues && rawValues[i] !== undefined) {
				td.textContent = rawValues[i] || '';
				td.title = rawValues[i] || '';
			} else if (row && mapping.targetField !== 'ignore') {
				td.textContent = String(row[mapping.targetField] || '');
				td.title = String(row[mapping.targetField] || '');
			} else {
				td.textContent = '';
				td.title = '';
			}

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
		// Fallback to active columns if no columnMappings available
		for (const col of getActiveColumns()) {
			const td = document.createElement('td');
			td.dataset.field = col.field;
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
			btn.textContent = t('detail');
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

	// Click to select row
	tr.addEventListener('click', () => {
		selectRow(index);
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

export function filterRows(rows: RowDiff[]): RowDiff[] {
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

	if (state.searchKeyword && state.searchMode === 'filter') {
		const kw = state.searchKeyword.toLowerCase();
		filtered = filtered.filter(row => {
			const oldRow = row.oldRow;
			const newRow = row.newRow;

			// 检查旧文件的所有字段（映射后的）
			if (oldRow && Object.values(oldRow).some(v => String(v).toLowerCase().includes(kw))) {
				return true;
			}
			// 检查新文件的所有字段（映射后的）
			if (newRow && Object.values(newRow).some(v => String(v).toLowerCase().includes(kw))) {
				return true;
			}

			// 对比后：检查原始数据中的所有列（包括未映射列）
			if (state.diffResult) {
				const oldRawValues = state.oldFile?.rawRows?.[oldRow?.rowIndex ?? -1];
				const newRawValues = state.newFile?.rawRows?.[newRow?.rowIndex ?? -1];
				if (oldRawValues && oldRawValues.some(v => String(v).toLowerCase().includes(kw))) {
					return true;
				}
				if (newRawValues && newRawValues.some(v => String(v).toLowerCase().includes(kw))) {
					return true;
				}
			}

			return false;
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
	// 同时高亮两侧的行
	const leftContainer = document.getElementById('table-left');
	const rightContainer = document.getElementById('table-right');
	
	if (leftContainer) {
		const leftRow = leftContainer.querySelector(`tr[data-index="${index}"]`);
		if (leftRow) leftRow.classList.add('row-highlight');
	}
	
	if (rightContainer) {
		const rightRow = rightContainer.querySelector(`tr[data-index="${index}"]`);
		if (rightRow) rightRow.classList.add('row-highlight');
	}
}

function clearLinkedHighlight(): void {
	document.querySelectorAll('.row-highlight').forEach(el => {
		el.classList.remove('row-highlight');
	});
}

function selectRow(index: number): void {
	state.selectedRowIndex = index;
	highlightSelectedRow(index);
}

function highlightSelectedRow(index: number): void {
	document.querySelectorAll('.selected-row, .current-diff-row').forEach(el => {
		el.classList.remove('selected-row', 'current-diff-row');
	});

	const selector = `tr[data-index="${index}"]`;
	document.getElementById('table-left')?.querySelector(selector)?.classList.add('selected-row');
	document.getElementById('table-right')?.querySelector(selector)?.classList.add('selected-row');
}

function showDetailDialog(rowDiff: RowDiff): void {
	showRowDetailDialog(rowDiff);
}

export function initRowHoverHighlight(): void {
}

// 统一的搜索函数（对比前后通用）
export function performSearch(): void {
	const keyword = state.searchKeyword.toLowerCase();
	
	if (!keyword) {
		// 清空搜索
		clearSearchHighlights();
		showAllRows();
		return;
	}
	
	// 根据模式应用显示效果
	if (state.searchMode === 'filter') {
		filterToMatches();
	} else {
		highlightMatches();
	}
}

// 应用高亮样式（只负责添加高亮，不处理行显示）
function applyHighlight(): void {
	const keyword = state.searchKeyword.toLowerCase();
	if (!keyword) return;
	
	// 获取表格
	const tableLeft = document.getElementById('table-left');
	const tableRight = document.getElementById('table-right');
	
	[ tableLeft, tableRight ].forEach(table => {
		if (!table) return;
		
		// 遍历所有单元格
		const cells = table.querySelectorAll('tbody td');
		cells.forEach(cell => {
			const cellEl = cell as HTMLElement;
			const text = cellEl.textContent || '';
			
			// 检查是否包含关键词
			if (text.toLowerCase().includes(keyword)) {
				cellEl.classList.add('search-highlight');
			}
		});
	});
}

// 高亮匹配单元格
function highlightMatches(): void {
	// 清除旧高亮
	document.querySelectorAll('.search-highlight').forEach(el => {
		el.classList.remove('search-highlight');
	});

	// 对比后需要重新渲染表格（只应用差异筛选，不应用文本筛选）
	if (state.diffResult) {
		renderDiffResult();
	} else {
		// 对比前：恢复所有行的显示（从筛选模式切换回来时需要）
		document.querySelectorAll('tbody tr').forEach(row => {
			(row as HTMLElement).style.display = '';
		});
	}

	// 应用高亮样式
	applyHighlight();
}

// 筛选到匹配行
function filterToMatches(): void {
	const tableLeft = document.getElementById('table-left');
	const tableRight = document.getElementById('table-right');
	
	const keyword = state.searchKeyword.toLowerCase();
	
	if (!state.diffResult) {
		// 对比前：筛选 BOM 行
		filterBomTable(tableLeft, keyword);
		filterBomTable(tableRight, keyword);
	} else {
		// 对比后：重新渲染 diff 结果（filterRows 会处理搜索）
		renderDiffResult();
	}
}

// 筛选 BOM 表格（对比前）
function filterBomTable(table: HTMLElement | null, keyword: string): void {
	if (!table || !keyword) {
		// 如果没有表格或没有关键词，显示所有行
		if (table) {
			table.querySelectorAll('tbody tr').forEach(row => {
				(row as HTMLElement).style.display = '';
			});
		}
		return;
	}
	
	// 清除旧高亮
	table.querySelectorAll('.search-highlight').forEach(el => {
		el.classList.remove('search-highlight');
	});
	
	const rows = table.querySelectorAll('tbody tr');
	rows.forEach((row) => {
		const rowEl = row as HTMLElement;
		const cells = rowEl.querySelectorAll('td');
		let hasMatch = false;
		
		// 检查该行是否有单元格包含关键词
		cells.forEach(cell => {
			const text = cell.textContent || '';
			if (text.toLowerCase().includes(keyword)) {
				hasMatch = true;
			}
		});
		
		rowEl.style.display = hasMatch ? '' : 'none';
	});
	
	// 应用高亮样式到可见的匹配单元格
	applyHighlight();
}

// 清除高亮
function clearSearchHighlights(): void {
	document.querySelectorAll('.search-highlight').forEach(el => {
		el.classList.remove('search-highlight');
	});
}

// 显示所有行
function showAllRows(): void {
	if (state.diffResult) {
		renderDiffResult();
	} else {
		document.querySelectorAll('tbody tr').forEach(row => {
			(row as HTMLElement).style.display = '';
		});
	}
}
