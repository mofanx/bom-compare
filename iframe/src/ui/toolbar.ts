import type { FilterType, RowDiff } from '../types';
import { state } from './state';
import { parseFile } from '../core/parser';
import { compare } from '../core/comparator';
import { exportReport, exportBomFile } from '../core/exporter';
import { showLoading, updateLoadingProgress, hideLoading } from './loading';
import { showToast } from './drop-zone';
import { t } from '../utils/i18n';
import { showColumnSettingsDialog } from './column-settings-dialog';
import { renderDiffResult, filterRows, performSearch, renderTable } from './table';
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
	const searchClear = document.getElementById('search-clear')!;
	const btnColumnSettings = document.getElementById('btn-column-settings')!;
	const btnSearchMode = document.getElementById('btn-search-mode')!;
	const btnFilterMode = document.getElementById('btn-filter-mode')!;

	oldImport.addEventListener('click', () => openFileDialog('old'));
	newImport.addEventListener('click', () => openFileDialog('new'));
	oldSave.addEventListener('click', () => saveFile('old'));
	newSave.addEventListener('click', () => saveFile('new'));
	oldClear.addEventListener('click', () => clearPanel('old'));
	newClear.addEventListener('click', () => clearPanel('new'));

	btnColumnSettings.addEventListener('click', () => showColumnSettingsDialog());

	// 搜索模式切换
	btnSearchMode.addEventListener('click', () => {
		state.searchMode = 'search';
		btnSearchMode.classList.add('active');
		btnFilterMode.classList.remove('active');
		performSearch();
	});

	btnFilterMode.addEventListener('click', () => {
		state.searchMode = 'filter';
		btnFilterMode.classList.add('active');
		btnSearchMode.classList.remove('active');
		performSearch();
	});

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
		state.selectedRowIndex = -1;
		if (state.diffResult) renderDiffResult();
	});

	searchInput.addEventListener('input', () => {
		state.searchKeyword = searchInput.value;
		state.selectedRowIndex = -1;
		performSearch();
		// Show/hide clear button based on input value
		searchClear.style.display = searchInput.value ? 'flex' : 'none';
	});

	searchClear.addEventListener('click', () => {
		searchInput.value = '';
		state.searchKeyword = '';
		state.selectedRowIndex = -1;
		searchClear.style.display = 'none';
		performSearch();
		searchInput.focus();
	});

	document.addEventListener('bom:recompare', () => {
		if (state.oldFile && state.newFile) {
			const result = compare(state.oldFile, state.newFile);
			state.diffResult = result;
			state.selectedRowIndex = -1;
			renderDiffResult();
		}
	});

	// 点击表格外区域时取消选中
	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		const tableLeft = document.getElementById('table-left');
		const tableRight = document.getElementById('table-right');
		
		// 如果点击的不是表格内的行，则取消选中
		if (state.selectedRowIndex !== -1 && 
		    !target.closest('tr[data-index]') &&
		    !target.closest('.btn') &&
		    !target.closest('select') &&
		    !target.closest('input')) {
			state.selectedRowIndex = -1;
			document.querySelectorAll('.selected-row, .current-diff-row').forEach(el => {
				el.classList.remove('selected-row', 'current-diff-row');
			});
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

	// 保存对比结果状态，用于判断是否需要恢复另一侧
	const hadDiffResult = !!state.diffResult;
	state.diffResult = null;

	// 隐藏差异导航和筛选按钮
	(document.getElementById('btn-prev-diff')! as HTMLElement).classList.remove('visible');
	(document.getElementById('btn-next-diff')! as HTMLElement).classList.remove('visible');
	(document.getElementById('filter-select')! as HTMLElement).classList.remove('visible');
	(document.getElementById('btn-export')! as HTMLElement).classList.remove('visible');
	document.getElementById('summary-text')!.textContent = t('summaryText');
	document.getElementById('summary-badges')!.innerHTML = '';

	// 恢复另一侧到非对比状态（仅在执行了BOM对比后）
	const otherSide = side === 'old' ? 'new' : 'old';
	const otherFile = otherSide === 'old' ? state.oldFile : state.newFile;
	if (otherFile && hadDiffResult) {
		const otherTableId = otherSide === 'old' ? 'table-left' : 'table-right';
		const otherContainer = document.getElementById(otherTableId)!;
		renderTable(otherContainer, otherFile, otherSide);

		// 如果有文本搜索关键词，重新应用搜索或筛选
		if (state.searchKeyword) {
			performSearch();
		}
	}
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
		state.selectedRowIndex = -1;

		updateLoadingProgress(100);
		hideLoading();

		renderDiffResult();
		(document.getElementById('btn-export')! as HTMLElement).classList.add('visible');
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

	// 找到当前选中索引在 diffIndices 中的位置
	const currentIndexInDiff = diffIndices.indexOf(state.selectedRowIndex);

	if (direction === 'next') {
		if (currentIndexInDiff === -1) {
			// 如果选中的行不是差异行，从选中行之后找第一个差异行
			const nextDiff = diffIndices.find(i => i > state.selectedRowIndex);
			state.selectedRowIndex = nextDiff !== undefined ? nextDiff : diffIndices[0];
		} else if (currentIndexInDiff === diffIndices.length - 1) {
			// 如果已经是最后一个差异行，跳转到第一个
			state.selectedRowIndex = diffIndices[0];
		} else {
			// 从当前差异行的下一个差异行开始
			state.selectedRowIndex = diffIndices[currentIndexInDiff + 1];
		}
	} else {
		if (currentIndexInDiff === -1) {
			// 如果选中的行不是差异行，从选中行之前找第一个差异行
			const prevDiff = [...diffIndices].reverse().find(i => i < state.selectedRowIndex);
			state.selectedRowIndex = prevDiff !== undefined ? prevDiff : diffIndices[diffIndices.length - 1];
		} else if (currentIndexInDiff === 0) {
			// 如果已经是第一个差异行，跳转到最后一个
			state.selectedRowIndex = diffIndices[diffIndices.length - 1];
		} else {
			// 从当前差异行的上一个差异行开始
			state.selectedRowIndex = diffIndices[currentIndexInDiff - 1];
		}
	}

	scrollToRow(state.selectedRowIndex);
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
	document.querySelectorAll('.selected-row, .current-diff-row').forEach(el => {
		el.classList.remove('selected-row', 'current-diff-row');
	});

	const selector = `tr[data-index="${index}"]`;
	document.getElementById('table-left')?.querySelector(selector)?.classList.add('selected-row');
	document.getElementById('table-right')?.querySelector(selector)?.classList.add('selected-row');
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
