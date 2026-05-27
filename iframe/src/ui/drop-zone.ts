import type { BomFile } from '../types';
import { parseFile } from '../core/parser';
import { state } from './state';
import { showLoading, updateLoadingProgress, hideLoading } from './loading';
import { t } from '../utils/i18n';
import { renderTable } from './table';
import { performSearch } from './table';

const SUPPORTED_EXTENSIONS = ['.csv', '.txt', '.xls', '.xlsx'];

function isSupportedFile(file: File): boolean {
	const ext = '.' + file.name.split('.').pop()?.toLowerCase();
	return SUPPORTED_EXTENSIONS.includes(ext);
}

function setupDropZone(zoneId: string, side: 'old' | 'new'): void {
	const zone = document.getElementById(zoneId)!;

	zone.addEventListener('dragover', (e) => {
		e.preventDefault();
		zone.classList.add('drag-over');
		zone.classList.remove('drag-reject');
	});

	zone.addEventListener('dragleave', () => {
		zone.classList.remove('drag-over', 'drag-reject');
	});

	zone.addEventListener('drop', async (e) => {
		e.preventDefault();
		zone.classList.remove('drag-over', 'drag-reject');

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) {
			showToast(t('noFileDetected'), 'warning');
			return;
		}

		const file = files[0];
		if (!isSupportedFile(file)) {
			zone.classList.add('drag-reject');
			setTimeout(() => zone.classList.remove('drag-reject'), 2000);
			showToast(t('unsupportedFormat'), 'error');
			return;
		}

		await loadFile(file, side);
	});
}

function setupFileRowDrop(side: 'old' | 'new'): void {
	const fileGroup = side === 'old'
		? document.querySelector('.file-row .file-group:first-child')
		: document.querySelector('.file-row .file-group:last-child');

	if (!fileGroup) return;

	fileGroup.addEventListener('dragover', (e) => {
		e.preventDefault();
		e.stopPropagation();
		fileGroup.classList.add('drag-over');
	});

	fileGroup.addEventListener('dragleave', (e) => {
		e.preventDefault();
		e.stopPropagation();
		// 只在真正离开元素时移除类，避免子元素触发dragleave
		if (!fileGroup.contains((e as DragEvent).relatedTarget as Node)) {
			fileGroup.classList.remove('drag-over');
		}
	});

	fileGroup.addEventListener('drop', async (e) => {
		e.preventDefault();
		e.stopPropagation();
		fileGroup.classList.remove('drag-over');

		const files = (e as DragEvent).dataTransfer?.files;
		if (!files || files.length === 0) {
			showToast(t('noFileDetected'), 'warning');
			return;
		}

		const file = files[0];
		if (!isSupportedFile(file)) {
			showToast(t('unsupportedFormat'), 'error');
			return;
		}

		await loadFile(file, side);
	});
}

function setupTableDrop(tableId: string, side: 'old' | 'new'): void {
	const tableContainer = document.getElementById(tableId);
	if (!tableContainer) return;

	tableContainer.addEventListener('dragover', (e) => {
		e.preventDefault();
		e.stopPropagation();
		tableContainer.classList.add('drag-over');
	});

	tableContainer.addEventListener('dragleave', (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (!tableContainer.contains((e as DragEvent).relatedTarget as Node)) {
			tableContainer.classList.remove('drag-over');
		}
	});

	tableContainer.addEventListener('drop', async (e) => {
		e.preventDefault();
		e.stopPropagation();
		tableContainer.classList.remove('drag-over');

		const files = (e as DragEvent).dataTransfer?.files;
		if (!files || files.length === 0) {
			showToast(t('noFileDetected'), 'warning');
			return;
		}

		const file = files[0];
		if (!isSupportedFile(file)) {
			showToast(t('unsupportedFormat'), 'error');
			return;
		}

		await loadFile(file, side);
	});
}

