import zhHans from '../locales/zh-Hans';
import en from '../locales/en';
import { renderSummary } from '../ui/summary';
import { state } from '../ui/state';

export type Language = 'zh-Hans' | 'en';

const translations: Record<Language, Record<string, string>> = {
	'zh-Hans': zhHans,
	en: en,
};

let currentLanguage: Language = 'zh-Hans';

export function setLanguage(lang: Language): void {
	currentLanguage = lang;
	localStorage.setItem('bom-compare-language', lang);
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

export function initI18n(): void {
	const saved = localStorage.getItem('bom-compare-language') as Language;
	if (saved && translations[saved]) {
		currentLanguage = saved;
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
			el.textContent = t('action');
		}
	});

	// Update summary if comparison result exists
	if (state.diffResult) {
		renderSummary(state.diffResult);
	}
}

export function addI18nSupport(): void {
	initI18n();
	updateAllText();
}
