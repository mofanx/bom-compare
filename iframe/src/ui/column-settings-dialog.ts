import type { FieldConfig } from '../types';
import { getColumnConfig, saveColumnConfig, resetColumnConfig, getDefaultFields } from '../core/column-config';
import { getLanguage, t } from '../utils/i18n';
import { state } from './state';
import { mapColumns } from '../core/column-mapper';
import { renderTable } from './table';
import { compare } from '../core/comparator';
import { showToast } from './drop-zone';
import { closeDialog } from './dialog';

let overlay: HTMLElement | null = null;

export function showColumnSettingsDialog(): void {
	closeCurrentOverlay();

	const lang = getLanguage();
	let config = JSON.parse(JSON.stringify(getColumnConfig())) as FieldConfig[];

	overlay = document.createElement('div');
	overlay.className = 'dialog-overlay';

	const dialog = document.createElement('div');
	dialog.className = 'dialog dialog-column-settings';

	// Header
	const header = document.createElement('div');
	header.className = 'dialog-header';
	header.innerHTML = `<h2>${t('columnSettings')}</h2><button class="dialog-close" title="${t('close')}">×</button>`;
	dialog.appendChild(header);

	// Body
	const body = document.createElement('div');
	body.className = 'dialog-body';

	const cardsContainer = document.createElement('div');
	cardsContainer.className = 'field-cards';
	body.appendChild(cardsContainer);

	function renderCards(): void {
		cardsContainer.innerHTML = '';
		for (let fi = 0; fi < config.length; fi++) {
			cardsContainer.appendChild(createFieldCard(config[fi], fi, lang, () => renderCards(), config));
		}
	}
	renderCards();

	// Add field button
	const addFieldBtn = document.createElement('button');
	addFieldBtn.className = 'add-field-btn';
	addFieldBtn.textContent = `+ ${t('addColumn')}`;
	addFieldBtn.addEventListener('click', () => {
		showAddFieldForm(cardsContainer, config, lang, () => renderCards());
	});
	body.appendChild(addFieldBtn);

	dialog.appendChild(body);

	// Footer
	const footer = document.createElement('div');
	footer.className = 'dialog-footer';

	const resetBtn = document.createElement('button');
	resetBtn.className = 'btn btn-secondary';
	resetBtn.textContent = t('resetDefaults');
	resetBtn.addEventListener('click', () => {
		if (confirm(t('resetConfirm'))) {
			config = getDefaultFields();
			renderCards();
		}
	});
	footer.appendChild(resetBtn);

	const rightActions = document.createElement('div');
	rightActions.className = 'dialog-footer-actions';

	const cancelBtn = document.createElement('button');
	cancelBtn.className = 'btn btn-secondary';
	cancelBtn.textContent = t('close');
	cancelBtn.addEventListener('click', closeCurrentOverlay);
	rightActions.appendChild(cancelBtn);

	const saveBtn = document.createElement('button');
	saveBtn.className = 'btn btn-primary';
	saveBtn.textContent = t('save') || '保存';
	saveBtn.addEventListener('click', () => {
		if (!validateConfig(config)) return;
		saveColumnConfig(config);
		applyConfigAndRemap();
		closeCurrentOverlay();
		showToast(t('configSaveSuccess'), 'success');
	});
	rightActions.appendChild(saveBtn);

	footer.appendChild(rightActions);
	dialog.appendChild(footer);

	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	header.querySelector('.dialog-close')!.addEventListener('click', closeCurrentOverlay);
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) closeCurrentOverlay();
	});
}

function createFieldCard(
	field: FieldConfig,
	fieldIndex: number,
	lang: string,
	onRefresh: () => void,
	config: FieldConfig[],
): HTMLElement {
	const card = document.createElement('div');
	card.className = 'field-card';

	// Card header row
	const cardHeader = document.createElement('div');
	cardHeader.className = 'field-card-header';

	const titleArea = document.createElement('div');
	titleArea.className = 'field-card-title';

	const title = document.createElement('span');
	title.className = 'field-name';
	title.textContent = lang === 'zh-Hans' ? field.labelZh : field.label;
	titleArea.appendChild(title);

	const fieldId = document.createElement('span');
	fieldId.className = 'field-id';
	fieldId.textContent = `(${field.field})`;
	titleArea.appendChild(fieldId);

	if (field.isRequired) {
		const badge = document.createElement('span');
		badge.className = 'required-badge';
		badge.textContent = t('fieldRequired');
		titleArea.appendChild(badge);
	}

	cardHeader.appendChild(titleArea);

	if (!field.isRequired) {
		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'field-card-delete-btn';
		deleteBtn.textContent = t('deleteField');
		deleteBtn.addEventListener('click', () => {
			const idx = config.findIndex(f => f.field === field.field);
			if (idx >= 0) {
				config.splice(idx, 1);
			}
			onRefresh();
		});
		cardHeader.appendChild(deleteBtn);
	}

	card.appendChild(cardHeader);

	// Aliases tags
	const tagsRow = document.createElement('div');
	tagsRow.className = 'alias-tags';

	for (let ai = 0; ai < field.aliases.length; ai++) {
		const tag = document.createElement('span');
		tag.className = 'alias-tag';

		const tagText = document.createElement('span');
		tagText.className = 'alias-text';
		tagText.textContent = field.aliases[ai];
		tag.appendChild(tagText);

		// Don't allow removing last alias from required field
		if (!(field.isRequired && field.aliases.length <= 1)) {
			const removeBtn = document.createElement('span');
			removeBtn.className = 'alias-remove';
			removeBtn.textContent = '×';
			removeBtn.addEventListener('click', () => {
				field.aliases.splice(ai, 1);
				onRefresh();
			});
			tag.appendChild(removeBtn);
		}

		tagsRow.appendChild(tag);
	}

	// Add alias input
	const addAliasWrap = document.createElement('span');
	addAliasWrap.className = 'alias-add-wrapper';

	const addAliasInput = document.createElement('input');
	addAliasInput.type = 'text';
	addAliasInput.placeholder = t('addAlias');
	addAliasInput.className = 'alias-add-input';
	addAliasWrap.appendChild(addAliasInput);

	const addAliasBtn = document.createElement('button');
	addAliasBtn.className = 'alias-add-btn';
	addAliasBtn.textContent = '+';
	addAliasBtn.addEventListener('click', () => {
		const val = addAliasInput.value.trim();
		if (!val) {
			showToast(t('aliasEmpty'), 'warning');
			return;
		}
		if (field.aliases.some(a => a.toLowerCase() === val.toLowerCase())) {
			showToast(t('duplicateAlias'), 'warning');
			return;
		}
		field.aliases.push(val);
		addAliasInput.value = '';
		onRefresh();
	});
	addAliasInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') addAliasBtn.click();
	});
	addAliasWrap.appendChild(addAliasBtn);

	tagsRow.appendChild(addAliasWrap);
	card.appendChild(tagsRow);

	// Store the field reference for the delete handler
	(card as any)._field = field;

	return card;
}

