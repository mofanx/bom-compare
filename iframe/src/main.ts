import { initDropZones } from './ui/drop-zone';
import { initToolbar } from './ui/toolbar';
import { initPanelDivider } from './ui/layout';
import { initHotkeys } from './utils/hotkeys';
import { initRowHoverHighlight } from './ui/table';
import { initColumnResize } from './ui/column-resize';
import { initTooltip } from './ui/tooltip';
import { addI18nSupport, setLanguage, getLanguage } from './utils/i18n';

async function main(): Promise<void> {
	console.log('[BOM Compare] bundle.js loaded, initializing...');
	await addI18nSupport();
	initDropZones();
	initToolbar();
	initPanelDivider();
	initHotkeys();
	initRowHoverHighlight();
	initColumnResize();
	initTooltip();
	initLanguageSwitch();
	console.log('[BOM Compare] initialization complete');
}

function initLanguageSwitch(): void {
	const btnLang = document.getElementById('btn-lang');
	if (btnLang) {
		btnLang.addEventListener('click', () => {
			const current = getLanguage();
			const next = current === 'zh-Hans' ? 'en' : 'zh-Hans';
			setLanguage(next);
		});
	}
}

// bundle.js在</body>底部加载，DOM已就绪，直接执行
// 不依赖DOMContentLoaded，避免bundle加载时事件已触发的问题
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', main);
} else {
	main();
}
