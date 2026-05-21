import type { FilterType, RowDiff } from '../types';
import { state } from './state';
import { parseFile } from '../core/parser';
import { compare } from '../core/comparator';
import { exportReport, exportBomFile } from '../core/exporter';
import { showLoading, updateLoadingProgress, hideLoading } from './loading';
import { showToast } from './drop-zone';
import { t } from '../utils/i18n';
import { renderDiffResult, filterRows } from './table';
import { loadFile } from './drop-zone';
import { commitEditing } from './editable';

export function initToolbar(): void {
	const oldImport = document.getElementById('old-file-import')!;
	const newImport = document.getElementById('new-file-import')!;
	const oldSave = document.getElementById('old-file-save')!;
	const newSave = document.getElementById('new-file-save')!;
	const oldClear = document.getElementById('old-file-clear')!;
	const newClear = document.getElementById('new-file-clear')!;
	const btnCompare = document.getElementById('btn-compare')!;
	const btnExport = document.getElementById('btn-export')!;
	const btnPrevDiff = document.getElementById('btn-prev-diff')!;
	const btnNextDiff = document.getElementById('btn-next-diff')!;
	const filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
	const searchInput = document.getElementById('search-input') as HTMLInputElement;

	oldImport.addEventListener('click', () => openFileDialog('old'));
	newImport.addEventListener('click', () => openFileDialog('new'));
	oldSave.addEventListener('click', () => saveFile('old'));
	newSave.addEventListener('click', () => saveFile('new'));
	oldClear.addEventListener('click', () => clearPanel('old'));
	newClear.addEventListener('click', () => clearPanel('new'));

	btnCompare.addEventListener('click', executeCompare);
	btnExport.addEventListener('click', async () => {
		if (state.diffResult) {
			try {
				await exportReport(state.diffResult);
				showToast(t('exportSuccess'), 'success');
			} catch (error) {
				if ((error as Error).name === 'AbortError') return;
				showToast(t('saveError'), 'error');
			}
		}
	});

	btnPrevDiff.addEventListener('click', () => navigateDiff('prev'));
	btnNextDiff.addEventListener('click', () => navigateDiff('next'));

	filterSelect.addEventListener('change', () => {
		state.filter = filterSelect.value as FilterType;
		state.currentDiffIndex = -1;
		if (state.diffResult) renderDiffResult();
	});

	searchInput.addEventListener('input', () => {
		state.searchKeyword = searchInput.value;
		state.currentDiffIndex = -1;
		if (state.diffResult) renderDiffResult();
	});

	document.addEventListener('bom:recompare', () => {
		if (state.oldFile && state.newFile) {
			const result = compare(state.oldFile, state.newFile);
			state.diffResult = result;
			state.currentDiffIndex = -1;
			renderDiffResult();
		}
	});
}

function clearPanel(side: 'old' | 'new'): void {
	const pathInput = document.getElementById(`${side === 'old' ? 'old' : 'new'}-file-path`) as HTMLInputElement;
	pathInput.value = '';

	if (side === 'old') {
		state.oldFile = null;
	} else {
		state.newFile = null;
	}

	const tableId = side === 'old' ? 'table-left' : 'table-right';
	const dropZoneId = side === 'old' ? 'drop-zone-left' : 'drop-zone-right';
	const panelId = side === 'old' ? 'panel-left' : 'panel-right';

	(document.getElementById(tableId)! as HTMLElement).style.display = 'none';
	(document.getElementById(tableId)! as HTMLElement).innerHTML = '';
	(document.getElementById(dropZoneId)! as HTMLElement).style.display = 'flex';
	(document.querySelector(`#${panelId} .panel-label`)! as HTMLElement).style.display = 'block';

	state.diffResult = null;
	(document.getElementById('btn-export')! as HTMLElement).style.display = 'none';
	document.getElementById('summary-text')!.textContent = t('summaryText');
	document.getElementById('summary-badges')!.innerHTML = '';
}

async function executeCompare(): Promise<void> {
	commitEditing();
	if (!state.oldFile && !state.newFile) {
		showToast(t('needBothFiles'), 'warning');
		return;
	}
	if (!state.oldFile) {
		showToast(t('needOldFile'), 'warning');
		return;
	}
	if (!state.newFile) {
		showToast(t('needNewFile'), 'warning');
		return;
	}

	try {
		showLoading(t('compareSuccess'));
		updateLoadingProgress(50);

		const result = compare(state.oldFile, state.newFile);
		state.diffResult = result;
		state.currentDiffIndex = -1;

		updateLoadingProgress(100);
		hideLoading();

		renderDiffResult();
		document.getElementById('btn-export')!.style.display = 'inline-flex';
		showToast(t('compareSuccess'), 'success');
	} catch (error) {
		hideLoading();
		showToast(t('compareError'), 'error');
	}
}

