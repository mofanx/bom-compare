import type { BomFile } from '../types';
import { parseFile } from '../core/parser';
import { state } from './state';
import { showLoading, updateLoadingProgress, hideLoading } from './loading';
import { t } from '../utils/i18n';
import { renderTable } from './table';

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
			showToast('未检测到文件，请重试', 'warning');
			return;
		}

		const file = files[0];
		if (!isSupportedFile(file)) {
			zone.classList.add('drag-reject');
			setTimeout(() => zone.classList.remove('drag-reject'), 2000);
			showToast('不支持该文件格式，请使用 CSV/TXT/XLS/XLSX 文件', 'error');
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
		if (!fileGroup.contains(e.relatedTarget as Node)) {
			fileGroup.classList.remove('drag-over');
		}
	});

	fileGroup.addEventListener('drop', async (e) => {
		e.preventDefault();
		e.stopPropagation();
		fileGroup.classList.remove('drag-over');

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) {
			showToast('未检测到文件，请重试', 'warning');
			return;
		}

		const file = files[0];
		if (!isSupportedFile(file)) {
			showToast('不支持该文件格式，请使用 CSV/TXT/XLS/XLSX 文件', 'error');
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
		showLoading(`正在解析 ${file.name}...`);
		updateLoadingProgress(20);

		const bomFile = await parseFile(file);
		updateLoadingProgress(80);

		if (bomFile.rows.length === 0) {
			hideLoading();
			showToast('文件中未找到有效的 BOM 数据，请检查文件内容', 'warning');
			return;
		}

		updateLoadingProgress(100);

		if (side === 'old') {
			state.oldFile = bomFile;
		} else {
			state.newFile = bomFile;
		}

		const tableId = side === 'old' ? 'table-left' : 'table-right';
		const dropZoneId = side === 'old' ? 'drop-zone-left' : 'drop-zone-right';
		const panelId = side === 'old' ? 'panel-left' : 'panel-right';

		document.getElementById(dropZoneId)!.style.display = 'none';
		document.querySelector(`#${panelId} .panel-label`)!.style.display = 'none';
		const tableContainer = document.getElementById(tableId)!;
		tableContainer.style.display = 'block';
		renderTable(tableContainer, bomFile, side);

		hideLoading();
		showToast(`加载成功: ${file.name}（${bomFile.rows.length} 行）`, 'success');
	} catch (err) {
		hideLoading();
		const errMsg = err instanceof Error ? err.message : String(err);
		console.error('loadFile error:', err);
		showToast(`加载失败: ${errMsg}`, 'error');
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
