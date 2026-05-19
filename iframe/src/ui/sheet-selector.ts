import { getSheetNames } from '../core/parser/excel-parser';
import { showRowDetailDialog } from './dialog';
import { t } from '../utils/i18n';

let currentResolve: ((value: string) => void) | null = null;

export function showSheetSelector(sheetNames: string[], defaultSheet: string = ''): Promise<string> {
	return new Promise((resolve) => {
		currentResolve = resolve;

		const overlay = document.createElement('div');
		overlay.className = 'dialog-overlay';

		const dialog = document.createElement('div');
		dialog.className = 'dialog dialog-sheet-selector';

		const header = document.createElement('div');
		header.className = 'dialog-header';

		const title = document.createElement('h2');
		title.textContent = t('selectSheet');
		header.appendChild(title);

		const closeBtn = document.createElement('button');
		closeBtn.className = 'dialog-close';
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', () => {
			overlay.remove();
			resolve(defaultSheet);
		});
		header.appendChild(closeBtn);

		dialog.appendChild(header);

		const body = document.createElement('div');
		body.className = 'dialog-body';

		const hint = document.createElement('p');
		hint.className = 'dialog-hint';
		hint.textContent = t('selectSheetHint');
		body.appendChild(hint);

		const sheetList = document.createElement('div');
		sheetList.className = 'sheet-list';

		sheetNames.forEach((name, index) => {
			const item = document.createElement('div');
			item.className = 'sheet-item';
			item.textContent = name;
			
			if (name === defaultSheet) {
				item.classList.add('sheet-item-selected');
			}

			item.addEventListener('click', () => {
				overlay.remove();
				resolve(name);
			});

			sheetList.appendChild(item);
		});

		body.appendChild(sheetList);
		dialog.appendChild(body);

		overlay.appendChild(dialog);
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
				resolve(defaultSheet);
			}
		});

		document.body.appendChild(overlay);
	});
}

export async function selectSheetForExcel(data: ArrayBuffer, fileName: string): Promise<string> {
	const sheetNames = getSheetNames(data);
	
	if (sheetNames.length <= 1) {
		return sheetNames[0] || '';
	}

	return await showSheetSelector(sheetNames, sheetNames[0]);
}
