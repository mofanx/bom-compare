import type { ColumnMapping, RowDiff, CellDiff } from '../types';

let overlay: HTMLElement | null = null;

export function showColumnMappingDialog(
	headers: string[],
	currentMappings: ColumnMapping[],
	onConfirm: (mappings: ColumnMapping[]) => void,
): void {
	closeDialog();

	overlay = document.createElement('div');
	overlay.className = 'dialog-overlay';

	const dialog = document.createElement('div');
	dialog.className = 'dialog dialog-column-mapping';

	const header = document.createElement('div');
	header.className = 'dialog-header';
	header.innerHTML = `
		<h2>列映射配置</h2>
		<button class="dialog-close" title="关闭">×</button>
	`;
	dialog.appendChild(header);

	const body = document.createElement('div');
	body.className = 'dialog-body';

	const table = document.createElement('table');
	table.className = 'mapping-table';

	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');
	headerRow.innerHTML = `
		<th>原始列名</th>
		<th>映射到字段</th>
	`;
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	for (const header of headers) {
		const currentMapping = currentMappings.find(m => m.sourceColumn === header);
		const tr = document.createElement('tr');

		const tdSource = document.createElement('td');
		tdSource.textContent = header;
		tr.appendChild(tdSource);

		const tdTarget = document.createElement('td');
		const select = document.createElement('select');
		select.className = 'mapping-select';
		select.innerHTML = `
			<option value="ignore" ${currentMapping?.targetField === 'ignore' ? 'selected' : ''}>忽略</option>
			<option value="designator" ${currentMapping?.targetField === 'designator' ? 'selected' : ''}>位号</option>
			<option value="footprint" ${currentMapping?.targetField === 'footprint' ? 'selected' : ''}>封装</option>
			<option value="quantity" ${currentMapping?.targetField === 'quantity' ? 'selected' : ''}>数量</option>
			<option value="manufacturer" ${currentMapping?.targetField === 'manufacturer' ? 'selected' : ''}>制造商</option>
			<option value="partNumber" ${currentMapping?.targetField === 'partNumber' ? 'selected' : ''}>Part Number</option>
			<option value="value" ${currentMapping?.targetField === 'value' ? 'selected' : ''}>Value</option>
			<option value="description" ${currentMapping?.targetField === 'description' ? 'selected' : ''}>Description</option>
		`;
		tdTarget.appendChild(select);
		tr.appendChild(tdTarget);

		tbody.appendChild(tr);
	}
	table.appendChild(tbody);
	body.appendChild(table);

	const hint = document.createElement('div');
	hint.className = 'dialog-hint';
	hint.textContent = '选择原始列名对应的字段，选择"忽略"将不处理该列';
	body.appendChild(hint);

	dialog.appendChild(body);

	const footer = document.createElement('div');
	footer.className = 'dialog-footer';
	footer.innerHTML = `
		<button class="btn btn-secondary dialog-cancel">取消</button>
		<button class="btn btn-primary dialog-confirm">确认</button>
	`;
	dialog.appendChild(footer);

	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	// Event handlers
	const closeBtn = header.querySelector('.dialog-close') as HTMLButtonElement;
	const cancelBtn = footer.querySelector('.dialog-cancel') as HTMLButtonElement;
	const confirmBtn = footer.querySelector('.dialog-confirm') as HTMLButtonElement;

	closeBtn.addEventListener('click', closeDialog);
	cancelBtn.addEventListener('click', closeDialog);

	confirmBtn.addEventListener('click', () => {
		const mappings: ColumnMapping[] = [];
		const selects = tbody.querySelectorAll('.mapping-select') as NodeListOf<HTMLSelectElement>;
		selects.forEach((select, index) => {
			mappings.push({
				sourceColumn: headers[index],
				targetField: select.value as ColumnMapping['targetField'],
			});
		});
		onConfirm(mappings);
		closeDialog();
	});

	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) closeDialog();
	});
}

