import type { DiffSummary } from '../types';

export function renderSummary(summary: DiffSummary): void {
	const textEl = document.getElementById('summary-text')!;
	const badgesEl = document.getElementById('summary-badges')!;

	textEl.textContent = `结果汇总：以位号为对比基准，共 ${summary.total} 行`;

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
