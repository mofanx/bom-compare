import type { DiffResult } from '../types';
import { STANDARD_COLUMNS } from '../types';
import { t } from '../utils/i18n';

export function renderSummary(result: DiffResult): void {
	const textEl = document.getElementById('summary-text')!;
	const badgesEl = document.getElementById('summary-badges')!;
	const { summary, comparedColumns } = result;

	// 将字段名转换为可读标签
	const colLabels = comparedColumns.map(field => {
		const col = STANDARD_COLUMNS.find(c => c.field === field);
		if (!col) return field;
		return t(field === 'designator' ? 'designator' : field === 'footprint' ? 'footprint' : field === 'quantity' ? 'quantity' : field === 'manufacturer' ? 'manufacturer' : field === 'partNumber' ? 'partNumber' : field === 'value' ? 'value' : field === 'description' ? 'description' : field);
	});

	const colText = colLabels.length > 0
		? colLabels.map(l => `【${l}】`).join('')
		: t('noField');

	textEl.textContent = t('summaryTemplate', {
		columns: colText,
		same: summary.same,
		changed: summary.changed,
		added: summary.added,
		removed: summary.removed
	});

	badgesEl.innerHTML = `
		<span class="badge badge-same" data-filter="same">${t('badgeSame', { count: summary.same })}</span>
		<span class="badge badge-diff" data-filter="diff">${t('badgeDiff', { count: summary.changed })}</span>
		<span class="badge badge-added" data-filter="added">${t('badgeAdded', { count: summary.added })}</span>
		<span class="badge badge-removed" data-filter="removed">${t('badgeRemoved', { count: summary.removed })}</span>
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
