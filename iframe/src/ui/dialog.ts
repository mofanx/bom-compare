import type { ColumnMapping, BomFile, RowDiff } from '../types';
import { getActiveColumns } from '../core/column-config';
import { t, getLanguage } from '../utils/i18n';

let overlay: HTMLElement | null = null;

export function showColumnMappingDialog(
	headers: string[],
	currentMappings: ColumnMapping[],
	onConfirm: (mappings: ColumnMapping[]) => void,
): void {
	closeDialog();

	const lang = getLanguage();
	overlay = document.createElement('div');
	overlay.className = 'dialog-overlay';

	const dialog = document.createElement('div');
	dialog.className = 'dialog dialog-column-mapping';

	const header = document.createElement('div');
	header.className = 'dialog-header';
	header.innerHTML = `
		<h2>${t('columnMappingTitle')}</h2>
		<button class="dialog-close" title="${t('close')}">×</button>
	`;
	dialog.appendChild(header);

	const body = document.createElement('div');
	body.className = 'dialog-body';

	const table = document.createElement('table');
	table.className = 'mapping-table';

	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');
	headerRow.innerHTML = `
		<th>${t('originalColumn')}</th>
		<th>${t('mapToField')}</th>
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

		const ignoreOpt = document.createElement('option');
		ignoreOpt.value = 'ignore';
		ignoreOpt.textContent = t('ignore');
		if (currentMapping?.targetField === 'ignore') ignoreOpt.selected = true;
		select.appendChild(ignoreOpt);

		for (const col of getActiveColumns()) {
			const opt = document.createElement('option');
			opt.value = col.field;
			opt.textContent = lang === 'zh-Hans' ? col.labelZh : col.label;
			if (currentMapping?.targetField === col.field) opt.selected = true;
			select.appendChild(opt);
		}

		tdTarget.appendChild(select);
		tr.appendChild(tdTarget);

		tbody.appendChild(tr);
	}
	table.appendChild(tbody);
	body.appendChild(table);

	const hint = document.createElement('div');
	hint.className = 'dialog-hint';
	hint.textContent = t('selectMappingHint');
	body.appendChild(hint);

	dialog.appendChild(body);

	const footer = document.createElement('div');
	footer.className = 'dialog-footer';
	footer.innerHTML = `
		<button class="btn btn-secondary dialog-cancel">${t('cancel')}</button>
		<button class="btn btn-primary dialog-confirm">${t('confirm')}</button>
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

export function showHeaderDetailDialog(oldFile: BomFile | null, newFile: BomFile | null): void {
	closeDialog();

	const lang = getLanguage();
	const oldMappings = oldFile?.columnMappings || [];
	const newMappings = newFile?.columnMappings || [];
	const oldHeaders = oldFile?.rawHeaders || [];
	const newHeaders = newFile?.rawHeaders || [];

	// 收集两侧都有映射的预设字段（取并集）
	const mappedFields = new Set<string>();
	for (const m of oldMappings) { if (m.targetField !== 'ignore') mappedFields.add(String(m.targetField)); }
	for (const m of newMappings) { if (m.targetField !== 'ignore') mappedFields.add(String(m.targetField)); }

	const columns = getActiveColumns()
		.filter(col => mappedFields.has(String(col.field)))
		.map(col => {
			const fieldName = String(col.field);
			const oldIdx = oldMappings.findIndex(m => String(m.targetField) === fieldName);
			const newIdx = newMappings.findIndex(m => String(m.targetField) === fieldName);
			const oldVal = oldIdx >= 0 ? (oldHeaders[oldIdx] || '') : '';
			const newVal = newIdx >= 0 ? (newHeaders[newIdx] || '') : '';
			return { label: lang === 'zh-Hans' ? col.labelZh : col.label, oldVal, newVal };
		});

	const diffLabels = columns.filter(c => c.oldVal !== c.newVal).map(c => c.label);

	const summaryText = diffLabels.length > 0
		? t('headerDiff', { columns: diffLabels.join('、') })
		: t('headerSame');

	_showCompareDialog(t('compareHeaderDiff'), t('oldHeader'), t('newHeader'), columns, summaryText);
}

export function showRowDetailDialog(rowDiff: RowDiff): void {
	closeDialog();

	const lang = getLanguage();
	const oldRow = rowDiff.oldRow;
	const newRow = rowDiff.newRow;
	const designator = oldRow?.designator || newRow?.designator || t('unknown');

	if (rowDiff.type === 'added' || rowDiff.type === 'removed') {
		const row = rowDiff.type === 'added' ? newRow : oldRow;
		const typeLabel = rowDiff.type === 'added' ? t('added') : t('removed');
		const fileLabel = rowDiff.type === 'added' ? t('newFile') : t('oldFile');
		const rowNum = row ? row.rowIndex + 2 : '?';

		const columns = getActiveColumns().map(col => ({
			label: lang === 'zh-Hans' ? col.labelZh : col.label,
			oldVal: rowDiff.type === 'removed' ? String(row?.[col.field] || '') : '',
			newVal: rowDiff.type === 'added' ? String(row?.[col.field] || '') : '',
		}));

		const summaryText = t('rowDiffSummary', { file: fileLabel, designator, rowNum });
		_showCompareDialog(t('compareRowDiff'), rowDiff.type === 'removed' ? `${t('oldFile')} ${t('row', { rowNum })}` : '', rowDiff.type === 'added' ? `${t('newFile')} ${t('row', { rowNum })}` : '', columns, summaryText, typeLabel);
	} else {
		const diffFieldSet = new Set(rowDiff.cellDiffs.map(d => d.field));
		const oldNum = oldRow ? oldRow.rowIndex + 2 : '?';
		const newNum = newRow ? newRow.rowIndex + 2 : '?';

		const columns = getActiveColumns().map(col => ({
			label: lang === 'zh-Hans' ? col.labelZh : col.label,
			oldVal: oldRow ? String(oldRow[col.field] || '') : '',
			newVal: newRow ? String(newRow[col.field] || '') : '',
			isDiff: diffFieldSet.has(String(col.field)),
		}));

		const diffLabels = columns.filter(c => c.isDiff).map(c => c.label);
		const summaryText = diffLabels.length > 0
			? t('rowDiffDetail', { oldNum, newNum, designator, columns: diffLabels.join('、') })
			: t('rowDiffSame', { oldNum, newNum, designator });

		_showCompareDialog(t('compareRowDiff'), `${t('oldFile')} ${t('row', { rowNum: oldNum })}`, `${t('newFile')} ${t('row', { rowNum: newNum })}`, columns, summaryText);
	}
}

// 内部通用横向对比弹窗
function _showCompareDialog(
	title: string,
	oldLabel: string,
	newLabel: string,
	columns: Array<{ label: string; oldVal: string; newVal: string; isDiff?: boolean }>,
	summaryText: string,
	badge?: string,
): void {
	overlay = document.createElement('div');
	overlay.className = 'dialog-overlay';

	const dialog = document.createElement('div');
	dialog.className = 'dialog dialog-row-detail';
	dialog.style.cssText = 'min-width: 520px; max-width: 90vw; overflow: hidden;';

	// Header
	const dialogHeader = document.createElement('div');
	dialogHeader.className = 'dialog-header';
	dialogHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;';
	const h2 = document.createElement('h2');
	h2.textContent = title;
	h2.style.cssText = 'font-size: 13px; font-weight: 600; margin: 0; color: var(--text);';
	const closeBtn = document.createElement('button');
	closeBtn.className = 'dialog-close';
	closeBtn.title = t('close');
	closeBtn.textContent = '×';
	closeBtn.style.cssText = 'position: static; width: 22px; height: 22px; line-height: 22px; font-size: 16px; padding: 0; display: flex; align-items: center; justify-content: center;';
	dialogHeader.appendChild(h2);
	dialogHeader.appendChild(closeBtn);
	dialog.appendChild(dialogHeader);

	// Body
	const body = document.createElement('div');
	body.className = 'dialog-body';
	body.style.cssText = 'padding: 16px; overflow-x: auto; overflow-y: auto; max-height: calc(80vh - 100px);';

	if (badge) {
		const badgeEl = document.createElement('span');
		badgeEl.textContent = badge;
		badgeEl.style.cssText = 'display: inline-block; margin-bottom: 10px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: var(--warning-bg); color: var(--warning);';
		body.appendChild(badgeEl);
	}

	// Compare table
	const table = document.createElement('table');
	table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px; white-space: nowrap;';

	// thead: column labels
	const thead = document.createElement('thead');
	const theadTr = document.createElement('tr');
	const emptyTh = document.createElement('th');
	emptyTh.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); background: var(--bg-elevated); min-width: 100px; text-align: left;';
	theadTr.appendChild(emptyTh);
	for (const col of columns) {
		const th = document.createElement('th');
		th.textContent = col.label;
		th.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); background: var(--bg-elevated); text-align: center; font-weight: 500; color: var(--text-secondary);';
		theadTr.appendChild(th);
	}
	thead.appendChild(theadTr);
	table.appendChild(thead);

	// tbody: old row + new row
	const tbody = document.createElement('tbody');

	const buildRow = (label: string, getValue: (c: typeof columns[0]) => string, isOld: boolean) => {
		if (!label) return;
		const tr = document.createElement('tr');
		const labelTd = document.createElement('td');
		labelTd.textContent = label;
		labelTd.style.cssText = 'padding: 7px 12px; border: 1px solid var(--border); font-weight: 600; color: var(--text-secondary); white-space: nowrap; background: var(--bg-elevated);';
		tr.appendChild(labelTd);

		for (const col of columns) {
			const val = getValue(col);
			const isDiff = col.isDiff !== undefined ? col.isDiff : col.oldVal !== col.newVal;
			const td = document.createElement('td');
			td.textContent = val || '-';
			td.style.cssText = 'padding: 7px 12px; border: 1px solid var(--border); text-align: center;';
			if (isDiff && col.oldVal !== col.newVal) {
				td.style.cssText += isOld
					? 'background: rgba(248,113,113,0.15); color: #fca5a5; font-weight: 500;'
					: 'background: rgba(96,165,250,0.15); color: #93c5fd; font-weight: 500;';
			} else {
				td.style.cssText += 'color: var(--text-secondary);';
			}
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	};

	buildRow(oldLabel, c => c.oldVal, true);
	buildRow(newLabel, c => c.newVal, false);
	table.appendChild(tbody);
	body.appendChild(table);

	// Summary
	const summary = document.createElement('div');
	summary.textContent = summaryText;
	summary.style.cssText = 'margin-top: 12px; padding: 8px 12px; background: var(--bg-hover); border-radius: 4px; font-size: 12px; color: var(--text-secondary); line-height: 1.6;';
	body.appendChild(summary);

	dialog.appendChild(body);

	// Footer
	const footer = document.createElement('div');
	footer.className = 'dialog-footer';
	footer.style.cssText = 'padding: 10px 16px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; flex-shrink: 0;';
	const footerCloseBtn = document.createElement('button');
	footerCloseBtn.className = 'btn btn-secondary';
	footerCloseBtn.textContent = t('close');
	footer.appendChild(footerCloseBtn);
	dialog.appendChild(footer);

	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	closeBtn.addEventListener('click', closeDialog);
	footerCloseBtn.addEventListener('click', closeDialog);
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) closeDialog();
	});
}

export function closeDialog(): void {
	if (overlay) {
		overlay.remove();
		overlay = null;
	}
}
