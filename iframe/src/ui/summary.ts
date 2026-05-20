import type { DiffResult } from '../types';
import { STANDARD_COLUMNS } from '../types';
import { getLanguage } from '../utils/i18n';

export function renderSummary(result: DiffResult): void {
	const textEl = document.getElementById('summary-text')!;
	const badgesEl = document.getElementById('summary-badges')!;
	const { summary, comparedColumns } = result;
	const lang = getLanguage();

	// 将字段名转换为可读标签
	const colLabels = comparedColumns.map(field => {
		const col = STANDARD_COLUMNS.find(c => c.field === field);
		if (!col) return field;
		return lang === 'zh-Hans' ? col.labelZh : col.label;
	});

	const colText = colLabels.length > 0
		? colLabels.map(l => `【${l}】`).join('')
		: '【无】';

	textEl.textContent = `结果汇总：以位号为对比基准，共对比了 ${colText} 列，新文件相对旧文件：${summary.same} 行完全相同，${summary.changed} 行有差异，新增 ${summary.added} 行，缺失 ${summary.removed} 行`;

	badgesEl.innerHTML = `
		<span class="badge badge-same" data-filter="same">相同 ${summary.same}</span>
		<span class="badge badge-diff" data-filter="diff">差异 ${summary.changed}</span>
		<span class="badge badge-added" data-filter="added">新增 ${summary.added}</span>
		<span class="badge badge-removed" data-filter="removed">缺失 ${summary.removed}</span>
	`;

	badgesEl.querySelectorAll('.badge').forEach(badge => {
		badge.addEventListener('click', () => {
			const filter = (badge as HTMLElement).dataset.filter || 'all';
			const filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
			filterSelect.value = filter;
			filterSelect.dispatchEvent(new Event('change'));
		});
	});
}