export async function loadFile(file: File, side: 'old' | 'new'): Promise<void> {
	const pathInput = document.getElementById(`${side === 'old' ? 'old' : 'new'}-file-path`) as HTMLInputElement;
	pathInput.value = file.name;
	pathInput.title = file.name;

	try {
		showLoading(t('parsingFile', { filename: file.name }));
		updateLoadingProgress(20);

		const bomFile = await parseFile(file);
		updateLoadingProgress(80);

		if (bomFile.rows.length === 0) {
			hideLoading();
			showToast(t('noValidData'), 'warning');
			return;
		}

		updateLoadingProgress(100);

		// 如果有对比结果，清空它并隐藏差异导航和筛选按钮
		if (state.diffResult) {
			state.diffResult = null;
			(document.getElementById('btn-prev-diff')! as HTMLElement).classList.remove('visible');
			(document.getElementById('btn-next-diff')! as HTMLElement).classList.remove('visible');
			(document.getElementById('filter-select')! as HTMLElement).classList.remove('visible');
			(document.getElementById('btn-export')! as HTMLElement).classList.remove('visible');
			document.getElementById('summary-text')!.textContent = t('summaryText');
			document.getElementById('summary-badges')!.innerHTML = '';

			// 恢复另一侧到非对比状态
			const otherSide = side === 'old' ? 'new' : 'old';
			const otherFile = otherSide === 'old' ? state.oldFile : state.newFile;
			if (otherFile) {
				const otherTableId = otherSide === 'old' ? 'table-left' : 'table-right';
				const otherContainer = document.getElementById(otherTableId)!;
				renderTable(otherContainer, otherFile, otherSide);
			}
		}

		if (side === 'old') {
			state.oldFile = bomFile;
		} else {
			state.newFile = bomFile;
		}

		const tableId = side === 'old' ? 'table-left' : 'table-right';
		const dropZoneId = side === 'old' ? 'drop-zone-left' : 'drop-zone-right';
		const panelId = side === 'old' ? 'panel-left' : 'panel-right';

		(document.getElementById(dropZoneId)! as HTMLElement).style.display = 'none';
		(document.querySelector(`#${panelId} .panel-label`)! as HTMLElement).style.display = 'none';
		const tableContainer = document.getElementById(tableId)! as HTMLElement;
		tableContainer.style.display = 'block';
		renderTable(tableContainer, bomFile, side);

		hideLoading();
		showToast(t('loadSuccess', { filename: file.name, rowCount: bomFile.rows.length + 1 }), 'success');

		// 如果有搜索关键词，自动触发搜索
		if (state.searchKeyword) {
			performSearch();
		}

		// Check for duplicate columns and show warning
		if (bomFile.duplicateColumns && bomFile.duplicateColumns.length > 0) {
			const duplicateWarnings = bomFile.duplicateColumns.map(dup => {
				const conflictList = dup.conflictWith.join(', ');
				return t('duplicateColumnWarning', {
					field: dup.targetField,
					kept: dup.sourceColumn,
					ignored: conflictList
				});
			});
			setTimeout(() => {
				duplicateWarnings.forEach(warning => showToast(warning, 'warning'));
			}, 500);
		}
	} catch (err) {
		hideLoading();
		const errMsg = err instanceof Error ? err.message : String(err);
		console.error('loadFile error:', err);
		showToast(t('loadFailed', { error: errMsg }), 'error');
	}
}

export function showToast(message: string, type: 'error' | 'success' | 'warning'): void {
	// 尝试使用SDK的toast API
	// @ts-ignore - eda对象由嘉立创EDA环境提供
	if (typeof eda !== 'undefined' && eda.sys_Message && eda.sys_Message.showToastMessage) {
		// @ts-ignore - 使用SDK的toast API
		eda.sys_Message.showToastMessage(message);
		return;
	}

	// 降级方案：使用自定义toast
	const existing = document.querySelector('.toast');
	if (existing) existing.remove();

	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.textContent = message;
	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 3000);
}

export function initDropZones(): void {
	setupDropZone('drop-zone-left', 'old');
	setupDropZone('drop-zone-right', 'new');

	// 为文件行添加拖拽支持
	setupFileRowDrop('old');
	setupFileRowDrop('new');

	// 为预览区表格添加拖拽支持
	setupTableDrop('table-left', 'old');
	setupTableDrop('table-right', 'new');

	// 阻止 window 级别的默认拖放行为，防止文件被浏览器下载
	window.addEventListener('dragover', (e) => {
		e.preventDefault();
	});

	window.addEventListener('drop', (e) => {
		e.preventDefault();
	});

	// 静态file input的change事件——label原生触发，在iframe中可靠
	const fileInputOld = document.getElementById('file-input-old') as HTMLInputElement;
	const fileInputNew = document.getElementById('file-input-new') as HTMLInputElement;

	if (fileInputOld) {
		fileInputOld.addEventListener('change', () => {
			const file = fileInputOld.files?.[0];
			if (file) {
				loadFile(file, 'old');
				fileInputOld.value = '';
			}
		});
	}

	if (fileInputNew) {
		fileInputNew.addEventListener('change', () => {
			const file = fileInputNew.files?.[0];
			if (file) {
				loadFile(file, 'new');
				fileInputNew.value = '';
			}
		});
	}
}