export function showHeaderDetailDialog(oldHeaders: string[], newHeaders: string[]): void {
	closeDialog();

	overlay = document.createElement('div');
	overlay.className = 'dialog-overlay';

	const dialog = document.createElement('div');
	dialog.className = 'dialog dialog-row-detail';

	const header = document.createElement('div');
	header.className = 'dialog-header';
	header.innerHTML = '<h2>表头差异对比</h2><button class="dialog-close" title="关闭">×</button>';
	dialog.appendChild(header);

	const body = document.createElement('div');
	body.className = 'dialog-body';

	const maxLen = Math.max(oldHeaders.length, newHeaders.length);
	let hasDiff = false;

	const table = document.createElement('table');
	table.className = 'detail-table';

	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');
	headerRow.innerHTML = '<th>列序号</th><th>旧文件表头</th><th>新文件表头</th>';
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	for (let i = 0; i < maxLen; i++) {
		const oldVal = oldHeaders[i] || '';
		const newVal = newHeaders[i] || '';
		const isDiff = oldVal !== newVal;
		if (isDiff) hasDiff = true;

		const tr = document.createElement('tr');
		if (isDiff) tr.className = 'cell-changed';

		tr.innerHTML = `
			<td>${String(i + 1)}</td>
			<td class="old-value">${oldVal || '-'}</td>
			<td class="new-value">${newVal || '-'}</td>
		`;
		tbody.appendChild(tr);
	}
	table.appendChild(tbody);
	body.appendChild(table);

	if (!hasDiff) {
		const noDiff = document.createElement('div');
		noDiff.className = 'no-diff';
		noDiff.textContent = '表头完全一致，无差异';
		body.appendChild(noDiff);
	}

	dialog.appendChild(body);

	const footer = document.createElement('div');
	footer.className = 'dialog-footer';
	footer.innerHTML = '<button class="btn btn-secondary dialog-close-btn">关闭</button>';
	dialog.appendChild(footer);

	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	const closeBtn = header.querySelector('.dialog-close') as HTMLButtonElement;
	const footerCloseBtn = footer.querySelector('.dialog-close-btn') as HTMLButtonElement;

	closeBtn.addEventListener('click', closeDialog);
	footerCloseBtn.addEventListener('click', closeDialog);

	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) closeDialog();
	});
}

export function showRowDetailDialog(rowDiff: RowDiff): void {
	closeDialog();

	overlay = document.createElement('div');
	overlay.className = 'dialog-overlay';

	const dialog = document.createElement('div');
	dialog.className = 'dialog dialog-row-detail';

	const header = document.createElement('div');
	header.className = 'dialog-header';
	header.innerHTML = `
		<h2>行详情对比 - ${rowDiff.oldRow?.designator || rowDiff.newRow?.designator || '未知'}</h2>
		<button class="dialog-close" title="关闭">×</button>
	`;
	dialog.appendChild(header);

	const body = document.createElement('div');
	body.className = 'dialog-body';

	const diffType = document.createElement('div');
	diffType.className = 'diff-type-badge';
	diffType.textContent = getDiffTypeLabel(rowDiff.type);
	body.appendChild(diffType);

	if (rowDiff.cellDiffs && rowDiff.cellDiffs.length > 0) {
		const table = document.createElement('table');
		table.className = 'detail-table';

		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		headerRow.innerHTML = `
			<th>字段</th>
			<th>旧值</th>
			<th>新值</th>
		`;
		thead.appendChild(headerRow);
		table.appendChild(thead);

		const tbody = document.createElement('tbody');
		for (const cellDiff of rowDiff.cellDiffs) {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>${cellDiff.field}</td>
				<td class="old-value">${cellDiff.oldValue || '-'}</td>
				<td class="new-value">${cellDiff.newValue || '-'}</td>
			`;
			tbody.appendChild(tr);
		}
		table.appendChild(tbody);
		body.appendChild(table);
	} else {
		const noDiff = document.createElement('div');
		noDiff.className = 'no-diff';
		noDiff.textContent = '无字段差异';
		body.appendChild(noDiff);
	}

	dialog.appendChild(body);

	const footer = document.createElement('div');
	footer.className = 'dialog-footer';
	footer.innerHTML = `
		<button class="btn btn-secondary dialog-close">关闭</button>
	`;
	dialog.appendChild(footer);

	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	// Event handlers
	const closeBtn = header.querySelector('.dialog-close') as HTMLButtonElement;
	const footerCloseBtn = footer.querySelector('.dialog-close') as HTMLButtonElement;

	closeBtn.addEventListener('click', closeDialog);
	footerCloseBtn.addEventListener('click', closeDialog);

	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) closeDialog();
	});
}

function getDiffTypeLabel(type: RowDiff['type']): string {
	switch (type) {
		case 'same':
			return '相同';
		case 'changed':
			return '变更';
		case 'added':
			return '新增';
		case 'removed':
			return '缺失';
		default:
			return '未知';
	}
}

export function closeDialog(): void {
	if (overlay) {
		overlay.remove();
		overlay = null;
	}
}
