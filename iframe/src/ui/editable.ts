import type { BomRow } from '../types';
import { state } from './state';

let editingCell: { td: HTMLTableCellElement; input: HTMLInputElement } | null = null;

export function initEditableTable(table: HTMLTableElement): void {
	table.addEventListener('click', handleCellClick);
	document.addEventListener('click', handleDocumentClick);
	document.addEventListener('keydown', handleKeyDown);
}

function handleCellClick(e: MouseEvent): void {
	const target = e.target as HTMLElement;
	const td = target.closest('td') as HTMLTableCellElement;
	
	if (!td || td.classList.contains('cell-no-edit') || td.querySelector('input')) return;
	
	// Only allow editing on the new file side
	const table = td.closest('table') as HTMLTableElement;
	const container = table.parentElement;
	if (!container || !container.id.includes('right')) return;
	
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
		
		// Update the state with the new value
		const tr = td.closest('tr') as HTMLTableRowElement;
		const rowIndex = parseInt(tr.dataset.index || '0', 10);
		const table = td.closest('table') as HTMLTableElement;
		const container = table.parentElement;
		
		if (container?.id === 'table-right' && state.diffResult) {
			const side = 'new';
			const filteredRows = getFilteredRows();
			const rowDiff = filteredRows[rowIndex];
			
			if (rowDiff && rowDiff.newRow) {
				const th = td.closest('table')?.querySelector(`th[data-field]`) as HTMLTableHeaderCellElement;
				if (th) {
					const field = th.dataset.field as keyof BomRow;
					if (field) {
						rowDiff.newRow[field] = newValue;
					}
				}
			}
		}
	} else {
		td.textContent = editingCell.input.value;
	}
	
	editingCell = null;
}

function getFilteredRows() {
	if (!state.diffResult) return [];
	
	let rows = state.diffResult.rows;
	
	// Apply filter
	if (state.filterType === 'diff') {
		rows = rows.filter(r => r.type === 'changed');
	} else if (state.filterType === 'added') {
		rows = rows.filter(r => r.type === 'added');
	} else if (state.filterType === 'removed') {
		rows = rows.filter(r => r.type === 'removed');
	} else if (state.filterType === 'same') {
		rows = rows.filter(r => r.type === 'same');
	}
	
	// Apply search
	if (state.searchQuery) {
		const query = state.searchQuery.toLowerCase();
		rows = rows.filter(r => {
			const row = r.oldRow || r.newRow;
			return row?.designator?.toLowerCase().includes(query);
		});
	}
	
	// Apply sorting
	if (state.sortField) {
		rows.sort((a, b) => {
			const order = state.sortDirection === 'asc' ? 1 : -1;
			const rowA = a.oldRow || a.newRow;
			const rowB = b.oldRow || b.newRow;
			const valA = rowA?.[state.sortField as keyof BomRow] || '';
			const valB = rowB?.[state.sortField as keyof BomRow] || '';
			return order * String(valA).localeCompare(String(valB));
		});
	}
	
	return rows;
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
		
		// Move to next cell
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
