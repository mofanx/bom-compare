import zhHans from '../locales/zh-Hans';
import en from '../locales/en';
import { renderSummary } from '../ui/summary';
import { state } from '../ui/state';
import { getActiveColumns } from '../core/column-config';

export type Language = 'zh-Hans' | 'en';

const translations: Record<Language, Record<string, string>> = {
	'zh-Hans': zhHans,
	en: en,
};

let currentLanguage: Language = 'zh-Hans';

export function setLanguage(lang: Language): void {
	currentLanguage = lang;
	// 不保存到 localStorage，只在内存中保存
	updateAllText();
}

export function getLanguage(): Language {
	return currentLanguage;
}

export function t(key: string, params?: Record<string, string | number>): string {
	let text = translations[currentLanguage][key] || key;
	if (params) {
		for (const [paramKey, value] of Object.entries(params)) {
			text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
		}
	}
	return text;
}

export async function initI18n(): Promise<void> {
	// 直接在 iframe 内调用 eda.sys_I18n.getCurrentLanguage()
	try {
		if (typeof eda !== 'undefined' && eda.sys_I18n && eda.sys_I18n.getCurrentLanguage) {
			const mainLang = await eda.sys_I18n.getCurrentLanguage();
			// 映射主程序语言到扩展支持的语言
			if (mainLang === 'zh-Hans' || mainLang === 'zh') {
				currentLanguage = 'zh-Hans';
			} else if (mainLang === 'en') {
				currentLanguage = 'en';
			}
		}
	} catch (err) {
		// 获取失败时使用默认语言
		currentLanguage = 'zh-Hans';
	}
}

function updateAllText(): void {
	// Update all elements with data-i18n attribute
	document.querySelectorAll('[data-i18n]').forEach(el => {
		const key = el.getAttribute('data-i18n');
		if (key) {
			el.textContent = t(key);
		}
	});

	// Update placeholders
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		const key = el.getAttribute('data-i18n-placeholder');
		if (key) {
			(el as HTMLInputElement).placeholder = t(key);
		}
	});

	// Update titles
	document.querySelectorAll('[data-i18n-title]').forEach(el => {
		const key = el.getAttribute('data-i18n-title');
		if (key) {
			el.setAttribute('title', t(key));
		}
	});

	// Update dynamic detail buttons
	document.querySelectorAll('.btn-detail').forEach(el => {
		(el as HTMLButtonElement).textContent = t('detail');
	});

	// Update action column headers
	document.querySelectorAll('th').forEach(el => {
		if (el.textContent === '操作' || el.textContent === 'Action') {
			const rh1 = (el as HTMLElement).querySelector('.column-resize-handle');
			el.textContent = t('action');
			if (rh1) el.appendChild(rh1);
		}
	});

	// Update summary if comparison result exists
	if (state.diffResult) {
		renderSummary(state.diffResult);
	}

	// Update table header column names
	const lang = currentLanguage;
	const activeColumns = getActiveColumns();

	// Update preset header cells in tables
	document.querySelectorAll('.bom-table thead .preset-header-row th').forEach(th => {
		const text = th.textContent;
		if (!text || text === '#') return;

		// Try to find which column this header represents by matching against both labels
		const standardCol = activeColumns.find(col => col.label === text || col.labelZh === text);
		if (standardCol) {
			const rh = th.querySelector('.column-resize-handle');
			th.textContent = lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label;
			if (rh) th.appendChild(rh);
		}
	});

	// Update mapped header cells
	document.querySelectorAll('.bom-table thead th.mapped').forEach(th => {
		const text = th.textContent;
		if (!text) return;

		const standardCol = activeColumns.find(col => col.label === text || col.labelZh === text);
		if (standardCol) {
			const rh = th.querySelector('.column-resize-handle');
			th.textContent = lang === 'zh-Hans' ? standardCol.labelZh : standardCol.label;
			if (rh) th.appendChild(rh);
		}
	});

	// Update preset header tooltips
	document.querySelectorAll('.bom-table thead .preset-header').forEach(th => {
		th.setAttribute('title', t('clickToRemap'));
	});
}

export async function addI18nSupport(): Promise<void> {
	await initI18n();
	updateAllText();
}