function navigateDiff(direction: 'prev' | 'next'): void {
	if (!state.diffResult) {
		showToast(t('needCompare'), 'warning');
		return;
	}

	const filteredRows = filterRows(state.diffResult.rows);
	
	// 获取所有差异行的原始索引
	const diffIndices = filteredRows
		.map((row, filteredIndex) => {
			// 找到该行在原始 diffResult.rows 中的索引
			const originalIndex = state.diffResult!.rows.indexOf(row);
			return row.type !== 'same' ? originalIndex : -1;
		})
		.filter(i => i >= 0);

	if (diffIndices.length === 0) {
		showToast(t('noDiff'), 'success');
		return;
	}

	// 找到当前索引在 diffIndices 中的位置
	const currentIndexInDiff = diffIndices.indexOf(state.currentDiffIndex);

	if (direction === 'next') {
		// 如果当前不在差异列表中，或已经是最后一个，则跳转到第一个
		if (currentIndexInDiff === -1 || currentIndexInDiff === diffIndices.length - 1) {
			state.currentDiffIndex = diffIndices[0];
		} else {
			state.currentDiffIndex = diffIndices[currentIndexInDiff + 1];
		}
	} else {
		// 如果当前不在差异列表中，或已经是第一个，则跳转到最后一个
		if (currentIndexInDiff === -1 || currentIndexInDiff === 0) {
			state.currentDiffIndex = diffIndices[diffIndices.length - 1];
		} else {
			state.currentDiffIndex = diffIndices[currentIndexInDiff - 1];
		}
	}

	scrollToRow(state.currentDiffIndex);
}

function scrollToRow(originalIndex: number): void {
	const filteredRows = filterRows(state.diffResult!.rows);
	
	// 找到原始索引在过滤后数组中的位置
	const filteredIndex = filteredRows.findIndex(row => {
		const originalIdx = state.diffResult!.rows.indexOf(row);
		return originalIdx === originalIndex;
	});

	if (filteredIndex === -1) return;

	highlightCurrentDiffRow(filteredIndex);

	const container = document.getElementById('table-left');
	if (!container) return;

	const row = container.querySelector(`tr[data-index="${filteredIndex}"]`) as HTMLElement;
	if (!row) return;

	const containerRect = container.getBoundingClientRect();
	const rowRect = row.getBoundingClientRect();
	const offset = rowRect.top - containerRect.top + container.scrollTop;
	container.scrollTop = offset - container.clientHeight / 2 + row.offsetHeight / 2;
}

function highlightCurrentDiffRow(index: number): void {
	document.querySelectorAll('.current-diff-row').forEach(el => el.classList.remove('current-diff-row'));

	const selector = `tr[data-index="${index}"]`;
	document.getElementById('table-left')?.querySelector(selector)?.classList.add('current-diff-row');
	document.getElementById('table-right')?.querySelector(selector)?.classList.add('current-diff-row');
}

async function openFileDialog(side: 'old' | 'new'): Promise<void> {
	// 动态创建文件输入元素
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.csv,.txt,.xls,.xlsx';
	input.style.display = 'none';
	input.onchange = (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			loadFile(file, side);
		}
	};
	document.body.appendChild(input);
	input.click();

	// 清理：点击后移除input元素
	setTimeout(() => {
		document.body.removeChild(input);
	}, 100);
}

async function saveFile(side: 'old' | 'new'): Promise<void> {
	commitEditing();

	const bomFile = side === 'old' ? state.oldFile : state.newFile;
	if (!bomFile) {
		showToast(t('needFile'), 'warning');
		return;
	}

	// Generate filename based on original filename or default
	const pathInput = document.getElementById(`${side}-file-path`) as HTMLInputElement;
	const originalPath = pathInput.value;
	let fileName = side === 'old' ? 'old-file.xlsx' : 'new-file.xlsx';

	if (originalPath) {
		const originalName = originalPath.split(/[\\/]/).pop() || '';
		const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
		if (nameWithoutExt) {
			fileName = `${nameWithoutExt}.xlsx`;
		}
	}

	try {
		await exportBomFile(bomFile, fileName);
		showToast(t('saveSuccess'), 'success');
	} catch (error) {
		if ((error as Error).name === 'AbortError') return;
		showToast(t('saveError'), 'error');
	}
}
