import type { BomFile, BomRow, RowDiff } from '../types';
import { STANDARD_COLUMNS } from '../types';
import { state } from './state';
import { initSyncScroll } from './layout';
import { showRowDetailDialog } from './dialog';
import { addResizeHandles, initColumnResize } from './column-resize';
import { addTooltipSupport } from './tooltip';
import { initEditableTable } from './editable';

export function renderTable(container: HTMLElement, bomFile: BomFile, side: 'old' | 'new'): void {
	const table = document.createElement('table');
	table.className = 'bom-table';

	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');

	const numTh = document.createElement('th');
	numTh.textContent = '#';
	numTh.style.width = '40px';
	headerRow.appendChild(numTh);

	for (const col of STANDARD_COLUMNS) {
		const th = document.createElement('th');
		th.textContent = col.label;
		th.dataset.field = String(col.field);
		headerRow.appendChild(th);
	}

	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	for (const row of bomFile.rows) {
		const tr = createDataRow(row);
		tbody.appendChild(tr);
	}
	table.appendChild(tbody);

	container.innerHTML = '';
	container.appendChild(table);
	addResizeHandles(table);
	initEditableTable(table);
}

export function renderDiffResult(): void {
	if (!state.diffResult) return;

	const leftContainer = document.getElementById('table-left')!;
	const rightContainer = document.getElementById('table-right')!;

	leftContainer.style.display = 'block';
	rightContainer.style.display = 'block';
	document.getElementById('drop-zone-left')!.style.display = 'none';
	document.getElementById('drop-zone-right')!.style.display = 'none';
	document.querySelector('#panel-left .panel-label')!.style.display = 'none';
	document.querySelector('#panel-right .panel-label')!.style.display = 'none';

	const filteredRows = filterRows(state.diffResult.rows);

	renderDiffTable(leftContainer, filteredRows, 'old');
	renderDiffTable(rightContainer, filteredRows, 'new');

	initSyncScroll();
}

function renderDiffTable(container: HTMLElement, rows: RowDiff[], side: 'old' | 'new'): void {
	const table = document.createElement('table');
	table.className = 'bom-table';

	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');

	const numTh = document.createElement('th');
	numTh.textContent = '#';
	numTh.style.width = '40px';
	headerRow.appendChild(numTh);

	for (const col of STANDARD_COLUMNS) {
		const th = document.createElement('th');
		th.textContent = col.label;
		th.dataset.field = String(col.field);
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

		headerRow.appendChild(th);
	}

	if (side === 'new') {
		const actionTh = document.createElement('th');
		actionTh.textContent = '详情';
		actionTh.style.width = '50px';
		headerRow.appendChild(actionTh);
	}

	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	for (let i = 0; i < rows.length; i++) {
		const rowDiff = rows[i];
		const bomRow = side === 'old' ? rowDiff.oldRow : rowDiff.newRow;
		const tr = createDiffRow(bomRow, rowDiff, side, i);
		tbody.appendChild(tr);
	}
	table.appendChild(tbody);

	container.innerHTML = '';
	container.appendChild(table);
	addResizeHandles(table);
	initEditableTable(table);
}

function createDataRow(row: BomRow): HTMLTableRowElement {
	const tr = document.createElement('tr');

	const numTd = document.createElement('td');
	numTd.textContent = String(row.rowIndex);
	tr.appendChild(numTd);

	for (const col of STANDARD_COLUMNS) {
		const td = document.createElement('td');
		td.textContent = String(row[col.field] || '');
		td.title = String(row[col.field] || '');
		addTooltipSupport(td);
		tr.appendChild(td);
	}

	return tr;
}

function createDiffRow(row: BomRow | null, rowDiff: RowDiff, side: 'old' | 'new', index: number): HTMLTableRowElement {
	const tr = document.createElement('tr');
	tr.dataset.index = String(index);

	const rowClass = getRowClass(rowDiff.type, side);
	if (rowClass) tr.className = rowClass;

	const numTd = document.createElement('td');
	numTd.textContent = row ? String(row.rowIndex) : '';
	tr.appendChild(numTd);

	const changedFields = new Set(rowDiff.cellDiffs.map(d => d.field));

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