function showAddFieldForm(
	container: HTMLElement,
	config: FieldConfig[],
	lang: string,
	onRefresh: () => void,
): void {
	// Check if form already exists
	if (container.querySelector('.add-field-form')) return;

	const form = document.createElement('div');
	form.className = 'add-field-form';

	const makeInput = (placeholder: string, width: string) => {
		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = placeholder;
		input.style.width = width;
		return input;
	};

	const idInput = makeInput(t('fieldName'), '100px');
	const labelEnInput = makeInput(t('fieldLabelEn'), '110px');
	const labelZhInput = makeInput(t('fieldLabelZh'), '100px');
	const aliasInput = makeInput(t('initialAlias'), '100px');

	const confirmBtn = document.createElement('button');
	confirmBtn.className = 'btn btn-primary form-confirm';
	confirmBtn.textContent = t('save') || '保存';

	const cancelFormBtn = document.createElement('button');
	cancelFormBtn.className = 'btn btn-ghost form-cancel';
	cancelFormBtn.textContent = t('close') || '关闭';
	cancelFormBtn.addEventListener('click', () => form.remove());

	confirmBtn.addEventListener('click', () => {
		const id = idInput.value.trim();
		const labelEn = labelEnInput.value.trim();
		const labelZh = labelZhInput.value.trim();
		const alias = aliasInput.value.trim();

		if (!id || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
			showToast(t('fieldIdInvalid'), 'warning');
			return;
		}
		if (config.some(f => f.field === id)) {
			showToast(t('fieldIdExists'), 'warning');
			return;
		}
		config.push({
			field: id,
			label: labelEn || id,
			labelZh: labelZh || id,
			aliases: alias ? [alias] : [id],
			isRequired: false,
		});
		form.remove();
		onRefresh();
	});

	form.appendChild(idInput);
	form.appendChild(labelEnInput);
	form.appendChild(labelZhInput);
	form.appendChild(aliasInput);
	form.appendChild(confirmBtn);
	form.appendChild(cancelFormBtn);
	container.appendChild(form);
	idInput.focus();
}

function validateConfig(config: FieldConfig[]): boolean {
	const designatorField = config.find(f => f.field === 'designator');
	if (!designatorField) {
		showToast(t('needDesignator'), 'warning');
		return false;
	}
	if (designatorField.aliases.length === 0) {
		showToast(t('needDesignatorAlias'), 'warning');
		return false;
	}
	return true;
}

function applyConfigAndRemap(): void {
	const sides: Array<'old' | 'new'> = ['old', 'new'];
	for (const side of sides) {
		const bomFile = side === 'old' ? state.oldFile : state.newFile;
		if (!bomFile) continue;

		// Re-map columns with new aliases
		bomFile.columnMappings = mapColumns(bomFile.rawHeaders);
		bomFile.headers = bomFile.columnMappings.map(m => String(m.targetField));

		// Rebuild rows from rawRows
		const config = getColumnConfig();
		bomFile.rows = [];
		for (let i = 0; i < bomFile.rawRows.length; i++) {
			const fields = bomFile.rawRows[i];
			if (fields.every(f => f === '')) continue;

			const row: any = { rowIndex: i };
			for (const f of config) {
				row[f.field] = '';
			}
			for (let j = 0; j < bomFile.columnMappings.length && j < fields.length; j++) {
				const target = bomFile.columnMappings[j].targetField;
				if (target !== 'ignore') {
					row[target] = fields[j];
				}
			}
			// Keep rows that have a designator value
			const desField = config.find(f => f.field === 'designator');
			if (!desField || row.designator) {
				bomFile.rows.push(row);
			}
		}

		// Re-render table
		const tableId = side === 'old' ? 'table-left' : 'table-right';
		const container = document.getElementById(tableId);
		if (container) {
			renderTable(container, bomFile, side);
		}
	}

	// Re-compare if both files loaded
	if (state.oldFile && state.newFile) {
		const result = compare(state.oldFile, state.newFile);
		state.diffResult = result;
		state.selectedRowIndex = -1;
		document.dispatchEvent(new CustomEvent('bom:recompare'));
	}
}

function closeCurrentOverlay(): void {
	if (overlay) {
		overlay.remove();
		overlay = null;
	}
}
